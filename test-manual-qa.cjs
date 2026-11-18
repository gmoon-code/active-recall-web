/* Manual lecture questions, opt-in rules and preserved study evidence. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.js');

function fixture(){const db=C.initialDb(),course=C.addCourse(db,'AP Biology');return {db,course};}

test('lecture notes can be saved without producing any automatic questions',()=>{
  const {db,course}=fixture();
  const saved=C.addSource(db,{courseId:course.id,title:'Lecture 1 — ATP synthesis',
    content:'ATP synthase produces ATP only when a proton gradient is present.',generateDrafts:false});
  assert.equal(saved.added,0);
  assert.equal(db.requirements.length,0);
  assert.equal(db.sources.length,1);
  assert.equal(db.sourceVersions.length,1);
  assert.equal(db.sources[0].content,'ATP synthase produces ATP only when a proton gradient is present.');
  assert.equal(C.eligibleCandidates(db).length,0);
});

test('TXT import also respects explicit no-draft mode',()=>{
  const {db,course}=fixture();
  const result=C.addImportedDocument(db,{courseId:course.id,title:'Lecture 2',generateDrafts:false,
    document:{name:'notes.txt',format:'txt',content:'ATP synthase uses proton movement across a membrane.'}});
  assert.equal(result.added,0);
  assert.equal(db.requirements.length,0);
  assert.equal(result.sourceIds.length,1);
  assert.equal(db.sources[0].documentGroupId,result.documentGroupId);
});

test('automatic lecture questions remain available only after explicit opt-in and review',()=>{
  const {db,course}=fixture();
  const saved=C.addSource(db,{courseId:course.id,title:'Lecture 1',
    content:'ATP synthase produces ATP only when a proton gradient is present.',generateDrafts:true});
  assert.ok(saved.added>0);
  assert.ok(db.requirements.every(r=>r.origin==='rule_draft'&&r.verificationStatus==='draft'));
  assert.equal(C.eligibleCandidates(db).length,0);
});

test('self-authored Q&A can be linked to saved lecture notes without inventing a source quote',()=>{
  const {db,course}=fixture();
  const source=C.addSource(db,{courseId:course.id,title:'Lecture 8',content:'ATP synthase produces ATP.',generateDrafts:false}).source;
  const r=C.addRequirement(db,{courseId:course.id,sourceId:source.id,lectureTitle:'ignored title',
    question:'How does ATP synthase couple proton flow to ATP formation?',
    answer:'It uses the electrochemical gradient across a membrane to drive ATP formation.',kind:'explain'});
  assert.equal(r.sourceId,source.id);
  assert.equal(r.lectureTitle,'');
  assert.equal(r.sourceQuote,'');
  assert.equal(r.verificationStatus,'verified');
  assert.equal(C.eligibleCandidates(db).length,1);
  assert.equal(C.getActivities(db,r.id)[0].answer,r.answer);
});

test('manual questions can be organised by lecture title without uploading any notes',()=>{
  const {db,course}=fixture();
  const r=C.addRequirement(db,{courseId:course.id,lectureTitle:'Lecture 4 — Cell signalling',
    question:'How does a signal become amplified?',answer:'A signalling cascade activates multiple downstream molecules.',kind:'explain'});
  assert.equal(r.lectureTitle,'Lecture 4 — Cell signalling');
  assert.equal(r.sourceId,null);
  C.editRequirement(db,r.id,{question:r.question,answer:r.answer,kind:r.kind,lectureTitle:'Lecture 5 — Cell signalling',changeType:'wording'});
  assert.equal(r.lectureTitle,'Lecture 5 — Cell signalling');
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).requirements.find(q=>q.id===r.id).lectureTitle,'Lecture 5 — Cell signalling');
});

test('paste several Q/A pairs with multi-line answers under one lecture',()=>{
  const {db,course}=fixture();
  const rows=C.addManualQuestionBatch(db,{courseId:course.id,lectureTitle:'Lecture 6 — Respiration',kind:'explain',text:
    'Q: What does the electron transport chain establish?\nA: A proton gradient across the inner mitochondrial membrane.\nIt uses electron transfer to help move protons.\n\nQ: How is the gradient used?\nA: ATP synthase couples proton movement to ATP formation.'});
  assert.equal(rows.length,2);
  assert.equal(rows[0].lectureTitle,'Lecture 6 — Respiration');
  assert.match(rows[0].answer,/It uses electron transfer/);
  assert.equal(C.eligibleCandidates(db).length,2);
});

test('malformed Q/A paste rejects the whole batch without partial data loss',()=>{
  const {db,course}=fixture();
  assert.throws(()=>C.addManualQuestionBatch(db,{courseId:course.id,text:'Q: Valid question?\nA: Valid answer.\n\nQ: No answer supplied.'}),/Every Q:/);
  assert.equal(db.requirements.length,0);
  assert.equal(db.requirementVersions.length,0);
  assert.throws(()=>C.addManualQuestionBatch(db,{courseId:course.id,text:'Q: Same?\nA: First.\nQ: Same?\nA: Second.'}),/Repeated question/);
  assert.equal(db.requirements.length,0);
});

test('cannot link a question to lecture notes from a different course',()=>{
  const {db,course}=fixture(),other=C.addCourse(db,'Chemistry');
  const source=C.addSource(db,{courseId:other.id,title:'Electrochemistry',content:'Oxidation is loss of electrons.',generateDrafts:false}).source;
  assert.throws(()=>C.addRequirement(db,{courseId:course.id,sourceId:source.id,question:'What is oxidation?',answer:'Loss of electrons.'}),/same course/);
  assert.equal(db.requirements.length,0);
});

test('wording-only edits retain intervals while saving current question/answer and all previous attempts',()=>{
  const {db,course}=fixture();
  const r=C.addRequirement(db,{courseId:course.id,question:'How does osmosis work?',answer:'Water moves by osmosis.',kind:'recall'});
  const target=C.getTarget(db,r.id),activity=C.getActivities(db,r.id)[0];
  C.recordAttempt(db,{requirementId:r.id,targetId:target.id,activityId:activity.id,rating:'good',response:'Water movement'});
  const before=db.memory[target.id].dueAt;
  C.editRequirement(db,r.id,{question:'Describe how osmosis works.',answer:'Water moves by osmosis.',kind:'recall',changeType:'wording'});
  assert.equal(db.memory[target.id].dueAt,before);
  assert.equal(db.attempts.length,1);
  assert.equal(C.getActivities(db,r.id)[0].question,'Describe how osmosis works.');
  assert.equal(db.requirementVersions.length,2);
});

test('substantive Q&A revisions reset the current interval but never erase historical study',()=>{
  const {db,course}=fixture();
  const r=C.addRequirement(db,{courseId:course.id,question:'What is ATP?',answer:'The main cellular energy carrier.',kind:'recall'});
  const target=C.getTarget(db,r.id),activity=C.getActivities(db,r.id)[0];
  C.recordAttempt(db,{requirementId:r.id,targetId:target.id,activityId:activity.id,rating:'good',response:'ATP'});
  C.editRequirement(db,r.id,{question:'What is GTP?',answer:'A nucleotide involved in signalling and energy transfer.',kind:'recall',changeType:'substantive'});
  assert.equal(db.memory[target.id],undefined);
  assert.equal(db.attempts.length,1);
  assert.equal(db.attempts[0].questionSnapshot,'What is ATP?');
  assert.equal(C.getActivities(db,r.id)[0].answer,'A nucleotide involved in signalling and energy transfer.');
});

test('editing a stale manually written source-linked Q&A cannot silently approve revised notes',()=>{
  const {db,course}=fixture();
  const source=C.addSource(db,{courseId:course.id,title:'Bio Lecture',content:'A receptor binds a ligand.',generateDrafts:false}).source;
  const r=C.addRequirement(db,{courseId:course.id,sourceId:source.id,question:'What binds the ligand?',answer:'The receptor.'});
  C.reviseSource(db,source.id,{title:source.title,content:'Some ligands bind different receptors.'});
  assert.equal(r.sourceRevisionPending,true);
  C.editRequirement(db,r.id,{question:'Which protein binds a ligand?',answer:'A receptor.',kind:'recall',changeType:'wording'});
  assert.equal(r.verificationStatus,'draft');
  assert.equal(r.sourceRevisionPending,true);
  assert.equal(C.eligibleCandidates(db).length,0);
});
