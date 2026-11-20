/* Browser regression for the monthly grid, navigation, and read-only records. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,bytes)=>err?res.writeHead(404).end():res.writeHead(200,
      {'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('[data-action=demo]').waitFor();
    const expected=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,M=window.ActiveRecallMonthCalendar;
      const db=C.initialDb(),course=C.addCourse(db,'Biology');
      const first=C.addRequirement(db,{courseId:course.id,question:'What makes ATP?',answer:'ATP synthase.',kind:'recall'});
      const future=C.addRequirement(db,{courseId:course.id,question:'What is DNA?',answer:'Deoxyribonucleic acid.',kind:'recall'});
      const target=C.getTarget(db,future.id);
      C.recordAttempt(db,{requirementId:future.id,targetId:target.id,rating:'good',response:'DNA',durationSeconds:60});
      const next=new Date(),date=new Date(next.getFullYear(),next.getMonth()+3,15,12);
      db.memory[target.id].dueAt=date.toISOString();
      const due=M.localDate(date),month=M.monthOf(date);
      C.addAssessment(db,{courseId:course.id,title:'Later exam',date:due});
      const firstSnapshot=window.ActiveRecallStudyRhythm.recordDailyPlan(db,C,{reason:'first_open'});
      assertOk(firstSnapshot);
      C.validateImport(db);
      await S.save(db,null);
      return {due,month,memory:JSON.stringify(db.memory),attempts:db.attempts.length};
      function assertOk(value){if(!value)throw Error('Expected valid plan snapshot');}
    });
    await page.reload();
    await page.locator('.navbtn[data-page=forecast]').click();
    assert.equal(await page.locator('.outlook-day').count(),21,'Original 21-day list stays');
    const calendar=page.locator('.month-calendar');
    await calendar.locator('.month-calendar-day').first().waitFor();
    assert.equal(await calendar.locator('.month-calendar-grid > *').count(),42);
    const label=await calendar.locator('.month-calendar-nav > strong').innerText();
    await calendar.locator('[data-action=calendar-next]').click();
    assert.notEqual(await calendar.locator('.month-calendar-nav > strong').innerText(),label);
    await calendar.locator('[data-action=calendar-previous]').click();
    assert.equal(await calendar.locator('.month-calendar-nav > strong').innerText(),label);
    await calendar.locator('#calendar-month-input').fill(expected.month);
    await calendar.locator('form[data-form=calendar-jump] button[type=submit]').click();
    const farDay=calendar.locator(`[data-action=calendar-select-day][data-date="${expected.due}"]`);
    await farDay.waitFor();
    assert.match(await farDay.innerText(),/1 due/);
    assert.match(await farDay.innerText(),/1 exam/);
    await farDay.click();
    assert.match(await calendar.locator('.month-calendar-detail').innerText(),/Saved review due date/);
    assert.match(await calendar.locator('.month-calendar-detail').innerText(),/not assigned a study slot yet/i);
    assert.match(await calendar.locator('.month-calendar-detail').innerText(),/Later exam/);
    assert.equal(await farDay.getAttribute('aria-pressed'),'true');
    const state=async()=>page.evaluate(async()=>{
      const {db}=await window.ActiveRecallStorage.load();
      return {memory:JSON.stringify(db.memory),attempts:db.attempts.length,
        prefs:db.agendaPreferences,snapshots:db.studyPlanHistory.length,
        schema:window.ActiveRecallCore.validateImport(db).schemaVersion};
    });
    const afterBrowsing=await state();
    assert.equal(afterBrowsing.memory,expected.memory,'Calendar navigation cannot alter due dates');
    assert.equal(afterBrowsing.attempts,expected.attempts,'Calendar navigation cannot create practice evidence');
    assert.equal(afterBrowsing.snapshots,1,'Browsing months does not append plan revisions');
    assert.equal(afterBrowsing.schema,5);

    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2),'Month grid fits a phone');
    const bounds=await calendar.boundingBox();assert.ok(bounds&&bounds.width<=391);
    await calendar.locator('[data-action=calendar-today]').click();
    assert.equal(await calendar.locator('.month-calendar-nav > strong').innerText(),label);
    assert.equal(await page.locator('.outlook-day').count(),21);
    assert.equal((await state()).memory,expected.memory);
    assert.deepEqual(errors,[],'No browser errors');
    process.stdout.write('PASS: 21-day list preserved; month navigation, far due/exam labels, mobile grid, history and due dates unchanged.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
