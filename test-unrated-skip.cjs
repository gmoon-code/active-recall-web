'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');

function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const due=C.addRequirement(db,{courseId:course.id,question:'What powers ATP synthase?',answer:'The proton gradient.',kind:'recall'});
  const second=C.addRequirement(db,{courseId:course.id,question:'What is NADH?',answer:'An electron carrier.',kind:'recall'});
  const novel=C.addRequirement(db,{courseId:course.id,question:'Name an enzyme?',answer:'Catalase.',kind:'recall'});
  const at=new Date(Date.now()-5*86400000);
  for(const r of [due,second])C.recordAttempt(db,{requirementId:r.id,now:at,rating:'good',response:r.answer});
  const se={id:'unrated_session',status:'active',paused:false,queueMode:'due_only',completedIds:[],
    skippedIds:[],currentReqId:due.id,currentTargetId:C.getTarget(db,due.id).id};
  db.sessions.push(se);
  return {db,se,due,second,novel};
}

test('skipping a due target records only session navigation, never an attempt or review-date change',()=>{
  const f=fixture(),memory=JSON.stringify(f.db.memory),attempts=JSON.stringify(f.db.attempts);
  const target=C.getTarget(f.db,f.due.id).id;
  assert.equal(C.skipUnratedTarget(f.db,f.se),target);
  assert.deepEqual(f.se.skippedIds,[target]);
  assert.equal(JSON.stringify(f.db.memory),memory);
  assert.equal(JSON.stringify(f.db.attempts),attempts);
  assert.equal(f.se.completedIds.length,0);
  assert.deepEqual(C.planDueReviews(f.db,25,f.se.skippedIds).items.map(p=>p.req.id),[f.second.id]);
  assert.equal(C.planDueReviews(f.db,25).items.length,2,'Due review remains eligible in a later session');
});

test('skipped targets are excluded for mixed sessions too, without hiding other eligible work',()=>{
  const f=fixture(),excluded=[C.skipUnratedTarget(f.db,f.se)];
  const remaining=C.planActivities(f.db,25,excluded).items;
  assert.ok(remaining.some(p=>p.req.id===f.novel.id));
  assert.ok(remaining.some(p=>p.req.id===f.second.id));
  assert.ok(!remaining.some(p=>p.req.id===f.due.id));
});

test('skipping cannot be used as an unverified rating or on an inactive, paused or completed target',()=>{
  const f=fixture();
  f.se.paused=true;assert.throws(()=>C.skipUnratedTarget(f.db,f.se),/No active question/);
  f.se.paused=false;f.se.status='completed';assert.throws(()=>C.skipUnratedTarget(f.db,f.se),/No active question/);
  f.se.status='active';f.se.currentTargetId='invented';assert.throws(()=>C.skipUnratedTarget(f.db,f.se),/not eligible/);
  f.se.currentTargetId=C.getTarget(f.db,f.due.id).id;
  f.se.completedIds.push(f.se.currentTargetId);
  assert.throws(()=>C.skipUnratedTarget(f.db,f.se),/not eligible/);
  f.se.completedIds=[];C.skipUnratedTarget(f.db,f.se);
  assert.throws(()=>C.skipUnratedTarget(f.db,f.se),/not eligible/);
  assert.throws(()=>C.skipUnratedTarget(f.db,{...f.se}),/No active question/);
});

test('schema-v5 backup accepts optional skips, rejects malformed, duplicate and overlapping IDs',()=>{
  const f=fixture(),target=C.getTarget(f.db,f.due.id).id;
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
  C.skipUnratedTarget(f.db,f.se);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
  const old=JSON.parse(JSON.stringify(f.db));delete old.sessions[0].skippedIds;
  assert.equal(C.validateImport(old).schemaVersion,5,'Older sessions without skips remain valid');
  for(const bad of [[target,target],['missing_target'],[null],{id:target}]){
    const edited=JSON.parse(JSON.stringify(f.db));edited.sessions[0].skippedIds=bad;
    assert.throws(()=>C.validateImport(edited),/Invalid unrated session skips/);
  }
  const overlap=JSON.parse(JSON.stringify(f.db));overlap.sessions[0].completedIds=[target];
  assert.throws(()=>C.validateImport(overlap),/Invalid unrated session skips/);
  const malformed=JSON.parse(JSON.stringify(f.db));malformed.sessions[0].completedIds='not-an-array';
  assert.throws(()=>C.validateImport(malformed),/Invalid unrated session skips/);
});

test('permanent question erasure also scrubs skipped target references',()=>{
  const f=fixture(),target=C.skipUnratedTarget(f.db,f.se);
  C.archiveRequirements(f.db,[f.due.id]);C.purgeArchivedRequirements(f.db,[f.due.id]);
  assert.ok(!f.db.retrievalTargets.some(t=>t.id===target));
  assert.deepEqual(f.db.sessions[0].skippedIds,[]);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(f.db))).schemaVersion,5);
});
