'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('./core.js'),H=require('./human-review.js'),P=require('./paired-review.js'),UI=require('./paired-review-ui.js');
const origin=new Date('2026-12-12T12:00:00.000Z');
const time=(days=0,hours=0)=>new Date(origin.getTime()+days*C.DAY+hours*3600000);
function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'Chemistry'),req=C.addRequirement(db,{
    courseId:course.id,kind:'explain',question:'How is energy used to make ATP?',
    answer:'Electron transport establishes a proton gradient; ATP synthase uses that gradient to produce ATP.'});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  C.addCriterion(db,{targetId:target.id,text:'Electron transport establishes a proton gradient.'});
  C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses the gradient to produce ATP.'});
  const attempt=C.recordAttempt(db,{requirementId:req.id,activityId:activity.id,targetId:target.id,
    response:'Electron transport creates a proton gradient. ATP synthase uses the gradient to produce ATP.',
    rating:'good',inputMode:'written',now:time()}).attempt;
  return {db,req,target,activity,attempt};
}
function findings(a,statuses=['included','not_demonstrated']){
  const excerpts=['Electron transport creates a proton gradient','ATP synthase uses the gradient to produce ATP'];
  return H.rubricForAttempt(a).map((c,i)=>{
    const status=statuses[i]||'unassessed';
    return {criterionId:c.criterionId,criterionVersion:c.version,status,
      excerpt:status==='included'?excerpts[i]:'',rationale:status==='not_demonstrated'?'Mechanism not sufficiently demonstrated.':status==='uncertain'?'Insufficient evidence for a clear decision.':''};
  });
}
function A(f,overrides={}){
  return P.recordReviewer(f.db,{attemptId:f.attempt.id,slot:'A',reviewerRole:'self',
    findings:findings(f.attempt),confirmed:true,now:time(0,1),...overrides});
}
function B(f,overrides={}){
  return P.recordReviewer(f.db,{attemptId:f.attempt.id,slot:'B',reviewerRole:'other_person',
    findings:findings(f.attempt,['included','included']),confirmed:true,differentPerson:true,noPriorJudgments:true,
    now:time(0,2),...overrides});
}
function adjudicate(f,overrides={}){
  const c=P.comparison(f.attempt);
  return P.recordAdjudication(f.db,{attemptId:f.attempt.id,adjudicatorRole:'other_person',confirmed:true,now:time(0,3),
    decisions:c.differences.map(row=>({criterionId:row.criterionId,criterionVersion:row.criterionVersion,resolution:'unresolved',reason:'Both judgments remain plausible based on the available written answer.'})),...overrides});
}
test('v4.2 is schema-v5 optional, free and serverless',()=>{
  const db=C.initialDb();
  assert.equal(db.schemaVersion,5);
  const s=fs.readFileSync('./paired-review.js','utf8');
  assert.doesNotMatch(s,/fetch\s*\(|XMLHttpRequest|https?:\/\/|stripe|payment|apiKey/i);
});
test('review A is frozen against original criterion versions and answer',()=>{
  const f=fixture(),r=A(f);
  assert.equal(r.criteria.length,2);
  assert.equal(r.method,'independent-criterion-human-v1');
  assert.equal(r.identityVerified,false);
  assert.equal(r.differentPersonAttested,false);
  assert.equal(f.attempt.independentReviewPair.version,1);
});
test('A cannot be recorded twice or overwritten',()=>{
  const f=fixture();const first=A(f);
  assert.throws(()=>A(f),/already recorded/);
  assert.equal(f.attempt.independentReviewPair.A,first);
});
test('B cannot be entered before A',()=>{
  const f=fixture();assert.throws(()=>B(f),/requires an existing A/);
  assert.equal(f.attempt.independentReviewPair,undefined);
});
test('B must attest to being distinct and not consulting A',()=>{
  const f=fixture();A(f);
  assert.throws(()=>B(f,{differentPerson:false}),/must attest/);
  assert.throws(()=>B(f,{noPriorJudgments:false}),/must attest/);
  assert.equal(f.attempt.independentReviewPair.B,null);
});
test('both reviewer roles cannot identify as the same learner',()=>{
  const f=fixture();A(f);
  assert.throws(()=>B(f,{reviewerRole:'self'}),/Both reviewers cannot be the learner/);
});
test('two other-person reviewers may self-report distinct identities',()=>{
  const f=fixture();A(f,{reviewerRole:'other_person'});B(f,{reviewerRole:'other_person'});
  assert.equal(f.attempt.independentReviewPair.B.identityVerified,false);
});
test('A other-person, B learner is possible with honest attestations',()=>{
  const f=fixture();A(f,{reviewerRole:'other_person'});B(f,{reviewerRole:'self'});
  assert.equal(f.attempt.independentReviewPair.B.reviewerRole,'self');
});
test('B is unique and cannot be silently replaced',()=>{
  const f=fixture();A(f);const first=B(f);
  assert.throws(()=>B(f),/may be recorded once/);
  assert.equal(first,f.attempt.independentReviewPair.B);
});
test('a reviewer cannot supply an unquoted Included status',()=>{
  const f=fixture();const x=findings(f.attempt);x[0].excerpt='';
  assert.throws(()=>A(f,{findings:x}),/supporting excerpt/);
});
test('a reviewer cannot paste text absent from saved answer',()=>{
  const f=fixture();const x=findings(f.attempt);x[0].excerpt='Imaginary phrase that is not there';
  assert.throws(()=>A(f,{findings:x}),/verbatim/);
});
test('reviewer must justify missing and uncertain criteria',()=>{
  const f=fixture();const x=findings(f.attempt);x[1].rationale='';
  assert.throws(()=>A(f,{findings:x}),/Describe why/);
  const y=findings(f.attempt,['included','uncertain']);y[1].rationale='';
  assert.throws(()=>A(f,{findings:y}),/Describe why/);
});
test('not-assessed is excluded rather than counted incorrect',()=>{
  const f=fixture();A(f,{findings:findings(f.attempt,['included','unassessed'])});
  B(f,{findings:findings(f.attempt,['included','included'])});
  const c=P.comparison(f.attempt);
  assert.equal(c.comparable,1);assert.equal(c.uncertainOrUnassessed,1);
  assert.equal(c.differences.length,1);
  assert.equal(P.agreementAudit(f.db).excluded,1);
});
test('two entirely unassessed rubrics are rejected',()=>{
  const f=fixture();
  assert.throws(()=>A(f,{findings:findings(f.attempt,['unassessed','unassessed'])}),/Assess at least one/);
});
test('agreement matrix counts decisive matches and splits without using AI grades',()=>{
  const f=fixture();A(f);B(f);
  const c=P.comparison(f.attempt);
  assert.equal(c.comparable,2);
  assert.equal(c.agreements,1);
  assert.equal(c.disagreements,1);
  assert.equal(c.bothIncluded,1);
  assert.equal(c.splitGapIncluded,1);
  assert.equal(c.differences.length,1);
});
test('same decisive findings need no adjudication',()=>{
  const f=fixture();A(f);B(f,{findings:findings(f.attempt)});
  assert.equal(P.comparison(f.attempt).differences.length,0);
  assert.throws(()=>adjudicate(f),/No criterion-level disagreement/);
});
test('adjudication cannot precede B or be recorded without a human confirmation',()=>{
  const f=fixture();A(f);assert.throws(()=>P.recordAdjudication(f.db,{attemptId:f.attempt.id,adjudicatorRole:'self',decisions:[],confirmed:true,now:time(0,3)}),/Two original human reviews/);
  B(f);
  assert.throws(()=>adjudicate(f,{confirmed:false}),/Confirm/);
});
test('adjudication requires a reasoned decision for every differing criterion',()=>{
  const f=fixture();A(f);B(f);
  assert.throws(()=>adjudicate(f,{decisions:[]}),/every differing criterion/);
  assert.throws(()=>adjudicate(f,{decisions:[{criterionId:f.attempt.rubricAtAttempt[1].criterionId,criterionVersion:1,resolution:'included',reason:'short'}]}),/explicit decision/);
});
test('unresolved is a supported honest reconciliation outcome',()=>{
  const f=fixture();A(f);B(f);
  const d=adjudicate(f);
  assert.equal(d.decisions[0].resolution,'unresolved');
  assert.equal(P.agreementAudit(f.db).unresolvedDecisions,1);
});
test('adjudication revisions are append-only, preserving originals and schedule',()=>{
  const f=fixture(),before=JSON.parse(JSON.stringify({answer:f.attempt.response,rating:f.attempt.rating,memory:f.db.memory[f.target.id],decision:f.attempt.schedulingDecision}));
  const a=A(f),b=B(f),first=adjudicate(f);
  const row=P.comparison(f.attempt).differences[0];
  const second=adjudicate(f,{now:time(0,4),decisions:[{criterionId:row.criterionId,criterionVersion:row.criterionVersion,resolution:'included',reason:'The original answer includes the expected causal mechanism.'}]});
  assert.equal(first.revision,1);assert.equal(second.revision,2);
  assert.equal(f.attempt.independentReviewPair.A,a);
  assert.equal(f.attempt.independentReviewPair.B,b);
  assert.equal(f.attempt.independentReviewPair.adjudications[0],first);
  assert.deepEqual({answer:f.attempt.response,rating:f.attempt.rating,memory:f.db.memory[f.target.id],decision:f.attempt.schedulingDecision},before);
});
test('adjudication may not be backdated before B or previous revision',()=>{
  const f=fixture();A(f);B(f);
  assert.throws(()=>adjudicate(f,{now:time(0,1.5)}),/earlier/);
  adjudicate(f);
  assert.throws(()=>adjudicate(f,{now:time(0,2.5)}),/earlier/);
});
test('no percentage shown for two rubric rows in one answer',()=>{
  const f=fixture();A(f);B(f);
  const a=P.agreementAudit(f.db);
  assert.equal(a.agreementShare,null);assert.equal(a.completedPairs,1);assert.equal(a.distinctTargets,1);
});
test('completed pairs do not turn into delayed mastery assessments',()=>{
  const f=fixture();A(f);B(f);adjudicate(f);
  assert.equal(f.db.memory[f.target.id].policyId,'transparent-interval-v1');
  assert.equal(H.delayedAudit(f.db).eligible,0);
  assert.equal(P.agreementAudit(f.db).completedPairs,1);
});
test('adjudication and separate review entries survive unmodified JSON backup/import',()=>{
  const f=fixture();A(f);B(f);adjudicate(f);
  const db=C.validateImport(JSON.parse(JSON.stringify(f.db)));
  assert.equal(db.schemaVersion,5);
  assert.equal(db.attempts[0].independentReviewPair.A.finding,'gap_identified');
  assert.equal(db.attempts[0].independentReviewPair.adjudications[0].revision,1);
});
test('v4.1 backups with no paired data import unchanged',()=>{
  const f=fixture();H.record(f.db,{attemptId:f.attempt.id,reviewerRole:'self',confirmed:true,now:time(0,1),findings:findings(f.attempt)});
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
  assert.equal(f.attempt.independentReviewPair,undefined);
});
test('tampered response, changed evidence, reviewer flags, and adjudication history fail import',()=>{
  const f=fixture();A(f);B(f);adjudicate(f);
  const backup=JSON.stringify(f.db);
  let x=JSON.parse(backup);x.attempts[0].response+=' corrupt';
  assert.throws(()=>C.validateImport(x),/Invalid independent reviewer metadata/);
  x=JSON.parse(backup);x.attempts[0].independentReviewPair.B.priorJudgmentsHiddenAttested=false;
  assert.throws(()=>C.validateImport(x),/Invalid independent reviewer metadata/);
  x=JSON.parse(backup);x.attempts[0].independentReviewPair.A.criteria[0].excerpt='nonexistent';
  assert.throws(()=>C.validateImport(x),/Invalid independent reviewer evidence/);
  x=JSON.parse(backup);x.attempts[0].independentReviewPair.adjudications[0].decisions[0].resolution='AI_grade';
  assert.throws(()=>C.validateImport(x),/Invalid adjudication criterion/);
});
test('import rejects a missing B alongside a forged adjudication',()=>{
  const f=fixture();A(f);B(f);adjudicate(f);
  const x=JSON.parse(JSON.stringify(f.db));x.attempts[0].independentReviewPair.B=null;
  assert.throws(()=>C.validateImport(x),/Adjudication cannot precede the second reviewer/);
});
test('question changes cannot rewrite frozen historical comparison',()=>{
  const f=fixture();A(f);B(f);
  C.editRequirement(f.db,f.req.id,{question:'Changed question?',answer:'New answer.',kind:'apply',changeType:'substantive'});
  assert.equal(P.validate(f.db),true);
  assert.equal(P.comparison(f.attempt).rows[0].text,'Electron transport establishes a proton gradient.');
});
test('reviewer B UI does not display A notes or judgments before submission',()=>{
  const f=fixture();A(f,{note:'SENTINEL_A_PRIVATE_ONLY'});
  const html=UI.modal({db:f.db,attemptId:f.attempt.id,esc:x=>String(x),courseName:()=> 'Chemistry'});
  assert.match(html,/Independent reviewer B/);
  assert.doesNotMatch(html,/SENTINEL_A_PRIVATE_ONLY/);
  assert.doesNotMatch(html,/A: Not demonstrated/);
  assert.match(html,/name="differentPerson"/);
  assert.match(html,/name="noPriorJudgments"/);
});
test('after B finishes the UI makes both reviews and disagreement visible',()=>{
  const f=fixture();A(f,{note:'SENTINEL_A_PRIVATE_ONLY'});B(f);
  const html=UI.modal({db:f.db,attemptId:f.attempt.id,esc:x=>String(x),courseName:()=> 'Chemistry'});
  assert.match(html,/Compare independent reviewer judgments/);
  assert.match(html,/A: Not demonstrated/);
  assert.match(html,/B: Included/);
  assert.match(html,/data-form="save-pair-adjudication"/);
});
test('UI presents the actual reviews and status without requiring accounts',()=>{
  const f=fixture();A(f);
  const html=UI.panel({db:f.db,esc:x=>String(x),courseName:()=> 'Chemistry'});
  assert.match(html,/Two-reviewer agreement/);
  assert.match(html,/B pending/);
  assert.match(html,/data-action="open-pair-review"/);
});
test('static code exposes new UI bindings, cache and preflight version',()=>{
  const app=fs.readFileSync('./app.js','utf8'),html=fs.readFileSync('./index.html','utf8'),sw=fs.readFileSync('./sw.js','utf8');
  assert.match(app,/case 'save-pair-review'/);assert.match(app,/case 'save-pair-adjudication'/);
  assert.match(app,/PU\.panel\(\{db,esc,courseName\}\)/);
  assert.ok(html.indexOf('paired-review.js')<html.indexOf('core.js'));
  assert.ok(html.indexOf('paired-review-ui.js')<html.indexOf('app.js'));
  assert.match(sw,/active-recall-web-v4-14/); // v4.2 behavior remains supported in later releases
});
