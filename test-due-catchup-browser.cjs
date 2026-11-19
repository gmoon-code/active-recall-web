/* Browser regression: deliberate due-only sessions never slip in new questions. */
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
      const bio=C.addCourse(db,'Biology'),chem=C.addCourse(db,'Chemistry');
      const dueQuestions=['What drives ATP?','Which enzyme is active?'];
      const due=[];
      for(const [i,question] of dueQuestions.entries()){
        const course=i?chem:bio;
        const req=C.addRequirement(db,{courseId:course.id,question,answer:'A proton gradient.',kind:'recall'});
        due.push(req.id);
        C.recordAttempt(db,{requirementId:req.id,rating:'good',response:'A proton gradient.',
          now:new Date(Date.now()-(6+i)*86400000)});
      }
      const newer=C.addRequirement(db,{courseId:bio.id,question:'What is a never-attempted enzyme?',answer:'A different enzyme.',kind:'recall'});
      C.addAssessment(db,{courseId:bio.id,title:'Upcoming quiz',date:C.addDays(new Date(),1),scope:'selected',requirementIds:[newer.id]});
      await S.save(db,null);await S.ready();
      return {count:db.attempts.length,memory:JSON.stringify(db.memory),due,newReqId:newer.id};
    });
    await page.reload();
    await page.locator('.navbtn[data-page=study]').click();
    const panel=page.locator('.catchup-preview');
    await panel.getByRole('heading',{name:'Catch up on due reviews'}).waitFor();
    const copy=await panel.innerText();
    assert.match(copy,/Due reviews/);
    assert.equal(await panel.locator('.metric').first().innerText(),'2');
    assert.match(copy,/without new questions or early maintenance/);
    assert.match(copy,/never-attempted question/);
    await page.setViewportSize({width:390,height:844});
    const box=await panel.boundingBox();
    assert.ok(box&&box.width<=391,'Catch-up preview must fit mobile');
    const state=async()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {count:db.attempts.length,memory:JSON.stringify(db.memory),session:db.sessions.at(-1)||null};
    });
    assert.deepEqual({count:(await state()).count,memory:(await state()).memory},
      {count:original.count,memory:original.memory},'Preview leaves attempts and due dates untouched');
    await panel.locator('[data-action=start-due-session]').click();
    await page.locator('h2.question').waitFor();
    assert.match(await page.locator('#app').innerText(),/Due Reviews Only is active/);
    const started=await state();
    assert.equal(started.session.queueMode,'due_only');
    assert.equal(started.count,original.count);
    assert.equal(started.memory,original.memory);
    for(let i=0;i<2;i++){
      const question=await page.locator('h2.question').innerText();
      assert.ok(['What drives ATP?','Which enzyme is active?'].includes(question));
      await page.locator('#study-response').fill('A proton gradient.');
      await page.locator('[data-action=reveal]').click();
      await page.locator('[data-action=rate][data-rating=good]').click();
    }
    const finished=await state();
    assert.equal(finished.count,original.count+2);
    assert.equal(finished.session.status,'completed');
    assert.equal(finished.session.completedIds.length,2);
    const invariant=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,{db}=await window.ActiveRecallStorage.load();
      const completed=db.attempts.slice(-2);
      return {schema:C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,
        usedIds:completed.map(x=>x.requirementId),intervals:completed.map(x=>x.schedulingDecision.activeIntervalDays)};
    });
    assert.equal(invariant.schema,5);
    assert.ok(invariant.usedIds.every(x=>original.due.includes(x)));
    assert.ok(invariant.intervals.every(days=>days>2&&days<20),'Original active interval rules applied to rated answers');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: opt-in due-only session, same real rating intervals, mobile preview and no new questions.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
