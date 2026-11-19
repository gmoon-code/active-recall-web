/* Browser regression: held Q&A revisions preview impacts before any save. */
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
      const req=C.addRequirement(db,{courseId:course.id,question:'What powers ATP synthase?',answer:'A proton gradient.',kind:'recall'});
      C.recordAttempt(db,{requirementId:req.id,rating:'good',response:req.answer,now:new Date(Date.now()-7*86400000)});
      C.addActivityVariant(db,{requirementId:req.id,question:'What gradient drives ATP synthase?',answer:req.answer,kind:'recall'});
      C.holdQuestionForCorrection(db,req.id,new Date(),{reason:'unclear',note:'Check scope against lecture.'});
      await S.save(db,null);await S.ready();
      return {id:req.id,attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory)};
    });
    const state=()=>page.evaluate(async id=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load(),req=db.requirements.find(r=>r.id===id);
      return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory),version:req.version,hold:!!req.studyHold,
        variants:db.activities.filter(a=>a.requirementId===id&&a.active&&!a.isPrimary).length,
        schema:window.ActiveRecallCore.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion};
    },original.id);
    await page.reload();await page.locator('.navbtn[data-page=questions]').click();
    const queue=page.locator('.correction-queue');await queue.waitFor();
    await queue.locator('[data-action=edit-requirement]').first().click();
    const modal=page.getByRole('dialog'),form=modal.locator('form[data-form=save-requirement]');await form.waitFor();
    await form.locator('button[type=submit]').click();
    assert.equal((await state()).version,1,'No-change save must not create a version');
    assert.equal(await modal.count(),1,'No-change form stays open');
    await form.locator('[name=question]').fill('Which proton gradient powers ATP synthase?');
    await form.locator('[name=changeType]').selectOption('wording');
    assert.match(await form.locator('[data-revision-impact]').innerText(),/Wording-only selected: 1 existing recall interval/);
    page.once('dialog',d=>d.dismiss());
    await form.locator('button[type=submit]').click();
    assert.equal((await state()).version,1,'Cancel leaves version and memory intact');
    assert.equal((await state()).memory,original.memory);
    page.once('dialog',d=>d.accept());
    await form.locator('button[type=submit]').click();
    let saved=await state();
    assert.equal(saved.version,2);assert.equal(saved.memory,original.memory);
    assert.equal(saved.variants,1);assert.equal(saved.hold,true);assert.equal(saved.attempts,original.attempts);
    await queue.locator('[data-action=edit-requirement]').first().click();
    const edit=page.getByRole('dialog').locator('form[data-form=save-requirement]');await edit.waitFor();
    await edit.locator('[name=answer]').fill('Proton electrochemical energy across the membrane.');
    assert.match(await edit.locator('[data-revision-impact]').innerText(),/1 existing recall interval\(s\) will reset/);
    page.once('dialog',d=>d.accept());
    await edit.locator('button[type=submit]').click();
    saved=await state();assert.equal(saved.version,3);assert.notEqual(saved.memory,original.memory);
    assert.equal(saved.variants,0);assert.equal(saved.hold,true);assert.equal(saved.attempts,original.attempts);
    assert.equal(saved.schema,5);
    const qa=page.locator('.qa-item').filter({hasText:'Which proton gradient powers ATP synthase?'});
    await qa.locator('[data-action=qa-edit]').click();
    const quick=qa.locator('form[data-form=quick-edit-question]');await quick.waitFor();
    await quick.locator('[name=question]').fill('What is the energy source for ATP synthase?');
    assert.match(await quick.locator('[data-revision-impact]').innerText(),/Question wording/);
    const box=await quick.locator('.revision-impact').boundingBox();assert.ok(box&&box.width<=391,'Impact message fits a phone');
    page.once('dialog',d=>d.dismiss());await quick.locator('button[type=submit]').click();
    assert.equal((await state()).version,3,'Quick-edit cancellation also preserves history');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: no-op save, live interval-impact preview, canceled/confirmed wording and substantive edits, unchanged attempt history, mobile quick edit.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
