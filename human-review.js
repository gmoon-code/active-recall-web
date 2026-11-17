/* Active Recall Web v4.1: deliberate, append-only human review of written explanations.
   No automatic semantic grading. Never changes a scheduled interval. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ActiveRecallHumanReview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KINDS=new Set(['explain','apply']);
  const STATUS=new Set(['included','not_demonstrated','uncertain','unassessed']);
  const ROLES=new Set(['self','other_person']);
  function rubricForAttempt(attempt){
    if(Array.isArray(attempt?.rubricAtAttempt))return attempt.rubricAtAttempt;
    // Earlier recorded checks preserve their original criterion versions and wording.
    // They are incomplete when the learner left criteria unmarked; do not fill the gaps
    // by borrowing today's potentially revised rubric.
    return Array.isArray(attempt?.criterionChecks)?attempt.criterionChecks.filter(c=>
      c&&typeof c.criterionId==='string'&&Number.isInteger(c.version)&&typeof c.textSnapshot==='string'): [];
  }
  function eligibility(attempt){
    if(!attempt)return {ok:false,reason:'Attempt not found.',criteria:[]};
    if(!KINDS.has(attempt.activityKind))return {ok:false,reason:'Use literal checks for short facts; this review is for explanations or applications.',criteria:[]};
    if(attempt.inputMode!=='written'||typeof attempt.response!=='string'||!attempt.response.trim())
      return {ok:false,reason:'A saved written answer is required. Oral or mental attempts cannot be reconstructed.',criteria:[]};
    if(!attempt.questionSnapshot||!attempt.referenceSnapshot)
      return {ok:false,reason:'The original question and reference answer were not preserved.',criteria:[]};
    const criteria=rubricForAttempt(attempt);
    if(!criteria.length)return {ok:false,reason:'No contemporaneous criterion snapshots exist for this attempt. Add a rubric before your next practice; this older attempt cannot be graded retrospectively against a newly changed rubric.',criteria:[]};
    if(criteria.length>100)return {ok:false,reason:'Too many criteria to review safely.',criteria:[]};
    if(new Set(criteria.map(c=>c.criterionId)).size!==criteria.length)return {ok:false,reason:'Historical criterion identifiers are inconsistent.',criteria:[]};
    return {ok:true,reason:'',criteria};
  }
  function classify(findings){
    if(findings.every(x=>x.status==='included'))return 'all_supported';
    if(findings.some(x=>x.status==='not_demonstrated'))return 'gap_identified';
    return 'inconclusive';
  }
  function fingerprint(text){
    // A non-cryptographic accidental-edit check, NOT tamper-proof certification.
    let h=2166136261;const input=String(text);
    for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function record(db,{attemptId,reviewerRole,findings,note='',confirmed=false,now=new Date()}){
    const attempt=db?.attempts?.find(a=>a.id===attemptId);
    const eligible=eligibility(attempt);
    if(!eligible.ok)throw Error(eligible.reason);
    if(!confirmed)throw Error('Confirm that a person reviewed the original response and each criterion.');
    if(!ROLES.has(reviewerRole))throw Error('Choose who reviewed the answer.');
    if(!Array.isArray(findings)||findings.length!==eligible.criteria.length)throw Error('Review every saved criterion, including those you cannot judge.');
    if(typeof note!=='string'||note.length>3000)throw Error('Keep the review note under 3,000 characters.');
    if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(attempt.createdAt))
      throw Error('Review time must follow the original attempt.');
    const completed=eligible.criteria.map((criterion,i)=>{
      const f=findings[i];
      if(!f||f.criterionId!==criterion.criterionId||f.criterionVersion!==criterion.version||!STATUS.has(f.status))
        throw Error('Criterion order or version differs from the original attempt. Reopen the review.');
      const excerpt=typeof f.excerpt==='string'?f.excerpt.trim():'';
      const rationale=typeof f.rationale==='string'?f.rationale.trim():'';
      if(excerpt.length>700||rationale.length>1200)throw Error('Evidence excerpt or rationale is too long.');
      if(excerpt&&!attempt.response.includes(excerpt))throw Error('A quoted excerpt must appear exactly in the original written answer.');
      if(f.status==='included'&&!excerpt)throw Error('For Included, copy an exact supporting excerpt from the original answer.');
      if(f.status==='not_demonstrated'&&rationale.length<8)throw Error('Explain the missing or unsupported relationship for each Not demonstrated point.');
      if(f.status==='uncertain'&&rationale.length<8)throw Error('Explain why each Uncertain point cannot be judged.');
      if(f.status==='unassessed'&&(excerpt||rationale))throw Error('Leave evidence and rationale blank when marking Not assessed.');
      return {criterionId:criterion.criterionId,criterionVersion:criterion.version,
        criterionTextSnapshot:criterion.textSnapshot,status:f.status,excerpt,rationale};
    });
    if(completed.every(f=>f.status==='unassessed'))throw Error('Assess at least one criterion before saving.');
    const history=attempt.humanReviews||[];
    if(history.length>=50)throw Error('Review history limit reached; export a backup.');
    const prior=history[history.length-1];
    if(prior&&now.getTime()<Date.parse(prior.reviewedAt))throw Error('A revision cannot predate the previous review.');
    const review={schema:1,method:'manual-criterion-review-v1',revision:history.length+1,
      attemptId:attempt.id,reviewedAt:now.toISOString(),reviewerRole,reviewerIdentityVerified:false,
      requirementVersion:attempt.requirementVersion,targetVersion:attempt.retrievalTargetVersion,
      activityVersion:attempt.activityVersion,responseFingerprint:fingerprint(attempt.response),
      finding:classify(completed),criteria:completed,note:note.trim()};
    if(!attempt.humanReviews)attempt.humanReviews=[];
    attempt.humanReviews.push(review);
    db.events.push({type:history.length?'human_review.revised':'human_review.recorded',
      entityId:attempt.id,revision:review.revision,at:review.reviewedAt});
    return review;
  }
  function validate(db){
    if(!Array.isArray(db?.attempts))throw Error('Invalid attempt history.');
    for(const a of db.attempts){
      if(a.rubricAtAttempt!==undefined){
        if(!Array.isArray(a.rubricAtAttempt)||a.rubricAtAttempt.length>100)throw Error('Invalid historical rubric snapshot.');
        const seen=new Set();
        for(const c of a.rubricAtAttempt){
          if(!c||typeof c.criterionId!=='string'||!c.criterionId||seen.has(c.criterionId)||
            !Number.isSafeInteger(c.version)||c.version<1||typeof c.textSnapshot!=='string'||
            !c.textSnapshot.trim()||c.textSnapshot.length>240)throw Error('Invalid historical criterion snapshot.');
          seen.add(c.criterionId);
        }
      }
      if(a.humanReviews===undefined)continue;
      if(!Array.isArray(a.humanReviews)||a.humanReviews.length>50||!eligibility(a).ok)
        throw Error('Invalid historical human-review series.');
      const criteria=rubricForAttempt(a);
      let priorTime=Date.parse(a.createdAt);
      for(let i=0;i<a.humanReviews.length;i++){
        const r=a.humanReviews[i];
        const timestamp=Date.parse(r?.reviewedAt);
        if(!r||r.schema!==1||r.method!=='manual-criterion-review-v1'||r.revision!==i+1||r.attemptId!==a.id||
          !ROLES.has(r.reviewerRole)||r.reviewerIdentityVerified!==false||
          !Number.isFinite(timestamp)||timestamp<priorTime||r.responseFingerprint!==fingerprint(a.response)||
          r.requirementVersion!==a.requirementVersion||r.targetVersion!==a.retrievalTargetVersion||
          r.activityVersion!==a.activityVersion||!Array.isArray(r.criteria)||r.criteria.length!==criteria.length||
          typeof r.note!=='string'||r.note.length>3000)throw Error('Invalid historical human-review metadata.');
        priorTime=timestamp;
        for(let j=0;j<criteria.length;j++){
          const f=r.criteria[j],c=criteria[j];
          if(!f||f.criterionId!==c.criterionId||f.criterionVersion!==c.version||f.criterionTextSnapshot!==c.textSnapshot||
            !STATUS.has(f.status)||typeof f.excerpt!=='string'||f.excerpt.length>700||
            typeof f.rationale!=='string'||f.rationale.length>1200||
            f.excerpt&&!a.response.includes(f.excerpt)||
            f.status==='included'&&!f.excerpt||
            f.status==='not_demonstrated'&&f.rationale.length<8||
            f.status==='uncertain'&&f.rationale.length<8||
            f.status==='unassessed'&&(f.excerpt||f.rationale))
            throw Error('Invalid historical criterion review evidence.');
        }
        if(r.finding!==classify(r.criteria)||r.criteria.every(f=>f.status==='unassessed'))
          throw Error('Invalid historical human-review conclusion.');
      }
    }
    return true;
  }
  function delayedAudit(db,{minDelayHours=24}={}){
    if(!Number.isFinite(minDelayHours)||minDelayHours<1||minDelayHours>720)throw Error('Invalid spacing threshold.');
    const src=db.attempts.slice(-50000).map((a,i)=>({a,i,t:Date.parse(a.createdAt)}))
      .filter(x=>Number.isFinite(x.t)).sort((x,y)=>x.t-y.t||x.i-y.i);
    const groups=new Map();
    for(const item of src){
      const a=item.a,key=[a.requirementId,a.requirementVersion,a.retrievalTargetId,a.retrievalTargetVersion].join('|');
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    }
    const excluded={noReview:0,firstOrRevised:0,tooSoon:0,assistedOrImmediate:0,afterLaterPractice:0,indeterminate:0};
    let eligible=0,allSupported=0,gaps=0,self=0,other=0;
    const targets=new Set();
    for(const attempts of groups.values()){
      for(let i=0;i<attempts.length;i++){
        const {a,t}=attempts[i];
        const review=a.humanReviews?.[a.humanReviews.length-1];
        if(!review){excluded.noReview++;continue;}
        if(a.assisted||a.practiceStage==='immediate_post_study'||a.inputMode!=='written'){excluded.assistedOrImmediate++;continue;}
        if(i===0){excluded.firstOrRevised++;continue;}
        if(t-attempts[i-1].t<minDelayHours*3600000){excluded.tooSoon++;continue;}
        if(i+1<attempts.length&&Date.parse(review.reviewedAt)>attempts[i+1].t){excluded.afterLaterPractice++;continue;}
        if(review.finding==='inconclusive'){excluded.indeterminate++;continue;}
        eligible++;targets.add(a.retrievalTargetId);
        if(review.finding==='all_supported')allSupported++;else gaps++;
        if(review.reviewerRole==='self')self++;else other++;
      }
    }
    return {version:1,processed:src.length,eligible,distinctTargets:targets.size,allSupported,gaps,self,other,
      supportedShare:eligible>=20&&targets.size>=10?Math.round(100*allSupported/eligible):null,excluded,
      warning:'Human judgments were entered after the original attempt, with the reference answer visible at review. Other-person review is self-reported, not identity-verified. The audit excludes immediate/assisted responses, first attempts, reviews after later practice and indeterminate outcomes. It is descriptive, not validated grading, causal evidence or proof of an optimal schedule.'};
  }
  return {rubricForAttempt,eligibility,classify,fingerprint,record,validate,delayedAudit};
});
