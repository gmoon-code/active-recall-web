'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('./core.js');
const Rhythm=require('./study-rhythm.js');

test('Overview, Calendar and Progress render schedule-fit and study-history content without a browser',async()=>{
  const db=C.initialDb(),course=C.addCourse(db,'Chemistry');
  db.agendaPreferences={days:7,weekdayMinutes:5,weekendMinutes:5,missedDates:[]};
  for(let i=0;i<10;i++)C.addRequirement(db,{courseId:course.id,lectureTitle:'Lecture 2',
    question:`Explain reaction ${i}?`,answer:`Explanation ${i}`,kind:'explain'});
  const app={innerHTML:''};
  const inserted=[];
  const listeners={};
  const document={
    querySelector(selector){
      if(selector==='#app')return app;
      if(['#app .hero','#app .pagehead'].includes(selector))return {insertAdjacentHTML(_where,html){inserted.push(html);}};
      return null;
    },
    addEventListener(name,fn){listeners[name]=fn;},
    createElement(){return {remove(){},className:'',textContent:''};},
    body:{appendChild(){}}
  };
  const quiet={panel:()=>''};
  const store={load:async()=>({db}),save:async()=>{},storageMode:()=> 'indexeddb'};
  const window={ActiveRecallCore:C,ActiveRecallStudyRhythm:Rhythm,ActiveRecallStorage:store,
    ActiveRecallDocumentImport:{},ActiveRecallHumanReview:require('./human-review.js'),ActiveRecallPairedReview:require('./paired-review.js'),
    ActiveRecallPairedUI:{...quiet,modal:()=>''},ActiveRecallReviewPackets:{},ActiveRecallReviewPacketUI:quiet,
    ActiveRecallReferenceFirst:{},ActiveRecallReferenceFirstUI:quiet,
    ActiveRecallReviewerPilot:{},ActiveRecallPilotUI:quiet,
    ActiveRecallReviewerTraining:{},ActiveRecallReviewerTrainingUI:quiet,
    ActiveRecallReviewerUsability:{},ActiveRecallReviewerUsabilityUI:quiet};
  const context={window,document,console,setTimeout,clearTimeout,setInterval:()=>{},navigator:{},Date};
  vm.runInNewContext(fs.readFileSync('app.js','utf8'),context,{filename:'app.js'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.doesNotMatch(app.innerHTML,/class="topline"|class="footer"|class="sidefoot"/,'Study pages have no repeated decorative chrome');
  assert.match(fs.readFileSync('index.html','utf8'),/name="app-version" content="4\.37"/);
  assert.ok(inserted.some(html=>html.includes('Study Rhythm &amp; Schedule Fit')),
    'Overview displays a schedule-fit panel');
  const navigate=page=>listeners.click({target:{closest(){return {dataset:{action:'navigate',page}};}}});
  navigate('forecast');
  assert.match(app.innerHTML,/Known due \+ planned preparation/);
  assert.match(app.innerHTML,/Due work left unassigned/);
  assert.match(app.innerHTML,/Next seven days/);
  assert.match(app.innerHTML,/What if I changed my study time/);
  navigate('insights');
  assert.ok(inserted.some(html=>html.includes('Your recorded study rhythm · past seven days')),
    'Progress shows dated snapshots');
  assert.ok((db.studyPlanHistory||[]).length>=1,'Opening the app with learning material records the first plan');
  assert.equal(C.validateImport(db).schemaVersion,5);
});
