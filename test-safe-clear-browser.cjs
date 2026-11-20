/* Browser regression for commit-first local reset; runs only with fictional data. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

async function stored(page){
  return page.evaluate(async()=>{
    const S=window.ActiveRecallStorage;
    await S.ready();
    const snapshot=await S.load();
    return snapshot?.db;
  });
}
async function reset(page,accept){
  page.once('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
  await page.locator('[data-action=reset]').click();
}
async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const full=path.resolve(root,name);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(full,(error,data)=>error?res.writeHead(404).end():res.writeHead(200,{
      'Content-Type':path.extname(full)==='.js'?'text/javascript':path.extname(full)==='.css'?'text/css':'text/html',
      'Cache-Control':'no-store'}).end(data));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1180,height:820},acceptDownloads:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('.navbtn[data-page=insights]').waitFor();
    await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Fictional Organic Chemistry');
      const req=C.addRequirement(db,{courseId:course.id,kind:'recall',
        question:'Which molecule carries electrons?',answer:'NADH.'});
      C.recordAttempt(db,{requirementId:req.id,targetId:C.getTarget(db,req.id).id,
        response:'NADH.',rating:'good'});
      await S.save(db,null);await S.ready();
    });
    await page.reload();
    await page.locator('.navbtn[data-page=insights]').click();
    const original=await stored(page);
    assert.equal(original.courses.length,1);
    assert.equal(original.attempts.length,1);

    await reset(page,false);
    assert.deepEqual(await stored(page),original,'Cancel must not change storage');
    // A simulated write refusal must leave both screen and durable data intact.
    await page.evaluate(()=>{
      const S=window.ActiveRecallStorage;
      window.__originalSave=S.save;
      S.save=(db,id)=>db.courses.length===0?Promise.reject(Error('Simulated storage refusal')):
        window.__originalSave(db,id);
    });
    await reset(page,true);
    await page.getByText(/Local data was not cleared: Simulated storage refusal/).waitFor();
    assert.equal(await page.locator('.navbtn[data-page=insights]').count(),1);
    assert.deepEqual(await stored(page),original);
    await page.reload();
    assert.deepEqual(await stored(page),original,'Failure must remain harmless after reload');

    await page.locator('.navbtn[data-page=insights]').click();
    // Hold the real IndexedDB commit until the visible state has been checked.
    await page.evaluate(()=>{
      const S=window.ActiveRecallStorage,write=S.save;
      S.save=(db,id)=>db.courses.length===0?new Promise((resolve,reject)=>{
        window.__finishClear=()=>write(db,id).then(resolve,reject);
      }):write(db,id);
    });
    await reset(page,true);
    await page.waitForFunction(()=>typeof window.__finishClear==='function');
    assert.match(await page.locator('#app').innerText(),/Fictional Organic Chemistry/,
      'The current notebook stays visible while the destructive save is pending');
    assert.equal(await page.getByText(/Local data cleared/).count(),0);
    await page.locator('.navbtn[data-page=courses]').click();
    assert.equal(await page.locator('.navbtn[data-page=insights]').getAttribute('aria-current'),'page',
      'Other editing/navigation actions must wait until the clear completes');
    await page.evaluate(()=>window.__finishClear());
    await page.getByText(/Local data cleared\. Restore a saved JSON backup if needed/).waitFor();
    await page.reload();
    const cleared=await stored(page);
    assert.equal(cleared.schemaVersion,5);
    assert.equal(cleared.courses.length,0);
    assert.equal(cleared.requirements.length,0);
    assert.equal(cleared.attempts.length,0);

    await page.locator('.navbtn[data-page=insights]').click();
    const [download]=await Promise.all([
      page.waitForEvent('download'),page.locator('[data-action=export]').click()]);
    const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(backup.schemaVersion,5);
    assert.equal(backup.courses.length,0);
    await page.setViewportSize({width:390,height:844});
    const bounds=await page.locator('#app').boundingBox();
    assert.ok(bounds&&bounds.width<=391,'The data controls remain usable on mobile');
    assert.deepEqual(errors,[]);
    await context.close();
    process.stdout.write('PASS: Chromium cancelled, failed and delayed notebook clear; durable history, reload, schema-v5 backup, mobile.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
