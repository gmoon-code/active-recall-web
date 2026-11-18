/* Browser regression: read-only model readiness on desktop, mobile and reload. */
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
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1180,height:820}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const saved=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Biology');
      const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What drives ATP synthesis?',answer:'A proton gradient.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.setExactAnswerKey(db,activity.id,'A proton gradient.',true);
      C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,response:'A proton gradient.',rating:'good',now:new Date(Date.now()-4*86400000)});
      C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,response:'A proton gradient.',rating:'good',now:new Date(Date.now()-2*86400000)});
      await S.save(db,null);await S.ready();return JSON.stringify({attempts:db.attempts,memory:db.memory});
    });
    await page.reload();
    await page.locator('.navbtn[data-page=insights]').click();
    const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Memory-model evaluation readiness'})});
    await panel.getByText('Comparable delayed answers').waitFor();
    const words=await panel.innerText();
    assert.match(words,/Read-only · FSRS not enabled/);
    assert.match(words,/Strict short-answer agreement/);
    assert.match(words,/1 delayed records/);
    assert.match(words,/Prospective forecast receipts/);
    assert.match(words,/Comparison is not possible yet/);
    await panel.locator('summary').click();
    assert.match(await panel.innerText(),/earliest 80% \/ latest 20%/);
    await page.setViewportSize({width:390,height:844});
    await panel.scrollIntoViewIfNeeded();
    const box=await panel.boundingBox();
    assert.ok(box&&box.width<=391,'Readiness audit must not overflow a mobile viewport');
    const state=async()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return JSON.stringify({attempts:db.attempts,memory:db.memory});
    });
    assert.equal(await state(),saved,'Opening the readiness panel does not change outcomes or due dates');
    await page.reload();
    await page.locator('.navbtn[data-page=insights]').click();
    assert.match(await panel.innerText(),/1 delayed records/);
    assert.equal(await state(),saved,'Reading after reload preserves the same data');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: FSRS readiness evidence, chronology, mobile and unchanged local review state.\n');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
