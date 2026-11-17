'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('./core.js');
const H=require('./human-review.js');
const BEGIN=new Date('2026-12-01T12:00:00.000Z');
const when=(days,hours=0)=>new Date(BEGIN.getTime()+days*86400000+hours*3600000);
function fixture(kind='explain',opts={}){
  const db=C.initialDb(),course=C.addCourse(db,'Test Biology');
  const req=C.addRequirement(db,{courseId:course.id,kind,question:'Explain how light is converted to stored chemical energy.',answer:'Photon energy drives electron transport and generates a proton gradient that supports ATP production.'});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  if(opts.rubric!==false){
    C.addCriterion(db,{targetId:target.id,text:'Electron transport transfers energy to a proton gradient.'});
    C.addCriterion(db,{targetId:target.id,text:'ATP synthase uses a gradient to support ATP production.'});
  }
  return {db,req,target,activity};
}
function attempt(f,{day=0,response='Electron transport creates a gradient, which drives ATP synthase to make ATP.',mode='written',assisted=false,checks=[],stage=null}={}){
  return C.recordAttempt(f.db,{requirementId:f.req.id,targetId:f.target.id,activityId:f.activity.id,response,inputMode:mode,
    rating:'good',assisted,criterionChecks:checks,practiceStage:stage,now:when(day)}).attempt;
}
function fields(a,statuses=['included','not_demonstrated']){
  return H.eligibility(a).criteria.map((c,i)=>({criterionId:c.criterionId,criterionVersion:c.version,status:statuses[i]||'unassessed',
    excerpt:(statuses[i]||'unassessed')==='included'?'Electron transport creates a gradient':'',
    rationale:(statuses[i]||'unassessed')==='not_demonstrated'?'The response does not explain the ATP synthase mechanism.':''
  }));
}
function record(f,a,options={}){
  return H.record(f.db,{attemptId:a.id,reviewerRole:'self',findings:fields(a),confirmed:true,
    now:when(0,1),...options});
}
test('new database retains schema v5; new workflow has no paid or remote dependency',()=>{
  const db=C.initialDb();
  assert.equal(db.schemaVersion,5);
  const js=fs.readFileSync('./human-review.js','utf8');
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|AI\.|apiKey|paid-api|localStorage/);
});
test('review freezes full criterion snapshots, even when no immediate checklist was marked',()=>{
  const f=fixture(),a=attempt(f);
  assert.equal(a.rubricAtAttempt.length,2);
  assert.equal(a.criterionChecks.length,0);
  assert.equal(H.eligibility(a).ok,true);
  assert.equal(a.rubricAtAttempt[0].version,1);
});
test('manual review accepts included exact evidence plus an explained gap',()=>{
  const f=fixture(),a=attempt(f);
  const r=record(f,a);
  assert.equal(r.revision,1);
  assert.equal(r.finding,'gap_identified');
  assert.equal(r.criteria[0].excerpt,'Electron transport creates a gradient');
  assert.equal(f.db.attempts[0].humanReviews[0],r);
  assert.equal(f.db.events.at(-1).type,'human_review.recorded');
});
test('a complete included rubric is recorded as supported, not a semantic machine grade',()=>{
  const f=fixture(),a=attempt(f);
  const r=record(f,a,{findings:fields(a,['included','included'])});
  assert.equal(r.finding,'all_supported');
  assert.equal(r.method,'manual-criterion-review-v1');
  assert.equal(r.reviewerIdentityVerified,false);
});
test('uncertainty does not automatically mean incorrect',()=>{
  const f=fixture(),a=attempt(f);
  const x=fields(a,['included','uncertain']);x[1].rationale='The causal relationship is not clear enough to judge.';
  assert.equal(record(f,a,{findings:x}).finding,'inconclusive');
});
test('not assessed is allowed only with at least one actual judgment',()=>{
  const f=fixture(),a=attempt(f);
  const x=fields(a,['unassessed','unassessed']);
  assert.throws(()=>record(f,a,{findings:x}),/Assess at least one/);
  const y=fields(a,['included','unassessed']);
  assert.equal(record(f,a,{findings:y}).finding,'inconclusive');
});
test('the reviewer must explicitly confirm a human judgment',()=>{
  const f=fixture(),a=attempt(f);
  assert.throws(()=>record(f,a,{confirmed:false}),/Confirm/);
});
test('invalid reviewer role is rejected',()=>{
  const f=fixture(),a=attempt(f);
  assert.throws(()=>record(f,a,{reviewerRole:'ai'}),/Choose who/);
});
test('other person is an unverified self-report, never verified examiner identity',()=>{
  const f=fixture(),a=attempt(f),r=record(f,a,{reviewerRole:'other_person'});
  assert.equal(r.reviewerRole,'other_person');assert.equal(r.reviewerIdentityVerified,false);
});
test('included requires actual verbatim evidence in the original response',()=>{
  const f=fixture(),a=attempt(f);
  let x=fields(a);x[0].excerpt='inferred semantic meaning';
  assert.throws(()=>record(f,a,{findings:x}),/exactly in the original/);
  x=fields(a);x[0].excerpt='';
  assert.throws(()=>record(f,a,{findings:x}),/exact supporting excerpt/);
});
test('gaps and uncertainty require a traceable reason',()=>{
  const f=fixture(),a=attempt(f);
  let x=fields(a);x[1].rationale='';
  assert.throws(()=>record(f,a,{findings:x}),/Explain the missing/);
  x=fields(a,['uncertain','unassessed']);x[0].rationale='bad';
  assert.throws(()=>record(f,a,{findings:x}),/Explain why/);
});
test('unassessed cannot hide a pasted quote or reviewer rationale',()=>{
  const f=fixture(),a=attempt(f);
  let x=fields(a,['included','unassessed']);x[1].rationale='This remains unassessed.';
  assert.throws(()=>record(f,a,{findings:x}),/Leave evidence and rationale blank/);
});
test('each criterion must match the original version and order',()=>{
  const f=fixture(),a=attempt(f);
  const x=fields(a);x.reverse();
  assert.throws(()=>record(f,a,{findings:x}),/order or version/);
  assert.throws(()=>record(f,a,{findings:[x[0]]}),/Review every/);
});
test('an amendment preserves the original review, response, rating and due date',()=>{
  const f=fixture(),a=attempt(f);
  const before=JSON.parse(JSON.stringify({answer:a.response,rating:a.rating,decision:a.schedulingDecision,memory:f.db.memory[f.target.id]}));
  const first=record(f,a);
  const second=record(f,a,{now:when(0,2),findings:fields(a,['included','included']),note:'Rechecked with the original written answer.'});
  assert.equal(first.finding,'gap_identified');
  assert.equal(second.revision,2);
  assert.equal(second.finding,'all_supported');
  assert.equal(a.humanReviews.length,2);
  assert.deepEqual({answer:a.response,rating:a.rating,decision:a.schedulingDecision,memory:f.db.memory[f.target.id]},before);
  assert.equal(f.db.events.at(-1).type,'human_review.revised');
});
test('review cannot be backdated before attempt or earlier amendment',()=>{
  const f=fixture(),a=attempt(f);
  assert.throws(()=>record(f,a,{now:when(-1)}),/follow the original/);
  record(f,a,{now:when(0,2)});
  assert.throws(()=>record(f,a,{now:when(0,1)}),/predate/);
});
test('retrospective criteria are not fetched from a newer rubric',()=>{
  const f=fixture(),a=attempt(f);
  const old=H.rubricForAttempt(a).map(c=>c.textSnapshot);
  C.reviseCriterion(f.db,a.rubricAtAttempt[0].criterionId,'New changed criterion to demonstrate revised rubric');
  assert.deepEqual(H.rubricForAttempt(a).map(c=>c.textSnapshot),old);
  record(f,a);
  assert.equal(a.humanReviews[0].criteria[0].criterionTextSnapshot,old[0]);
});
test('no rubric at attempt prevents retrospective fabrication',()=>{
  const f=fixture('explain',{rubric:false}),a=attempt(f);
  C.addCriterion(f.db,{targetId:f.target.id,text:'Criterion introduced only after the earlier answer'});
  assert.match(H.eligibility(a).reason,/No contemporaneous/);
  assert.throws(()=>H.record(f.db,{attemptId:a.id,reviewerRole:'self',findings:[],confirmed:true}),/No contemporaneous/);
});
test('legacy checked criterion snapshots remain reviewable without new rubricAtAttempt field',()=>{
  const f=fixture();
  const criterion=C.getCriteria(f.db,f.target.id)[0];
  const a=attempt(f,{checks:[{criterionId:criterion.id,status:'met'}]});
  delete a.rubricAtAttempt;
  assert.equal(H.eligibility(a).criteria.length,1);
  record(f,a,{findings:[fields(a,['included'])[0]]});
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
});
test('oral, mental, empty, short factual answers cannot be human graded this way',()=>{
  for(const kind of ['explain','apply']){
    const f=fixture(kind),a=attempt(f,{mode:'oral'});
    assert.equal(H.eligibility(a).ok,false);
    const second=attempt(f,{day:1,response:'',mode:'mental'});
    assert.equal(H.eligibility(second).ok,false);
  }
  const f=fixture('recall'),a=attempt(f);
  assert.equal(H.eligibility(a).ok,false);
});
test('review remains valid after a question is substantially revised',()=>{
  const f=fixture(),a=attempt(f);record(f,a);
  C.editRequirement(f.db,f.req.id,{question:'A completely revised question?',answer:'Different reference answer.',kind:'apply',changeType:'substantive'});
  assert.equal(H.validate(f.db),true);
  assert.equal(a.questionSnapshot,'Explain how light is converted to stored chemical energy.');
});
test('valid reviews survive JSON export and schema-v5 import',()=>{
  const f=fixture(),a=attempt(f);record(f,a);
  const restored=C.validateImport(JSON.parse(JSON.stringify(f.db)));
  assert.equal(restored.attempts[0].humanReviews[0].finding,'gap_identified');
  assert.equal(restored.schemaVersion,5);
});
test('older v4.0 schema-v5 backup with no human-review fields imports unchanged',()=>{
  const f=fixture(),a=attempt(f);
  delete a.rubricAtAttempt;
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
});
test('tampered response or edited human evidence fails import, protecting accidental corruption',()=>{
  const f=fixture(),a=attempt(f);record(f,a);
  let copy=JSON.parse(JSON.stringify(f.db));copy.attempts[0].response+=' altered';
  assert.throws(()=>C.validateImport(copy),/Invalid historical human-review metadata/);
  copy=JSON.parse(JSON.stringify(f.db));copy.attempts[0].humanReviews[0].criteria[0].excerpt='not in response';
  assert.throws(()=>C.validateImport(copy),/Invalid historical criterion review evidence/);
});
test('invalid backdated or out-of-order revision and invalid status fail import',()=>{
  const f=fixture(),a=attempt(f);record(f,a);record(f,a,{now:when(0,2)});
  let copy=JSON.parse(JSON.stringify(f.db));copy.attempts[0].humanReviews[1].revision=1;
  assert.throws(()=>C.validateImport(copy),/Invalid historical human-review metadata/);
  copy=JSON.parse(JSON.stringify(f.db));copy.attempts[0].humanReviews[0].criteria[0].status='ai-verified';
  assert.throws(()=>C.validateImport(copy),/Invalid historical criterion review evidence/);
});
test('delayed audit uses actual spacing and excludes first, short, assisted, and immediate attempts',()=>{
  const f=fixture(),a1=attempt(f,{day:0});
  const a2=attempt(f,{day:3});
  const a3=attempt(f,{day:3.2,assisted:true});
  const a4=attempt(f,{day:6,stage:'immediate_post_study'});
  record(f,a1,{now:when(0,1)});
  record(f,a2,{now:when(3,1)});
  record(f,a3,{now:when(3.2,1)});
  record(f,a4,{now:when(6,1)});
  const d=H.delayedAudit(f.db);
  assert.equal(d.eligible,1);
  assert.equal(d.excluded.firstOrRevised,1);
  assert.equal(d.excluded.tooSoon,1);
  assert.equal(d.excluded.assistedOrImmediate,1);
  assert.equal(d.supportedShare,null);
});
test('review entered after later practice is excluded from delayed-outcome audit',()=>{
  const f=fixture(),a1=attempt(f,{day:0}),a2=attempt(f,{day:3}),a3=attempt(f,{day:7});
  record(f,a2,{now:when(8)});
  const d=H.delayedAudit(f.db);
  assert.equal(d.eligible,0);
  assert.equal(d.excluded.afterLaterPractice,1);
});
test('an indeterminate review does not get counted as a wrong delayed answer',()=>{
  const f=fixture(),a1=attempt(f,{day:0}),a2=attempt(f,{day:3});
  const x=fields(a2,['included','uncertain']);x[1].rationale='Insufficient information to judge the second step.';
  record(f,a2,{now:when(3,1),findings:x});
  const d=H.delayedAudit(f.db);
  assert.equal(d.eligible,0);assert.equal(d.excluded.indeterminate,1);
});
test('audit percentages are not displayed prematurely',()=>{
  const f=fixture(),a1=attempt(f,{day:0}),a2=attempt(f,{day:3});
  record(f,a2,{now:when(3,1)});
  const d=H.delayedAudit(f.db);
  assert.equal(d.eligible,1);assert.equal(d.distinctTargets,1);assert.equal(d.supportedShare,null);
});
test('static integration: module loaded before core, cached offline, UI submit wired',()=>{
  const html=fs.readFileSync('./index.html','utf8');
  const app=fs.readFileSync('./app.js','utf8');
  const sw=fs.readFileSync('./sw.js','utf8');
  assert.ok(html.indexOf('human-review.js')<html.indexOf('core.js'));
  assert.match(sw,/human-review\.js/);
  assert.match(app,/case 'save-human-review'/);
  assert.match(app,/data-form="save-human-review"/);
  assert.match(app,/humanReviewPanel\(\)/);
});
