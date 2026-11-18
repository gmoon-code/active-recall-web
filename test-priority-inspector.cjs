'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');

const now=new Date(2026,10,18,12);
function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'AP Biology');
  const overdue=C.addRequirement(db,{courseId:course.id,question:'Explain the membrane transport mechanism?',answer:'Transport requires a concentration gradient.',kind:'explain'});
  const upcoming=C.addRequirement(db,{courseId:course.id,question:'Explain enzyme regulation?',answer:'Activity changes with regulators.',kind:'explain'});
  const target=C.getTarget(db,overdue.id);
  C.recordAttempt(db,{requirementId:overdue.id,targetId:target.id,response:'Gradient',rating:'hard',now:new Date(2026,10,13,12)});
  C.addAssessment(db,{courseId:course.id,title:'Enzyme quiz',date:'2026-11-19',scope:'selected',requirementIds:[upcoming.id]});
  return {db,overdue,upcoming,target};
}

test('priority inspector compares read-only due-first alternative with unchanged active memory',()=>{
  const {db,target}=fixture(),before=JSON.stringify(db);
  const result=C.inspectStudyPriorities(db,{minutes:5,now});
  assert.equal(result.eligible.due,1);
  assert.equal(result.eligible.new,1);
  assert.equal(result.reviewFirst.items[0].targetId,target.id);
  assert.equal(result.reviewFirst.items[0].category,'Due review');
  assert.ok(result.current.items.some(x=>x.category==='New first attempt'));
  assert.ok(result.reviewFirst.total>=1);
  assert.match(result.warning,/Neither uses FSRS probabilities/);
  assert.equal(JSON.stringify(db),before);
});

test('no eligible content gives two empty, non-mutating study previews',()=>{
  const db=C.initialDb(),before=JSON.stringify(db);
  const result=C.inspectStudyPriorities(db,{minutes:25,now});
  assert.equal(result.current.total,0);
  assert.equal(result.reviewFirst.total,0);
  assert.equal(result.changedTargets,0);
  assert.equal(JSON.stringify(db),before);
});

test('the priority inspector validates session lengths and never exposes held draft questions',()=>{
  const {db}=fixture();
  assert.throws(()=>C.inspectStudyPriorities(db,{minutes:4,now}),/5–720/);
  assert.throws(()=>C.inspectStudyPriorities(db,{minutes:721,now}),/5–720/);
  const items=C.inspectStudyPriorities(db,{minutes:25,now}).current.items;
  assert.ok(items.every(x=>Number.isFinite(x.priorityScore)&&x.estimatedMinutes>0&&x.reasons.length));
});
