'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const I=require('./intelligence.js');
const C=require('./core.js');

const confirmed=[true,true,true,true];
function fixture(content='ATP synthase produces ATP only when a proton gradient is present.') {
  const db=C.initialDb(),course=C.addCourse(db,'Source-backed biology');
  const result=C.addSource(db,{courseId:course.id,title:'Molecular biology',content});
  const req=db.requirements.find(r=>r.sourceId===result.source.id);
  return {db,course,source:result.source,req};
}

test('source-first necessary-condition proposal retains exact evidence and does not claim sufficiency',()=>{
  const content='ATP synthase produces ATP only when a proton gradient is present.';
  const p=I.questionProposals(content).find(x=>x.structure==='necessary_condition');
  assert.ok(p);
  assert.match(p.question,/necessary/);
  assert.equal(p.sourceQuote,content);
  assert.equal(content.slice(p.sourceStart,p.sourceEnd),content);
  assert.equal(p.answer,content);
  assert.doesNotMatch(p.question,/sufficient/i);
});
test('exception template asks about the stated exception without fabricating a consequence',()=>{
  const content='The reaction continues unless the temperature falls below zero.';
  const p=I.questionProposals(content).find(x=>x.structure==='exception');
  assert.ok(p);
  assert.match(p.question,/exception/);
  assert.equal(p.answer,content);
});
test('source-qualified paraphrase prompts human review without a semantic wrong-answer claim',()=>{
  const source={content:'ATP synthase produces ATP only when a proton gradient is present.'};
  const req={active:true,origin:'manual',verificationStatus:'verified',sourceQuote:source.content,
    question:'What is required for ATP production by ATP synthase?',answer:'A proton gradient is present.',kind:'explain'};
  const audit=I.questionQualityAudit(req,source,[]);
  assert.ok(audit.issues.some(x=>x.code==='qualifier_check'));
  assert.ok(audit.issues.some(x=>x.code==='paraphrase_check'));
  assert.ok(audit.issues.some(x=>x.code==='rubric_check'));
  assert.match(audit.warning,/No automatic semantic grading/);
});
test('verbatim source answer does not trigger missing qualifier or paraphrase warnings',()=>{
  const f=fixture();
  const report=C.questionQualityAudit(f.db,f.req.id);
  assert.equal(report.sourceCurrent,true);
  assert.ok(!report.issues.some(x=>['qualifier_check','paraphrase_check'].includes(x.code)));
  assert.equal(report.currentReview,false);
});
test('context-dependent and vague prompts remain visible as structural warnings',()=>{
  const req={active:true,origin:'manual',question:'What does this note claim?',answer:'Something happens.',kind:'recall'};
  const report=I.questionQualityAudit(req);
  assert.ok(report.issues.some(x=>x.code==='context_dependent'));
});
test('explicit four-step confirmation is mandatory',()=>{
  const f=fixture();
  assert.throws(()=>C.confirmQuestionQuality(f.db,f.req.id,[true,true,false,true]),/all four/);
  assert.throws(()=>C.confirmQuestionQuality(f.db,f.req.id,['true',true,true,true]),/all four/);
  assert.throws(()=>C.confirmQuestionQuality(f.db,f.req.id,[]),/all four/);
  assert.equal(f.req.verificationStatus,'draft');
});
test('editing an unverified generated question cannot silently bypass quality review',()=>{
  const f=fixture(),target=C.getTarget(f.db,f.req.id);
  C.editRequirement(f.db,f.req.id,{question:'What must be present for ATP synthase to produce ATP?',
    answer:f.req.answer,kind:'explain',objective:'Explain necessary condition',changeType:'wording'});
  assert.equal(f.req.verificationStatus,'draft');
  assert.equal(f.req.verifiedAt,null);
  assert.ok(!C.eligibleCandidates(f.db).some(x=>x.target.id===target.id));
  C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  assert.equal(f.req.verificationStatus,'verified');
});
test('confirmation approves a source-backed draft and records a human decision',()=>{
  const f=fixture(),before=JSON.stringify(f.db.memory),attempts=f.db.attempts.length;
  const result=C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  assert.equal(result.verifiedNow,true);
  assert.equal(f.req.verificationStatus,'verified');
  assert.equal(C.questionQualityAudit(f.db,f.req.id).currentReview,true);
  assert.equal(f.db.events.at(-1).type,'question_quality.reviewed');
  assert.equal(f.db.events.at(-1).requirementVersion,f.req.version);
  assert.equal(JSON.stringify(f.db.memory),before);
  assert.equal(f.db.attempts.length,attempts);
});
test('quality review of an already verified question never re-dates a memory interval',()=>{
  const f=fixture();C.verifyRequirement(f.db,f.req.id);
  const target=C.getTarget(f.db,f.req.id),activity=C.getActivities(f.db,f.req.id)[0];
  const now=new Date('2026-11-14T11:00:00.000Z');
  C.recordAttempt(f.db,{requirementId:f.req.id,targetId:target.id,activityId:activity.id,
    response:'The proton gradient supports ATP synthase.',rating:'good',now});
  const before=JSON.stringify(f.db.memory),attempt=JSON.stringify(f.db.attempts);
  const result=C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  assert.equal(result.verifiedNow,false);
  assert.equal(JSON.stringify(f.db.memory),before);
  assert.equal(JSON.stringify(f.db.attempts),attempt);
});
test('review is invalidated for reporting after a genuine question version change',()=>{
  const f=fixture();C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  C.editRequirement(f.db,f.req.id,{question:'Which condition is required for ATP synthase to produce ATP?',
    answer:f.req.answer,kind:'explain',objective:'Explain ATP synthase conditions',changeType:'wording'});
  assert.equal(C.questionQualityAudit(f.db,f.req.id).currentReview,false);
});
test('revised source without matching excerpt cannot be quality-approved',()=>{
  const f=fixture();C.reviseSource(f.db,f.source.id,{title:f.source.title,
    content:'A revised account that no longer includes the original necessary condition.'});
  assert.equal(C.questionQualityAudit(f.db,f.req.id).sourceCurrent,false);
  assert.throws(()=>C.confirmQuestionQuality(f.db,f.req.id,confirmed),/source excerpt is missing or changed/);
});
test('a preserved excerpt can be rechecked against a newer source version',()=>{
  const f=fixture();C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  const previous=f.req.sourceVersion;
  C.reviseSource(f.db,f.source.id,{title:f.source.title,
    content:f.source.content+'\nA second unrelated statement appears in the revised source.'});
  assert.equal(C.questionQualityAudit(f.db,f.req.id).currentReview,false);
  assert.equal(C.questionQualityAudit(f.db,f.req.id).sourceCurrent,true);
  C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  assert.ok(f.req.sourceVersion>previous);
  assert.equal(C.questionQualityAudit(f.db,f.req.id).currentReview,true);
});
test('schema-v5 JSON backup remains importable after quality reviews',()=>{
  const f=fixture();C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  const restored=C.validateImport(JSON.parse(JSON.stringify(f.db)));
  assert.equal(restored.schemaVersion,5);
  assert.equal(C.questionQualityAudit(restored,f.req.id).currentReview,true);
});
test('backup rejects malformed or invented question-quality confirmation records',()=>{
  const f=fixture();C.confirmQuestionQuality(f.db,f.req.id,confirmed);
  const bad=JSON.parse(JSON.stringify(f.db));
  bad.events.at(-1).checklistVersion=999;
  assert.throws(()=>C.validateImport(bad),/Invalid historical human question-quality review/);
  const invented=JSON.parse(JSON.stringify(f.db));
  invented.events.at(-1).requirementVersion=999;
  assert.throws(()=>C.validateImport(invented),/Invalid historical human question-quality review/);
});
test('manual questions can be reviewed without invented source support',()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Manual');
  const req=C.addRequirement(db,{courseId:course.id,question:'What is meiosis?',answer:'A reduction division.',kind:'recall'});
  const report=C.questionQualityAudit(db,req.id);
  assert.equal(report.sourceLinked,false);
  assert.equal(report.sourceCurrent,true);
  assert.equal(C.confirmQuestionQuality(db,req.id,confirmed).verifiedNow,false);
});
