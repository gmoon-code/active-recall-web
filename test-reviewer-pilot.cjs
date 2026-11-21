'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('./core.js'),H=require('./human-review.js'),P=require('./reviewer-pilot.js'),
  F=require('./reference-first.js'),UI=require('./reviewer-pilot-ui.js');
const T=Date.parse('2027-01-11T10:00:00.000Z'),at=minutes=>new Date(T+60000*minutes);
const UUID='c3889816-be5d-444c-ae75-494cf7ec0fd7';
function fixture({n=4,kind='explain',before=false}={}){
 const db=C.initialDb(),course=C.addCourse(db,'Private Teaching Course');
 const reqs=[],targets=[],activities=[];
 for(let i=0;i<n;i++){
   const req=C.addRequirement(db,{courseId:course.id,kind,
     question:'Describe why topic '+i+' connects to a mechanism.',
     answer:'PRIVATE_REFERENCE_'+i+': the gradient establishes an energy source for the reaction.'});
   const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
   if(kind!=='recall'){
     C.addCriterion(db,{targetId:target.id,text:'Mentions the gradient and its causal role '+i+'.'});
     C.addCriterion(db,{targetId:target.id,text:'Explains how energy is transferred in the step '+i+'.'});
   }
   reqs.push(req);targets.push(target);activities.push(activity);
 }
 function attempt(i,{minute=1,response='A gradient stores potential energy and uses it to transfer energy.',
    rating='good',assisted=false,inputMode='written',practiceStage=null}={}){
   return C.recordAttempt(db,{requirementId:reqs[i].id,targetId:targets[i].id,activityId:activities[i].id,
     response,rating,assisted,inputMode,practiceStage,now:at(minute)}).attempt;
 }
 if(before)attempt(0,{minute:-10});
 return {db,course,reqs,targets,activities,attempt};
}
function start(f,n=3){return P.start(f.db,{plannedTargets:n,now:at(0),confirmed:true});}
function complete(f){
 const p=start(f);
 f.attempt(0,{minute:1,assisted:true});
 const a=f.attempt(0,{minute:2});
 f.attempt(0,{minute:3});
 f.attempt(1,{minute:4,practiceStage:'immediate_post_study'});
 const b=f.attempt(1,{minute:5});
 const c=f.attempt(2,{minute:6});
 return {p,a,b,c};
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function issuePair(f,a){
 const r=F.issue(f.db,{attemptId:a.id,now:at(7),requestId:UUID});
 const excerpts=['A gradient stores potential energy','uses it to transfer energy'];
 function findings(status2){
   return r.attempt.criteria.map((c,i)=>({criterionId:c.criterionId,criterionVersion:c.version,
     status:i===0?'included':status2,
     excerpt:i===0?excerpts[0]:status2==='included'?excerpts[1]:'',
     rationale:i===1&&status2==='not_demonstrated'?'The answer does not establish the full energy mechanism.':''}));
 }
 const A=F.createFirst(r,{slot:'A',reviewerRole:'self',findings:findings('not_demonstrated'),
   referenceUnseen:true,confirmed:true,completedAt:at(8).toISOString()});
 const B=F.createFirst(r,{slot:'B',reviewerRole:'other_person',findings:findings('included'),
   referenceUnseen:true,differentPerson:true,noPriorJudgments:true,confirmed:true,
   completedAt:at(8).toISOString()});
 F.importFirst(f.db,A,{now:at(9)});
 F.importFirst(f.db,B,{now:at(10)});
 return {r,A,B};
}
test('the pilot is an optional schema-v5 extension; no payment or cloud API',()=>{
 const f=fixture(),s=fs.readFileSync('./reviewer-pilot.js','utf8');
 assert.equal(f.db.schemaVersion,5);assert.equal(f.db.reviewerPilot,undefined);
 assert.doesNotMatch(s,/fetch\s*\(|XMLHttpRequest|https?:\/\/|Stripe|billing|OpenAI|apiKey/);
});
test('a pilot cannot be started without explicit human confirmation',()=>{
 const f=fixture();assert.throws(()=>P.start(f.db,{plannedTargets:3,now:at(0)}),/Confirm/);
});
test('planned number of distinct retrieval targets is bounded and integer',()=>{
 for(const n of [0,1,2,31,100,3.4,NaN,'6']){
   const f=fixture();
   assert.throws(()=>P.start(f.db,{plannedTargets:n,now:at(0),confirmed:true}),/3 to 30/);
 }
});
test('the protocol is locally locked before subsequent attempts and cannot be replaced',()=>{
 const f=fixture({before:true}),pilot=start(f);
 assert.equal(pilot.baselineAttemptCount,1);
 assert.equal(pilot.entries.length,0);
 assert.equal(pilot.protocol.selection,P.PROTOCOL.selection);
 assert.equal(pilot.version,1);
 assert.throws(()=>start(f),/already registered/);
});
test('one new eligible written explanation is enrolled automatically at attempt save',()=>{
 const f=fixture();const p=start(f),a=f.attempt(0);
 assert.equal(p.entries.length,1);
 assert.deepEqual(p.entries[0],{attemptId:a.id,screenedAt:a.createdAt,targetId:a.retrievalTargetId,
   originalFingerprint:P.attemptFingerprint(a),decision:'enrolled',reason:null});
 assert.equal(P.audit(f.db).enrolled,1);
});
test('historical attempts before the locally locked baseline are never selected',()=>{
 const f=fixture({before:true});const p=start(f);
 assert.equal(p.baselineAttemptCount,1);
 f.attempt(1,{minute:1});
 assert.equal(p.entries.length,1);
 assert.equal(p.entries[0].attemptId,f.db.attempts[1].id);
});
test('all future attempts are screened in creation order, including exclusions',()=>{
 const f=fixture(),{p,a,b,c}=complete(f);
 assert.equal(p.entries.length,6);
 assert.deepEqual(p.entries.map(x=>x.decision),['excluded','enrolled','excluded','excluded','enrolled','enrolled']);
 assert.deepEqual(p.entries.map(x=>x.reason),['assisted',null,'duplicate_target','immediate_post_study',null,null]);
 assert.deepEqual(p.entries.filter(x=>x.decision==='enrolled').map(x=>x.attemptId),[a.id,b.id,c.id]);
});
test('the fixed quota closes the pilot at the third distinct eligible original attempt',()=>{
 const f=fixture(),{p,c}=complete(f);
 assert.equal(p.closeReason,'target_reached');
 assert.equal(p.closedAt,c.createdAt);
 assert.equal(p.closeAfter,p.entries.length);
 assert.equal(P.audit(f.db).status,'target_reached');
});
test('attempts after fixed quota do not enter the already-closed cohort',()=>{
 const f=fixture(),{p}=complete(f);
 const before=p.entries.length;
 f.attempt(3,{minute:9});
 assert.equal(p.entries.length,before);
 assert.equal(P.validate(f.db),true);
});
test('written or mental original answers cannot be treated as written evidence',()=>{
 const f=fixture();start(f);
 f.attempt(0,{minute:1,inputMode:'mental',response:''});
 assert.equal(f.db.reviewerPilot.entries[0].reason,'not_written');
 assert.equal(P.audit(f.db).enrolled,0);
});
test('unassisted and assisted attempts are not silently pooled',()=>{
 const f=fixture();start(f);
 f.attempt(0,{minute:1,assisted:true});
 f.attempt(0,{minute:2});
 assert.deepEqual(f.db.reviewerPilot.entries.map(x=>x.decision),['excluded','enrolled']);
});
test('immediate-post-study attempts cannot be misrepresented as retrieval observations',()=>{
 const f=fixture();start(f);
 f.attempt(0,{minute:1,practiceStage:'immediate_post_study'});
 assert.equal(f.db.reviewerPilot.entries[0].reason,'immediate_post_study');
});
test('question activity must be explain/apply rather than an unrelated literal recall',()=>{
 const f=fixture({kind:'recall'});start(f);
 f.attempt(0,{minute:1});
 assert.equal(f.db.reviewerPilot.entries[0].reason,'unsupported_kind');
});
test('an attempt without contemporaneous rubric is not enrolled retrospectively',()=>{
 const f=fixture();f.db.rubricCriteria=f.db.rubricCriteria.filter(x=>x.targetId!==f.targets[0].id);
 start(f);f.attempt(0,{minute:1});
 assert.equal(f.db.reviewerPilot.entries[0].reason,'missing_original_rubric');
});
test('a browser clock that predates the local lock is transparently excluded',()=>{
 const f=fixture();start(f);
 f.attempt(0,{minute:-5});
 assert.equal(f.db.reviewerPilot.entries[0].reason,'clock_before_lock');
});
test('two attempts from the same target cannot inflate the number of topics',()=>{
 const f=fixture();start(f);
 f.attempt(0,{minute:1});f.attempt(0,{minute:2});
 assert.equal(P.audit(f.db).enrolled,1);
 assert.equal(P.audit(f.db).exclusions.duplicate_target,1);
});
test('a user cannot overwrite the protocol with an alternative sample size',()=>{
 const f=fixture(),p=start(f);
 p.plannedTargets=15;
 assert.throws(()=>P.validate(f.db),/Invalid|quota|protocol lock/);
});
test('planned quota and original scheduling records remain wholly separate',()=>{
 const f=fixture();start(f);const a=f.attempt(0,{minute:1});
 const due=f.db.memory[a.retrievalTargetId].dueAt;
 f.attempt(1,{minute:2});
 assert.equal(f.db.memory[a.retrievalTargetId].dueAt,due);
 assert.equal(f.db.attempts[0].schedulingDecision.activeDueAt,due);
});
test('early stopping requires an explicit sufficiently detailed reason',()=>{
 const f=fixture();start(f);f.attempt(0,{minute:1});
 assert.throws(()=>P.stopEarly(f.db,{now:at(2),confirmed:true,note:'done'}),/Document/);
 assert.throws(()=>P.stopEarly(f.db,{now:at(2),note:'Enough of these assessments collected.'}),/Confirm/);
});
test('early-stop deviation is recorded without discarding incomplete attempts',()=>{
 const f=fixture();start(f);f.attempt(0,{minute:1});
 const p=P.stopEarly(f.db,{now:at(2),confirmed:true,note:'Reviewer availability changed before completing the quota.'});
 assert.equal(p.closeReason,'stopped_early');
 assert.match(p.earlyStopNote,/availability/);
 assert.equal(P.audit(f.db).enrolled,1);
 assert.equal(P.validate(f.db),true);
 f.attempt(1,{minute:5});
 assert.equal(p.entries.length,1);
});
test('a stopped or quota-completed pilot cannot be reopened through the start command',()=>{
 const f=fixture();start(f);
 P.stopEarly(f.db,{now:at(1),confirmed:true,note:'No independent reviewers could be recruited.'});
 assert.throws(()=>start(f),/already registered/);
 assert.throws(()=>P.stopEarly(f.db,{now:at(2),confirmed:true,note:'Another reason documented.'}),/no open pilot/);
});
test('enrolled but unreviewed attempts have explicit missing A and B observations',()=>{
 const f=fixture();complete(f);
 const a=P.audit(f.db);
 assert.equal(a.paired,0);assert.equal(a.awaitingA,3);assert.equal(a.awaitingB,0);
 assert.equal(a.comparable,0);assert.equal(a.agreements,0);
});
test('importing original reference-free A/B creates descriptive paired evidence only',()=>{
 const f=fixture(),{a}=complete(f);issuePair(f,a);
 const x=P.audit(f.db);
 assert.equal(x.enrolled,3);assert.equal(x.paired,1);
 assert.equal(x.awaitingA,2);assert.equal(x.awaitingB,0);
 assert.equal(x.comparable,2);assert.equal(x.agreements,1);assert.equal(x.disagreements,1);
});
test('missing post-reference reviews remain missing, never scored as incorrect',()=>{
 const f=fixture(),{a}=complete(f);issuePair(f,a);
 const x=P.audit(f.db);
 assert.equal(x.noPostA,1);assert.equal(x.noPostB,1);
 assert.equal(x.postA,0);assert.equal(x.postB,0);
});
test('the pilot audit never displays an unsupported percent agreement or mastery',()=>{
 const f=fixture(),{a}=complete(f);issuePair(f,a);
 const x=P.audit(f.db);
 assert.equal('agreementShare' in x,false);
 assert.match(x.warning,/not zero scores/);
});
test('CSV includes all enrolled rubric rows and screened exclusions',()=>{
 const f=fixture();complete(f);
 const csv=P.exportCSV(f.db),lines=csv.trim().split(/\r?\n/);
 assert.equal(lines.length,1+2*3+3);
 assert.match(lines[0],/exclusion_reason,A_first,B_first/);
 assert.match(csv,/assisted/);assert.match(csv,/duplicate_target/);assert.match(csv,/immediate_post_study/);
});
test('CSV reports original A/B and missing post stages without filling zeros',()=>{
 const f=fixture(),{a}=complete(f);issuePair(f,a);
 const lines=P.exportCSV(f.db).split(/\r?\n/).filter(Boolean);
 const row=lines.find(x=>x.includes(',2,enrolled')&&x.includes('not_demonstrated'));
 assert.ok(row,'Expected an original criterion-level disagreement row');
 assert.match(row,/not_demonstrated,included,missing,missing/);
 assert.match(lines.join('\n'),/missing,missing/);
});
test('CSV contains no original question, written answer, reference, course name or internal IDs',()=>{
 const f=fixture(),{a}=complete(f);issuePair(f,a);
 const csv=P.exportCSV(f.db);
 assert.doesNotMatch(csv,/Private Teaching Course|PRIVATE_REFERENCE|gradient stores potential|topic 0/);
 assert.ok(!csv.includes(a.id));
 assert.ok(!csv.includes(f.course.id));
 assert.ok(!csv.includes(a.createdAt));
});
test('CSV does not copy user-controlled text that could be executed as a spreadsheet formula',()=>{
 const f=fixture(),p=start(f);
 f.reqs[0].question='=HYPERLINK("https://not-safe.example")';
 f.attempt(0,{minute:1});
 const csv=P.exportCSV(f.db);
 assert.doesNotMatch(csv,/HYPERLINK|https?:\/\//i);
 assert.match(csv,/enrolled/);
});
test('protocol summary JSON excludes raw answers, reviewer notes and early-stop free text',()=>{
 const f=fixture();start(f);f.attempt(0,{minute:1});
 P.stopEarly(f.db,{now:at(2),confirmed:true,note:'PERSONAL_FREE_TEXT_KEEP_ONLY_LOCAL'});
 const manifest=P.exportManifest(f.db),s=JSON.stringify(manifest);
 assert.equal(manifest.format,'arw-reviewer-pilot-summary-v1');
 assert.equal(manifest.earlyStopDocumented,true);
 assert.ok(!s.includes('PERSONAL_FREE_TEXT_KEEP_ONLY_LOCAL'));
 assert.ok(!s.includes(f.db.attempts[0].response));
 assert.equal(manifest.reportedCounts.rows,undefined);
});
test('previous v4.4 schema-v5 backups with no pilot extension still import',()=>{
 const f=fixture();
 assert.equal(C.validateImport(clone(f.db)).schemaVersion,5);
 assert.equal(P.validate(f.db),true);
});
test('full pilot history and reviewer evidence survive backup round trip',()=>{
 const f=fixture(),{a}=complete(f);issuePair(f,a);
 const restored=C.validateImport(clone(f.db));
 assert.equal(restored.schemaVersion,5);
 assert.equal(P.audit(restored).paired,1);
 assert.equal(P.exportCSV(restored),P.exportCSV(f.db));
});
test('backup validation catches omitted consecutive screening rows',()=>{
 const f=fixture();complete(f);const d=clone(f.db);
 d.reviewerPilot.entries.splice(1,1);
 assert.throws(()=>C.validateImport(d),/screening record|Pilot entry|close-out provenance|screening history/);
});
test('backup validation catches fabricated inclusion and exclusion changes',()=>{
 const f=fixture();complete(f);const d=clone(f.db);
 d.reviewerPilot.entries[0].decision='enrolled';d.reviewerPilot.entries[0].reason=null;
 assert.throws(()=>C.validateImport(d),/Pilot entry|screening history/);
});
test('backup validation catches reordering to selectively keep the most favourable answer',()=>{
 const f=fixture();complete(f);const d=clone(f.db);
 [d.reviewerPilot.entries[0],d.reviewerPilot.entries[1]]=[d.reviewerPilot.entries[1],d.reviewerPilot.entries[0]];
 assert.throws(()=>C.validateImport(d),/Pilot entry|screening history/);
});
test('backup validation rejects altered original written evidence after pilot registration',()=>{
 const f=fixture();complete(f);const d=clone(f.db);
 d.attempts[1].response='New retrospective fabricated writing';
 assert.throws(()=>C.validateImport(d),/Pilot entry|screening history/);
});
test('backup validation rejects a forged protocol version or sampling rule',()=>{
 const f=fixture();complete(f);const d=clone(f.db);
 d.reviewerPilot.protocol.selection='favourable-attempts-only';
 assert.throws(()=>C.validateImport(d),/Invalid locked pilot protocol/);
});
test('backup validation rejects a forged early-stop note and premature quota closure',()=>{
 const f=fixture();complete(f);const d=clone(f.db);
 d.reviewerPilot.closeReason='stopped_early';
 d.reviewerPilot.earlyStopNote='This stop is fabricated after the fact.';
 assert.throws(()=>C.validateImport(d),/Early stop cannot replace quota completion|close-out event/);
});
test('future attempts on closed pilot stay outside sample and older records still validate',()=>{
 const f=fixture();complete(f);f.attempt(3,{minute:20});
 assert.equal(P.validate(f.db),true);assert.equal(C.validateImport(clone(f.db)).schemaVersion,5);
});
test('owner UI includes explicit inclusion rules, export controls and missingness',()=>{
 const f=fixture(),pre=UI.panel({db:f.db,esc:String,courseName:()=> 'Course'});
 assert.match(pre,/start-reviewer-pilot/);
 assert.match(pre,/consecutive|prospective|fixed/i);
 start(f);f.attempt(0);
 const on=UI.panel({db:f.db,esc:String,courseName:()=> 'Course'});
 assert.match(on,/export-reviewer-pilot-csv/);
 assert.match(on,/export-reviewer-pilot-protocol/);
 assert.match(on,/missing/);
});
test('static delivery includes pilot module before core and UI before app',()=>{
 const html=fs.readFileSync('./index.html','utf8'),
  sw=fs.readFileSync('./sw.js','utf8'),
  core=fs.readFileSync('./core.js','utf8'),
  app=fs.readFileSync('./app.js','utf8');
 assert.ok(html.indexOf('reviewer-pilot.js')<html.indexOf('core.js'));
 assert.ok(html.indexOf('reviewer-pilot-ui.js')<html.indexOf('app.js'));
 assert.match(sw,/active-recall-web-v4-44/);
 assert.match(core,/Pilot\.observe\(db,attempt\)/);
 assert.match(core,/Pilot\.validate\(input\)/);
 assert.match(app,/case 'export-reviewer-pilot-csv'/);
});
