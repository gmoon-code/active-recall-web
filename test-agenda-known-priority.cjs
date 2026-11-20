'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');

const at=day=>new Date(2026,10,19+day,12);
function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const returning=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What is ATP?',answer:'Adenosine triphosphate.'});
  const upcoming=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What is DNA?',answer:'Deoxyribonucleic acid.'});
  const returningId=C.getTarget(db,returning.id).id,upcomingId=C.getTarget(db,upcoming.id).id;
  // The first target is known due now and would have an *unobserved* revisit
  // two days later. The second is actually known due two days from now.
  db.memory[returningId]={dueAt:at(0).toISOString(),intervalDays:0.5,lastRating:'again',reviewCount:1};
  db.memory[upcomingId]={dueAt:at(2).toISOString(),intervalDays:2,lastRating:'good',reviewCount:1};
  return {db,returningId,upcomingId};
}

test('known due review is not crowded out by a conditional revisit in a constrained calendar',()=>{
  const {db,returningId,upcomingId}=fixture();
  const before=JSON.stringify(db);
  const agenda=C.buildReviewAgenda(db,{start:at(0),days:7,weekdayMinutes:3,weekendMinutes:3});
  const first=agenda.days[0].activities,third=agenda.days[2].activities;
  assert.equal(first.length,1);
  assert.equal(first[0].targetId,returningId);
  assert.equal(first[0].conditional,false);
  assert.equal(third.length,1);
  assert.equal(third[0].targetId,upcomingId);
  assert.equal(third[0].conditional,false);
  assert.equal(agenda.plannedTargets,2);
  assert.equal(agenda.unplannedDue,0);
  assert.ok(agenda.days.slice(3).some(day=>day.activities.some(a=>a.targetId===returningId&&a.conditional)));
  assert.equal(JSON.stringify(db),before,'calendar construction must not change live memory or due dates');
});
