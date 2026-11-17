/* Browser-local reviewer handoff, reconciliation and retention smoke test. */
'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const n=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html',full=path.resolve(root,n);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(full,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(data));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1280,height:880}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const original=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Browser Chemistry');
      const req=C.addRequirement(db,{courseId:course.id,kind:'explain',question:'Explain ATP synthase and its energy source.',
        answer:'Electron transport builds a proton gradient. ATP synthase couples proton flow to ATP production.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.addCriterion(db,{targetId:target.id,text:'Electron transport generates a proton gradient.'});
      C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses the gradient to produce ATP.'});
      const a=C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:'Electron transport creates a proton gradient. ATP synthase uses the gradient to produce ATP.',
        rating:'good',inputMode:'written',now:new Date(Date.now()-C.DAY)}).attempt;
      await S.save(db,null);await S.ready();
      return {dueAt:db.memory[target.id].dueAt,attemptId:a.id,originalResponse:a.response,originalRating:a.rating};
    });
    await page.reload();
    await page.locator('[data-page=insights]').click();
    await page.locator('summary').filter({hasText:'Review saved answers with two people'}).click();
    await page.locator('[data-action=open-pair-review]').first().click();
    const modalA=page.locator('[aria-label="Independent reviewer A"]');
    await modalA.waitFor();
    const formA=modalA.locator('form[data-form=save-pair-review]');
    await formA.locator('[name=status_0]').selectOption('included');
    await formA.locator('[name=excerpt_0]').fill('Electron transport creates a proton gradient');
    await formA.locator('[name=status_1]').selectOption('not_demonstrated');
    await formA.locator('[name=rationale_1]').fill('The explanation omits the causal details linking proton movement with ATP formation.');
    await formA.locator('[name=confirmed]').check();
    await formA.locator('button[type=submit]').click();
    const modalB=page.locator('[aria-label="Independent reviewer B"]');
    await modalB.waitFor();
    assert.doesNotMatch(await modalB.innerText(),/A: Not demonstrated|causal details linking proton movement/);
    const formB=modalB.locator('form[data-form=save-pair-review]');
    await formB.locator('[name=reviewerRole]').selectOption('other_person');
    await formB.locator('[name=status_0]').selectOption('included');
    await formB.locator('[name=excerpt_0]').fill('Electron transport creates a proton gradient');
    await formB.locator('[name=status_1]').selectOption('included');
    await formB.locator('[name=excerpt_1]').fill('ATP synthase uses the gradient to produce ATP');
    await formB.locator('[name=differentPerson]').check();
    await formB.locator('[name=noPriorJudgments]').check();
    await formB.locator('[name=confirmed]').check();
    await formB.locator('button[type=submit]').click();
    const compare=page.locator('[aria-label="Compare independent reviewer judgments"]');
    await compare.waitFor();
    assert.match(await compare.innerText(),/A: Not demonstrated/);
    assert.match(await compare.innerText(),/B: Included/);
    const adj=compare.locator('form[data-form=save-pair-adjudication]');
    await adj.locator('[name=resolution_0]').selectOption('unresolved');
    await adj.locator('[name=reason_0]').fill('Reviewers interpret the causal evidence differently and do not yet agree.');
    await adj.locator('[name=adjudicatorRole]').selectOption('other_person');
    await adj.locator('[name=confirmed]').check();
    await adj.locator('button[type=submit]').click();
    await page.locator('text=Earlier adjudications (unaltered)').waitFor();
    const dbResult=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();
      const db=(await window.ActiveRecallStorage.load()).db,a=db.attempts[0],p=a.independentReviewPair;
      return {dueAt:db.memory[a.retrievalTargetId].dueAt,rating:a.rating,response:a.response,
        slots:[p.A.slot,p.B.slot],roles:[p.A.reviewerRole,p.B.reviewerRole],
        findings:[p.A.criteria[1].status,p.B.criteria[1].status],
        adjudications:p.adjudications.map(x=>x.decisions[0].resolution),schema:db.schemaVersion};
    });
    assert.equal(dbResult.schema,5);
    assert.equal(dbResult.dueAt,original.dueAt);
    assert.equal(dbResult.response,original.originalResponse);
    assert.equal(dbResult.rating,original.originalRating);
    assert.deepEqual(dbResult.slots,['A','B']);
    assert.deepEqual(dbResult.findings,['not_demonstrated','included']);
    assert.deepEqual(dbResult.adjudications,['unresolved']);
    await page.setViewportSize({width:390,height:844});
    const bounds=await compare.boundingBox();
    assert.ok(bounds&&bounds.width<=391,'Mobile comparison dialog must fit the viewport');
    await page.reload();await page.locator('[data-page=insights]').click();
    await page.locator('summary').filter({hasText:'Review saved answers with two people'}).click();
    await page.locator('[data-action=open-pair-review]').first().click();
    await page.locator('[aria-label="Compare independent reviewer judgments"]').waitFor();
    assert.match(await page.locator('[aria-label="Compare independent reviewer judgments"]').innerText(),/Earlier adjudications/);
    assert.deepEqual(errors,[],'Browser runtime exceptions');
    process.stdout.write('PASS: desktop/mobile masked B, distinct attestations, disagreement, adjudication, local IndexedDB persistence, unchanged due date.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
