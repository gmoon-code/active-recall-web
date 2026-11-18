'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('./core.js'),H=require('./human-review.js'),P=require('./paired-review.js'),R=require('./review-packets.js'),UI=require('./review-packets-ui.js');
const UUID='b17c014c-a1be-4b58-981c-28a0936c9353';
const UUID2='b17c014c-a1be-4b58-981c-28a0936c9354';
const ORIGIN=Date.parse('2026-12-05T12:00:00.000Z');
const at=(days=0,hours=0)=>new Date(ORIGIN+days*C.DAY+hours*3600000);
function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'Test Chemistry');
  const req=C.addRequirement(db,{courseId:course.id,kind:'explain',
    question:'Explain electron transport and ATP synthesis.',
    answer:'Electron transport produces a proton gradient, and ATP synthase couples proton flow to ATP production.'});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  C.addCriterion(db,{targetId:target.id,text:'Electron transport establishes the proton gradient.'});
  C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses the gradient to produce ATP.'});
  const attempt=C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
    response:'Electron transport establishes the proton gradient and ATP synthase uses proton flow to produce ATP.',
    rating:'good',inputMode:'written',now:at(0)}).attempt;
  return {db,course,req,target,activity,attempt};
}
function request(f,uuid=UUID,when=at(0,1)){
  return R.issueRequest(f.db,{attemptId:f.attempt.id,requestId:uuid,now:when});
}
function fields(r,statuses=['included','not_demonstrated']){
  const excerpts=['Electron transport establishes the proton gradient','ATP synthase uses proton flow to produce ATP'];
  return r.attempt.criteria.map((c,i)=>{
    const status=statuses[i]||'unassessed';
    return {criterionId:c.criterionId,criterionVersion:c.version,status,
      excerpt:status==='included'?excerpts[i]:'',
      rationale:status==='not_demonstrated'?'The original response does not explain the causal step.':
        status==='uncertain'?'The evidence is too ambiguous to determine.':''};
  });
}
function completed(req,slot,opts={}){
  return R.createSubmission(req,{slot,reviewerRole:slot==='A'?'self':'other_person',
    findings:fields(req,slot==='A'?['included','not_demonstrated']:['included','included']),
    confirmed:true,differentPerson:slot==='B',noPriorJudgments:slot==='B',
    completedAt:at(0,2).toISOString(),...opts});
}
test('schema stays v5, packet engine has no paid/cloud API',()=>{
 const f=fixture();assert.equal(f.db.schemaVersion,5);
 const code=fs.readFileSync('./review-packets.js','utf8');
 assert.doesNotMatch(code,/fetch\s*\(|XMLHttpRequest|https?:\/\/|Stripe|OpenAI|apiKey/i);
});
test('request includes only the one written answer, original reference, versions and checklist',()=>{
 const f=fixture(),r=request(f),json=JSON.stringify(r);
 assert.equal(r.format,'arw-offline-review-request-v1');assert.equal(r.requestId,UUID);
 assert.equal(r.attempt.response,f.attempt.response);
 assert.equal(r.attempt.criteria.length,2);
 assert.ok(!json.includes('Test Chemistry'));
 assert.ok(!json.includes('agendaPreferences'));
 assert.ok(!json.includes('timeModels'));
 assert.deepEqual(Object.keys(r.attempt).sort(),['attemptId','attemptAt','question','reference','response','requirementVersion','targetVersion','activityVersion','criteria'].sort());
});
test('request issuance creates versioned local provenance without changing calendar',()=>{
 const f=fixture(),due=JSON.stringify(f.db.memory),before=f.db.attempts.length;
 request(f);assert.equal(f.attempt.offlineReviewRequests.length,1);
 assert.equal(f.db.attempts.length,before);assert.equal(JSON.stringify(f.db.memory),due);
 assert.equal(f.db.events.at(-1).type,'offline_review.request_issued');
});
test('re-downloading reuses the same active request without adding events',()=>{
 const f=fixture(),first=request(f),n=f.db.events.length;
 assert.deepEqual(R.issueRequest(f.db,{attemptId:f.attempt.id,requestId:UUID2,now:at(0,2)}),first);
 assert.equal(f.db.events.length,n);
});
test('request ID must be cryptographically shaped UUID',()=>{
 const f=fixture();assert.throws(()=>request(f,'easy_guessable'),/Secure random/);
 assert.equal(f.attempt.offlineReviewRequests,undefined);
});
test('request cannot predate the original real attempt',()=>{
 const f=fixture();assert.throws(()=>request(f,UUID,at(-1)),/after the original/);
});
test('request cannot be issued for an unrecorded or ineligible answer',()=>{
 const f=fixture();
 assert.throws(()=>R.issueRequest(f.db,{attemptId:'not-an-attempt',requestId:UUID}),/not found/);
 f.attempt.inputMode='oral';
 assert.throws(()=>request(f),/written answer/);
});
test('request snapshot fingerprint catches text or rubric alteration',()=>{
 const f=fixture(),r=request(f);
 r.attempt.response+=' evil edit';
 assert.throws(()=>R.validateRequest(r),/fingerprint/);
});
test('request rejects extra fields to avoid silently including private course data',()=>{
 const f=fixture(),r=request(f);r.attempt.courseNotes='secret';
 assert.throws(()=>R.validateRequest(r),/original-answer snapshot/);
});
test('the reviewer response omits the entire written response and reference answer',()=>{
 const f=fixture(),r=request(f),s=completed(r,'A'),json=JSON.stringify(s);
 assert.equal(s.format,'arw-offline-review-response-v1');
 assert.ok(!json.includes(r.attempt.reference));
 assert.ok(!json.includes(r.attempt.response));
 assert.equal(s.findings.length,2);
});
test('two separate completed responses bind to exactly the same issued request',()=>{
 const f=fixture(),r=request(f),a=completed(r,'A'),b=completed(r,'B');
 assert.equal(a.requestId,r.requestId);assert.equal(b.requestId,r.requestId);
 assert.equal(a.snapshotFingerprint,b.snapshotFingerprint);
 assert.equal(b.differentPersonAttested,true);
});
test('independent confirmation is mandatory',()=>{
 const f=fixture(),r=request(f);
 assert.throws(()=>completed(r,'A',{confirmed:false}),/explicitly confirm/);
});
test('B must attest to distinct reviewer and unseen first judgment',()=>{
 const f=fixture(),r=request(f);
 assert.throws(()=>completed(r,'B',{differentPerson:false}),/attest/);
 assert.throws(()=>completed(r,'B',{noPriorJudgments:false}),/attest/);
});
test('no automatic semantic grading or acceptance without source quote',()=>{
 const f=fixture(),r=request(f),x=fields(r,['included','included']);x[0].excerpt='not present in the response';
 assert.throws(()=>completed(r,'A',{findings:x}),/verbatim/);
});
test('uncertain criterion is preserved without assuming incorrect',()=>{
 const f=fixture(),r=request(f),s=completed(r,'A',{findings:fields(r,['included','uncertain'])});
 assert.equal(s.findings[1].status,'uncertain');
});
test('request revocation blocks importing new responses',()=>{
 const f=fixture(),r=request(f),s=completed(r,'A');
 R.revokeRequest(f.db,{attemptId:f.attempt.id,now:at(0,3)});
 assert.throws(()=>R.importSubmission(f.db,s,{now:at(0,4)}),/revoked/);
 assert.equal(f.attempt.independentReviewPair,undefined);
});
test('revocation preserves issued ID and supports fresh reissue',()=>{
 const f=fixture(),old=request(f);
 R.revokeRequest(f.db,{attemptId:f.attempt.id,now:at(0,3)});
 const next=request(f,UUID2,at(0,4));
 assert.notEqual(old.requestId,next.requestId);
 assert.equal(f.attempt.offlineReviewRequests[0].revokedAt,at(0,3).toISOString());
 assert.equal(f.attempt.offlineReviewRequests.length,2);
});
test('Reviewer B before A is rejected with no destructive fallback',()=>{
 const f=fixture(),r=request(f),b=completed(r,'B');
 assert.throws(()=>R.importSubmission(f.db,b,{now:at(0,3)}),/Import Reviewer A first/);
 assert.equal(f.attempt.independentReviewPair,undefined);
});
test('importing A and B records original human ratings on the same attempt',()=>{
 const f=fixture(),r=request(f);
 const one=R.importSubmission(f.db,completed(r,'A'),{now:at(0,3)});
 const two=R.importSubmission(f.db,completed(r,'B'),{now:at(0,4)});
 assert.equal(one.slot,'A');assert.equal(two.slot,'B');
 assert.equal(one.offlinePacket.version,1);
 assert.equal(two.offlinePacket.submission.completedAt,at(0,2).toISOString());
 assert.equal(P.comparison(f.attempt).agreements,1);
 assert.equal(P.comparison(f.attempt).disagreements,1);
});
test('client review completion time is distinct from import time; no fake review order',()=>{
 const f=fixture(),r=request(f);
 R.importSubmission(f.db,completed(r,'A',{completedAt:at(0,2).toISOString()}),{now:at(0,5)});
 const b=R.importSubmission(f.db,completed(r,'B',{completedAt:at(0,1.5).toISOString()}),{now:at(0,6)});
 assert.equal(b.reviewedAt,at(0,6).toISOString());
 assert.equal(b.offlinePacket.completedAt,at(0,1.5).toISOString());
});
test('B cannot be imported twice and A cannot be overwritten by a replay',()=>{
 const f=fixture(),r=request(f),a=completed(r,'A'),b=completed(r,'B');
 R.importSubmission(f.db,a,{now:at(0,3)});
 assert.throws(()=>R.importSubmission(f.db,a,{now:at(0,3.5)}),/already exists/);
 R.importSubmission(f.db,b,{now:at(0,4)});
 assert.throws(()=>R.importSubmission(f.db,b,{now:at(0,5)}),/imported only once/);
 assert.equal(f.attempt.independentReviewPair.A.offlinePacket.submission.slot,'A');
});
test('both cannot claim to be the learner on separate devices',()=>{
 const f=fixture(),r=request(f);
 R.importSubmission(f.db,completed(r,'A'),{now:at(0,3)});
 const b=completed(r,'B',{reviewerRole:'self'});
 assert.throws(()=>R.importSubmission(f.db,b,{now:at(0,4)}),/Both reviewers cannot be the learner/);
});
test('incorrect request ID, source fingerprint, or attempt ID fails before mutating paired data',()=>{
 const f=fixture(),r=request(f),s=completed(r,'A');
 const x={...s,requestId:UUID2};
 assert.throws(()=>R.importSubmission(f.db,x,{now:at(0,3)}),/Unknown reviewer request/);
 assert.throws(()=>R.importSubmission(f.db,{...s,snapshotFingerprint:'ffffffff'},{now:at(0,3)}),/Invalid, mismatched/);
 assert.throws(()=>R.importSubmission(f.db,{...s,attemptId:'not-ours'},{now:at(0,3)}),/No matching original/);
 assert.equal(f.attempt.independentReviewPair,undefined);
});
test('submitted findings cannot be added, reordered, or modified without validation',()=>{
 const f=fixture(),r=request(f),s=completed(r,'A');
 const changed={...s,findings:s.findings.slice().reverse()};
 assert.throws(()=>R.importSubmission(f.db,changed,{now:at(0,3)}),/Criterion or version mismatch/);
 const extra={...s,courseId:'secret'};
 assert.throws(()=>R.importSubmission(f.db,extra,{now:at(0,3)}),/Invalid, mismatched/);
});
test('request can be invalidated after importing A without rewriting A',()=>{
 const f=fixture(),r=request(f),s=completed(r,'A');
 const a=R.importSubmission(f.db,s,{now:at(0,3)});
 R.revokeRequest(f.db,{attemptId:f.attempt.id,now:at(0,4)});
 assert.equal(f.attempt.independentReviewPair.A,a);
 assert.throws(()=>R.importSubmission(f.db,completed(r,'B'),{now:at(0,5)}),/revoked/);
 assert.equal(R.validate(f.db),true);
});
test('original rating, due date and scheduling snapshots do not change after import',()=>{
 const f=fixture(),saved=JSON.stringify({
  memory:f.db.memory,attempt:{rating:f.attempt.rating,decision:f.attempt.schedulingDecision,due:f.attempt.priorDueAt}
 });
 const r=request(f);
 R.importSubmission(f.db,completed(r,'A'),{now:at(0,3)});
 R.importSubmission(f.db,completed(r,'B'),{now:at(0,4)});
 assert.equal(JSON.stringify({memory:f.db.memory,attempt:{rating:f.attempt.rating,decision:f.attempt.schedulingDecision,due:f.attempt.priorDueAt}}),saved);
});
test('all historical packet responses survive a complete JSON backup round trip',()=>{
 const f=fixture(),r=request(f);
 R.importSubmission(f.db,completed(r,'A'),{now:at(0,3)});
 R.importSubmission(f.db,completed(r,'B'),{now:at(0,4)});
 const restored=C.validateImport(JSON.parse(JSON.stringify(f.db)));
 assert.equal(restored.schemaVersion,5);
 assert.equal(restored.attempts[0].independentReviewPair.B.offlinePacket.requestId,r.requestId);
 assert.equal(R.validate(restored),true);
});
test('old v4.2 backups have no new packet fields and still import unchanged',()=>{
 const f=fixture();
 assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
 assert.equal(f.attempt.offlineReviewRequests,undefined);
});
test('import validation detects forged original answer/criterion and response history',()=>{
 const f=fixture(),r=request(f);
 R.importSubmission(f.db,completed(r,'A'),{now:at(0,3)});
 let copy=JSON.parse(JSON.stringify(f.db));
 copy.attempts[0].questionSnapshot='A later invented question';
 assert.throws(()=>C.validateImport(copy),/Invalid saved offline reviewer request/);
 copy=JSON.parse(JSON.stringify(f.db));
 copy.attempts[0].independentReviewPair.A.offlinePacket.submission.findings[0].excerpt='invented excerpt';
 assert.throws(()=>C.validateImport(copy),/Offline reviewer response no longer matches/);
 copy=JSON.parse(JSON.stringify(f.db));
 copy.attempts[0].independentReviewPair.A.criteria[0].status='not_demonstrated';
 assert.throws(()=>C.validateImport(copy),/Invalid independent reviewer conclusion|Invalid independent reviewer evidence|Imported reviewer results/);
});
test('old imported reviews remain valid after substantive knowledge revision',()=>{
 const f=fixture(),r=request(f);
 R.importSubmission(f.db,completed(r,'A'),{now:at(0,3)});
 C.editRequirement(f.db,f.req.id,{question:'Different current question?',answer:'Different current reference.',kind:'explain',changeType:'substantive'});
 assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
});
test('reissue history refuses reused ID and keeps every previous request',()=>{
 const f=fixture(),r=request(f);
 R.revokeRequest(f.db,{attemptId:f.attempt.id,now:at(0,3)});
 assert.throws(()=>request(f,UUID,at(0,4)),/Do not reuse/);
 assert.equal(f.attempt.offlineReviewRequests.length,1);
});
test('offline reviewer HTML must be self-contained, with no remote dependencies',()=>{
 const html=fs.readFileSync('./reviewer-offline.html','utf8');
 assert.match(html,/Content-Security-Policy/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/type="file"/);
 assert.match(html,/arw-offline-review-response-v1/);
 assert.doesNotMatch(html,/<script[^>]+src=|https?:\/\/|<link[^>]+href=|fetch\s*\(|XMLHttpRequest|localStorage|indexedDB/);
});
test('owner UI names the actual page and manual import control',()=>{
 const f=fixture(),html=UI.panel({db:f.db,esc:x=>String(x),courseName:()=> 'Chemistry'});
 assert.match(html,/reviewer-offline\.html/);
 assert.match(html,/data-action="export-offline-review-request"/);
 assert.match(html,/offline-review-response-file/);
 assert.match(html,/browser-local/);
});
test('static integration includes modules in a correct load order and offline cache',()=>{
 const html=fs.readFileSync('./index.html','utf8'),core=fs.readFileSync('./core.js','utf8'),
  sw=fs.readFileSync('./sw.js','utf8'),app=fs.readFileSync('./app.js','utf8');
 assert.ok(html.indexOf('paired-review.js')<html.indexOf('review-packets.js'));
 assert.ok(html.indexOf('review-packets.js')<html.indexOf('core.js'));
 assert.ok(html.indexOf('review-packets-ui.js')<html.indexOf('app.js'));
 assert.match(core,/R\.validate\(input\)/);
 assert.match(sw,/active-recall-web-v4-18/);
 assert.match(sw,/reviewer-offline\.html/);
 assert.match(app,/case 'export-offline-review-request'/);
 assert.match(app,/R\.importSubmission\(db,payload\)/);
});
