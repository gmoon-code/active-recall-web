/* Native browser test of portable offline-review packets, no paid services. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html';
    const full=path.resolve(root,file);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return}
    fs.readFile(full,(err,body)=>err?res.writeHead(404).end():res.writeHead(200,{
      'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(body));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const ownerContext=await browser.newContext({viewport:{width:1280,height:880},acceptDownloads:true});
    const owner=await ownerContext.newPage(),errors=[];
    owner.on('pageerror',e=>errors.push('owner: '+e.message));
    await owner.goto('http://127.0.0.1:'+server.address().port+'/');
    await owner.locator('[data-action=demo]').waitFor();
    const original=await owner.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Browser Physics');
      const req=C.addRequirement(db,{courseId:course.id,kind:'explain',
        question:'Explain the relationship between electron transport and ATP synthesis.',
        answer:'Electron transport generates a proton gradient. ATP synthase uses the gradient for ATP synthesis.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.addCriterion(db,{targetId:target.id,text:'Electron transport builds the proton gradient.'});
      C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses the gradient for ATP synthesis.'});
      const a=C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:'Electron transport builds the proton gradient, which ATP synthase uses for ATP synthesis.',
        rating:'good',inputMode:'written',now:new Date(Date.now()-C.DAY)}).attempt;
      await S.save(db,null);await S.ready();
      return {attemptId:a.id,response:a.response,due:db.memory[target.id].dueAt,rating:a.rating};
    });
    await owner.reload();
    await owner.locator('[data-page=insights]').click();
    await owner.locator('summary').filter({hasText:'Create or re-download a request for one saved answer'}).click();
    const download=owner.waitForEvent('download');
    await owner.locator('[data-action=export-offline-review-request]').first().click();
    const packetDl=await download;
    const packetPath=await packetDl.path(),packet=JSON.parse(fs.readFileSync(packetPath,'utf8'));
    assert.equal(packet.format,'arw-offline-review-request-v1');
    assert.equal(packet.attempt.response,original.response);
    assert.ok(!JSON.stringify(packet).includes('Browser Physics'),'Request should not copy course metadata');
    const offlinePage='file://'+path.join(root,'reviewer-offline.html');
    async function offlineReview(slot){
      const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:390,height:844}});
      const reviewer=await context.newPage(),requests=[];
      reviewer.on('request',r=>requests.push(r.url()));
      reviewer.on('pageerror',e=>errors.push(slot+': '+e.message));
      await reviewer.goto(offlinePage);
      await reviewer.locator('#packet-file').setInputFiles(packetPath);
      await reviewer.locator('#work').waitFor({state:'visible'});
      assert.match(await reviewer.locator('#question').innerText(),/electron transport and ATP synthesis/i);
      await reviewer.locator('#slot').selectOption(slot);
      await reviewer.locator('#role').selectOption(slot==='A'?'self':'other_person');
      await reviewer.locator('#status-0').selectOption('included');
      await reviewer.locator('#excerpt-0').fill('Electron transport builds the proton gradient');
      await reviewer.locator('#status-1').selectOption(slot==='A'?'not_demonstrated':'included');
      if(slot==='A')await reviewer.locator('#reason-1').fill('The explanation does not describe the causal connection between the gradient and ATP production.');
      else await reviewer.locator('#excerpt-1').fill('ATP synthase uses for ATP synthesis');
      if(slot==='B'){
        await reviewer.locator('#different').check();
        await reviewer.locator('#unseen').check();
      }
      await reviewer.locator('#confirmed').check();
      const responseDlPromise=reviewer.waitForEvent('download');
      await reviewer.locator('#review-form button[type=submit]').click();
      const responseDl=await responseDlPromise;
      const responsePath=await responseDl.path(),response=JSON.parse(fs.readFileSync(responsePath,'utf8'));
      assert.equal(response.slot,slot);
      assert.equal(response.requestId,packet.requestId);
      assert.ok(!JSON.stringify(response).includes(packet.attempt.reference),'Completed response must not contain full reference');
      assert.deepEqual(requests.filter(x=>/^https?:/i.test(x)),[],'Reviewer page must not load network resources');
      const bounds=await reviewer.locator('#review-form').boundingBox();
      assert.ok(bounds&&bounds.width<=391,'Offline reviewer form must fit mobile');
      await context.close();
      return {path:responsePath,body:response};
    }
    const reviewerA=await offlineReview('A');
    const reviewerB=await offlineReview('B');
    await owner.locator('#offline-review-response-file').setInputFiles(reviewerB.path);
    await owner.locator('.toast.error').waitFor();
    assert.match(await owner.locator('.toast').innerText(),/Import Reviewer A first/);
    await owner.locator('#offline-review-response-file').setInputFiles(reviewerA.path);
    await owner.locator('.toast:not(.error)').waitFor();
    await owner.locator('#offline-review-response-file').setInputFiles(reviewerB.path);
    await owner.locator('.toast:not(.error)').waitFor();
    const saved=await owner.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();
      const db=(await window.ActiveRecallStorage.load()).db,a=db.attempts[0],p=a.independentReviewPair;
      return {due:db.memory[a.retrievalTargetId].dueAt,rating:a.rating,response:a.response,
        roles:[p.A.reviewerRole,p.B.reviewerRole],
        slots:[p.A.slot,p.B.slot],
        statuses:[p.A.criteria[1].status,p.B.criteria[1].status],
        provenance:[p.A.offlinePacket.requestId,p.B.offlinePacket.requestId],
        agreement:window.ActiveRecallPairedReview.comparison(a).disagreements,
        schema:db.schemaVersion};
    });
    assert.equal(saved.schema,5);assert.equal(saved.due,original.due);
    assert.equal(saved.rating,original.rating);assert.equal(saved.response,original.response);
    assert.deepEqual(saved.slots,['A','B']);
    assert.deepEqual(saved.statuses,['not_demonstrated','included']);
    assert.deepEqual(saved.provenance,[packet.requestId,packet.requestId]);
    assert.equal(saved.agreement,1);
    await owner.locator('summary').filter({hasText:'Review saved answers with two people'}).click();
    await owner.locator('[data-action=open-pair-review]').first().click();
    await owner.locator('[aria-label="Compare independent reviewer judgments"]').waitFor();
    await owner.setViewportSize({width:390,height:844});
    const box=await owner.locator('[aria-label="Compare independent reviewer judgments"]').boundingBox();
    assert.ok(box&&box.width<=391,'Imported pair comparison must fit a mobile viewport');
    await owner.reload();await owner.locator('[data-page=insights]').click();
    assert.equal(await owner.evaluate(async()=>{
      const C=window.ActiveRecallCore,Store=window.ActiveRecallStorage;
      const db=C.validateImport((await Store.load()).db);
      return db.attempts[0].independentReviewPair.B.offlinePacket.requestId;
    }),packet.requestId);
    assert.deepEqual(errors,[],'No JavaScript runtime errors');
    process.stdout.write('PASS: two isolated offline file:// reviewers, local request/response JSON, B-before-A rejection, import and persistence, untouched schedule, mobile.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
