'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');
const Pilot=require('./reviewer-pilot.js');

function fixture(){
  const db=C.initialDb(),course=C.addCourse(db,'AP Biology');
  const add=(question,lectureTitle='Lecture 1')=>C.addRequirement(db,{courseId:course.id,lectureTitle,question,answer:'Reference answer to '+question,kind:'explain'});
  return {db,course,add};
}

test('permanent deletion refuses active questions, unknown IDs and duplicate IDs without writes',()=>{
  const {db,add}=fixture(),r=add('Keep this question?');
  const before=JSON.stringify(db);
  assert.throws(()=>C.purgeArchivedRequirements(db,[r.id]),/Only already-deleted/);
  assert.throws(()=>C.purgeArchivedRequirements(db,['not-found']),/Only already-deleted/);
  assert.throws(()=>C.purgeArchivedRequirements(db,[r.id,r.id]),/Invalid permanent-deletion selection/);
  assert.equal(JSON.stringify(db),before);
});

test('permanently deleting a deleted Q&A erases original content, all versions, rubrics, memory, attempts and related events',()=>{
  const {db,add}=fixture(),r=add('SECRET_DELETE_ONLY: explain proton flux?'),other=add('Keep this other question?');
  const target=C.getTarget(db,r.id),activity=C.getActivities(db,r.id)[0];
  const criterion=C.addCriterion(db,{targetId:target.id,text:'Names the cause.'});
  C.recordAttempt(db,{requirementId:r.id,targetId:target.id,activityId:activity.id,
    rating:'good',response:'SECRET_RESPONSE_TO_DELETE',durationSeconds:75});
  const unrelated=C.getTarget(db,other.id),unrelatedActivity=C.getActivities(db,other.id)[0];
  C.recordAttempt(db,{requirementId:other.id,targetId:unrelated.id,activityId:unrelatedActivity.id,
    rating:'hard',response:'KEEP_RESPONSE',durationSeconds:60});
  C.archiveRequirements(db,[r.id]);
  const result=C.purgeArchivedRequirements(db,[r.id]);
  assert.deepEqual(result,{count:1,attemptCount:1});
  assert.equal(db.requirements.length,1);
  assert.equal(db.requirements[0].id,other.id);
  assert.equal(db.requirementVersions.some(x=>x.requirementId===r.id),false);
  assert.equal(db.retrievalTargets.some(x=>x.id===target.id),false);
  assert.equal(db.activities.some(x=>x.id===activity.id),false);
  assert.equal(db.rubricCriteria.some(x=>x.id===criterion.id),false);
  assert.equal(db.criterionVersions.some(x=>x.criterionId===criterion.id),false);
  assert.equal(db.memory[target.id],undefined);
  assert.equal(db.attempts.length,1);
  assert.equal(db.attempts[0].response,'KEEP_RESPONSE');
  assert.equal(db.timeModels.explain.count,1);
  assert.equal(db.timeModels.explain.totalSeconds,60);
  assert.ok(!JSON.stringify(db).includes('SECRET_DELETE_ONLY'));
  assert.ok(!JSON.stringify(db).includes('SECRET_RESPONSE_TO_DELETE'));
  assert.ok(!db.events.some(e=>e.entityId===r.id||e.requirementId===r.id||e.targetId===target.id));
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('all alternative targets, variants and completed session pointers are purged',()=>{
  const {db,add}=fixture(),r=add('Which mechanism?');
  const {target:extra}=C.addRetrievalTarget(db,{requirementId:r.id,label:'Subprocess',question:'How does the subprocess work?',answer:'It has steps.'});
  const variant=C.addActivityVariant(db,{requirementId:r.id,targetId:extra.id,question:'Explain the subprocess differently.',answer:'It has linked stages.'});
  const primary=C.getTarget(db,r.id),primaryActivity=C.getActivities(db,r.id)[0];
  const session={id:'session_test',status:'active',courseCounts:{[r.courseId]:2},completedIds:[primary.id,extra.id],currentReqId:r.id,currentTargetId:extra.id,currentActivityId:variant.id,draftAnswer:'SECRET_DRAFT',correctionDraft:'SECRET_CORRECTION',criterionDraft:{x:'met'},showHint:true,showReference:true,assistedForCurrent:true};
  db.sessions.push(session);
  C.archiveRequirements(db,[r.id]);C.purgeArchivedRequirements(db,[r.id]);
  assert.equal(db.retrievalTargets.length,0);assert.equal(db.activities.length,0);
  assert.equal(db.sessions[0].currentReqId,null);
  assert.equal(db.sessions[0].currentTargetId,null);
  assert.equal(db.sessions[0].currentActivityId,null);
  assert.deepEqual(db.sessions[0].completedIds,[]);
  assert.equal(db.sessions[0].courseCounts[r.courseId],0);
  assert.equal(db.sessions[0].draftAnswer,'');
  assert.equal(db.sessions[0].correctionDraft,'');
  assert.ok(!JSON.stringify(db).includes('SECRET_DRAFT'));
  assert.ok(!JSON.stringify(db).includes('SECRET_CORRECTION'));
  assert.equal(primaryActivity.requirementId,r.id);
});

test('bulk permanent deletion leaves unrelated courses, assessments, syllabus and source notes intact',()=>{
  const {db,course,add}=fixture(),one=add('Remove A?'),two=add('Remove B?'),keep=add('Keep C?');
  const second=C.addCourse(db,'AP Chemistry');
  const keptOther=C.addRequirement(db,{courseId:second.id,question:'What is pH?',answer:'A measure of acidity.',kind:'recall'});
  const source=C.addSource(db,{courseId:course.id,title:'Lecture notes',content:'An original source note that remains.',generateDrafts:false}).source;
  source.duplicateLinks.push(one.id,keep.id);
  source.conflictLinks.push(two.id);
  keep.possibleDuplicateOf=one.id;keep.possibleConflictWith=two.id;
  C.addSyllabusObjectives(db,{courseId:course.id,text:'Explain respiration.'});
  C.setSyllabusLink(db,db.syllabusObjectives[0].id,one.id,true);
  C.setSyllabusLink(db,db.syllabusObjectives[0].id,keep.id,true);
  C.addAssessment(db,{courseId:course.id,title:'Exam',date:'2030-06-01',scope:'selected',requirementIds:[one.id,two.id,keep.id]});
  db.events.push({type:'source.revised',entityId:source.id,affectedRequirements:[one.id,two.id,keep.id],at:new Date().toISOString()});
  C.archiveRequirements(db,[one.id,two.id]);
  C.purgeArchivedRequirements(db,[one.id,two.id]);
  assert.deepEqual(db.requirements.map(r=>r.id),[keep.id,keptOther.id]);
  assert.deepEqual(source.duplicateLinks,[one.id,keep.id],'Fixture source object is untouched; database holds the filtered copy.');
  assert.deepEqual(db.sources[0].duplicateLinks,[keep.id]);
  assert.deepEqual(db.sources[0].conflictLinks,[]);
  assert.equal(db.sources[0].content,'An original source note that remains.');
  assert.deepEqual(db.syllabusObjectives[0].requirementIds,[keep.id]);
  assert.deepEqual(db.assessments[0].requirementIds,[keep.id]);
  assert.equal(db.requirements.find(r=>r.id===keep.id).possibleDuplicateOf,null);
  assert.equal(db.requirements.find(r=>r.id===keep.id).possibleConflictWith,null);
  assert.deepEqual(db.events.findLast(e=>e.type==='source.revised').affectedRequirements,[keep.id]);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('bulk purge is all-or-nothing if even one selected item is still active',()=>{
  const {db,add}=fixture(),deleted=add('Deleted?'),active=add('Still active?');
  C.archiveRequirements(db,[deleted.id]);
  const before=JSON.stringify(db);
  assert.throws(()=>C.purgeArchivedRequirements(db,[deleted.id,active.id]),/Nothing was erased/);
  assert.equal(JSON.stringify(db),before);
});

test('locked reviewer-pilot records block erasure of a previously attempted question',()=>{
  const {db,add}=fixture(),r=add('Pilot-linked question?');
  const target=C.getTarget(db,r.id),activity=C.getActivities(db,r.id)[0];
  C.recordAttempt(db,{requirementId:r.id,targetId:target.id,activityId:activity.id,rating:'hard',response:'Earlier attempt'});
  Pilot.start(db,{plannedTargets:3,confirmed:true});
  C.archiveRequirements(db,[r.id]);
  const before=JSON.stringify(db);
  assert.throws(()=>C.purgeArchivedRequirements(db,[r.id]),/locked reviewer-pilot/);
  assert.equal(JSON.stringify(db),before);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('a never-attempted deleted question can be purged without altering an unrelated locked pilot',()=>{
  const {db,add}=fixture(),r=add('Not attempted?');
  Pilot.start(db,{plannedTargets:3,confirmed:true});
  C.archiveRequirements(db,[r.id]);
  const before=JSON.stringify(db.reviewerPilot);
  C.purgeArchivedRequirements(db,[r.id]);
  assert.equal(JSON.stringify(db.reviewerPilot),before);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});
