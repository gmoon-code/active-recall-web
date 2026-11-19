'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');

function fixture({held=true}={}){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,question:'What powers ATP synthase?',answer:'A proton gradient.',kind:'recall'});
  C.recordAttempt(db,{requirementId:req.id,rating:'good',response:req.answer,now:new Date(Date.now()-7*86400000)});
  C.addActivityVariant(db,{requirementId:req.id,question:'What is the driving force for ATP synthase?',answer:req.answer,kind:'recall'});
  if(held)C.holdQuestionForCorrection(db,req.id);
  return {db,req};
}
const evidence=db=>({attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory)});

test('a Save with no edits is fully idempotent even when a question is held',()=>{
  const {db,req}=fixture(),before=JSON.stringify(db);
  const draft={question:req.question,answer:req.answer,kind:req.kind,changeType:'substantive'};
  const preview=C.previewRequirementRevision(db,req.id,draft);
  assert.equal(preview.changed,false);assert.deepEqual(preview.changes,[]);
  assert.equal(C.editRequirement(db,req.id,draft),req);
  assert.equal(JSON.stringify(db),before,'No versions, variants, memory, events or hold metadata should change');
});

test('a read-only substantive preview reports actual interval and variation consequences',()=>{
  const {db,req}=fixture(),before=JSON.stringify(db);
  const plan=C.previewRequirementRevision(db,req.id,{question:'What powers ATP formation?',answer:'Electrochemical potential of protons.',kind:req.kind,changeType:'substantive'});
  assert.equal(plan.changed,true);assert.equal(plan.substantive,true);
  assert.deepEqual(plan.changes,['Question wording','Reference answer']);
  assert.equal(plan.existingIntervals,1);assert.equal(plan.affectedIntervals,1);
  assert.equal(plan.activeVariations,1);assert.equal(plan.archivedVariations,1);
  assert.equal(plan.holdRetained,true);
  assert.equal(JSON.stringify(db),before,'Preview cannot save anything');
  const old=evidence(db);
  C.editRequirement(db,req.id,plan.next);
  assert.equal(db.attempts.length,JSON.parse(old.attempts).length,'Past attempts are retained');
  assert.equal(C.getMemory(db,req.id),undefined,'A substantive correction restarts the due interval');
  assert.ok(req.studyHold,'It does not resume a held question');
  assert.equal(C.getActivities(db,req.id).filter(a=>!a.isPrimary).length,0);
});

test('a wording-only repair keeps memory and variations, without claiming equivalence was checked',()=>{
  const {db,req}=fixture(),before=evidence(db),oldVersion=req.version;
  const patch={question:'Which proton gradient powers ATP synthase?',answer:req.answer,kind:req.kind,changeType:'wording'};
  const plan=C.previewRequirementRevision(db,req.id,patch);
  assert.equal(plan.substantive,false);assert.equal(plan.affectedIntervals,0);assert.equal(plan.archivedVariations,0);
  C.editRequirement(db,req.id,patch);
  assert.deepEqual(evidence(db),before);assert.equal(req.version,oldVersion+1);
  assert.ok(req.studyHold);assert.equal(C.getActivities(db,req.id).filter(a=>!a.isPrimary).length,1);
});

test('changing practice type automatically uses substantive policy even if an older caller requests wording-only',()=>{
  const {db,req}=fixture();
  const patch={question:req.question,answer:req.answer,kind:'apply',changeType:'wording'};
  const plan=C.previewRequirementRevision(db,req.id,patch);
  assert.equal(plan.forcedSubstantive,true);assert.equal(plan.substantive,true);
  assert.equal(plan.affectedIntervals,1);assert.equal(plan.archivedVariations,1);
  const before=JSON.stringify(db);
  for(const bad of [{...patch,changeType:'unknown'},{...patch,kind:'invented',changeType:'substantive'}]){
    assert.throws(()=>C.previewRequirementRevision(db,req.id,bad),/supported revision type|supported practice type/);
    assert.throws(()=>C.editRequirement(db,req.id,bad),/supported revision type|supported practice type/);
  }
  assert.equal(JSON.stringify(db),before,'Invalid choices must never partially mutate the question');
  C.editRequirement(db,req.id,patch);
  assert.equal(req.kind,'apply');assert.equal(C.getMemory(db,req.id),undefined);
  assert.equal(C.getActivities(db,req.id).filter(a=>!a.isPrimary).length,0);
  assert.ok(req.studyHold);
});

test('a lecture-label-only update never resets memory, even with the default revision choice',()=>{
  const {db,req}=fixture(),before=evidence(db);
  const patch={question:req.question,answer:req.answer,kind:req.kind,lectureTitle:'Lecture 6 — Membrane proteins',changeType:'substantive'};
  const plan=C.previewRequirementRevision(db,req.id,patch);
  assert.deepEqual(plan.changes,['Lecture label']);assert.equal(plan.substantive,false);
  assert.equal(plan.affectedIntervals,0);assert.equal(plan.archivedVariations,0);
  C.editRequirement(db,req.id,patch);
  assert.equal(req.lectureTitle,patch.lectureTitle);assert.deepEqual(evidence(db),before);
  assert.equal(C.getActivities(db,req.id).filter(a=>!a.isPrimary).length,1);
});

test('a changed learning objective is visible in the preview and follows the explicit reset policy',()=>{
  const {db,req}=fixture(),before=JSON.stringify(db.memory);
  const plan=C.previewRequirementRevision(db,req.id,{question:req.question,answer:req.answer,kind:req.kind,objective:'Describe the mechanism of ATP synthase',changeType:'substantive'});
  assert.deepEqual(plan.changes,['Learning objective']);
  assert.equal(JSON.stringify(db.memory),before);
  C.editRequirement(db,req.id,{...plan.next,changeType:'substantive'});
  assert.equal(C.getMemory(db,req.id),undefined);
  assert.ok(req.studyHold);
});
