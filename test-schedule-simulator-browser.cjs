/* Browser regression: propose -> preview -> explicit confirm, with no memory changes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const full=path.resolve(root,name);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(full,(err,bytes)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1180,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const baseline=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage;
      const db=C.initialDb(),course=C.addCourse(db,'Biology');
      db.agendaPreferences={days:7,weekdayMinutes:5,weekendMinutes:0,missedDates:[]};
      for(let i=0;i<24;i++)C.addRequirement(db,{courseId:course.id,question:`Explain mechanism ${i}?`,answer:`Explanation ${i}.`,kind:'explain'});
      const first=db.retrievalTargets[0];
      C.recordAttempt(db,{requirementId:first.requirementId,targetId:first.id,response:'My attempt',rating:'hard',durationSeconds:60});
      const before={prefs:JSON.stringify(db.agendaPreferences),memory:JSON.stringify(db.memory),attempts:db.attempts.length};
      await S.save(db,null);await S.ready();return before;
    });
    await page.reload();
    await page.locator('.navbtn[data-page=forecast]').click();
    const simulator=page.locator('form[data-form=simulate-schedule]');
    await simulator.locator('[name=weekdayMinutes]').fill('35');
    await simulator.locator('[name=weekendMinutes]').fill('25');
    await simulator.locator('button[type=submit]').click();
    const result=page.locator('.schedule-comparison');
    await result.waitFor();
    assert.match(await result.innerText(),/Current and proposed schedules/);
    assert.match(await result.innerText(),/Known first-pass review slots/);
    const state=async()=>page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();const {db}=await window.ActiveRecallStorage.load();
      return {prefs:JSON.stringify(db.agendaPreferences),memory:JSON.stringify(db.memory),attempts:db.attempts.length,valid:window.ActiveRecallCore.validateImport(db).schemaVersion};
    });
    assert.equal((await state()).prefs,baseline.prefs,'Preview alone must not save');
    assert.equal((await state()).memory,baseline.memory,'Preview cannot change due dates');

    // An edited form invalidates the earlier preview before applying.
    await simulator.locator('[name=weekdayMinutes]').fill('36');
    await result.locator('[data-action=apply-schedule-preview]').click();
    assert.equal((await state()).prefs,baseline.prefs,'Un-previewed edits may not apply');
    await simulator.locator('button[type=submit]').click();
    await result.waitFor();
    page.once('dialog',d=>d.dismiss());
    await result.locator('[data-action=apply-schedule-preview]').click();
    assert.equal((await state()).prefs,baseline.prefs,'Cancelled approval does not save');
    await page.setViewportSize({width:390,height:844});
    const box=await result.boundingBox();
    assert.ok(box&&box.width<=391,'Comparison must fit on a phone');
    page.once('dialog',d=>d.accept());
    await result.locator('[data-action=apply-schedule-preview]').click();
    await result.waitFor({state:'detached'});
    const after=await state();
    assert.equal(JSON.parse(after.prefs).weekdayMinutes,36);
    assert.equal(JSON.parse(after.prefs).weekendMinutes,25);
    assert.equal(after.memory,baseline.memory,'Applying time availability never alters spaced intervals');
    assert.equal(after.attempts,baseline.attempts);
    assert.equal(after.valid,5);
    await page.reload();await page.locator('.navbtn[data-page=forecast]').click();
    assert.equal(await page.locator('#outlook-weekday').inputValue(),'36');
    assert.equal(await page.locator('.schedule-comparison').count(),0,'Preview itself remains ephemeral');
    assert.deepEqual(errors,[],'No browser runtime errors');
    process.stdout.write('PASS: scenario is read-only, edited preview is guarded, explicit approval works, phone layout fits, recall dates stay fixed.\n');
  }finally{
    if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
