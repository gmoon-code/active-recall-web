'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');

function fixture(){
  const db=C.initialDb(),bio=C.addCourse(db,'Biology'),chem=C.addCourse(db,'Chemistry');
  const due=C.addRequirement(db,{courseId:bio.id,question:'What drives ATP synthesis?',answer:'A proton gradient.',kind:'recall'});
  const other=C.addRequirement(db,{courseId:chem.id,question:'What is an oxidant?',answer:'An electron acceptor.',kind:'recall'});
  const novel=C.addRequirement(db,{courseId:bio.id,question:'What is an enzyme?',answer:'A catalyst.',kind:'recall'});
  for(const r of [due,other])C.recordAttempt(db,{requirementId:r.id,rating:'good',response:r.answer,now:new Date(Date.now()-7*86400000)});
  return {db,due,other,novel};
}
const snapshot=db=>({memory:JSON.stringify(db.memory),attempts:JSON.stringify(db.attempts),requirements:db.requirements.length});

test('flagging a due question excludes it from every active queue without altering recall history',()=>{
  const f=fixture(),before=snapshot(f.db),target=C.getTarget(f.db,f.due.id).id;
  assert.equal(C.planDueReviews(f.db,25).items.length,2);
  const hold=C.holdQuestionForCorrection(f.db,f.due.id);
  assert.equal(hold.kind,'correction_required');
  assert.ok(Number.isFinite(Date.parse(hold.heldAt)));
  assert.deepEqual(snapshot(f.db),before);
  assert.ok(!C.eligibleCandidates(f.db).some(c=>c.req.id===f.due.id));
  assert.ok(!C.planDueReviews(f.db,25).items.some(c=>c.target.id===target));
  assert.ok(!C.planActivities(f.db,25).items.some(c=>c.target.id===target));
  assert.ok(!C.inspectStudyPriorities(f.db,{minutes:25}).current.items.some(c=>c.targetId===target));
  assert.ok(!C.buildReviewAgenda(f.db,{days:7}).days.some(day=>day.activities.some(a=>a.targetId===target)));
  assert.ok(C.planDueReviews(f.db,25).items.some(c=>c.req.id===f.other.id),'Other course unaffected');
  assert.equal(C.holdQuestionForCorrection(f.db,f.due.id),hold,'Repeat action is idempotent');
});

test('release requires confirmation, preserves prior due date and restores original eligibility',()=>{
  const f=fixture(),before=snapshot(f.db);
  C.holdQuestionForCorrection(f.db,f.due.id);
  assert.throws(()=>C.releaseQuestionCorrectionHold(f.db,f.due.id),/Review the question/);
  assert.ok(f.db.requirements.find(r=>r.id===f.due.id).studyHold);
  C.releaseQuestionCorrectionHold(f.db,f.due.id,{confirmed:true});
  assert.equal(f.db.requirements.find(r=>r.id===f.due.id).studyHold,undefined);
  assert.deepEqual(snapshot(f.db),before);
  assert.ok(C.planDueReviews(f.db,25).items.some(c=>c.req.id===f.due.id));
  assert.deepEqual(f.db.events.slice(-2).map(e=>e.type),['question.correction_hold','question.correction_released']);
  assert.throws(()=>C.releaseQuestionCorrectionHold(f.db,f.due.id,{confirmed:true}),/No held question/);
});

test('flagging an active session question is an unrated skip and leaves it out until reviewed',()=>{
  const f=fixture(),target=C.getTarget(f.db,f.due.id).id,before=snapshot(f.db);
  const se={id:'test_session',status:'active',paused:false,queueMode:'due_only',completedIds:[],skippedIds:[],currentTargetId:target,currentReqId:f.due.id};
  f.db.sessions.push(se);
  assert.equal(C.holdSessionQuestionForCorrection(f.db,se),target);
  assert.deepEqual(se.skippedIds,[target]);
  assert.deepEqual(se.completedIds,[]);
  assert.deepEqual(snapshot(f.db),before);
  assert.ok(f.db.requirements.find(r=>r.id===f.due.id).studyHold);
  assert.equal(C.planDueReviews(f.db,25,se.skippedIds).items.length,1);
  assert.throws(()=>C.holdSessionQuestionForCorrection(f.db,se),/not eligible/);
  se.status='completed';
  C.releaseQuestionCorrectionHold(f.db,f.due.id,{confirmed:true});
  assert.ok(C.planDueReviews(f.db,25).items.some(c=>c.target.id===target),'New session can revisit it');
});

test('wording-only edit retains hold; substantive edit follows established interval reset policy',()=>{
  const f=fixture(),r=f.due,old=JSON.stringify(f.db.memory);
  C.holdQuestionForCorrection(f.db,r.id);
  C.editRequirement(f.db,r.id,{question:'What proton gradient powers ATP synthesis?',answer:r.answer,kind:r.kind,changeType:'wording'});
  assert.ok(f.db.requirements.find(x=>x.id===r.id).studyHold);
  assert.equal(JSON.stringify(f.db.memory),old,'Wording-only means the same target retains memory');
  C.editRequirement(f.db,r.id,{question:'What powers ATP synthase during chemiosmosis?',answer:'A proton electrochemical gradient.',kind:r.kind,changeType:'substantive'});
  assert.ok(f.db.requirements.find(x=>x.id===r.id).studyHold);
  assert.equal(C.getMemory(f.db,r.id),undefined,'The pre-existing substantive-edit rule resets this target');
  C.releaseQuestionCorrectionHold(f.db,r.id,{confirmed:true});
  assert.ok(C.eligibleCandidates(f.db).some(c=>c.req.id===r.id&&c.isNew),'Revised target returns as a first attempt');
});

test('v5 backups reject tampered correction hold and accept old/no-hold history',()=>{
  const f=fixture(),original=JSON.parse(JSON.stringify(f.db));
  assert.equal(C.validateImport(original).schemaVersion,5);
  C.holdQuestionForCorrection(f.db,f.due.id);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
  for(const bad of [null,{kind:'pretend_correct',heldAt:new Date().toISOString()},
    {kind:'correction_required',heldAt:'nonsense'},'true',[]]){
    const changed=JSON.parse(JSON.stringify(f.db));changed.requirements.find(r=>r.id===f.due.id).studyHold=bad;
    assert.throws(()=>C.validateImport(changed),/Invalid question correction hold/);
  }
});

test('deleted questions cannot be held or released, and permanent deletion removes hold events',()=>{
  const f=fixture();C.holdQuestionForCorrection(f.db,f.due.id);
  C.archiveRequirements(f.db,[f.due.id]);
  assert.throws(()=>C.holdQuestionForCorrection(f.db,f.due.id),/Active question not found/);
  assert.throws(()=>C.releaseQuestionCorrectionHold(f.db,f.due.id,{confirmed:true}),/No held question/);
  C.purgeArchivedRequirements(f.db,[f.due.id]);
  assert.ok(!f.db.events.some(e=>e.type==='question.correction_hold'&&e.entityId===f.due.id));
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
});
