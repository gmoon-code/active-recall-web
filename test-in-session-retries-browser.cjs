/* Real-browser regression for v4.32's exact-hour, same-session Again repeats.
   Uses a virtual browser clock; no hour-long wait or changes to live data. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

const START='2026-11-20T12:00:00.000Z';
const BEFORE='2026-11-20T12:59:59.000Z';
const DUE='2026-11-20T13:00:00.000Z';

async function seed(page){
  await page.locator('[data-action=demo]').waitFor();
  const fixture=await page.evaluate(async()=>{
    const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
    const course=C.addCourse(db,'Fictional Biology');
    const first=C.addRequirement(db,{courseId:course.id,kind:'recall',
      question:'What powers ATP synthase?',answer:'A proton gradient.'});
    const second=C.addRequirement(db,{courseId:course.id,kind:'recall',
      question:'What carries electrons?',answer:'NADH.'});
    const third=C.addRequirement(db,{courseId:course.id,kind:'recall',
      question:'What contains a cell’s DNA?',answer:'Chromosomes.'});
    const target=C.getTarget(db,first.id);
    C.recordAttempt(db,{requirementId:first.id,targetId:target.id,
      response:'A proton gradient.',rating:'good',now:new Date(Date.now()-10*C.DAY)});
    assertPlan(C,db,target.id);
    await S.save(db,null);await S.ready();
    function assertPlan(core,data,id){
      if(core.planActivities(data,120).items[0]?.target.id!==id)
        throw Error('Fixture must prioritise the overdue question');
    }
    return {targetId:target.id,requirementId:first.id,
      otherIds:[second.id,third.id],previousAttemptId:db.attempts[0].id};
  });
  await page.reload();
  await page.locator('.navbtn[data-page=study]').click();
  await page.locator('#custom-duration').fill('120');
  await page.locator('[data-action=start-session]').click();
  assert.equal(await page.locator('h2.question').innerText(),'What powers ATP synthase?');
  return fixture;
}

async function stored(page){
  return page.evaluate(async()=>{
    const C=window.ActiveRecallCore,S=window.ActiveRecallStorage;
    await S.ready();const {db}=await S.load(),session=db.sessions.at(-1);
    return {attempts:db.attempts,session,memory:db.memory,
      schema:C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion};
  });
}

async function reachDueRetry(page,fixture){
  await page.locator('#study-response').fill('I cannot remember.');
  await page.locator('[data-action=reveal]').click();
  await page.locator('[data-action=rate][data-rating=again]').click();
  const afterAgain=await stored(page);
  assert.equal(afterAgain.schema,5);
  assert.equal(afterAgain.attempts.length,2);
  assert.equal(afterAgain.attempts[1].scheduleRating,'again');
  assert.equal(afterAgain.attempts[1].sessionId,afterAgain.session.id);
  assert.equal(afterAgain.memory[fixture.targetId].dueAt,DUE,
    'Again must retain the original exact one-hour due time');
  assert.equal(afterAgain.session.completedIds.length,1);
  assert.ok(fixture.otherIds.includes(afterAgain.session.currentReqId));
  assert.equal(await page.getByText('Due retry · you chose Again earlier').count(),0);

  await page.clock.setFixedTime(new Date(BEFORE));
  await page.locator('[data-action=skip-question]').click();
  const justBefore=await stored(page);
  assert.equal(justBefore.attempts.length,2);
  assert.equal(justBefore.memory[fixture.targetId].dueAt,DUE);
  assert.ok(fixture.otherIds.includes(justBefore.session.currentReqId));
  assert.notEqual(justBefore.session.currentReqId,afterAgain.session.currentReqId);
  assert.equal(await page.locator('h2.question').innerText(),
    justBefore.session.currentReqId===fixture.otherIds[0]?'What carries electrons?':'What contains a cell’s DNA?');
  assert.equal(await page.getByText('Due retry · you chose Again earlier').count(),0,
    'A question cannot return even one second before its saved due time');

  await page.clock.setFixedTime(new Date(DUE));
  await page.locator('[data-action=skip-question]').click();
  await page.getByText('Due retry · you chose Again earlier').waitFor();
  assert.equal(await page.locator('h2.question').innerText(),'What powers ATP synthase?');
  const due=await stored(page);
  assert.equal(due.session.currentTargetId,fixture.targetId);
  assert.deepEqual(due.session.completedIds,[fixture.targetId]);
  assert.equal(due.session.skippedIds.length,2);
  assert.equal(due.attempts.length,2,'Selecting a repeat must not manufacture an attempt');
  assert.equal(due.memory[fixture.targetId].dueAt,DUE);

  await page.reload();
  await page.getByText('Due retry · you chose Again earlier').waitFor();
  const reloaded=await stored(page);
  assert.equal(reloaded.session.currentTargetId,fixture.targetId);
  assert.equal(reloaded.attempts.length,2);
  assert.equal(reloaded.memory[fixture.targetId].dueAt,DUE);
  return reloaded;
}

async function verifyExport(page,expected){
  await page.locator('.navbtn[data-page=insights]').click();
  const [download]=await Promise.all([
    page.waitForEvent('download'),page.locator('[data-action=export]').click()]);
  const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(backup.schemaVersion,5);
  assert.deepEqual(backup.attempts,expected.attempts);
  assert.deepEqual(backup.memory,expected.memory);
  assert.deepEqual(backup.sessions.at(-1),expected.session);
}

async function runScenario(browser,baseUrl,choice){
  const context=await browser.newContext({viewport:{width:1180,height:820},acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.clock.install({time:new Date(START)});
    await page.goto(baseUrl);
    const fixture=await seed(page);
    const due=await reachDueRetry(page,fixture);
    if(choice==='good'){
      await page.locator('#study-response').fill('A proton gradient.');
      await page.locator('[data-action=reveal]').click();
      await page.locator('[data-action=rate][data-rating=good]').click();
    }else if(choice==='skip'){
      await page.locator('[data-action=skip-question]').click();
    }else throw Error('Unknown test scenario');
    const result=await stored(page);
    assert.equal(result.schema,5);
    assert.equal(result.session.status,'completed');
    assert.equal(result.session.skippedIds.length,2);
    if(choice==='good'){
      assert.equal(result.attempts.length,3);
      assert.deepEqual(result.session.completedIds,[fixture.targetId,fixture.targetId]);
      assert.equal(result.attempts[2].scheduleRating,'good');
      assert.equal(result.attempts[2].sessionId,result.session.id);
      assert.ok(Date.parse(result.memory[fixture.targetId].dueAt)>Date.parse(DUE));
      assert.equal(result.session.retrySkippedIds?.length||0,0);
    }else{
      assert.equal(result.attempts.length,2);
      assert.deepEqual(result.session.completedIds,[fixture.targetId]);
      assert.deepEqual(result.session.retrySkippedIds,[fixture.targetId]);
      assert.deepEqual(result.memory,due.memory,'Skipping a due repeat must not move its saved review date');
    }
    await page.reload();
    await page.locator('.navbtn[data-page=insights]').waitFor();
    assert.deepEqual((await stored(page)).attempts,result.attempts);
    await verifyExport(page,result);
    await page.setViewportSize({width:390,height:844});
    const bounds=await page.locator('#app').boundingBox();
    assert.ok(bounds&&bounds.width<=391,'Progress and export must remain usable on mobile');
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}

async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>error?res.writeHead(404).end():res.writeHead(200,{
      'Content-Type':path.extname(file)==='.js'?'text/javascript':path.extname(file)==='.css'?'text/css':'text/html',
      'Cache-Control':'no-store'}).end(data));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const baseUrl='http://127.0.0.1:'+server.address().port+'/';
    await runScenario(browser,baseUrl,'good');
    await runScenario(browser,baseUrl,'skip');
    process.stdout.write('PASS: real Chromium exact-hour retries, honest rating/skip, reload, backup, mobile.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
