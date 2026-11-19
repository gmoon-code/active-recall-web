'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const at=(y,m,d,h=12)=>new Date(y,m-1,d,h);

function fixture(){
  const db=C.initialDb(),bio=C.addCourse(db,'Biology'),chem=C.addCourse(db,'Chemistry');
  const req=(c,question)=>C.addRequirement(db,{courseId:c.id,kind:'recall',question,answer:'Short factual answer.'});
  const dueBio=req(bio,'What drives ATP?'),dueChem=req(chem,'Which enzyme works here?');
  const newBio=req(bio,'What is a novel concept?');
  const future=req(chem,'What will be due next week?');
  const record=(r,day,rating='good')=>C.recordAttempt(db,{requirementId:r.id,
    targetId:C.getTarget(db,r.id).id,response:'Short factual answer.',rating,now:day});
  record(dueBio,at(2026,11,20));record(dueChem,at(2026,11,19));
  record(future,at(2026,11,22),'easy');
  C.addAssessment(db,{courseId:bio.id,title:'Upcoming biology quiz',date:'2026-11-24',scope:'selected',requirementIds:[newBio.id]});
  return {db,bio,chem,dueBio,dueChem,newBio,future};
}

test('catch-up preview covers only already-attempted due targets; never mutates memory',()=>{
  const f=fixture(),now=at(2026,11,23),before=JSON.stringify(f.db);
  const a=C.catchUpPreview(f.db,{minutes:25,now});
  assert.equal(a.dueCount,2);
  assert.equal(a.newCount,1);
  assert.equal(a.selectedCount,2);
  assert.equal(a.remainingCount,0);
  assert.ok(a.selected.every(c=>[f.dueBio.id,f.dueChem.id].includes(c.requirementId)));
  assert.ok(a.selected.every(c=>Number.isFinite(c.priorityScore)&&c.estimatedMinutes>0));
  assert.ok(a.moreThanDayLate>=1);
  assert.match(a.warning,/NOT proof of a missed committed session/);
  assert.equal(JSON.stringify(f.db),before);
});

test('due-only course-balanced packing honours the budget and previously completed IDs',()=>{
  const f=fixture(),now=at(2026,11,23),before=JSON.stringify(f.db);
  const small=C.planDueReviews(f.db,5,[],{},now);
  const all=C.planDueReviews(f.db,25,[],{},now);
  assert.ok(small.items.length>0);
  assert.equal(all.items.length,2);
  assert.deepEqual(new Set(all.items.map(c=>c.req.courseId)),new Set([f.bio.id,f.chem.id]));
  assert.equal(all.items.filter(c=>c.isNew||!c.due).length,0);
  const remaining=C.planDueReviews(f.db,25,[all.items[0].target.id],{},now);
  assert.equal(remaining.items.length,1);
  assert.equal(remaining.items[0].target.id,all.items[1].target.id);
  assert.equal(JSON.stringify(f.db),before);
});

test('a regular mixed session remains unchanged and can still choose an urgent new question',()=>{
  const f=fixture(),now=at(2026,11,23);
  const original=C.planActivities(f.db,25,[],{},now);
  const due=C.planDueReviews(f.db,25,[],{},now);
  assert.equal(original.items.length,4);
  assert.equal(due.items.length,2);
  assert.ok(original.items.some(c=>c.isNew));
  assert.ok(original.items.some(c=>!c.due));
});

test('unavailable due days are recognized as capacity constraints, not attendance failures',()=>{
  const f=fixture(),now=at(2026,11,23);
  f.db.agendaPreferences.weekendMinutes=0;
  const p=C.catchUpPreview(f.db,{minutes:25,now});
  // Biology's Good interval from Fri Nov 20 put its due date on Sun Nov 22.
  assert.ok(p.dueOnUnavailable>=1);
  assert.ok(p.moreThanDayLate>=1);
  assert.equal(p.dueCount,2);
  const dated=C.today(new Date(f.db.memory[C.getTarget(f.db,f.dueBio.id).id].dueAt));
  f.db.agendaPreferences.weekendMinutes=30;
  f.db.agendaPreferences.missedDates=[dated];
  assert.ok(C.catchUpPreview(f.db,{minutes:25,now}).dueOnUnavailable>=1);
});

test('not enough time leaves backlog visible and does not promise that practice happened',()=>{
  const f=fixture(),now=at(2026,11,23);
  const preview=C.catchUpPreview(f.db,{minutes:5,now});
  assert.equal(preview.dueCount,2);
  assert.equal(preview.remainingCount,2-preview.selectedCount);
  assert.ok(preview.remainingEstimatedMinutes>=0);
  assert.equal(f.db.attempts.length,3,'Preview cannot invent catch-up reviews');
});

test('invalid durations, date, and tampered due-only session mode are rejected',()=>{
  const f=fixture();
  assert.throws(()=>C.catchUpPreview(f.db,{minutes:4}),/5–720/);
  assert.throws(()=>C.catchUpPreview(f.db,{minutes:721}),/5–720/);
  assert.throws(()=>C.catchUpPreview(f.db,{minutes:25,now:new Date(NaN)}),/Invalid catch-up preview date/);
  const old=JSON.parse(JSON.stringify(f.db));
  assert.equal(C.validateImport(old).schemaVersion,5);
  const valid=JSON.parse(JSON.stringify(f.db));
  valid.sessions.push({id:'catchup_session',status:'active',queueMode:'due_only'});
  assert.equal(C.validateImport(valid).schemaVersion,5);
  valid.sessions[0].queueMode='force_instant_success';
  assert.throws(()=>C.validateImport(valid),/Invalid saved study-session queue mode/);
});
