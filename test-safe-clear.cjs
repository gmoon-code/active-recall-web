'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('./core.js'),Rh=require('./study-rhythm.js');

test('clearing local data waits for storage commit and retains the notebook on failure',async()=>{
  const original=C.initialDb(),course=C.addCourse(original,'Existing course');
  C.addRequirement(original,{courseId:course.id,kind:'recall',
    question:'What powers ATP synthase?',answer:'A proton gradient.'});
  const app={innerHTML:''},listeners={},messages=[];
  let allowed=false,pending=null;
  const document={
    querySelector(selector){return selector==='#app'?app:null;},
    addEventListener(name,fn){(listeners[name]??=[]).push(fn);},
    createElement(){return {remove(){},className:'',textContent:''};},
    body:{appendChild(node){messages.push(node);}}
  };
  const store={
    load:async()=>({db:original}),storageMode:()=> 'indexeddb',hasStorageConflict:()=>false,
    save(db,sessionId){
      if(db.courses.length)return Promise.resolve();
      return new Promise((resolve,reject)=>{pending={resolve,reject,db,sessionId};});
    }
  };
  const quiet={panel:()=>''};
  const window={confirm:()=>allowed,ActiveRecallCore:C,ActiveRecallStudyRhythm:Rh,ActiveRecallStorage:store,
    ActiveRecallDocumentImport:{},ActiveRecallHumanReview:require('./human-review.js'),
    ActiveRecallPairedReview:require('./paired-review.js'),ActiveRecallPairedUI:{...quiet,modal:()=>''},
    ActiveRecallReviewPackets:{},ActiveRecallReviewPacketUI:quiet,ActiveRecallReferenceFirst:{},
    ActiveRecallReferenceFirstUI:quiet,ActiveRecallReviewerPilot:{},ActiveRecallPilotUI:quiet,
    ActiveRecallReviewerTraining:{},ActiveRecallReviewerTrainingUI:quiet,
    ActiveRecallReviewerUsability:{},ActiveRecallReviewerUsabilityUI:quiet};
  vm.runInNewContext(fs.readFileSync('app.js','utf8'),
    {window,document,console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>{},navigator:{},Date},
    {filename:'app.js'});
  await new Promise(resolve=>setImmediate(resolve));
  const click=action=>listeners.click.forEach(fn=>fn({target:{closest:()=>({dataset:{action}})}}));
  assert.match(app.innerHTML,/What powers ATP synthase\?/);
  const before=JSON.stringify(original);

  click('reset');
  assert.equal(pending,null,'Cancelling must not start a destructive storage write');
  assert.match(app.innerHTML,/What powers ATP synthase\?/);

  allowed=true;
  click('reset');
  assert.ok(pending,'Clear must request a committed empty snapshot');
  assert.equal(pending.sessionId,null,'Clear cannot carry over an active study session');
  assert.match(app.innerHTML,/What powers ATP synthase\?/,
    'Pending writes must not make the notebook appear cleared');
  assert.ok(!messages.some(x=>/Local data cleared/.test(x.textContent)));

  click('navigate');
  assert.match(messages.at(-1).textContent,/Finishing the local data clear/);
  pending.reject(Error('Simulated disk failure'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.innerHTML,/What powers ATP synthase\?/,
    'A failed save keeps all original learning visible');
  assert.match(messages.at(-1).textContent,/Local data was not cleared: Simulated disk failure/);
  assert.equal(JSON.stringify(original),before,'Failure never mutates the original saved study history');

  pending=null;
  click('reset');
  assert.ok(pending);
  const committed=pending.db;
  pending.resolve();
  await new Promise(resolve=>setImmediate(resolve));
  assert.doesNotMatch(app.innerHTML,/What powers ATP synthase\?/);
  assert.equal(committed.courses.length,0);
  assert.equal(committed.requirements.length,0);
  assert.equal(committed.attempts.length,0);
  assert.equal(committed.schemaVersion,5,'Clear maintains the existing backup schema');
  assert.match(messages.at(-1).textContent,/Local data cleared/);
  assert.equal(JSON.stringify(original),before,'Committed clear never rewrites historical records in-place');
});
