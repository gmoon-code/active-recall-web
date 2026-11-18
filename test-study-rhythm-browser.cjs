/* Browser regression: explicit outside study must not change retrieval scheduling. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd();
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1180,height:880}}),errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const baseline=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,R=window.ActiveRecallStudyRhythm;
      const db=C.initialDb(),course=C.addCourse(db,'Biology');
      const req=C.addRequirement(db,{courseId:course.id,question:'Explain enzyme catalysis?',answer:'Enzymes reduce activation energy.',kind:'explain'});
      const target=C.getTarget(db,req.id);
      C.recordAttempt(db,{requirementId:req.id,targetId:target.id,response:'Enzymes lower the barrier.',rating:'hard',durationSeconds:75});
      const result={due:db.memory[target.id].dueAt,attempts:db.attempts.length,memory:JSON.stringify(db.memory),targetId:target.id,date:R.localDate(new Date())};
      await S.save(db,null);await S.ready();return result;
    });
    await page.reload();
    await page.locator('[data-page=insights]').click();
    const form=page.locator('form[data-form="outside-study"]');
    await form.waitFor();
    assert.equal(await form.locator('[name=date]').inputValue(),baseline.date);
    await form.locator('[name=minutes]').fill('35');
    await form.locator('[name=kind]').selectOption('reading');
    await form.locator('[name=note]').fill('Studied enzyme mechanisms');
    await form.locator('[type=submit]').click();
    await page.locator('.outside-log').filter({hasText:'Studied enzyme mechanisms'}).waitFor();
    let stored=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {logs:db.outsideStudyLogs,memory:JSON.stringify(db.memory),attempts:db.attempts.length,valid:window.ActiveRecallCore.validateImport(db).schemaVersion};
    });
    assert.equal(stored.logs.length,1);
    assert.equal(stored.logs[0].minutes,35);
    assert.equal(stored.logs[0].basis,'self_report');
    assert.equal(stored.attempts,baseline.attempts);
    assert.equal(stored.memory,baseline.memory);
    assert.equal(stored.valid,5);
    await page.reload();
    await page.locator('[data-page=insights]').click();
    await page.locator('.outside-log').filter({hasText:'Studied enzyme mechanisms'}).waitFor();
    await page.setViewportSize({width:390,height:844});
    const area=await form.boundingBox();
    assert.ok(area&&area.width<=391,'Study log form must fit the mobile viewport');
    const entry=page.locator('.outside-log').filter({hasText:'Studied enzyme mechanisms'});
    const entryArea=await entry.boundingBox();
    assert.ok(entryArea&&entryArea.width<=391,'Saved entry must fit the mobile viewport');
    page.once('dialog',dialog=>dialog.dismiss());
    await entry.locator('[data-action=delete-outside-study]').click();
    assert.equal(await page.locator('.outside-log').count(),1,'Cancel preserves the outside-study record');
    page.once('dialog',dialog=>dialog.accept());
    await entry.locator('[data-action=delete-outside-study]').click();
    await page.locator('.outside-log').waitFor({state:'detached'});
    stored=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {logs:db.outsideStudyLogs,memory:JSON.stringify(db.memory),attempts:db.attempts.length};
    });
    assert.deepEqual(stored.logs,[]);
    assert.equal(stored.memory,baseline.memory);
    assert.equal(stored.attempts,baseline.attempts);
    assert.deepEqual(errors,[],'Browser runtime errors');
    process.stdout.write('PASS: outside-study form, persistence, backup validation, schedule invariance, deletion, mobile layout.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
