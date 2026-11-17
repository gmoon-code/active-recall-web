/* Optional free browser smoke: Playwright controls locally installed Google Chrome.
   Only the CI runner downloads a free test library; the live website has no dependency. */
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function main(){
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const full=path.resolve(root,name);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(full,(err,data)=>{
      if(err){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1280,height:880}});
    const errors=[];page.on('pageerror',err=>errors.push(err.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const seed=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Browser Biology');
      const req=C.addRequirement(db,{courseId:course.id,kind:'explain',
        question:'How does energy move from electron transport to ATP synthesis?',
        answer:'Electron transport creates a proton gradient. ATP synthase couples proton flow to ATP production.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.addCriterion(db,{targetId:target.id,text:'Electron transport creates a proton gradient.'});
      C.addCriterion(db,{targetId:target.id,text:'ATP synthase couples the gradient to ATP production.'});
      const days=C.DAY,now=Date.now();
      C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:'Electron transport creates a proton gradient.',rating:'good',inputMode:'written',now:new Date(now-3*days)});
      C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:'Electron transport creates a proton gradient and ATP synthase uses it to make ATP.',
        rating:'good',inputMode:'written',now:new Date(now-days)});
      const originalDue=db.memory[target.id].dueAt;
      await S.save(db,null);await S.ready();
      return {originalDue,targetId:target.id,attemptCount:db.attempts.length};
    });
    assert.equal(seed.attemptCount,2);
    await page.reload();await page.locator('[data-page=insights]').click();
    await page.locator('[data-action=open-human-review]').first().click();
    const form=page.locator('form[data-form=save-human-review]');
    await form.waitFor();
    assert.match(await page.locator('[aria-label="Human review of explanation"]').innerText(),/proton gradient and ATP synthase uses it to make ATP/);
    await form.locator('[name=status_0]').selectOption('included');
    await form.locator('[name=excerpt_0]').fill('Electron transport creates a proton gradient');
    await form.locator('[name=status_1]').selectOption('not_demonstrated');
    await form.locator('[name=rationale_1]').fill('The response does not describe the actual coupling mechanism in sufficient detail.');
    await form.locator('[name=confirmed]').check();
    await form.locator('[type=submit]').click();
    await form.waitFor({state:'detached'});
    let saved=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();
      const data=(await window.ActiveRecallStorage.load()).db;
      return {reviews:data.attempts[1].humanReviews?.map(r=>r.finding),due:Object.values(data.memory)[0].dueAt};
    });
    assert.deepEqual(saved.reviews,['gap_identified']);
    assert.equal(saved.due,seed.originalDue);
    await page.locator('[data-action=open-human-review]').first().click();
    const again=page.locator('form[data-form=save-human-review]');
    await again.locator('[name=status_1]').selectOption('included');
    await again.locator('[name=excerpt_1]').fill('ATP synthase uses it to make ATP');
    await again.locator('[name=rationale_1]').fill('');
    await again.locator('[name=confirmed]').check();
    await again.locator('[type=submit]').click();
    await again.waitFor({state:'detached'});
    saved=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();
      const data=(await window.ActiveRecallStorage.load()).db;
      return {reviews:data.attempts[1].humanReviews.map(r=>r.finding),due:Object.values(data.memory)[0].dueAt};
    });
    assert.deepEqual(saved.reviews,['gap_identified','all_supported']);
    assert.equal(saved.due,seed.originalDue);
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-action=open-human-review]').first().click();
    const mobile=await page.locator('.modal').boundingBox();
    assert.ok(mobile&&mobile.width<=391,'Review dialog must fit on a mobile screen');
    assert.deepEqual(errors,[],'Browser runtime errors');
    process.stdout.write('PASS: desktop/mobile browser review, original snapshots, IndexedDB, append-only changes, fixed schedule.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
