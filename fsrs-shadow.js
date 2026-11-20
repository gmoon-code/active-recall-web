/* Local-only FSRS-7 default-weight comparison. Never writes a due date. */
((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ActiveRecallFSRSShadow=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const DAY=86400000;
  const round=n=>Math.round(n*100)/100;
  const median=values=>{
    if(!values.length)return null;
    const a=values.slice().sort((x,y)=>x-y),mid=Math.floor(a.length/2);
    return round(a.length%2?a[mid]:(a[mid-1]+a[mid])/2);
  };
  // FSRS reacts to the learner's grades, not objective correctness. Complex
  // rubric judgments and exact-match evidence must not be conflated with it.
  async function compare(db,{Core=null,Vendor=null,now=new Date(),limit=500}={}){
    const C=Core||(typeof module==='object'&&module.exports?require('./core.js'):globalThis.ActiveRecallCore);
    const V=Vendor||(typeof globalThis!=='undefined'?globalThis.ActiveRecallFSRSVendor:null);
    if(typeof V?.DefaultScheduler!=='function')throw Error('The bundled FSRS scheduler is unavailable.');
    if(!C||typeof C.eligibleCandidates!=='function')throw Error('Active Recall core is unavailable.');
    if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid preview date.');
    if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw Error('Preview limit must be 1–500 targets.');
    const grades={again:V.Rating.Again,hard:V.Rating.Hard,good:V.Rating.Good,easy:V.Rating.Easy};
    const scheduler=await V.DefaultScheduler({version:'FSRS-7',desiredRetention:0.9,
      enableShortTerm:false,learningSteps:[],relearningSteps:[],enableFuzz:false,
      maximumInterval:36500});
    const attemptsByTarget=new Map();
    for(const a of db.attempts||[]){
      if(!a?.retrievalTargetId)continue;
      if(!attemptsByTarget.has(a.retrievalTargetId))attemptsByTarget.set(a.retrievalTargetId,[]);
      attemptsByTarget.get(a.retrievalTargetId).push(a);
    }
    const candidates=C.eligibleCandidates(db,now).filter(c=>!!db.memory[c.target.id])
      .sort((a,b)=>b.score-a.score||a.target.id.localeCompare(b.target.id));
    const exclusions={missingOrLegacyMemory:0,incompleteHistory:0,futureDatedHistory:0,
      assistedOrImmediate:0,notIndependentWritten:0,unverified:0,
      invalidRatingOrTime:0,replayFailure:0};
    const rows=[];
    for(const c of candidates.slice(0,limit)){
      const m=db.memory[c.target.id],raw=attemptsByTarget.get(c.target.id)||[];
      if(m.policyId!=='transparent-interval-v1'||!Number.isFinite(m.intervalDays)||m.intervalDays<=0){
        exclusions.missingOrLegacyMemory++;continue;
      }
      const history=raw.filter(a=>a.requirementId===c.req.id&&
        a.requirementVersion===c.req.version&&a.retrievalTargetVersion===c.target.version);
      history.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
      if(!history.length||history.length!==m.reviewCount||
         history.at(-1).createdAt!==m.lastReviewedAt||
         (history.at(-1).scheduleRating||history.at(-1).rating)!==m.lastRating){
        exclusions.incompleteHistory++;continue;
      }
      // A preview for a past point in time must not replay observations that
      // would only be available later (including device-clock-skewed records).
      // This is a forward-time evidence gate, not an attempt to repair history.
      if(history.some(a=>Number.isFinite(Date.parse(a.createdAt))&&
        Date.parse(a.createdAt)>now.getTime())){
        exclusions.futureDatedHistory++;continue;
      }
      if(history.some(a=>a.assisted||a.practiceStage==='immediate_post_study')){
        exclusions.assistedOrImmediate++;continue;
      }
      if(history.some(a=>a.inputMode!=='written'||typeof a.response!=='string'||!a.response.trim())){
        exclusions.notIndependentWritten++;continue;
      }
      if(history.some(a=>a.requirementVerified!==true)){
        exclusions.unverified++;continue;
      }
      if(history.some((a,i)=>!grades[a.scheduleRating||a.rating]||
        !Number.isFinite(Date.parse(a.createdAt))||
        i>0&&Date.parse(a.createdAt)<=Date.parse(history[i-1].createdAt))){
        exclusions.invalidRatingOrTime++;continue;
      }
      try{
        let card=scheduler.newCard({cardId:c.target.id,now:new Date(history[0].createdAt)});
        for(const a of history)card=scheduler.review({card,
          grade:grades[a.scheduleRating||a.rating],now:new Date(a.createdAt)}).card;
        const shadowDueAt=card.dueAt.toISOString(),lastAt=Date.parse(m.lastReviewedAt),
          shadowIntervalDays=(Date.parse(shadowDueAt)-lastAt)/DAY;
        if(!Number.isFinite(shadowIntervalDays)||shadowIntervalDays<=0)throw Error('Invalid model date.');
        rows.push({targetId:c.target.id,courseId:c.req.courseId,activityKind:c.activity.kind,
          completedReviews:history.length,activeIntervalDays:round(m.intervalDays),
          shadowIntervalDays:round(shadowIntervalDays),activeDueAt:m.dueAt,shadowDueAt,
          differenceDays:round(shadowIntervalDays-m.intervalDays)});
      }catch{exclusions.replayFailure++;}
    }
    const tolerance=1/1440; // one minute; not a learning threshold
    return {version:1,model:'FSRS-7',library:'ts-fsrs@6.0.0',policy:'default-weights-shadow-v1',
      desiredRetention:0.9,modelFitted:false,activePolicyChanged:false,
      inspectedTargets:Math.min(limit,candidates.length),notInspected:Math.max(0,candidates.length-limit),
      comparedTargets:rows.length,shadowEarlier:rows.filter(x=>x.differenceDays<-tolerance).length,
      shadowLater:rows.filter(x=>x.differenceDays>tolerance).length,
      shadowSame:rows.filter(x=>Math.abs(x.differenceDays)<=tolerance).length,
      medianActiveDays:median(rows.map(x=>x.activeIntervalDays)),
      medianShadowDays:median(rows.map(x=>x.shadowIntervalDays)),exclusions,rows,
      warning:'This replays only complete, same-version, unassisted written learner-rated histories available by the preview date with default FSRS-7 weights. It does not optimize personal parameters, validate actual memory, compare causal learning benefits, or estimate grades. Self-reported studying outside the app is not treated as a recall rating. Its 90% desired retention is a provisional comparison setting, NOT a proven optimum. Excluded histories are not repaired or guessed. The shadow dates are NEVER written to saved memory, sessions or the automatic calendar; the existing transparent interval policy remains active.'};
  }
  // Freeze an FSRS-7 default-weight guess before a real answer is shown. This
  // is deliberately more restrictive than ordinary study eligibility: only a
  // complete same-version, independently written, unassisted review sequence
  // can be replayed. Null means no defensible model receipt, NOT zero recall.
  async function forecastProbability(db,{Core=null,Vendor=null,now=new Date(),
    requirementId,targetId,activityId}={}){
    const C=Core||(typeof module==='object'&&module.exports?require('./core.js'):globalThis.ActiveRecallCore);
    const V=Vendor||(typeof globalThis!=='undefined'?globalThis.ActiveRecallFSRSVendor:null);
    if(typeof V?.DefaultScheduler!=='function')throw Error('The bundled FSRS scheduler is unavailable.');
    if(!C||typeof C.previewProspectiveForecast!=='function')throw Error('Active Recall core is unavailable.');
    if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid forecast time.');
    const baseline=C.previewProspectiveForecast(db,{requirementId,targetId,activityId,now});
    if(!baseline)return null;
    const candidate=C.eligibleCandidates(db,now).find(c=>c.target.id===targetId&&
      c.req.id===requirementId&&c.activity.id===activityId);
    if(!candidate)return null;
    const memory=db.memory[targetId],raw=(db.attempts||[]).filter(a=>a.retrievalTargetId===targetId);
    const history=raw.filter(a=>a.requirementId===requirementId&&
      a.requirementVersion===candidate.req.version&&a.retrievalTargetVersion===candidate.target.version)
      .sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
    if(!history.length||history.length!==raw.length||history.length!==memory.reviewCount||
       history.at(-1).createdAt!==memory.lastReviewedAt||
       (history.at(-1).scheduleRating||history.at(-1).rating)!==memory.lastRating)return null;
    const grades={again:V.Rating.Again,hard:V.Rating.Hard,good:V.Rating.Good,easy:V.Rating.Easy};
    let last=-Infinity;
    for(const a of history){
      const t=Date.parse(a.createdAt);
      if(!Number.isFinite(t)||t<=last||t>now.getTime()||!grades[a.scheduleRating||a.rating]||
         a.assisted||a.practiceStage==='immediate_post_study'||a.inputMode!=='written'||
         typeof a.response!=='string'||!a.response.trim()||a.requirementVerified!==true)return null;
      last=t;
    }
    const scheduler=await V.DefaultScheduler({version:'FSRS-7',desiredRetention:0.9,
      enableShortTerm:false,learningSteps:[],relearningSteps:[],enableFuzz:false,
      maximumInterval:36500});
    try{
      let card=scheduler.newCard({cardId:targetId,now:new Date(history[0].createdAt)});
      for(const a of history)card=scheduler.review({card,
        grade:grades[a.scheduleRating||a.rating],now:new Date(a.createdAt)}).card;
      // Date.parse(Date) stringifies and silently drops milliseconds. Real
      // browser attempts nearly always have fractional seconds; keep them.
      const replayedAt=card.lastReviewAt instanceof Date?
        card.lastReviewAt.getTime():Date.parse(card.lastReviewAt);
      if(replayedAt!==Date.parse(memory.lastReviewedAt))return null;
      const elapsed=scheduler.chrono.difference(card.lastReviewAt,now);
      if(!Number.isFinite(elapsed)||elapsed<0)return null;
      const probability=scheduler.model.forgettingCurve(card,elapsed);
      if(!Number.isFinite(probability)||probability<0||probability>1)return null;
      return {version:1,method:'fsrs-7-default-probability-v1',model:'FSRS-7',
        modelFitted:false,policy:'default-weights-shadow-v1',desiredRetention:0.9,
        capturedAt:baseline.capturedAt,requirementId,requirementVersion:baseline.requirementVersion,
        targetId,targetVersion:baseline.targetVersion,activityId,activityVersion:baseline.activityVersion,
        priorReviewedAt:baseline.priorReviewedAt,priorDueAt:baseline.priorDueAt,
        priorIntervalDays:baseline.priorIntervalDays,historyCount:history.length,
        probability:Math.round(probability*1000000)/1000000};
    }catch{return null;}
  }
  // A saved probability is a claim about *past* model state, not proof by
  // itself. Reconstruct that state using only earlier same-target attempts;
  // never call forecastProbability on today's memory, which looks ahead.
  async function auditReceipts(db,{Vendor=null,limit=200,minDelayHours=24,includeVerifiedRows=false}={}){
    const V=Vendor||(typeof globalThis!=='undefined'?globalThis.ActiveRecallFSRSVendor:null);
    if(typeof V?.DefaultScheduler!=='function')throw Error('The bundled FSRS scheduler is unavailable.');
    if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw Error('Audit limit must be 1–500 receipts.');
    if(!Number.isFinite(minDelayHours)||minDelayHours<1||minDelayHours>720)
      throw Error('Delayed-evidence threshold must be between 1 and 720 hours.');
    const raw=Array.isArray(db?.attempts)?db.attempts:[],all=raw.map((a,index)=>({a,index,t:Date.parse(a?.createdAt||'')}))
      .sort((x,y)=>(Number.isFinite(x.t)?x.t:Infinity)-(Number.isFinite(y.t)?y.t:Infinity)||x.index-y.index);
    const receipts=all.filter(x=>x.a?.fsrsForecast);
    const excluded={unlinkedMetadata:0,incompleteOrChangedHistory:0,unsupportedPractice:0,
      invalidChronology:0,modelMismatch:0,replayFailure:0};
    const result={version:1,model:'FSRS-7',policy:'default-weights-shadow-v1',
      activePolicyChanged:false,modelFitted:false,recordedReceipts:receipts.length,
      inspected:0,notInspected:0,replayed:0,eligibleDelayedWritten:0,
      literalOutcomeCandidates:0,exclusions:excluded,
      ...(includeVerifiedRows?{verifiedRows:[]}:{}),
      warning:'Replay checks whether the stored default-weight probability agrees with earlier learner-rated histories. It cannot prove when an imported value was captured, whether a rating represents true recall, or that a schedule is optimal. Only independently written unassisted attempts delayed at least 24 hours can be candidates for later outcome analysis. No scores are calculated and no study dates or priorities change.'};
    // Truncating the attempt history can make a forged or partial sequence
    // look complete. Abstain rather than replay a partial notebook.
    if(raw.length>50000){result.notInspected=receipts.length;return result;}
    const inspected=receipts.slice(-limit);
    result.inspected=inspected.length;result.notInspected=receipts.length-inspected.length;
    const byTarget=new Map();
    for(const item of all){
      const target=item.a?.retrievalTargetId;
      if(!target)continue;
      if(!byTarget.has(target))byTarget.set(target,[]);
      byTarget.get(target).push(item);
    }
    const scheduler=await V.DefaultScheduler({version:'FSRS-7',desiredRetention:0.9,
      enableShortTerm:false,learningSteps:[],relearningSteps:[],enableFuzz:false,
      maximumInterval:36500});
    const grades={again:V.Rating.Again,hard:V.Rating.Hard,good:V.Rating.Good,easy:V.Rating.Easy};
    for(const item of inspected){
      const a=item.a,f=a.fsrsForecast,p=a.prospectiveForecast;
      const sequence=byTarget.get(a.retrievalTargetId)||[],position=sequence.indexOf(item);
      const previous=sequence.slice(0,position),last=previous.at(-1)?.a;
      const captured=Date.parse(f?.capturedAt||'');
      if(!f||f.version!==1||f.method!=='fsrs-7-default-probability-v1'||
         f.model!=='FSRS-7'||f.modelFitted!==false||f.policy!=='default-weights-shadow-v1'||
         f.desiredRetention!==0.9||!Number.isFinite(f.probability)||f.probability<0||f.probability>1||
         Math.round(f.probability*1000000)/1000000!==f.probability||
         !p||f.capturedAt!==p.capturedAt||f.targetId!==a.retrievalTargetId||
         f.requirementId!==a.requirementId||f.requirementVersion!==a.requirementVersion||
         f.targetVersion!==a.retrievalTargetVersion||f.activityId!==a.activityId||
         f.activityVersion!==a.activityVersion||f.priorReviewedAt!==p.priorReviewedAt||
         f.priorDueAt!==a.priorDueAt||f.priorIntervalDays!==a.priorIntervalDays||
         f.priorDueAt!==p.priorDueAt||f.priorIntervalDays!==p.priorIntervalDays){
        excluded.unlinkedMetadata++;continue;
      }
      if(!previous.length||!Number.isSafeInteger(f.historyCount)||previous.length!==f.historyCount||
         !last||last.createdAt!==f.priorReviewedAt||
         // Older valid attempts may predate versioned policy snapshots. The
         // grade history can still be replayed; check a snapshot if present.
         (last.schedulingDecision&&(
           last.schedulingDecision.activeDueAt!==f.priorDueAt||
           last.schedulingDecision.activeIntervalDays!==f.priorIntervalDays))||
         previous.some(x=>x.a.requirementId!==a.requirementId||
           x.a.requirementVersion!==a.requirementVersion||
           x.a.retrievalTargetVersion!==a.retrievalTargetVersion)){
        excluded.incompleteOrChangedHistory++;continue;
      }
      if(previous.some(x=>x.a.assisted||x.a.practiceStage==='immediate_post_study'||
         x.a.inputMode!=='written'||!x.a.response?.trim()||x.a.requirementVerified!==true||
         !grades[x.a.scheduleRating||x.a.rating])){
        excluded.unsupportedPractice++;continue;
      }
      if(!Number.isFinite(captured)||!Number.isFinite(item.t)||
         captured<previous.at(-1).t||captured>item.t||item.t-captured>6*3600000||
         previous.some((x,i)=>!Number.isFinite(x.t)||x.t>captured||
           i>0&&x.t<=previous[i-1].t)){
        excluded.invalidChronology++;continue;
      }
      try{
        let card=scheduler.newCard({cardId:a.retrievalTargetId,now:new Date(previous[0].t)});
        for(const x of previous)card=scheduler.review({card,
          grade:grades[x.a.scheduleRating||x.a.rating],now:new Date(x.t)}).card;
        const replayedAt=card.lastReviewAt instanceof Date?
          card.lastReviewAt.getTime():Date.parse(card.lastReviewAt);
        const elapsed=scheduler.chrono.difference(card.lastReviewAt,new Date(captured));
        const expected=scheduler.model.forgettingCurve(card,elapsed);
        if(replayedAt!==previous.at(-1).t||!Number.isFinite(elapsed)||elapsed<0||
           !Number.isFinite(expected)||Math.round(expected*1000000)/1000000!==f.probability){
          excluded.modelMismatch++;continue;
        }
        result.replayed++;
        const delayedWritten=item.t-previous.at(-1).t>=minDelayHours*3600000&&
           captured-previous.at(-1).t>=minDelayHours*3600000&&
           !a.assisted&&a.practiceStage!=='immediate_post_study'&&
           a.inputMode==='written'&&!!a.response?.trim()&&a.requirementVerified===true;
        if(includeVerifiedRows)result.verifiedRows.push({index:item.index,
          targetId:a.retrievalTargetId,t:item.t,probability:f.probability,delayedWritten});
        if(delayedWritten){
          result.eligibleDelayedWritten++;
          if(a.activityKind==='recall'&&a.literalCheck?.version===1&&
             a.literalCheck.method==='literal-match-v1'&&
             typeof a.literalCheck.matched==='boolean'&&
             Array.isArray(a.literalCheck.acceptedSnapshot)&&a.literalCheck.acceptedSnapshot.length)
            result.literalOutcomeCandidates++;
        }
      }catch{excluded.replayFailure++;}
    }
    return result;
  }
  // Descriptive evidence on the *same* replay-verified receipts, with five
  // distinct outcome definitions. This never grades a learner or changes the
  // live policy. It is not a causal comparison of schedules.
  async function auditOutcomes(db,{Vendor=null,Human=null,limit=500,minDelayHours=24}={}){
    const H=Human||(typeof module==='object'&&module.exports?require('./human-review.js'):
      globalThis.ActiveRecallHumanReview);
    if(typeof H?.eligibility!=='function'||typeof H?.fingerprint!=='function')
      throw Error('Human-review evidence checks are unavailable.');
    const {verifiedRows=[],...audit}=await auditReceipts(db,{Vendor,limit,minDelayHours,includeVerifiedRows:true});
    const keys=['literalRecall','selfExplain','selfApply','otherExplain','otherApply'];
    const groups=Object.fromEntries(keys.map(k=>[k,[]]));
    const excluded={noUsableLabel:0,invalidLiteralCheck:0,
      lateOrInvalidHumanReview:0,inconclusiveHumanReview:0};
    const ordered=(db.attempts||[]).map((a,index)=>({a,index,t:Date.parse(a?.createdAt||'')}))
      .sort((x,y)=>(Number.isFinite(x.t)?x.t:Infinity)-(Number.isFinite(y.t)?y.t:Infinity)||x.index-y.index);
    const nextByIndex=new Map(),laterByTarget=new Map();
    for(let i=ordered.length-1;i>=0;i--){
      const x=ordered[i];
      if(!Number.isFinite(x.t)||!x.a?.retrievalTargetId)continue;
      nextByIndex.set(x.index,laterByTarget.get(x.a.retrievalTargetId)??null);
      laterByTarget.set(x.a.retrievalTargetId,x.t);
    }
    const normalise=s=>String(s??'').normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
    for(const row of verifiedRows){
      if(!row.delayedWritten)continue;
      const a=db.attempts[row.index],record={target:row.targetId,t:row.t,
        probability:row.probability,positive:0};
      if(a.activityKind==='recall'&&a.literalCheck){
        const k=a.literalCheck;
        if(k.version!==1||k.method!=='literal-match-v1'||
           typeof k.matched!=='boolean'||!Array.isArray(k.acceptedSnapshot)||
           !k.acceptedSnapshot.length||!k.acceptedSnapshot.every(x=>typeof x==='string')||
           k.matched!==k.acceptedSnapshot.some(x=>normalise(x)===normalise(a.response))){
          excluded.invalidLiteralCheck++;continue;
        }
        record.positive=k.matched?1:0;groups.literalRecall.push(record);continue;
      }
      if((a.activityKind==='explain'||a.activityKind==='apply')&&H.eligibility(a).ok){
        const review=a.humanReviews?.at(-1);
        if(review?.schema===1&&review.method==='manual-criterion-review-v1'&&
           review.responseFingerprint===H.fingerprint(a.response)&&
           review.requirementVersion===a.requirementVersion&&
           review.targetVersion===a.retrievalTargetVersion&&
           ['self','other_person'].includes(review.reviewerRole)&&
           ['all_supported','gap_identified','inconclusive'].includes(review.finding)){
          const when=Date.parse(review.reviewedAt),next=nextByIndex.get(row.index);
          if(!Number.isFinite(when)||when<row.t||next!==null&&next!==undefined&&when>next){
            excluded.lateOrInvalidHumanReview++;continue;
          }
          if(review.finding==='inconclusive'){
            excluded.inconclusiveHumanReview++;continue;
          }
          const key=(review.reviewerRole==='self'?'self':'other')+
            (a.activityKind==='explain'?'Explain':'Apply');
          record.positive=review.finding==='all_supported'?1:0;
          groups[key].push(record);continue;
        }
      }
      excluded.noUsableLabel++;
    }
    const displayGate={minAttempts:50,minTargets:15,minPositive:10,minNegative:10};
    const chronologyGate={minEarlierAttempts:50,minEarlierTargets:15,
      minEarlierPositive:10,minEarlierNegative:10,minLaterAttempts:20,
      minLaterTargets:8,minLaterPositive:5,minLaterNegative:5};
    const targetBrier=rows=>{
      const byTarget=new Map();
      for(const r of rows){
        if(!byTarget.has(r.target))byTarget.set(r.target,[]);
        byTarget.get(r.target).push((r.probability-r.positive)**2);
      }
      const means=[...byTarget.values()].map(values=>values.reduce((s,x)=>s+x,0)/values.length);
      return Math.round(means.reduce((s,x)=>s+x,0)/means.length*10000)/10000;
    };
    const count=rows=>({attempts:rows.length,
      distinctTargets:new Set(rows.map(r=>r.target)).size,
      positiveLabels:rows.filter(r=>r.positive===1).length,
      negativeLabels:rows.filter(r=>r.positive===0).length});
    const summarize=rows=>{
      const all=count(rows),enough=audit.notInspected===0&&
        all.attempts>=displayGate.minAttempts&&all.distinctTargets>=displayGate.minTargets&&
        all.positiveLabels>=displayGate.minPositive&&all.negativeLabels>=displayGate.minNegative;
      const sorted=rows.slice().sort((a,b)=>a.t-b.t),desiredCut=Math.floor(sorted.length*.8);
      let cut=desiredCut;
      while(cut>0&&cut<sorted.length&&sorted[cut-1].t===sorted[cut].t)cut--;
      const earlier=sorted.slice(0,cut||sorted.length),later=cut?sorted.slice(cut):[];
      const first=count(earlier),last=count(later);
      const laterEnough=enough&&first.attempts>=chronologyGate.minEarlierAttempts&&
        first.distinctTargets>=chronologyGate.minEarlierTargets&&
        first.positiveLabels>=chronologyGate.minEarlierPositive&&
        first.negativeLabels>=chronologyGate.minEarlierNegative&&
        last.attempts>=chronologyGate.minLaterAttempts&&
        last.distinctTargets>=chronologyGate.minLaterTargets&&
        last.positiveLabels>=chronologyGate.minLaterPositive&&
        last.negativeLabels>=chronologyGate.minLaterNegative;
      return {...all,brier:enough?targetBrier(rows):null,
        laterWindow:{earlier:first,later:last,firstLaterAt:later.length?
          new Date(later[0].t).toISOString():null,brier:laterEnough?targetBrier(later):null}};
    };
    return {...audit,warning:'Earlier review histories are replayed before any outcome is considered. Only sufficiently diverse, separate delayed-label groups may show descriptive prediction errors. These cannot authenticate original capture timing, verify recall, prove an optimal interval or change the current schedule.',
      evaluation:{version:1,displayGate,chronologyGate,
      groups:Object.fromEntries(keys.map(key=>[key,summarize(groups[key])])),excluded,
      comparableEvidenceLabels:keys.length,modelFitted:false,activePolicyChanged:false,
      warning:'These target-balanced Brier errors, if shown, compare fixed default-weight FSRS-7 guesses with narrowly defined recorded labels, NOT verified memory accuracy. Literal mismatch can be a correct synonym. Manual rubric judgments and reviewer identity are unblinded/unverified. Strict later-time scores require diverse earlier and later outcomes, but targets may recur and scheduling selected the attempts. This is not an independent trial, a policy winner, proven optimal timing, or evidence that changing the calendar would improve learning.'}};
  }
  // A one-step calendar sensitivity analysis. The temporary copy substitutes
  // eligible *next* due dates only. All later revisit windows keep the same
  // conditional agenda heuristic, because no future learner grades exist.
  async function compareCalendar(db,{Core=null,Vendor=null,now=new Date(),limit=500,prefs=null}={}){
    const C=Core||(typeof module==='object'&&module.exports?require('./core.js'):globalThis.ActiveRecallCore);
    const result=await compare(db,{Core:C,Vendor,now,limit});
    const settings=prefs||db.agendaPreferences||{};
    const options={...settings,start:now};
    const baseline=C.buildReviewAgenda(db,options);
    // Copy only the records substituted by this scenario. Source documents
    // may be large; duplicating the entire local notebook is unnecessary.
    const hypothetical={...db,memory:{...db.memory}};
    for(const row of result.rows)hypothetical.memory[row.targetId]={
      ...db.memory[row.targetId],dueAt:row.shadowDueAt};
    const hybrid=C.buildReviewAgenda(hypothetical,options);
    const summarize=agenda=>({
      horizonDays:agenda.days.length,availableMinutes:agenda.days.reduce((n,d)=>n+d.budgetMinutes,0),
      assignedMinutes:round(agenda.days.reduce((n,d)=>n+d.usedSeconds,0)/60),
      firstPassOpportunities:agenda.plannedTargets,unplacedKnownDue:agenda.unplannedDue,
      conditionalRevisits:agenda.conditionalOpportunities,
      preparationSteps:agenda.preparationSteps,unplacedPreparation:agenda.unplannedPreparation
    });
    const firstPass=agenda=>{
      const dates=new Map();
      for(const day of agenda.days)for(const activity of day.activities){
        if(!activity.conditional&&!dates.has(activity.targetId))dates.set(activity.targetId,day.date);
      }
      return dates;
    };
    const current=firstPass(baseline),other=firstPass(hybrid);
    const movements={earlier:0,later:0,unchanged:0,onlyCurrent:0,onlyHybrid:0};
    for(const id of new Set([...current.keys(),...other.keys()])){
      const a=current.get(id),b=other.get(id);
      if(!a)movements.onlyHybrid++;
      else if(!b)movements.onlyCurrent++;
      else if(b<a)movements.earlier++;
      else if(b>a)movements.later++;
      else movements.unchanged++;
    }
    const byExam=new Map(hybrid.coverage.map(x=>[x.assessmentId,x]));
    const end=baseline.days.at(-1)?.date;
    const examCoverage=baseline.coverage.filter(x=>x.date<=end).map(a=>({
      assessmentId:a.assessmentId,title:a.title,date:a.date,eligibleTargets:a.eligibleTargets,
      currentFirstPass:a.firstPass,hybridFirstPass:byExam.get(a.assessmentId)?.firstPass??0
    }));
    return {...result,calendar:{forecastType:'one_step_hybrid_opportunity_comparison',
      firstDate:baseline.days[0]?.date,lastDate:end,modeledNextDueDates:result.rows.length,
      current:summarize(baseline),hybrid:summarize(hybrid),movements,examCoverage,
      warning:'A partial, read-only calendar sensitivity scenario: only eligible targets get hypothetical FSRS-7 next due dates. Excluded and uninspected targets retain their real dates. Both calendars use the same capacity, missed days, exam adjustments and conditional later-revisit heuristic; no future responses are assumed. First passes and exam coverage are opportunities, not verified learning or predicted grades. No saved due dates, attempts, calendar preferences or automatic schedules change.'}};
  }
  return {compare,compareCalendar,forecastProbability,auditReceipts,auditOutcomes};
});
