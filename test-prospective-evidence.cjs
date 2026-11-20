'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const H=require('./human-review.js');
const DAY=86400000,BEGIN=Date.UTC(2026,10,1,12),at=d=>new Date(BEGIN+d*DAY);

function fixture(kind='recall'){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,kind,question:'What drives ATP synthesis?',answer:'A proton gradient.'});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  if(kind==='recall')C.setExactAnswerKey(db,activity.id,'A proton gradient.',true);
  else C.addCriterion(db,{targetId:target.id,text:'Names a proton gradient.'});
  const forecast=d=>C.previewProspectiveForecast(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,now:at(d)});
  const attempt=(d,options={})=>C.recordAttempt(db,{requirementId:req.id,targetId:target.id,
    activityId:activity.id,response:'A proton gradient.',rating:'good',now:at(d),...options}).attempt;
  return {db,req,target,activity,forecast,attempt};
}

function manualReview(f,attempt,{day,role='self',status='included'}={}){
  const findings=H.eligibility(attempt).criteria.map(c=>({criterionId:c.criterionId,
    criterionVersion:c.version,status,excerpt:status==='included'?'A proton gradient.':'',
    rationale:status==='not_demonstrated'?'This answer omits the required relationship.':
      status==='uncertain'?'The explanation cannot be judged from the visible excerpt.':''}));
  return H.record(f.db,{attemptId:attempt.id,reviewerRole:role,findings,confirmed:true,now:at(day)});
}

test('empty, legacy and malformed thresholds return no predictive score or mutations',()=>{
  const db=C.initialDb(),before=JSON.stringify(db),e=C.prospectiveEvidenceAudit(db);
  assert.equal(e.version,1);
  assert.equal(e.linkedReceipts,0);
  assert.equal(e.groups.literalRecall.attempts,0);
  assert.equal(e.groups.literalRecall.scores,null);
  assert.equal(e.modelFitted,false);
  assert.equal(e.activePolicyChanged,false);
  assert.deepEqual(e.displayGate,{minAttempts:50,minTargets:15,minPositive:10,minNegative:10});
  assert.equal(JSON.stringify(db),before);
  assert.throws(()=>C.prospectiveEvidenceAudit(db,{minDelayHours:0}),/between 1 and 720/);
  const f=fixture();f.attempt(0);f.attempt(3);
  assert.equal(C.prospectiveEvidenceAudit(f.db).excluded.noReceipt,2);
});

test('a real pre-answer forecast can be paired only with its own delayed literal outcome',()=>{
  const f=fixture();f.attempt(0);
  const positive=f.attempt(3,{prospectiveForecast:f.forecast(3)});
  const negative=f.attempt(6,{response:'Different but maybe equivalent.',prospectiveForecast:f.forecast(6)});
  const before=JSON.stringify(f.db),a=C.prospectiveEvidenceAudit(f.db),g=a.groups.literalRecall;
  assert.equal(g.attempts,2);
  assert.equal(g.distinctTargets,1);
  assert.equal(g.positiveLabels,1);
  assert.equal(g.negativeLabels,1);
  assert.equal(g.scores,null);
  assert.equal(a.linkedReceipts,2);
  assert.equal(positive.literalCheck.matched,true);
  assert.equal(negative.literalCheck.matched,false);
  assert.equal(a.excluded.noReceipt,1);
  assert.equal(JSON.stringify(f.db),before);
});

test('self-rated written success with no approved literal key remains unlabelled',()=>{
  const f=fixture();delete f.activity.exactAnswerKey;
  f.attempt(0);f.attempt(3,{rating:'easy',prospectiveForecast:f.forecast(3)});
  const a=C.prospectiveEvidenceAudit(f.db);
  assert.equal(a.linkedReceipts,1);
  assert.equal(a.groups.literalRecall.attempts,0);
  assert.equal(a.excluded.withoutUsableLabel,1);
});

test('short, assisted, immediate, oral and changed-version practice cannot masquerade as delayed written evidence',()=>{
  const f=fixture();f.attempt(0);
  f.attempt(.5,{prospectiveForecast:f.forecast(.5)});
  f.attempt(2,{assisted:true,prospectiveForecast:f.forecast(2)});
  f.attempt(4,{practiceStage:'immediate_post_study',prospectiveForecast:f.forecast(4)});
  f.attempt(6,{inputMode:'oral',prospectiveForecast:f.forecast(6)});
  f.target.version++;
  f.attempt(8);
  const a=C.prospectiveEvidenceAudit(f.db);
  assert.equal(a.groups.literalRecall.attempts,0);
  assert.equal(a.excluded.tooSoon,1);
  assert.equal(a.excluded.assistedOrImmediate,2);
  assert.equal(a.excluded.noWrittenAnswer,1);
  assert.equal(a.excluded.noReceipt,2);
});

test('human judgments stay separated by activity kind and claimed reviewer role',()=>{
  const f=fixture('explain');f.attempt(0);
  const first=f.attempt(2,{prospectiveForecast:f.forecast(2)});
  manualReview(f,first,{day:2.2,role:'self',status:'included'});
  const second=f.attempt(5,{prospectiveForecast:f.forecast(5)});
  manualReview(f,second,{day:5.2,role:'other_person',status:'not_demonstrated'});
  const a=C.prospectiveEvidenceAudit(f.db);
  assert.equal(a.groups.selfExplain.attempts,1);
  assert.equal(a.groups.selfExplain.positiveLabels,1);
  assert.equal(a.groups.otherExplain.attempts,1);
  assert.equal(a.groups.otherExplain.negativeLabels,1);
  assert.equal(a.groups.literalRecall.attempts,0);
  assert.equal(a.groups.selfApply.attempts,0);
  assert.equal(a.groups.otherExplain.scores,null);
});

