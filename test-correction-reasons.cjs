'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');

function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,question:'What powers ATP synthase?',answer:'A proton gradient.',kind:'recall'});
  C.recordAttempt(db,{requirementId:req.id,rating:'good',response:'A proton gradient.',now:new Date(Date.now()-7*86400000)});
  return {db,req,target:C.getTarget(db,req.id)};
}
function evidence(db){return {attempts:JSON.stringify(db.attempts),memory:JSON.stringify(db.memory)};}

test('a categorical quality flag is an unrated session skip and preserves the original due date',()=>{
  const {db,req,target}=fixture(),before=evidence(db);
  const se={id:'reason_session',status:'active',paused:false,queueMode:'due_only',completedIds:[],skippedIds:[],currentTargetId:target.id,currentReqId:req.id};
  db.sessions.push(se);
  C.holdSessionQuestionForCorrection(db,se,{reason:'suspected_error'});
  assert.equal(req.studyHold.reason,'suspected_error');
  assert.equal(req.studyHold.note,'');
  assert.deepEqual(se.skippedIds,[target.id]);
  assert.deepEqual(se.completedIds,[]);
  assert.deepEqual(evidence(db),before);
  assert.ok(!C.planDueReviews(db,25).items.some(i=>i.req.id===req.id));
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('repair note updates do not release a question, create recall evidence, or reschedule it',()=>{
  const {db,req}=fixture(),before=evidence(db);
  C.holdQuestionForCorrection(db,req.id,new Date('2026-11-18T09:00:00Z'));
  const oldHeldAt=req.studyHold.heldAt,eventCount=db.events.length;
  C.updateQuestionCorrectionDetails(db,req.id,{reason:'unclear',note:'  Explain the necessary condition.  '},new Date('2026-11-19T09:00:00Z'));
  assert.deepEqual({kind:req.studyHold.kind,reason:req.studyHold.reason,note:req.studyHold.note,heldAt:req.studyHold.heldAt,updatedAt:req.studyHold.updatedAt},
    {kind:'correction_required',reason:'unclear',note:'Explain the necessary condition.',heldAt:oldHeldAt,updatedAt:'2026-11-19T09:00:00.000Z'});
  assert.equal(db.events.length,eventCount+1);
  C.updateQuestionCorrectionDetails(db,req.id,{reason:'unclear',note:'Explain the necessary condition.'});
  assert.equal(db.events.length,eventCount+1,'Repeated note is idempotent');
  assert.deepEqual(evidence(db),before);
  assert.ok(!C.eligibleCandidates(db).some(i=>i.req.id===req.id));
  C.releaseQuestionCorrectionHold(db,req.id,{confirmed:true});
  assert.deepEqual(evidence(db),before);
  assert.ok(C.eligibleCandidates(db).some(i=>i.req.id===req.id));
});

test('older v4.23 schema-v5 holds remain importable and editable',()=>{
  const {db,req}=fixture();
  C.holdQuestionForCorrection(db,req.id);
  delete req.studyHold.reason;delete req.studyHold.note;
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
  C.updateQuestionCorrectionDetails(db,req.id,{reason:'possible_duplicate',note:'Check against lecture 2 question.'});
  assert.equal(req.studyHold.reason,'possible_duplicate');
  assert.equal(req.studyHold.note,'Check against lecture 2 question.');
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('invalid categories and overlong notes are rejected without partially changing session or evidence',()=>{
  const {db,req,target}=fixture(),before=evidence(db);
  const se={id:'reason_session',status:'active',paused:false,queueMode:'due_only',completedIds:[],skippedIds:[],currentTargetId:target.id,currentReqId:req.id};
  assert.throws(()=>C.holdSessionQuestionForCorrection(db,se,{reason:'verified_wrong'}),/supported correction reason/);
  assert.deepEqual(se.skippedIds,[]);
  assert.equal(req.studyHold,undefined);
  assert.throws(()=>C.holdQuestionForCorrection(db,req.id,new Date(),{note:'x'.repeat(501)}),/at most 500/);
  assert.equal(req.studyHold,undefined);
  C.holdQuestionForCorrection(db,req.id);
  const held=JSON.stringify(req.studyHold),eventCount=db.events.length;
  for(const details of [{reason:'not-a-reason',note:''},{reason:'other',note:'x'.repeat(501)}]){
    assert.throws(()=>C.updateQuestionCorrectionDetails(db,req.id,details),/supported correction reason|at most 500/);
    assert.equal(JSON.stringify(req.studyHold),held);
    assert.equal(db.events.length,eventCount);
  }
  assert.deepEqual(evidence(db),before);
  assert.throws(()=>C.updateQuestionCorrectionDetails(db,'missing',{reason:'other'}),/Held question not found/);
});

test('schema-v5 import rejects maliciously shaped quality metadata without requiring the new fields',()=>{
  const {db,req}=fixture();
  C.holdQuestionForCorrection(db,req.id);
  for(const patch of [{reason:'invented'},{reason:null},{note:4},{note:'x'.repeat(501)},{updatedAt:'not a date'},{updatedAt:123}]){
    const changed=JSON.parse(JSON.stringify(db));Object.assign(changed.requirements.find(r=>r.id===req.id).studyHold,patch);
    assert.throws(()=>C.validateImport(changed),/Invalid question correction hold/);
  }
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});
