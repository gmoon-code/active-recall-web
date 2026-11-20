'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');
const fs=require('node:fs'),vm=require('node:vm'),Rh=require('./study-rhythm.js');

function fixture(at=new Date('2026-11-20T12:00:00Z')){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What drives ATP synthase?',answer:'Proton gradient.'});
  const other=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What carries electrons?',answer:'NADH.'});
  const target=C.getTarget(db,req.id).id;
  const se={id:'long-session',status:'active',paused:false,queueMode:'mixed',completedIds:[],
    skippedIds:[],currentReqId:req.id,currentTargetId:target,courseCounts:{}};
  db.sessions.push(se);
  C.recordAttempt(db,{requirementId:req.id,targetId:target,rating:'again',response:'I forgot',sessionId:se.id,now:at});
  se.completedIds.push(target);
  return {db,se,req,other,target,at};
}

test('Again is not repeated early in a session, but reenters exactly at the one-hour due instant',()=>{
  const {db,se,target,at,other}=fixture();
  const before=JSON.stringify(db),early=new Date(at.getTime()+59*60000),due=new Date(at.getTime()+60*60000);
  const earlyExcluded=C.sessionExclusions(db,se,early);
  assert.ok(earlyExcluded.includes(target));
  assert.ok(!C.planActivities(db,25,earlyExcluded,{},early).items.some(x=>x.target.id===target));
  assert.ok(C.planActivities(db,25,earlyExcluded,{},early).items.some(x=>x.req.id===other.id));
  assert.ok(!C.sessionExclusions(db,se,due).includes(target));
  assert.ok(C.planActivities(db,25,C.sessionExclusions(db,se,due),{},due).items.some(x=>x.target.id===target));
  assert.equal(JSON.stringify(db),before,'selecting the due repeat must not manufacture a rating or change the saved hour');
});

test('due-only and midnight session repeats follow the same precise due time',()=>{
  const at=new Date('2026-11-20T23:15:00Z'),{db,se,target}=fixture(at);
  se.queueMode='due_only';
  const before=new Date('2026-11-21T00:14:59Z'),atDue=new Date('2026-11-21T00:15:00Z');
  assert.equal(C.planDueReviews(db,25,C.sessionExclusions(db,se,before),{},before).items.length,0);
  assert.deepEqual(C.planDueReviews(db,25,C.sessionExclusions(db,se,atDue),{},atDue).items.map(x=>x.target.id),[target]);
});

test('Good, other-session attempts, changed memory and a second rating cannot unlock a repeated target',()=>{
  const {db,se,req,target,at}=fixture();const due=new Date(at.getTime()+3600000);
  C.recordAttempt(db,{requirementId:req.id,targetId:target,rating:'good',response:'proton gradient',sessionId:se.id,now:due});
  assert.ok(C.sessionExclusions(db,se,new Date(due.getTime()+1)).includes(target));
  C.recordAttempt(db,{requirementId:req.id,targetId:target,rating:'again',response:'forgot again',sessionId:'another-session',now:due});
  assert.ok(C.sessionExclusions(db,se,new Date(due.getTime()+3600000)).includes(target));
  const old=fixture();old.db.memory[old.target].lastReviewedAt='1999-01-01T00:00:00.000Z';
  assert.ok(C.sessionExclusions(old.db,old.se,new Date(old.at.getTime()+3600000)).includes(old.target));
});

