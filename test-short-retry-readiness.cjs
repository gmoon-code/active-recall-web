'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('./core.js'),Rh=require('./study-rhythm.js');

function setup(now=new Date('2026-11-20T12:15:00Z')){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What is ATP synthase?',answer:'An enzyme.'});
  const target=C.getTarget(db,req.id);
  C.recordAttempt(db,{requirementId:req.id,targetId:target.id,response:'Not sure',rating:'again',
    now:new Date(now.getTime()-15*60000)});
  return {db,course,req,target};
}

test('hourly Again retry is not offered early by Study Now although calendar lists today',()=>{
  const now=new Date('2026-11-20T12:15:00Z'),{db,target}=setup(now),before=JSON.stringify(db);
  const m=db.memory[target.id];
  assert.equal(m.intervalDays,1/24);
  assert.equal(m.dueAt,'2026-11-20T13:00:00.000Z');
  assert.equal(C.eligibleCandidates(db,now).length,1,'the target still exists in the calendar pool');
  assert.equal(C.planActivities(db,25,[],{},now).items.length,0,'mixed queue respects the hour');
  assert.equal(C.planDueReviews(db,25,[],{},now).items.length,0);
  assert.equal(C.inspectStudyPriorities(db,{minutes:25,now}).eligible.total,0,
    'optional priority preview must match the actual session pool');
  assert.deepEqual(C.shortRetryWait(db,now),{
    count:1,nextReadyAt:'2026-11-20T13:00:00.000Z',minutesRemaining:45});
  const agenda=C.buildReviewAgenda(db,{start:now,days:7,weekdayMinutes:25,weekendMinutes:25});
  assert.ok(agenda.days[0].activities.some(x=>x.targetId===target.id),
    'calendar may plan a later opportunity on the same calendar date');
  assert.equal(JSON.stringify(db),before,'inspection and timing guards must be read-only');
});

test('a due hour becomes eligible exactly on time; new material remains available while waiting',()=>{
  const now=new Date('2026-11-20T12:15:00Z'),{db,course,target}=setup(now);
  const next=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What is ATP?',answer:'A nucleotide.'});
  const ready=C.planActivities(db,25,[],{},now).items;
  assert.ok(ready.some(x=>x.req.id===next.id),'new material can fill the time');
  assert.ok(ready.every(x=>x.target.id!==target.id));
  const due=new Date('2026-11-20T13:00:00Z');
  assert.equal(C.shortRetryWait(db,due),null);
  assert.ok(C.planActivities(db,25,[],{},due).items.some(x=>x.target.id===target.id));
  assert.ok(C.planDueReviews(db,25,[],{},due).items.some(x=>x.target.id===target.id));
});

test('short retry across midnight is withheld only until its exact due instant',()=>{
  const now=new Date('2026-11-20T23:50:00Z'),{db,target}=setup(now);
  assert.equal(db.memory[target.id].dueAt,'2026-11-21T00:35:00.000Z');
  assert.equal(C.shortRetryWait(db,now).minutesRemaining,45);
  assert.equal(C.planActivities(db,25,[],{},now).items.length,0);
  assert.ok(C.planActivities(db,25,[],{},new Date('2026-11-21T00:35:00Z')).items
    .some(x=>x.target.id===target.id));
});

test('the simple Overview and Study Now explain waiting, disable starting, and create no attempt',async()=>{
  const {db}=setup(new Date(Date.now()-45*60000+3000)),oldMemory=JSON.stringify(db.memory),oldAttempts=db.attempts.length;
  const app={innerHTML:''},listeners={};let tick=null;
  const document={querySelector:s=>s==='#app'?app:null,
    addEventListener:(name,fn)=>{listeners[name]=fn;},
    createElement:()=>({remove(){},className:'',textContent:''}),body:{appendChild(){}}};
  const store={load:async()=>({db}),save:async()=>{},storageMode:()=> 'indexeddb'};
  const quiet={panel:()=>''};
  const window={ActiveRecallCore:C,ActiveRecallStudyRhythm:Rh,ActiveRecallStorage:store,
    ActiveRecallDocumentImport:{},ActiveRecallHumanReview:require('./human-review.js'),
    ActiveRecallPairedReview:require('./paired-review.js'),ActiveRecallPairedUI:{...quiet,modal:()=>''},
    ActiveRecallReviewPackets:{},ActiveRecallReviewPacketUI:quiet,
    ActiveRecallReferenceFirst:{},ActiveRecallReferenceFirstUI:quiet,
    ActiveRecallReviewerPilot:{},ActiveRecallPilotUI:quiet,
    ActiveRecallReviewerTraining:{},ActiveRecallReviewerTrainingUI:quiet,
    ActiveRecallReviewerUsability:{},ActiveRecallReviewerUsabilityUI:quiet};
  vm.runInNewContext(fs.readFileSync('app.js','utf8'),
    {window,document,console,setTimeout,clearTimeout,setInterval:fn=>{tick=fn;},navigator:{},Date},
    {filename:'app.js'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.innerHTML,/waiting for its next retry in about \d+ minutes?/);
  assert.match(app.innerHTML,/Study now · 25 min<\/button>/);
  assert.match(app.innerHTML,/data-action="start-session" disabled>Study now/);
  listeners.click({target:{closest(){return {dataset:{action:'navigate',page:'study'}};}}});
  assert.match(app.innerHTML,/A question you rated Again is waiting for its retry/);
  assert.match(app.innerHTML,/data-action="start-session" disabled>Start studying/);
  assert.equal(db.sessions.length,0);
  assert.equal(db.attempts.length,oldAttempts);
  assert.equal(JSON.stringify(db.memory),oldMemory);
  await new Promise(resolve=>setTimeout(resolve,3300));
  tick();
  assert.match(app.innerHTML,/data-action="start-session"\s*>Start studying/,
    'the visible button wakes automatically when the exact stored due time arrives');
  assert.equal(db.attempts.length,oldAttempts,'waking does not invent a review');
  assert.equal(JSON.stringify(db.memory),oldMemory);
});
