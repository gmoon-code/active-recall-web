'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const Month=require('./month-calendar.js');

const now=new Date(2026,10,20,12);
function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const current=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What is ATP?',answer:'Adenosine triphosphate.'});
  const future=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What is DNA?',answer:'Deoxyribonucleic acid.'});
  const futureTarget=C.getTarget(db,future.id).id;
  db.memory[futureTarget]={dueAt:new Date(2027,2,9,12).toISOString(),intervalDays:109,lastRating:'good',reviewCount:1};
  db.agendaPreferences={days:21,weekdayMinutes:25,weekendMinutes:40,missedDates:['2026-11-22','2027-03-10']};
  C.addAssessment(db,{courseId:course.id,title:'Spring exam',date:'2027-03-09'});
  const report=C.buildReviewAgenda(db,{start:now,...db.agendaPreferences});
  return {db,course,current,futureTarget,report};
}

test('the monthly grid uses Monday-first weeks and crosses year and leap-day boundaries',()=>{
  const {db,report}=fixture();
  const november=Month.build(db,C,report,{month:'2026-11',now});
  assert.equal(november.cells.length,42);
  assert.equal(november.cells[0].date,'2026-10-26');
  assert.equal(november.cells.find(c=>c.date==='2026-11-20').today,true);
  assert.equal(november.next,'2026-12');
  assert.equal(Month.shiftMonth('2026-12',1),'2027-01');
  assert.equal(Month.shiftMonth('2027-01',-1),'2026-12');
  const leap=Month.build(db,C,report,{month:'2028-02',now});
  assert.ok(leap.cells.some(c=>c.inMonth&&c.date==='2028-02-29'));
  assert.equal(Month.shiftMonth('2028-02',1),'2028-03');
});

test('in-horizon day counts come from the unchanged live 21-day agenda',()=>{
  const {db,report}=fixture(),before=JSON.stringify(db);
  const month=Month.build(db,C,report,{month:'2026-11',now,prefs:db.agendaPreferences});
  for(const day of report.days.filter(d=>d.date.startsWith('2026-11'))){
    const cell=month.byDate.get(day.date);
    assert.equal(cell.inAgenda,true);
    assert.equal(cell.known,day.activities.filter(a=>!a.conditional).length);
    assert.equal(cell.conditional,day.activities.filter(a=>a.conditional).length);
    assert.equal(cell.preparation,(day.preparationActivities||[]).length);
    assert.equal(cell.unplaced,day.overdueUnplaced);
    assert.equal(cell.budgetMinutes,day.budgetMinutes);
  }
  assert.equal(month.byDate.get('2026-11-22').unavailable,true);
  assert.equal(month.byDate.get('2026-11-22').budgetMinutes,0);
  assert.equal(JSON.stringify(db),before,'rendering monthly dates cannot write plan or memory data');
});

test('distant months show saved due dates and assessments, not invented assigned reviews',()=>{
  const {db,report,futureTarget}=fixture(),before=JSON.stringify(db);
  const march=Month.build(db,C,report,{month:'2027-03',now,prefs:db.agendaPreferences});
  const day=march.byDate.get('2027-03-09');
  assert.equal(day.inAgenda,false);
  assert.equal(day.known,0);
  assert.equal(day.conditional,0);
  assert.equal(day.preparation,0);
  assert.deepEqual(day.savedDue.map(x=>x.targetId),[futureTarget]);
  assert.deepEqual(day.exams.map(x=>x.title),['Spring exam']);
  assert.equal(march.byDate.get('2027-03-10').unavailable,true);
  assert.equal(JSON.stringify(db),before);
});

test('historical dates reflect the latest recorded plan revision and real attempts',()=>{
  const {db,report}=fixture();
  db.studyPlanHistory=[{date:'2026-11-19',revision:1,availabilityMinutes:25},
    {date:'2026-11-19',revision:2,availabilityMinutes:45},
    {date:'2026-11-20',revision:1,availabilityMinutes:25},
    {date:'2026-11-20',revision:2,availabilityMinutes:40}];
  db.attempts.push({createdAt:new Date(2026,10,19,16).toISOString()});
  db.outsideStudyLogs=[{date:'2026-11-19',minutes:35}];
  const month=Month.build(db,C,report,{month:'2026-11',now});
  const yesterday=month.byDate.get('2026-11-19');
  assert.equal(yesterday.past,true);
  assert.equal(yesterday.plan.revision,2);
  assert.equal(yesterday.plan.availabilityMinutes,45);
  assert.equal(yesterday.attempts,1);
  assert.equal(yesterday.outsideMinutes,35);
  assert.equal(month.byDate.get('2026-11-20').plan.revision,2,'Today’s revisions remain visible');
  assert.equal(month.byDate.get('2026-11-18').plan,null,'Unknown days cannot be called missed work');
});

test('month validation rejects invalid dates without affecting the saved notebook',()=>{
  const {db,report}=fixture(),before=JSON.stringify(db);
  for(const value of ['2027-00','2027-13','2027-3','not-a-month','2101-01','1899-12']){
    assert.throws(()=>Month.build(db,C,report,{month:value,now}),/month/i);
  }
  assert.throws(()=>Month.shiftMonth('2100-12',1),/month/i);
  assert.throws(()=>Month.shiftMonth('2027-03',1.5),/month/i);
  assert.equal(JSON.stringify(db),before);
});
