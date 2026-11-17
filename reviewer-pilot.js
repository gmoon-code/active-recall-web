/* Active Recall Web v4.5 — strictly local prospective reviewer-pilot registry.
   Consecutive capture happens at the original attempt, BEFORE later reviews.
   No retrospective selection, automatic grading, inferred learning, or scheduling change. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ActiveRecallReviewerPilot=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
 const P=(typeof module!=='undefined'&&module.exports)?require('./paired-review.js'):globalThis.ActiveRecallPairedReview;
 if(!H||!P)throw Error('Original human-review modules are required.');
 const METHOD='consecutive-reference-free-reviewer-pilot-v1';
 const PROTOCOL=Object.freeze({
   version:1,unit:'one-first-eligible-attempt-per-retrieval-target',
   selection:'consecutive-attempt-creation-order-after-local-protocol-lock',
   firstStage:'reference-answer-absent-from-initial-packet',
   reviewOrder:'two-locked-first-passes-before-any-reference-reveal',
   postStage:'optional-recorded-separately-no-imputation',
   criteria:'original-rubric-snapshot-not-current-rubric',
   exclusions:'not-written,not-explain-or-apply,assisted,immediate-post-study,unverified-requirement,missing-original-rubric,duplicate-target,clock-before-lock',
   analysis:'descriptive-status-and-missingness-counts-only',
   interpretation:'not-anonymous-not-preregistered-not-graded-not-scheduling-evidence'
 });
 const REASONS=new Set(['not_written','unsupported_kind','assisted','immediate_post_study',
   'unverified_requirement','missing_original_rubric','duplicate_target','clock_before_lock']);
 const STATUSES=new Set(['included','not_demonstrated','uncertain','unassessed','missing']);
 const iso=s=>typeof s==='string'&&s.length<=40&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
   Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
 const countEnrolled=entries=>entries.filter(x=>x.decision==='enrolled').length;
 const snapshot=a=>[
   a.id,a.createdAt,a.retrievalTargetId,a.activityKind,a.inputMode,a.assisted,a.practiceStage,
   a.requirementVerified,a.questionSnapshot,a.referenceSnapshot,a.response,a.rubricAtAttempt
 ];
 function attemptFingerprint(a){return H.fingerprint(JSON.stringify(snapshot(a)));}
 function reasonFor(a,pilot,entries){
   if(Date.parse(a.createdAt)<Date.parse(pilot.lockedAt))return 'clock_before_lock';
   if(!['explain','apply'].includes(a.activityKind))return 'unsupported_kind';
   if(a.inputMode!=='written'||!a.response?.trim())return 'not_written';
   if(a.assisted===true)return 'assisted';
   if(a.practiceStage==='immediate_post_study')return 'immediate_post_study';
   if(a.requirementVerified!==true)return 'unverified_requirement';
   if(!H.eligibility(a).ok)return 'missing_original_rubric';
   if(entries.some(x=>x.decision==='enrolled'&&x.targetId===a.retrievalTargetId))
     return 'duplicate_target';
   return null;
 }
 function entryFor(a,pilot,entries){
   const reason=reasonFor(a,pilot,entries);
   return {attemptId:a.id,screenedAt:a.createdAt,targetId:a.retrievalTargetId,
     originalFingerprint:attemptFingerprint(a),decision:reason?'excluded':'enrolled',reason};
 }
 function start(db,{plannedTargets=6,now=new Date(),confirmed=false}={}){
   if(db.reviewerPilot!==undefined)throw Error('A reviewer pilot is already registered in this browser. Its protocol and history cannot be replaced.');
   if(!confirmed)throw Error('Confirm you are locking the rules before recording new pilot attempts.');
   if(!Number.isSafeInteger(plannedTargets)||plannedTargets<3||plannedTargets>30)
     throw Error('Choose 3 to 30 distinct retrieval targets for a descriptive pilot.');
   if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid local registration timestamp.');
   if(!Array.isArray(db?.attempts)||!Array.isArray(db?.events))throw Error('Missing local history.');
   const pilot={version:1,method:METHOD,lockedAt:now.toISOString(),plannedTargets,
     baselineAttemptCount:db.attempts.length,protocol:{...PROTOCOL},entries:[],
     closedAt:null,closeReason:null,earlyStopNote:null,closeAfter:null};
   db.reviewerPilot=pilot;
   db.events.push({type:'reviewer_pilot.protocol_locked',entityId:'reviewer-pilot',at:pilot.lockedAt,
     plannedTargets,baselineAttemptCount:pilot.baselineAttemptCount});
   return pilot;
 }
 function observe(db,attempt){
   const p=db?.reviewerPilot;
   if(!p||p.closedAt!==null)return null;
   if(!attempt||db.attempts.at(-1)!==attempt)
     throw Error('Pilot screening must occur immediately after the original attempt is recorded.');
   if(db.attempts.length!==p.baselineAttemptCount+p.entries.length+1)
     throw Error('Pilot capture order mismatch; do not skip an eligible original attempt.');
   if(countEnrolled(p.entries)>=p.plannedTargets)throw Error('The fixed pilot quota is already complete.');
   const row=entryFor(attempt,p,p.entries);
   p.entries.push(row);
   db.events.push({type:'reviewer_pilot.screened',entityId:attempt.id,at:attempt.createdAt,
     decision:row.decision,reason:row.reason});
   if(countEnrolled(p.entries)===p.plannedTargets){
     p.closedAt=attempt.createdAt;p.closeReason='target_reached';p.closeAfter=p.entries.length;
     db.events.push({type:'reviewer_pilot.quota_reached',entityId:'reviewer-pilot',at:p.closedAt,
       plannedTargets:p.plannedTargets});
   }
   return row;
 }
 function stopEarly(db,{note='',now=new Date(),confirmed=false}={}){
   const p=db?.reviewerPilot;
   if(!p||p.closedAt!==null)throw Error('There is no open pilot to stop.');
   if(!confirmed)throw Error('Confirm this early stop will remain visible in the record.');
   if(typeof note!=='string'||note.trim().length<15||note.length>500)
     throw Error('Document the early-stop reason (15 to 500 characters).');
   if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(p.lockedAt))
     throw Error('Invalid early-stop date.');
   const prev=p.entries.at(-1);
   if(prev&&now.getTime()<Date.parse(prev.screenedAt))
     throw Error('Early stop cannot predate the latest pilot screening.');
   p.closedAt=now.toISOString();p.closeReason='stopped_early';
   p.earlyStopNote=note.trim();p.closeAfter=p.entries.length;
   db.events.push({type:'reviewer_pilot.stopped_early',entityId:'reviewer-pilot',at:p.closedAt,
     screened:p.entries.length});
   return p;
 }
 function rows(db){
   const p=db?.reviewerPilot;if(!p)return [];
   return p.entries.map((row,i)=>{
     const a=db.attempts[p.baselineAttemptCount+i];
     const pair=a?.independentReviewPair,originalA=pair?.A?.referenceFirstPass?pair.A:null,
       originalB=pair?.B?.referenceFirstPass?pair.B:null;
     const postA=(a?.referencePostReviews||[]).find(x=>x.slot==='A')||null,
       postB=(a?.referencePostReviews||[]).find(x=>x.slot==='B')||null;
     const c=originalA&&originalB?P.comparison(a):null;
     return {caseNumber:i+1,attemptId:row.attemptId,decision:row.decision,reason:row.reason,
       firstA:!!originalA,firstB:!!originalB,postA:!!postA,postB:!!postB,
       complete:!!c,comparable:c?.comparable??0,agree:c?.agreements??0,
       disagree:c?.disagreements??0,nondecisive:c?.uncertainOrUnassessed??0,
       otherReview:!!pair?.A&&!originalA||!!pair?.B&&!originalB,
       criterionCount:H.rubricForAttempt(a).length};
   });
 }
 function audit(db){
   const p=db?.reviewerPilot;if(!p)return null;
   const rr=rows(db),enrolled=rr.filter(x=>x.decision==='enrolled'),
     excluded=rr.filter(x=>x.decision==='excluded'),paired=enrolled.filter(x=>x.complete);
   const categories=Object.fromEntries([...REASONS].map(reason=>[reason,excluded.filter(x=>x.reason===reason).length]));
   return {version:1,lockedAt:p.lockedAt,plannedTargets:p.plannedTargets,
     status:p.closedAt?p.closeReason:'collecting',screened:rr.length,
     enrolled:enrolled.length,excluded:excluded.length,paired:paired.length,
     awaitingA:enrolled.filter(x=>!x.firstA).length,
     awaitingB:enrolled.filter(x=>x.firstA&&!x.firstB).length,
     legacyReviewConflicts:enrolled.filter(x=>x.otherReview).length,
     noPostA:paired.filter(x=>!x.postA).length,
     noPostB:paired.filter(x=>!x.postB).length,
     postA:paired.filter(x=>x.postA).length,postB:paired.filter(x=>x.postB).length,
     comparable:paired.reduce((n,x)=>n+x.comparable,0),
     agreements:paired.reduce((n,x)=>n+x.agree,0),
     disagreements:paired.reduce((n,x)=>n+x.disagree,0),
     nondecisive:paired.reduce((n,x)=>n+x.nondecisive,0),
     exclusions:categories,rows:rr,
     warning:'Locally locked descriptive pilot, NOT an independently timestamped preregistration. Automated consecutive screening begins with future attempts only. Unfinished reviewer files and post-reference stages are missing observations, not zero scores. Reviewers are not identity-verified, and references may be seen outside the app. No correctness, calibration, efficacy or scheduling claims follow from these counts.'};
 }
 const status=(entry,criterionId)=>entry?.criteria.find(c=>c.criterionId===criterionId)?.status||'missing';
 const postStatus=(entry,criterionId)=>entry?.submission?.findings.find(c=>c.criterionId===criterionId)?.status||'missing';
 function exportCSV(db){
   const p=db?.reviewerPilot;if(!p)throw Error('Lock a reviewer pilot before exporting data.');
   validate(db);
   const header=['screen_order','case','criterion_index','screening','exclusion_reason','A_first',
     'B_first','A_post','B_post','first_comparable','first_agree','A_changed','B_changed'];
   const out=[header.join(',')];
   p.entries.forEach((row,i)=>{
     const a=db.attempts[p.baselineAttemptCount+i];
     if(row.decision==='excluded'){
       out.push([i+1,'case_'+String(i+1).padStart(3,'0'),'','excluded',row.reason,'','','','','','','',''].join(','));
       return;
     }
     const pair=a.independentReviewPair,A=pair?.A?.referenceFirstPass?pair.A:null,
       B=pair?.B?.referenceFirstPass?pair.B:null,original=H.rubricForAttempt(a);
     const posts=a.referencePostReviews||[],pA=posts.find(x=>x.slot==='A'),
       pB=posts.find(x=>x.slot==='B');
     original.forEach((criterion,j)=>{
       const x=status(A,criterion.criterionId),y=status(B,criterion.criterionId),
         za=postStatus(pA,criterion.criterionId),zb=postStatus(pB,criterion.criterionId);
       const comparable=['included','not_demonstrated'].includes(x)&&['included','not_demonstrated'].includes(y);
       const changes=(before,after)=>before==='missing'||after==='missing'?'missing':
         before==='uncertain'||after==='uncertain'||before==='unassessed'||after==='unassessed'?'nondecisive':
         before===after?'unchanged':'changed';
       out.push([i+1,'case_'+String(i+1).padStart(3,'0'),j+1,'enrolled','',
         x,y,za,zb,comparable?'yes':'no',comparable?(x===y?'yes':'no'):'not_comparable',
         changes(x,za),changes(y,zb)].join(','));
     });
   });
   // Fixed, internally-generated enums and numeric indexes only. No source text,
   // original IDs, timestamps, excerpts, names or attacker-controlled CSV formulas.
   return out.join('\r\n')+'\r\n';
 }
 function exportManifest(db){
   if(!db?.reviewerPilot)throw Error('Lock a pilot first.');
   validate(db);
   const p=db.reviewerPilot,a=audit(db);
   const {rows:ignored,...counts}=a;
   return {format:'arw-reviewer-pilot-summary-v1',version:1,
     protocol:{...p.protocol},localLockedAt:p.lockedAt,plannedTargets:p.plannedTargets,
     status:a.status,earlyStopDocumented:p.closeReason==='stopped_early',
     reportedCounts:counts,
     privacy:'No original answers, question text, reviewer rationales, notes, or internal attempt IDs exported.',
     note:'A mutable local lock is not a public preregistration. Counts are descriptive, not correctness or learning effects.'};
 }
 function validate(db){
   const p=db?.reviewerPilot;if(p===undefined)return true;
   if(!p||!exact(p,['version','method','lockedAt','plannedTargets','baselineAttemptCount','protocol',
     'entries','closedAt','closeReason','earlyStopNote','closeAfter'])||
     p.version!==1||p.method!==METHOD||!iso(p.lockedAt)||
     !Number.isSafeInteger(p.plannedTargets)||p.plannedTargets<3||p.plannedTargets>30||
     !Number.isSafeInteger(p.baselineAttemptCount)||p.baselineAttemptCount<0||
     p.baselineAttemptCount>db.attempts.length||!eq(p.protocol,PROTOCOL)||
     !Array.isArray(p.entries)||p.entries.length>100000)
     throw Error('Invalid locked pilot protocol or baseline in backup.');
   if((p.closedAt===null)!==(p.closeReason===null)||
     (p.closedAt===null)!==(p.closeAfter===null)||
     (p.closeReason!=='stopped_early'&&p.earlyStopNote!==null)||
     (p.closeReason==='stopped_early'&&
       (typeof p.earlyStopNote!=='string'||p.earlyStopNote.length<15||p.earlyStopNote.length>500))||
     (p.closedAt!==null&&(!iso(p.closedAt)||Date.parse(p.closedAt)<Date.parse(p.lockedAt)))||
     (p.closeReason!==null&&!['target_reached','stopped_early'].includes(p.closeReason))||
     (p.closeAfter!==null&&(!Number.isSafeInteger(p.closeAfter)||p.closeAfter!==p.entries.length)))
     throw Error('Invalid pilot close-out provenance.');
   const subsequent=db.attempts.slice(p.baselineAttemptCount);
   const windowLength=p.closedAt!==null?p.closeAfter:subsequent.length;
   if(p.entries.length!==windowLength||p.entries.length>subsequent.length)
     throw Error('A prospective pilot screening record was skipped or fabricated.');
   const reconstructed=[];
   for(let i=0;i<p.entries.length;i++){
     if(countEnrolled(reconstructed)>=p.plannedTargets)
       throw Error('Pilot screening continued after the fixed quota was reached.');
     const a=subsequent[i],stored=p.entries[i];
     const expected=entryFor(a,p,reconstructed);
     if(!exact(stored,['attemptId','screenedAt','targetId','originalFingerprint','decision','reason'])||
       !eq(stored,expected)||stored.decision!=='excluded'&&stored.decision!=='enrolled'||
       stored.reason!==null&&!REASONS.has(stored.reason))
       throw Error('Pilot entry no longer matches consecutive original study attempts.');
     reconstructed.push(expected);
   }
   const enrolled=countEnrolled(reconstructed);
   if(p.closeReason==='target_reached'&&
     (enrolled!==p.plannedTargets||p.closedAt!==p.entries.at(-1)?.screenedAt))
     throw Error('Invalid declared completion of the preselected pilot target count.');
   if(p.closeReason==='stopped_early'&&enrolled>=p.plannedTargets)
     throw Error('Early stop cannot replace quota completion.');
   if(p.closedAt===null&&enrolled>=p.plannedTargets)
     throw Error('A completed quota must close the pilot automatically.');
   if(p.closeReason==='target_reached'&&p.closeAfter!==p.entries.length)
     throw Error('Invalid quota closure sequence.');
   return true;
 }
 return {METHOD,PROTOCOL,start,observe,stopEarly,attemptFingerprint,audit,rows,exportCSV,exportManifest,validate};
});
