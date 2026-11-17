/* Real browser v4.5: register prospectively, screen every future attempt,
   add actual reviewer evidence, export coded data with no original source text. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function main(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
   const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html';
   const full=path.resolve(root,name);
   if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   fs.readFile(full,(err,buffer)=>err?res.writeHead(404).end():res.writeHead(200,{
     'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(buffer));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
   browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
   const context=await browser.newContext({viewport:{width:1280,height:840},acceptDownloads:true});
   const owner=await context.newPage(),errors=[];
   owner.on('pageerror',e=>errors.push(e.message));
   await owner.goto('http://127.0.0.1:'+server.address().port+'/');
   await owner.locator('[data-action=demo]').waitFor();
   await owner.locator('[data-page=insights]').click();
   await owner.locator('form[data-form=start-reviewer-pilot]').waitFor();
   await owner.locator('#pilot-target-count').selectOption('3');
   await owner.locator('form[data-form=start-reviewer-pilot] input[name=confirmed]').check();
   await owner.locator('form[data-form=start-reviewer-pilot] button[type=submit]').click();
   await owner.locator('[data-action=export-reviewer-pilot-csv]').waitFor();
   await owner.waitForTimeout(250); // owner-side IndexedDB save is asynchronous
   const original=await owner.evaluate(async()=>{
     const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,P=window.ActiveRecallReviewerPilot;
     const db=(await S.load()).db;
     if(!db.reviewerPilot)throw Error('Pilot protocol did not persist.');
     const course=C.addCourse(db,'PRIVATE_COURSE_DO_NOT_EXPORT');
     const reqs=[],targets=[],activities=[];
     for(let i=0;i<3;i++){
       const req=C.addRequirement(db,{courseId:course.id,kind:'explain',
         question:'PRIVATE_QUESTION_'+i+' Describe the causal mechanism in a proton gradient.',
         answer:'PRIVATE_REFERENCE_'+i+' Electron transport stores energy and ATP synthase uses it.'});
       const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
       C.addCriterion(db,{targetId:target.id,text:'Electron transport stores energy in a gradient '+i+'.'});
       C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses this gradient to form ATP '+i+'.'});
       reqs.push(req);targets.push(target);activities.push(activity);
     }
     const now=Date.now()+120000;
     function attempt(i,offset,{assisted=false,practiceStage=null}={}){
       return C.recordAttempt(db,{requirementId:reqs[i].id,targetId:targets[i].id,activityId:activities[i].id,
         inputMode:'written',response:'PRIVATE_LEARNER_EXCERPT Electron transport stores energy in a gradient. ATP synthase uses this gradient to form ATP.',
         assisted,practiceStage,rating:'good',now:new Date(now+offset*60000)}).attempt;
     }
     attempt(0,0,{assisted:true});
     const one=attempt(0,1);
     attempt(0,2);
     const two=attempt(1,3);
     const three=attempt(2,4);
     const audit=P.audit(db);
     if(audit.enrolled!==3||audit.excluded!==2||audit.status!=='target_reached')
       throw Error('Unexpected prospective sample composition: '+JSON.stringify(audit));
     C.validateImport(db);
     await S.save(db,null);
     return {firstId:one.id,firstTarget:one.retrievalTargetId,
       firstDue:db.memory[one.retrievalTargetId].dueAt,
       originalResponse:one.response,
       protocolLockedAt:db.reviewerPilot.lockedAt,
       expectedScreened:db.reviewerPilot.entries.map(x=>x.decision)};
   });
   assert.deepEqual(original.expectedScreened,['excluded','enrolled','excluded','enrolled','enrolled']);
   await owner.reload();
   await owner.locator('[data-page=insights]').click();
   await owner.locator('#reviewer-pilot').getByText('Planned quota reached').waitFor();
   assert.match(await owner.locator('#reviewer-pilot').innerText(),/3 \/ 3/);
   assert.match(await owner.locator('#reviewer-pilot').innerText(),/2 excluded attempts|Excluded attempts/i);
   const csvDownload=owner.waitForEvent('download');
   await owner.locator('[data-action=export-reviewer-pilot-csv]').click();
   const csv=fs.readFileSync(await (await csvDownload).path(),'utf8');
   assert.match(csv,/screen_order,case,criterion_index/);
   assert.match(csv,/assisted/);
   assert.match(csv,/duplicate_target/);
   assert.match(csv,/missing/);
   assert.doesNotMatch(csv,/PRIVATE_LEARNER_EXCERPT|PRIVATE_REFERENCE|PRIVATE_QUESTION|PRIVATE_COURSE/);
   assert.ok(!csv.includes(original.firstId),'Internal original attempt ID must not be in a shareable coded CSV.');
   const manifestDownload=owner.waitForEvent('download');
   await owner.locator('[data-action=export-reviewer-pilot-protocol]').click();
   const manifest=JSON.parse(fs.readFileSync(await (await manifestDownload).path(),'utf8'));
   assert.equal(manifest.format,'arw-reviewer-pilot-summary-v1');
   assert.equal(manifest.plannedTargets,3);
   assert.equal(manifest.reportedCounts.enrolled,3);
   assert.equal(manifest.reportedCounts.excluded,2);
   assert.ok(!JSON.stringify(manifest).includes('PRIVATE_REFERENCE'));
   // Previously released v4.4 reviewer workflow should update only evidence,
   // not eligibility, original scheduling, or baseline pilot selection.
   await owner.evaluate(async attemptId=>{
     const S=window.ActiveRecallStorage,F=window.ActiveRecallReferenceFirst;
     const db=(await S.load()).db,a=db.attempts.find(x=>x.id===attemptId);
     const now=new Date(Date.now()+3600000);
     const request=F.issue(db,{attemptId,requestId:'c5a88208-80a7-454a-aa00-5e2c631615f4',now});
     const statuses=(slot)=>request.attempt.criteria.map((c,i)=>({
       criterionId:c.criterionId,criterionVersion:c.version,
       status:i===1&&slot==='A'?'not_demonstrated':'included',
       excerpt:i===1&&slot==='A'?'':i===0?'Electron transport stores energy in a gradient':'ATP synthase uses this gradient to form ATP',
       rationale:i===1&&slot==='A'?'The causal relationship does not fully explain energy transfer.':''}));
     const A=F.createFirst(request,{slot:'A',reviewerRole:'self',findings:statuses('A'),
       confirmed:true,referenceUnseen:true,completedAt:new Date(now.getTime()+60000).toISOString()});
     const B=F.createFirst(request,{slot:'B',reviewerRole:'other_person',findings:statuses('B'),
       confirmed:true,referenceUnseen:true,differentPerson:true,noPriorJudgments:true,
       completedAt:new Date(now.getTime()+60000).toISOString()});
     F.importFirst(db,A,{now:new Date(now.getTime()+120000)});
     F.importFirst(db,B,{now:new Date(now.getTime()+180000)});
     window.ActiveRecallCore.validateImport(db);
     await S.save(db,null);
   },original.firstId);
   await owner.reload();
   await owner.locator('[data-page=insights]').click();
   const audit=await owner.evaluate(async()=>{
     const S=window.ActiveRecallStorage,P=window.ActiveRecallReviewerPilot,C=window.ActiveRecallCore,
       db=C.validateImport((await S.load()).db);
     const a=P.audit(db),first=db.attempts.find(x=>x.id===db.reviewerPilot.entries[1].attemptId);
     return {paired:a.paired,waitingA:a.awaitingA,agreed:a.agreements,disagreed:a.disagreements,
       entries:db.reviewerPilot.entries.length,due:db.memory[first.retrievalTargetId].dueAt,
       status:a.status,lockedAt:db.reviewerPilot.lockedAt};
   });
   assert.equal(audit.paired,1);assert.equal(audit.waitingA,2);
   assert.equal(audit.agreed,1);assert.equal(audit.disagreed,1);
   assert.equal(audit.due,original.firstDue);assert.equal(audit.lockedAt,original.protocolLockedAt);
   assert.equal(audit.status,'target_reached');assert.equal(audit.entries,5);
   await owner.setViewportSize({width:390,height:844});
   const rect=await owner.locator('#reviewer-pilot').boundingBox();
   assert.ok(rect&&rect.width<=391,'Pilot audit panel must fit mobile viewport.');
   assert.deepEqual(errors,[],'No browser JS exceptions.');
   process.stdout.write('PASS: browser prospective protocol lock, consecutive attempt screening, fixed quota, private CSV and protocol files, later A/B evidence, untouched due dates, mobile layout.\n');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
