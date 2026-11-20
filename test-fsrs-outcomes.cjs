'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('./core.js'),H=require('./human-review.js'),Shadow=require('./fsrs-shadow.js');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'vendor/fsrs-7-shadow-vendor.js'),'utf8'));
const Vendor=globalThis.ActiveRecallFSRSVendor,DAY=86400000;
const at=d=>new Date(Date.UTC(2026,10,1,12)+d*DAY);
function fixture(kind='recall'){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,kind,
    question:'What powers ATP synthase?',answer:'A proton gradient.'});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  if(kind==='recall')C.setExactAnswerKey(db,activity.id,'A proton gradient.',true);
  else C.addCriterion(db,{targetId:target.id,text:'Identifies the proton gradient.'});
  const props={requirementId:req.id,targetId:target.id,activityId:activity.id};
  const attempt=async(day,positive=true,options={})=>{
    const now=at(day),response=positive?'A proton gradient.':'Not the expected literal answer.';
    const prospectiveForecast=db.memory[target.id]?C.previewProspectiveForecast(db,{...props,now}):null;
    const fsrsForecast=prospectiveForecast?await Shadow.forecastProbability(db,{Core:C,Vendor,...props,now}):null;
    return C.recordAttempt(db,{...props,now,response,rating:'good',
      prospectiveForecast,fsrsForecast,...options}).attempt;
  };
  return {db,req,target,activity,props,attempt};
}

test('empty and sparse replay-verified outcomes withhold all performance scores',async()=>{
  const db=C.initialDb(),before=JSON.stringify(db),empty=await Shadow.auditOutcomes(db,{Vendor,Human:H});
  assert.equal(empty.replayed,0);
  assert.equal(empty.evaluation.groups.literalRecall.brier,null);
  assert.equal(empty.evaluation.groups.literalRecall.laterWindow.brier,null);
  assert.equal(empty.activePolicyChanged,false);
  assert.equal(JSON.stringify(db),before);
  const f=fixture();await f.attempt(0);await f.attempt(3,true);
  const snapshot=JSON.stringify(f.db),a=await Shadow.auditOutcomes(f.db,{Vendor,Human:H});
  assert.equal(a.replayed,1);
  assert.equal(a.evaluation.groups.literalRecall.attempts,1);
  assert.equal(a.evaluation.groups.literalRecall.positiveLabels,1);
  assert.equal(a.evaluation.groups.literalRecall.brier,null);
  assert.equal(a.evaluation.groups.selfExplain.attempts,0);
  assert.equal(JSON.stringify(f.db),snapshot);
  const forged=JSON.parse(JSON.stringify(f.db));
  forged.attempts[1].fsrsForecast.probability=0.123456;
  assert.equal((await Shadow.auditOutcomes(forged,{Vendor,Human:H})).evaluation.groups.literalRecall.attempts,0,
    'A shape-valid invented probability cannot enter a scored cohort');
  const wrongLiteral=JSON.parse(JSON.stringify(f.db));
  wrongLiteral.attempts[1].literalCheck.matched=false;
  const invalid=await Shadow.auditOutcomes(wrongLiteral,{Vendor,Human:H});
  assert.equal(invalid.replayed,1,'The memory-model receipt itself remains genuine');
  assert.equal(invalid.evaluation.groups.literalRecall.attempts,0,
    'A contradictory literal label is not silently treated as a negative outcome');
  assert.equal(invalid.evaluation.excluded.invalidLiteralCheck,1);
});

