/* Free local browser regression for the human Q&A quality workflow. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const seed=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Enzyme Biology');
      const source=C.addSource(db,{courseId:course.id,title:'Enzymes',content:'ATP synthase produces ATP only when a proton gradient is present.'});
      const req=db.requirements.find(x=>x.sourceId===source.source.id);
      const second=C.addRequirement(db,{courseId:course.id,question:'What is a proton gradient?',answer:'An electrochemical difference.',kind:'recall'});
      const target=C.getTarget(db,second.id),a=C.getActivities(db,second.id)[0];
      C.recordAttempt(db,{requirementId:second.id,targetId:target.id,activityId:a.id,rating:'good',response:'A charge difference',now:new Date('2026-11-10T12:00:00Z')});
      const due=db.memory[target.id].dueAt;
      await S.save(db,null);await S.ready();return {reqId:req.id,due};
    });
    await page.reload();await page.locator('.navbtn[data-page=courses]').click();
    await page.locator('[data-action=verify-requirement][data-id="'+seed.reqId+'"]').click();
    const review=page.locator('[aria-label="Question and answer quality review"]');
    await review.waitFor();
    assert.match(await review.innerText(),/four|Confirm after checking the actual material/i);
    const checks=review.locator('input[type=checkbox]');assert.equal(await checks.count(),4);
    await checks.nth(0).check();await checks.nth(1).check();await checks.nth(2).check();await checks.nth(3).check();
    await review.locator('[type=submit]').click();await review.waitFor({state:'detached'});
    const state=await page.evaluate(async()=>{
      const db=(await window.ActiveRecallStorage.load()).db;
      return {verified:db.requirements.find(r=>r.origin==='rule_draft').verificationStatus,
        quality:db.events.filter(e=>e.type==='question_quality.reviewed').length,
        due:Object.values(db.memory)[0].dueAt};
    });
    assert.equal(state.verified,'verified');assert.equal(state.quality,1);assert.equal(state.due,seed.due);
    await page.locator('[data-action=quality-review][data-id="'+seed.reqId+'"]').click();
    assert.match(await page.locator('[aria-label="Question and answer quality review"]').innerText(),/already has a recorded human quality check/);
    await page.setViewportSize({width:390,height:844});
    const rect=await page.locator('.modal').boundingBox();assert.ok(rect&&rect.width<=391,'Quality modal must fit mobile width');
    assert.deepEqual(errors,[],'No page-level JavaScript errors');
    process.stdout.write('PASS: source-backed quality confirmation, persistent review, unchanged intervals, mobile layout.\n');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
