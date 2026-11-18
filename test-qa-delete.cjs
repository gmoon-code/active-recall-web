'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');

function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'AP Biology');
  const add=(question,lectureTitle='Lecture 1')=>C.addRequirement(db,{courseId:course.id,lectureTitle,question,answer:'A reference answer.',kind:'recall'});
  return {db,course,add};
}

test('deleting one Q&A removes it from all new reviews but retains its answer and evidence',()=>{
  const {db,add}=fixture(),r=add('How does ATP synthase work?'),other=add('What is ATP?');
  const target=C.getTarget(db,r.id),activity=C.getActivities(db,r.id)[0];
  C.recordAttempt(db,{requirementId:r.id,targetId:target.id,activityId:activity.id,rating:'good',response:'My response'});
  const due=db.memory[target.id].dueAt,history=JSON.stringify(db.attempts);
  const result=C.archiveRequirements(db,[r.id]);
  assert.equal(result.length,1);
  assert.equal(r.active,false);
  assert.ok(r.archivedAt);
  assert.equal(db.requirements.length,2);
  assert.equal(db.requirements.find(x=>x.id===r.id).answer,'A reference answer.');
  assert.equal(JSON.stringify(db.attempts),history);
  assert.equal(db.memory[target.id].dueAt,due);
  assert.deepEqual(C.eligibleCandidates(db).map(c=>c.req.id),[other.id]);
  assert.ok(db.events.some(e=>e.type==='requirement.archived'&&e.entityId===r.id));
});

test('deleting selected Q&As archives exactly those items as one validated operation',()=>{
  const {db,add}=fixture(),a=add('Question A?'),b=add('Question B?'),c=add('Question C?');
  C.archiveRequirements(db,[a.id,c.id]);
  assert.deepEqual(db.requirements.filter(r=>r.active).map(r=>r.id),[b.id]);
  assert.deepEqual(C.eligibleCandidates(db).map(c=>c.req.id),[b.id]);
  assert.equal(db.events.filter(e=>e.type==='requirement.archived').length,2);
});

test('invalid bulk selection never partially archives an otherwise valid question',()=>{
  const {db,add}=fixture(),a=add('Question A?'),b=add('Question B?');
  const before=JSON.stringify(db);
  assert.throws(()=>C.archiveRequirements(db,[a.id,'not-a-real-id']),/Nothing was deleted/);
  assert.equal(JSON.stringify(db),before);
  assert.throws(()=>C.archiveRequirements(db,[a.id,a.id]),/Invalid question selection/);
  assert.equal(JSON.stringify(db),before);
  C.archiveRequirements(db,[b.id]);
  const after=JSON.stringify(db);
  assert.throws(()=>C.archiveRequirements(db,[a.id,b.id]),/Nothing was deleted/);
  assert.equal(JSON.stringify(db),after);
  assert.equal(a.active,true);
});

test('restoring a deleted Q&A brings back the original target and review interval',()=>{
  const {db,add}=fixture(),r=add('What drives chemiosmosis?');
  const target=C.getTarget(db,r.id),activity=C.getActivities(db,r.id)[0];
  C.recordAttempt(db,{requirementId:r.id,targetId:target.id,activityId:activity.id,rating:'good',response:'Protons'});
  const due=db.memory[target.id].dueAt,originalTargetId=target.id;
  C.archiveRequirements(db,[r.id]);
  assert.equal(C.eligibleCandidates(db).length,0);
  C.restoreRequirement(db,r.id);
  assert.equal(r.active,true);
  assert.equal('archivedAt' in r,false);
  assert.equal(C.getTarget(db,r.id).id,originalTargetId);
  assert.equal(db.memory[target.id].dueAt,due);
  assert.equal(db.attempts.length,1);
  assert.equal(C.eligibleCandidates(db).length,1);
  assert.ok(db.events.some(e=>e.type==='requirement.restored'&&e.entityId===r.id));
});

test('restoring an archived Q&A rejects an existing same-lecture duplicate',()=>{
  const {db,add}=fixture(),r=add('What is a gradient?');
  C.archiveRequirements(db,[r.id]);
  add('What is a gradient?');
  const before=JSON.stringify(db);
  assert.throws(()=>C.restoreRequirement(db,r.id),/already exists/);
  assert.equal(JSON.stringify(db),before);
});

test('deletion and restoration survive schema-v5 backup without changing review attempts',()=>{
  const {db,add}=fixture(),r=add('How is ATP made?');
  const target=C.getTarget(db,r.id),activity=C.getActivities(db,r.id)[0];
  C.recordAttempt(db,{requirementId:r.id,targetId:target.id,activityId:activity.id,rating:'hard',response:'Partially remembered'});
  C.archiveRequirements(db,[r.id]);
  const imported=C.validateImport(JSON.parse(JSON.stringify(db)));
  assert.equal(imported.schemaVersion,5);
  assert.equal(imported.requirements.find(x=>x.id===r.id).active,false);
  assert.equal(imported.attempts.length,1);
  assert.equal(C.eligibleCandidates(imported).length,0);
  C.restoreRequirement(imported,r.id);
  assert.equal(C.eligibleCandidates(imported).length,1);
});
