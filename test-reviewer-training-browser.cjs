/* Real Chromium v4.6: owner issues only synthetic training material;
   isolated offline A/B judgments are locked before separate discussion prompts;
   original files survive owner import and backup, with no study scheduling change. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function main(){
 const root=process.cwd(),server=http.createServer((req,res)=>{
   const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/,'')||'index.html';
   const full=path.resolve(root,name);
   if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   fs.readFile(full,(err,data)=>err?res.writeHead(404).end():
     res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(data));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
   browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
   const context=await browser.newContext({viewport:{width:1220,height:850},acceptDownloads:true});
   const owner=await context.newPage(),errors=[];
   owner.on('pageerror',e=>errors.push('owner: '+e.message));
   await owner.goto('http://127.0.0.1:'+server.address().port+'/');
   await owner.locator('[data-action=demo]').waitFor();
   await owner.locator('[data-page=insights]').click();
   await owner.locator('form[data-form=start-reviewer-training] input[name=confirmed]').check();
   await owner.locator('form[data-form=start-reviewer-training] button[type=submit]').click();
   await owner.locator('[data-action=export-reviewer-training-request]').waitFor();
   const requestDl=owner.waitForEvent('download');
   await owner.locator('[data-action=export-reviewer-training-request]').click();
   const requestPath=await (await requestDl).path(),request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
   assert.equal(request.format,'arw-reviewer-training-request-v1');
   assert.equal(request.cases.length,3);
   assert.equal('attempts' in request,false);
   assert.equal(request.cases[2].criteria.at(-1).id,'vague');
   async function reviewer(slot){
     const reviewerContext=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:390,height:844}});
     const page=await reviewerContext.newPage(),requests=[];
     page.on('request',r=>requests.push(r.url()));
     page.on('pageerror',e=>errors.push(slot+': '+e.message));
     await page.goto('file://'+path.join(root,'reviewer-training-offline.html'));
     assert.equal(await page.locator('#guidance-section').isVisible(),false);
     await page.locator('#training-request-file').setInputFiles(requestPath);
     await page.locator('#training-form').waitFor({state:'visible'});
     assert.equal(await page.locator('#guidance-section').isVisible(),false);
     await page.locator('#training-slot').selectOption(slot);
     await page.locator('#training-role').selectOption(slot==='A'?'self':'other_person');
     await page.locator('#case-0-criterion-0-status').selectOption(slot==='A'?'included':'uncertain');
     if(slot==='A'){
       await page.locator('#case-0-criterion-0-excerpt').fill('Electron carriers move protons across the membrane');
     }else{
       await page.locator('#case-0-criterion-0-reason').fill('The concentration difference is not explicitly described.');
       await page.locator('#different-person').check();
       await page.locator('#no-prior-a').check();
     }
     await page.locator('#case-2-criterion-2-issue').selectOption('vague');
     await page.locator('#case-2-criterion-2-issue-note').fill('Complete and convincing does not name observable evidence and is too subjective.');
     await page.locator('#guidance-unseen').check();
     await page.locator('#confirmed-human').check();
     const dl=page.waitForEvent('download');
     await page.locator('#training-form button[type=submit]').click();
     const downloaded=await dl;
     const originalBytes=fs.readFileSync(await downloaded.path());
     const result=JSON.parse(originalBytes.toString('utf8'));
     assert.equal(result.format,'arw-reviewer-training-submission-v1');
     assert.equal(result.judgments.length,7);
     assert.equal(result.slot,slot);
     assert.equal(result.discussionUnseenAttested,true);
     assert.equal(await page.locator('#training-form').isVisible(),false);
     assert.equal(await page.locator('#guidance-section').isVisible(),true);
     const text=await page.locator('#guidance').innerText();
     assert.match(text,/deliberately written as a vague/);
     assert.ok(requests.every(x=>!/^https?:/i.test(x)),'Standalone reviewer training must have zero HTTP requests');
     const rect=await page.locator('#guidance-section').boundingBox();
     assert.ok(rect&&rect.width<=391,'Standalone page content must fit 390px mobile viewport');
     return {reviewerContext,page,originalBytes,result};
   }
   const B=await reviewer('B'),A=await reviewer('A'); // import order does not prove reviewer order
   const upload=(bytes,name)=>({name,mimeType:'application/json',buffer:bytes});
   await owner.locator('#reviewer-training-import').setInputFiles(upload(B.originalBytes,'synthetic-B.json'));
   // A prior success toast can still be visible when the asynchronous file
   // import begins. Wait for the actual IndexedDB commit, not a generic toast.
   await owner.waitForFunction(async()=>{
     const S=window.ActiveRecallStorage;
     try{await S.ready();const saved=await S.load();
       return saved?.db?.reviewerTraining?.submissions?.some(x=>x.slot==='B')===true;
     }catch{return false;}
   });
   await owner.locator('#reviewer-training-import').setInputFiles(upload(A.originalBytes,'synthetic-A.json'));
   await owner.waitForFunction(async()=>{
     const S=window.ActiveRecallStorage;
     try{await S.ready();const saved=await S.load(),entries=saved?.db?.reviewerTraining?.submissions||[];
       return entries.length===2&&entries.some(x=>x.slot==='A')&&entries.some(x=>x.slot==='B');
     }catch{return false;}
   });
   assert.match(await owner.locator('#reviewer-training').innerText(),/Different criterion statuses/);
   assert.match(await owner.locator('#reviewer-training').innerText(),/food-web-model/);
   const summaryDl=owner.waitForEvent('download');
   await owner.locator('[data-action=export-reviewer-training-summary]').click();
   const summary=JSON.parse(fs.readFileSync(await (await summaryDl).path(),'utf8'));
   assert.equal(summary.format,'arw-reviewer-training-summary-v1');
   assert.equal(summary.firstACompleted,true);
   assert.equal(summary.firstBCompleted,true);
   assert.equal(summary.disagreementCount,1);
   assert.equal(summary.ambiguousCriterionCount,1);
   assert.equal(summary.totalCriteria,7);
   assert.equal(summary.sessionStartedAfterLocalPilotLock,false);
   assert.ok(!JSON.stringify(summary).includes('Complete and convincing does not name observable evidence'));
   // Training cannot modify original saved study state, or a later fixed pilot sample.
   const verified=await owner.evaluate(async()=>{
     const S=window.ActiveRecallStorage,C=window.ActiveRecallCore,T=window.ActiveRecallReviewerTraining;
     const db=C.validateImport((await S.load()).db),original=JSON.stringify({memory:db.memory,attempts:db.attempts});
     if(T.compare(db).disagreements.length!==1)throw Error('Training result did not survive local saving.');
     if(db.schemaVersion!==5)throw Error('Training changed the original database schema.');
     if(JSON.stringify({memory:db.memory,attempts:db.attempts})!==original)
       throw Error('Training modified study memory.');
     return {createdAt:db.reviewerTraining.issuedAt,reviewers:db.reviewerTraining.submissions.length,
       initialAttempts:db.attempts.length};
   });
   assert.equal(verified.reviewers,2);
   assert.equal(verified.initialAttempts,0);
   // Start a pilot after a genuinely separate synthetic preparation exercise.
   await owner.locator('form[data-form=start-reviewer-pilot] input[name=confirmed]').check();
   await owner.locator('#pilot-target-count').selectOption('3');
   await owner.locator('form[data-form=start-reviewer-pilot] button[type=submit]').click();
   await owner.locator('[data-action=export-reviewer-pilot-csv]').waitFor();
   await owner.waitForTimeout(180);
   const timing=await owner.evaluate(async()=>{
     const S=window.ActiveRecallStorage,T=window.ActiveRecallReviewerTraining,
       db=(await S.load()).db,c=T.compare(db);
     return {pilot:!!db.reviewerPilot,startedAfterPilot:c.cycleAfterPilot,
       importedAfterPilot:c.importedAfterPilot,
       memoryEntries:Object.keys(db.memory).length};
   });
   assert.equal(timing.pilot,true);assert.equal(timing.startedAfterPilot,false);
   assert.equal(timing.importedAfterPilot,false);assert.equal(timing.memoryEntries,0);
   await owner.reload();await owner.locator('[data-page=insights]').click();
   assert.equal(await owner.locator('#reviewer-training-import').count(),1);
   assert.match(await owner.locator('#reviewer-training').innerText(),/Human first-pass differences/);
   await owner.setViewportSize({width:390,height:844});
   const rect=await owner.locator('#reviewer-training').boundingBox();
   assert.ok(rect&&rect.width<=391,'Owner reviewer training panel must fit 390px mobile viewport');
   assert.deepEqual(errors,[],'No browser runtime errors');
   await A.reviewerContext.close();await B.reviewerContext.close();
   process.stdout.write('PASS: two disconnected offline fictional-reviewer sessions, first-pass saved before guidance, B/A import, ambiguous criteria and coded summary, later pilot lock, unchanged study data, mobile.\n');
 }finally{
   if(browser)await browser.close();
   await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