test('indeterminate or late human judgments do not become negative labels',()=>{
  const f=fixture('apply');f.attempt(0);
  const first=f.attempt(2,{prospectiveForecast:f.forecast(2)});
  manualReview(f,first,{day:2.1,status:'uncertain'});
  const second=f.attempt(5,{prospectiveForecast:f.forecast(5)});
  f.attempt(8);
  manualReview(f,second,{day:9,status:'included'});
  const a=C.prospectiveEvidenceAudit(f.db);
  assert.equal(a.groups.selfApply.attempts,0);
  assert.equal(a.excluded.inconclusiveHumanReview,1);
  assert.equal(a.excluded.lateOrInvalidHumanReview,1);
});

test('descriptive target-balanced Brier values are withheld until each separate gate is met',()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Chemistry');
  const cohort=[];
  for(let i=0;i<15;i++){
    const req=C.addRequirement(db,{courseId:course.id,kind:'recall',
      question:`What is compound ${i}?`,answer:'A proton gradient.'});
    const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
    C.setExactAnswerKey(db,activity.id,'A proton gradient.',true);
    const attempt=(d,positive,withForecast=true)=>{
      const f=withForecast?C.previewProspectiveForecast(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,now:at(d)}):null;
      return C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
        response:positive?'A proton gradient.':'Not the approved literal phrase.',rating:'good',now:at(d),prospectiveForecast:f}).attempt;
    };
    attempt(0,true,false);
    cohort.push({target:target.id,attempt});
  }
  for(let round=1;round<=3;round++)for(let i=0;i<15;i++){
    cohort[i].attempt(round*3,(round+i)%2===0);
  }
  let a=C.prospectiveEvidenceAudit(db),g=a.groups.literalRecall;
  assert.equal(g.attempts,45);
  assert.equal(g.distinctTargets,15);
  assert.equal(g.scores,null,'45 actual predictions cannot clear a 50-observation display gate');
  for(let i=0;i<5;i++)cohort[i].attempt(12,i%2===0);
  a=C.prospectiveEvidenceAudit(db);g=a.groups.literalRecall;
  assert.equal(g.attempts,50);
  assert.equal(g.distinctTargets,15);
  assert.ok(g.positiveLabels>=10&&g.negativeLabels>=10);
  assert.ok(g.scores&&g.scores.exponential>=0&&g.scores.exponential<=1);
  assert.ok(g.scores.hyperbolic>=0&&g.scores.hyperbolic<=1);
  assert.equal(a.modelFitted,false);
  assert.equal(a.activePolicyChanged,false);
  assert.equal(a.groups.selfExplain.scores,null,'different evidence types must never be pooled');
  assert.equal(g.laterWindow.scores,null,'50 observations are not enough for a separately evaluated later window');
});

test('strict time-ordered later-window scores are gated and never fit or reschedule a model',()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Biology'),cohort=[];
  for(let i=0;i<15;i++){
    const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:`Identify organelle ${i}.`,answer:'Mitochondrion.'});
    const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
    C.setExactAnswerKey(db,activity.id,'Mitochondrion.',true);
    C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
      now:at(0),response:'Mitochondrion.',rating:'good'});
    cohort.push({req,target,activity});
  }
  for(let round=1;round<=7;round++)for(let i=0;i<cohort.length;i++){
    const {req,target,activity}=cohort[i],now=at(round*3),
      receipt=C.previewProspectiveForecast(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,now});
    C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
      now,response:(round+i)%2?'Other.':'Mitochondrion.',rating:'good',prospectiveForecast:receipt});
  }
  const before=JSON.stringify(db),audit=C.prospectiveEvidenceAudit(db),g=audit.groups.literalRecall;
  assert.equal(g.attempts,105);
  assert.equal(g.laterWindow.earlierAttempts,75,'ties at the 80% boundary stay on the later side');
  assert.equal(g.laterWindow.laterAttempts,30);
  assert.equal(g.laterWindow.laterDistinctTargets,15);
  assert.equal(g.laterWindow.firstLaterAt,at(18).toISOString());
  assert.ok(g.laterWindow.scores.exponential>=0&&g.laterWindow.scores.exponential<=1);
  assert.ok(g.laterWindow.scores.hyperbolic>=0&&g.laterWindow.scores.hyperbolic<=1);
  assert.equal(audit.modelFitted,false);
  assert.equal(audit.activePolicyChanged,false);
  assert.equal(JSON.stringify(db),before);
});

test('same-time outcomes cannot masquerade as a future evaluation window',()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Chemistry');
  for(let i=0;i<50;i++){
    const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:`Formula ${i}?`,answer:'H2O.'});
    const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
    C.setExactAnswerKey(db,activity.id,'H2O.',true);
    C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
      response:'H2O.',rating:'good',now:at(0)});
    const now=at(3),receipt=C.previewProspectiveForecast(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,now});
    C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
      response:i%2?'Incorrect.':'H2O.',rating:'good',prospectiveForecast:receipt,now});
  }
  const g=C.prospectiveEvidenceAudit(db).groups.literalRecall;
  assert.equal(g.attempts,50);
  assert.ok(g.scores,'the existing descriptive whole-cohort gate is unchanged');
  assert.equal(g.laterWindow.earlierAttempts,50);
  assert.equal(g.laterWindow.laterAttempts,0);
  assert.equal(g.laterWindow.firstLaterAt,null);
  assert.equal(g.laterWindow.scores,null);
});
