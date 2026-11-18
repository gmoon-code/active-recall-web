'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('./core.js'),P=require('./paired-review.js'),R=require('./review-packets.js');
const F=require('./reference-first.js'),UI=require('./reference-first-ui.js');
const UUID='a188cc9e-a35d-4cb2-b006-7e145d468079',UUID2='a188cc9e-a35d-4cb2-b006-7e145d468080';
const BASE=Date.parse('2026-12-09T12:00:00Z');
const at=(days=0,hours=0)=>new Date(BASE+days*C.DAY+hours*3600000);
function fixture(){
 const db=C.initialDb(),course=C.addCourse(db,'Human Physiology');
 const req=C.addRequirement(db,{courseId:course.id,kind:'explain',
   question:'How does electron transport help ATP synthase?',
   answer:'The electron transport chain builds a proton gradient; ATP synthase couples proton return to ATP production.'});
 const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
 C.addCriterion(db,{targetId:target.id,text:'Electron transport creates a proton gradient.'});
 C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses returning protons to drive ATP synthesis.'});
 const attempt=C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
   inputMode:'written',response:'Electron transport creates a proton gradient. ATP synthase uses the gradient to make ATP.',
   rating:'good',now:at()}).attempt;
 return {db,course,req,target,activity,attempt};
}
function req(f,uuid=UUID,when=at(0,1)){
 return F.issue(f.db,{attemptId:f.attempt.id,requestId:uuid,now:when});
}
function findings(r,statuses=['included','not_demonstrated']){
 return r.attempt.criteria.map((c,i)=>{
  const status=statuses[i]||'unassessed';
  return {criterionId:c.criterionId,criterionVersion:c.version,status,
   excerpt:status==='included'?(i===0?'Electron transport creates a proton gradient':'ATP synthase uses the gradient to make ATP'):'',
   rationale:status==='not_demonstrated'?'The answer does not describe how proton flow couples to synthesis.':
       status==='uncertain'?'The exact causal meaning is ambiguous from this answer.':''};
 });
}
function first(r,slot='A',opts={}){
 return F.createFirst(r,{slot,reviewerRole:slot==='A'?'self':'other_person',
   confirmed:true,referenceUnseen:true,differentPerson:slot==='B',noPriorJudgments:slot==='B',
   findings:findings(r,slot==='A'?['included','not_demonstrated']:['included','included']),
   completedAt:at(0,2).toISOString(),...opts});
}
function setup(){
 const f=fixture(),request=req(f),A=first(request,'A'),B=first(request,'B');
 return {f,request,A,B};
}
function importA(s,now=at(0,3)){return F.importFirst(s.f.db,s.A,{now});}
function importB(s,now=at(0,4)){return F.importFirst(s.f.db,s.B,{now});}
function post(s,slot='A',opts={}){
 const f=s.f,req=s.request,first=slot==='A'?s.A:s.B;
 const reveal=F.reveal(f.db,{attemptId:f.attempt.id,slot});
 return F.createPost(req,first,reveal,{findings:findings(req,['included','included']),
   confirmed:true,referenceSeen:true,completedAt:at(0,5).toISOString(),...opts});
}
test('v4.4 stays schema-v5 and has no cloud endpoint or automatic semantic grading',()=>{
 const f=fixture();assert.equal(f.db.schemaVersion,5);
 const engine=fs.readFileSync('./reference-first.js','utf8');
 assert.doesNotMatch(engine,/fetch\s*\(|XMLHttpRequest|https?:\/\/|Stripe|apiKey|OpenAI/);
});
test('reference-free request truly omits historical reference answer, not just visually hides it',()=>{
 const f=fixture(),r=req(f);
 assert.equal(r.format,'arw-reference-free-request-v1');
 assert.equal('reference' in r.attempt,false);
 assert.equal(JSON.stringify(r).includes(f.attempt.referenceSnapshot),false);
 assert.equal(r.attempt.response,f.attempt.response);
 assert.equal(r.attempt.criteria.length,2);
});
test('request omits course, schedule, other notes, and unrelated practice',()=>{
 const f=fixture(),r=req(f),s=JSON.stringify(r);
 assert.ok(!s.includes('Human Physiology'));
 assert.ok(!s.includes('timeModels')&&!s.includes('agendaPreferences'));
 assert.deepEqual(Object.keys(r.attempt).sort(),['attemptId','attemptAt','question','response',
   'requirementVersion','targetVersion','activityVersion','criteria'].sort());
});
test('issuing request leaves original learner rating and schedule unchanged',()=>{
 const f=fixture(),prior=JSON.stringify(f.db.memory);
 req(f);assert.equal(JSON.stringify(f.db.memory),prior);
 assert.equal(f.db.events.at(-1).type,'reference_first.request_issued');
});
test('active request is reproducibly downloaded without issuing extra IDs',()=>{
 const f=fixture(),r=req(f),count=f.db.events.length;
 assert.deepEqual(F.issue(f.db,{attemptId:f.attempt.id,requestId:UUID2,now:at(0,2)}),r);
 assert.equal(f.db.events.length,count);
});
test('request ID must be a modern valid UUID',()=>{
 const f=fixture();
 assert.throws(()=>req(f,'guessable123'),/secure UUID/);
 assert.equal(f.attempt.referenceFirstRequests,undefined);
});
test('request cannot predate the original written answer',()=>{
 const f=fixture();assert.throws(()=>req(f,UUID,at(-1)),/must follow/);
});
test('no retrospective rubric on an ineligible or missing attempt',()=>{
 const f=fixture();assert.throws(()=>F.issue(f.db,{attemptId:'missing',requestId:UUID}),/not found/);
 f.attempt.inputMode='oral';assert.throws(()=>req(f),/written answer/);
});
test('cannot silently mix reference-free mode with active older v4.3 reviewer mode',()=>{
 const f=fixture();R.issueRequest(f.db,{attemptId:f.attempt.id,requestId:UUID,now:at(0,1)});
 assert.throws(()=>req(f,UUID2),/Revoke the existing v4.3/);
});
test('cannot issue new reference-free request after a v4.2 original review already exists',()=>{
 const f=fixture();
 const r=R.issueRequest(f.db,{attemptId:f.attempt.id,requestId:UUID,now:at(0,1)});
 const a=R.createSubmission(r,{slot:'A',reviewerRole:'self',confirmed:true,
   findings:findings(r),completedAt:at(0,2).toISOString()});
 R.importSubmission(f.db,a,{now:at(0,3)});
 assert.throws(()=>req(f,UUID2),/first review has already/);
});
test('source tampering is rejected even if hidden reference is not present',()=>{
 const f=fixture(),r=req(f);
 r.attempt.response+=' fabricated';
 assert.throws(()=>F.validateRequest(r),/fingerprint/);
});
test('first human judgment requires explicit reference non-exposure attestation',()=>{
 const s=setup();
 assert.throws(()=>first(s.request,'A',{referenceUnseen:false}),/Confirm an actual human/);
});
test('review B requires distinct person and no earlier A exposure attestations',()=>{
 const s=setup();
 assert.throws(()=>first(s.request,'B',{differentPerson:false}),/must attest/);
 assert.throws(()=>first(s.request,'B',{noPriorJudgments:false}),/must attest/);
});
test('first-pass file contains criterion evidence but never the saved reference text',()=>{
 const s=setup(),json=JSON.stringify(s.A);
 assert.equal(s.A.format,'arw-reference-free-first-pass-v1');
 assert.ok(!json.includes(s.f.attempt.referenceSnapshot));
 assert.equal(s.A.referenceUnseenAttested,true);
});
test('exact evidence is mandatory for an Included finding',()=>{
 const s=setup(),f=findings(s.request);f[0].excerpt='This sentence did not occur in the answer';
 assert.throws(()=>first(s.request,'A',{findings:f}),/verbatim/);
});
test('missing or uncertain criterion must provide a reason',()=>{
 const s=setup(),f=findings(s.request);f[1].rationale='';
 assert.throws(()=>first(s.request,'A',{findings:f}),/Describe why/);
});
test('Reviewer B cannot be imported before A, even if completed earlier',()=>{
 const s=setup();
 assert.throws(()=>importB(s),/Import first-pass Reviewer A first/);
 assert.equal(s.f.attempt.independentReviewPair,undefined);
});
test('A and B first passes become original immutable paired reviews',()=>{
 const s=setup(),one=importA(s),two=importB(s);
 assert.equal(one.slot,'A');assert.equal(two.slot,'B');
 assert.equal(one.referenceFirstPass.version,1);
 assert.equal(two.referenceFirstPass.submission.referenceUnseenAttested,true);
 assert.equal(P.comparison(s.f.attempt).disagreements,1);
});
test('an active reference-free request can be re-downloaded for B after A imported',()=>{
 const s=setup();importA(s);
 assert.deepEqual(F.issue(s.f.db,{attemptId:s.f.attempt.id,requestId:UUID2,now:at(0,4)}),s.request);
});
test('B must have the same reference-free request as A; no crossed handoffs',()=>{
 const s=setup();importA(s);
 const other={...s.B,requestId:UUID2};
 assert.throws(()=>F.importFirst(s.f.db,other,{now:at(0,4)}),/Unknown reference-free request/);
});
test('cannot import the same A or B twice',()=>{
 const s=setup();importA(s);
 assert.throws(()=>importA(s),/already has an original/);
 importB(s);
 assert.throws(()=>importB(s),/can only be imported once/);
});
test('both slots cannot claim to be the learner',()=>{
 const s=setup();importA(s);
 const second=first(s.request,'B',{reviewerRole:'self'});
 assert.throws(()=>F.importFirst(s.f.db,second,{now:at(0,4)}),/Both reviewers cannot be the learner/);
});
test('reference reveal is unavailable until that exact reviewer first pass was imported',()=>{
 const s=setup();
 assert.throws(()=>F.reveal(s.f.db,{attemptId:s.f.attempt.id,slot:'A'}),/Import the locked/);
 importA(s);
 assert.throws(()=>F.reveal(s.f.db,{attemptId:s.f.attempt.id,slot:'A'}),/BOTH reviewers/);
 assert.throws(()=>F.reveal(s.f.db,{attemptId:s.f.attempt.id,slot:'B'}),/Import the locked/);
 importB(s);
 assert.equal(F.reveal(s.f.db,{attemptId:s.f.attempt.id,slot:'A'}).slot,'A');
});
test('reveal contains saved historical reference and is bound to original first JSON',()=>{
 const s=setup();importA(s);importB(s);
 const r=F.reveal(s.f.db,{attemptId:s.f.attempt.id,slot:'A'});
 assert.equal(r.format,'arw-reference-reveal-v1');
 assert.equal(r.reference,s.f.attempt.referenceSnapshot);
 assert.equal(r.firstSubmissionFingerprint,require('./human-review.js').fingerprint(JSON.stringify(s.A)));
 assert.equal('response' in r,false);
});
test('post-reference review cannot be made without correct reveal and first pass',()=>{
 const s=setup();importA(s);importB(s);
 const reveal=F.reveal(s.f.db,{attemptId:s.f.attempt.id,slot:'A'});
 assert.throws(()=>F.createPost(s.request,s.A,{...reveal,reference:'original but wrong reference',requestId:UUID2},{
   findings:findings(s.request),confirmed:true,referenceSeen:true}),/does not match/);
 assert.throws(()=>F.createPost(s.request,s.A,reveal,{findings:findings(s.request),confirmed:true,referenceSeen:false}),/Confirm/);
});
test('post-reference response remains a separate event, not an overwritten first judgment',()=>{
 const s=setup();const original=importA(s);importB(s);
 const raw=post(s),result=F.importPost(s.f.db,raw,{now:at(0,6)});
 assert.equal(result.version,1);
 assert.equal(s.f.attempt.independentReviewPair.A,original);
 assert.deepEqual(s.f.attempt.independentReviewPair.A.criteria.map(c=>c.status),['included','not_demonstrated']);
 assert.deepEqual(result.submission.findings.map(c=>c.status),['included','included']);
 assert.equal(result.changes[1].changed,true);
});
test('post-reference comparison reports changed human labels but not correctness',()=>{
 const s=setup();importA(s);importB(s);
 F.importPost(s.f.db,post(s),{now:at(0,6)});
 const a=F.audit(s.f.db);
 assert.equal(a.attempts,1);assert.equal(a.posts,1);assert.equal(a.changed,1);
 assert.equal(a.unchanged,1);assert.match(a.warning,/descriptive/);
});
test('post-reference changes do not affect A/B original inter-reviewer agreement',()=>{
 const s=setup();importA(s);importB(s);
 const before=JSON.stringify(P.comparison(s.f.attempt));
 F.importPost(s.f.db,post(s),{now:at(0,6)});
 assert.equal(JSON.stringify(P.comparison(s.f.attempt)),before);
});
test('post-reference duplicate fails without losing the historical first post',()=>{
 const s=setup();importA(s);importB(s);const raw=post(s);
 const saved=F.importPost(s.f.db,raw,{now:at(0,6)});
 assert.throws(()=>F.importPost(s.f.db,raw,{now:at(0,7)}),/already has a post-reference/);
 assert.equal(s.f.attempt.referencePostReviews[0],saved);
});
test('reference-free request can be revoked only before first lock is accepted',()=>{
 const f=fixture();const r=req(f);
 const revoked=F.revoke(f.db,{attemptId:f.attempt.id,now:at(0,2)});
 assert.equal(revoked.revokedAt,at(0,2).toISOString());
 assert.throws(()=>F.importFirst(f.db,first(r),{now:at(0,3)}),/revoked/);
});
test('after revocation a genuinely new request is necessary',()=>{
 const f=fixture();req(f);
 F.revoke(f.db,{attemptId:f.attempt.id,now:at(0,2)});
 assert.throws(()=>req(f,UUID,at(0,3)),/cannot be reused/);
 assert.equal(req(f,UUID2,at(0,3)).requestId,UUID2);
});
test('revocation after importing a locked original is prohibited',()=>{
 const s=setup();importA(s);
 assert.throws(()=>F.revoke(s.f.db,{attemptId:s.f.attempt.id,now:at(0,4)}),/first review is already imported/);
});
test('reveal remains tied to frozen reference after substantive question revision',()=>{
 const s=setup();importA(s);importB(s);
 const old=s.f.attempt.referenceSnapshot;
 C.editRequirement(s.f.db,s.f.req.id,{question:'Updated current question?',answer:'Different current answer.',kind:'explain',changeType:'substantive'});
 assert.equal(F.reveal(s.f.db,{attemptId:s.f.attempt.id,slot:'A'}).reference,old);
});
test('owner import preserves actual review due date, self-rating and original scheduler',()=>{
 const s=setup(),before=JSON.stringify({rating:s.f.attempt.rating,due:s.f.db.memory,
   decision:s.f.attempt.schedulingDecision});
 importA(s);importB(s);F.importPost(s.f.db,post(s),{now:at(0,6)});
 assert.equal(JSON.stringify({rating:s.f.attempt.rating,due:s.f.db.memory,
   decision:s.f.attempt.schedulingDecision}),before);
});
test('complete reference-free workflow survives JSON backup and schema-v5 validation',()=>{
 const s=setup();importA(s);importB(s);F.importPost(s.f.db,post(s),{now:at(0,6)});
 const db=C.validateImport(JSON.parse(JSON.stringify(s.f.db)));
 assert.equal(db.schemaVersion,5);
 assert.equal(db.attempts[0].referencePostReviews[0].changes[1].changed,true);
 assert.equal(F.validate(db),true);
});
test('old v4.3 stored data and first-pass-less v4.2 backups remain valid',()=>{
 const f=fixture(),r=R.issueRequest(f.db,{attemptId:f.attempt.id,requestId:UUID,now:at(0,1)});
 assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
 assert.equal(R.validateRequest(r).format,'arw-offline-review-request-v1');
});
test('backup validation rejects fabricated A evidence and changed first-pass metadata',()=>{
 const s=setup();importA(s);
 let d=JSON.parse(JSON.stringify(s.f.db));
 d.attempts[0].independentReviewPair.A.referenceFirstPass.submission.referenceUnseenAttested=false;
 assert.throws(()=>C.validateImport(d),/Locked first-pass submission/);
 d=JSON.parse(JSON.stringify(s.f.db));
 d.attempts[0].independentReviewPair.A.referenceFirstPass.submission.findings[0].excerpt='fake evidence';
 assert.throws(()=>C.validateImport(d),/Locked first-pass submission/);
 d=JSON.parse(JSON.stringify(s.f.db));
 d.attempts[0].independentReviewPair.A.referenceFirstPass.importedAt=at(0,9).toISOString();
 assert.throws(()=>C.validateImport(d),/Invalid locked first-pass provenance/);
});
test('backup rejects changed rubric text, post-reflection or status-change counts',()=>{
 const s=setup();importA(s);importB(s);F.importPost(s.f.db,post(s),{now:at(0,6)});
 let d=JSON.parse(JSON.stringify(s.f.db));d.attempts[0].rubricAtAttempt[0].textSnapshot='fabricated new criterion';
 assert.throws(()=>C.validateImport(d),/Invalid historical reference-free request|Invalid independent reviewer conclusion/);
 d=JSON.parse(JSON.stringify(s.f.db));d.attempts[0].referencePostReviews[0].changes[1].changed=false;
 assert.throws(()=>C.validateImport(d),/Post-reference criterion changes/);
 d=JSON.parse(JSON.stringify(s.f.db));d.attempts[0].referencePostReviews[0].submission.note='new forged note';
 assert.throws(()=>C.validateImport(d),/Invalid post-reference provenance|Post-reference submission fails/);
});
test('v4.4 owner UI supplies first, reveal and post controls, but not paid API',()=>{
 const f=fixture(),html=UI.panel({db:f.db,esc:x=>String(x),courseName:()=> 'Course'});
 assert.match(html,/Reference-free first-pass review/);
 assert.match(html,/data-action="export-reference-first-request"/);
 assert.match(html,/reference-first-import/);
 assert.match(html,/reference-post-import/);
 assert.match(html,/reference-reviewer-offline\.html/);
});
test('reviewer page physically excludes reference until separate reveal is loaded',()=>{
 const s=fs.readFileSync('./reference-reviewer-offline.html','utf8');
 assert.match(s,/connect-src 'none'/);
 assert.match(s,/reference-free request/i);
 assert.match(s,/reveal-file/);
 assert.match(s,/firstSubmissionFingerprint/);
 assert.match(s,/first-form/);
 assert.doesNotMatch(s,/fetch\s*\(|XMLHttpRequest|indexedDB|localStorage|<script[^>]+src=|https?:\/\//);
});
test('all offline modules load before core/app and are in v4.4 offline cache',()=>{
 const index=fs.readFileSync('./index.html','utf8'),sw=fs.readFileSync('./sw.js','utf8'),core=fs.readFileSync('./core.js','utf8');
 assert.ok(index.indexOf('review-packets.js')<index.indexOf('reference-first.js'));
 assert.ok(index.indexOf('reference-first.js')<index.indexOf('core.js'));
 assert.ok(index.indexOf('reference-first-ui.js')<index.indexOf('app.js'));
 assert.match(sw,/active-recall-web-v4-17/);
 assert.match(sw,/reference-reviewer-offline\.html/);
 assert.match(core,/F\.validate\(input\)/);
});
