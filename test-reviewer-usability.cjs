'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('./core.js'),U=require('./reviewer-usability.js'),
 T=require('./reviewer-training.js'),Pilot=require('./reviewer-pilot.js'),
 UI=require('./reviewer-usability-ui.js');
const T0=Date.parse('2027-06-11T10:00:00.000Z'),at=minutes=>new Date(T0+minutes*60000);
const IDS=['f645b04f-716e-4710-8ed3-218cd1ec1211','f645b04f-716e-4710-8ed3-218cd1ec1212',
 'f645b04f-716e-4710-8ed3-218cd1ec1213','f645b04f-716e-4710-8ed3-218cd1ec1214',
 'f645b04f-716e-4710-8ed3-218cd1ec1215','f645b04f-716e-4710-8ed3-218cd1ec1216',
 'f645b04f-716e-4710-8ed3-218cd1ec1217','f645b04f-716e-4710-8ed3-218cd1ec1218',
 'f645b04f-716e-4710-8ed3-218cd1ec1219','f645b04f-716e-4710-8ed3-218cd1ec121a',
 'f645b04f-716e-4710-8ed3-218cd1ec121b','f645b04f-716e-4710-8ed3-218cd1ec121c'];
const STUDY='f645b04f-716e-4710-8ed3-218cd1ec1220';
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(n=3){
 const db=C.initialDb();
 U.start(db,{planned:n,confirmed:true,now:at(0),studyId:STUDY,invitationIds:IDS.slice(0,n)});
 return {db,invite:i=>U.issue(db,i)};
}
function findings({status='included'}={}){
 return T.CASES.flatMap((c,i)=>c.criteria.map((k,j)=>({
   caseId:c.id,criterionId:k.id,
   status:i===0&&j===0?status:'unassessed',
   excerpt:i===0&&j===0&&status==='included'?'Electron carriers move protons across the membrane':'',
   rationale:i===0&&j===0&&status==='uncertain'?'The concentration difference was not fully explicit.':'',
   issue:i===2&&j===2?'vague':'none',
   issueNote:i===2&&j===2?'Complete and convincing is not an observable description of evidence.':''
 })));
}
function ratings(entries={}){return Object.fromEntries(U.ITEMS.map(x=>[x.id,entries[x.id]??null]));}
function submission(inv,{answers={status:4,excerpt:3,uncertain:2,criteria:1,interface:5},...args}={}){
 return U.createResponse(inv,{judgments:findings(),ratings:ratings(answers),
   biggestObstacle:'criterion_wording',consented:true,discussionUnseen:true,
   completedAt:at(1).toISOString(),...args});
}
function importAt(s,i,overrides={},minute=2){
 const file=submission(s.invite(i),overrides);
 U.importResponse(s.db,file,{now:at(minute)});
 return file;
}
test('v4.7 is a free local-only optional schema-v5 extension',()=>{
 const db=C.initialDb();
 assert.equal(db.schemaVersion,5);assert.equal(db.reviewerUsability,undefined);
 assert.equal(U.validate(db),true);
 const src=fs.readFileSync('reviewer-usability.js','utf8');
 assert.doesNotMatch(src,/fetch\s*\(|XMLHttpRequest|Stripe|OpenAI|billing|apiKey|https?:\/\//);
});
test('single fixed questionnaire has five wording-frozen items and a fictional casebook',()=>{
 assert.equal(U.ITEMS.length,5);
 assert.equal(T.CASES.length,3);assert.equal(T.expectedRows().length,7);
 assert.equal(U.PROTOCOL.selection,'all-preallocated-invitations-including-nonreturns');
});
test('human consent before locking fixed invitations is mandatory',()=>{
 const db=C.initialDb();
 assert.throws(()=>U.start(db,{planned:5}),/Confirm/);
 assert.equal(db.reviewerUsability,undefined);
});
test('plan explicitly supports only 3 to 12 fixed invite slots',()=>{
 for(const n of [0,1,2,13,50,3.1,NaN,'5']){
   assert.throws(()=>U.start(C.initialDb(),{planned:n,confirmed:true,
     studyId:STUDY,invitationIds:IDS.slice(0,n)}),/3 to 12/);
 }
});
test('invalid and repeated invitation identifiers cannot be preallocated',()=>{
 const db=C.initialDb();
 assert.throws(()=>U.start(db,{confirmed:true,planned:3,studyId:STUDY,
   invitationIds:[IDS[0],IDS[1],IDS[1]],now:at(0)}),/repeated/);
 assert.equal(db.reviewerUsability,undefined);
});
test('creating the pilot freezes all three distinct anonymous-code invitations',()=>{
 const s=setup();
 assert.equal(s.db.reviewerUsability.invitations.length,3);
 assert.deepEqual(s.db.reviewerUsability.invitations.map(x=>x.index),[1,2,3]);
 assert.equal(s.db.reviewerUsability.responses.length,0);
 assert.equal(s.db.events.at(-1).type,'reviewer_usability.locked');
});
test('cannot reset the cohort or quietly select a different set of reviewers',()=>{
 const s=setup();
 assert.throws(()=>U.start(s.db,{planned:5,confirmed:true}),/already registered/);
});
test('every downloadable invitation reuses the same immutable public synthetic materials',()=>{
 const s=setup(),before=s.db.events.length;
 assert.deepEqual(s.invite(0),s.invite(0));
 assert.deepEqual(s.invite(0).cases,T.CASES);
 assert.deepEqual(s.invite(0).items,U.ITEMS);
 assert.equal(s.db.events.length,before);
});
test('distinct slots have separate invitation tokens, never real learner notes',()=>{
 const s=setup(),a=s.invite(0),b=s.invite(1);
 assert.notEqual(a.invitationId,b.invitationId);
 assert.equal(a.studyId,b.studyId);
 assert.ok(!JSON.stringify(a).includes('learnerAtRisk'));
 assert.equal('attempts' in a,false);
});
test('future slot indices outside original fixed size are rejected',()=>{
 const s=setup();
 for(const i of [-1,3,5,'1',NaN])assert.throws(()=>U.issue(s.db,i),/Unknown invitation slot/);
});
test('changed fictional case text fails the original fixed invitation validator',()=>{
 const s=setup(),x=clone(s.invite(0));
 x.cases[0].response='Modified experimental text';
 assert.throws(()=>U.validateInvite(x),/Invalid or modified/);
});
test('the exact item prompts and response categories cannot be changed after issuance',()=>{
 const s=setup(),x=clone(s.invite(0));
 x.items[0].prompt='Our team did great at reviewing, yes?';
 assert.throws(()=>U.validateInvite(x),/Invalid or modified/);
});
test('unsolicited extra private study data in invitation is rejected',()=>{
 const s=setup(),x={...s.invite(0),privateCourses:[{student:'secret'}]};
 assert.throws(()=>U.validateInvite(x),/Invalid or modified/);
});
test('a real first-pass Included requires verbatim original fictional evidence',()=>{
 const s=setup(),x=submission(s.invite(0));
 assert.equal(x.judgments[0].status,'included');
 assert.equal(x.judgments[0].excerpt,'Electron carriers move protons across the membrane');
});
test('voluntary individual question skips are explicit null, not neutral 3',()=>{
 const s=setup(),x=submission(s.invite(0),{answers:{status:5}});
 assert.equal(x.ratings.status,5);
 assert.equal(x.ratings.excerpt,null);
 assert.equal(x.ratings.criteria,null);
});
test('participant may skip every subjective rating while still sharing first-pass evidence',()=>{
 const s=setup(),x=submission(s.invite(0),{answers:{}});
 assert.deepEqual(Object.values(x.ratings),[null,null,null,null,null]);
 assert.equal(x.judgments.length,7);
});
test('optional comments have a strict length limit and are not required',()=>{
 const s=setup();
 assert.equal(submission(s.invite(0),{note:''}).note,'');
 assert.throws(()=>submission(s.invite(0),{note:'x'.repeat(401)}),/under 400/);
});
test('consent to share, and original pre-discussion self-report, must both be affirmative',()=>{
 const s=setup(),inv=s.invite(0);
 assert.throws(()=>submission(inv,{consented:false}),/voluntarily consented/);
 assert.throws(()=>submission(inv,{discussionUnseen:false}),/voluntarily consented/);
});
test('no private respondent data is generated until explicit response creation',()=>{
 const s=setup();
 assert.equal(s.db.reviewerUsability.responses.length,0);
 assert.equal(U.audit(s.db).notReturned,3);
});
test('Included using a fabricated quote cannot bypass original training evidence validation',()=>{
 const s=setup(),x=findings();x[0].excerpt='Imagined causal relationship';
 assert.throws(()=>submission(s.invite(0),{judgments:x}),/training judgment|exact excerpt/);
});
test('Uncertain must include a human rationale',()=>{
 const s=setup(),x=findings({status:'uncertain'});x[0].rationale='';
 assert.throws(()=>submission(s.invite(0),{judgments:x}),/judgment|exact excerpt/);
});
test('rubric clarity flags need written rationale before accepting a file',()=>{
 const s=setup(),x=findings();x.at(-1).issueNote='';
 assert.throws(()=>submission(s.invite(0),{judgments:x}),/judgment|exact excerpt/);
});
test('original rubric requires seven criterion records including Not assessed',()=>{
 const s=setup(),x=findings();x.pop();
 assert.throws(()=>submission(s.invite(0),{judgments:x}),/All seven/);
});
test('all-unassessed fake completion is rejected; at least one actual first judgment required',()=>{
 const s=setup(),x=findings();x[0].status='unassessed';x[0].excerpt='';
 assert.throws(()=>submission(s.invite(0),{judgments:x}),/At least one criterion/);
});
test('optional ratings accept 1–5 but never decimals, invalid numbers or 0 as skips',()=>{
 const s=setup();
 for(const bad of [0,-1,6,2.1,NaN,'4',true]){
   const x=ratings({status:bad});const raw=submission(s.invite(0));raw.ratings=x;
   assert.throws(()=>U.validateResponse(raw,s.invite(0)),/1–5/);
 }
});
test('all optional rating keys are mandatory for reproducible missingness counts',()=>{
 const s=setup(),r=submission(s.invite(0));delete r.ratings.interface;
 assert.throws(()=>U.validateResponse(r,s.invite(0)),/1–5/);
});
test('obstacle category cannot include arbitrary user-controlled CSV formula',()=>{
 const s=setup();
 assert.throws(()=>submission(s.invite(0),{biggestObstacle:'=HYPERLINK("https://x")'}),/Invalid/);
});
test('first voluntary response is imported only for its issued invitation token',()=>{
 const s=setup(),raw=importAt(s,1);
 assert.equal(s.db.reviewerUsability.responses.length,1);
 assert.equal(s.db.reviewerUsability.responses[0].invitationId,raw.invitationId);
 assert.equal(s.db.events.at(-1).type,'reviewer_usability.received');
});
test('a different study or invitation code cannot be inserted into the preallocated cohort',()=>{
 const s=setup(),fake=submission(s.invite(0));
 fake.invitationId='b645b04f-716e-4710-8ed3-218cd1ec1211';
 assert.throws(()=>U.importResponse(s.db,fake,{now:at(2)}),/not issued/);
});
test('any second response for a used token is rejected rather than silently overwriting data',()=>{
 const s=setup();importAt(s,0);
 assert.throws(()=>importAt(s,0,{},3),/already been received/);
 assert.equal(U.audit(s.db).received,1);
});
test('valid imports are allowed out of invitation order without backfilling missing slots',()=>{
 const s=setup();importAt(s,2,{},2);importAt(s,0,{},3);
 const a=U.audit(s.db);
 assert.equal(a.received,2);assert.equal(a.notReturned,1);
 assert.equal(a.rows[1].returned,false);
});
test('wrong study cannot import even when the fictional casebook is identical',()=>{
 const s=setup(),r=submission(s.invite(0));
 r.studyId='e645b04f-716e-4710-8ed3-218cd1ec1211';
 assert.throws(()=>U.importResponse(s.db,r,{now:at(2)}),/mismatched/);
});
test('nonreturn denominator is planned invitations not selected completed questionnaires',()=>{
 const s=setup();importAt(s,2);
 const a=U.audit(s.db);
 assert.equal(a.planned,3);assert.equal(a.received,1);
 assert.equal(a.notReturned,2);assert.equal(a.items[0].notReturned,2);
});
test('returned respondent who skips a question differs from invited person who did not return',()=>{
 const s=setup();importAt(s,0,{answers:{status:4}});
 const a=U.audit(s.db);
 assert.equal(a.items.find(x=>x.id==='status').counts[4],1);
 assert.equal(a.items.find(x=>x.id==='excerpt').skipped,1);
 assert.equal(a.items.find(x=>x.id==='excerpt').notReturned,2);
});
test('rubric flag counts and explicit Unassessed are descriptive, not correctness or mastery',()=>{
 const s=setup();importAt(s,0);
 const a=U.audit(s.db);
 assert.equal(a.flags.vague,1);
 assert.equal(a.judgments.unassessed,6);
 assert.equal(a.judgments.included,1);
 assert.equal('accuracy' in a,false);
 assert.equal('mastery' in a,false);
});
test('fixed small cohort never outputs percentages, standard errors or reliability claims',()=>{
 const s=setup();importAt(s,0);
 const a=U.audit(s.db);
 assert.equal('agreementRate' in a,false);
 assert.equal('mean' in a,false);
 assert.match(a.warning,/no percent agreement/i);
});
test('fixed CSV has one row per invitation and includes every nonreturn',()=>{
 const s=setup();importAt(s,0);
 const lines=U.exportCSV(s.db).trim().split(/\r?\n/);
 assert.equal(lines.length,4);
 assert.match(lines[1],/^1,yes,/);assert.match(lines[2],/^2,no,missing/);
 assert.match(lines[3],/^3,no,missing/);
});
test('CSV contains skipped as distinct from missing and stable numeric 1–5 ratings',()=>{
 const s=setup();importAt(s,0,{answers:{status:2,criteria:5}});
 const csv=U.exportCSV(s.db);
 assert.match(csv,/1,yes,2,skipped,skipped,5,skipped,criterion_wording/);
 assert.match(csv,/2,no,missing,missing,missing/);
});
test('CSV avoids private notes, fabricated learner text, UUID, rubric excerpts and CSV formulas',()=>{
 const s=setup(),raw=submission(s.invite(0),{note:'PRIVATE_NAME_VISIBLE_ONLY_IN_LOCAL_OWNER'});
 U.importResponse(s.db,raw,{now:at(2)});
 const csv=U.exportCSV(s.db);
 for(const secret of ['PRIVATE_NAME_VISIBLE_ONLY_IN_LOCAL_OWNER','Electron carriers',s.db.reviewerUsability.id,IDS[0],'<script','https://']){
   assert.ok(!csv.includes(secret),'Coded CSV unexpectedly contained '+secret);
 }
});
test('aggregate JSON intentionally excludes invitation codes and optional free text',()=>{
 const s=setup(),raw=submission(s.invite(1),{note:'ONLY_LOCAL_COACHING_NOTE'});
 U.importResponse(s.db,raw,{now:at(2)});
 const manifest=U.exportSummary(s.db),txt=JSON.stringify(manifest);
 assert.equal(manifest.format,U.FORMATS.summary);
 assert.equal(manifest.counts.received,1);
 for(const secret of [STUDY,IDS[1],'ONLY_LOCAL_COACHING_NOTE','Electron carriers']){
   assert.ok(!txt.includes(secret),'Summary unexpectedly includes '+secret);
 }
 assert.equal(manifest.counts.rows,undefined);
});
test('import receipt cannot predate local fixed-plan creation',()=>{
 const s=setup();
 assert.throws(()=>U.importResponse(s.db,submission(s.invite(0)),{now:at(-1)}),/cannot predate/);
});
test('no response changes any actual study attempt, rubric version or scheduling decision',()=>{
 const s=setup(),before=JSON.stringify({attempts:s.db.attempts,memory:s.db.memory,rubric:s.db.rubricCriteria});
 importAt(s,0);
 assert.equal(JSON.stringify({attempts:s.db.attempts,memory:s.db.memory,rubric:s.db.rubricCriteria}),before);
});
test('local start after real pilot lock is flagged without claiming pre-pilot reviewer training',()=>{
 const db=C.initialDb();Pilot.start(db,{plannedTargets:3,now:at(0),confirmed:true});
 U.start(db,{planned:3,confirmed:true,now:at(1),studyId:STUDY,invitationIds:IDS.slice(0,3)});
 assert.equal(U.audit(db).issuedAfterPilot,true);
 assert.equal(U.validate(db),true);
});
test('schema-v5 backup round trips include original fixed invitations and imported voluntary files',()=>{
 const s=setup();importAt(s,0);importAt(s,2,{},3);
 const restored=C.validateImport(clone(s.db));
 assert.equal(restored.schemaVersion,5);
 assert.equal(U.audit(restored).received,2);
 assert.equal(U.exportCSV(restored),U.exportCSV(s.db));
});
test('v4.6 backups with no usability extension still validate without a migration',()=>{
 const db=C.initialDb();
 assert.equal(C.validateImport(clone(db)).schemaVersion,5);
 assert.equal(U.validate(db),true);
});
test('edited fixed denominator rejected against original lock event',()=>{
 const s=setup(),backup=clone(s.db);
 backup.reviewerUsability.planned=4;
 assert.throws(()=>C.validateImport(backup),/Invalid locally locked|Fixed invitation cohort/);
});
test('changed original invitation token or reordering rejects restored backup',()=>{
 const s=setup(),backup=clone(s.db);
 [backup.reviewerUsability.invitations[0],backup.reviewerUsability.invitations[1]]=
 [backup.reviewerUsability.invitations[1],backup.reviewerUsability.invitations[0]];
 assert.throws(()=>C.validateImport(backup),/Original preallocated|Fixed invitation cohort/);
});
test('deleted nonresponse slots cannot selectively reduce a sample denominator',()=>{
 const s=setup(),backup=clone(s.db);
 backup.reviewerUsability.invitations.pop();
 assert.throws(()=>C.validateImport(backup),/Invalid locally locked/);
});
test('altered original clarity self-report is rejected during restore',()=>{
 const s=setup();importAt(s,0);
 const backup=clone(s.db);backup.reviewerUsability.responses[0].submission.ratings.status=1;
 assert.throws(()=>C.validateImport(backup),/Invalid stored|does not match/);
});
test('removing recorded receipt events is rejected rather than pretending a file was returned',()=>{
 const s=setup();importAt(s,0);
 const backup=clone(s.db);backup.events=backup.events.filter(e=>e.type!=='reviewer_usability.received');
 assert.throws(()=>C.validateImport(backup),/response count and append-only/);
});
test('duplicate original invitation response inside a backup is invalid',()=>{
 const s=setup();importAt(s,0);
 const backup=clone(s.db);backup.reviewerUsability.responses.push(clone(backup.reviewerUsability.responses[0]));
 assert.throws(()=>C.validateImport(backup),/response count|Invalid stored|receipt event/);
});
test('owner UI advertises voluntary consent and shows locked nonreturns and import/export controls',()=>{
 const db=C.initialDb();
 const before=UI.panel({db,esc:String});assert.match(before,/start-reviewer-usability/);
 assert.match(before,/voluntary/i);
 U.start(db,{planned:3,now:at(0),confirmed:true,studyId:STUDY,invitationIds:IDS.slice(0,3)});
 const after=UI.panel({db,esc:String});
 for(const x of ['export-reviewer-usability-csv','export-reviewer-usability-summary',
   'reviewer-usability-import','export-reviewer-usability-invite','Not returned']){
   assert.match(after,new RegExp(x));
 }
});
test('local free-text comments are escaped in the owner UI and never shown as raw HTML',()=>{
 const s=setup(),raw=submission(s.invite(0),{note:'<img src=x onerror=alert(1)>'});
 U.importResponse(s.db,raw,{now:at(2)});
 const html=UI.panel({db:s.db,esc:x=>String(x).replaceAll('<','&lt;')});
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)>'));
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});
test('disconnected exercise has only fixed schema, no network, browser storage or real learner sync',()=>{
 const html=fs.readFileSync('reviewer-usability-offline.html','utf8');
 for(const x of ["connect-src 'none'",'usability-invite-file','exercise-form','feedback-form','discussion-section']){
   assert.ok(html.includes(x),x);
 }
 assert.doesNotMatch(html,/fetch\s*\(|XMLHttpRequest|localStorage|indexedDB|https?:\/\//i);
});
test('static v4.7 scripts load safely and offline assets are cached and in health diagnostics',()=>{
 const index=fs.readFileSync('index.html','utf8'),
   sw=fs.readFileSync('sw.js','utf8'),
   health=fs.readFileSync('health.html','utf8'),core=fs.readFileSync('core.js','utf8');
 assert.ok(index.indexOf('reviewer-usability.js')<index.indexOf('core.js'));
 assert.ok(index.indexOf('reviewer-usability-ui.js')<index.indexOf('app.js'));
 assert.match(sw,/active-recall-web-v4-19/);
 assert.match(sw,/reviewer-usability-offline\.html/);
 assert.match(health,/reviewer-usability-offline\.html/);
 assert.match(core,/Usability\.validate\(input\)/);
});
