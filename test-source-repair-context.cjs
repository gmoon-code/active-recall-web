'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');

function fixture({withQuote=true}={}){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const original='INTRODUCTION\nLight reactions create ATP.\nCarbon dioxide supplies carbon in sugars.\nSUMMARY';
  const {source}=C.addSource(db,{courseId:course.id,title:'Photosynthesis lecture',content:original,generateDrafts:false});
  const quote='Carbon dioxide supplies carbon in sugars.';
  const req=C.addRequirement(db,{courseId:course.id,sourceId:source.id,question:'What supplies the carbon?',answer:'Carbon dioxide.',kind:'recall',
    ...(withQuote?{sourceQuote:quote,sourceStart:original.indexOf(quote),sourceEnd:original.indexOf(quote)+quote.length}:{})});
  C.recordAttempt(db,{requirementId:req.id,rating:'good',response:req.answer,now:new Date(Date.now()-7*86400000)});
  C.holdQuestionForCorrection(db,req.id);
  return {db,req,source,original,quote};
}
const history=db=>({memory:JSON.stringify(db.memory),attempts:JSON.stringify(db.attempts),events:JSON.stringify(db.events),holds:JSON.stringify(db.requirements.map(r=>r.studyHold))});

test('locates a verbatim linked passage only at its original character offset',()=>{
  const f=fixture(),before=history(f.db),c=C.questionRepairSourceContext(f.db,f.req.id,{radius:12});
  assert.equal(c.status,'linked');assert.equal(c.exactQuote,true);
  assert.equal(c.passageQuote,f.quote);assert.equal(c.passageBefore,f.original.slice(f.original.indexOf(f.quote)-12,f.original.indexOf(f.quote)));
  assert.equal(c.passageAfter,'\nSUMMARY'.slice(0,12));
  assert.equal(c.linkedVersion,1);assert.equal(c.currentVersion,1);assert.equal(c.revised,false);
  assert.deepEqual(history(f.db),before,'Inspecting a quote must be read-only');
  const unchangedBackup=C.validateImport(JSON.parse(JSON.stringify(f.db)));assert.equal(unchangedBackup.schemaVersion,5);
});

test('a question linked to notes without an anchored quote receives a clearly unverified preview',()=>{
  const f=fixture({withQuote:false}),c=C.questionRepairSourceContext(f.db,f.req.id);
  assert.equal(c.exactQuote,false);assert.equal(c.sourceQuote,'');
  assert.equal(c.openingPreview,f.original);assert.equal(c.passageQuote,'');
});

test('an offset mismatch cannot be presented as an exact source match',()=>{
  const f=fixture();f.req.sourceStart=0;
  const c=C.questionRepairSourceContext(f.db,f.req.id);
  assert.equal(c.exactQuote,false);assert.equal(c.passageQuote,'');
  assert.equal(c.sourceQuote,f.quote);
  assert.equal(c.openingPreview,f.original);
});

test('a revised lecture retains the historical passage and exposes the current version separately',()=>{
  const f=fixture(),before=JSON.stringify(f.db.memory),updated='REVISED LECTURE\nOxygen gas is released from water, not carbon dioxide.';
  C.reviseSource(f.db,f.source.id,{title:'Photosynthesis lecture revised',content:updated});
  const c=C.questionRepairSourceContext(f.db,f.req.id);
  assert.equal(c.revised,true);assert.equal(c.linkedVersion,1);assert.equal(c.currentVersion,2);
  assert.equal(c.linkedTitle,'Photosynthesis lecture');assert.equal(c.currentTitle,'Photosynthesis lecture revised');
  assert.equal(c.linkedContent,f.original);assert.equal(c.currentContent,updated);
  assert.equal(c.exactQuote,true,'Original excerpt must be checked against the historical version');
  assert.equal(JSON.stringify(f.db.memory),before);
  assert.ok(f.req.studyHold&&f.req.sourceRevisionPending,'No implicit quality approval or release');
});

test('an unavailable historical version is not silently replaced by newer notes',()=>{
  const f=fixture();C.reviseSource(f.db,f.source.id,{title:'Updated',content:'New source'});
  f.db.sourceVersions=f.db.sourceVersions.filter(v=>v.version!==1);
  const c=C.questionRepairSourceContext(f.db,f.req.id);
  assert.equal(c.linkedContent,null);assert.equal(c.exactQuote,false);
  assert.equal(c.openingPreview,'');assert.equal(c.currentContent,'New source');
  f.db.sources=[];
  assert.equal(C.questionRepairSourceContext(f.db,f.req.id).status,'source_unavailable');
});

test('unlinked questions are explicit and deleted/unknown questions cannot retrieve context',()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Chemistry');
  const r=C.addRequirement(db,{courseId:course.id,question:'What is a catalyst?',answer:'Speeds a reaction.',kind:'recall'});
  assert.deepEqual(C.questionRepairSourceContext(db,r.id),{status:'unlinked'});
  C.archiveRequirements(db,[r.id]);
  assert.throws(()=>C.questionRepairSourceContext(db,r.id),/Active question not found/);
  assert.throws(()=>C.questionRepairSourceContext(db,'unknown'),/Active question not found/);
});