test('later-time FSRS scores require diverse labels and separate time windows, never reschedule',async()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Chemistry'),cohort=[];
  for(let i=0;i<15;i++){
    const req=C.addRequirement(db,{courseId:course.id,kind:'recall',
      question:`Identify molecule ${i}?`,answer:'ATP.'});
    const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
    C.setExactAnswerKey(db,activity.id,'ATP.',true);
    const props={requirementId:req.id,targetId:target.id,activityId:activity.id};
    C.recordAttempt(db,{...props,now:at(0),response:'ATP.',rating:'good'});
    cohort.push(props);
  }
  for(let round=1;round<=7;round++)for(let i=0;i<cohort.length;i++){
    const props=cohort[i],now=at(round*3),
      prospectiveForecast=C.previewProspectiveForecast(db,{...props,now}),
      fsrsForecast=await Shadow.forecastProbability(db,{Core:C,Vendor,...props,now});
    assert.ok(fsrsForecast);
    C.recordAttempt(db,{...props,now,response:(round+i)%2?'Other.':'ATP.',
      rating:'good',prospectiveForecast,fsrsForecast});
  }
  const before=JSON.stringify(db),result=await Shadow.auditOutcomes(db,{Vendor,Human:H});
  assert.equal(result.replayed,105);
  assert.equal(result.eligibleDelayedWritten,105);
  const g=result.evaluation.groups.literalRecall;
  assert.equal(g.attempts,105);
  assert.equal(g.distinctTargets,15);
  assert.ok(g.positiveLabels>=10&&g.negativeLabels>=10);
  assert.ok(g.brier>=0&&g.brier<=1);
  assert.equal(g.laterWindow.earlier.attempts,75,'Tied timestamps stay on the same side');
  assert.equal(g.laterWindow.later.attempts,30);
  assert.equal(g.laterWindow.firstLaterAt,at(18).toISOString());
  assert.ok(g.laterWindow.brier>=0&&g.laterWindow.brier<=1);
  for(const key of ['selfExplain','selfApply','otherExplain','otherApply'])
    assert.equal(result.evaluation.groups[key].brier,null);
  assert.equal(result.modelFitted,false);
  assert.equal(result.evaluation.activePolicyChanged,false);
  assert.equal(JSON.stringify(db),before);
  const truncated=await Shadow.auditOutcomes(db,{Vendor,Human:H,limit:60});
  assert.ok(truncated.notInspected>0);
  assert.equal(truncated.evaluation.groups.literalRecall.brier,null,
    'The selected newest sample must never masquerade as a full historical cohort');
  assert.equal(truncated.evaluation.groups.literalRecall.laterWindow.brier,null);
});

test('manual explanation labels remain separate and late judgments are excluded',async()=>{
  const f=fixture('explain');await f.attempt(0);
  const first=await f.attempt(3,true);
  const criteria=H.eligibility(first).criteria;
  assert.equal(criteria.length,1);
  H.record(f.db,{attemptId:first.id,reviewerRole:'self',confirmed:true,now:at(3.2),
    findings:criteria.map(c=>({criterionId:c.criterionId,criterionVersion:c.version,
      status:'included',excerpt:'A proton gradient.',rationale:''}))});
  const second=await f.attempt(6,true);
  H.record(f.db,{attemptId:second.id,reviewerRole:'other_person',confirmed:true,now:at(6.2),
    findings:H.eligibility(second).criteria.map(c=>({criterionId:c.criterionId,criterionVersion:c.version,
      status:'not_demonstrated',excerpt:'',rationale:'The response lacks the requested link.'}))});
  const audit=await Shadow.auditOutcomes(f.db,{Vendor,Human:H});
  assert.equal(audit.evaluation.groups.selfExplain.attempts,1);
  assert.equal(audit.evaluation.groups.otherExplain.attempts,1);
  assert.equal(audit.evaluation.groups.literalRecall.attempts,0);
  assert.equal(audit.evaluation.groups.selfExplain.brier,null);
  // A judgment added after a subsequent practice cannot retroactively label
  // the earlier response in a prospective evaluation.
  const third=await f.attempt(9,true);
  H.record(f.db,{attemptId:third.id,reviewerRole:'self',confirmed:true,now:at(11),
    findings:H.eligibility(third).criteria.map(c=>({criterionId:c.criterionId,criterionVersion:c.version,
      status:'included',excerpt:'A proton gradient.',rationale:''}))});
  await f.attempt(10,true);
  const later=await Shadow.auditOutcomes(f.db,{Vendor,Human:H});
  assert.equal(later.evaluation.excluded.lateOrInvalidHumanReview,1);
});

test('same-timestamp cohorts never fabricate a later-time FSRS evaluation window',async()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  for(let i=0;i<50;i++){
    const req=C.addRequirement(db,{courseId:course.id,kind:'recall',
      question:`What is label ${i}?`,answer:'ATP.'});
    const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
    C.setExactAnswerKey(db,activity.id,'ATP.',true);
    const props={requirementId:req.id,targetId:target.id,activityId:activity.id};
    C.recordAttempt(db,{...props,now:at(0),response:'ATP.',rating:'good'});
    const now=at(3),prospectiveForecast=C.previewProspectiveForecast(db,{...props,now}),
      fsrsForecast=await Shadow.forecastProbability(db,{Core:C,Vendor,...props,now});
    C.recordAttempt(db,{...props,now,response:i%2?'Other.':'ATP.',rating:'good',
      prospectiveForecast,fsrsForecast});
  }
  const g=(await Shadow.auditOutcomes(db,{Vendor,Human:H})).evaluation.groups.literalRecall;
  assert.equal(g.attempts,50);
  assert.ok(g.brier!==null,'A whole-cohort descriptive error can be shown');
  assert.equal(g.laterWindow.earlier.attempts,50);
  assert.equal(g.laterWindow.later.attempts,0);
  assert.equal(g.laterWindow.firstLaterAt,null);
  assert.equal(g.laterWindow.brier,null,'Tied observations are not an independent future window');
});
