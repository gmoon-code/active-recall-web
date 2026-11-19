/* Browser regression: narrow prediction-evidence streams and no review mutations. */
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
      const course=C.addCourse(db,'Biology'),req=C.addRequirement(db,{courseId:course.id,
        kind:'recall',question:'What drives ATP synthesis?',answer:'A proton gradient.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.setExactAnswerKey(db,activity.id,'A proton gradient.',true);
      const began=Date.now()-9*86400000;
      for(let i=0;i<3;i++){
        const now=new Date(began+i*3*86400000);
        const receipt=i?C.previewProspectiveForecast(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,now}):null;
        C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
          response:i===2?'An equivalent synonym.':'A proton gradient.',rating:'good',now,prospectiveForecast:receipt});
      }
      await S.save(db,null);await S.ready();
      return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory)};
    });
    await page.reload();
    await page.locator('.navbtn[data-page=insights]').click();
    const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Prospective prediction evidence check'})});
    await panel.getByText('Linked forecasts').waitFor();
    const words=await panel.innerText();
    assert.match(words,/Quality-gated · no policy change/);
    assert.match(words,/Short factual recall · literal agreement/);
    assert.match(words,/2 eligible pre-answer forecasts/);
    assert.match(words,/1 positive \/ 1 negative narrow labels/);
    assert.match(words,/Scores withheld/);
    assert.match(words,/No intervals or question priorities affected/);
    await panel.locator('summary').click();
    assert.match(await panel.innerText(),/50 delayed observations across 15 targets/);
    await page.setViewportSize({width:390,height:844});
    await panel.scrollIntoViewIfNeeded();
    const box=await panel.boundingBox();
    assert.ok(box&&box.width<=391,'Evaluation panel must fit narrow mobile screens');
    const state=async()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory)};
    });
    assert.deepEqual(await state(),saved,'Read-only inspection must preserve attempts and due dates');
    await page.reload();
    await page.locator('.navbtn[data-page=insights]').click();
    assert.match(await panel.innerText(),/2 eligible pre-answer forecasts/);
    assert.deepEqual(await state(),saved,'Reading after reload must not revise earlier evidence');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: pre-answer evidence streams, withheld small groups, mobile and unchanged local schedule.\n');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
