'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('./core.js'),Rh=require('./study-rhythm.js');

test('failed browser backup persistence does not replace the working notebook or claim success',async()=>{
  const original=C.initialDb(),originalCourse=C.addCourse(original,'Original course');
  C.addRequirement(original,{courseId:originalCourse.id,kind:'recall',question:'Original question?',answer:'Original answer.'});
  const replacement=C.initialDb(),newCourse=C.addCourse(replacement,'Replacement course');
  C.addRequirement(replacement,{courseId:newCourse.id,kind:'recall',question:'Replacement question?',answer:'Replacement answer.'});
  const messages=[],listeners={},app={innerHTML:''};
  let failImport=true,allowImport=true,lastSaved=null;
  const document={
    querySelector(selector){return selector==='#app'?app:null;},
    addEventListener(name,fn){(listeners[name]??=[]).push(fn);},
    createElement(){return {remove(){},className:'',textContent:''};},
    body:{appendChild(node){messages.push(node);}}
  };
  const store={load:async()=>({db:original}),storageMode:()=> 'indexeddb',
    save:async(db,sessionId)=>{
      if(failImport&&db.courses.some(c=>c.name==='Replacement course'))throw Error('Disk quota exceeded');
      lastSaved={db,sessionId};
    }};
  const quiet={panel:()=>''};
  const window={confirm:()=>allowImport,ActiveRecallCore:C,ActiveRecallStudyRhythm:Rh,ActiveRecallStorage:store,
    ActiveRecallDocumentImport:{},ActiveRecallHumanReview:require('./human-review.js'),
    ActiveRecallPairedReview:require('./paired-review.js'),ActiveRecallPairedUI:{...quiet,modal:()=>''},
    ActiveRecallReviewPackets:{},ActiveRecallReviewPacketUI:quiet,ActiveRecallReferenceFirst:{},
    ActiveRecallReferenceFirstUI:quiet,ActiveRecallReviewerPilot:{},ActiveRecallPilotUI:quiet,
    ActiveRecallReviewerTraining:{},ActiveRecallReviewerTrainingUI:quiet,
    ActiveRecallReviewerUsability:{},ActiveRecallReviewerUsabilityUI:quiet};
  class FakeFileReader{readAsText(file){this.result=file.text;Promise.resolve().then(()=>this.onload());}}
  vm.runInNewContext(fs.readFileSync('app.js','utf8'),
    {window,document,FileReader:FakeFileReader,console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>{},navigator:{},Date},
    {filename:'app.js'});
  await new Promise(resolve=>setImmediate(resolve));
  const originalMemory=JSON.stringify(original.memory);
  const input={id:'import-file',value:'fictional-backup.json',files:[{text:JSON.stringify(replacement)}],matches:selector=>selector==='#import-file'};
  const change=()=>listeners.change.forEach(fn=>fn({target:input}));
  change();await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.innerHTML,/Original question\?/);
  assert.doesNotMatch(app.innerHTML,/Replacement question\?/);
  assert.match(messages.at(-1).textContent,/Backup not imported: Disk quota exceeded/);
  assert.equal(input.value,'','Failed imports allow retrying the same file');
  assert.equal(JSON.stringify(original.memory),originalMemory);
  assert.equal(lastSaved?.db,original,'Failed import cannot mark replacement as successfully saved');

  failImport=false;
  allowImport=false;
  input.value='fictional-backup.json';
  change();await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.innerHTML,/Original question\?/);
  assert.equal(lastSaved.db,original,'Declining overwrite never replaces saved data');
  assert.equal(input.value,'','A declined import can be reselected later');

  allowImport=true;
  change();await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.innerHTML,/Replacement question\?/);
  assert.equal(lastSaved.db.courses[0].name,'Replacement course',
    'Committed import becomes the active notebook');
  assert.equal(lastSaved.db.requirements[0].question,'Replacement question?');
  assert.equal(lastSaved.sessionId,null,'Restoring a backup does not invent an active session');
  assert.equal(messages.at(-1).textContent,'Backup imported.');
  assert.equal(replacement.attempts.length,0,'Import must never manufacture a recall attempt');
});
