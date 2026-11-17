/* Active Recall Web v4.3: offline one-attempt reviewer packet exchange.
 * No network, no AI, no account, no calendar changes.
 * Non-cryptographic fingerprints are mismatch detectors, not signatures. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ActiveRecallReviewPackets=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
  const P=(typeof module!=='undefined'&&module.exports)?require('./paired-review.js'):globalThis.ActiveRecallPairedReview;
  if(!H||!P)throw Error('Missing human review modules.');
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ROLES=new Set(['self','other_person']),SLOTS=new Set(['A','B']);
  const STATUS=new Set(['included','not_demonstrated','uncertain','unassessed']);
  const REQ_FORMAT='arw-offline-review-request-v1',SUB_FORMAT='arw-offline-review-response-v1';
  const MAX_REQ=120000,MAX_RESP=270000;
  const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&
    Object.keys(o).sort().join('|')===expected.slice().sort().join('|');
  const timeOk=x=>typeof x==='string'&&x.length<=40&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
  function snapshot(attempt){
    const e=H.eligibility(attempt);
    if(!e.ok)throw Error(e.reason);
    return {attemptId:attempt.id,attemptAt:attempt.createdAt,question:attempt.questionSnapshot,
      reference:attempt.referenceSnapshot,response:attempt.response,
      requirementVersion:attempt.requirementVersion,targetVersion:attempt.retrievalTargetVersion,
      activityVersion:attempt.activityVersion,
      criteria:e.criteria.map(c=>({criterionId:c.criterionId,version:c.version,textSnapshot:c.textSnapshot}))};
  }
  function validateSnapshot(a){
    if(!keys(a,['attemptId','attemptAt','question','reference','response','requirementVersion','targetVersion','activityVersion','criteria'])||
      typeof a.attemptId!=='string'||!a.attemptId||a.attemptId.length>160||!timeOk(a.attemptAt)||
      typeof a.question!=='string'||!a.question.trim()||a.question.length>500||
      typeof a.reference!=='string'||!a.reference.trim()||a.reference.length>8000||
      typeof a.response!=='string'||!a.response.trim()||a.response.length>20000||
      ![a.requirementVersion,a.targetVersion,a.activityVersion].every(x=>Number.isSafeInteger(x)&&x>0)||
      !Array.isArray(a.criteria)||a.criteria.length<1||a.criteria.length>100)
      throw Error('Invalid original-answer snapshot in reviewer packet.');
    const seen=new Set();
    for(const c of a.criteria){
      if(!keys(c,['criterionId','version','textSnapshot'])||
        typeof c.criterionId!=='string'||!c.criterionId||c.criterionId.length>160||seen.has(c.criterionId)||
        !Number.isSafeInteger(c.version)||c.version<1||
        typeof c.textSnapshot!=='string'||!c.textSnapshot.trim()||c.textSnapshot.length>240)
        throw Error('Invalid historical rubric in reviewer packet.');
      seen.add(c.criterionId);
    }
  }
  function fingerprint(a){return H.fingerprint(JSON.stringify(a));}
  function requestFor(a,r){
    return {format:REQ_FORMAT,version:1,requestId:r.id,issuedAt:r.issuedAt,
      snapshotFingerprint:r.snapshotFingerprint,attempt:snapshot(a)};
  }
  function validateRequest(req){
    if(!keys(req,['format','version','requestId','issuedAt','snapshotFingerprint','attempt'])||
      req.format!==REQ_FORMAT||req.version!==1||!UUID.test(req.requestId)||!timeOk(req.issuedAt)||
      !/^[0-9a-f]{8}$/.test(req.snapshotFingerprint)||JSON.stringify(req).length>MAX_REQ)
      throw Error('Not a supported Active Recall Web offline review request.');
    validateSnapshot(req.attempt);
    if(fingerprint(req.attempt)!==req.snapshotFingerprint)throw Error('Request snapshot fingerprint does not match its contents.');
    return req;
  }
  function activeRequest(attempt){
    return (attempt.offlineReviewRequests||[]).findLast(r=>!r.revokedAt)||null;
  }
  function issueRequest(db,{attemptId,requestId=null,now=new Date()}={}){
    const a=db?.attempts?.find(x=>x.id===attemptId);
    if(!a)throw Error('Saved attempt not found.');
    if(a.independentReviewPair?.B)throw Error('This answer already has two original reviews. Export a different attempt.');
    const snap=snapshot(a);
    const existing=activeRequest(a);
    if(existing)return validateRequest(requestFor(a,existing));
    if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(a.createdAt))
      throw Error('Request must be created after the original attempt.');
    const random=requestId??(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():null);
    if(!UUID.test(random||''))throw Error('Secure random request IDs are unavailable. Use a modern secure browser.');
    if((a.offlineReviewRequests||[]).some(r=>r.id===random))throw Error('Do not reuse a previous request ID.');
    if((a.offlineReviewRequests||[]).length>=10)throw Error('This attempt has reached its request history limit.');
    const r={version:1,id:random,issuedAt:now.toISOString(),snapshotFingerprint:fingerprint(snap),revokedAt:null};
    if(!a.offlineReviewRequests)a.offlineReviewRequests=[];
    a.offlineReviewRequests.push(r);
    db.events.push({type:'offline_review.request_issued',entityId:a.id,requestId:r.id,at:r.issuedAt});
    return validateRequest(requestFor(a,r));
  }
  function revokeRequest(db,{attemptId,now=new Date()}={}){
    const a=db?.attempts?.find(x=>x.id===attemptId),r=a&&activeRequest(a);
    if(!r)throw Error('No active reviewer request to revoke.');
    if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(r.issuedAt))
      throw Error('Revocation time must follow issuance.');
    r.revokedAt=now.toISOString();
    db.events.push({type:'offline_review.request_revoked',entityId:a.id,requestId:r.id,at:r.revokedAt});
    return r;
  }
  function compactFindings(snapshot,raw){
    const normalized=P.buildFindings({response:snapshot.response},
      snapshot.criteria.map(c=>({...c})),raw);
    return normalized.map(x=>({criterionId:x.criterionId,criterionVersion:x.criterionVersion,
      status:x.status,excerpt:x.excerpt,rationale:x.rationale}));
  }
  function createSubmission(req,{slot,reviewerRole,findings,note='',confirmed=false,
    differentPerson=false,noPriorJudgments=false,completedAt=new Date().toISOString()}={}){
    validateRequest(req);
    if(!confirmed)throw Error('The human reviewer must explicitly confirm their assessment.');
    if(!SLOTS.has(slot)||!ROLES.has(reviewerRole))throw Error('Choose a valid reviewer slot and role.');
    if(slot==='B'&&(!differentPerson||!noPriorJudgments))
      throw Error('Reviewer B must attest to independence from Reviewer A.');
    if(typeof note!=='string'||note.length>3000||!timeOk(completedAt))throw Error('Invalid reviewer note or completion date.');
    const checked=compactFindings(req.attempt,findings);
    const res={format:SUB_FORMAT,version:1,requestId:req.requestId,
      snapshotFingerprint:req.snapshotFingerprint,attemptId:req.attempt.attemptId,
      slot,reviewerRole,completedAt,confirmed:true,
      differentPersonAttested:slot==='B',noPriorJudgmentsAttested:slot==='B',
      findings:checked,note:note.trim()};
    return validateSubmission(res,req);
  }
  function validateSubmission(res,req){
    validateRequest(req);
    if(!keys(res,['format','version','requestId','snapshotFingerprint','attemptId','slot','reviewerRole','completedAt','confirmed','differentPersonAttested','noPriorJudgmentsAttested','findings','note'])||
      res.format!==SUB_FORMAT||res.version!==1||res.requestId!==req.requestId||
      res.snapshotFingerprint!==req.snapshotFingerprint||res.attemptId!==req.attempt.attemptId||
      !SLOTS.has(res.slot)||!ROLES.has(res.reviewerRole)||!timeOk(res.completedAt)||
      res.confirmed!==true||res.differentPersonAttested!==(res.slot==='B')||
      res.noPriorJudgmentsAttested!==(res.slot==='B')||
      typeof res.note!=='string'||res.note.length>3000||res.note!==res.note.trim()||
      !Array.isArray(res.findings)||JSON.stringify(res).length>MAX_RESP)
      throw Error('Invalid, mismatched or incomplete offline reviewer response.');
    const expected=compactFindings(req.attempt,res.findings);
    if(JSON.stringify(expected)!==JSON.stringify(res.findings))throw Error('Review evidence is inconsistent with the original source.');
    return res;
  }
  function importSubmission(db,raw,{now=new Date()}={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>MAX_RESP)
      throw Error('Offline reviewer response file is invalid or too large.');
    const a=db?.attempts?.find(x=>x.id===raw.attemptId);
    if(!a)throw Error('No matching original written attempt exists in this browser.');
    const record=(a.offlineReviewRequests||[]).find(r=>r.id===raw.requestId);
    if(!record)throw Error('Unknown reviewer request. This may belong to another browser or a different exported backup.');
    if(record.revokedAt)throw Error('This request was revoked. Export and review a current request instead.');
    const request=requestFor(a,record);
    validateSubmission(raw,request);
    if(!(now instanceof Date)||!Number.isFinite(now.getTime())||
      now.getTime()<Date.parse(a.createdAt)||now.getTime()<Date.parse(record.issuedAt))
      throw Error('Import time is invalid.');
    const old=a.independentReviewPair;
    if(raw.slot==='A'&&old)throw Error('Reviewer A already exists; this response cannot overwrite it.');
    if(raw.slot==='B'&&(!old?.A||old.B))
      throw Error('Import Reviewer A first. Reviewer B may be imported only once.');
    // This timestamp records when the offline file was IMPORTED, not its
    // self-reported completion time. Thus B may have finished before A.
    const entry=P.recordReviewer(db,{attemptId:a.id,slot:raw.slot,reviewerRole:raw.reviewerRole,
      findings:raw.findings,note:raw.note,confirmed:true,
      differentPerson:raw.differentPersonAttested,noPriorJudgments:raw.noPriorJudgmentsAttested,
      now});
    entry.offlinePacket={version:1,requestId:raw.requestId,completedAt:raw.completedAt,
      importedAt:entry.reviewedAt,submission:JSON.parse(JSON.stringify(raw))};
    db.events.push({type:'offline_review.response_imported',entityId:a.id,requestId:raw.requestId,
      slot:raw.slot,at:entry.reviewedAt});
    return entry;
  }
  function validate(db){
    if(!Array.isArray(db?.attempts))throw Error('Invalid attempt list.');
    for(const a of db.attempts){
      if(a.offlineReviewRequests!==undefined){
        if(!Array.isArray(a.offlineReviewRequests)||a.offlineReviewRequests.length>10)
          throw Error('Invalid offline review request history.');
        const ids=new Set();
        for(const r of a.offlineReviewRequests){
          if(!keys(r,['version','id','issuedAt','snapshotFingerprint','revokedAt'])||
            r.version!==1||!UUID.test(r.id)||ids.has(r.id)||
            !timeOk(r.issuedAt)||Date.parse(r.issuedAt)<Date.parse(a.createdAt)||
            !/^[0-9a-f]{8}$/.test(r.snapshotFingerprint)||r.snapshotFingerprint!==fingerprint(snapshot(a))||
            (r.revokedAt!==null&&(!timeOk(r.revokedAt)||Date.parse(r.revokedAt)<Date.parse(r.issuedAt))))
            throw Error('Invalid saved offline reviewer request.');
          ids.add(r.id);
        }
        if(a.offlineReviewRequests.filter(r=>r.revokedAt===null).length>1)
          throw Error('There cannot be multiple active reviewer requests for one attempt.');
      }
      const pair=a.independentReviewPair;
      if(!pair)continue;
      for(const entry of [pair.A,pair.B]){
        if(!entry?.offlinePacket)continue;
        const p=entry.offlinePacket;
        if(!keys(p,['version','requestId','completedAt','importedAt','submission'])||
          p.version!==1||!timeOk(p.completedAt)||!timeOk(p.importedAt)||
          p.importedAt!==entry.reviewedAt||p.requestId!==p.submission?.requestId)
          throw Error('Invalid offline reviewer provenance.');
        const r=(a.offlineReviewRequests||[]).find(x=>x.id===p.requestId);
        if(!r)throw Error('Offline review has no corresponding issued request.');
        const req=requestFor(a,r);
        try{validateSubmission(p.submission,req);}
        catch{throw Error('Offline reviewer response no longer matches original evidence.');}
        if(entry.slot!==p.submission.slot||entry.reviewerRole!==p.submission.reviewerRole||
          entry.note!==p.submission.note||
          entry.differentPersonAttested!==p.submission.differentPersonAttested||
          entry.priorJudgmentsHiddenAttested!==p.submission.noPriorJudgmentsAttested||
          JSON.stringify(entry.criteria.map(x=>({criterionId:x.criterionId,criterionVersion:x.criterionVersion,
            status:x.status,excerpt:x.excerpt,rationale:x.rationale})))!==JSON.stringify(p.submission.findings))
          throw Error('Imported reviewer results do not match their original response file.');
      }
    }
    return true;
  }
  return {REQ_FORMAT,SUB_FORMAT,snapshot,validateRequest,issueRequest,revokeRequest,activeRequest,
    createSubmission,validateSubmission,importSubmission,validate};
});
