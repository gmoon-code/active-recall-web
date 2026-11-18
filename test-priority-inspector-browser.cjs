/* Browser regression: priority comparison is read-only and matches initial Study Now choice. */
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
    fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':path.extname(file)==='.js'?'text/javascript':path.extname(file)==='.css'?'text/css':'text/html','Cache-Control':'no-store'}).end(data));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1200,height:860}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const saved=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage;
      const db=C.initialDb(),c=C.addCourse(db,'Biology');
      for(let i=0;i<10;i++)C.addRequirement(db,{courseId:c.id,question:`Explain mechanism ${i}?`,answer:`Explanation ${i}.`,kind:'explain'});
      const prior=db.requirements[0],target=C.getTarget(db,prior.id);
      C.recordAttempt(db,{requirementId:prior.id,targetId:target.id,rating:'hard',response:'First attempt',now:new Date(Date.now()-6*86400000)});
      const before={memory:JSON.stringify(db.memory),attempts:db.attempts.length};
      await S.save(db,null);await S.ready();return before;
    });
    await page.reload();
    await page.locator('.navbtn[data-page=study]').click();
    await page.locator('.priority-compare').waitFor();
    assert.match(await page.locator('.priority-compare').innerText(),/Review-first alternative/);
    assert.match(await page.locator('.priority-compare').innerText(),/Due review/);
    await page.locator('[data-action=duration][data-minutes="5"]').click();
    const candidate=await page.evaluate(async()=>{
      const {db}=await window.ActiveRecallStorage.load();
      return window.ActiveRecallCore.inspectStudyPriorities(db,{minutes:5}).current.items[0].question;
    });
    await page.setViewportSize({width:390,height:844});
    const box=await page.locator('.priority-compare').boundingBox();
    assert.ok(box&&box.width<=391,'Priority inspector must fit mobile');
    const state=async()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {memory:JSON.stringify(db.memory),attempts:db.attempts.length};
    });
    assert.deepEqual(await state(),saved,'Preview never changes recall memory');
    await page.locator('.sessionpanel [data-action=start-session]').click();
    await page.locator('h2.question').waitFor();
    assert.equal(await page.locator('h2.question').innerText(),candidate,'First question agrees with current priority inspector');
    assert.deepEqual(await state(),saved,'Beginning a session does not invent a review result');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: current-versus-review-first priority preview, mobile layout, actual first question and memory invariance.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
