'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const Rh=require('./study-rhythm.js');

const morning=new Date(2026,10,18,9,0,0);
function fixture(count=12){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  db.agendaPreferences={days:7,weekdayMinutes:5,weekendMinutes:0,missedDates:[]};
  const reqs=[];
  for(let i=0;i<count;i++)reqs.push(C.addRequirement(db,{
    courseId:course.id,lectureTitle:'Lecture 1',question:`Question ${i}: explain the mechanism?`,
    answer:`Answer ${i}: a series of interactions.`,kind:'explain'}));
  return {db,reqs};
}

test('schedule fit exposes due workload left out of the capacity-limited calendar without altering memory',()=>{
  const {db}=fixture(),before=JSON.stringify(db);
  const f=Rh.studyFit(db,C,morning);
  assert.equal(f.capacityMinutes,5);
  assert.equal(f.dueCount,12);
  assert.equal(f.status,'overload');
  assert.ok(f.dueSeconds>f.capacityMinutes*60);
  assert.ok(f.unplacedCount>0);
  assert.ok(f.unplacedSeconds>0);
  assert.ok(f.assignedSeconds<=f.capacityMinutes*60);
  assert.equal(f.upcoming.length,7);
  assert.equal(JSON.stringify(db),before);
});

test('unavailable dates are a planned rest day, not a missed study-day judgment',()=>{
  const {db}=fixture(3);
  db.agendaPreferences.missedDates=[Rh.localDate(morning)];
  const f=Rh.studyFit(db,C,morning);
  assert.equal(f.restDay,true);
  assert.equal(f.status,'rest');
  assert.equal(f.capacityMinutes,0);
  assert.equal(f.assignedSeconds,0);
  assert.equal(f.dueCount,3);
  Rh.recordDailyPlan(db,C,{now:morning});
  const h=Rh.history(db,C,morning);
  assert.equal(h.rows[6].status,'planned_rest');
  assert.equal(h.observedStudyDays,0);
});

test('a task omitted by scheduling priorities is not mislabeled a capacity shortfall',()=>{
  const {db}=fixture(1);
  const mock={
    eligibleCandidates:()=>[{due:true,isNew:false,seconds:60,target:{id:'target_x'}}],
    buildReviewAgenda:()=>({days:Array.from({length:7},(_,i)=>({
      date:Rh.localDate(new Date(2026,10,18+i,12)),budgetMinutes:5,usedSeconds:0,
      activities:[],preparationActivities:[],overdueUnplaced:1})),
      unplannedDue:1,unplannedPreparation:0,warning:'Conditional projection'})
  };
  const fit=Rh.studyFit(db,mock,morning);
  assert.equal(fit.shortfallSeconds,0);
  assert.equal(fit.unplacedCount,1);
  assert.equal(fit.status,'prioritization_gap');
});

test('first-open snapshot is append-only and availability revision preserves the original',()=>{
  const {db}=fixture(4);
  const first=Rh.recordDailyPlan(db,C,{now:morning});
  assert.equal(first.revision,1);
  assert.equal(first.reason,'first_open');
  assert.equal(Rh.recordDailyPlan(db,C,{now:new Date(2026,10,18,11)}),null);
  db.agendaPreferences.weekdayMinutes=25;
  const revised=Rh.recordDailyPlan(db,C,{now:new Date(2026,10,18,12),reason:'availability_changed'});
  assert.equal(revised.revision,2);
  assert.equal(first.availabilityMinutes,5);
  assert.equal(revised.availabilityMinutes,25);
  assert.equal(db.studyPlanHistory.length,2);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).studyPlanHistory.length,2);
  const h=Rh.history(db,C,morning);
  assert.equal(h.rows[6].plan.revision,2);
  assert.equal(h.rows[6].revised,true);
  assert.equal(h.unobservedDays,6);
});

test('historical study tracking uses recorded attempts and actual task timing, never session timer alone',()=>{
  const {db}=fixture(3),snap=Rh.recordDailyPlan(db,C,{now:morning});
  assert.ok(snap.scheduledTargetIds.length);
  const tId=snap.scheduledTargetIds[0],target=db.retrievalTargets.find(x=>x.id===tId);
  C.recordAttempt(db,{requirementId:target.requirementId,targetId:tId,now:new Date(2026,10,18,12),rating:'hard',response:'My attempt',durationSeconds:80});
  db.sessions.push({id:'unused-timer',status:'completed',elapsedMs:50000000});
  const h=Rh.history(db,C,morning),today=h.rows[6];
  assert.equal(today.attempts,1);
  assert.equal(today.matchedPlanTargets,1);
  assert.equal(today.timedAttempts,1);
  assert.equal(today.timedSeconds,80);
  assert.equal(h.daysWithAttempts,1);
  assert.equal(h.unobservedDays,6);
});

test('a day with no plan snapshot is unknown even if no attempts exist',()=>{
  const {db}=fixture(2),h=Rh.history(db,C,morning);
  assert.ok(h.rows.every(r=>r.status==='no_plan_record'));
  assert.equal(h.observedStudyDays,0);
  assert.equal(h.daysWithAttempts,0);
});

test('malformed backup history is rejected without reinterpreting earlier study plans',()=>{
  const {db}=fixture(1);
  Rh.recordDailyPlan(db,C,{now:morning});
  const invalid=JSON.parse(JSON.stringify(db));invalid.studyPlanHistory[0].scheduledTargetIds=['bad','bad'];
  assert.throws(()=>C.validateImport(invalid),/Invalid dated study-plan snapshot/);
  assert.equal(C.validateImport(db).studyPlanHistory.length,1);
});

test('permanent Q&A purge removes plan days that still reference its target',()=>{
  const {db}=fixture(3);
  const snap=Rh.recordDailyPlan(db,C,{now:morning});
  const target=db.retrievalTargets.find(t=>t.id===snap.scheduledTargetIds[0]);
  C.archiveRequirements(db,[target.requirementId]);
  C.purgeArchivedRequirements(db,[target.requirementId]);
  assert.equal(JSON.stringify(db).includes(target.id),false);
  assert.equal(db.studyPlanHistory.length,0);
  assert.equal(C.validateImport(db).schemaVersion,5);
});
