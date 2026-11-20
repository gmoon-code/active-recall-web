/* Browser regression: question-quality holds suppress reviews without faking recall. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
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
    const page=await browser.newPage({viewport:{width:1180,height:820}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const original=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Biology'),due=[];
      for(const question of ['Which ion gradient powers ATP synthesis?','Where is NADH oxidised?']){
        const req=C.addRequirement(db,{courseId:course.id,question,answer:'An electron-transfer mechanism.',kind:'recall'});
        due.push(req.id);
        C.recordAttempt(db,{requirementId:req.id,rating:'good',response:'An electron-transfer mechanism.',now:new Date(Date.now()-7*86400000)});
      }
      C.addRequirement(db,{courseId:course.id,question:'A brand-new question?',answer:'Something new.',kind:'recall'});
      await S.save(db,null);await S.ready();
      return {attemptCount:db.attempts.length,memory:JSON.stringify(db.memory),due};
    });
    const state=()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {count:db.attempts.length,memory:JSON.stringify(db.memory),
        held:db.requirements.filter(r=>r.studyHold).map(r=>r.id),session:db.sessions.at(-1)||null,
        schema:window.ActiveRecallCore.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion};
    });
    await page.reload();await page.locator('.navbtn[data-page=study]').click();
    await page.locator('#study-more-options > summary').click();
    await page.locator('.catchup-preview [data-action=start-due-session]').click();
    await page.locator('h2.question').waitFor();
    const firstQuestion=await page.locator('h2.question').innerText();
    await page.locator('#study-session-tools > summary').click();
    await page.locator('[data-action=hold-session-question]').click();
    const nextQuestion=await page.locator('h2.question').innerText();
    assert.notEqual(firstQuestion,nextQuestion);
    assert.ok(!nextQuestion.includes('brand-new'));
    const flagged=await state();
    assert.equal(flagged.count,original.attemptCount);
    assert.equal(flagged.memory,original.memory);
    assert.equal(flagged.held.length,1);
    assert.equal(flagged.session.skippedIds.length,1);
    await page.reload();await page.locator('h2.question').waitFor();
    assert.equal(await page.locator('h2.question').innerText(),nextQuestion,'Hold survives reload');
    await page.locator('[data-action=skip-question]').click();
    await page.locator('.skipped-summary').waitFor();
    assert.match(await page.locator('.skipped-summary').innerText(),/Needs correction/);
    await page.locator('.skipped-summary [data-action=flag-skipped-question]').click();
    assert.equal((await state()).held.length,2,'A previously skipped question can also be held');
    await page.locator('.navbtn[data-page=questions]').click();
    const queue=page.locator('.correction-queue');await queue.waitFor();
    assert.equal(await queue.locator('[data-action=release-question-hold]').count(),2);
    assert.equal(await page.locator('.catchup-preview').count(),0);
    assert.equal(await page.locator('.qa-item').filter({hasText:'Needs correction · held'}).count(),2);
    await page.setViewportSize({width:390,height:844});
    const box=await queue.boundingBox();
    assert.ok(box&&box.width<=391,'Correction list should fit mobile screens');
    await queue.locator('[data-action=edit-requirement]').first().click();
    await page.getByRole('dialog').waitFor();
    await page.locator('[data-action=close-modal]').first().click();
    page.once('dialog',d=>d.accept());
    await queue.locator('.correction-item').filter({hasText:firstQuestion}).locator('[data-action=release-question-hold]').click();
    const restored=await state();
    assert.equal(restored.held.length,1);
    assert.equal(restored.memory,original.memory,'Releasing without substantive edit keeps the original due date');
    assert.equal(restored.count,original.attemptCount);
    assert.equal(restored.schema,5);
    await page.locator('.navbtn[data-page=study]').click();
    await page.locator('[data-action=new-session]').click();
    await page.locator('#study-more-options > summary').click();
    const preview=page.locator('.catchup-preview');await preview.waitFor();
    assert.equal(await preview.locator('.metric').first().innerText(),'1','Only released review returns to the due queue');
    await preview.locator('[data-action=start-due-session]').click();
    await page.locator('h2.question').waitFor();
    assert.equal(await page.locator('h2.question').innerText(),firstQuestion);
    await page.locator('#study-response').fill('An electron-transfer mechanism.');
    await page.locator('[data-action=reveal]').click();
    await page.locator('[data-action=rate][data-rating=good]').click();
    const final=await state();
    assert.equal(final.count,original.attemptCount+1,'Only the real rated answer creates an attempt');
    assert.equal(final.held.length,1,'The other flagged question remains blocked');
    assert.equal(final.session.status,'completed');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: flag in session/summary, hold across reload, edit, confirmed release, mobile, and real due review.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
