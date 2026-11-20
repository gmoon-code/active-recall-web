/* Browser regression: quality reasons and repair notes remain separate from recall. */
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
      for(const question of ['Which ion gradient powers ATP synthesis?','Where is NADH oxidised?']){
        const r=C.addRequirement(db,{courseId:course.id,question,answer:'An electron-transfer mechanism.',kind:'recall'});
        C.recordAttempt(db,{requirementId:r.id,rating:'good',response:r.answer,now:new Date(Date.now()-7*86400000)});
      }
      await S.save(db,null);await S.ready();
      return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory)};
    });
    const state=()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory),held:db.requirements.filter(r=>r.studyHold).map(r=>({id:r.id,hold:r.studyHold})),session:db.sessions.at(-1),schema:window.ActiveRecallCore.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion};
    });
    await page.reload();
    await page.locator('.navbtn[data-page=study]').click();
    await page.locator('#study-more-options > summary').click();
    await page.locator('.catchup-preview [data-action=start-due-session]').click();
    await page.locator('h2.question').waitFor();
    assert.equal(await page.locator('[data-action=skip-question]').isVisible(),true,
      'Skipping an unsuitable question remains a visible one-click action');
    assert.equal(await page.locator('[data-action=hold-session-question]').isVisible(),false,
      'Advanced correction controls start collapsed');
    await page.locator('#study-session-tools > summary').click();
    await page.locator('#study-hold-reason').selectOption('suspected_error');
    await page.locator('[data-action=hold-session-question]').click();
    let saved=await state();
    assert.equal(saved.held.length,1);
    assert.equal(saved.held[0].hold.reason,'suspected_error');
    assert.equal(saved.session.skippedIds.length,1);
    assert.equal(saved.attempts,original.attempts);
    assert.equal(saved.memory,original.memory);
    await page.locator('.navbtn[data-page=questions]').click();
    const queue=page.locator('.correction-queue'),item=queue.locator('.correction-item').first();
    await item.waitFor();
    assert.match(await item.innerText(),/Reference answer may be wrong/);
    await item.locator('details summary').click();
    const form=item.locator('form[data-form=correction-details]');
    await form.locator('select[name=reason]').selectOption('unclear');
    const note='Review the reference <img src=x onerror=window.__qualityXss=1> before resuming.';
    await form.locator('textarea[name=note]').fill(note);
    await form.locator('button[type=submit]').click();
    saved=await state();
    assert.equal(saved.held[0].hold.reason,'unclear');
    assert.equal(saved.held[0].hold.note,note);
    assert.equal(saved.schema,5);
    assert.equal(saved.memory,original.memory);
    assert.equal(saved.attempts,original.attempts);
    assert.equal(await queue.locator('img').count(),0,'An entered note must render only as text');
    assert.equal(await page.evaluate(()=>window.__qualityXss),undefined);
    assert.match(await item.innerText(),/Unclear wording/);
    await page.reload();
    await page.locator('.navbtn[data-page=questions]').click();
    await page.locator('.correction-item').waitFor();
    assert.match(await page.locator('.correction-item').innerText(),/Review the reference <img/);
    assert.equal((await state()).held[0].hold.note,note,'Repair note survives browser reload');
    page.once('dialog',d=>d.accept());
    await page.locator('.correction-item [data-action=release-question-hold]').click();
    const restored=await state();
    assert.equal(restored.held.length,0);
    assert.equal(restored.memory,original.memory);
    assert.equal(restored.attempts,original.attempts);
    await page.locator('.navbtn[data-page=study]').click();
    await page.locator('[data-action=finish-session]').click();
    await page.locator('[data-action=new-session]').click();
    await page.locator('#study-more-options > summary').click();
    const preview=page.locator('.catchup-preview');await preview.waitFor();
    assert.equal(await preview.locator('.metric').first().innerText(),'2');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: categorical hold, mobile note edit, escaped display, persistence, explicit release, and unchanged recall schedule.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
