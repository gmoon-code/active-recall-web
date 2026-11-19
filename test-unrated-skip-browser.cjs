/* Browser regression: unanswered skips do not forge ratings, and remain revisit-able. */
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
    const fixture=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Biology'),requirements=[];
      for(const question of ['What drives ATP synthesis?','What is NADH?']){
        const req=C.addRequirement(db,{courseId:course.id,question,answer:'A biological mechanism.',kind:'recall'});
        requirements.push(req.id);
        C.recordAttempt(db,{requirementId:req.id,rating:'good',response:'A biological mechanism.',now:new Date(Date.now()-5*86400000)});
      }
      C.addRequirement(db,{courseId:course.id,question:'A new question?',answer:'New material.',kind:'recall'});
      await S.save(db,null);await S.ready();
      return {count:db.attempts.length,memory:JSON.stringify(db.memory),requirements};
    });
    const state=()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {count:db.attempts.length,memory:JSON.stringify(db.memory),session:db.sessions.at(-1)};
    });
    await page.reload();await page.locator('.navbtn[data-page=study]').click();
    await page.locator('.catchup-preview [data-action=start-due-session]').click();
    await page.locator('h2.question').waitFor();
    const first=await page.locator('h2.question').innerText();
    await page.locator('[data-action=skip-question]').click();
    const next=await page.locator('h2.question').innerText();
    assert.notEqual(first,next,'A skipped question cannot be repeated during this session');
    assert.ok(!next.includes('new question'),'Due-only queue still excludes new questions');
    const afterSkip=await state();
    assert.equal(afterSkip.count,fixture.count);
    assert.equal(afterSkip.memory,fixture.memory);
    assert.equal(afterSkip.session.skippedIds.length,1);
    assert.equal(afterSkip.session.completedIds.length,0);
    await page.reload();await page.locator('h2.question').waitFor();
    assert.equal(await page.locator('h2.question').innerText(),next,'Skip and next question persist after reload');
    await page.locator('#study-response').fill('A biological mechanism.');
    await page.locator('[data-action=reveal]').click();
    await page.locator('[data-action=rate][data-rating=good]').click();
    await page.locator('.skipped-summary').waitFor();
    const afterRating=await state();
    assert.equal(afterRating.count,fixture.count+1);
    assert.equal(afterRating.session.completedIds.length,1);
    assert.equal(afterRating.session.skippedIds.length,1);
    assert.equal(afterRating.session.status,'completed');
    assert.match(await page.locator('.skipped-summary').innerText(),/Not rated/);
    const valid=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,{db}=await window.ActiveRecallStorage.load();
      return C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion;
    });
    assert.equal(valid,5);
    await page.setViewportSize({width:390,height:844});
    const box=await page.locator('.skipped-summary').boundingBox();
    assert.ok(box&&box.width<=391,'Skipped summary must fit mobile width');
    await page.locator('.skipped-summary [data-action=edit-requirement]').click();
    await page.getByRole('dialog').waitFor();
    await page.locator('[data-action=close-modal]').first().click();
    await page.locator('[data-action=new-session]').click();
    await page.locator('.catchup-preview [data-action=start-due-session]').click();
    await page.locator('h2.question').waitFor();
    assert.equal(await page.locator('h2.question').innerText(),first,'Skipped due question returns next session');
    const beforeFinalSkip=await state();
    await page.locator('[data-action=skip-question]').click();
    await page.locator('.skipped-summary').waitFor();
    const ended=await state();
    assert.equal(ended.count,beforeFinalSkip.count,'An all-skipped session creates zero attempts');
    assert.equal(ended.memory,beforeFinalSkip.memory,'An all-skipped session does not move due dates');
    assert.match(await page.locator('.sessionpanel .pagehead').innerText(),/No answers were rated/);
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: unrated skips, next due question, reload, edit, mobile, and all-skipped summary.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
