'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const H=require('./human-review.js');
const at=day=>new Date(Date.UTC(2026,10,1,12)+day*86400000);

function make(kind='recall'){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,question:'What drives ATP synthesis?',answer:'A proton gradient.',kind});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  const attempt=(day,options={})=>C.recordAttempt(db,{requirementId:req.id,targetId:target.id,
    activityId:activity.id,response:'A proton gradient.',rating:'good',now:at(day),...options}).attempt;
  return {db,req,target,activity,attempt};
}

test('empty and invalid-threshold readiness audits are deterministic and read only',()=>{
  const db=C.initialDb(),before=JSON.stringify(db);
  const a=C.memoryModelReadinessAudit(db);
  assert.equal(a.processed,0);
  assert.equal(a.comparableDelayedWritten,0);
  assert.equal(a.groups.literal.attempts,0);
  assert.equal(a.groups.humanSelf.later,0);
  assert.equal(a.prospectiveProbabilityForecasts,0);
  assert.equal(a.modelComparisonAvailable,false);
  assert.match(a.warning,/NOT predicted recall probabilities/);
  assert.equal(JSON.stringify(db),before);
  assert.throws(()=>C.memoryModelReadinessAudit(db,{minDelayHours:0}),/between 1 and 720/);
  assert.throws(()=>C.memoryModelReadinessAudit(db,{minDelayHours:721}),/between 1 and 720/);
});

test('real literal checks qualify only after 24h; first, rapid, and assisted reviews reset elapsed time',()=>{
  const f=make();C.setExactAnswerKey(f.db,f.activity.id,'A proton gradient.',true);
  f.attempt(0);f.attempt(2);f.attempt(3.5,{assisted:true});f.attempt(4);f.attempt(6);
  const before=JSON.stringify(f.db),a=C.memoryModelReadinessAudit(f.db);
  assert.equal(a.processed,5);
  assert.equal(a.excluded.firstOrChangedVersion,1);
  assert.equal(a.excluded.assistedOrImmediate,1);
  assert.equal(a.excluded.tooSoon,1);
  assert.equal(a.comparableDelayedWritten,2);
  assert.equal(a.groups.literal.attempts,2);
  assert.equal(a.groups.literal.distinctTargets,1);
  assert.equal(a.groups.literal.early,1);
  assert.equal(a.groups.literal.later,1);
  assert.equal(a.prospectiveProbabilityForecasts,0);
  assert.equal(a.withPriorDueDate,2);
  assert.equal(JSON.stringify(f.db),before);
});

test('written learner ratings alone never become labeled correctness data',()=>{
  const f=make();f.attempt(0);f.attempt(3,{rating:'easy'});
  const a=C.memoryModelReadinessAudit(f.db);
  assert.equal(a.comparableDelayedWritten,1);
  assert.equal(a.reportedPositive,1);
  assert.equal(a.excluded.withoutUsableLabel,1);
  assert.equal(a.groups.literal.attempts,0);
  assert.equal(a.groups.humanSelf.attempts,0);
});

test('oral, no-answer, immediate, unverified, and changed-version attempts stay out of comparable evidence',()=>{
  const f=make();f.attempt(0);
  f.attempt(2,{inputMode:'oral',response:''});
  f.attempt(4,{practiceStage:'immediate_post_study'});
  const unverified=f.attempt(6);unverified.requirementVerified=false;
  f.target.version=2;
  f.attempt(8);
  const a=C.memoryModelReadinessAudit(f.db);
  assert.equal(a.comparableDelayedWritten,0);
  assert.equal(a.excluded.noWrittenAnswer,1);
  assert.equal(a.excluded.assistedOrImmediate,1);
  assert.equal(a.excluded.unverifiedRequirement,1);
  assert.equal(a.excluded.firstOrChangedVersion,2);
});

test('human judgments count separately by declared reviewer role and timing',()=>{
  const f=make('explain');C.addCriterion(f.db,{targetId:f.target.id,text:'Answer identifies the gradient.'});
  f.attempt(0);
  const a=f.attempt(2);
  const findings=reviewed=>H.eligibility(reviewed).criteria.map(c=>({criterionId:c.criterionId,
    criterionVersion:c.version,status:'included',excerpt:'A proton gradient.',rationale:''}));
  H.record(f.db,{attemptId:a.id,reviewerRole:'self',findings:findings(a),confirmed:true,now:at(2.2)});
  const b=f.attempt(5);
  H.record(f.db,{attemptId:b.id,reviewerRole:'other_person',findings:findings(b),confirmed:true,now:at(5.2)});
  const c=f.attempt(8);f.attempt(10);
  H.record(f.db,{attemptId:c.id,reviewerRole:'other_person',findings:findings(c),confirmed:true,now:at(11)});
  const saved=JSON.stringify(f.db),audit=C.memoryModelReadinessAudit(f.db);
  assert.equal(audit.comparableDelayedWritten,4);
  assert.equal(audit.groups.humanSelf.attempts,1);
  assert.equal(audit.groups.humanOther.attempts,1);
  assert.equal(audit.excluded.humanReviewAfterPractice,1);
  assert.equal(audit.excluded.withoutUsableLabel,1);
  assert.equal(audit.kinds.explain,4);
  assert.equal(JSON.stringify(f.db),saved);
});

test('only last 50,000 attempts are audited; never invent missing previous practice',()=>{
  const f=make();f.attempt(0);f.attempt(3);
  // Old records may be omitted by bounded audit, but must not serve as a
  // fabricated preceding sample for the first included observation.
  const base=f.db.attempts.map(a=>({...a}));
  f.db.attempts=Array.from({length:50001},(_,i)=>({...base[0],id:`old-${i}`,createdAt:at(-100000+i).toISOString(),
    requirementId:`historical-${i}`})).concat([base[0],base[1]]);
  const a=C.memoryModelReadinessAudit(f.db);
  assert.equal(a.processed,50000);
  assert.equal(a.olderAttemptsNotAudited,3);
  assert.equal(a.comparableDelayedWritten,1);
});
