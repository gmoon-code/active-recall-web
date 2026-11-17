/* Active Recall Web v4.7 — opt-in reviewer-usability micro-pilot.
   Preselected, consecutive invitation slots; every nonreturn stays missing.
   Fictional casebook only. Human first-pass statuses are NOT scientific grades.
   No change to study attempts, reviewer-pilot selection or scheduling. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallReviewerUsability=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const T=(typeof module!=='undefined'&&module.exports)?require('./reviewer-training.js'):globalThis.ActiveRecallReviewerTraining;
 const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
 if(!T||!H)throw Error('Frozen synthetic training and manual evidence modules are required.');
 const FORMATS={invite:'arw-reviewer-usability-invitation-v1',response:'arw-reviewer-usability-response-v1',
   summary:'arw-reviewer-usability-summary-v1'};
 const METHOD='fixed-invitation-synthetic-reviewer-usability-v1';
 const ITEMS=Object.freeze([
   {id:'status',prompt:'I understood the difference between Included, Not demonstrated, Uncertain and Not assessed.'},
   {id:'excerpt',prompt:'I understood how to select an exact excerpt from the fictional written response.'},
   {id:'uncertain',prompt:'I knew when to choose Uncertain rather than assuming that an idea was absent.'},
   {id:'criteria',prompt:'I understood what each rubric criterion asked me to look for.'},
   {id:'interface',prompt:'I could find and use the assessment controls without needing extra guidance.'}
 ]);
 const OBSTACLES=['none','status_options','finding_excerpt','uncertain_option','criterion_wording','interface','other','skipped'];
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const RESP_FIELDS=['format','version','method','studyId','invitationId','kitId','casesFingerprint',
   'completedAt','consentedToShare','discussionUnseenAttested','judgments','ratings','biggestObstacle','note'];
 const INVITE_FIELDS=['format','version','method','studyId','invitationId','issuedAt','kitId',
   'casesFingerprint','cases','items','obstacles','instructions'];
 const PROTOCOL=Object.freeze({
   version:1,selection:'all-preallocated-invitations-including-nonreturns',
   target:'3-to-12-fixed-invitation-slots',
   data:'fictional-casebook-plus-voluntary-clarity-self-report',
   sequence:'first-human-judgment-then-voluntary-usability-feedback-before-discussion',
   outcome:'item-level-counts-and-missingness-not-percentage-or-scoring',
   reference:'no-gold-standard-no-measures-of-student-learning',
   integrity:'local-event-and-accidental-mismatch-validation-not-proof',
   privacy:'coded-exports-omit-written-responses-free-text-and-identifiers'
 });
 const INSTRUCTIONS='All exercises are fictional. Participation is voluntary, you can skip usability questions or stop without sharing a file. Choose human evidence judgments first, then give feedback before reading discussion prompts in this interface. No grades or expertise certification are calculated. Files are downloaded locally; sharing them outside the app can disclose their contents.';
 const sig=x=>H.fingerprint(JSON.stringify(x));
 const copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(x,fields)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
   Object.keys(x).sort().join('|')===fields.slice().sort().join('|');
 const iso=x=>typeof x==='string'&&x.length<=40&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const random=()=>{const c=typeof crypto!=='undefined'?crypto:null;
   if(!c||typeof c.randomUUID!=='function')throw Error('Secure random identifiers are unavailable. Use HTTPS or localhost.');
   return c.randomUUID();};
 function invite(s,index){
   const slot=s.invitations[index];
   if(!slot)throw Error('Invitation slot is not part of the fixed recruitment plan.');
   return {format:FORMATS.invite,version:1,method:METHOD,studyId:s.id,
     invitationId:slot.id,issuedAt:s.issuedAt,kitId:T.KIT_ID,casesFingerprint:T.KIT_FINGERPRINT,
     cases:copy(T.CASES),items:copy(ITEMS),obstacles:[...OBSTACLES],instructions:INSTRUCTIONS};
 }
 function validateInvite(raw){
   if(!exact(raw,INVITE_FIELDS)||raw.format!==FORMATS.invite||raw.version!==1||
     raw.method!==METHOD||!UUID.test(raw.studyId)||!UUID.test(raw.invitationId)||
     raw.studyId===raw.invitationId||!iso(raw.issuedAt)||
     raw.kitId!==T.KIT_ID||raw.casesFingerprint!==T.KIT_FINGERPRINT||
     !same(raw.cases,T.CASES)||!same(raw.items,ITEMS)||
     !same(raw.obstacles,OBSTACLES)||raw.instructions!==INSTRUCTIONS||
     JSON.stringify(raw).length>40000)
     throw Error('Invalid or modified fixed fictional reviewer-usability invitation.');
   return raw;
 }
 function start(db,{planned=5,confirmed=false,now=new Date(),studyId=null,invitationIds=null}={}){
   if(db?.reviewerUsability!==undefined)
     throw Error('One usability study is already registered locally; original invitation and nonresponse history cannot be reset.');
   if(!confirmed)throw Error('Confirm you are locking the voluntary fictional-reviewer protocol before sharing invitations.');
   if(!Number.isSafeInteger(planned)||planned<3||planned>12)throw Error('Plan 3 to 12 invitation slots before recruiting.');
   if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid local pilot timestamp.');
   const id=studyId||random(),ids=invitationIds||Array.from({length:planned},random);
   if(!UUID.test(id)||!Array.isArray(ids)||ids.length!==planned||
     ids.some(x=>!UUID.test(x)||x===id)||new Set(ids).size!==ids.length)
     throw Error('Invalid or repeated secure invitation identifiers.');
   if(!Array.isArray(db?.events))throw Error('Missing original local event history.');
   const study={version:1,method:METHOD,id,issuedAt:now.toISOString(),planned,
     kitId:T.KIT_ID,casesFingerprint:T.KIT_FINGERPRINT,protocol:copy(PROTOCOL),
     pilotLockedAtAtIssue:db.reviewerPilot?.lockedAt||null,
     invitations:ids.map((x,i)=>({id:x,index:i+1})),responses:[]};
   db.reviewerUsability=study;
   db.events.push({type:'reviewer_usability.locked',entityId:id,at:study.issuedAt,planned,
     invitationFingerprint:sig(ids),protocolFingerprint:sig(PROTOCOL),
     pilotLockedAtAtIssue:study.pilotLockedAtAtIssue});
   return study;
 }
 function issue(db,index){
   const s=db?.reviewerUsability;
   if(!s)throw Error('Lock a voluntary usability plan before exporting invitations.');
   if(!Number.isSafeInteger(index)||index<0||index>=s.planned)throw Error('Unknown invitation slot.');
   return validateInvite(invite(s,index));
 }
 function judgmentsValid(raw,req){
   if(!Array.isArray(raw)||raw.length!==T.expectedRows().length)
     throw Error('All seven original fictional criteria require an explicit status, including Not assessed.');
   // Reuse v4.6 validation rather than creating a weaker, divergent rubric check.
   const internal={format:T.FORMAT.request,version:1,kitId:T.KIT_ID,sessionId:req.studyId,
     issuedAt:req.issuedAt,casesFingerprint:T.KIT_FINGERPRINT,cases:copy(T.CASES)};
   const verified=T.makeSubmission(internal,{slot:'A',reviewerRole:'other_person',
     judgments:raw,confirmed:true,discussionUnseen:true,completedAt:req.issuedAt});
   if(!same(verified.judgments,raw))throw Error('Original synthetic human criteria must remain canonical.');
   return verified.judgments;
 }
 function ratingsValid(ratings){
   if(!ratings||typeof ratings!=='object'||Array.isArray(ratings)||
     !exact(ratings,ITEMS.map(x=>x.id))||
     ITEMS.some(x=>ratings[x.id]!==null&&
       (!Number.isSafeInteger(ratings[x.id])||ratings[x.id]<1||ratings[x.id]>5)))
     throw Error('Usability clarity responses must be 1–5 or explicitly skipped (null).');
   return ratings;
 }
 function validateResponse(raw,req){
   validateInvite(req);
   if(!exact(raw,RESP_FIELDS)||raw.format!==FORMATS.response||raw.version!==1||
     raw.method!==METHOD||raw.studyId!==req.studyId||raw.invitationId!==req.invitationId||
     raw.kitId!==T.KIT_ID||raw.casesFingerprint!==T.KIT_FINGERPRINT||
     !iso(raw.completedAt)||raw.consentedToShare!==true||
     raw.discussionUnseenAttested!==true||!OBSTACLES.includes(raw.biggestObstacle)||
     typeof raw.note!=='string'||raw.note.length>400||raw.note!==raw.note.trim()||
     JSON.stringify(raw).length>50000)
     throw Error('Invalid, nonconsented or mismatched usability response.');
   ratingsValid(raw.ratings);
   judgmentsValid(raw.judgments,req);
   return raw;
 }
 function createResponse(req,{judgments,ratings,biggestObstacle='skipped',note='',
   consented=false,discussionUnseen=false,completedAt=new Date().toISOString()}={}){
   validateInvite(req);
   if(!consented||!discussionUnseen)
     throw Error('Only voluntarily consented, pre-discussion human feedback can be shared.');
   if(typeof note!=='string'||note.length>400)
     throw Error('Keep optional usability comments under 400 characters.');
   const raw={format:FORMATS.response,version:1,method:METHOD,studyId:req.studyId,
     invitationId:req.invitationId,kitId:T.KIT_ID,casesFingerprint:T.KIT_FINGERPRINT,
     completedAt,consentedToShare:true,discussionUnseenAttested:true,
     judgments:copy(judgments),ratings:copy(ratings),biggestObstacle,note:note.trim()};
   return validateResponse(raw,req);
 }
 function importResponse(db,raw,{now=new Date()}={}){
   const s=db?.reviewerUsability;
   if(!s)throw Error('This browser has no matching locally locked usability study.');
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>50000)
     throw Error('Invalid reviewer usability JSON file.');
   const index=s.invitations.findIndex(x=>x.id===raw.invitationId);
   if(index<0)throw Error('The file was not issued for one of these fixed anonymous-code invitations.');
   validateResponse(raw,issue(db,index));
   if(s.responses.some(x=>x.invitationId===raw.invitationId))
     throw Error('Original feedback for this invitation has already been received and cannot be overwritten.');
   if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(s.issuedAt))
     throw Error('An import receipt cannot predate the original local plan lock.');
   const saved={version:1,invitationId:raw.invitationId,receivedAt:now.toISOString(),
     fingerprint:sig(raw),submission:copy(raw)};
   s.responses.push(saved);
   db.events.push({type:'reviewer_usability.received',entityId:s.id,
     invitationId:raw.invitationId,at:saved.receivedAt,fingerprint:saved.fingerprint});
   return saved;
 }
 function audit(db){
   const s=db?.reviewerUsability;if(!s)return null;
   const sent=s.invitations.length,received=s.responses.length,records=s.invitations.map(x=>
     s.responses.find(r=>r.invitationId===x.id)||null);
   const items=ITEMS.map(item=>{
     const values=records.map(x=>x?.submission.ratings[item.id]??null);
     return {id:item.id,prompt:item.prompt,counts:Object.fromEntries([1,2,3,4,5].map(v=>
       [v,values.filter(x=>x===v).length])),
       skipped:records.filter(x=>x&&x.submission.ratings[item.id]===null).length,
       notReturned:sent-received};
   });
   const obstacles=Object.fromEntries(OBSTACLES.map(o=>[o,records.filter(x=>x?.submission.biggestObstacle===o).length]));
   const statuses=['included','not_demonstrated','uncertain','unassessed'];
   const judgments=Object.fromEntries(statuses.map(o=>[o,records.reduce((n,r)=>n+(r?.submission.judgments.filter(j=>j.status===o).length||0),0)]));
   const issues=['none','vague','multiple_demands','overlap','insufficient_evidence_rule','other'];
   const flags=Object.fromEntries(issues.map(o=>[o,records.reduce((n,r)=>n+(r?.submission.judgments.filter(j=>j.issue===o).length||0),0)]));
   return {version:1,planned:s.planned,received,notReturned:sent-received,
     items,obstacles,judgments,flags,
     rows:s.invitations.map((x,i)=>({slot:i+1,returned:!!records[i],
       questionnaireAnswered:records[i]?ITEMS.filter(q=>records[i].submission.ratings[q.id]!==null).length:0,
       criteriaAssessed:records[i]?records[i].submission.judgments.filter(j=>j.status!=='unassessed').length:0,
       rubricConcerns:records[i]?records[i].submission.judgments.filter(j=>j.issue!=='none').length:0})),
     issuedAfterPilot:!!s.pilotLockedAtAtIssue,
     warning:'Small, voluntary fictional-casebook usability self-reports. Every invitation without a file remains a nonreturn; skipped answers stay missing. Local timestamps and respondent identity are unauthenticated. No percent agreement, objective science grading, psychometric validation, representative sampling, memory gains or scheduler effect is inferred. Invitation-code reports may be re-identifiable in small groups.'};
 }
 function exportCSV(db){
   const s=db?.reviewerUsability;if(!s)throw Error('Start a pilot before exporting coded responses.');
   validate(db);
   const h=['slot','returned',...ITEMS.map(x=>x.id),'biggest_obstacle','assessed_criteria','flagged_criteria'];
   const lines=[h.join(',')];
   for(let i=0;i<s.invitations.length;i++){
     const inv=s.invitations[i],r=s.responses.find(x=>x.invitationId===inv.id)?.submission;
     if(!r){lines.push([i+1,'no',...ITEMS.map(()=>'missing'),'missing','missing','missing'].join(','));continue;}
     lines.push([i+1,'yes',...ITEMS.map(x=>r.ratings[x.id]??'skipped'),r.biggestObstacle,
       r.judgments.filter(x=>x.status!=='unassessed').length,
       r.judgments.filter(x=>x.issue!=='none').length].join(','));
   }
   // Only static enum strings, numeric codes and program-derived counts. Never
   // include participant text, original answers, notes, URLs or raw UUIDs.
   return lines.join('\r\n')+'\r\n';
 }
 function exportSummary(db){
   const s=db?.reviewerUsability;if(!s)throw Error('Start the reviewer-usability pilot first.');
   validate(db);
   const a=audit(db),{rows,...counts}=a;
   return {format:FORMATS.summary,version:1,method:METHOD,
     localIssuedAt:s.issuedAt,protocol:copy(s.protocol),kitId:s.kitId,
     counts,privacy:'Coded aggregate counts; no invitation IDs, reviewer quotes, comments, study-answer excerpts, names or internal attempt IDs.',
     note:'No real student learning outcomes or correct-status key. Local plan is not registered and not tamper-proof; all nonreturns and skipped items are reported separately.'};
 }
 function validate(db){
   const s=db?.reviewerUsability;if(s===undefined)return true;
   if(!s||!exact(s,['version','method','id','issuedAt','planned','kitId',
     'casesFingerprint','protocol','pilotLockedAtAtIssue','invitations','responses'])||
     s.version!==1||s.method!==METHOD||!UUID.test(s.id)||!iso(s.issuedAt)||
     !Number.isSafeInteger(s.planned)||s.planned<3||s.planned>12||
     s.kitId!==T.KIT_ID||s.casesFingerprint!==T.KIT_FINGERPRINT||
     !same(s.protocol,PROTOCOL)||
     s.pilotLockedAtAtIssue!==null&&!iso(s.pilotLockedAtAtIssue)||
     !Array.isArray(s.invitations)||s.invitations.length!==s.planned||
     !Array.isArray(s.responses)||s.responses.length>s.planned)
     throw Error('Invalid locally locked reviewer-usability protocol.');
   if(s.pilotLockedAtAtIssue!==null&&s.pilotLockedAtAtIssue!==db.reviewerPilot?.lockedAt)
     throw Error('Original reviewer-usability pilot lock no longer matches current history.');
   const ids=new Set();
   for(let i=0;i<s.invitations.length;i++){
     const x=s.invitations[i];
     if(!exact(x,['id','index'])||!UUID.test(x.id)||x.id===s.id||ids.has(x.id)||x.index!==i+1)
       throw Error('Original preallocated reviewer-usability invitations are invalid.');
     ids.add(x.id);
   }
   const locked=db.events.filter(e=>e.type==='reviewer_usability.locked');
   if(locked.length!==1||locked[0].entityId!==s.id||
     locked[0].at!==s.issuedAt||locked[0].planned!==s.planned||
     locked[0].invitationFingerprint!==sig(s.invitations.map(x=>x.id))||
     locked[0].protocolFingerprint!==sig(PROTOCOL)||
     locked[0].pilotLockedAtAtIssue!==s.pilotLockedAtAtIssue)
     throw Error('Fixed invitation cohort no longer matches its original lock event.');
   const imports=db.events.filter(e=>e.type==='reviewer_usability.received');
   if(imports.length!==s.responses.length)
     throw Error('Usability response count and append-only import history do not match.');
   const seen=new Set();
   for(let i=0;i<s.responses.length;i++){
     const r=s.responses[i],e=imports[i],idx=s.invitations.findIndex(x=>x.id===r?.invitationId);
     if(!exact(r,['version','invitationId','receivedAt','fingerprint','submission'])||
       r.version!==1||idx<0||seen.has(r.invitationId)||!iso(r.receivedAt)||
       Date.parse(r.receivedAt)<Date.parse(s.issuedAt)||r.fingerprint!==sig(r.submission))
       throw Error('Invalid stored usability invitation response provenance.');
     seen.add(r.invitationId);
     try{validateResponse(r.submission,invite(s,idx));}catch{
       throw Error('Stored usability response does not match the issued fictional exercise or survey.');
     }
     if(e.entityId!==s.id||e.invitationId!==r.invitationId||
       e.at!==r.receivedAt||e.fingerprint!==r.fingerprint)
       throw Error('Original usability submission no longer matches its receipt event.');
   }
   return true;
 }
 return {FORMATS,METHOD,ITEMS,OBSTACLES,PROTOCOL,INSTRUCTIONS,
   start,issue,validateInvite,createResponse,validateResponse,importResponse,
   audit,exportCSV,exportSummary,validate};
});
