/* HTTPS Pages-path regression: service worker and IndexedDB survive a network-free reload. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),https=require('node:https'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd(),prefix='/active-recall-web/';
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'arw-offline-tls-'));
  let server,browser;
  try{
    const key=path.join(temp,'key.pem'),cert=path.join(temp,'cert.pem');
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
      '-keyout',key,'-out',cert,'-subj','/CN=localhost',
      '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css',
      '.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
    server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
      const pathname=decodeURIComponent(new URL(req.url,'https://localhost').pathname);
      if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
      const relative=pathname.slice(prefix.length)||'index.html';
      const file=path.resolve(root,relative);
      if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      fs.readFile(file,(error,data)=>{
        if(error){res.writeHead(404).end();return;}
        res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
          'Cache-Control':'no-store'}).end(data);
      });
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,
      // Chromium must also trust this test-only self-signed certificate when
      // fetching the service worker's script and precache dependencies.
      executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
      args:['--no-sandbox','--ignore-certificate-errors']});
    const context=await browser.newContext({ignoreHTTPSErrors:true,acceptDownloads:true}),page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const url=`https://127.0.0.1:${server.address().port}${prefix}`;
    await page.goto(url);
    await page.locator('[data-action=demo]').waitFor();
    try{
      await page.evaluate(()=>Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_,reject)=>setTimeout(()=>reject(Error('HTTPS service worker did not activate within 15 seconds')),15000))
      ]));
    }catch(error){
      const diagnostic=await page.evaluate(async()=>{
        let registerError=null;
        try{await navigator.serviceWorker.register('./sw.js');}
        catch(cause){registerError=String(cause);}
        return {secureContext:isSecureContext,registerError,
          registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({
            scope:r.scope,active:r.active?.state||null,installing:r.installing?.state||null,
            waiting:r.waiting?.state||null}))};
      });
      throw Error(error.message+'; '+JSON.stringify(diagnostic));
    }
    await page.reload();
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL.endsWith('/active-recall-web/sw.js')),true);
    const cacheNames=await page.evaluate(()=>caches.keys());
    assert.ok(cacheNames.includes('active-recall-web-v4-29'),'The candidate needs a fresh v4.29 offline cache');
    assert.ok(!cacheNames.includes('active-recall-web-v4-27'),'A retired release cache must not survive activation');

    await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage;
      const db=C.initialDb(),course=C.addCourse(db,'Fictional offline biology');
      const question=C.addRequirement(db,{courseId:course.id,kind:'recall',
        question:'What powers ATP synthase?',answer:'A proton gradient.'});
      const target=C.getTarget(db,question.id),activity=C.getActivities(db,question.id,target.id)[0];
      C.recordAttempt(db,{requirementId:question.id,targetId:target.id,activityId:activity.id,
        response:'A proton gradient.',rating:'good',now:new Date()});
      C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What molecule stores genetic information?',answer:'DNA.'});
      db.agendaPreferences={days:21,weekdayMinutes:25,weekendMinutes:15,missedDates:[]};
      await S.save(db,null);await S.ready();
    });
    await page.reload();
    await page.getByText('Fictional offline biology').first().waitFor();
    const snapshot=await page.evaluate(async()=>{
      const S=window.ActiveRecallStorage,C=window.ActiveRecallCore;
      await S.ready();const {db}=await S.load();
      return {data:JSON.stringify(db),memory:JSON.stringify(db.memory),
        attempts:db.attempts.length,queue:C.planActivities(db,25).items.length,
        controlled:!!navigator.serviceWorker.controller};
    });
    assert.equal(snapshot.controlled,true);
    assert.equal(snapshot.attempts,1);
    assert.ok(snapshot.queue>0,'Offline fixture must have real study work');

    await context.setOffline(true);
    await page.reload({waitUntil:'load'});
    await page.getByText('Fictional offline biology').first().waitFor();
    const offline=await page.evaluate(async()=>{
      const S=window.ActiveRecallStorage,C=window.ActiveRecallCore;
      await S.ready();const {db}=await S.load();
      return {data:JSON.stringify(db),memory:JSON.stringify(db.memory),
        attempts:db.attempts.length,queue:C.planActivities(db,25).items.length,
        controlled:!!navigator.serviceWorker.controller};
    });
    assert.deepEqual(offline,snapshot,'Complete offline reload preserves local notebook and active schedule');
    await page.locator('.navbtn[data-page=insights]').click();
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-action=export]').click()]);
    const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(exported.schemaVersion,5);
    assert.equal(exported.attempts.length,1);
    assert.equal(JSON.stringify(exported.memory),snapshot.memory);
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: HTTPS subpath service worker, offline reload, local memory and schedule, offline JSON export.\n');
  }finally{
    if(browser)await browser.close();
    if(server)await new Promise(resolve=>server.close(resolve));
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
