'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const day=86400000,T0=Date.UTC(2026,10,1,12),at=n=>new Date(T0+n*day);

function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'Which gradient drives ATP synthesis?',answer:'The proton gradient.'});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  const attempt=(n,options={})=>C.recordAttempt(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,
    response:'The proton gradient.',rating:'good',now:at(n),...options}).attempt;
  const forecast=n=>C.previewProspectiveForecast(db,{requirementId:req.id,targetId:target.id,activityId:activity.id,now:at(n)});
  return {db,req,target,activity,attempt,forecast};
}

test('no forecast for first practice, invalid timestamp, or old target version',()=>{
  const f=fixture(),before=JSON.stringify(f.db);
  assert.equal(f.forecast(0),null);
  assert.equal(JSON.stringify(f.db),before);
  assert.throws(()=>f.forecast(NaN),/Invalid forecast time/);
  f.attempt(0);
  assert.equal(f.forecast(-1),null);
  f.target.version++;
  assert.equal(f.forecast(2),null,'an earlier version cannot create a model forecast for rewritten content');
});

test('a forecast is frozen before response, versioned and not a claim of FSRS calibration',()=>{
  const f=fixture();f.attempt(0);
  const before=JSON.stringify(f.db),q=f.forecast(2);
  assert.equal(JSON.stringify(f.db),before);
  assert.equal(q.version,1);
  assert.equal(q.method,'interval-shapes-v1');
  assert.equal(q.capturedAt,at(2).toISOString());
  assert.equal(q.elapsedDays,2);
  assert.equal(q.priorIntervalDays,2);
  assert.equal(q.exponential,.9);
  assert.equal(q.hyperbolic,.9);
  assert.equal(q.targetVersion,f.target.version);
  assert.equal(q.priorReviewedAt,at(0).toISOString());
  assert.equal(q.priorDueAt,f.db.memory[f.target.id].dueAt);
  const farther=f.forecast(4);
  assert.ok(farther.exponential<q.exponential);
  assert.ok(farther.hyperbolic<q.hyperbolic);
  assert.notEqual(farther.exponential,farther.hyperbolic);
});

test('saving a legitimate frozen forecast does not influence active interval or rating',()=>{
  const withSnapshot=fixture(),without=fixture();
  withSnapshot.attempt(0);without.attempt(0);
  const f=withSnapshot.forecast(2),result=withSnapshot.attempt(2,{prospectiveForecast:f});
  const control=without.attempt(2);
  assert.deepEqual(result.prospectiveForecast,f);
  assert.equal(result.schedulingDecision.activeIntervalDays,control.schedulingDecision.activeIntervalDays);
  assert.equal(result.schedulingDecision.shadowIntervalDays,control.schedulingDecision.shadowIntervalDays);
  assert.equal(result.rating,control.rating);
  assert.equal(withSnapshot.db.memory[withSnapshot.target.id].intervalDays,
    without.db.memory[without.target.id].intervalDays);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(withSnapshot.db))).schemaVersion,5);
  const audit=C.memoryModelReadinessAudit(withSnapshot.db);
  assert.equal(audit.prospectiveProbabilityForecasts,1);
  assert.equal(audit.forecastEligibleDelayedWritten,1);
  assert.equal(audit.groups.literal.withProspectiveForecast,0,'self-ratings alone are not literal-check labels');
  assert.equal(audit.modelComparisonAvailable,false);
});

test('approved literal outcome and prospective receipt can be paired without grading other questions',()=>{
  const f=fixture();C.setExactAnswerKey(f.db,f.activity.id,'The proton gradient.',true);
  f.attempt(0);
  f.attempt(3,{prospectiveForecast:f.forecast(3)});
  const x=C.memoryModelReadinessAudit(f.db);
  assert.equal(x.groups.literal.attempts,1);
  assert.equal(x.groups.literal.withProspectiveForecast,1);
  assert.equal(x.modelComparisonAvailable,false);
});

test('misdated, stale, re-keyed or retrofitted snapshots cannot become prospective attempts',()=>{
  const f=fixture();f.attempt(0);
  const good=f.forecast(2);
  const stale=f.forecast(2);
  assert.throws(()=>f.attempt(2.3,{prospectiveForecast:stale}),/stale or inconsistent/);
  const bad={...good,exponential:1};
  assert.throws(()=>f.attempt(2,{prospectiveForecast:bad}),/stale or inconsistent/);
  assert.throws(()=>f.attempt(2,{prospectiveForecast:{...good,targetVersion:99}}),/stale or inconsistent/);
  const valid=f.attempt(2,{prospectiveForecast:good});
  const imported=JSON.parse(JSON.stringify(f.db));
  imported.attempts.at(-1).prospectiveForecast.exponential=.99;
  assert.throws(()=>C.validateImport(imported),/Invalid prospective forecast receipt/);
  assert.ok(valid.prospectiveForecast);
  assert.equal(C.memoryModelReadinessAudit(f.db).prospectiveProbabilityForecasts,1);
});

test('a forecast cannot be created from a due date alone or from an edited memory timestamp',()=>{
  const f=fixture();f.attempt(0);
  f.db.memory[f.target.id].lastReviewedAt=at(-3).toISOString();
  assert.equal(f.forecast(2),null);
  f.db.memory[f.target.id].lastReviewedAt=at(0).toISOString();
  f.db.attempts=[];
  assert.equal(f.forecast(2),null);
});
