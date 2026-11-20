'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');

const at=day=>new Date(2026,10,19+day,12);
function make(count=5){
  const db=C.initialDb(),course=C.addCourse(db,'Chemistry');
  const ids=[];
  for(let i=0;i<count;i++){
    const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:`What is ion ${i}?`,answer:`Ion ${i}.`});
    const target=C.getTarget(db,req.id);
    db.memory[target.id]={dueAt:at(20).toISOString(),intervalDays:20,lastRating:'good',reviewCount:2};
    ids.push({reqId:req.id,targetId:target.id});
  }
  return {db,course,ids};
}
const agenda=(db,missedDates=[])=>C.buildReviewAgenda(db,{
  start:at(0),days:21,weekdayMinutes:3,weekendMinutes:3,missedDates});

test('exam preparation is spread across available days instead of piled onto exam eve',()=>{
  const {db,course,ids}=make();
  const exam=C.addAssessment(db,{courseId:course.id,title:'Unit exam',date:C.today(at(7))});
  const before=JSON.stringify(db);
  const plan=agenda(db);
  const placed=plan.days.slice(0,7).flatMap(day=>day.activities.map(a=>({...a,date:day.date})));
  assert.equal(placed.length,5);
  assert.equal(new Set(placed.map(a=>a.targetId)).size,5);
  assert.ok(placed.every(a=>a.conditional===false&&/Optional pre-exam review/.test(a.reason)));
  assert.deepEqual(placed.map(a=>a.date),[1,2,3,4,5].map(d=>C.today(at(d+1))));
  assert.equal(plan.coverage.find(c=>c.assessmentId===exam.id).firstPass,5);
  assert.equal(plan.dueInHorizon,5);
  assert.equal(plan.unplannedDue,0);
  for(const {targetId} of ids)assert.equal(db.memory[targetId].dueAt,at(20).toISOString());
  assert.equal(JSON.stringify(db),before);
});

test('declared unavailable days make exam review opportunities start earlier without invented attendance',()=>{
  const {db,course}=make();
  C.addAssessment(db,{courseId:course.id,title:'Unit exam',date:C.today(at(7))});
  const off=C.today(at(4)),plan=agenda(db,[off]);
  const early=plan.days.slice(0,7).filter(d=>d.activities.length);
  assert.equal(early.length,5);
  assert.ok(early.every(d=>d.date!==off));
  assert.equal(plan.days[4].budgetMinutes,0);
  assert.equal(early[0].date,C.today(at(1)));
});

test('only the named exam scope is advanced',()=>{
  const {db,course,ids}=make(2);
  C.addAssessment(db,{courseId:course.id,title:'Focused quiz',date:C.today(at(7)),scope:'selected',requirementIds:[ids[0].reqId]});
  const plan=agenda(db);
  const early=plan.days.slice(0,7).flatMap(day=>day.activities);
  assert.equal(early.length,1);
  assert.equal(early[0].targetId,ids[0].targetId);
  assert.ok(!early.some(a=>a.targetId===ids[1].targetId));
});

test('an exam-day memory due date is treated as optional preparation before exam day',()=>{
  const {db,course,ids}=make(1);
  db.memory[ids[0].targetId].dueAt=at(7).toISOString();
  C.addAssessment(db,{courseId:course.id,title:'Unit exam',date:C.today(at(7))});
  const plan=agenda(db),early=plan.days.slice(0,7).flatMap(day=>day.activities);
  assert.equal(early.length,1);
  assert.equal(early[0].targetId,ids[0].targetId);
  assert.equal(early[0].earlyForExam,true);
  assert.equal(db.memory[ids[0].targetId].dueAt,at(7).toISOString());
});

test('an unschedulable optional pre-exam review stops after its exam until the saved due date',()=>{
  const {db,course,ids}=make(1);
  C.addAssessment(db,{courseId:course.id,title:'Unit exam',date:C.today(at(7))});
  const allBefore=Array.from({length:7},(_,d)=>C.today(at(d)));
  const plan=agenda(db,allBefore);
  assert.ok(plan.days.slice(0,20).every(d=>!d.activities.some(a=>a.targetId===ids[0].targetId)));
  assert.equal(plan.days[20].activities.length,1);
  assert.equal(plan.days[20].activities[0].targetId,ids[0].targetId);
  assert.equal(db.memory[ids[0].targetId].dueAt,at(20).toISOString());
});
