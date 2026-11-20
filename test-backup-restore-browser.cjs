/* Browser regression: a real exported JSON file restores only after a confirmed, committed import. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const full=path.resolve(root,name);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(full,(error,data)=>{
      if(error){res.writeHead(404).end();return;}
      const ext=path.extname(full);
      res.writeHead(200,{'Content-Type':ext==='.js'?'text/javascript':ext==='.css'?'text/css':'text/html','Cache-Control':'no-store'}).end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const url='http://127.0.0.1:'+server.address().port+'/';
    const source=await browser.newContext({acceptDownloads:true}),restore=await browser.newContext();
    const first=await source.newPage(),second=await restore.newPage(),errors=[];
    for(const page of [first,second])page.on('pageerror',error=>errors.push(error.message));
    await first.goto(url);
    await first.locator('[data-action=demo]').waitFor();
    await first.evaluate(async()=>{
      const C=window.ActiveRecallCore,R=window.ActiveRecallStudyRhythm,S=window.ActiveRecallStorage;
      const db=C.initialDb(),course=C.addCourse(db,'Fictional Biology');
      const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What powers ATP synthase?',answer:'A proton gradient.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:'A proton gradient.',rating:'good',now:new Date()});
      C.addRequirement(db,{courseId:course.id,kind:'recall',question:'Where is DNA found?',answer:'In cells.'});
      C.addAssessment(db,{courseId:course.id,title:'Fictional exam',date:C.addDays(new Date(),7),
        scope:'selected',requirementIds:[req.id]});
      db.agendaPreferences={days:21,weekdayMinutes:25,weekendMinutes:0,missedDates:[C.today()]};
      R.logOutsideStudy(db,{date:C.today(),minutes:15,kind:'reading',note:'Fictional reading, not recall'});
      R.recordDailyPlan(db,C);
      await S.save(db,null);await S.ready();
    });
    await first.reload();
    await first.locator('.navbtn[data-page=insights]').click();
    const [download]=await Promise.all([
      first.waitForEvent('download'),first.locator('[data-action=export]').click()
    ]);
    const downloadedPath=await download.path();
    assert.ok(downloadedPath,'Browser must produce a downloadable JSON backup');
    const raw=fs.readFileSync(downloadedPath,'utf8'),exported=JSON.parse(raw);
    assert.equal(exported.schemaVersion,5);
    assert.equal(exported.attempts.length,1);
    assert.equal(exported.outsideStudyLogs.length,1);
    assert.equal(exported.agendaPreferences.weekdayMinutes,25);
    assert.doesNotMatch(raw,/default-weights-shadow-v1|"model"\s*:\s*"FSRS-7"/);

    await second.goto(url);
    await second.locator('[data-action=demo]').waitFor();
    await second.locator('.navbtn[data-page=insights]').click();
    second.once('dialog',dialog=>dialog.accept());
    const file=second.locator('#import-file');
    await file.setInputFiles({name:'fictional-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
    await second.getByText('Backup imported.',{exact:true}).waitFor();
    await second.reload();
    const anchor=new Date().toISOString();
    const saved=async page=>page.evaluate(async ({anchor})=>{
      const S=window.ActiveRecallStorage,C=window.ActiveRecallCore;
      await S.ready();const {db}=await S.load(),start=new Date(anchor);
      return {db:JSON.parse(JSON.stringify(db)),
        queue:JSON.stringify(C.planActivities(db,25,[],{},start)),
        calendar:JSON.stringify(C.buildReviewAgenda(db,{start,...db.agendaPreferences}))};
    },{anchor});
    const original=await saved(first),recovered=await saved(second);
    assert.ok(JSON.parse(original.queue).items.length>0,'Fixture should create actual study candidates');
    assert.ok(JSON.parse(original.calendar).days.some(day=>day.activities.length>0),
      'Fixture should create actual calendar placements');
    assert.deepEqual(recovered.db,exported,'Real browser import and reload preserve every schema-v5 field');
    assert.deepEqual(recovered.queue,original.queue,'Automatic study queue survives restore');
    assert.deepEqual(recovered.calendar,original.calendar,'Feasible calendar survives restore');

    // A valid backup dismissed at the overwrite prompt cannot change anything.
    await second.locator('.navbtn[data-page=insights]').click();
    const changed=structuredClone(exported);changed.courses[0].name='Unwanted replacement';
    const declined=new Promise(resolve=>second.once('dialog',async dialog=>{await dialog.dismiss();resolve();}));
    await second.locator('#import-file').setInputFiles({name:'declined-backup.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(changed))});
    await declined;
    assert.deepEqual((await saved(second)).db,exported,'Cancelling an overwrite preserves the existing notebook');

    // A corrupt versioned scheduling decision must fail before any overwrite prompt.
    const invalid=structuredClone(exported);
    invalid.attempts[0].schedulingDecision.activeDueAt='2030-01-01T00:00:00.000Z';
    await second.locator('#import-file').setInputFiles({name:'invalid-backup.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(invalid))});
    await second.getByText(/Backup not imported: Invalid versioned scheduling decision/).waitFor();
    assert.deepEqual((await saved(second)).db,exported,'Invalid import must not damage a restored notebook');
    assert.deepEqual((await saved(first)).db,exported,'Separate source browser remains untouched');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: browser export/download, confirmed import, reload, queue/calendar, cancel, and corrupt backup protection.\n');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
