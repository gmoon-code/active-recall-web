'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('./core.js'),Rh=require('./study-rhythm.js');

test('one-click Overview study and simple Study Now entry preserve real memory evidence',async()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What makes ATP?',answer:'ATP synthase.'});
  const app={innerHTML:''},listeners={};
  const document={
    querySelector(selector){return selector==='#app'?app:null;},
    addEventListener(name,fn){listeners[name]=fn;},
    createElement(){return {remove(){},className:'',textContent:''};},
    body:{appendChild(){}}
  };
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
    {window,document,console,setTimeout,clearTimeout,setInterval:()=>{},navigator:{},Date},
    {filename:'app.js'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.innerHTML,/<div class="hero">[\s\S]*?data-action="start-session"[^>]*>Study now · 25 min</);
  const memoryBefore=JSON.stringify(db.memory),attemptsBefore=db.attempts.length;
  const click=(action,page)=>listeners.click({target:{closest(){return {dataset:{action,page}};}}});
  click('navigate','study');
  const simple=app.innerHTML;
  assert.match(simple,/How much time do you have\?/);
  assert.match(simple,/data-action="start-session"[^>]*>Start studying · 25 min/);
  assert.match(simple,/<details id="study-plan-details"[^>]*>/);
  assert.match(simple,/<details id="study-more-options"[^>]*>/);
  assert.doesNotMatch(simple,/<details id="study-more-options"[^>]*\bopen\b/,
    'Advanced scheduling controls are hidden on first visit');
  assert.ok(simple.indexOf('Start studying · 25 min')<simple.indexOf('study-more-options'),
    'The primary study action precedes technical options');
  click('navigate','home');
  click('start-session');
  assert.match(app.innerHTML,/Your study session/);
  assert.match(app.innerHTML,/What makes ATP\?/);
  assert.equal(db.sessions.length,1);
  assert.equal(db.sessions[0].status,'active');
  assert.equal(db.attempts.length,attemptsBefore,'Starting does not fabricate an answer');
  assert.equal(JSON.stringify(db.memory),memoryBefore,'Starting does not change spaced-review dates');
  click('navigate','home');
  assert.match(app.innerHTML,/data-action="navigate" data-page="study"[^>]*>Continue studying/);
  click('navigate','study');
  assert.equal(db.sessions.length,1,'Returning to an active session must never create a duplicate');
});
