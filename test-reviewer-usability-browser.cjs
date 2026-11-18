/* v4.7 real Chromium:
   fixed three invitations -> disconnected fictional volunteers -> optional feedback
   before discussion -> import two and preserve one nonreturn -> coded privacy exports.
   Existing study schedules and original A/B human review evidence unchanged. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function main(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
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
   owner.on('pageerror',e=>errors.push('owner '+e.message));
   await owner.goto('http://127.0.0.1:'+server.address().port+'/');
   await owner.locator('[data-action=demo]').waitFor();
   await owner.locator('[data-page=insights]').click();
   await owner.locator('#usability-invitations').selectOption('3');
   await owner.locator('form[data-form=start-reviewer-usability] input[name=confirmed]').check();
   await owner.locator('form[data-form=start-reviewer-usability] button[type=submit]').click();
   await owner.locator('[data-action=export-reviewer-usability-invite]').first().waitFor();
   const paths=[];
   for(let i=0;i<3;i++){
     const dl=owner.waitForEvent('download');
     await owner.locator('[data-action=export-reviewer-usability-invite][data-index="'+i+'"]').click();
     const result=await dl,pathToFile=await result.path(),packet=JSON.parse(fs.readFileSync(pathToFile,'utf8'));
     assert.equal(packet.format,'arw-reviewer-usability-invitation-v1');
     assert.equal(packet.cases.length,3);assert.equal(packet.items.length,5);
     assert.equal('attempts' in packet,false);
     paths.push({pathToFile,packet});
   }
   assert.notEqual(paths[0].packet.invitationId,paths[1].packet.invitationId);
   assert.notEqual(paths[1].packet.invitationId,paths[2].packet.invitationId);
   async function volunteer(slot,{rateOne=true,skipSurvey=false}={}){
     const reviewerContext=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:390,height:844}});
     const page=await reviewerContext.newPage(),network=[];
     page.on('request',r=>network.push(r.url()));
     page.on('pageerror',e=>errors.push('volunteer '+slot+': '+e.message));
     await page.goto('file://'+path.join(root,'reviewer-usability-offline.html'));
     assert.equal(await page.locator('#discussion-section').isVisible(),false);
     await page.locator('#usability-invite-file').setInputFiles(paths[slot].pathToFile);
     await page.locator('#exercise-form').waitFor({state:'visible'});
     await page.locator('#u-0-0-status').selectOption(rateOne?'included':'uncertain');
     if(rateOne)await page.locator('#u-0-0-excerpt').fill('Electron carriers move protons across the membrane');
     else await page.locator('#u-0-0-rationale').fill('The response does not explicitly describe a difference in concentration.');
     await page.locator('#u-2-2-issue').selectOption('vague');
     await page.locator('#u-2-2-issue-note').fill('A convincing explanation is too subjective without observable relationships.');
     await page.locator('#pre-discussion').check();
     await page.locator('#lock-exercise').click();
     await page.locator('#feedback-form').waitFor({state:'visible'});
     assert.equal(await page.locator('#exercise-form').isVisible(),false);
     assert.equal(await page.locator('#discussion-section').isVisible(),false);
     if(!skipSurvey){
       await page.locator('#clarity-status').selectOption('4');
       await page.locator('#clarity-criteria').selectOption('2');
       await page.locator('#biggest-obstacle').selectOption('criterion_wording');
       await page.locator('#free-comment').fill('PRIVATE_FEEDBACK_DO_NOT_EXPORT');
     }
     await page.locator('#consent-to-share').check();
     const dl=page.waitForEvent('download');
     await page.locator('#feedback-form button[type=submit]').click();
     const f=await dl,original=fs.readFileSync(await f.path());
     const response=JSON.parse(original.toString('utf8'));
     assert.equal(response.format,'arw-reviewer-usability-response-v1');
     assert.equal(response.consentedToShare,true);
     assert.equal(response.discussionUnseenAttested,true);
     assert.equal(response.invitationId,paths[slot].packet.invitationId);
     assert.equal(response.judgments.length,7);
     assert.equal(await page.locator('#feedback-section').isVisible(),false);
     assert.equal(await page.locator('#discussion-section').isVisible(),true);
     assert.match(await page.locator('#discussion-items').innerText(),/deliberately written as a vague/);
     assert.ok(network.every(x=>!/^https?:/i.test(x)),'Offline fictional volunteers must make zero network requests.');
     const rect=await page.locator('#discussion-section').boundingBox();
     assert.ok(rect&&rect.width<=391,'Offline voluntary exercise must fit mobile viewport');
     return {reviewerContext,original,response};
   }
   const B=await volunteer(1,{rateOne:false,skipSurvey:true});
   const A=await volunteer(0,{rateOne:true,skipSurvey:false});
   const upload=(bytes,name)=>({name,mimeType:'application/json',buffer:bytes});
   await owner.locator('#reviewer-usability-import').setInputFiles(upload(B.original,'volunteer-B.json'));
   await owner.waitForFunction(async()=>{
     try{
       const saved=await window.ActiveRecallStorage.load();
       return window.ActiveRecallReviewerUsability.audit(saved.db).received===1;
     }catch{return false;}
   },null,{timeout:10000});
   await owner.locator('#reviewer-usability-import').setInputFiles(upload(A.original,'volunteer-A.json'));
   // Import and IndexedDB persistence are asynchronous. Wait for the actual
   // saved second response, not a fixed wall-clock delay (which flakes on CI).
   await owner.waitForFunction(async()=>{
     try{
       const saved=await window.ActiveRecallStorage.load();
       return window.ActiveRecallReviewerUsability.audit(saved.db).received===2;
     }catch{return false;}
   },null,{timeout:10000});
   const info=await owner.evaluate(async()=>{
     const Store=window.ActiveRecallStorage,U=window.ActiveRecallReviewerUsability,
       C=window.ActiveRecallCore,db=C.validateImport((await Store.load()).db),report=U.audit(db);
     return {plan:report.planned,returned:report.received,missing:report.notReturned,
       returnedSlots:report.rows.map(x=>x.returned),
       itemStatusCount:report.items.find(x=>x.id==='status').counts[4],
       itemStatusSkip:report.items.find(x=>x.id==='status').skipped,
       itemExcerptSkip:report.items.find(x=>x.id==='excerpt').skipped,
       memoryKeys:Object.keys(db.memory).length,attempts:db.attempts.length};
   });
   assert.equal(info.plan,3);assert.equal(info.returned,2);assert.equal(info.missing,1);
   assert.deepEqual(info.returnedSlots,[true,true,false]);
   assert.equal(info.itemStatusCount,1);
   assert.equal(info.itemStatusSkip,1);
   assert.equal(info.itemExcerptSkip,2);
   assert.equal(info.memoryKeys,0);assert.equal(info.attempts,0);
   const csvDl=owner.waitForEvent('download');
   await owner.locator('[data-action=export-reviewer-usability-csv]').click();
   const csv=fs.readFileSync(await (await csvDl).path(),'utf8');
   assert.equal(csv.trim().split(/\r?\n/).length,4);
   assert.match(csv,/slot,returned,status,excerpt,uncertain,criteria,interface,biggest_obstacle/);
   assert.match(csv,/3,no,missing,missing,missing,missing,missing/);
   assert.match(csv,/2,yes,skipped,skipped,skipped,skipped,skipped/);
   assert.doesNotMatch(csv,/PRIVATE_FEEDBACK|Electron carriers|f645b04f|https?:\/\//);
   const jsonDl=owner.waitForEvent('download');
   await owner.locator('[data-action=export-reviewer-usability-summary]').click();
   const summary=JSON.parse(fs.readFileSync(await (await jsonDl).path(),'utf8'));
   assert.equal(summary.format,'arw-reviewer-usability-summary-v1');
   assert.equal(summary.counts.received,2);assert.equal(summary.counts.notReturned,1);
   assert.equal(summary.counts.rows,undefined);
   assert.doesNotMatch(JSON.stringify(summary),/PRIVATE_FEEDBACK|Electron carriers|f645b04f/);
   const duplicate=await owner.locator('#reviewer-usability-import').count();
   assert.equal(duplicate,1);
   // Backups and reload must keep the owner-only source files yet never modify schedule.
   await owner.reload();await owner.locator('[data-page=insights]').click();
   assert.match(await owner.locator('#reviewer-usability').innerText(),/Nonreturns/);
   await owner.locator('#reviewer-usability summary').filter({hasText:'Optional free-text usability comments'}).click();
   assert.match(await owner.locator('#reviewer-usability').innerText(),/PRIVATE_FEEDBACK_DO_NOT_EXPORT/);
   await owner.setViewportSize({width:390,height:844});
   const bounds=await owner.locator('#reviewer-usability').boundingBox();
   assert.ok(bounds&&bounds.width<=391,'Owner usability panel must fit mobile viewport.');
   assert.deepEqual(errors,[],'No runtime JS errors');
   await A.reviewerContext.close();await B.reviewerContext.close();
   process.stdout.write('PASS: 3 preallocated invitations, two isolated fictional volunteer exercises, voluntary skipped survey, first judgments before discussion, one nonreturn, safe coded exports, IndexedDB, mobile and no schedule changes.\n');
 }finally{
   if(browser)await browser.close();
   await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
