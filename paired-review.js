/* Active Recall Web v4.2 — two distinct, attestably separate human reviews.
   Local-only, rubric-version bound, no AI evaluation or schedule changes. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ActiveRecallPairedReview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
  if(!H)throw Error('Missing human review module.');
  const ROLES=new Set(['self','other_person']);
  const STATUSES=new Set(['included','not_demonstrated','uncertain','unassessed']);
  const DECISIVE=new Set(['included','not_demonstrated']);
  const RESOLUTIONS=new Set(['included','not_demonstrated','unresolved']);
  function assertAttempt(db,attemptId){
    const a=db?.attempts?.find(x=>x.id===attemptId);
    const e=H.eligibility(a);
    if(!e.ok)throw Error(e.reason);
    return {a,criteria:e.criteria};
  }
  function buildFindings(a,criteria,findings){
    if(!Array.isArray(findings)||findings.length!==criteria.length)throw Error('Review all original rubric criteria.');
    let assessed=0;
    const out=criteria.map((c,i)=>{
      const f=findings[i];
      if(!f||f.criterionId!==c.criterionId||f.criterionVersion!==c.version||
        !STATUSES.has(f.status))throw Error('Criterion or version mismatch: reopen the review.');
      if(typeof f.excerpt!=='string'||typeof f.rationale!=='string')throw Error('Evidence must be written text.');
      const excerpt=f.excerpt.trim(),rationale=f.rationale.trim();
      if(excerpt.length>700||rationale.length>1200)throw Error('Evidence excerpt or explanation is too long.');
      if(excerpt&&!a.response.includes(excerpt))throw Error('An evidence excerpt must match the original answer verbatim.');
      if(f.status==='included'&&!excerpt)throw Error('Included requires a supporting excerpt copied from the original answer.');
      if((f.status==='not_demonstrated'||f.status==='uncertain')&&rationale.length<8)
        throw Error('Describe why this criterion was missed or cannot be judged.');
      if(f.status==='unassessed'&&(excerpt||rationale))throw Error('Not assessed must have empty evidence and explanation.');
      if(f.status!=='unassessed')assessed++;
      return {criterionId:c.criterionId,criterionVersion:c.version,criterionTextSnapshot:c.textSnapshot,
        status:f.status,excerpt,rationale};
    });
    if(!assessed)throw Error('Assess at least one criterion.');
    return out;
  }
  function conclusion(findings){
    if(findings.every(x=>x.status==='included'))return 'all_supported';
    if(findings.some(x=>x.status==='not_demonstrated'))return 'gap_identified';
    return 'inconclusive';
  }
  function recordReviewer(db,{attemptId,slot,reviewerRole,findings,note='',confirmed=false,
    differentPerson=false,noPriorJudgments=false,now=new Date()}){
    const {a,criteria}=assertAttempt(db,attemptId);
    if(!confirmed)throw Error('Confirm that this human review was actually performed.');
    if(slot!=='A'&&slot!=='B')throw Error('Choose reviewer A or B.');
    if(!ROLES.has(reviewerRole))throw Error('Select the reviewer's role.');
    if(typeof note!=='string'||note.length>3000)throw Error('Reviewer note too long.');
    if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(a.createdAt))
      throw Error('Review timestamp must follow the saved attempt.');
    const pair=a.independentReviewPair;
    if(slot==='A'&&pair)throw Error('Reviewer A is already recorded. Original independent judgments cannot be overwritten.');
    if(slot==='B'&&(!pair?.A||pair.B))throw Error('Reviewer B requires an existing A review and may be recorded once.');
    if(slot==='B'&&(!differentPerson||!noPriorJudgments))
      throw Error('Reviewer B must attest to being a different person and not seeing A’s judgments before reviewing.');
    if(slot==='B'&&now.getTime()<Date.parse(pair.A.reviewedAt))
      throw Error('Reviewer B cannot predate reviewer A.');
    const checked=buildFindings(a,criteria,findings);
    const entry={
      version:1,method:'independent-criterion-human-v1',slot,reviewedAt:now.toISOString(),
      reviewerRole,identityVerified:false,
      differentPersonAttested:slot==='B',priorJudgmentsHiddenAttested:slot==='B',
      responseFingerprint:H.fingerprint(a.response),
      requirementVersion:a.requirementVersion,targetVersion:a.retrievalTargetVersion,activityVersion:a.activityVersion,
      finding:conclusion(checked),criteria:checked,note:note.trim()
    };
    if(slot==='A')a.independentReviewPair={version:1,method:'paired-human-review-v1',A:entry,B:null,adjudications:[]};
    else pair.B=entry;
    db.events.push({type:slot==='A'?'pair_review.a_recorded':'pair_review.b_recorded',
      entityId:a.id,at:entry.reviewedAt});
    return entry;
  }
  function comparison(attempt){
    const pair=attempt?.independentReviewPair;
    if(!pair?.A||!pair.B)return null;
    const left=pair.A.criteria,right=pair.B.criteria;
    let bothIncluded=0,bothGap=0,splitIncludedGap=0,splitGapIncluded=0,uncertainOrUnassessed=0;
    const rows=left.map((a,i)=>{
      const b=right[i],comparable=DECISIVE.has(a.status)&&DECISIVE.has(b.status);
      if(!comparable)uncertainOrUnassessed++;
      else if(a.status==='included'&&b.status==='included')bothIncluded++;
      else if(a.status==='not_demonstrated'&&b.status==='not_demonstrated')bothGap++;
      else if(a.status==='included')splitIncludedGap++;
      else splitGapIncluded++;
      return {criterionId:a.criterionId,criterionVersion:a.criterionVersion,
        text:a.criterionTextSnapshot,A:a,B:b,comparable,agree:comparable&&a.status===b.status,
        needsResolution:a.status!==b.status};
    });
    return {rows,bothIncluded,bothGap,splitIncludedGap,splitGapIncluded,uncertainOrUnassessed,
      comparable:bothIncluded+bothGap+splitIncludedGap+splitGapIncluded,
      agreements:bothIncluded+bothGap,disagreements:splitIncludedGap+splitGapIncluded,
      differences:rows.filter(x=>x.needsResolution)};
  }
  function recordAdjudication(db,{attemptId,adjudicatorRole,decisions,note='',confirmed=false,now=new Date()}){
    const {a}=assertAttempt(db,attemptId);
    const c=comparison(a);
    if(!c)throw Error('Two original human reviews are required before adjudication.');
    if(!c.differences.length)throw Error('No criterion-level disagreement requires adjudication.');
    if(!confirmed)throw Error('Confirm this is a manual reconciliation of the original reviews.');
    if(!ROLES.has(adjudicatorRole))throw Error('Choose who recorded the reconciliation.');
    if(typeof note!=='string'||note.length>3000)throw Error('Adjudication note too long.');
    const pair=a.independentReviewPair,prior=pair.adjudications.at(-1);
    if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(pair.B.reviewedAt)||
      prior&&now.getTime()<Date.parse(prior.recordedAt))throw Error('Adjudication date is earlier than the previous review.');
    if(!Array.isArray(decisions)||decisions.length!==c.differences.length)
      throw Error('Record a decision for every differing criterion.');
    const recorded=c.differences.map((row,i)=>{
      const d=decisions[i];
      if(!d||d.criterionId!==row.criterionId||d.criterionVersion!==row.criterionVersion||
        !RESOLUTIONS.has(d.resolution)||typeof d.reason!=='string'||d.reason.trim().length<8||
        d.reason.trim().length>1200)throw Error('Every disputed criterion needs an explicit decision and explanation.');
      return {criterionId:row.criterionId,criterionVersion:row.criterionVersion,
        textSnapshot:row.text,Astatus:row.A.status,Bstatus:row.B.status,
        resolution:d.resolution,reason:d.reason.trim()};
    });
    if(pair.adjudications.length>=50)throw Error('Adjudication history limit reached. Export a backup.');
    const entry={version:1,method:'human-adjudication-v1',revision:pair.adjudications.length+1,
      recordedAt:now.toISOString(),adjudicatorRole,identityVerified:false,
      responseFingerprint:H.fingerprint(a.response),note:note.trim(),decisions:recorded};
    pair.adjudications.push(entry);
    db.events.push({type:'pair_review.adjudicated',entityId:a.id,revision:entry.revision,at:entry.recordedAt});
    return entry;
  }
  function validate(db){
    if(!Array.isArray(db?.attempts))throw Error('Invalid attempt data.');
    for(const a of db.attempts){
      if(a.independentReviewPair===undefined)continue;
      const p=a.independentReviewPair;
      const e=H.eligibility(a);
      if(!e.ok||!p||p.version!==1||p.method!=='paired-human-review-v1'||!p.A||
        p.B===undefined||!Array.isArray(p.adjudications)||p.adjudications.length>50)
        throw Error('Invalid paired review structure in backup.');
      const criteria=e.criteria;
      function verifyEntry(r,slot){
        if(!r||r.version!==1||r.method!=='independent-criterion-human-v1'||r.slot!==slot||
          !ROLES.has(r.reviewerRole)||r.identityVerified!==false||
          r.differentPersonAttested!==(slot==='B')||r.priorJudgmentsHiddenAttested!==(slot==='B')||
          !Number.isFinite(Date.parse(r.reviewedAt))||r.responseFingerprint!==H.fingerprint(a.response)||
          r.requirementVersion!==a.requirementVersion||r.targetVersion!==a.retrievalTargetVersion||
          r.activityVersion!==a.activityVersion||typeof r.note!=='string'||r.note.length>3000||
          !Array.isArray(r.criteria)||r.criteria.length!==criteria.length)
          throw Error('Invalid independent reviewer metadata in backup.');
        const restored=r.criteria.map(f=>({criterionId:f?.criterionId,criterionVersion:f?.criterionVersion,
          status:f?.status,excerpt:f?.excerpt,rationale:f?.rationale}));
        let expected;try{expected=buildFindings(a,criteria,restored);}
        catch{throw Error('Invalid independent reviewer evidence in backup.');}
        if(JSON.stringify(expected)!==JSON.stringify(r.criteria)||r.finding!==conclusion(expected))
          throw Error('Invalid independent reviewer conclusion in backup.');
      }
      verifyEntry(p.A,'A');
      if(Date.parse(p.A.reviewedAt)<Date.parse(a.createdAt))throw Error('Reviewer A predates the attempt.');
      if(p.B){
        verifyEntry(p.B,'B');
        if(Date.parse(p.B.reviewedAt)<Date.parse(p.A.reviewedAt))throw Error('Reviewer B predates A.');
      }else if(p.adjudications.length)throw Error('Adjudication cannot precede the second reviewer.');
      const comp=comparison(a);
      let last=p.B?Date.parse(p.B.reviewedAt):Date.parse(p.A.reviewedAt);
      for(let i=0;i<p.adjudications.length;i++){
        const d=p.adjudications[i],ts=Date.parse(d?.recordedAt);
        if(!comp||!comp.differences.length||!d||d.version!==1||d.method!=='human-adjudication-v1'||
          d.revision!==i+1||!ROLES.has(d.adjudicatorRole)||d.identityVerified!==false||
          !Number.isFinite(ts)||ts<last||d.responseFingerprint!==H.fingerprint(a.response)||
          typeof d.note!=='string'||d.note.length>3000||
          !Array.isArray(d.decisions)||d.decisions.length!==comp.differences.length)
          throw Error('Invalid adjudication record in backup.');
        last=ts;
        for(let j=0;j<comp.differences.length;j++){
          const row=comp.differences[j],x=d.decisions[j];
          if(!x||x.criterionId!==row.criterionId||x.criterionVersion!==row.criterionVersion||
            x.textSnapshot!==row.text||x.Astatus!==row.A.status||x.Bstatus!==row.B.status||
            !RESOLUTIONS.has(x.resolution)||typeof x.reason!=='string'||
            x.reason.length<8||x.reason.length>1200)
            throw Error('Invalid adjudication criterion in backup.');
        }
      }
    }
    return true;
  }
  function agreementAudit(db){
    const pairs=(db?.attempts||[]).filter(a=>a.independentReviewPair?.A&&a.independentReviewPair?.B);
    let comparable=0,agreements=0,disagreements=0,excluded=0,adjudicated=0,unresolved=0;
    const targets=new Set(),authors=new Set(),withDisputes=[];
    for(const a of pairs){
      const c=comparison(a);if(!c)continue;
      comparable+=c.comparable;agreements+=c.agreements;disagreements+=c.disagreements;
      excluded+=c.uncertainOrUnassessed;authors.add(a.id);
      if(c.comparable)targets.add(a.retrievalTargetId);
      if(c.differences.length){
        const latest=a.independentReviewPair.adjudications.at(-1);
        if(latest) {adjudicated++;unresolved+=latest.decisions.filter(d=>d.resolution==='unresolved').length;}
        withDisputes.push({attemptId:a.id,differences:c.differences.length,adjudicated:!!latest});
      }
    }
    // Criterion rows from the same written answer are correlated observations.
    // Suppress aggregated rates until both distinct attempts and distinct topics
    // are represented; even then, this is descriptive only.
    const share=comparable>=20&&authors.size>=10&&targets.size>=5?
      Math.round(100*agreements/comparable):null;
    return {version:1,completedPairs:pairs.length,distinctAttempts:authors.size,distinctTargets:targets.size,
      comparable,agreements,disagreements,excluded,agreementShare:share,
      pendingAdjudication:withDisputes.filter(x=>!x.adjudicated).length,
      adjudicatedPairs:adjudicated,unresolvedDecisions:unresolved,
      warnings:'Agreement is descriptive for two manually entered judgments. The app masks A’s answers while collecting B’s, but cannot establish separate identities, independent conduct, lack of prior exposure, or external expertise. Both reviewers may see the reference answer. Uncertain/unassessed criteria are excluded from decisive agreement rates. Resolution is not an expert gold standard, nor a retention estimate; no calendar intervals change.'};
  }
  return {buildFindings,conclusion,recordReviewer,comparison,recordAdjudication,validate,agreementAudit};
});
