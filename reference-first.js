/* Active Recall Web v4.4 — versioned, reference-withheld first-pass review.
   First request has NO saved reference answer. Later reveal is separately issued.
   All human labels and claimed lack of prior exposure are unverified self-report. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallReferenceFirst=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
 const P=(typeof module!=='undefined'&&module.exports)?require('./paired-review.js'):globalThis.ActiveRecallPairedReview;
 const R=(typeof module!=='undefined'&&module.exports)?require('./review-packets.js'):globalThis.ActiveRecallReviewPackets;
 if(!H||!P||!R)throw Error('Missing local review modules.');
 const FORMATS={request:'arw-reference-free-request-v1',first:'arw-reference-free-first-pass-v1',
   reveal:'arw-reference-reveal-v1',post:'arw-post-reference-review-v1'};
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const ROLES=new Set(['self','other_person']),SLOTS=new Set(['A','B']);
 const reqFields=['format','version','requestId','issuedAt','snapshotFingerprint','attempt'];
 const firstFields=['format','version','requestId','snapshotFingerprint','attemptId','slot','reviewerRole',
   'completedAt','confirmed','differentPersonAttested','noPriorJudgmentsAttested',
   'referenceUnseenAttested','findings','note'];
 const postFields=['format','version','requestId','snapshotFingerprint','attemptId','slot','reviewerRole',
   'completedAt','firstSubmissionFingerprint','referenceSeenAttested','confirmed','findings','note'];
 const revealFields=['format','version','requestId','snapshotFingerprint','attemptId','slot',
   'firstSubmissionFingerprint','reference'];
 const exact=(o,fields)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===fields.slice().sort().join('|');
 const iso=s=>typeof s==='string'&&s.length<=40&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
 const sig=x=>H.fingerprint(JSON.stringify(x));
 function savedAttempt(db,id){
   const a=db?.attempts?.find(x=>x.id===id);
   if(!a)throw Error('The original saved attempt was not found in this browser.');
   const e=H.eligibility(a);if(!e.ok)throw Error(e.reason);
   return a;
 }
 function withoutReference(a){
   const snap=R.snapshot(a);
   const {reference,...rest}=snap;
   return rest;
 }
 function validateSnapshot(a){
   if(!exact(a,['attemptId','attemptAt','question','response','requirementVersion','targetVersion','activityVersion','criteria'])||
     !a.attemptId||typeof a.attemptId!=='string'||a.attemptId.length>160||
     !iso(a.attemptAt)||!a.question||typeof a.question!=='string'||a.question.length>500||
     !a.response||typeof a.response!=='string'||a.response.length>20000||
     ![a.requirementVersion,a.targetVersion,a.activityVersion].every(x=>Number.isSafeInteger(x)&&x>0)||
     !Array.isArray(a.criteria)||a.criteria.length<1||a.criteria.length>100)
     throw Error('The reference-free original-answer snapshot is invalid.');
   const seen=new Set();
   for(const c of a.criteria){
     if(!exact(c,['criterionId','version','textSnapshot'])||!c.criterionId||
       typeof c.criterionId!=='string'||c.criterionId.length>160||seen.has(c.criterionId)||
       !Number.isSafeInteger(c.version)||c.version<1||
       !c.textSnapshot||typeof c.textSnapshot!=='string'||c.textSnapshot.length>240)
       throw Error('The reference-free original rubric is invalid.');
     seen.add(c.criterionId);
   }
 }
 function requestFrom(a,r){
   return {format:FORMATS.request,version:1,requestId:r.id,issuedAt:r.issuedAt,
     snapshotFingerprint:r.snapshotFingerprint,attempt:withoutReference(a)};
 }
 function validateRequest(req){
   if(!exact(req,reqFields)||req.format!==FORMATS.request||req.version!==1||
     !UUID.test(req.requestId)||!iso(req.issuedAt)||
     typeof req.snapshotFingerprint!=='string'||!/^[0-9a-f]{8}$/.test(req.snapshotFingerprint)||
     JSON.stringify(req).length>100000)throw Error('Invalid reference-free review request file.');
   validateSnapshot(req.attempt);
   if(sig(req.attempt)!==req.snapshotFingerprint)throw Error('Reference-free request contents do not match their fingerprint.');
   return req;
 }
 function activeRequest(a){return (a.referenceFirstRequests||[]).findLast(r=>r.revokedAt===null)||null;}
 function issue(db,{attemptId,now=new Date(),requestId=null}={}){
   const a=savedAttempt(db,attemptId);
   if(a.independentReviewPair?.A)throw Error('The first review has already been recorded for this answer.');
   if((a.offlineReviewRequests||[]).some(r=>!r.revokedAt))
     throw Error('Revoke the existing v4.3 review packet before starting a reference-free workflow.');
   const prior=activeRequest(a);
   if(prior)return validateRequest(requestFrom(a,prior));
   if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(a.createdAt))
     throw Error('Review request time must follow the original attempt.');
   const id=requestId??(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():null);
   if(!UUID.test(id||''))throw Error('A secure UUID request ID is required.');
   if((a.referenceFirstRequests||[]).some(x=>x.id===id))throw Error('Request IDs cannot be reused.');
   if((a.referenceFirstRequests||[]).length>=5)throw Error('This answer has reached the reference-free request limit.');
   const rec={version:1,id,issuedAt:now.toISOString(),
     snapshotFingerprint:sig(withoutReference(a)),revokedAt:null};
   (a.referenceFirstRequests??=[]).push(rec);
   db.events.push({type:'reference_first.request_issued',entityId:a.id,requestId:id,at:rec.issuedAt});
   return validateRequest(requestFrom(a,rec));
 }
 function revoke(db,{attemptId,now=new Date()}={}){
   const a=savedAttempt(db,attemptId),rec=activeRequest(a);
   if(!rec)throw Error('No active reference-free request to revoke.');
   if(a.independentReviewPair?.A)throw Error('The first review is already imported. Preserve its original request.');
   if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(rec.issuedAt))
     throw Error('The request cannot be revoked before it was issued.');
   rec.revokedAt=now.toISOString();
   db.events.push({type:'reference_first.request_revoked',entityId:a.id,requestId:rec.id,at:rec.revokedAt});
   return rec;
 }
 function compact(request,findings){
   return P.buildFindings({response:request.attempt.response},
     request.attempt.criteria.map(c=>({criterionId:c.criterionId,version:c.version,textSnapshot:c.textSnapshot})),findings)
     .map(f=>({criterionId:f.criterionId,criterionVersion:f.criterionVersion,
       status:f.status,excerpt:f.excerpt,rationale:f.rationale}));
 }
 function createFirst(req,{slot,reviewerRole,findings,note='',confirmed=false,
   referenceUnseen=false,differentPerson=false,noPriorJudgments=false,
   completedAt=new Date().toISOString()}={}){
   validateRequest(req);
   if(!confirmed||!referenceUnseen)throw Error('Confirm an actual human assessment without seeing the reference answer.');
   if(!SLOTS.has(slot)||!ROLES.has(reviewerRole))throw Error('Select a reviewer slot and role.');
   if(slot==='B'&&(!differentPerson||!noPriorJudgments))
     throw Error('B must attest to being a different person and not consulting A.');
   if(!iso(completedAt)||typeof note!=='string'||note.length>3000)
     throw Error('Invalid first-pass timestamp or reviewer note.');
   const res={format:FORMATS.first,version:1,requestId:req.requestId,
     snapshotFingerprint:req.snapshotFingerprint,attemptId:req.attempt.attemptId,
     slot,reviewerRole,completedAt,confirmed:true,
     differentPersonAttested:slot==='B',noPriorJudgmentsAttested:slot==='B',
     referenceUnseenAttested:true,findings:compact(req,findings),note:note.trim()};
   return validateFirst(res,req);
 }
 function validateFirst(res,req){
   validateRequest(req);
   if(!exact(res,firstFields)||res.format!==FORMATS.first||res.version!==1||
     res.requestId!==req.requestId||res.snapshotFingerprint!==req.snapshotFingerprint||
     res.attemptId!==req.attempt.attemptId||!SLOTS.has(res.slot)||!ROLES.has(res.reviewerRole)||
     !iso(res.completedAt)||res.confirmed!==true||res.referenceUnseenAttested!==true||
     res.differentPersonAttested!==(res.slot==='B')||
     res.noPriorJudgmentsAttested!==(res.slot==='B')||
     typeof res.note!=='string'||res.note.length>3000||res.note!==res.note.trim()||
     !Array.isArray(res.findings)||JSON.stringify(res).length>240000)
     throw Error('Invalid, mismatched or incomplete first-pass response.');
   const checked=compact(req,res.findings);
   if(JSON.stringify(checked)!==JSON.stringify(res.findings))
     throw Error('First-pass criterion evidence does not match the original response.');
   return res;
 }
 function findIssued(db,raw){
   const a=savedAttempt(db,raw?.attemptId);
   const rec=(a.referenceFirstRequests||[]).find(r=>r.id===raw?.requestId);
   if(!rec)throw Error('Unknown reference-free request ID. Restore the original local backup first.');
   if(rec.revokedAt)throw Error('That reference-free request has been revoked.');
   return {a,rec,request:requestFrom(a,rec)};
 }
 function importFirst(db,raw,{now=new Date()}={}){
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>240000)
     throw Error('First-pass JSON file is malformed or too large.');
   const {a,rec,request}=findIssued(db,raw);
   validateFirst(raw,request);
   if(!(now instanceof Date)||!Number.isFinite(now.getTime())||
     now.getTime()<Date.parse(rec.issuedAt))throw Error('Import time must follow issuance.');
   const pair=a.independentReviewPair;
   if(raw.slot==='A'&&pair)throw Error('Reviewer A already has an original judgment.');
   if(raw.slot==='B'&&(!pair?.A||pair.B))
     throw Error('Import first-pass Reviewer A first. Reviewer B can only be imported once.');
   if(raw.slot==='B'&&!pair.A.referenceFirstPass)
     throw Error('Reviewer A must be a reference-free first pass too; mixing methods is not supported.');
   if(raw.slot==='B'&&pair.A.referenceFirstPass.requestId!==raw.requestId)
     throw Error('Both reference-free first passes must use the same issued request.');
   const saved=P.recordReviewer(db,{attemptId:a.id,slot:raw.slot,reviewerRole:raw.reviewerRole,
     findings:raw.findings,note:raw.note,confirmed:true,
     differentPerson:raw.differentPersonAttested,noPriorJudgments:raw.noPriorJudgmentsAttested,now});
   saved.referenceFirstPass={version:1,requestId:raw.requestId,submittedAt:raw.completedAt,
     importedAt:saved.reviewedAt,submission:JSON.parse(JSON.stringify(raw))};
   db.events.push({type:'reference_first.first_imported',entityId:a.id,requestId:raw.requestId,
     slot:raw.slot,at:saved.reviewedAt});
   return saved;
 }
 function firstFor(a,slot){
   if(!SLOTS.has(slot))throw Error('Choose reviewer A or B.');
   const saved=a.independentReviewPair?.[slot];
   if(!saved?.referenceFirstPass)throw Error('Import the locked first-pass assessment before releasing the reference answer.');
   return saved;
 }
 function reveal(db,{attemptId,slot}={}){
   const a=savedAttempt(db,attemptId),saved=firstFor(a,slot);
   if(!a.independentReviewPair?.A?.referenceFirstPass||!a.independentReviewPair?.B?.referenceFirstPass)
     throw Error('Import locked first passes from BOTH reviewers before releasing the reference.');
   const {requestId,submission}=saved.referenceFirstPass;
   const rec=(a.referenceFirstRequests||[]).find(r=>r.id===requestId);
   if(!rec||rec.revokedAt)throw Error('Reference-free request is missing or revoked.');
   return validateReveal({format:FORMATS.reveal,version:1,requestId,
     snapshotFingerprint:rec.snapshotFingerprint,attemptId:a.id,slot,
     firstSubmissionFingerprint:sig(submission),reference:a.referenceSnapshot});
 }
 function validateReveal(raw){
   if(!exact(raw,revealFields)||raw.format!==FORMATS.reveal||raw.version!==1||
     !UUID.test(raw.requestId)||!/^[0-9a-f]{8}$/.test(raw.snapshotFingerprint)||
     !/^[0-9a-f]{8}$/.test(raw.firstSubmissionFingerprint)||!SLOTS.has(raw.slot)||
     typeof raw.attemptId!=='string'||!raw.attemptId||raw.attemptId.length>160||
     typeof raw.reference!=='string'||!raw.reference.trim()||raw.reference.length>8000||
     JSON.stringify(raw).length>12000)
     throw Error('Invalid post-lock reference-reveal file.');
   return raw;
 }
 function createPost(req,first,revealPacket,{findings,note='',confirmed=false,
   referenceSeen=false,completedAt=new Date().toISOString()}={}){
   validateFirst(first,req);validateReveal(revealPacket);
   if(revealPacket.requestId!==req.requestId||revealPacket.attemptId!==req.attempt.attemptId||
     revealPacket.snapshotFingerprint!==req.snapshotFingerprint||revealPacket.slot!==first.slot||
     revealPacket.firstSubmissionFingerprint!==sig(first))
     throw Error('Reference reveal does not match the original locked first pass.');
   if(!confirmed||!referenceSeen)throw Error('Confirm that a person reviewed the reference only after locking their first pass.');
   if(!iso(completedAt)||typeof note!=='string'||note.length>3000)throw Error('Invalid post-reference timestamp or note.');
   const post={format:FORMATS.post,version:1,requestId:req.requestId,
     snapshotFingerprint:req.snapshotFingerprint,attemptId:req.attempt.attemptId,
     slot:first.slot,reviewerRole:first.reviewerRole,completedAt,
     firstSubmissionFingerprint:sig(first),referenceSeenAttested:true,confirmed:true,
     findings:compact(req,findings),note:note.trim()};
   return validatePost(post,req,first);
 }
 function validatePost(post,req,first){
   validateFirst(first,req);
   if(!exact(post,postFields)||post.format!==FORMATS.post||post.version!==1||
     post.requestId!==req.requestId||post.snapshotFingerprint!==req.snapshotFingerprint||
     post.attemptId!==req.attempt.attemptId||post.slot!==first.slot||
     post.reviewerRole!==first.reviewerRole||post.firstSubmissionFingerprint!==sig(first)||
     post.referenceSeenAttested!==true||post.confirmed!==true||!iso(post.completedAt)||
     typeof post.note!=='string'||post.note.length>3000||post.note!==post.note.trim()||
     !Array.isArray(post.findings)||JSON.stringify(post).length>240000)
     throw Error('Post-reference response is invalid or does not match its locked first pass.');
   const checked=compact(req,post.findings);
   if(JSON.stringify(checked)!==JSON.stringify(post.findings))
     throw Error('Post-reference evidence differs from the original submitted response.');
   return post;
 }
 function importPost(db,raw,{now=new Date()}={}){
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>240000)
     throw Error('Post-reference response file is malformed or too large.');
   const {a,rec,request}=findIssued(db,raw);
   const first=firstFor(a,raw.slot);
   if(first.referenceFirstPass.requestId!==raw.requestId)throw Error('Reference-free request mismatch.');
   if((a.referencePostReviews||[]).some(r=>r.slot===raw.slot))
     throw Error('This reviewer already has a post-reference judgment. Original reviews are immutable.');
   validatePost(raw,request,first.referenceFirstPass.submission);
   if(!(now instanceof Date)||!Number.isFinite(now.getTime())||
     now.getTime()<Date.parse(first.reviewedAt))throw Error('Post-reference import cannot predate the locked first-pass import.');
   const firstFindings=first.criteria.map(f=>({criterionId:f.criterionId,criterionVersion:f.criterionVersion,
     status:f.status,excerpt:f.excerpt,rationale:f.rationale}));
   const changes=raw.findings.map((f,i)=>({criterionId:f.criterionId,
     before:firstFindings[i].status,after:f.status,changed:f.status!==firstFindings[i].status}));
   const recPost={version:1,slot:raw.slot,requestId:raw.requestId,
     firstSubmissionFingerprint:sig(first.referenceFirstPass.submission),
     submittedAt:raw.completedAt,importedAt:now.toISOString(),submission:JSON.parse(JSON.stringify(raw)),
     submissionFingerprint:sig(raw),changes};
   (a.referencePostReviews??=[]).push(recPost);
   db.events.push({type:'reference_first.post_imported',entityId:a.id,requestId:raw.requestId,slot:raw.slot,at:recPost.importedAt});
   return recPost;
 }
 function audit(db){
   const attempts=(db?.attempts||[]).filter(a=>a.independentReviewPair?.A?.referenceFirstPass);
   const paired=attempts.filter(a=>a.independentReviewPair?.B?.referenceFirstPass).length;
   let posts=0,changed=0,unchanged=0,unassessed=0;
   for(const a of attempts)for(const r of a.referencePostReviews||[]){
     posts++;
     for(const c of r.changes){
       if(c.before==='unassessed'||c.after==='unassessed'||c.before==='uncertain'||c.after==='uncertain')unassessed++;
       else if(c.changed)changed++;else unchanged++;
     }
   }
   return {attempts:attempts.length,paired,posts,changed,unchanged,nondecisive:unassessed,
     warning:'Changes after reference reveal are descriptive, not corrections certified by experts or evidence that seeing a key improved correctness. The reference is withheld from the request, but rubric wording and prior outside knowledge may disclose the expected answer; the app cannot verify reviewer conduct, timing, identity or reference exposure.'};
 }
 function validate(db){
   if(!Array.isArray(db?.attempts))throw Error('Invalid review attempts.');
   for(const a of db.attempts){
     const hist=a.referenceFirstRequests;
     if(hist!==undefined){
       if(!Array.isArray(hist)||hist.length>5)throw Error('Invalid historical reference-free requests.');
       const ids=new Set();
       for(const r of hist){
         if(!exact(r,['version','id','issuedAt','snapshotFingerprint','revokedAt'])||
           r.version!==1||!UUID.test(r.id)||ids.has(r.id)||!iso(r.issuedAt)||
           Date.parse(r.issuedAt)<Date.parse(a.createdAt)||
           r.snapshotFingerprint!==sig(withoutReference(a))||
           (r.revokedAt!==null&&(!iso(r.revokedAt)||Date.parse(r.revokedAt)<Date.parse(r.issuedAt))))
           throw Error('Invalid historical reference-free request or original snapshot.');
         ids.add(r.id);
       }
       if(hist.filter(r=>r.revokedAt===null).length>1)throw Error('Only one reference-free request may be active.');
     }
     const pair=a.independentReviewPair;
     for(const entry of [pair?.A,pair?.B]){
       if(!entry?.referenceFirstPass)continue;
       const meta=entry.referenceFirstPass;
       if(!exact(meta,['version','requestId','submittedAt','importedAt','submission'])||
         meta.version!==1||meta.importedAt!==entry.reviewedAt||!iso(meta.submittedAt)||
         !iso(meta.importedAt))throw Error('Invalid locked first-pass provenance.');
       const rec=(hist||[]).find(r=>r.id===meta.requestId);
       if(!rec||rec.revokedAt)throw Error('Locked first pass has no unrevoked issued request.');
       const req=requestFrom(a,rec);
       try{validateFirst(meta.submission,req);}
       catch{throw Error('Locked first-pass submission fails independent evidence validation.');}
       const f=meta.submission;
       if(f.slot!==entry.slot||f.reviewerRole!==entry.reviewerRole||f.note!==entry.note||
         f.differentPersonAttested!==entry.differentPersonAttested||
         f.noPriorJudgmentsAttested!==entry.priorJudgmentsHiddenAttested||
         JSON.stringify(f.findings)!==JSON.stringify(entry.criteria.map(c=>({
           criterionId:c.criterionId,criterionVersion:c.criterionVersion,status:c.status,
           excerpt:c.excerpt,rationale:c.rationale}))))
         throw Error('Saved first-pass ratings differ from the locked original submission.');
     }
     if(pair?.A?.referenceFirstPass&&pair?.B&&!pair.B.referenceFirstPass)
       throw Error('Reference-free A cannot be mixed with a differently sourced B.');
     if(pair?.B?.referenceFirstPass&&!pair?.A?.referenceFirstPass)
       throw Error('Reference-free B requires reference-free A.');
     if(a.referencePostReviews!==undefined){
       if(!Array.isArray(a.referencePostReviews)||a.referencePostReviews.length>2)
         throw Error('Invalid post-reference history.');
       const slots=new Set();
       for(const p of a.referencePostReviews){
         if(!exact(p,['version','slot','requestId','firstSubmissionFingerprint','submittedAt','importedAt','submission','submissionFingerprint','changes'])||
           p.version!==1||!SLOTS.has(p.slot)||slots.has(p.slot)||!iso(p.submittedAt)||!iso(p.importedAt)||
           p.submissionFingerprint!==sig(p.submission))
           throw Error('Invalid post-reference provenance.');
         slots.add(p.slot);
         const first=pair?.[p.slot];
         if(!first?.referenceFirstPass||!pair?.A?.referenceFirstPass||!pair?.B?.referenceFirstPass||
           p.requestId!==first.referenceFirstPass.requestId||
           p.firstSubmissionFingerprint!==sig(first.referenceFirstPass.submission)||
           Date.parse(p.importedAt)<Date.parse(first.reviewedAt))
           throw Error('Post-reference review is unbound to its locked first pass.');
         const rec=(hist||[]).find(x=>x.id===p.requestId);if(!rec||rec.revokedAt)
           throw Error('Post-reference request missing or revoked.');
         const req=requestFrom(a,rec);
         try{validatePost(p.submission,req,first.referenceFirstPass.submission);}
         catch{throw Error('Post-reference submission fails independent validation.');}
         const firstStatus=first.criteria.map(c=>c.status);
         const changed=p.submission.findings.map((f,i)=>({criterionId:f.criterionId,before:firstStatus[i],
           after:f.status,changed:f.status!==firstStatus[i]}));
         if(JSON.stringify(changed)!==JSON.stringify(p.changes))
           throw Error('Post-reference criterion changes were altered.');
       }
     }
   }
   return true;
 }
 return {FORMATS,withoutReference,validateRequest,activeRequest,issue,revoke,
   createFirst,validateFirst,importFirst,reveal,validateReveal,createPost,validatePost,
   importPost,audit,validate};
});
