/* Browser regression: a forecast is frozen before answer reveal, not used to schedule. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const {showResearchPanels}=require('./browser-progress-helper.cjs');

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
      const course=C.addCourse(db,'Biology');
      const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What drives ATP synthesis?',answer:'A proton gradient.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.setExactAnswerKey(db,activity.id,'A proton gradient.',true);
      C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:'A proton gradient.',rating:'good',now:new Date(Date.now()-4*86400000)});
      await S.save(db,null);await S.ready();
      return {targetId:target.id,memory:db.memory[target.id],attempts:db.attempts.length};
    });
    await page.reload();
    await page.locator('.navbtn[data-page=study]').click();
    await page.locator('[data-action=duration][data-minutes="5"]').click();
    await page.locator('.sessionpanel [data-action=start-session]').click();
    await page.locator('h2.question').waitFor();
    const pre=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();
      const {db}=await window.ActiveRecallStorage.load(),session=db.sessions.at(-1);
      return {attempts:db.attempts.length,memory:db.memory[session.currentTargetId],forecast:session.preAnswerForecast};
    });
    assert.equal(pre.attempts,1,'Selecting the question never creates a graded outcome');
    assert.deepEqual(pre.memory,original.memory,'The frozen forecast does not reschedule the due date');
    assert.equal(pre.forecast.method,'interval-shapes-v1');
    assert.equal(pre.forecast.targetId,original.targetId);
    assert.equal(pre.forecast.priorReviewedAt,original.memory.lastReviewedAt);
    assert.ok(!await page.getByText('0.9', {exact:true}).count(),'Estimated probabilities must not prime recall on the study screen');
    await page.locator('#study-response').fill('A proton gradient.');
    await page.locator('[data-action=reveal]').click();
    await page.locator('[data-action=rate][data-rating=good]').click();
    const after=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();
      const C=window.ActiveRecallCore,{db}=await window.ActiveRecallStorage.load();
      const last=db.attempts.at(-1);
      return {count:db.attempts.length,forecast:last.prospectiveForecast,activeInterval:last.schedulingDecision.activeIntervalDays,
        policy:db.memory[last.retrievalTargetId].policyId,valid:C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion};
    });
    assert.equal(after.count,2);
    assert.deepEqual(after.forecast,pre.forecast,'The completed attempt receives the same pre-answer forecast');
    assert.equal(after.activeInterval,4.3,'The original interval policy remains the only scheduling rule');
    assert.equal(after.policy,'transparent-interval-v1');
    assert.equal(after.valid,5);
    await page.locator('.navbtn[data-page=insights]').click();await showResearchPanels(page);
    const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Memory-model evaluation readiness'})});
    await panel.getByText('Prospective forecast receipts').waitFor();
    assert.match(await panel.innerText(),/1 with pre-answer forecasts/);
    assert.match(await panel.innerText(),/Comparison is not possible yet/);
    await page.setViewportSize({width:390,height:844});
    await panel.scrollIntoViewIfNeeded();
    const box=await panel.boundingBox();
    assert.ok(box&&box.width<=391,'Forecast audit fits a mobile viewport');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: before-answer receipt, unchanged real due policy, backup validity and mobile evidence audit.\n');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
