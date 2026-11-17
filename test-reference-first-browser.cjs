/* Chromium v4.4 reference-free first pass, deliberate later reveal, optional second human assessment. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function main(){
 const root=process.cwd(),server=http.createServer((req,res)=>{
   const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/,'')||'index.html';
   const full=path.resolve(root,name);
   if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return}
   fs.readFile(full,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{
     'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(data));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
   browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
   const context=await browser.newContext({viewport:{width:1280,height:880},acceptDownloads:true});
   const owner=await context.newPage(),errors=[];
   owner.on('pageerror',e=>errors.push('owner '+e.message));
   await owner.goto('http://127.0.0.1:'+server.address().port+'/');
   await owner.locator('[data-action=demo]').waitFor();
   const original=await owner.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Scientific Mechanics');
      const req=C.addRequirement(db,{courseId:course.id,kind:'explain',
        question:'Explain how a proton gradient supports ATP synthase.',
        answer:'PRIVATE_REFERENCE: electron transport establishes proton motive force and ATP synthase converts it into mechanical rotation and ATP formation.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      C.addCriterion(db,{targetId:target.id,text:'Electron transport builds a proton gradient.'});
      C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses protons to make ATP.'});
      const a=C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:'Electron transport builds a proton gradient. ATP synthase uses protons to make ATP.',
        inputMode:'written',rating:'good',now:new Date(Date.now()-C.DAY)}).attempt;
      await S.save(db,null);await S.ready();
      return {response:a.response,reference:a.referenceSnapshot,rating:a.rating,due:db.memory[target.id].dueAt};
   });
   await owner.reload();await owner.locator('[data-page=insights]').click();
   await owner.locator('summary').filter({hasText:'Export reference-free request and release later references'}).click();
   const packetPromise=owner.waitForEvent('download');
   await owner.locator('[data-action=export-reference-first-request]').first().click();
   const packetDl=await packetPromise,requestPath=await packetDl.path();
   const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
   assert.equal(request.format,'arw-reference-free-request-v1');
   assert.equal('reference' in request.attempt,false);
   assert.equal(JSON.stringify(request).includes(original.reference),false);
   assert.equal(request.attempt.response,original.response);
   const standalone='file://'+path.join(root,'reference-reviewer-offline.html');
   async function openReviewer(slot){
     const reviewerContext=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:390,height:850}});
     const page=await reviewerContext.newPage();
     const network=[];page.on('request',r=>network.push(r.url()));
     page.on('pageerror',e=>errors.push(slot+' '+e.message));
     await page.goto(standalone);
     await page.locator('#request-file').setInputFiles(requestPath);
     await page.locator('#review-section').waitFor({state:'visible'});
     assert.doesNotMatch(await page.locator('body').innerText(),/PRIVATE_REFERENCE: electron transport establishes proton motive force/);
     assert.equal(await page.locator('#reference-section').isVisible(),false);
     await page.locator('#slot').selectOption(slot);
     await page.locator('#role').selectOption(slot==='A'?'self':'other_person');
     await page.locator('#first-status-0').selectOption('included');
     await page.locator('#first-excerpt-0').fill('Electron transport builds a proton gradient');
     await page.locator('#first-status-1').selectOption(slot==='A'?'not_demonstrated':'included');
     if(slot==='A')await page.locator('#first-rationale-1').fill('Does not describe the mechanistic coupling clearly enough for my interpretation.');
     else await page.locator('#first-excerpt-1').fill('ATP synthase uses protons to make ATP');
     if(slot==='B'){await page.locator('#distinct-person').check();await page.locator('#no-prior-a').check();}
     await page.locator('#unseen-reference').check();await page.locator('#confirm-first').check();
     const dlPromise=page.waitForEvent('download');
     await page.locator('#first-form button[type=submit]').click();
     const download=await dlPromise,firstPath=await download.path();
     const firstBytes=fs.readFileSync(firstPath),first=JSON.parse(firstBytes.toString('utf8'));
     assert.equal(first.referenceUnseenAttested,true);
     assert.equal(first.slot,slot);
     assert.equal(first.requestId,request.requestId);
     assert.equal(await page.locator('#first-form').isVisible(),false);
     assert.equal(await page.locator('#locked-section').isVisible(),true);
     assert.equal(await page.locator('#reference-section').isVisible(),false);
     assert.deepEqual(network.filter(x=>/^https?:/i.test(x)),[],'Reviewer page must load no HTTP resources');
     const bounds=await page.locator('#locked-section').boundingBox();
     assert.ok(bounds&&bounds.width<=391,'Offline reviewer must fit mobile viewport');
     return {context:reviewerContext,page,first,firstBytes};
   }
   const A=await openReviewer('A'),B=await openReviewer('B');
   const asFile=(bytes,name)=>({name,mimeType:'application/json',buffer:bytes});
   await owner.locator('#reference-first-import').setInputFiles(asFile(B.firstBytes,'B-first.json'));
   await owner.locator('.toast.error').waitFor();
   assert.match(await owner.locator('.toast.error').innerText(),/Import first-pass Reviewer A first/);
   await owner.locator('#reference-first-import').setInputFiles(asFile(A.firstBytes,'A-first.json'));
   await owner.locator('.toast:not(.error)').waitFor();
   assert.equal(await owner.locator('[data-action=export-reference-reveal]').count(),0,
     'Reference must remain withheld until both distinct first passes are imported.');
   await owner.locator('#reference-first-import').setInputFiles(asFile(B.firstBytes,'B-first.json'));
   await owner.locator('.toast:not(.error)').waitFor();
   const revealPromise=owner.waitForEvent('download',{timeout:8000});
   await owner.locator('[data-action=export-reference-reveal][data-slot="A"]').click();
   const revealDl=await Promise.race([
     revealPromise,
     owner.locator('.toast.error').waitFor({timeout:5000}).then(async()=>{throw Error('Reveal UI rejected export: '+await owner.locator('.toast.error').innerText());})
       .catch(error=>{if(error.name==='TimeoutError')return new Promise(()=>{});throw error;})
   ]),revealPath=await revealDl.path();
   const revealBytes=fs.readFileSync(revealPath),reveal=JSON.parse(revealBytes.toString('utf8'));
   assert.equal(reveal.reference,original.reference);
   assert.equal(reveal.firstSubmissionFingerprint,await owner.evaluate(first=>window.ActiveRecallHumanReview.fingerprint(JSON.stringify(first)),A.first));
   await A.page.locator('#reveal-file').setInputFiles(asFile(revealBytes,'A-reveal.json'));
   await A.page.locator('#reference-section').waitFor({state:'visible'});
   assert.match(await A.page.locator('#reference').innerText(),/PRIVATE_REFERENCE:/);
   assert.equal(await B.page.locator('#reference-section').isVisible(),false,
     'Reviewer B must still have no reference on their separate device');
   await A.page.locator('#post-status-1').selectOption('included');
   await A.page.locator('#post-excerpt-1').fill('ATP synthase uses protons to make ATP');
   await A.page.locator('#confirm-seen').check();
   const postPromise=A.page.waitForEvent('download');
   await A.page.locator('#post-form button[type=submit]').click();
   const postDl=await postPromise,postBytes=fs.readFileSync(await postDl.path());
   const post=JSON.parse(postBytes.toString('utf8'));
   assert.equal(post.format,'arw-post-reference-review-v1');
   await owner.locator('#reference-post-import').setInputFiles(asFile(postBytes,'A-post.json'));
   await owner.locator('.toast:not(.error)').waitFor();
   const dbSaved=await owner.evaluate(async()=>{
     await window.ActiveRecallStorage.ready();
     const db=(await window.ActiveRecallStorage.load()).db,a=db.attempts[0],
       p=a.independentReviewPair,change=a.referencePostReviews[0].changes;
     return {schema:db.schemaVersion,due:db.memory[a.retrievalTargetId].dueAt,
       response:a.response,rating:a.rating,slots:[p.A.slot,p.B.slot],
       first:[p.A.criteria[1].status,p.B.criteria[1].status],
       post:a.referencePostReviews[0].submission.findings[1].status,
       postChanged:change[1].changed,disagreement:window.ActiveRecallPairedReview.comparison(a).disagreements};
   });
   assert.equal(dbSaved.schema,5);assert.equal(dbSaved.due,original.due);
   assert.equal(dbSaved.response,original.response);assert.equal(dbSaved.rating,original.rating);
   assert.deepEqual(dbSaved.slots,['A','B']);
   assert.deepEqual(dbSaved.first,['not_demonstrated','included']);
   assert.equal(dbSaved.post,'included');
   assert.equal(dbSaved.postChanged,true);
   assert.equal(dbSaved.disagreement,1,'The original two reviewer judgments must never be overwritten');
   await owner.reload();await owner.locator('[data-page=insights]').click();
   assert.equal(await owner.evaluate(async()=>{
     const db=window.ActiveRecallCore.validateImport((await window.ActiveRecallStorage.load()).db);
     return db.attempts[0].referencePostReviews[0].submission.firstSubmissionFingerprint;
   }),post.firstSubmissionFingerprint);
   assert.deepEqual(errors,[],'No browser runtime exceptions');
   await A.context.close();await B.context.close();
   process.stdout.write('PASS: two disconnected file:// reviewers, no initial reference, locked A/B, guarded reveal, post-reference shift, replay-safe owner import, preserved due date, mobile.\n');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
