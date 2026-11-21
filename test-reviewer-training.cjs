'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('./core.js'),T=require('./reviewer-training.js'),
  Pilot=require('./reviewer-pilot.js'),UI=require('./reviewer-training-ui.js');
const UUID='a8de48d5-5b64-4511-aa80-c1310d0443f8',T0=Date.parse('2027-03-11T10:00:00.000Z');
const at=minutes=>new Date(T0+minutes*60000),clone=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const db=C.initialDb(),req=T.start(db,{sessionId:UUID,now:at(0),confirmed:true});
 return {db,req};
}
function rows(req,{slot='A'}={}){
 const arr=[];
 req.cases.forEach((c,i)=>c.criteria.forEach((k,j)=>{
   const first=i===0&&j===0,flag=i===2&&j===2;
   arr.push({caseId:c.id,criterionId:k.id,
     status:first?(slot==='A'?'included':'uncertain'):'unassessed',
     excerpt:first&&slot==='A'?'Electron carriers move protons across the membrane':'',
     rationale:first&&slot==='B'?'The response does not state the concentration difference explicitly.':'',
     issue:flag?'vague':'none',
     issueNote:flag?'The expression complete and convincing is subjective without a specific observable mechanism.':''});
 }));
 return arr;
}
function submission(req,slot='A',more={}){
 return T.makeSubmission(req,{slot,reviewerRole:slot==='A'?'self':'other_person',
   confirmed:true,discussionUnseen:true,differentPerson:slot==='B',
   noPriorJudgments:slot==='B',judgments:rows(req,{slot}),completedAt:at(1).toISOString(),...more});
}
function importA(s,now=at(2)){return T.importSubmission(s.db,submission(s.req,'A'),{now});}
function importB(s,now=at(3)){return T.importSubmission(s.db,submission(s.req,'B'),{now});}
test('v4.6 training module is free, deterministic, local, and no semantic AI grading',()=>{
 const s=fs.readFileSync('reviewer-training.js','utf8');
 assert.doesNotMatch(s,/fetch\s*\(|XMLHttpRequest|https?:\/\/|Stripe|billing|apiKey|OpenAI/);
 assert.equal(T.KIT_ID,'synthetic-rubric-interpretation-v1');
 assert.equal(T.CASES.length,3);
 assert.equal(T.expectedRows().length,7);
});
test('all three training examples are fictitious and do not inspect actual saved attempts',()=>{
 const {db,req}=setup();
 assert.equal(db.attempts.length,0);
 assert.deepEqual(req.cases,T.CASES);
 assert.ok(!JSON.stringify(req).includes('courseId'));
 assert.equal(req.cases[2].criteria[2].id,'vague');
});
test('owner must confirm synthetic training session creation',()=>{
 const db=C.initialDb();assert.throws(()=>T.start(db,{now:at(0),sessionId:UUID}),/Confirm/);
 assert.equal(db.reviewerTraining,undefined);
});
test('training session requires valid secure request ID',()=>{
 const db=C.initialDb();
 assert.throws(()=>T.start(db,{now:at(0),confirmed:true,sessionId:'123'}),/secure training-session UUID/);
});
test('owner may re-download exact same frozen training request without new events',()=>{
 const s=setup(),count=s.db.events.length;
 assert.deepEqual(T.issued(s.db),s.req);
 assert.equal(s.db.events.length,count);
});
test('only one fixed local training cycle can be created; prior interpretations cannot be reset silently',()=>{
 const s=setup();
 assert.throws(()=>T.start(s.db,{now:at(4),sessionId:'a8de48d5-5b64-4511-aa80-c1310d0443f9',confirmed:true}),/already registered/);
});
test('training requests reject changed case descriptions, criteria and outsider examples',()=>{
 const s=setup(),d=clone(s.req);
 d.cases[0].response='A fabricated new answer.';
 assert.throws(()=>T.validateRequest(d),/frozen synthetic casebook/);
 d.cases=clone(s.req.cases);
 d.cases.push({id:'real-student',response:'private evidence'});
 assert.throws(()=>T.validateRequest(d),/frozen synthetic casebook/);
});
test('training request must have exact fields, no unrelated private study database',()=>{
 const s=setup(),req={...s.req,db:s.db};
 assert.throws(()=>T.validateRequest(req),/frozen synthetic casebook/);
});
test('A first judgment records exact original excerpt for Included status',()=>{
 const s=setup(),raw=submission(s.req);
 assert.equal(raw.judgments[0].status,'included');
 assert.equal(raw.judgments[0].excerpt,'Electron carriers move protons across the membrane');
 assert.equal(raw.discussionUnseenAttested,true);
});
test('a human can flag the intentionally vague criterion without pretending an objective grade',()=>{
 const s=setup(),x=submission(s.req);
 assert.equal(x.judgments.at(-1).issue,'vague');
 assert.match(x.judgments.at(-1).issueNote,/subjective/);
 assert.equal('correct' in x,false);
});
test('B must explicitly attest different person, no A consultation and unseen discussion',()=>{
 const s=setup();
 assert.throws(()=>submission(s.req,'B',{differentPerson:false}),/different person/);
 assert.throws(()=>submission(s.req,'B',{noPriorJudgments:false}),/different person/);
 assert.throws(()=>submission(s.req,'B',{discussionUnseen:false}),/human first judgment/);
});
test('A cannot certify human first pass without an explicit confirmation',()=>{
 const s=setup();assert.throws(()=>submission(s.req,'A',{confirmed:false}),/human first judgment/);
});
test('an arbitrary or invented quote cannot be used as literal Included evidence',()=>{
 const s=setup(),f=rows(s.req);f[0].excerpt='This quote never occurred.';
 assert.throws(()=>submission(s.req,'A',{judgments:f}),/judgment or exact excerpt/);
});
test('a missing or uncertain judgment requires a meaningful human reason',()=>{
 const s=setup(),f=rows(s.req,{slot:'B'});f[0].rationale='no';
 assert.throws(()=>submission(s.req,'B',{judgments:f}),/judgment or exact excerpt/);
});
test('a criterion must be explained if its rubric rule is flagged ambiguous',()=>{
 const s=setup(),f=rows(s.req);f.at(-1).issueNote='';
 assert.throws(()=>submission(s.req,'A',{judgments:f}),/judgment or exact excerpt/);
});
test('training file includes every original criterion even if Not assessed',()=>{
 const s=setup(),f=rows(s.req);f.pop();
 assert.throws(()=>submission(s.req,'A',{judgments:f}),/Every original training criterion/);
});
test('Not assessed is explicit and cannot contain quotes or rationale as if assessed',()=>{
 const s=setup(),f=rows(s.req);f[1].excerpt='reconstructed content';
 assert.throws(()=>submission(s.req,'A',{judgments:f}),/judgment or exact excerpt/);
});
test('no review containing only Not assessed statuses is accepted as complete training',()=>{
 const s=setup(),f=rows(s.req);
 for(const x of f){x.status='unassessed';x.excerpt='';x.rationale='';}
 assert.throws(()=>submission(s.req,'A',{judgments:f}),/At least one criterion/);
});
test('training response does not contain a full actual learner response, study course or future note',()=>{
 const s=setup(),raw=submission(s.req,'A'),j=JSON.stringify(raw);
 assert.ok(!j.includes('PRIVATE_COURSE'));
 assert.ok(!j.includes('sessionStoredNotes'));
 assert.ok(!j.includes('complete and convincing scientific explanation.'));
});
test('an imported synthetic first judgment is append-only and source-bound',()=>{
 const s=setup(),original=importA(s);
 assert.equal(original.slot,'A');
 assert.equal(s.db.reviewerTraining.submissions.length,1);
 assert.equal(s.db.events.at(-1).type,'reviewer_training.imported');
 assert.equal(original.submissionFingerprint,require('./human-review.js').fingerprint(JSON.stringify(original.submission)));
});
test('B can be imported first without exposing A judgments in the offline page',()=>{
 const s=setup(),b=importB(s,at(2));
 assert.equal(b.slot,'B');
 assert.equal(T.compare(s.db).A,false);
 assert.equal(T.compare(s.db).B,true);
 importA(s,at(3));
 assert.equal(T.compare(s.db).completed,2);
});
test('duplicate import of reviewer A or reviewer B cannot overwrite initial judgments',()=>{
 const s=setup();const original=importA(s);
 assert.throws(()=>importA(s,at(3)),/already has an original/);
 importB(s,at(4));
 assert.throws(()=>importB(s,at(5)),/already has an original/);
 assert.equal(s.db.reviewerTraining.submissions[0],original);
});
test('training file issued for another session is rejected before appending data',()=>{
 const s=setup(),raw=submission(s.req,'A');
 raw.sessionId='b8de48d5-5b64-4511-aa80-c1310d0443f8';
 assert.throws(()=>T.importSubmission(s.db,raw,{now:at(2)}),/wrong issued cycle/);
 assert.equal(s.db.reviewerTraining.submissions.length,0);
});
test('B and A cannot both be the learner while claiming independent persons',()=>{
 const s=setup();importA(s);
 const B=submission(s.req,'B',{reviewerRole:'self'});
 assert.throws(()=>T.importSubmission(s.db,B,{now:at(3)}),/cannot both claim/);
});
test('training import time must not predate issuance',()=>{
 const s=setup();
 assert.throws(()=>T.importSubmission(s.db,submission(s.req),{now:at(-1)}),/cannot predate/);
});
test('a deliberate disagreement is reported without a pass/fail training percentage',()=>{
 const s=setup();importA(s);importB(s);
 const r=T.compare(s.db);
 assert.equal(r.completed,2);assert.equal(r.disagreements.length,1);
 assert.equal(r.decisiveComparable,0);
 assert.equal(r.decisiveAgreements,0);
 assert.equal(r.decisiveDisagreements,0);
 assert.equal(r.nondecisive,7);
 assert.equal('statusMatches' in r,false);
 assert.equal('calibrationAccuracy' in r,false);
 assert.equal('mastery' in r,false);
});
test('only genuinely decisive human judgments contribute to comparable agreement or disagreement',()=>{
 const s=setup(),a=rows(s.req,{slot:'A'}),b=rows(s.req,{slot:'B'});
 a[1]={...a[1],status:'not_demonstrated',rationale:'The answer does not explicitly describe the causal coupling.'};
 b[1]={...b[1],status:'included',excerpt:'Protons return through ATP synthase, and ATP is produced.',rationale:''};
 const first=submission(s.req,'A',{judgments:a}),second=submission(s.req,'B',{judgments:b});
 T.importSubmission(s.db,first,{now:at(2)});
 T.importSubmission(s.db,second,{now:at(3)});
 const result=T.compare(s.db);
 assert.equal(result.decisiveComparable,1);
 assert.equal(result.decisiveDisagreements,1);
 assert.equal(result.decisiveAgreements,0);
 assert.equal(result.nondecisive,6);
 assert.equal(result.disagreements.length,2);
});
test('the vague criterion is reported as a discussion topic rather than a scoring failure',()=>{
 const s=setup();importA(s);importB(s);
 const c=T.compare(s.db);
 assert.equal(c.flagged.length,1);
 assert.equal(c.flagged[0].criterionId,'vague');
 assert.equal(c.flagged[0].A,'vague');
 assert.equal(c.flagged[0].B,'vague');
});
test('training report shows A missing and avoids calculating status matches prematurely',()=>{
 const s=setup();importB(s);
 const c=T.compare(s.db);
 assert.equal(c.decisiveComparable,null);
 assert.equal(c.decisiveAgreements,null);
 assert.equal(c.A,false);assert.equal(c.B,true);
});
test('coded summary exports no verbatim reviewer reasoning, quotes, notes, course or student IDs',()=>{
 const s=setup();importA(s);importB(s);
 const exportJson=T.exportSummary(s.db);
 const text=JSON.stringify(exportJson);
 assert.equal(exportJson.format,'arw-reviewer-training-summary-v1');
 assert.equal(exportJson.disagreementCount,1);
 assert.equal(exportJson.decisiveComparable,0);
 assert.equal(exportJson.decisiveAgreements,0);
 assert.equal(exportJson.nondecisive,7);
 assert.equal(exportJson.ambiguousCriterionCount,1);
 assert.ok(!text.includes('Electron carriers move protons'));
 assert.ok(!text.includes('The expression complete and convincing'));
 assert.ok(!text.includes(UUID));
});
test('session started after a pilot lock reports its timing limitation',()=>{
 const db=C.initialDb();
 Pilot.start(db,{now:at(0),plannedTargets:3,confirmed:true});
 const req=T.start(db,{now:at(1),sessionId:UUID,confirmed:true});
 assert.equal(req.sessionId,UUID);
 assert.equal(T.compare(db).cycleAfterPilot,true);
 assert.equal(T.compare(db).importedAfterPilot,false);
});
test('first session before the pilot can later report late local file import',()=>{
 const s=setup();
 Pilot.start(s.db,{now:at(2),plannedTargets:3,confirmed:true});
 T.importSubmission(s.db,submission(s.req,'A'),{now:at(3)});
 const r=T.compare(s.db);
 assert.equal(r.cycleAfterPilot,false);
 assert.equal(r.importedAfterPilot,true);
});
test('training results never change pilot eligibility or actual review schedule',()=>{
 const s=setup();
 const state=JSON.stringify({memory:s.db.memory,attempts:s.db.attempts});
 importA(s);importB(s);
 assert.equal(JSON.stringify({memory:s.db.memory,attempts:s.db.attempts}),state);
});
test('v4.5 backups with no training record remain valid with schema 5',()=>{
 const db=C.initialDb();
 assert.equal(C.validateImport(clone(db)).schemaVersion,5);
 assert.equal(T.validate(db),true);
});
test('valid training record and distinct first reviews survive v5 backup round trip',()=>{
 const s=setup();importA(s);importB(s);
 const db=C.validateImport(clone(s.db));
 assert.equal(db.schemaVersion,5);
 assert.equal(T.compare(db).disagreements.length,1);
 assert.equal(T.validate(db),true);
});
test('missing originally issued training event is rejected in backup import',()=>{
 const s=setup(),copy=clone(s.db);
 copy.events=copy.events.filter(x=>x.type!=='reviewer_training.created');
 assert.throws(()=>C.validateImport(copy),/issuance event/);
});
test('mismatched casebook ID or content fingerprint in backup is rejected',()=>{
 const s=setup(),copy=clone(s.db);
 copy.reviewerTraining.kitId='invented-superior-kit';
 assert.throws(()=>C.validateImport(copy),/Invalid local synthetic training-cycle/);
});
test('forged quote or discussion attestation in saved submission is rejected',()=>{
 const s=setup();importA(s);
 const db=clone(s.db);
 db.reviewerTraining.submissions[0].submission.discussionUnseenAttested=false;
 assert.throws(()=>C.validateImport(db),/Invalid recorded training review provenance|Imported training first-pass file/);
});
test('missing imported first-pass event is rejected and cannot be treated as a completed review',()=>{
 const s=setup();importA(s);
 const db=clone(s.db);db.events=db.events.filter(x=>x.type!=='reviewer_training.imported');
 assert.throws(()=>C.validateImport(db),/Training import history/);
});
test('a changed original response file fingerprint is detected even if submission remains readable',()=>{
 const s=setup();importA(s);
 const db=clone(s.db);
 db.reviewerTraining.submissions[0].submission.note='Forged reviewer note';
 assert.throws(()=>C.validateImport(db),/Invalid recorded training review provenance/);
});
test('owner UI has all functional actions and no claim of expert accuracy or certification',()=>{
 const db=C.initialDb();
 const a=UI.panel({db,esc:x=>x});
 assert.match(a,/start-reviewer-training/);
 assert.match(a,/reviewer-training-offline.html/);
 T.start(db,{now:at(0),sessionId:UUID,confirmed:true});
 const b=UI.panel({db,esc:x=>x});
 assert.match(b,/export-reviewer-training-request/);
 assert.match(b,/export-reviewer-training-summary/);
 assert.match(b,/reviewer-training-import/);
 assert.doesNotMatch(b,/pass rate|AI calibrated|certified as expert/i);
});
test('UI reveals actual A/B differences and problematic criterion after importing both first passes',()=>{
 const s=setup();importA(s);importB(s);
 const html=UI.panel({db:s.db,esc:x=>x});
 assert.match(html,/energy-transfer/);
 assert.match(html,/food-web-model/);
 assert.match(html,/Reviewer A/);
 assert.match(html,/vague/);
});
test('standalone reviewer page is self-contained, with no network access or browser storage',()=>{
 const html=fs.readFileSync('reviewer-training-offline.html','utf8');
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/training-request-file/);
 assert.match(html,/guidance-section/);
 assert.match(html,/training-form/);
 assert.doesNotMatch(html,/fetch\s*\(|XMLHttpRequest|indexedDB|localStorage|<script[^>]+src=|https?:\/\//i);
});
test('static v4.6 files are cached and loaded before core and owner UI',()=>{
 const index=fs.readFileSync('index.html','utf8'),
   sw=fs.readFileSync('sw.js','utf8'),core=fs.readFileSync('core.js','utf8');
 assert.ok(index.indexOf('reviewer-training.js')<index.indexOf('core.js'));
 assert.ok(index.indexOf('reviewer-training-ui.js')<index.indexOf('app.js'));
 assert.match(sw,/active-recall-web-v4-41/);
 assert.match(sw,/reviewer-training-offline\.html/);
 assert.match(core,/Training\.validate\(input\)/);
});
