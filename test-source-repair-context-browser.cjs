/* Browser regression: provenance is accessible while repairing held Q&A. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{
      'Content-Type':path.extname(file)==='.js'?'text/javascript':path.extname(file)==='.css'?'text/css':'text/html',
      'Cache-Control':'no-store'}).end(data));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const original=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb(),course=C.addCourse(db,'Biology');
      const content='Lecture notes: ATP synthase works with a proton gradient.\nCarbon dioxide contributes carbon to sugars.\nNot an answer checker: <img src=x onerror=window.__sourceXss=1>.';
      const source=C.addSource(db,{courseId:course.id,title:'Carbon and energy',content,generateDrafts:false}).source;
      const quote='Carbon dioxide contributes carbon to sugars.';
      const linked=C.addRequirement(db,{courseId:course.id,sourceId:source.id,question:'Where do sugar carbon atoms originate?',answer:'CO2.',kind:'recall',sourceQuote:quote,sourceStart:content.indexOf(quote),sourceEnd:content.indexOf(quote)+quote.length});
      const unanchored=C.addRequirement(db,{courseId:course.id,sourceId:source.id,question:'What does ATP synthase do?',answer:'Produces ATP.',kind:'recall'});
      const unlinked=C.addRequirement(db,{courseId:course.id,question:'What is a catalyst?',answer:'A rate accelerator.',kind:'recall'});
      for(const req of [linked,unanchored,unlinked])C.holdQuestionForCorrection(db,req.id,new Date(),{reason:'suspected_error',note:req.id===linked.id?'Check the original quote.':''});
      await S.save(db,null);await S.ready();
      return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory),sourceId:source.id,linkedId:linked.id};
    });
    const state=()=>page.evaluate(async()=>{await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory),holds:db.requirements.filter(r=>r.studyHold).length,schema:window.ActiveRecallCore.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion};});
    await page.reload();await page.locator('.navbtn[data-page=questions]').click();
    const queue=page.locator('.correction-queue');await queue.waitFor();
    assert.equal(await queue.locator('.correction-item').count(),3);
    const linked=queue.locator('.correction-item').filter({hasText:'Where do sugar carbon atoms originate?'});
    await linked.locator('.repair-source>summary').click();
    assert.match(await linked.innerText(),/exact text position/i);
    assert.equal(await linked.locator('.repair-source mark').innerText(),'Carbon dioxide contributes carbon to sugars.');
    assert.equal(await queue.locator('img').count(),0,'Source notes must be displayed as escaped text');
    assert.equal(await page.evaluate(()=>window.__sourceXss),undefined);
    const unanchored=queue.locator('.correction-item').filter({hasText:'What does ATP synthase do?'});
    await unanchored.locator('.repair-source>summary').click();
    assert.match(await unanchored.innerText(),/No exact passage was attached/);
    assert.match(await queue.locator('.correction-item').filter({hasText:'What is a catalyst?'}).innerText(),/No saved lecture notes are linked/);
    const width=await queue.boundingBox();assert.ok(width&&width.width<=391,'Repair list should fit a narrow phone');
    await linked.locator('[data-action=edit-requirement]').click();
    const modal=page.getByRole('dialog');await modal.waitFor();
    assert.match(await modal.innerText(),/Check the original quote/);
    assert.match(await modal.innerText(),/Check saved lecture evidence/);
    await modal.locator('.repair-source details').first().locator('summary').click();
    assert.match(await modal.innerText(),/Not an answer checker: <img/);
    await modal.locator('[data-action=close-modal]').click();
    await page.evaluate(async sourceId=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,{db}=await S.load();
      C.reviseSource(db,sourceId,{title:'Carbon and energy revised',content:'Updated lecture: water provides oxygen gas. The sugar-carbon statement was removed.'});
      await S.save(db,null);await S.ready();
    },original.sourceId);
    await page.reload();await page.locator('.navbtn[data-page=questions]').click();
    const revised=page.locator('.correction-item').filter({hasText:'Where do sugar carbon atoms originate?'});
    await revised.locator('[data-action=edit-requirement]').click();
    const edit=page.getByRole('dialog');await edit.waitFor();
    assert.match(await edit.innerText(),/version 1; current notes are version 2/);
    assert.equal(await edit.locator('.repair-source mark').innerText(),'Carbon dioxide contributes carbon to sugars.');
    assert.equal(await edit.locator('.repair-source details').count(),2,'Old and current complete notes remain separately accessible');
    await edit.locator('.repair-source details').last().locator('summary').click();
    assert.match(await edit.innerText(),/Updated lecture: water provides oxygen gas/);
    const saved=await state();assert.equal(saved.attempts,original.attempts);assert.equal(saved.memory,original.memory);
    assert.equal(saved.holds,3);assert.equal(saved.schema,5);assert.deepEqual(errors,[]);
    process.stdout.write('PASS: source version comparison, exact versus unanchored evidence, escaping, mobile repair, full notes, unchanged recall history.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