test('a second real Again rating starts a fresh full-hour wait, with both attempts preserved',()=>{
  const {db,se,req,target,at}=fixture(),second=new Date(at.getTime()+3600000);
  C.recordAttempt(db,{requirementId:req.id,targetId:target,rating:'again',response:'still unsure',sessionId:se.id,now:second});
  se.completedIds.push(target);
  assert.ok(C.sessionExclusions(db,se,new Date(second.getTime()+59*60000)).includes(target));
  assert.ok(!C.sessionExclusions(db,se,new Date(second.getTime()+60*60000)).includes(target));
  assert.equal(db.attempts.length,2);
  assert.deepEqual(se.completedIds,[target,target]);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('passing over a ready retry never creates evidence or an overlapping ordinary skip',()=>{
  const at=new Date(Date.now()-3600000-5000),{db,se,target}=fixture(at);
  const memory=JSON.stringify(db.memory),attemptCount=db.attempts.length;
  assert.ok(!C.sessionExclusions(db,se).includes(target));
  assert.equal(C.skipUnratedTarget(db,se),target);
  assert.deepEqual(se.retrySkippedIds,[target]);
  assert.deepEqual(se.skippedIds,[]);
  assert.ok(C.sessionExclusions(db,se).includes(target));
  assert.equal(db.attempts.length,attemptCount);
  assert.equal(JSON.stringify(db.memory),memory);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
  assert.throws(()=>C.skipUnratedTarget(db,se),/not eligible/);
});

test('retry-skip backup validation and permanent erasure preserve historical safety rules',()=>{
  const at=new Date(Date.now()-3600000-5000),{db,se,req,target}=fixture(at);
  C.skipUnratedTarget(db,se);
  for(const value of [[target,target],['invented'],[null],{target},[]]){
    const copy=JSON.parse(JSON.stringify(db));copy.sessions[0].retrySkippedIds=value;
    if(Array.isArray(value)&&value.length===0)assert.equal(C.validateImport(copy).schemaVersion,5);
    else assert.throws(()=>C.validateImport(copy),/Invalid session retry skips/);
  }
  const overlap=JSON.parse(JSON.stringify(db));overlap.sessions[0].skippedIds=[target];
  assert.throws(()=>C.validateImport(overlap),/Invalid unrated session skips/);
  const missingCompletion=JSON.parse(JSON.stringify(db));missingCompletion.sessions[0].completedIds=[];
  assert.throws(()=>C.validateImport(missingCompletion),/Invalid session retry skips/);
  C.archiveRequirements(db,[req.id]);C.purgeArchivedRequirements(db,[req.id]);
  assert.deepEqual(db.sessions[0].retrySkippedIds,[]);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('flagging a due retry skips it without changing its existing recall history',()=>{
  const {db,se,target}=fixture(new Date(Date.now()-3600000-5000));
  const before=JSON.stringify(db.memory),count=db.attempts.length;
  assert.equal(C.holdSessionQuestionForCorrection(db,se,{reason:'unclear'}),target);
  assert.deepEqual(se.retrySkippedIds,[target]);
  assert.deepEqual(se.skippedIds,[]);
  assert.equal(db.attempts.length,count);
  assert.equal(JSON.stringify(db.memory),before);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('Study Now automatically selects a ready same-session retry after another question is skipped',async()=>{
  const {db,se,other,target}=fixture(new Date(Date.now()-3600000-5000));
  se.budgetMinutes=90;se.runningSince=Date.now()-90000;se.elapsedMs=0;
  se.currentReqId=other.id;se.currentTargetId=C.getTarget(db,other.id).id;
  se.currentActivityId=C.chooseActivity(db,other.id,se.currentTargetId).id;
  const priorAttempts=db.attempts.length,priorMemory=JSON.stringify(db.memory);
  const app={innerHTML:''},listeners={};
  const document={querySelector:s=>s==='#app'?app:
      s==='#app .sessionpanel .card-title'?{insertAdjacentHTML:(_where,html)=>{app.innerHTML+=html;}}:null,
    addEventListener:(name,fn)=>{listeners[name]=fn;},
    createElement:()=>({remove(){},className:'',textContent:''}),body:{appendChild(){}}};
  const quiet={panel:()=>''};
  const window={ActiveRecallCore:C,ActiveRecallStudyRhythm:Rh,
    ActiveRecallStorage:{load:async()=>({db,activeSessionId:se.id}),save:async()=>{},storageMode:()=> 'indexeddb'},
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
  assert.match(app.innerHTML,/What carries electrons\?/);
  listeners.click({target:{closest(){return {dataset:{action:'skip-question'}};}}});
  assert.equal(se.currentTargetId,target);
  assert.match(app.innerHTML,/What drives ATP synthase\?/);
  assert.match(app.innerHTML,/Due retry · you chose Again earlier/);
  assert.deepEqual(se.skippedIds,[C.getTarget(db,other.id).id]);
  assert.equal(db.attempts.length,priorAttempts);
  assert.equal(JSON.stringify(db.memory),priorMemory);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});
