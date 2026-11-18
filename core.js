(function (root, factory) {
  const core = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.ActiveRecallCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const I = (typeof module !== 'undefined' && module.exports) ? require('./intelligence.js') : globalThis.ActiveRecallIntelligence;
  if (!I) throw Error('Missing local learning-intelligence module.');
  const D=(typeof module !== 'undefined' && module.exports)?require('./document-import.js'):globalThis.ActiveRecallDocumentImport;
  if(!D)throw Error('Missing local document-import module.');
  const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
  if(!H)throw Error('Missing local human-review module.');
  const P=(typeof module!=='undefined'&&module.exports)?require('./paired-review.js'):globalThis.ActiveRecallPairedReview;
  if(!P)throw Error('Missing local paired-review module.');
  const R=(typeof module!=='undefined'&&module.exports)?require('./review-packets.js'):globalThis.ActiveRecallReviewPackets;
  if(!R)throw Error('Missing local offline reviewer-packet module.');
  const F=(typeof module!=='undefined'&&module.exports)?require('./reference-first.js'):globalThis.ActiveRecallReferenceFirst;
  if(!F)throw Error('Missing reference-free human review module.');
  const Pilot=(typeof module!=='undefined'&&module.exports)?require('./reviewer-pilot.js'):globalThis.ActiveRecallReviewerPilot;
  if(!Pilot)throw Error('Missing local prospective reviewer pilot module.');
  const Training=(typeof module!=='undefined'&&module.exports)?require('./reviewer-training.js'):globalThis.ActiveRecallReviewerTraining;
  if(!Training)throw Error('Missing local synthetic reviewer-training module.');
  const Usability=(typeof module!=='undefined'&&module.exports)?require('./reviewer-usability.js'):globalThis.ActiveRecallReviewerUsability;
  if(!Usability)throw Error('Missing voluntary fictional reviewer-usability module.');
  const DAY = 86400000;
  // Policy IDs are immutable labels for decisions. Changing any coefficient
  // requires a new ID; historical decisions must never be recomputed in place.
  const ACTIVE_SCHEDULING_POLICY = 'transparent-interval-v1';
  const SHADOW_SCHEDULING_POLICY = 'conservative-shadow-v1';
  // Shadow policy is a sensitivity analysis, not a recommended intervention.
  // Nothing here predicts the learner's future answer or changes the real due date.
  function schedulePolicyIntervals(prevInterval,scheduleRating,assisted){
    const prior=Number.isFinite(prevInterval)&&prevInterval>0?prevInterval:0;
    const active=scheduleRating==='again'?1/24:scheduleRating==='hard'?Math.max(0.5,prior*1.25,1):scheduleRating==='good'?Math.max(2,prior*2.15):Math.max(4,prior*3.0);
    const conservative=scheduleRating==='again'?1/24:scheduleRating==='hard'?Math.max(1,prior*1.10):scheduleRating==='good'?Math.max(1.5,prior*1.8):Math.max(3,prior*2.4);
    return {activeDays:assisted?Math.min(active,1):active,shadowDays:assisted?Math.min(conservative,1):conservative};
  }

  const id = (prefix) => prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const today = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const addDays = (date, n) => { const d = new Date(date.getTime()); d.setDate(d.getDate() + n); return today(d); };
  const dateStart = (dateString) => { const [y,m,d] = dateString.split('-').map(Number); return new Date(y,m-1,d); };
  const daysUntil = (dateString, now = new Date()) => Math.round((dateStart(dateString) - dateStart(today(now))) / DAY);
  const initialDb = () => ({ schemaVersion: 5, agendaPreferences: {days:21,weekdayMinutes:25,weekendMinutes:60,missedDates:[]}, timeModels: {}, rubricCriteria: [], criterionVersions: [], syllabusObjectives: [], courses: [], sources: [], sourceVersions: [], requirements: [], requirementVersions: [], retrievalTargets: [], activities: [], assessments: [], attempts: [], memory: {}, sessions: [], events: [] });
  const baseTargetId = rid => 'target_' + rid;
  const baseActivityId = rid => 'activity_' + rid;
  // Every learning requirement may contain several distinct retrieval targets.
  // Variations are prompts for the same target; they never create extra due reviews.
  function getTargets(db,requirementId,{includePending=false}={}){
    return (db.retrievalTargets||[]).filter(t=>t.requirementId===requirementId && t.active!==false && (includePending||!t.needsReview));
  }
  function getTarget(db,requirementId){return getTargets(db,requirementId,{includePending:true}).find(t=>t.isPrimary)||getTargets(db,requirementId,{includePending:true})[0];}
  function getMemory(db,requirementId,targetId=null){const t=targetId?(db.retrievalTargets||[]).find(t=>t.id===targetId&&t.requirementId===requirementId):getTarget(db,requirementId);return t?db.memory[t.id]:undefined;}
  function getActivities(db,requirementId,targetId=null){return (db.activities||[]).filter(a=>a.requirementId===requirementId && (!targetId||a.retrievalTargetId===targetId) && a.active!==false);}
  function chooseActivity(db,requirementId,targetId=null){
    const selectedTarget=targetId||getTarget(db,requirementId)?.id;
    const options=getActivities(db,requirementId,selectedTarget);
    const usage=options.map(a=>{
      const attempts=db.attempts.filter(x=>x.activityId===a.id);
      return {activity:a,count:attempts.length,last:attempts.length?attempts[attempts.length-1].createdAt:''};
    });
    usage.sort((a,b)=>a.count-b.count || a.last.localeCompare(b.last) || (a.activity.isPrimary?-1:1));
    return usage[0]?.activity || null;
  }
  function migrateDb(input){
    if(!input || ![1,2,3,4,5].includes(input.schemaVersion))throw Error('This file is not a supported Active Recall Web export.');
    for(const k of ['courses','sources','requirements','assessments','attempts','sessions','events'])
      if(!Array.isArray(input[k]))throw Error('Invalid data structure: '+k);
    if(!input.memory||typeof input.memory!=='object'||Array.isArray(input.memory))throw Error('Missing memory state.');
    if(input.courses.length>5000||input.requirements.length>200000||input.attempts.length>1000000)throw Error('Import exceeds prototype capacity.');
    if(input.schemaVersion>=2){for(const k of ['sourceVersions','requirementVersions','retrievalTargets','activities'])if(!Array.isArray(input[k]))throw Error('Invalid data structure: '+k);}
    if(input.schemaVersion>=3){
      if(input.retrievalTargets.some(t=>!t.id||!t.requirementId)||input.activities.some(a=>!a.retrievalTargetId||!a.requirementId))throw Error('Invalid v3 retrieval-target references.');
      if(input.schemaVersion>=4){
        if(!input.timeModels||typeof input.timeModels!=='object'||Array.isArray(input.timeModels))throw Error('Invalid duration model.');
        for(const [kind,model] of Object.entries(input.timeModels)){
          if(!['recall','explain','apply'].includes(kind)||!model||typeof model!=='object'||
            !Number.isSafeInteger(model.count)||model.count<0||
            !Number.isFinite(model.totalSeconds)||model.totalSeconds<0||
            model.totalSeconds>model.count*1800||model.totalSeconds<model.count*10)
            throw Error('Invalid duration model values.');
        }
      }
      if(input.schemaVersion===5){
        if(!Array.isArray(input.rubricCriteria)||!Array.isArray(input.criterionVersions))throw Error('Missing rubric history.');
        if(input.rubricCriteria.length>500000)throw Error('Too many criteria.');
        const knownTargets=new Set(input.retrievalTargets.map(t=>t.id)),ids=new Set();
        for(const c of input.rubricCriteria){
          if(typeof c.id!=='string'||!c.id||ids.has(c.id)||!knownTargets.has(c.targetId)||typeof c.text!=='string'||!c.text.trim()||!Number.isSafeInteger(c.version)||c.version<1)throw Error('Invalid rubric criterion.');
          if(c.acceptedAlternatives!==undefined){
            if(!Array.isArray(c.acceptedAlternatives)||c.acceptedAlternatives.length>5||c.acceptedAlternatives.some(x=>typeof x!=='string'||!x.trim()||x.length>240))throw Error('Invalid accepted answer formulations in backup.');
            const all=[c.text,...c.acceptedAlternatives].map(x=>x.trim().toLocaleLowerCase());
            if(new Set(all).size!==all.length)throw Error('Repeated accepted answer formulation in backup.');
          }
          if(c.syllabusGoalIds!==undefined){
            if(!Array.isArray(c.syllabusGoalIds)||c.syllabusGoalIds.length>10||new Set(c.syllabusGoalIds).size!==c.syllabusGoalIds.length)throw Error('Invalid rubric syllabus links in backup.');
            const req=input.requirements.find(r=>r.id===c.requirementId);
            if(!req||c.syllabusGoalIds.some(gid=>{
              const g=(input.syllabusObjectives||[]).find(g=>g.id===gid);
              return !g||g.courseId!==req.courseId; // Historical alignments can outlive an archived/unlinked goal.
            }))throw Error('Invalid cross-course rubric syllabus link in backup.');
          }
          ids.add(c.id);
        }
        for(const activity of input.activities){
          const k=activity.exactAnswerKey;
          if(k===undefined)continue;
          const req=input.requirements.find(r=>r.id===activity.requirementId),target=input.retrievalTargets.find(t=>t.id===activity.retrievalTargetId);
          if(activity.kind!=='recall'||!req||!target||!k||!Number.isSafeInteger(k.version)||k.version<1||
            !Array.isArray(k.answers)||!k.answers.length||k.answers.length>5||k.answers.some(x=>typeof x!=='string'||!x.trim()||x.length>120)||
            new Set(k.answers.map(normaliseExactAnswer)).size!==k.answers.length||!Number.isFinite(Date.parse(k.verifiedAt))||
            !Number.isSafeInteger(k.requirementVersion)||k.requirementVersion<1||!Number.isSafeInteger(k.targetVersion)||k.targetVersion<1||
            !Number.isSafeInteger(k.activityVersion)||k.activityVersion<1||
            (k.sourceVersion!==null&&k.sourceVersion!==undefined&&(!Number.isSafeInteger(k.sourceVersion)||k.sourceVersion<1)))
            throw Error('Invalid learner-approved literal answer key in backup.');
        }
        for(const a of input.attempts){
          if(a.literalCheck!==undefined&&a.literalCheck!==null){
            const k=a.literalCheck;
            if(!k||k.version!==1||k.method!=='literal-match-v1'||!Number.isSafeInteger(k.keyVersion)||k.keyVersion<1||
              typeof k.matched!=='boolean'||!Array.isArray(k.acceptedSnapshot)||!k.acceptedSnapshot.length||
              k.acceptedSnapshot.length>5||k.acceptedSnapshot.some(x=>typeof x!=='string'||!x.trim()||x.length>120)||
              a.assisted||a.inputMode!=='written'||typeof a.response!=='string'||!a.response.trim()||
              k.matched!==k.acceptedSnapshot.some(x=>normaliseExactAnswer(x)===normaliseExactAnswer(a.response)))
              throw Error('Invalid historical literal answer check in backup.');
          }
          if(a.practiceStage!==undefined&&!['regular','immediate_post_study'].includes(a.practiceStage))throw Error('Invalid retrieval practice stage in backup.');
          if(a.correctionNote!==undefined&&(typeof a.correctionNote!=='string'||a.correctionNote.length>2000))throw Error('Invalid learner correction note in backup.');
          if(a.priorDueAt!==undefined&&a.priorDueAt!==null&&(typeof a.priorDueAt!=='string'||!Number.isFinite(Date.parse(a.priorDueAt))))throw Error('Invalid historical review window in backup.');
          if(a.priorIntervalDays!==undefined&&a.priorIntervalDays!==null&&(!Number.isFinite(a.priorIntervalDays)||a.priorIntervalDays<0||a.priorIntervalDays>100000))throw Error('Invalid historical review interval in backup.');
          if(a.schedulingDecision!==undefined){
            const d=a.schedulingDecision;
            if(!d||d.version!==1||typeof d.activePolicy!=='string'||typeof d.shadowPolicy!=='string'||
              !/^[a-z][a-z0-9-]{1,79}$/.test(d.activePolicy)||
              !/^[a-z][a-z0-9-]{1,79}$/.test(d.shadowPolicy)||d.activePolicy===d.shadowPolicy||
              !Number.isFinite(d.activeIntervalDays)||d.activeIntervalDays<=0||d.activeIntervalDays>100000||
              !Number.isFinite(d.shadowIntervalDays)||d.shadowIntervalDays<=0||d.shadowIntervalDays>100000||
              typeof d.activeDueAt!=='string'||!Number.isFinite(Date.parse(d.activeDueAt))||
              typeof d.shadowDueAt!=='string'||!Number.isFinite(Date.parse(d.shadowDueAt))||
              !Number.isFinite(Date.parse(a.createdAt))||
              Math.abs((Date.parse(d.activeDueAt)-Date.parse(a.createdAt))/DAY-d.activeIntervalDays)>0.00001||
              Math.abs((Date.parse(d.shadowDueAt)-Date.parse(a.createdAt))/DAY-d.shadowIntervalDays)>0.00001)
              throw Error('Invalid versioned scheduling decision in backup.');
          }
          if(a.criterionChecks?.some(c=>c.acceptedAlternativesSnapshot!==undefined&&(!Array.isArray(c.acceptedAlternativesSnapshot)||c.acceptedAlternativesSnapshot.length>5||c.acceptedAlternativesSnapshot.some(x=>typeof x!=='string'||x.length>240))))throw Error('Invalid historic answer formulations in backup.');
          if(a.criterionChecks===undefined)continue;
          if(!Array.isArray(a.criterionChecks)||a.criterionChecks.some(c=>!c||!ids.has(c.criterionId)||!['met','missed','unsure'].includes(c.status)))throw Error('Invalid criterion attempt history.');
        }
        // Syllabus objectives are an OPTIONAL extension of schema v5; older local
        // histories remain valid and are never rewritten by import validation.
        if(input.syllabusObjectives!==undefined)validateSyllabusObjectives(input);
        for(const e of input.events.filter(e=>e?.type==='question_quality.reviewed')){
          const req=input.requirements.find(r=>r.id===e.entityId);
          if(!req||e.confirmed!==true||e.checklistVersion!==1||
            !Number.isSafeInteger(e.requirementVersion)||e.requirementVersion<1||
            !input.requirementVersions.some(v=>v.requirementId===e.entityId&&v.version===e.requirementVersion)||
            !(e.sourceVersion===null||(Number.isSafeInteger(e.sourceVersion)&&e.sourceVersion>0))||
            (e.sourceVersion!==null&&!input.sourceVersions.some(v=>v.sourceId===req.sourceId&&v.version===e.sourceVersion))||
            typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at)))
            throw Error('Invalid historical human question-quality review in backup.');
        }
        H.validate(input); // Optional, append-only v4.1 annotations; schema v5 stays compatible.
        P.validate(input); // Optional v4.2 independent assessments/adjudication; no migration.
        R.validate(input); // Optional v4.3 request provenance and completed file history.
        F.validate(input); // Optional v4.4 reference-withheld, locked first-pass protocol.
        Pilot.validate(input); // Optional v4.5 prospective screening protocol; no schema migration.
        Training.validate(input); // Optional v4.6 independent synthetic reviewer practice; no schema migration.
        Usability.validate(input); // Optional v4.7 voluntary fictional reviewer usability, unchanged schema.
        return input;
      }
      const upgraded=JSON.parse(JSON.stringify(input));
      upgraded.schemaVersion=5;
      if(input.schemaVersion===3)upgraded.timeModels=buildTimeModels(upgraded.attempts);
      upgraded.rubricCriteria=[];upgraded.criterionVersions=[];
      upgraded.events.push({type:'database.migrated',from:input.schemaVersion,to:5,at:new Date().toISOString()});
      return upgraded;
    }
    // Do not alter the imported data or previous version stored in a browser.
    const db=JSON.parse(JSON.stringify(input));
    if(db.schemaVersion===1){
      db.sourceVersions=[];db.requirementVersions=[];db.retrievalTargets=[];db.activities=[];
      for(const source of db.sources)db.sourceVersions.push({sourceId:source.id,version:source.version||1,title:source.title,content:source.content,createdAt:source.createdAt||new Date().toISOString(),migrated:true});
      for(const req of db.requirements){
        const targetId=baseTargetId(req.id),activityId=baseActivityId(req.id);
        db.retrievalTargets.push({id:targetId,requirementId:req.id,createdAt:req.createdAt||new Date().toISOString(),active:req.active!==false,version:1});
        db.activities.push({id:activityId,requirementId:req.id,question:req.question,answer:req.answer,kind:req.kind||'explain',isPrimary:true,origin:req.origin||'legacy',active:req.active!==false,version:req.version||1,createdAt:req.createdAt||new Date().toISOString()});
        req.sourceVersion=req.sourceVersion||(db.sources.find(s=>s.id===req.sourceId)?.version||1);
        db.requirementVersions.push({requirementId:req.id,version:req.version||1,objective:req.objective||req.question,question:req.question,answer:req.answer,kind:req.kind||'explain',createdAt:req.updatedAt||req.createdAt||new Date().toISOString(),migrated:true});
        if(db.memory[req.id]){db.memory[targetId]=db.memory[req.id];delete db.memory[req.id];}
        for(const attempt of db.attempts.filter(a=>a.requirementId===req.id)){attempt.retrievalTargetId=targetId;attempt.activityId=activityId;attempt.activityVersion=attempt.requirementVersion||1;}
      }
      db.schemaVersion=2;
    }
    for(const req of db.requirements){
      const targets=db.retrievalTargets.filter(t=>t.requirementId===req.id);
      if(!targets.length)throw Error('Missing retrieval target for requirement '+req.id);
      targets.forEach((t,i)=>{t.isPrimary=i===0;t.label=t.label||cleanString(req.objective||req.question,160);t.needsReview=!!t.needsReview;});
      const primary=targets[0];
      for(const a of db.activities.filter(a=>a.requirementId===req.id))a.retrievalTargetId=a.retrievalTargetId||primary.id;
      for(const attempt of db.attempts.filter(a=>a.requirementId===req.id)){
        attempt.retrievalTargetId=attempt.retrievalTargetId||primary.id;
        if(!attempt.retrievalTargetVersion)attempt.retrievalTargetVersion=primary.version||1;
      }
    }
    for(const se of db.sessions){
      if(!se.currentTargetId&&se.currentReqId)se.currentTargetId=getTarget(db,se.currentReqId)?.id||null;
      if(Array.isArray(se.completedIds))se.completedIds=se.completedIds.map(rid=>getTarget(db,rid)?.id||rid);
    }
    db.schemaVersion=5;db.timeModels=buildTimeModels(db.attempts);db.rubricCriteria=[];db.criterionVersions=[];db.events.push({type:'database.migrated',from:input.schemaVersion,to:5,at:new Date().toISOString()});
    return db;
  }
  // Rubric criteria are learner-authored checkpoints for one retrieval target.
  // They are not AI grades, and older attempts never acquire checks retroactively.
  function getCriteria(db,targetId,{includePending=false,includeArchived=false}={}){
    return (db.rubricCriteria||[]).filter(c=>c.targetId===targetId && (includeArchived||c.active!==false) && (includePending||!c.needsReview));
  }
  function addCriterion(db,{targetId,text}){
    const target=(db.retrievalTargets||[]).find(t=>t.id===targetId&&t.active!==false);
    if(!target)throw Error('Recall focus area not found.');
    text=cleanString(text,240);
    if(!text)throw Error('Enter a specific piece of evidence to check.');
    if(getCriteria(db,targetId,{includePending:true}).some(c=>c.text.toLowerCase()===text.toLowerCase()))throw Error('This criterion already exists.');
    const at=new Date().toISOString();
    const criterion={id:id('criterion'),targetId,requirementId:target.requirementId,text,version:1,active:true,needsReview:false,createdAt:at};
    db.rubricCriteria.push(criterion);
    db.criterionVersions.push({criterionId:criterion.id,version:1,text,createdAt:at});
    db.events.push({type:'criterion.created',entityId:criterion.id,targetId,at});return criterion;
  }
  // Non-destructive, idempotent, inspectable proposals from a source quotation.
  // Proposed checkpoints are HELD from practice until explicitly verified.
  function proposeCriteria(db,{targetId,limit=5}={}){
    const target=(db.retrievalTargets||[]).find(t=>t.id===targetId&&t.active!==false);
    if(!target)throw Error('Recall focus area not found.');
    const req=db.requirements.find(r=>r.id===target.requirementId&&r.active!==false);
    if(!req)throw Error('Requirement not found.');
    const activity=getActivities(db,req.id,targetId).find(a=>a.isPrimary)||getActivities(db,req.id,targetId)[0];
    if(req.sourceRevisionPending)throw Error('Verify the revised source and question before suggesting new rubric checkpoints.');
    const quote=(target.isPrimary && req.sourceQuote)||activity?.answer||req.answer;
    const candidates=I.suggestCriteria(quote,limit);
    const existing=new Set(getCriteria(db,targetId,{includePending:true}).map(c=>I.norm(c.sourceQuote||c.text.replace(/^[^:]{2,32}:\s*/,''))));
    const created=[],at=new Date().toISOString();
    for(const suggestion of candidates){
      const normalized=I.norm(suggestion.sourceQuote);
      if(existing.has(normalized))continue;
      const c={id:id('criterion'),targetId,requirementId:req.id,text:suggestion.text,version:1,active:true,needsReview:true,createdAt:at,origin:'offline_criterion_draft',sourceId:target.isPrimary?req.sourceId:null,sourceVersion:target.isPrimary?req.sourceVersion:null,sourceQuote:suggestion.sourceQuote,sourceStart:target.isPrimary&&Number.isInteger(req.sourceStart)?req.sourceStart+suggestion.sourceStart:null,sourceEnd:target.isPrimary&&Number.isInteger(req.sourceStart)?req.sourceStart+suggestion.sourceEnd:null,rule:suggestion.rule};
      db.rubricCriteria.push(c);db.criterionVersions.push({criterionId:c.id,version:1,text:c.text,createdAt:at,origin:c.origin,sourceQuote:c.sourceQuote});
      db.events.push({type:'criterion.suggested',entityId:c.id,targetId,sourceId:c.sourceId,at});
      created.push(c);existing.add(normalized);
    }
    return created;
  }
  // Read-only structural rubric audit. Exact quoted evidence is not the same
  // as a scientific accuracy check or a complete marking scheme. Never infer
  // correctness, mastery or a memory interval from a generated suggestion.
  function rubricQualityReview(db,targetId,{limit=12}={}){
    const target=(db.retrievalTargets||[]).find(t=>t.id===targetId&&t.active!==false);
    if(!target)throw Error('Recall focus area not found.');
    const req=db.requirements.find(r=>r.id===target.requirementId&&r.active!==false);
    if(!req)throw Error('Requirement not found.');
    const primary=getActivities(db,req.id,targetId).find(a=>a.isPrimary)||getActivities(db,req.id,targetId)[0];
    const source=target.isPrimary?db.sources.find(s=>s.id===req.sourceId):null;
    const exactSource=!!(source&&typeof req.sourceQuote==='string'&&Number.isInteger(req.sourceStart)
      &&source.content.slice(req.sourceStart,req.sourceStart+req.sourceQuote.length)===req.sourceQuote);
    const changed=!!(target.isPrimary&&source&&(req.sourceRevisionPending||source.version!==req.sourceVersion||!exactSource));
    const basis=exactSource?'saved source excerpt':'reference answer (not independently source-validated)';
    const raw=exactSource?req.sourceQuote:(primary?.answer||req.answer||'');
    const candidates=I.suggestCriteria(raw,limit);
    const criteria=getCriteria(db,targetId,{includePending:true});
    const suggestions=candidates.map((p,index)=>{
      // Only the *same exact quotation* establishes a link. Human-authored
      // paraphrases may be valid but cannot safely be scored by word overlap.
      const matched=criteria.filter(c=>c.sourceQuote===p.sourceQuote || c.text===p.text);
      const status=matched.some(c=>!c.needsReview)?'linked_verified':matched.length?'linked_draft':'not_explicitly_linked';
      return {...p,index,status};
    });
    return {targetId,requirementId:req.id,requirementVersion:req.version,sourceVersion:source?.version??null,basis,context:raw.slice(0,750),
      sourceChanged:changed,verifiedCriteria:criteria.filter(c=>!c.needsReview).length,pendingCriteria:criteria.filter(c=>c.needsReview).length,
      suggestions,unlinked:suggestions.filter(p=>p.status==='not_explicitly_linked').length,
      warning:'Heuristic scan of exact excerpts only. Unlinked does not mean absent: manually authored criteria may express the same idea. Check scientific accuracy, qualifiers and what the question actually requires.'};
  }
  function addRubricEvidenceDraft(db,{targetId,index,sourceVersion=null,requirementVersion=null,expectedQuote=null}={}){
    if(!Number.isSafeInteger(index)||index<0)throw Error('Invalid evidence selection. Reopen the rubric review.');
    const review=rubricQualityReview(db,targetId);
    if(review.sourceChanged)throw Error('The source changed. Verify the source and question before suggesting criteria.');
    if(review.sourceVersion!==sourceVersion||review.requirementVersion!==requirementVersion)throw Error('The source or question version changed. Reopen the rubric review.');
    const evidence=review.suggestions[index];
    if(!evidence)throw Error('Evidence selection no longer exists. Reopen the rubric review.');
    if(expectedQuote!==evidence.sourceQuote)throw Error('The evidence text changed. Reopen the rubric review.');
    if(evidence.status!=='not_explicitly_linked')throw Error('This excerpt is already linked to a checklist point.');
    const req=db.requirements.find(r=>r.id===review.requirementId);
    const target=db.retrievalTargets.find(t=>t.id===targetId);
    const at=new Date().toISOString();
    const quoteSource=review.basis==='saved source excerpt';
    const c={id:id('criterion'),targetId,requirementId:req.id,text:evidence.text,version:1,
      active:true,needsReview:true,origin:'offline_criterion_draft',createdAt:at,
      sourceId:quoteSource?req.sourceId:null,sourceVersion:quoteSource?req.sourceVersion:null,
      sourceQuote:evidence.sourceQuote,sourceStart:quoteSource?req.sourceStart+evidence.sourceStart:null,
      sourceEnd:quoteSource?req.sourceStart+evidence.sourceEnd:null,rule:evidence.rule,structureType:evidence.type};
    if(quoteSource){
      const source=db.sources.find(s=>s.id===req.sourceId);
      if(!source||source.content.slice(c.sourceStart,c.sourceEnd)!==c.sourceQuote)throw Error('Original source no longer matches the selected excerpt.');
    }
    db.rubricCriteria.push(c);
    db.criterionVersions.push({criterionId:c.id,version:1,text:c.text,createdAt:at,origin:c.origin,sourceQuote:c.sourceQuote});
    db.events.push({type:'criterion.suggested',entityId:c.id,targetId,sourceId:c.sourceId,at});
    return c;
  }
  function reviseCriterion(db,criterionId,text){
    const c=(db.rubricCriteria||[]).find(c=>c.id===criterionId&&c.active!==false);
    if(!c)throw Error('Criterion not found.');
    text=cleanString(text,240);
    if(!text)throw Error('Criterion text cannot be empty.');
    if(c.text===text)return c;
    if(getCriteria(db,c.targetId,{includePending:true}).some(x=>x.id!==c.id&&x.text.toLowerCase()===text.toLowerCase()))throw Error('This criterion already exists.');
    const at=new Date().toISOString();
    c.version++;c.text=text;c.updatedAt=at;
    // A changed required idea may invalidate its previously accepted paraphrases
    // and goal mapping. Keep history, but require the learner to review these again.
    const hadSupplement=!!((c.acceptedAlternatives||[]).length||(c.syllabusGoalIds||[]).length);
    if(hadSupplement){c.acceptedAlternatives=[];c.syllabusGoalIds=[];c.needsReview=true;}
    else c.needsReview=false;
    db.criterionVersions.push({criterionId:c.id,version:c.version,text,createdAt:at});
    db.events.push({type:'criterion.revised',entityId:c.id,version:c.version,at});return c;
  }
  // One rubric point may have several learner-reviewed, acceptable expressions.
  // These are examples for self-check; the app NEVER compares or grades answers automatically.
  // A change increments the criterion version and holds it out of practice until verified.
  function setCriterionAlternatives(db,criterionId,raw){
    const c=(db.rubricCriteria||[]).find(c=>c.id===criterionId&&c.active!==false);
    if(!c)throw Error('Criterion not found.');
    if(typeof raw!=='string'||raw.length>1500)throw Error('Alternative formulations must be plain text under 1,500 characters.');
    const alternatives=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(alternatives.length>5||alternatives.some(x=>x.length>240))throw Error('Use no more than five alternatives, each under 240 characters.');
    const keys=[c.text,...alternatives].map(x=>x.toLocaleLowerCase());
    if(new Set(keys).size!==keys.length)throw Error('Alternative formulations must be distinct from the criterion and one another.');
    if(JSON.stringify(c.acceptedAlternatives||[])===JSON.stringify(alternatives))return c;
    const at=new Date().toISOString();
    c.version++;c.acceptedAlternatives=alternatives;c.needsReview=true;c.updatedAt=at;
    db.criterionVersions.push({criterionId:c.id,version:c.version,text:c.text,acceptedAlternatives:[...alternatives],createdAt:at});
    db.events.push({type:'criterion.alternatives_revised',entityId:c.id,version:c.version,at});
    return c;
  }
  // Syllabus alignment is explicit human annotation, not curriculum coverage,
  // automated grading, a new retrieval target or evidence of recall.
  function rubricSyllabusAlignment(db,targetId){
    const target=(db.retrievalTargets||[]).find(t=>t.id===targetId&&t.active!==false);
    if(!target)throw Error('Recall focus area not found.');
    const req=db.requirements.find(r=>r.id===target.requirementId);
    if(!req)throw Error('Requirement not found.');
    const criteria=getCriteria(db,targetId,{includePending:true});
    const goals=(db.syllabusObjectives||[]).filter(g=>g.active!==false&&g.courseId===req.courseId&&g.requirementIds.includes(req.id));
    return {targetId,requirementId:req.id,goals:goals.map(g=>{
      const linked=criteria.filter(c=>(c.syllabusGoalIds||[]).includes(g.id));
      return {id:g.id,text:g.text,verifiedCriteria:linked.filter(c=>!c.needsReview).length,pendingCriteria:linked.filter(c=>c.needsReview).length,unmappedCriteria:criteria.length-linked.length};
    }),warning:'Explicit links record intended alignment, not proof that a syllabus goal is fully covered or that the science is correct.'};
  }
  function setCriterionSyllabusGoals(db,criterionId,goalIds){
    const c=(db.rubricCriteria||[]).find(c=>c.id===criterionId&&c.active!==false);
    if(!c)throw Error('Criterion not found.');
    if(!Array.isArray(goalIds)||goalIds.length>10||goalIds.some(x=>typeof x!=='string')||new Set(goalIds).size!==goalIds.length)throw Error('Invalid syllabus goal selection.');
    const req=db.requirements.find(r=>r.id===c.requirementId&&r.active!==false);
    if(!req)throw Error('Requirement not found.');
    for(const gid of goalIds){
      const g=(db.syllabusObjectives||[]).find(g=>g.id===gid&&g.active!==false);
      if(!g||g.courseId!==req.courseId||!g.requirementIds.includes(req.id))throw Error('Link the question to an active syllabus objective in the same course first.');
    }
    const sorted=[...goalIds].sort();
    if(JSON.stringify([...(c.syllabusGoalIds||[])].sort())===JSON.stringify(sorted))return c;
    c.syllabusGoalIds=sorted;c.updatedAt=new Date().toISOString();
    db.events.push({type:'criterion.syllabus_aligned',entityId:c.id,syllabusGoalIds:[...sorted],at:c.updatedAt});
    return c;
  }
  function verifyCriterion(db,criterionId){
    const c=(db.rubricCriteria||[]).find(c=>c.id===criterionId&&c.active!==false);
    if(!c)throw Error('Criterion not found.');
    c.needsReview=false;c.reviewedAt=new Date().toISOString();
    db.events.push({type:'criterion.verified',entityId:c.id,at:c.reviewedAt});return c;
  }
  function archiveCriterion(db,criterionId){
    const c=(db.rubricCriteria||[]).find(c=>c.id===criterionId&&c.active!==false);
    if(!c)throw Error('Criterion not found.');
    c.active=false;c.archivedAt=new Date().toISOString();
    db.events.push({type:'criterion.archived',entityId:c.id,at:c.archivedAt});return c;
  }
  function criterionStatus(db,targetId,requirementVersion=null){
    const criteria=getCriteria(db,targetId),result={total:criteria.length,met:0,missed:0,unsure:0,unassessed:0,checked:0,allMet:false,attemptId:null};
    const target=(db.retrievalTargets||[]).find(t=>t.id===targetId);
    const attempts=db.attempts.filter(a=>a.retrievalTargetId===targetId && (!target||a.retrievalTargetVersion===target.version) && (requirementVersion===null||a.requirementVersion===requirementVersion));
    // Only the latest applicable attempt describes the current evidence snapshot.
    // Do not quietly carry older 'included' checks over a later attempt that omitted them.
    // An unassessed criterion is unknown, not failed.
    const last=attempts[attempts.length-1];
    for(const c of criteria){
      const check=(last?.criterionChecks||[]).find(x=>x.criterionId===c.id&&x.version===c.version);
      if(!check){result.unassessed++;continue;}
      result[check.status]++;result.checked++;
    }
    result.allMet=result.total>0&&result.met===result.total;
    return result;
  }
  function rubricProgress(db){
    const all={total:0,met:0,missed:0,unsure:0,unassessed:0,pendingReview:0,targetsWithRubric:0,attemptsWithChecks:db.attempts.filter(a=>Array.isArray(a.criterionChecks)&&a.criterionChecks.length).length};
    for(const target of db.retrievalTargets||[]){
      if(target.active===false)continue;
      const req=db.requirements.find(r=>r.id===target.requirementId&&r.active);if(!req)continue;
      const p=criterionStatus(db,target.id,req.version);
      if(p.total)all.targetsWithRubric++;
      for(const k of ['total','met','missed','unsure','unassessed'])all[k]+=p[k];
      all.pendingReview+=getCriteria(db,target.id,{includePending:true}).filter(c=>c.needsReview).length;
    }
    return all;
  }
  function addRetrievalTarget(db,{requirementId,label,question,answer,kind='explain'}){
    const req=db.requirements.find(r=>r.id===requirementId&&r.active);
    if(!req)throw Error('Choose an active learning requirement.');
    label=cleanString(label,160);question=cleanString(question,500);answer=cleanString(answer,4000);
    if(!label||!question||!answer)throw Error('Enter a focus area, question, and reference answer.');
    if(getTargets(db,requirementId,{includePending:true}).some(t=>t.label.toLowerCase()===label.toLowerCase()))throw Error('A focus area with this name already exists.');
    if(getActivities(db,requirementId).some(a=>a.question.trim().toLowerCase()===question.toLowerCase()))throw Error('This question already exists.');
    const at=new Date().toISOString(),target={id:id('target'),requirementId,label,isPrimary:false,active:true,needsReview:false,version:1,createdAt:at};
    const activity={id:id('activity'),requirementId,retrievalTargetId:target.id,question,answer,kind:['recall','explain','apply'].includes(kind)?kind:'explain',isPrimary:true,origin:'user_focus_area',active:true,version:1,createdAt:at};
    db.retrievalTargets.push(target);db.activities.push(activity);
    db.events.push({type:'retrieval_target.created',entityId:target.id,requirementId,at});
    return {target,activity};
  }
  function verifyRetrievalTarget(db,targetId){
    const target=db.retrievalTargets.find(t=>t.id===targetId&&t.active);
    if(!target)throw Error('Focus area not found.');
    target.needsReview=false;target.reviewedAt=new Date().toISOString();
    db.events.push({type:'retrieval_target.verified',entityId:target.id,at:target.reviewedAt});return target;
  }
  function addActivityVariant(db,{requirementId,targetId=null,question,answer,kind}){
    const req=db.requirements.find(r=>r.id===requirementId&&r.active);
    if(!req)throw Error('Choose an active learning requirement.');
    const target=targetId?getTargets(db,requirementId,{includePending:true}).find(t=>t.id===targetId):getTarget(db,requirementId);
    if(!target)throw Error('Choose a valid focus area.');
    question=cleanString(question,500);answer=cleanString(answer,4000);
    if(!question||!answer)throw Error('Enter a question and reference answer.');
    if(getActivities(db,requirementId).some(a=>a.question.trim().toLowerCase()===question.toLowerCase()))throw Error('This question variation already exists.');
    const at=new Date().toISOString();
    const activity={id:id('activity'),requirementId,retrievalTargetId:target.id,question,answer,kind:['recall','explain','apply'].includes(kind)?kind:req.kind,isPrimary:false,origin:'user_variant',active:true,version:1,createdAt:at};
    db.activities.push(activity);db.events.push({type:'activity.created',entityId:activity.id,requirementId,targetId:target.id,at});return activity;
  }
  function deactivateActivity(db,activityId){
    const a=(db.activities||[]).find(x=>x.id===activityId&&x.active);
    if(!a||a.isPrimary)throw Error('Only additional question variations can be archived.');
    a.active=false;a.archivedAt=new Date().toISOString();
    db.events.push({type:'activity.archived',entityId:a.id,requirementId:a.requirementId,at:a.archivedAt});return a;
  }
  function reviseSource(db,sourceId,{title,content}){
    const source=db.sources.find(s=>s.id===sourceId);if(!source)throw Error('Source not found.');
    title=cleanString(title,120)||'Untitled learning';content=cleanString(content,20000);
    if(!content)throw Error('Source content cannot be empty.');
    if(title===source.title&&content===source.content)return source;
    const at=new Date().toISOString();
    source.version=(source.version||1)+1;source.title=title;source.content=content;source.updatedAt=at;if(source.importAudit)source.importAudit={...source.importAudit,reviewedAt:null,needsRecheck:true};if(source.documentGroupId)source.documentOutline=D.buildOutline(content,source.importFormat||'txt');
    db.sourceVersions.push({sourceId:source.id,version:source.version,title,content,createdAt:at});
    const affected=db.requirements.filter(r=>r.active&&(r.sourceId===sourceId||(r.additionalSourceIds||[]).includes(sourceId)));
    for(const req of affected){req.sourceRevisionPending=true;req.sourceCurrentVersion=source.version;for(const t of getTargets(db,req.id,{includePending:true}))for(const c of getCriteria(db,t.id,{includePending:true}))c.needsReview=true;}
    db.events.push({type:'source.revised',entityId:source.id,version:source.version,affectedRequirements:affected.map(r=>r.id),at});
    return source;
  }
  function cleanString(x, max = 4000) { return String(x ?? '').trim().slice(0, max); }
  // Explicit syllabus requirements: these are goals supplied by the learner,
  // not extracted claims, graded knowledge, or automatically scheduled tasks.
  // Optional in schema-v5 backups so historic browser data imports unchanged.
  function validateSyllabusObjectives(db){
    const values=db.syllabusObjectives;
    if(!Array.isArray(values)||values.length>10000)throw Error('Invalid syllabus objective records.');
    const courses=new Set(db.courses.map(c=>c.id)),ids=new Set(),requirements=new Map(db.requirements.map(r=>[r.id,r.courseId])),sources=new Map(db.sources.map(s=>[s.id,s]));
    for(const g of values){
      if(!g||typeof g.id!=='string'||!g.id||ids.has(g.id)||!courses.has(g.courseId)||
        typeof g.text!=='string'||!g.text.trim()||g.text.length>400||
        !Array.isArray(g.requirementIds)||g.requirementIds.length>100||
        g.requirementIds.some(rid=>typeof rid!=='string'||requirements.get(rid)!==g.courseId)||
        (g.materialsReady!==undefined&&typeof g.materialsReady!=='boolean')||
        (g.materialsReadyAt!==undefined&&g.materialsReadyAt!==null&&(typeof g.materialsReadyAt!=='string'||!Number.isFinite(Date.parse(g.materialsReadyAt))))||
        (g.learningGuide!==undefined&&(!g.learningGuide||typeof g.learningGuide!=='object'||Array.isArray(g.learningGuide)||
          typeof g.learningGuide.sourceId!=='string'||!sources.has(g.learningGuide.sourceId)||sources.get(g.learningGuide.sourceId).courseId!==g.courseId||
          !Number.isSafeInteger(g.learningGuide.sourceVersion)||g.learningGuide.sourceVersion<1||g.learningGuide.sourceVersion>sources.get(g.learningGuide.sourceId).version||
          typeof g.learningGuide.workedExample!=='string'||g.learningGuide.workedExample.length>4000||
          typeof g.learningGuide.updatedAt!=='string'||!Number.isFinite(Date.parse(g.learningGuide.updatedAt)))))
        throw Error('Invalid syllabus objective or cross-course link.');
      if(new Set(g.requirementIds).size!==g.requirementIds.length)throw Error('Duplicate syllabus objective link.');
      ids.add(g.id);
    }
  }
  function syllabusGoals(db,courseId){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    return (db.syllabusObjectives||[]).filter(g=>g.courseId===courseId&&g.active!==false);
  }
  function addSyllabusObjectives(db,{courseId,text}){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    const raw=String(text??'');if(raw.length>30000)throw Error('Syllabus paste is too long (30,000 characters maximum).');
    const lines=raw.split(/\r?\n/).map(s=>s.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/u,'').trim()).filter(Boolean);
    if(!lines.length)throw Error('Paste at least one learning objective, one per line.');
    if(lines.length>150)throw Error('Add no more than 150 objectives at once.');
    if(lines.some(x=>x.length>400))throw Error('Keep each objective under 400 characters.');
    const current=syllabusGoals(db,courseId),seen=new Set(current.map(x=>x.text.toLocaleLowerCase()));
    const newGoals=[];for(const text of lines){const key=text.toLocaleLowerCase();if(seen.has(key))continue;seen.add(key);newGoals.push(text);}
    if((db.syllabusObjectives||[]).length+newGoals.length>10000)throw Error('Too many syllabus objectives.');
    const at=new Date().toISOString();db.syllabusObjectives=db.syllabusObjectives||[];
    for(const text of newGoals){const g={id:id('goal'),courseId,text,requirementIds:[],active:true,createdAt:at,updatedAt:at};db.syllabusObjectives.push(g);db.events.push({type:'syllabus.objective_added',entityId:g.id,courseId,at});}
    return {added:newGoals.length,skipped:lines.length-newGoals.length};
  }
  function getSyllabusGoal(db,goalId){const g=(db.syllabusObjectives||[]).find(g=>g.id===goalId&&g.active!==false);if(!g)throw Error('Syllabus objective not found.');return g;}
  function updateSyllabusObjective(db,goalId,text){
    const g=getSyllabusGoal(db,goalId);text=String(text??'').trim();
    if(!text||text.length>400)throw Error('Enter an objective under 400 characters.');
    if(syllabusGoals(db,g.courseId).some(x=>x.id!==g.id&&x.text.toLocaleLowerCase()===text.toLocaleLowerCase()))throw Error('This syllabus objective already exists.');
    if(g.text!==text){g.text=text;g.updatedAt=new Date().toISOString();db.events.push({type:'syllabus.objective_edited',entityId:g.id,at:g.updatedAt});}return g;
  }
  function setSyllabusLink(db,goalId,requirementId,linked=true){
    const g=getSyllabusGoal(db,goalId),r=db.requirements.find(r=>r.id===requirementId);
    if(!r||r.courseId!==g.courseId)throw Error('Choose a question from the same course.');
    const set=new Set(g.requirementIds);
    if(linked)set.add(requirementId);else set.delete(requirementId);
    if(set.size>100)throw Error('Too many question links for one syllabus objective.');
    g.requirementIds=[...set];g.updatedAt=new Date().toISOString();
    db.events.push({type:linked?'syllabus.question_linked':'syllabus.question_unlinked',entityId:goalId,requirementId,at:g.updatedAt});return g;
  }
  // Material preparation is a learner-attested workflow step. NEVER a recall grade,
  // memory record, verified objective or claim of actual understanding.
  function setSyllabusMaterialsReady(db,goalId,ready){
    if(typeof ready!=='boolean')throw Error('Preparation confirmation must be true or false.');
    const goal=getSyllabusGoal(db,goalId);
    if(goal.materialsReady===ready)return goal;
    const at=new Date().toISOString();goal.materialsReady=ready;goal.materialsReadyAt=ready?at:null;goal.updatedAt=at;
    db.events.push({type:ready?'syllabus.materials_prepared':'syllabus.preparation_reopened',entityId:goal.id,at});
    return goal;
  }
  // Learner-chosen, course-local source and learner-written worked explanation.
  // Saving this guide never verifies a requirement or creates learning evidence.
  function setSyllabusLearningGuide(db,goalId,{sourceId,workedExample=''}){
    const goal=getSyllabusGoal(db,goalId),source=db.sources.find(s=>s.id===sourceId&&s.courseId===goal.courseId);
    if(!source)throw Error('Choose a saved source from the same course.');
    if(typeof workedExample!=='string'||workedExample.length>4000)throw Error('Worked explanation must contain no more than 4,000 characters.');
    const at=new Date().toISOString();goal.learningGuide={sourceId:source.id,sourceVersion:source.version,workedExample:workedExample.trim(),updatedAt:at};goal.updatedAt=at;
    db.events.push({type:'syllabus.learning_guide_saved',entityId:goal.id,sourceId:source.id,sourceVersion:source.version,at});
    return goal.learningGuide;
  }
  function guidedLearningInfo(db,goalId){
    const goal=getSyllabusGoal(db,goalId),guide=goal.learningGuide||null;
    const source=guide?db.sources.find(s=>s.id===guide.sourceId&&s.courseId===goal.courseId):null;
    const stale=!!guide&&(!source||source.version!==guide.sourceVersion);
    // Only explicitly linked, current, verified questions can be retrieved.
    const available=eligibleCandidates(db).filter(c=>c.req.courseId===goal.courseId&&goal.requirementIds.includes(c.req.id));
    const candidate=available[0]||null;
    return {goal,guide,source,stale,question:candidate?{requirementId:candidate.req.id,targetId:candidate.target.id,activityId:candidate.activity.id,question:candidate.activity.question,answer:candidate.activity.answer,criteria:getCriteria(db,candidate.target.id)}:null};
  }
  function archiveSyllabusObjective(db,goalId){const g=getSyllabusGoal(db,goalId);g.active=false;g.updatedAt=new Date().toISOString();db.events.push({type:'syllabus.objective_archived',entityId:g.id,at:g.updatedAt});return g;}
  const stopWords=new Set('a an and are as at be can describe do does explain for from how in into is it its of on or our the their this to under what when where which why with without using different between discuss compare identify understand able learning about evidence process concept system model'.split(' '));
  function goalTerms(s){return new Set(String(s||'').toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.filter(x=>!stopWords.has(x))||[]);}
  function goalMatch(goalText,candidateText){
    const goal=goalTerms(goalText),other=goalTerms(candidateText);
    if(!goal.size||!other.size)return 0;
    let shared=0;for(const term of goal)if(other.has(term))shared++;
    return shared>=2?(2*shared)/(goal.size+other.size):0;
  }
  function syllabusCoverage(db,courseId){
    const goals=syllabusGoals(db,courseId),reqs=db.requirements.filter(r=>r.courseId===courseId&&r.active!==false),sources=db.sources.filter(s=>s.courseId===courseId);
    const rows=goals.map(g=>{
      const mapped=g.requirementIds.map(rid=>db.requirements.find(r=>r.id===rid)).filter(Boolean);
      const eligible=mapped.filter(r=>r.active!==false&&r.verificationStatus==='verified'&&!r.sourceRevisionPending&&getTargets(db,r.id).length&&getActivities(db,r.id).length);
      const status=eligible.length?'linked_verified':mapped.length?'linked_review':'unlinked';
      const candidates=reqs.filter(r=>!g.requirementIds.includes(r.id)).map(r=>({id:r.id,question:r.question,score:goalMatch(g.text,[r.objective,r.question,r.sourceQuote].join(' ')),verified:r.verificationStatus==='verified'&&!r.sourceRevisionPending})).filter(x=>x.score>=0.55).sort((a,b)=>b.score-a.score).slice(0,3);
      const relatedSources=sources.map(s=>({id:s.id,title:s.title,score:Math.max(0,...String(s.content).slice(0,16000).split(/[.?!;\n]+/).slice(0,200).map(line=>goalMatch(g.text,line)))})).filter(x=>x.score>=0.55).sort((a,b)=>b.score-a.score).slice(0,3);
      return {id:g.id,text:g.text,status,materialsReady:g.materialsReady===true,links:mapped.map(r=>({id:r.id,question:r.question,verified:eligible.includes(r)})),candidates,relatedSources};
    });
    return {courseId,total:rows.length,linkedVerified:rows.filter(r=>r.status==='linked_verified').length,linkedReview:rows.filter(r=>r.status==='linked_review').length,unlinked:rows.filter(r=>r.status==='unlinked').length,rows,warning:'A syllabus objective is linked to a verified question only after you explicitly connect it. Suggestions use simple word overlap, not a proof of curriculum coverage, scientific accuracy or mastery.'};
  }
  function addCourse(db, name) {
    name=cleanString(name,80);
    if(!name) throw Error('Enter a course name.');
    if(db.courses.some(c=>c.name.toLowerCase()===name.toLowerCase())) throw Error('This course already exists.');
    const course={id:id('course'),name,createdAt:new Date().toISOString()};
    db.courses.push(course); db.events.push({type:'course.created',entityId:course.id,at:course.createdAt});
    return course;
  }
  function draftRequirements(text, limit=12){
    return I.analyzeNotes(text, [], null, limit).drafts;
  }
  function addSource(db, {courseId,title,content,preserveRaw=false,generateDrafts=true}) {
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    title=cleanString(title,120)||'Untitled learning'; content=preserveRaw?String(content??''):cleanString(content,20000);
    if(content.length>20000)throw Error('Source part exceeds the 20,000 character limit.');
    if(!content)throw Error('Enter your learning notes.');
    const createdAt=new Date().toISOString();
    const source={id:id('source'),courseId,title,content,version:1,createdAt,analysisEngine:generateDrafts?'offline-rules-v1':'manual-notes-only',duplicateLinks:[],conflictLinks:[]};
    // Saving lecture notes must not force low-confidence questions into the
    // knowledge base. Rule proposals are opt-in from the capture UI.
    const analysis=generateDrafts?I.analyzeNotes(content,db.requirements,courseId,12):{drafts:[],duplicates:[],conflicts:[]};
    // Preserve source even when all content was already captured.
    db.sources.push(source);db.sourceVersions.push({sourceId:source.id,version:1,title,content,createdAt}); db.events.push({type:'source.created',entityId:source.id,at:createdAt});
    for(const conflict of analysis.conflicts) source.conflictLinks.push(conflict.existingRequirementId);
    for(const duplicate of analysis.duplicates) {
      source.duplicateLinks.push(duplicate.existingRequirementId);
      const existing=db.requirements.find(r=>r.id===duplicate.existingRequirementId);
      if(existing){
        existing.additionalSourceIds=Array.from(new Set([...(existing.additionalSourceIds||[]),source.id]));
        db.events.push({type:'requirement.source_linked',entityId:existing.id,sourceId:source.id,at:createdAt});
      }
    }
    for(const draft of analysis.drafts){
      const req=addRequirement(db,{courseId,sourceId:source.id,...draft});
      if(draft.kind==='explain' && draft.confidence==='structured')
        proposeCriteria(db,{targetId:getTarget(db,req.id).id,limit:4});
    }
    return {source,added:analysis.drafts.length,duplicates:analysis.duplicates.length,conflicts:analysis.conflicts.length,needsReview:analysis.drafts.filter(r=>r.confidence==='review').length};
  }
  // Import is all-or-nothing. Each part is a complete, exact slice of the
  // extracted text, with source offsets relative to that slice.
  function addImportedDocument(db,{courseId,title,document,generateDrafts=true}){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    if(!document||!['txt','md','pdf'].includes(document.format))throw Error('Invalid imported document.');
    if(document.format==='pdf'&&document.reviewed!==true)throw Error('Review extracted PDF text against the original before importing.');
    if(document.format==='pdf'&&document.extractionAudit?.missingPages?.length&&document.missingPagesAcknowledged!==true)throw Error('Acknowledge pages with missing text before importing.');
    const content=D.validateText(document.content),parts=D.chunkText(content),outline=D.buildOutline(content,document.format);
    const documentGroupId=id('document'),startedAt=new Date().toISOString();
    const candidate=JSON.parse(JSON.stringify(db));
    const results=[];
    const filename=String(document.name||'Imported document').slice(0,180);
    const baseTitle=cleanString(title||filename,90)||'Imported document';
    for(let i=0;i<parts.length;i++){
      const part=parts[i],displayTitle=parts.length===1?baseTitle:`${baseTitle} — part ${i+1}/${parts.length}`;
      const result=addSource(candidate,{courseId,title:displayTitle,content:part.text,preserveRaw:true,generateDrafts});
      Object.assign(result.source,{documentGroupId,importName:filename,importFormat:document.format,importPart:i+1,importPartCount:parts.length,importOffsetStart:part.start,importOffsetEnd:part.end,importPageCount:document.pageCount||null,importAudit:document.format==='pdf'?{mode:document.extractionAudit?.mode||'unknown',pages:document.extractionAudit?.pages||[],missingPages:document.extractionAudit?.missingPages||[],missingPagesAcknowledged:document.missingPagesAcknowledged===true,reviewedAt:startedAt,textCorrected:content!==D.validateText(document.originalExtractedText||document.content),extractionWarning:document.warning||''}:null,documentOutline:outline.filter(h=>h.start>=part.start&&h.start<part.end).map(h=>({...h,start:h.start-part.start,end:Math.min(h.end,part.end)-part.start}))});
      results.push(result);
    }
    candidate.events.push({type:'document.imported',entityId:documentGroupId,fileName:filename,format:document.format,parts:parts.length,characters:content.length,at:startedAt});
    for(const key of Object.keys(candidate))db[key]=candidate[key];
    return {documentGroupId,sourceIds:results.map(r=>r.source.id),parts:parts.length,characters:content.length,added:results.reduce((n,r)=>n+r.added,0),duplicates:results.reduce((n,r)=>n+r.duplicates,0),needsReview:results.reduce((n,r)=>n+r.needsReview,0)};
  }
  // Question Studio is a proposal workflow, not automatic grading or approval.
  // Re-derive every suggestion from the currently saved source on acceptance;
  // never trust a client-supplied answer, offset, or scientific statement.
  function questionStudio(db,sourceId,{limit=36}={}){
    const source=db.sources.find(s=>s.id===sourceId);
    if(!source)throw Error('Saved source not found.');
    const base=I.questionProposals(source.content,{limit});
    const active=db.requirements.filter(r=>r.active&&r.courseId===source.courseId&&(r.sourceId===sourceId||(r.additionalSourceIds||[]).includes(sourceId)));
    return {sourceId,sourceVersion:source.version,candidates:base.map(p=>{
      const matches=active.filter(r=>r.sourceQuote===p.sourceQuote);
      const saved=matches.some(r=>r.question.trim().toLowerCase()===p.question.trim().toLowerCase());
      const improvable=matches.find(r=>r.sourceId===sourceId&&r.origin==='rule_draft'&&r.verificationStatus!=='verified'
        &&(r.format==='general'||r.confidence==='review')&&!db.attempts.some(a=>a.requirementId===r.id));
      return {...p,alreadySaved:saved,represented:matches.length>0,improvableRequirementId:improvable?.id||null};
    }).sort((a,b)=>Number(a.represented)-Number(b.represented)||a.sourceStart-b.sourceStart)};
  }
  function adoptQuestionProposal(db,{sourceId,key}){
    const source=db.sources.find(s=>s.id===sourceId);
    if(!source)throw Error('Saved source not found.');
    const proposal=questionStudio(db,sourceId,{limit:240}).candidates.find(p=>p.key===key);
    if(!proposal)throw Error('Question proposal no longer matches this source. Open the studio again.');
    if(source.content.slice(proposal.sourceStart,proposal.sourceEnd)!==proposal.sourceQuote)
      throw Error('Source excerpt changed. Recheck the source before saving.');
    if(proposal.alreadySaved)throw Error('This question is already saved; review it in the course instead.');
    const now=new Date().toISOString();
    if(proposal.improvableRequirementId){
      const req=db.requirements.find(r=>r.id===proposal.improvableRequirementId);
      if(!req)throw Error('Draft structure is incomplete. Review it manually.');
      const activity=getActivities(db,req.id).find(a=>a.isPrimary), target=getTarget(db,req.id);
      if(!activity||!target)throw Error('Draft structure is incomplete. Review it manually.');
      req.version++;req.question=proposal.question;req.answer=proposal.answer;req.kind=proposal.kind;
      req.objective=proposal.objective;req.format=proposal.format;req.sourceQuote=proposal.sourceQuote;
      req.sourceStart=proposal.sourceStart;req.sourceEnd=proposal.sourceEnd;req.updatedAt=now;
      req.verificationStatus='draft';req.verifiedAt=null;req.reviewedAt=null;req.confidence='review';
      // The proposed excerpt was re-derived from the CURRENT saved source. An
      // outdated generic draft can now be reviewed against that current version.
      req.sourceVersion=source.version;req.sourceCurrentVersion=source.version;
      req.sourceRevisionPending=false;
      activity.question=proposal.question;activity.answer=proposal.answer;activity.kind=proposal.kind;activity.version++;
      target.label=proposal.objective.slice(0,160);
      for(const criterion of getCriteria(db,target.id,{includePending:true}))criterion.needsReview=true;
      db.requirementVersions.push({requirementId:req.id,version:req.version,objective:req.objective,question:req.question,answer:req.answer,kind:req.kind,createdAt:now});
      db.events.push({type:'question_studio.draft_revised',entityId:req.id,sourceId,key,at:now});
      return {requirement:req,mode:'replaced_unverified_draft'};
    }
    const matching=db.requirements.find(r=>r.active&&r.courseId===source.courseId&&r.sourceQuote===proposal.sourceQuote);
    const requirement=addRequirement(db,{courseId:source.courseId,sourceId,question:proposal.question,answer:proposal.answer,
      kind:proposal.kind,sourceQuote:proposal.sourceQuote,origin:'rule_draft',confidence:'review',objective:proposal.objective,
      format:proposal.format,sourceStart:proposal.sourceStart,sourceEnd:proposal.sourceEnd,possibleDuplicateOf:matching?.id||null});
    db.events.push({type:'question_studio.draft_added',entityId:requirement.id,sourceId,key,at:now});
    return {requirement,mode:'created_unverified_draft'};
  }
  // Uncovered *explicit relationships*, not a claim of syllabus completeness.
  // Read-only; users must choose a proposal and then verify it separately.
  // Scan all source parts, rather than stopping at the first 12 saved drafts or
  // first 36 studio suggestions. Exact excerpts and per-source keys are retained.
  function coverageReviewQueue(db,courseId,{limit=18}={}){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    const cap=Math.max(1,Math.min(80,Number.isInteger(limit)?limit:18));
    const sources=db.sources.filter(s=>s.courseId===courseId).slice().reverse();
    const opportunities=[],representedSources=new Set();
    const scanned=new Set();
    let newRelationships=0,improvableDrafts=0,missingTextDocuments=0;
    const checkedGroups=new Set();
    for(const source of sources){
      // Every imported document part carries group-wide audit metadata. Only
      // count it once, never pretend unreadable PDF pages had source statements.
      if(source.importAudit?.missingPages?.length){
        const key=source.documentGroupId||source.id;
        if(!checkedGroups.has(key)){missingTextDocuments++;checkedGroups.add(key);}
      }
      const outline=source.documentOutline?.length?source.documentOutline:D.buildOutline(source.content,source.importFormat||'md');
      const current=questionStudio(db,source.id,{limit:240}).candidates;
      for(const item of current){
        if(item.alreadySaved)continue;
        if(item.represented&&!item.improvableRequirementId)continue;
        // A single exact statement may match multiple templates in later
        // releases. Never pretend this yields multiple independently proven goals.
        const evidenceKey=`${source.id}:${item.sourceStart}:${item.sourceEnd}`;
        if(scanned.has(evidenceKey))continue;
        scanned.add(evidenceKey);
        if(item.improvableRequirementId)improvableDrafts++;
        else newRelationships++;
        representedSources.add(source.id);
        const section=outline.find(x=>item.sourceStart>=x.start&&item.sourceStart<x.end)?.title||null;
        opportunities.push({sourceId:source.id,sourceVersion:source.version,sourceTitle:source.title,
          section,sourceStart:item.sourceStart,sourceEnd:item.sourceEnd,sourceQuote:item.sourceQuote,
          proposalKey:item.key,structure:item.structure,question:item.question,
          mode:item.improvableRequirementId?'improve_existing_draft':'propose_new_draft',
          requirementId:item.improvableRequirementId||null});
      }
    }
    return {courseId,items:opportunities.slice(0,cap),total:opportunities.length,
      newRelationships,improvableDrafts,sourceCount:representedSources.size,
      omitted:Math.max(0,opportunities.length-cap),missingTextDocuments,
      warning:'These are explicit, parseable source relationships needing question review—not ranked curriculum priorities or validated learning objectives. Unreadable PDF pages and diagrams remain outside this count.'};
  }
  // Map only the learner's explicitly saved requirements. This is a source- and
  // outline-based organization, NOT automatic semantic curriculum inference.
  function learningObjectiveMap(db,courseId,now=new Date()){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    const reqs=db.requirements.filter(r=>r.active&&r.courseId===courseId);
    const coverage=I.questionCoverage(db,courseId);
    const covered=new Map(coverage.sourceRows.map(row=>[row.sourceId,row]));
    const sources=db.sources.filter(s=>s.courseId===courseId);
    const groupFor=(source)=>{
      const groupReq=reqs.filter(r=>source?r.sourceId===source.id:!r.sourceId);
      const outline=source?(source.documentOutline?.length?source.documentOutline:D.buildOutline(source.content,source.importFormat||'md')):[];
      const objectives=groupReq.map(r=>{
        const targets=getTargets(db,r.id,{includePending:true});
        const isReady=requirementEligible(r);
        const preview=source&&Number.isInteger(r.sourceStart)?outline.find(o=>r.sourceStart>=o.start&&r.sourceStart<o.end):null;
        const focus=targets.map(t=>{
          const mem=db.memory[t.id];const eligible=isReady&&!t.needsReview;
          return {id:t.id,label:t.label,questions:getActivities(db,r.id,t.id).length,dueAt:mem?.dueAt||null,
            due:eligible&&(!mem||new Date(mem.dueAt).getTime()<=now.getTime()),ready:eligible};
        });
        return {id:r.id,label:r.objective||r.question,sourceSection:preview?.title||null,
          status:!isReady?'needs_review':targets.some(t=>t.needsReview)?'partially_ready':'ready',
          focusCount:focus.length,promptCount:focus.reduce((n,t)=>n+t.questions,0),
          dueFocuses:focus.filter(t=>t.due).length,focus,possibleOverlap:!!r.possibleDuplicateOf};
      });
      return {sourceId:source?.id||null,title:source?.title||'Self-authored objectives',
        sourceVersion:source?.version||null,unmappedStatements:source?(covered.get(source.id)?.unrepresented||0):null,
        objectives,needsReview:objectives.filter(o=>o.status!=='ready').length,
        dueFocuses:objectives.reduce((n,o)=>n+o.dueFocuses,0),
        distinctFocuses:objectives.reduce((n,o)=>n+o.focusCount,0)};
    };
    const groups=sources.map(groupFor);
    if(reqs.some(r=>!r.sourceId))groups.push(groupFor(null));
    return {courseId,groups,objectives:reqs.length,
      distinctFocuses:groups.reduce((n,g)=>n+g.distinctFocuses,0),
      dueFocuses:groups.reduce((n,g)=>n+g.dueFocuses,0),
      needsReview:groups.reduce((n,g)=>n+g.needsReview,0),
      warning:'A map of saved objectives and source sections, not a validated syllabus map. Distinct recall focuses get separate review dates; question variations do not.'};
  }
  // Restrict suggested alternate wording to verified primary targets derived
  // from an unchanged, exact studio proposal; otherwise use manual variations.
  function variationStudio(db,{requirementId,targetId}={}){
    const r=db.requirements.find(x=>x.id===requirementId&&x.active);
    const t=r&&getTargets(db,r.id,{includePending:true}).find(x=>x.id===targetId);
    if(!r||!t)throw Error('Learning requirement or focus not found.');
    const empty=(reason)=>({requirementId:r.id,targetId:t.id,reason,candidates:[]});
    if(!t.isPrimary||t.needsReview)return empty('Automatic rewordings are limited to ready original recall focuses. Add one manually instead.');
    if(!requirementEligible(r)||r.verificationStatus!=='verified')return empty('Verify the learning requirement before suggesting reusable variations.');
    const source=db.sources.find(s=>s.id===r.sourceId);
    if(!source||!r.sourceQuote||!source.content.includes(r.sourceQuote)||r.sourceVersion!==source.version)
      return empty('An unchanged source excerpt is required before suggesting variations.');
    const baseline=I.questionProposals(r.sourceQuote,{limit:8}).find(p=>p.sourceQuote===r.sourceQuote&&p.format===r.format);
    if(!baseline||r.question.trim()!==baseline.question.trim()||r.answer.trim()!==r.sourceQuote.trim())
      return empty('The original question or answer was customised; manually verify any alternative wording.');
    const existing=new Set(getActivities(db,r.id).map(a=>a.question.toLowerCase().trim()));
    const candidates=I.alternativeQuestionProposals(r.sourceQuote,{limit:4})
      .filter(p=>p.sourceQuote===r.sourceQuote&&p.format===r.format&&!existing.has(p.question.toLowerCase().trim()))
      .map(p=>({key:p.key,question:p.question,answer:r.answer,kind:r.kind,structure:p.structure,sourceQuote:r.sourceQuote}));
    return {requirementId:r.id,targetId:t.id,reason:candidates.length?'Review and edit before saving. Variations share the original focus and due date.':'No safe new automatic rewording available. You can write one manually.',candidates};
  }
  function addRequirement(db,{courseId,sourceId=null,lectureTitle='',question,answer,kind='explain',sourceQuote='',origin='manual',confidence='manual',objective='',format='',sourceStart=null,sourceEnd=null,possibleDuplicateOf=null,possibleConflictWith=null}){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    if(sourceId&&!db.sources.some(s=>s.id===sourceId&&s.courseId===courseId))throw Error('Choose lecture notes from the same course.');
    question=cleanString(question,500); answer=cleanString(answer,4000);
    if(!question||!answer)throw Error('Both the question and reference answer are required.');
    const now=new Date().toISOString();
    const req={id:id('req'),courseId,sourceId,lectureTitle:sourceId?'':cleanString(lectureTitle,120),sourceVersion:sourceId?(db.sources.find(s=>s.id===sourceId)?.version||1):null,question,answer,sourceQuote:cleanString(sourceQuote,1200),kind:['recall','explain','apply'].includes(kind)?kind:'explain',origin,confidence,objective:cleanString(objective,300),format,sourceStart,sourceEnd,possibleDuplicateOf,possibleConflictWith,verificationStatus:origin==='rule_draft'?'draft':'verified',verifiedAt:origin==='rule_draft'?null:now,version:1,active:true,createdAt:now,updatedAt:now};
    db.requirements.push(req);
    db.requirementVersions.push({requirementId:req.id,version:1,objective:req.objective||question,question,answer,kind:req.kind,createdAt:now});
    db.retrievalTargets.push({id:baseTargetId(req.id),requirementId:req.id,label:cleanString(req.objective||question,160),createdAt:now,isPrimary:true,active:true,needsReview:false,version:1});
    db.activities.push({id:baseActivityId(req.id),requirementId:req.id,retrievalTargetId:baseTargetId(req.id),question,answer,kind:req.kind,isPrimary:true,origin,active:true,version:1,createdAt:now});
    db.events.push({type:'requirement.created',entityId:req.id,at:now});
    return req;
  }
  function addManualQuestionBatch(db,{courseId,sourceId=null,lectureTitle='',text,kind='recall'}){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    if(sourceId&&!db.sources.some(s=>s.id===sourceId&&s.courseId===courseId))throw Error('Choose lecture notes from the same course.');
    text=String(text??'');
    if(!text.trim()||text.length>45000)throw Error('Paste up to 45,000 characters of question and answer pairs.');
    if(!['recall','explain','apply'].includes(kind))throw Error('Choose a supported practice type.');
    const pairs=[];let current=null,readingAnswer=false;
    const finish=()=>{
      if(!current)return;
      current.question=current.question.trim();current.answer=current.answer.trim();
      if(!readingAnswer||!current.question||!current.answer)throw Error('Every Q: line needs a nonempty A: line. No questions were imported.');
      if(current.question.length>500||current.answer.length>4000)throw Error('A question or answer is too long. No questions were imported.');
      pairs.push(current);current=null;readingAnswer=false;
      if(pairs.length>50)throw Error('Import at most 50 questions at a time.');
    };
    for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
      const question=line.match(/^\s*(?:Q|Question)\s*:\s*(.*)$/i),answer=line.match(/^\s*(?:A|Answer)\s*:\s*(.*)$/i);
      if(question){finish();current={question:question[1],answer:''};continue;}
      if(answer){if(!current||readingAnswer)throw Error('Each Q: must have exactly one A:. No questions were imported.');current.answer=answer[1];readingAnswer=true;continue;}
      if(!line.trim()||/^\s*---\s*$/.test(line)){if(current&&readingAnswer)current.answer+='\n';continue;}
      if(!current||!readingAnswer)throw Error('Use Q: question followed by A: answer for every pair. No questions were imported.');
      current.answer+='\n'+line;
    }
    finish();
    if(!pairs.length)throw Error('No Q: / A: pairs found.');
    const keys=new Set();
    for(const p of pairs){const key=p.question.toLocaleLowerCase();if(keys.has(key)||db.requirements.some(r=>r.active!==false&&r.courseId===courseId&&r.question.toLocaleLowerCase()===key&&r.sourceId===(sourceId||null)&&(!sourceId?(r.lectureTitle||'')===cleanString(lectureTitle,120):true)))throw Error('Repeated question in this lecture. No questions were imported.');keys.add(key);}
    return pairs.map(p=>addRequirement(db,{courseId,sourceId,lectureTitle,question:p.question,answer:p.answer,kind}));
  }
  function editRequirement(db,reqId,{question,answer,kind,objective,lectureTitle,changeType='substantive'}){
    const r=db.requirements.find(r=>r.id===reqId);if(!r)throw Error('Requirement not found.');
    question=cleanString(question,500);answer=cleanString(answer,4000);
    if(!question||!answer)throw Error('Question and reference answer cannot be empty.');
    // Editing an unverified generated draft is NOT a substitute for reviewing
    // the source and answer. Keep it out of study until explicit confirmation.
    const keepPending=!!r.sourceRevisionPending||(r.origin==='rule_draft'&&r.verificationStatus!=='verified');
    db.events.push({type:'requirement.revised',entityId:r.id,at:new Date().toISOString(),priorVersion:r.version,old:{question:r.question,answer:r.answer,kind:r.kind}});
    const previousObjective=r.objective||r.question;
    r.question=question;r.answer=answer;r.kind=['recall','explain','apply'].includes(kind)?kind:r.kind;r.objective=cleanString(objective===undefined?previousObjective:objective,300)||question;if(lectureTitle!==undefined&&!r.sourceId)r.lectureTitle=cleanString(lectureTitle,120);r.version++;r.updatedAt=new Date().toISOString();r.reviewedAt=keepPending?null:r.updatedAt;r.verifiedAt=keepPending?null:r.updatedAt;r.verificationStatus=keepPending?'draft':'verified';r.confidence=keepPending?'review':'user_verified';r.possibleDuplicateOf=null;r.possibleConflictWith=null;
    db.requirementVersions.push({requirementId:r.id,version:r.version,objective:r.objective,question,answer,kind:r.kind,createdAt:r.updatedAt});
    const primary=getActivities(db,r.id).find(a=>a.isPrimary);
    if(primary){primary.question=question;primary.answer=answer;primary.kind=r.kind;if(r.kind!=='recall')delete primary.exactAnswerKey;primary.version++;primary.updatedAt=r.updatedAt;}
    const base=getTarget(db,r.id);if(base)base.label=cleanString(r.objective||question,160);
    if(changeType!=='wording'){
      for(const a of getActivities(db,r.id).filter(a=>!a.isPrimary)){a.active=false;a.archivedAt=r.updatedAt;}
      for(const t of getTargets(db,r.id,{includePending:true})){t.version++;if(!t.isPrimary)t.needsReview=true;for(const c of getCriteria(db,t.id,{includePending:true}))c.needsReview=true;}
    }
    // A substantive edit changes the evaluated target, so its old memory interval does not transfer.
    if(changeType!=='wording'){for(const t of getTargets(db,r.id,{includePending:true}))delete db.memory[t.id];}
    return r;
  }
  function verifyRequirement(db,reqId){
    const r=db.requirements.find(r=>r.id===reqId && r.active); if(!r)throw Error('Requirement not found.');
    if(r.verificationStatus==='verified'&&!r.sourceRevisionPending) return r;
    const now=new Date().toISOString();
    r.verifiedAt=now;r.reviewedAt=now;r.verificationStatus='verified';r.confidence='user_verified';r.updatedAt=now;r.sourceRevisionPending=false;
    db.events.push({type:'requirement.verified',entityId:r.id,version:r.version,at:now});
    return r;
  }
  function questionQualityAudit(db,reqId){
    const req=db.requirements.find(r=>r.id===reqId&&r.active!==false);
    if(!req)throw Error('Question not found.');
    const source=(db.sources||[]).find(s=>s.id===req.sourceId)||null;
    const target=getTarget(db,req.id);
    const criteria=target?getCriteria(db,target.id,{includePending:true}):[];
    const result=I.questionQualityAudit(req,source,criteria);
    const latest=(db.events||[]).slice().reverse().find(e=>e.type==='question_quality.reviewed'&&e.entityId===req.id);
    const currentReview=!!(latest&&!req.sourceRevisionPending&&latest.requirementVersion===req.version&&latest.sourceVersion===(source?.version??null));
    return {...result,requirementId:req.id,requirementVersion:req.version,sourceVersion:source?.version??null,currentReview};
  }
  function confirmQuestionQuality(db,reqId,checks){
    const audit=questionQualityAudit(db,reqId);
    if(!Array.isArray(checks)||checks.length!==audit.checklist.length||checks.some(x=>x!==true))
      throw Error('Review and confirm all four question and answer checks.');
    if(!audit.sourceCurrent)throw Error('The linked source excerpt is missing or changed. Review and repair the source link before approving.');
    const req=db.requirements.find(r=>r.id===reqId),wasVerified=req.verificationStatus==='verified'&&!req.sourceRevisionPending;
    if(!wasVerified)verifyRequirement(db,reqId);
    const currentSource=db.sources.find(s=>s.id===req.sourceId);
    if(currentSource&&req.sourceQuote&&currentSource.content.includes(req.sourceQuote)){
      req.sourceVersion=currentSource.version;
      req.sourceCurrentVersion=currentSource.version;
    }
    const at=new Date().toISOString();
    db.events.push({type:'question_quality.reviewed',entityId:req.id,requirementVersion:req.version,
      sourceVersion:audit.sourceVersion,checklistVersion:1,confirmed:true,at});
    // A quality review never itself modifies a memory interval or study attempt.
    return {requirement:req,verifiedNow:!wasVerified,at};
  }
  function addAssessment(db,{courseId,title,date,scope='all',requirementIds=[]}){
    if(!db.courses.some(c=>c.id===courseId))throw Error('Choose an existing course.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(dateStart(date).getTime()))throw Error('Provide a valid date.');
    title=cleanString(title,120);if(!title)throw Error('Enter an assessment name.');
    scope=scope==='selected'?'selected':'all';
    const ids=scope==='selected'?Array.from(new Set(requirementIds)).filter(x=>db.requirements.some(r=>r.id===x&&r.courseId===courseId)):[];
    if(scope==='selected'&&!ids.length)throw Error('Choose at least one requirement for this assessment.');
    const assessment={id:id('exam'),courseId,title,date,scope,requirementIds:ids,createdAt:new Date().toISOString()};
    db.assessments.push(assessment);db.events.push({type:'assessment.created',entityId:assessment.id,at:assessment.createdAt});
    return assessment;
  }
  function linkedAssessments(db,req,now=new Date()){
    return db.assessments.filter(a=>a.courseId===req.courseId && (a.scope==='all'||a.requirementIds.includes(req.id)) && daysUntil(a.date,now)>=0);
  }
  // Duration models are based only on credible observed active task time, not paused time.
  // They estimate *task* time, not learning gains or verified mastery.
  function estimatedSeconds(activity){return activity.kind==='recall'?85:activity.kind==='apply'?300:180;}
  function validDuration(seconds){return Number.isFinite(seconds)&&seconds>=10&&seconds<=1800;}
  function buildTimeModels(attempts){
    const models={};
    for(const a of attempts){
      if(!validDuration(a.durationSeconds))continue;
      const kind=['recall','explain','apply'].includes(a.activityKind)?a.activityKind:'explain';
      const model=models[kind]||(models[kind]={count:0,totalSeconds:0});
      model.count++;model.totalSeconds+=a.durationSeconds;
    }
    return models;
  }
  function observeDuration(db,kind,seconds){
    if(!validDuration(seconds))return false;
    const key=['recall','explain','apply'].includes(kind)?kind:'explain';
    const model=db.timeModels[key]||(db.timeModels[key]={count:0,totalSeconds:0});
    model.count++;model.totalSeconds+=seconds;return true;
  }
  function durationEstimate(db,activity){
    const baseline=estimatedSeconds(activity),kind=['recall','explain','apply'].includes(activity.kind)?activity.kind:'explain';
    const global=db.timeModels?.[kind];
    if(!global||!global.count)return {seconds:baseline,personalized:false,observations:0,baselineSeconds:baseline};
    // Four prior observations regularise estimates and avoid overreacting to an outlier.
    const groupMean=(global.totalSeconds+baseline*4)/(global.count+4);
    const recent=db.attempts.filter(a=>a.activityId===activity.id&&validDuration(a.durationSeconds)).slice(-8);
    const sameActivityMean=recent.length?recent.reduce((t,a)=>t+a.durationSeconds,0)/recent.length:null;
    const blended=sameActivityMean===null?groupMean:(groupMean*3+sameActivityMean*recent.length)/(3+recent.length);
    return {seconds:Math.round(Math.min(1800,Math.max(30,blended))),personalized:true,observations:global.count,activityObservations:recent.length,baselineSeconds:baseline};
  }
  function evidenceType(a){
    if(!a||!['again','hard','good','easy'].includes(a.rating))return 'unknown';
    if(a.assisted)return 'assisted_self_report';
    if(a.practiceStage==='immediate_post_study')return 'immediate_post_study_self_report';
    if(['again','hard'].includes(a.scheduleRating||a.rating))return 'needs_practice';
    return 'independent_self_report';
  }
  function inputModeFor(a){return ['written','oral','mental'].includes(a.inputMode)?a.inputMode:(a.response?.trim()?'written':'mental');}
  function evidenceSummary(db){
    const result={total:db.attempts.length,written:0,oral:0,mental:0,independentSelfReport:0,assisted:0,immediatePostStudy:0,needsPractice:0,unverifiedSource:0,withTiming:0,secondsObserved:0};
    for(const a of db.attempts){result[inputModeFor(a)]++;
      const type=evidenceType(a);if(type==='independent_self_report')result.independentSelfReport++;
      if(type==='assisted_self_report')result.assisted++;
      if(type==='immediate_post_study_self_report')result.immediatePostStudy++;
      if(type==='needs_practice')result.needsPractice++;
      if(a.requirementVerified===false)result.unverifiedSource++;
      if(validDuration(a.durationSeconds)){result.withTiming++;result.secondsObserved+=a.durationSeconds;}
    }
    return result;
  }
  // Honest *descriptive* audit of observed delayed learner reports, not a
  // calibrated forgetting curve, objectively graded accuracy, or efficacy trial.
  // All groups refer to the delay since the most recent attempt at the SAME
  // requirement/target versions. A rewording shares the target, an edited
  // objective does not silently reuse its former outcomes.
  function delayedRetrievalAudit(db,{minDelayHours=24}={}){
    if(!Number.isFinite(minDelayHours)||minDelayHours<1||minDelayHours>720)
      throw Error('Delayed-review threshold must be between 1 and 720 hours.');
    const raw=Array.isArray(db.attempts)?db.attempts:[];
    const source=raw.slice(-50000);
    const ordered=source.map((a,index)=>({a,index,time:Date.parse(a?.createdAt||'')}))
      .sort((x,y)=>(Number.isFinite(x.time)?x.time:Infinity)-(Number.isFinite(y.time)?y.time:Infinity)||x.index-y.index);
    const exclusions={invalidTimestamp:0,immediatePostStudy:0,assisted:0,noWrittenResponse:0,
      firstAttemptOrChangedVersion:0,tooSoon:0,invalidRating:0};
    const bins=[{key:'oneToThree',label:'1–3 days',from:24,to:96},
      {key:'fourToSeven',label:'4–7 days',from:96,to:192},
      {key:'eightToTwentyOne',label:'8–21 days',from:192,to:528},
      {key:'overTwentyOne',label:'More than 21 days',from:528,to:Infinity}];
    // Actual lower threshold is configurable for tests and future research;
    // the visible application uses 24h, and never calls <24h delayed.
    const makeGroup=(label)=>({label,attempts:0,reportedNoMajorGaps:0,reportedGaps:0,targets:new Set()});
    const byLag=bins.map(b=>({...b,...makeGroup(b.label)}));
    const byKind=['recall','explain','apply','other'].map(kind=>({kind,...makeGroup(kind)}));
    const all=makeGroup('All delayed, independent, recorded written attempts');
    const prior=new Map(),timing={before:0,within:0,after:0,noSnapshot:0};
    let elapsedMin=Infinity,elapsedMax=0;
    for(const item of ordered){
      const a=item.a||{},t=item.time;
      if(!Number.isFinite(t)){exclusions.invalidTimestamp++;continue;}
      const id=a.retrievalTargetId,version=a.retrievalTargetVersion,requirement=a.requirementId,reqVersion=a.requirementVersion;
      const key=typeof id==='string'&&id&&requirement?`${requirement}|${reqVersion??'unknown'}|${id}|${version??'unknown'}`:null;
      const previous=key?prior.get(key):null;
      // Always update most recent actual practice time, including assisted
      // practice, to avoid inflating the delay after intermediate studying.
      if(key)prior.set(key,t);
      let reason=null;
      if(a.practiceStage==='immediate_post_study')reason='immediatePostStudy';
      else if(a.assisted)reason='assisted';
      else if(inputModeFor(a)!=='written'||typeof a.response!=='string'||!a.response.trim())reason='noWrittenResponse';
      else if(previous===undefined||previous===null||t<=previous)reason='firstAttemptOrChangedVersion';
      else if((t-previous)/3600000<minDelayHours)reason='tooSoon';
      else if(!['again','hard','good','easy'].includes(a.rating))reason='invalidRating';
      if(reason){exclusions[reason]++;continue;}
      const hours=(t-previous)/3600000;
      const effective=a.scheduleRating||a.rating;
      const hasGaps=(a.criterionChecks||[]).some(c=>c.status==='missed'||c.status==='unsure');
      const positive=['good','easy'].includes(effective)&&!hasGaps;
      const add=g=>{g.attempts++;g.targets.add(id);if(positive)g.reportedNoMajorGaps++;else g.reportedGaps++;};
      add(all);
      const group=byLag.find((b,i)=>hours>=Math.max(minDelayHours,b.from) && (hours<b.to||i===byLag.length-1));
      if(group)add(group);
      const kind=byKind.find(b=>b.kind===(['recall','explain','apply'].includes(a.activityKind)?a.activityKind:'other'));
      add(kind);
      elapsedMin=Math.min(elapsedMin,hours);elapsedMax=Math.max(elapsedMax,hours);
      const dueMs=typeof a.priorDueAt==='string'?Date.parse(a.priorDueAt):NaN;
      if(!Number.isFinite(dueMs))timing.noSnapshot++;
      else if(t<dueMs-86400000)timing.before++;
      else if(t>dueMs+86400000)timing.after++;
      else timing.within++;
    }
    const finalise=(g,minCount=10,minTargets=5)=>({
      ...(g.key?{key:g.key}:{}),...(g.kind?{kind:g.kind}:{}),label:g.label,
      attempts:g.attempts,distinctTargets:g.targets.size,
      reportedNoMajorGaps:g.reportedNoMajorGaps,reportedGaps:g.reportedGaps,
      // Suppress percentages for tiny and non-independent samples.
      descriptiveShare:g.attempts>=minCount&&g.targets.size>=minTargets?
        Math.round(100*g.reportedNoMajorGaps/g.attempts):null
    });
    return {auditVersion:1,thresholdHours:minDelayHours,processedAttempts:source.length,
      olderAttemptsNotAudited:raw.length-source.length,eligible:finalise(all,20,10),
      lagGroups:byLag.map(g=>finalise(g)),kindGroups:byKind.map(g=>finalise(g)),
      exclusions,timing,elapsedHoursRange:all.attempts?{min:Math.round(elapsedMin*10)/10,max:Math.round(elapsedMax*10)/10}:null,
      warning:'These are learner SELF-RATINGS following written attempts at least 24 hours after the preceding practice of the same target/version. They are not independently verified correctness, validated retention probabilities, or exam predictions. The audit does not fit or change review intervals. Percentages are withheld for small groups.'};
  }
  // Prospective comparison of stored *suggestions*, not retention outcomes.
  // The alternate policy was never used to schedule the learner; no causal
  // comparison or prediction of its effectiveness is possible from this data.
  function schedulingPolicyAudit(db){
    const raw=Array.isArray(db.attempts)?db.attempts:[];
    const source=raw.slice(-50000);
    const rows=[];
    const kinds={recall:0,explain:0,apply:0,other:0};
    let earlier=0,later=0,same=0,withPrior=0;
    const seenTargets=new Set();
    for(const a of source){
      const d=a?.schedulingDecision;
      if(!d||d.version!==1||d.activePolicy!==ACTIVE_SCHEDULING_POLICY||d.shadowPolicy!==SHADOW_SCHEDULING_POLICY)continue;
      if(!Number.isFinite(d.activeIntervalDays)||!Number.isFinite(d.shadowIntervalDays)||d.activeIntervalDays<=0||d.shadowIntervalDays<=0)continue;
      rows.push(d);
      if(a.priorDueAt)withPrior++;
      if(a.retrievalTargetId)seenTargets.add(a.retrievalTargetId);
      const kind=['recall','explain','apply'].includes(a.activityKind)?a.activityKind:'other';kinds[kind]++;
      if(d.shadowIntervalDays<d.activeIntervalDays-1e-8)earlier++;
      else if(d.shadowIntervalDays>d.activeIntervalDays+1e-8)later++;
      else same++;
    }
    const median=values=>{
      if(!values.length)return null;
      const sorted=values.slice().sort((a,b)=>a-b),n=sorted.length;
      return Math.round((n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2)*100)/100;
    };
    return {auditVersion:1,activePolicy:ACTIVE_SCHEDULING_POLICY,shadowPolicy:SHADOW_SCHEDULING_POLICY,
      recordedDecisions:rows.length,observedTargets:seenTargets.size,legacyWithoutSnapshots:source.length-rows.length,
      olderAttemptsNotAudited:raw.length-source.length,withPriorDueDate:withPrior,
      shadowEarlier:earlier,shadowLater:later,shadowSame:same,byActivityKind:kinds,
      medianActiveDays:median(rows.map(d=>d.activeIntervalDays)),
      medianShadowDays:median(rows.map(d=>d.shadowIntervalDays)),
      warning:'Shadow dates are hypothetical proposals under a deliberately conservative rule, NOT observations or predicted successes. The active schedule alone determined actual practice opportunities. Differences in suggested intervals cannot establish which policy improves learning, retention, or efficiency. All outcomes remain learner self-reports.'};
  }
  function requirementEligible(r){return r.active&&!r.sourceRevisionPending&&(r.origin!=='rule_draft'||r.verificationStatus==='verified')&&!((r.possibleConflictWith||r.possibleDuplicateOf)&&r.origin==='rule_draft'&&!r.verifiedAt);}
  function schedulingReasons(item){
    const reasons=[];
    if(item.isNew)reasons.push('No previous recall attempt');
    else if(item.due)reasons.push('Review is due');
    else reasons.push('Maintenance or assessment practice');
    if(item.daysToExam!==null)reasons.push(item.daysToExam===0?'Relevant assessment is today':`Relevant assessment in ${item.daysToExam} day${item.daysToExam===1?'':'s'}`);
    if(item.lastRating==='again'||item.lastRating==='hard')reasons.push('Recent self-rating or criterion check indicates difficulty');
    if(item.rubricStatus?.missed||item.rubricStatus?.unsure)reasons.push('A checked explanation point needs more practice');
    else if(item.rubricStatus?.total&&item.rubricStatus.unassessed)reasons.push('Some explanation points have not been checked');
    return reasons;
  }
  function eligibleCandidates(db,now=new Date()){
    return db.requirements.filter(requirementEligible).flatMap(req=>getTargets(db,req.id).map(target=>{
      const m=db.memory[target.id];const activity=chooseActivity(db,req.id,target.id);
      if(!activity)return null;
      const due=m?new Date(m.dueAt).getTime()<=now.getTime():true;
      const delta=m?Math.max(0,(now.getTime()-new Date(m.dueAt).getTime())/DAY):0;
      const exams=linkedAssessments(db,req,now);
      const daysToExam=exams.length?Math.min(...exams.map(a=>daysUntil(a.date,now))):null;
      const examUrgency=daysToExam===null?0:Math.max(0,40-daysToExam*5);
      const base=m?(due?40+Math.min(18,delta*4):4):32;
      const difficultyBonus=m?.lastRating==='again'?18:m?.lastRating==='hard'?9:0;
      const rubricStatus=criterionStatus(db,target.id,req.version);
      const timeEstimate=durationEstimate(db,activity);
      const item={req,target,activity,score:base+examUrgency+difficultyBonus+(rubricStatus.missed||rubricStatus.unsure?8:rubricStatus.unassessed?3:0),rubricStatus,due,isNew:!m,examUrgency,daysToExam,seconds:timeEstimate.seconds,timeEstimate,lastRating:m?.lastRating??null};
      item.reasons=schedulingReasons(item);item.reasons.push(`Estimated ${Math.max(1,Math.round(item.seconds/60))} min (${timeEstimate.personalized?'your earlier practice':'task-type starting estimate'})`);return item;
    }).filter(Boolean));
  }
  function planActivities(db,minutes,completedIds=[],courseCounts={},now=new Date()){
    const budgetSeconds=Math.max(0,Math.round(minutes*60));
    const reserve=budgetSeconds<=300?40:Math.min(180,Math.round(budgetSeconds*0.08));
    let remaining=Math.max(0,budgetSeconds-reserve);const plan=[];
    const eligible=eligibleCandidates(db,now).filter(c=>!completedIds.includes(c.target.id)&&!completedIds.includes(c.req.id));
    const counts={...courseCounts};let previousCourse=null;const selectedReqCounts={};
    while(eligible.length){
      const fitting=eligible.filter(x=>x.seconds<=remaining);
      if(!fitting.length)break;
      fitting.sort((a,b)=>{
        const score=x=>x.score-(counts[x.req.courseId]||0)*10-(x.req.courseId===previousCourse?5:0)-(selectedReqCounts[x.req.id]||0)*7;
        return score(b)-score(a)||a.seconds-b.seconds||a.target.id.localeCompare(b.target.id);
      });
      const chosen=fitting[0];plan.push(chosen);remaining-=chosen.seconds;
      previousCourse=chosen.req.courseId;counts[previousCourse]=(counts[previousCourse]||0)+1;
      selectedReqCounts[chosen.req.id]=(selectedReqCounts[chosen.req.id]||0)+1;
      eligible.splice(eligible.indexOf(chosen),1);
    }
    return {items:plan,budgetSeconds,reserveSeconds:reserve,unusedSeconds:remaining};
  }
  // A rolling, capacity-aware calendar; future spaced follow-ups are explicitly
  // CONDITIONAL on actually studying and are NOT simulated successful answers.
  // Read-only: no attempts, memory intervals or timestamps are modified.
  function buildReviewAgenda(db,{start=new Date(),days=21,weekdayMinutes=25,weekendMinutes=60,missedDates=[]}={}){
    const horizon=Number(days),weekday=Number(weekdayMinutes),weekend=Number(weekendMinutes);
    if(!Number.isInteger(horizon)||horizon<7||horizon>42)throw Error('Calendar horizon must be 7–42 days.');
    if(![weekday,weekend].every(n=>Number.isInteger(n)&&n>=0&&n<=720))throw Error('Available daily time must be 0–720 minutes.');
    if(!Array.isArray(missedDates)||missedDates.some(d=>typeof d!=='string'||!/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(d)||today(dateStart(d))!==d))throw Error('Invalid unavailable-day dates.');
    const before=Date.parse(start);if(!Number.isFinite(before))throw Error('Invalid calendar start date.');
    const startDate=today(start),startMs=dateStart(startDate).getTime();
    const endDate=addDays(dateStart(startDate),horizon-1);
    const excluded=new Set(missedDates),states=new Map(),rows=[];
    let deferred=0,firstPassTotal=0,conditionalTotal=0;
    const pool=eligibleCandidates(db,start).filter(c=>c.req.verificationStatus==='verified'||c.req.origin!=='rule_draft');
    for(const c of pool){
      const m=db.memory[c.target.id];
      let dueDate=startDate;
      if(m?.dueAt&&Number.isFinite(Date.parse(m.dueAt))) {
        const future=today(new Date(m.dueAt));if(future>dueDate)dueDate=future;
      }
      // A near-term assessment can justify a practice opportunity a little before
      // a later memory due date; it does not change the underlying memory interval.
      const exams=linkedAssessments(db,c.req,start).map(a=>a.date).sort();
      if(exams.length&&dueDate>exams[0]){
        const advance=addDays(dateStart(exams[0]),-1);
        if(advance>=startDate)dueDate=advance;
      }
      const prior=Math.max(0,Number(m?.intervalDays)||0);
      states.set(c.target.id,{candidate:c,nextDate:dueDate,initialDate:dueDate,
        rounds:0,nextIndex:Math.max(0,daysUntil(dueDate,start)),
        examOffsets:exams.map(d=>daysUntil(d,start)).sort((a,b)=>a-b),
        priorGap:prior>1?Math.min(21,Math.max(2,Math.round(prior*1.5))):2,
        lastAssigned:null});
    }
    // These are planning steps, not simulated learning outcomes. One *first*
    // preparation step per unmet syllabus objective in the forecast horizon.
    // A verified linked recall target is never duplicated as preparation.
    const reqById=new Map(db.requirements.map(r=>[r.id,r]));
    const goals=(db.syllabusObjectives||[]).filter(g=>g.active!==false&&db.courses.some(c=>c.id===g.courseId));
    const preparation=goals.flatMap(g=>{
      const mapped=(g.requirementIds||[]).map(id=>reqById.get(id)).filter(r=>r&&r.active!==false&&r.courseId===g.courseId);
      const verified=mapped.some(r=>requirementEligible(r)&&r.verificationStatus==='verified'&&!r.sourceRevisionPending&&getTargets(db,r.id).length&&getActivities(db,r.id).length);
      if(verified)return [];
      const kind=mapped.length?'review_question':g.materialsReady===true?'draft_question':'prepare_sources';
      // Course-wide assessment is a possible priority cue, NOT an asserted
      // direct syllabus-goal/exam link or proof of objective coverage.
      const upcoming=db.assessments.filter(a=>a.courseId===g.courseId&&daysUntil(a.date,start)>=0).map(a=>daysUntil(a.date,start));
      const daysToCourseAssessment=upcoming.length?Math.min(...upcoming):null;
      return [{goalId:g.id,courseId:g.courseId,kind,label:g.text,seconds:240,daysToCourseAssessment,
        requirementId:mapped[0]?.id||null,
        reason:kind==='prepare_sources'?'Locate and study source material before writing a question':kind==='draft_question'?'Material prepared; write and verify a retrieval question':'Review linked question and its answer before practice'}];
    });
    const preparationAssigned=new Set();
    const assigned=new Map();
    for(let i=0;i<horizon;i++){
      const when=dateStart(addDays(dateStart(startDate),i));when.setHours(12,0,0,0);
      const date=today(when),off=excluded.has(date),capacity=off?0:(when.getDay()===0||when.getDay()===6?weekend:weekday);
      const reserve=capacity<=5?Math.min(capacity*60,40):Math.min(180,Math.round(capacity*60*0.08));
      let available=Math.max(0,capacity*60-reserve);
      const activities=[],preparationActivities=[],perCourse={},perReq={};let previousCourse='';
      // Preserve short sessions for already due retrieval. When there is no
      // review fit, a four-minute preparation step can use even a five-minute
      // day. With longer budgets, make room for one preparation step per day.
      const dueReviewFits=[...states.values()].some(v=>v.rounds<4&&v.nextDate<=date&&v.candidate.seconds<=available&&v.lastAssigned!==date);
      const canPrepare=available>=240 && (!dueReviewFits||capacity>=15);
      if(canPrepare){
        const waiting=preparation.filter(task=>!preparationAssigned.has(task.goalId));
        waiting.sort((a,b)=>{
          const priority=task=>task.daysToCourseAssessment===null?0:Math.max(0,15-task.daysToCourseAssessment*2);
          return priority(b)-priority(a)||a.goalId.localeCompare(b.goalId);
        });
        if(waiting.length){
          const task=waiting[0];preparationActivities.push(task);preparationAssigned.add(task.goalId);
          available-=task.seconds;
        }
      }
      // Select from *currently* eligible due windows; a missed day never
      // implies forgetting and does not create fictitious overdue attempts.
      while(available>0){
        const pending=[...states.values()].filter(v=>v.rounds<4&&v.nextDate<=date&&v.candidate.seconds<=available&&v.lastAssigned!==date);
        if(!pending.length)break;
        const score=v=>{
          const c=v.candidate,examIndex=v.examOffsets.find(day=>day>=i);
          const urgency=examIndex===undefined?0:Math.max(0,38-(examIndex-i)*5);
          const late=Math.min(25,Math.max(0,i-v.nextIndex)*3);
          return c.score+urgency+late-(perCourse[c.req.courseId]||0)*9-(perReq[c.req.id]||0)*6-(c.req.courseId===previousCourse?3:0)-(v.rounds?7:0);
        };
        pending.sort((a,b)=>score(b)-score(a)||a.nextDate.localeCompare(b.nextDate)||a.candidate.seconds-b.candidate.seconds||a.candidate.target.id.localeCompare(b.candidate.target.id));
        const v=pending[0],c=v.candidate,conditional=v.rounds>0;
        const nearestExam=v.examOffsets.find(day=>day>=i),examDays=nearestExam===undefined?null:nearestExam-i;
        const reason=conditional?'Conditional spaced revisit — depends on future study results':
          date>v.initialDate?'Deferred review opportunity':c.isNew?'First retrieval opportunity':
          (examDays!==null&&examDays<=2?'Assessment-relevant review':'Existing memory due window');
        const slot={targetId:c.target.id,requirementId:c.req.id,courseId:c.req.courseId,activityId:c.activity.id,
          seconds:c.seconds,round:v.rounds+1,conditional,reason,earliestDate:v.nextDate,examDays};
        activities.push(slot);available-=c.seconds;
        if(!assigned.has(c.target.id))assigned.set(c.target.id,[]);
        assigned.get(c.target.id).push(slot);
        perCourse[c.req.courseId]=(perCourse[c.req.courseId]||0)+1;
        perReq[c.req.id]=(perReq[c.req.id]||0)+1;previousCourse=c.req.courseId;
        v.lastAssigned=date;v.rounds++;
        const gap=v.priorGap;
        v.nextDate=addDays(when,gap);v.nextIndex=i+gap;
        v.priorGap=Math.min(28,Math.max(gap+1,Math.round(gap*1.8)));
        if(conditional)conditionalTotal++;else firstPassTotal++;
      }
      rows.push({date,budgetMinutes:capacity,reserveSeconds:reserve,usedSeconds:activities.reduce((n,a)=>n+a.seconds,0)+preparationActivities.reduce((n,a)=>n+a.seconds,0),activities,preparationActivities,
        overdueUnplaced:[...states.values()].filter(v=>v.rounds===0&&v.nextDate<=date).length});
    }
    const dueWithin=[...states.values()].filter(v=>v.initialDate<=endDate);
    deferred=dueWithin.filter(v=>v.rounds===0).length;
    const coverage=db.assessments.filter(a=>daysUntil(a.date,start)>=0).map(a=>{
      const related=db.requirements.filter(r=>r.active&&r.courseId===a.courseId&&(a.scope==='all'||a.requirementIds.includes(r.id)));
      const focus=related.flatMap(r=>getTargets(db,r.id,{includePending:true}).map(t=>({r,t})));
      const eligible=focus.filter(({r,t})=>requirementEligible(r)&&!t.needsReview&&(r.verificationStatus==='verified'||r.origin!=='rule_draft'));
      const firstPass=eligible.filter(({t})=>rows.some(row=>row.date<=a.date&&row.activities.some(task=>task.targetId===t.id&&!task.conditional))).length;
      const conditional=rows.filter(row=>row.date<=a.date).flatMap(row=>row.activities).filter(task=>task.conditional&&eligible.some(({t})=>t.id===task.targetId)).length;
      return {assessmentId:a.id,title:a.title,date:a.date,courseId:a.courseId,totalTargets:focus.length,
        eligibleTargets:eligible.length,blocked:focus.length-eligible.length,firstPass,conditionalOpportunities:conditional};
    });
    return {days:rows,coverage,plannedTargets:firstPassTotal,conditionalOpportunities:conditionalTotal,
      preparationSteps:preparationAssigned.size,unplannedPreparation:preparation.length-preparationAssigned.size,preparationGoals:preparation.length,
      unplannedDue:deferred,dueInHorizon:dueWithin.length,eligibleAtStart:pool.length,
      forecastType:'conditional_review_agenda',
      warning:'Syllabus preparation steps are planning prompts, not recorded learning or evidence of mastery. Only each target’s next known review window uses current evidence. Later spaced revisit slots are conditional planning placeholders, not simulated successful retrievals, guaranteed retention, or exam results. Actual study results automatically change the next calculation. Intervals and priorities are provisional heuristics, not validated optimal timing.'};
  }
  // Read-only workload *opportunity* forecast, not simulated learning outcomes.
  // Future answers, retention changes, and additional repetitions are unknown.
  function forecastSchedule(db,{start=new Date(),days=21,weekdayMinutes=25,weekendMinutes=60,missedDates=[]}={}){
    const count=Number(days),week=Number(weekdayMinutes),end=Number(weekendMinutes);
    if(!Number.isInteger(count)||count<7||count>42)throw Error('Forecast horizon must be 7–42 days.');
    if(!Number.isInteger(week)||week<0||week>720||!Number.isInteger(end)||end<0||end>720)throw Error('Daily capacity must be 0–720 minutes.');
    if(!Array.isArray(missedDates)||missedDates.some(d=>typeof d!=='string'||!/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(d)))throw Error('Invalid skipped-day dates.');
    const missed=new Set(missedDates),scheduled=new Set(),rows=[];
    const startDay=dateStart(today(start));
    for(let i=0;i<count;i++){
      const when=new Date(startDay);when.setDate(startDay.getDate()+i);when.setHours(23,59,59,999);
      const date=today(when),weekend=when.getDay()===0||when.getDay()===6;
      const budgetMinutes=missed.has(date)?0:(weekend?end:week);
      const budgetSeconds=budgetMinutes*60;
      const reserve=budgetSeconds<=300?Math.min(budgetSeconds,40):Math.min(180,Math.round(budgetSeconds*0.08));
      let remaining=Math.max(0,budgetSeconds-reserve);
      const candidates=eligibleCandidates(db,when).filter(c=>!scheduled.has(c.target.id)
        && (c.isNew||c.due||c.daysToExam!==null&&c.daysToExam<=7));
      const todaySelected=[];const courseCounts={};let lastCourse=null;const reqCounts={};
      // Apply the same scheduling priorities to a sequence of feasible slots.
      while(remaining>=10){
        const fitting=candidates.filter(c=>!scheduled.has(c.target.id)&&c.seconds<=remaining);
        if(!fitting.length)break;
        fitting.sort((a,b)=>{
          const score=x=>x.score-(courseCounts[x.req.courseId]||0)*10-(lastCourse===x.req.courseId?5:0)-(reqCounts[x.req.id]||0)*7;
          return score(b)-score(a)||a.seconds-b.seconds||a.target.id.localeCompare(b.target.id);
        });
        const c=fitting[0];scheduled.add(c.target.id);remaining-=c.seconds;
        courseCounts[c.req.courseId]=(courseCounts[c.req.courseId]||0)+1;
        reqCounts[c.req.id]=(reqCounts[c.req.id]||0)+1;lastCourse=c.req.courseId;
        todaySelected.push({targetId:c.target.id,requirementId:c.req.id,courseId:c.req.courseId,seconds:c.seconds,reason:c.reasons[0],examDays:c.daysToExam});
      }
      rows.push({date,budgetMinutes,usedSeconds:todaySelected.reduce((n,c)=>n+c.seconds,0),reserveSeconds:reserve,activities:todaySelected,capacityLimited:budgetMinutes===0&&candidates.length>0});
    }
    // Per-assessment *opportunity* coverage before the relevant date, NOT pass probability.
    const coverage=db.assessments.filter(a=>daysUntil(a.date,start)>=0).map(a=>{
      const included=db.requirements.filter(r=>r.active&&r.courseId===a.courseId&&(a.scope==='all'||a.requirementIds.includes(r.id)));
      const targets=included.flatMap(r=>getTargets(db,r.id,{includePending:true}).map(t=>({t,r})));
      const eligible=targets.filter(({t,r})=>!t.needsReview&&requirementEligible(r));
      const firstPass=eligible.filter(({t})=>rows.some(row=>row.date<=a.date&&row.activities.some(x=>x.targetId===t.id))).length;
      const alreadyAttempted=eligible.filter(({t})=>db.attempts.some(z=>z.retrievalTargetId===t.id)).length;
      return {assessmentId:a.id,title:a.title,date:a.date,courseId:a.courseId,totalTargets:targets.length,eligibleTargets:eligible.length,blocked:targets.length-eligible.length,firstPass,alreadyAttempted};
    });
    const eligibleNow=eligibleCandidates(db,start);
    return {days:rows,coverage,plannedTargets:scheduled.size,eligibleAtStart:eligibleNow.length,unplannedAtStart:eligibleNow.filter(c=>!scheduled.has(c.target.id)).length,forecastType:'first_pass_opportunities',warning:'Forecast shows possible first-pass study slots using current evidence. It does not simulate future answers, later spaced repetitions, learning gains, or exam results.'};
  }
  // v4.0: only strict string agreement with a learner-approved literal key.
  // This is NOT semantic correctness, an expert judgement or an AI grade.
  function normaliseExactAnswer(s){return String(s??'').normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();}
  function exactKeyReady(db,activity){
    const key=activity?.exactAnswerKey;
    if(!key||activity.kind!=='recall'||activity.active===false||!Array.isArray(key.answers)||!key.answers.length||!key.verifiedAt)return false;
    const req=db.requirements.find(r=>r.id===activity.requirementId);
    const target=db.retrievalTargets.find(t=>t.id===activity.retrievalTargetId);
    const source=req?.sourceId?db.sources.find(s=>s.id===req.sourceId):null;
    return !!(req&&target&&requirementEligible(req)&&!target.needsReview&&
      key.requirementVersion===req.version&&key.targetVersion===target.version&&key.activityVersion===activity.version&&
      (key.sourceVersion??null)===(source?.version??null));
  }
  function setExactAnswerKey(db,activityId,answers,confirmed=false){
    const activity=db.activities.find(a=>a.id===activityId&&a.active!==false);
    if(!activity||activity.kind!=='recall')throw Error('Exact checking is only available for active short-answer recall questions.');
    const req=db.requirements.find(r=>r.id===activity.requirementId);
    const target=db.retrievalTargets.find(t=>t.id===activity.retrievalTargetId);
    if(!req||!target||!requirementEligible(req)||target.needsReview)throw Error('Verify this learning requirement and recall focus first.');
    if(typeof answers!=='string'||answers.length>1000)throw Error('Use at most five short literal answers.');
    const keys=answers.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(keys.length>5||keys.some(x=>x.length>120))throw Error('Enter one to five answers, each at most 120 characters.');
    if(new Set(keys.map(normaliseExactAnswer)).size!==keys.length)throw Error('Duplicate literal answers are not allowed.');
    if(keys.length&&!confirmed)throw Error('Confirm that literal matching is appropriate for this factual question.');
    const old=activity.exactAnswerKey;
    if(!keys.length){delete activity.exactAnswerKey;db.events.push({type:'answer_key.disabled',entityId:activity.id,at:new Date().toISOString()});return null;}
    if(old&&old.answers.join('\n')===keys.join('\n')&&exactKeyReady(db,activity))return old;
    const source=req.sourceId?db.sources.find(s=>s.id===req.sourceId):null;
    const key={version:(old?.version||0)+1,answers:keys,verifiedAt:new Date().toISOString(),
      requirementVersion:req.version,targetVersion:target.version,activityVersion:activity.version,sourceVersion:source?.version??null};
    activity.exactAnswerKey=key;
    db.events.push({type:'answer_key.verified',entityId:activity.id,keyVersion:key.version,at:key.verifiedAt});
    return key;
  }
  function previewLiteralCheck(db,activityId,response,{assisted=false,inputMode='written'}={}){
    const activity=db.activities.find(a=>a.id===activityId);
    if(!exactKeyReady(db,activity)||assisted||inputMode!=='written'||typeof response!=='string'||!response.trim())return null;
    const key=activity.exactAnswerKey;
    return {version:1,method:'literal-match-v1',keyVersion:key.version,matched:key.answers.some(x=>normaliseExactAnswer(x)===normaliseExactAnswer(response)),
      acceptedSnapshot:[...key.answers]};
  }
  // Observed outcomes must have a real previous attempt on the same target
  // and version; skipped days and future attempts are never fabricated.
  function literalDelayedAudit(db,{minDelayHours=24}={}){
    if(!Number.isFinite(minDelayHours)||minDelayHours<1||minDelayHours>720)throw Error('Invalid delayed-check threshold.');
    const source=db.attempts.slice(-50000), ordered=source.map((a,i)=>({a,i,t:Date.parse(a.createdAt)})).sort((x,y)=>x.t-y.t||x.i-y.i);
    const prior=new Map(),exclusions={noLiteralCheck:0,firstOrRevised:0,tooSoon:0,assistedOrImmediate:0};
    let eligible=0,matched=0;const targets=new Set(),cohorts={};
    for(const {a,t} of ordered){
      if(!Number.isFinite(t))continue;
      const key=`${a.requirementId}|${a.requirementVersion}|${a.retrievalTargetId}|${a.retrievalTargetVersion}`;
      const previous=prior.get(key);prior.set(key,t);
      if(!a.literalCheck){exclusions.noLiteralCheck++;continue;}
      if(a.practiceStage==='immediate_post_study'||a.assisted){exclusions.assistedOrImmediate++;continue;}
      if(previous===undefined||t<=previous){exclusions.firstOrRevised++;continue;}
      if((t-previous)/3600000<minDelayHours){exclusions.tooSoon++;continue;}
      eligible++;if(a.literalCheck.matched)matched++;targets.add(a.retrievalTargetId);
      const span=(t-previous)/86400000,bin=span<4?'1–3 days':span<8?'4–7 days':span<22?'8–21 days':'22+ days';
      const group=cohorts[bin]||(cohorts[bin]={attempts:0,matches:0,targets:new Set()});
      group.attempts++;if(a.literalCheck.matched)group.matches++;group.targets.add(a.retrievalTargetId);
    }
    const summarise=(n,m,k)=>({attempts:n,matches:m,distinctTargets:k,matchShare:n>=20&&k>=10?Math.round(100*m/n):null});
    return {version:1,processed:source.length,eligible:summarise(eligible,matched,targets.size),
      byLag:Object.entries(cohorts).map(([lag,g])=>({lag,...summarise(g.attempts,g.matches,g.targets.size)})),exclusions,
      warning:'Strict agreement with learner-approved answer strings—not independent validation of factual truth or semantic correctness. Minor equivalent phrasing may be marked different. Delayed results require a real earlier attempt at least 24 hours before this one. The algorithm does NOT alter review intervals or claim that either scheduling policy is superior.'};
  }
  function recordAttempt(db,{requirementId,targetId=null,activityId=null,response='',rating,assisted=false,sessionId=null,questionUsed=null,inputMode=null,durationSeconds=null,criterionChecks=[],correctionNote='',practiceStage=null,now=new Date()}){
    const r=db.requirements.find(x=>x.id===requirementId);if(!r)throw Error('Requirement does not exist.');
    if(!['again','hard','good','easy'].includes(rating))throw Error('Invalid rating.');
    const activity=activityId?getActivities(db,r.id).find(a=>a.id===activityId):chooseActivity(db,r.id,targetId);
    if(!activity)throw Error('No active practice activity is available.');
    const target=getTargets(db,r.id,{includePending:true}).find(t=>t.id===activity.retrievalTargetId);
    if(!target||targetId&&target.id!==targetId)throw Error('Activity and focus area do not match.');
    if(target.needsReview||!requirementEligible(r))throw Error('This focus area must be reviewed before studying.');
    if(!Array.isArray(criterionChecks))throw Error('Invalid criterion checklist.');
    const criteria=getCriteria(db,target.id),available=new Map(criteria.map(c=>[c.id,c]));
    const seen=new Set();
    const checks=criterionChecks.map(check=>{
      const criterion=available.get(check?.criterionId);
      if(!criterion||seen.has(criterion.id)||!['met','missed','unsure'].includes(check.status))throw Error('Invalid criterion checklist selection.');
      seen.add(criterion.id);
      return {criterionId:criterion.id,version:criterion.version,textSnapshot:criterion.text,acceptedAlternativesSnapshot:[...(criterion.acceptedAlternatives||[])],status:check.status};
    });
    const counts={met:checks.filter(x=>x.status==='met').length,missed:checks.filter(x=>x.status==='missed').length,unsure:checks.filter(x=>x.status==='unsure').length,unassessed:criteria.length-checks.length};
    // If the learner explicitly reports a missing/uncertain point, a positive
    // overall self-rating must not produce a long recall interval.
    const scheduleRating=(counts.missed||counts.unsure)&&['good','easy'].includes(rating)?'hard':rating;
    const prev=db.memory[target.id],prevInterval=prev?.intervalDays||0;
    const decision=schedulePolicyIntervals(prevInterval,scheduleRating,assisted);
    const adjustedInterval=decision.activeDays;
    const dueAt=new Date(now.getTime()+adjustedInterval*DAY).toISOString();
    const shadowDueAt=new Date(now.getTime()+decision.shadowDays*DAY).toISOString();
    // Save both proposals prospectively, at the instant of the real rating.
    // Only ACTIVE is ever written to memory. Shadow is an unobserved scenario.
    const schedulingDecision={version:1,activePolicy:ACTIVE_SCHEDULING_POLICY,shadowPolicy:SHADOW_SCHEDULING_POLICY,
      activeIntervalDays:adjustedInterval,shadowIntervalDays:decision.shadowDays,activeDueAt:dueAt,shadowDueAt};
    if(inputMode!==null&&!['written','oral','mental'].includes(inputMode))throw Error('Invalid response mode.');
    if(durationSeconds!==null&&(!Number.isFinite(durationSeconds)||durationSeconds<0))throw Error('Invalid activity duration.');
    if(practiceStage!==null&&practiceStage!=='immediate_post_study')throw Error('Invalid retrieval practice stage.');
    if(typeof correctionNote!=='string'||correctionNote.length>2000)throw Error('Correction note must be plain text, at most 2,000 characters.');
    const recordedResponse=cleanString(response,20000);
    const inferredMode=inputMode||(recordedResponse?'written':'mental');
    const literalCheck=previewLiteralCheck(db,activity.id,recordedResponse,{assisted,inputMode:inferredMode});
    const rubricAtAttempt=(activity.kind==='explain'||activity.kind==='apply')?criteria.map(c=>({criterionId:c.id,version:c.version,textSnapshot:c.text})):undefined;
    const attempt={id:id('attempt'),rubricAtAttempt,priorDueAt:prev?.dueAt||null,priorIntervalDays:prev?.intervalDays??null,schedulingDecision,literalCheck,inputMode:inferredMode,activityKind:activity.kind,durationSeconds:validDuration(durationSeconds)?Math.round(durationSeconds):null,evidenceVersion:1,requirementId:r.id,requirementVersion:r.version,retrievalTargetId:target.id,retrievalTargetVersion:target.version,activityId:activity.id,activityVersion:activity.version,questionSnapshot:cleanString(questionUsed||activity.question,500),referenceSnapshot:activity.answer,focusLabelSnapshot:target.label,requirementVerified:r.verificationStatus==='verified',courseId:r.courseId,sessionId,response:recordedResponse,rating,scheduleRating,criterionChecks:checks,criterionCounts:counts,correctionNote:correctionNote.trim(),assisted:!!assisted,gradedBy:'learner',practiceStage:practiceStage||'regular',createdAt:now.toISOString()};
    db.attempts.push(attempt);observeDuration(db,activity.kind,attempt.durationSeconds);
    db.memory[target.id]={dueAt,intervalDays:adjustedInterval,policyId:ACTIVE_SCHEDULING_POLICY,lastRating:scheduleRating,lastReviewedAt:now.toISOString(),reviewCount:(prev?.reviewCount||0)+1};
    db.events.push({type:'attempt.recorded',entityId:attempt.id,requirementId:r.id,targetId:target.id,at:attempt.createdAt});
    Pilot.observe(db,attempt); // Consecutive capture at original creation; no changes to the scheduling decision.
    return {attempt,dueAt};
  }
  // Historical feedback is never treated as verified grading or automatically
  // transferred to a newer rubric version. Each point is a learner self-check.
  // This read-only summary helps the learner revisit a prior gap *after* the
  // current answer is revealed; it never generates its own spaced review target.
  function latestCorrectiveFeedback(db,targetId){
    const target=(db.retrievalTargets||[]).find(t=>t.id===targetId);
    if(!target)return null;
    const req=db.requirements.find(r=>r.id===target.requirementId);
    if(!req)return null;
    const previous=db.attempts.filter(a=>a.retrievalTargetId===targetId && a.retrievalTargetVersion===target.version && a.requirementVersion===req.version);
    if(!previous.length)return null;
    const last=previous[previous.length-1],criteria=getCriteria(db,targetId);
    const checked=(last.criterionChecks||[]).filter(c=>criteria.some(k=>k.id===c.criterionId&&k.version===c.version));
    return {attemptId:last.id,at:last.createdAt,practiceStage:last.practiceStage||'regular',
      missed:checked.filter(c=>c.status==='missed').map(c=>c.textSnapshot),
      unsure:checked.filter(c=>c.status==='unsure').map(c=>c.textSnapshot),
      included:checked.filter(c=>c.status==='met').length,
      unassessed:criteria.length-checked.length,
      correctionNote:typeof last.correctionNote==='string'?last.correctionNote:''};
  }
  function assessmentCoverage(db,assessment,now=new Date()){ 
    const d=daysUntil(assessment.date,now);
    const requirements=db.requirements.filter(r=>r.active&&r.courseId===assessment.courseId&&(assessment.scope==='all'||assessment.requirementIds.includes(r.id)));
    const targets=requirements.flatMap(r=>getTargets(db,r.id,{includePending:true}).map(t=>({req:r,target:t})));
    const counts={unattempted:0,needsPractice:0,selfReported:0,selfReportedWritten:0,selfReportedOral:0,selfReportedMental:0,blocked:0,rubricGaps:0,rubricUnassessed:0,rubricAllMet:0,rubricHeld:0};let estimatedSecondsPending=0;
    for(const {req,target} of targets){
      const rub=criterionStatus(db,target.id,req.version);
      if(rub.missed||rub.unsure)counts.rubricGaps++;
      else if(rub.total&&rub.unassessed)counts.rubricUnassessed++;
      else if(rub.allMet)counts.rubricAllMet++;
      if(getCriteria(db,target.id,{includePending:true}).some(c=>c.needsReview))counts.rubricHeld++;
      if(!requirementEligible(req)||target.needsReview){counts.blocked++;continue;}
      const attempts=db.attempts.filter(a=>a.retrievalTargetId===target.id&&a.retrievalTargetVersion===target.version&&a.requirementVersion===req.version);
      if(!attempts.length)counts.unattempted++;
      else {
        const last=attempts[attempts.length-1];
        if(evidenceType(last)==='independent_self_report'){counts.selfReported++;counts['selfReported'+inputModeFor(last).charAt(0).toUpperCase()+inputModeFor(last).slice(1)]++;}
        else counts.needsPractice++;
      }
      if(!attempts.length||attempts[attempts.length-1].assisted||!['good','easy'].includes(attempts[attempts.length-1].rating))estimatedSecondsPending+=durationEstimate(db,getActivities(db,req.id,target.id)[0]||req).seconds;
    }
    return {assessmentId:assessment.id,daysRemaining:d,total:targets.length,requirements:requirements.length,...counts,pending:counts.unattempted+counts.needsPractice,estimatedPracticeMinutes:Math.ceil(estimatedSecondsPending/60)};
  }
  function stats(db,now=new Date()){
    const active=db.requirements.filter(r=>r.active);
    const targets=active.flatMap(r=>getTargets(db,r.id,{includePending:true}).map(target=>({req:r,target})));
    const due=targets.filter(({req,target})=>requirementEligible(req)&&!target.needsReview).filter(({target})=>!db.memory[target.id]||new Date(db.memory[target.id].dueAt)<=now).length;
    const newItems=targets.filter(({target})=>!db.memory[target.id]).length;
    const upcoming=db.assessments.filter(a=>daysUntil(a.date,now)>=0).sort((a,b)=>a.date.localeCompare(b.date));
    return {courses:db.courses.length,requirements:active.length,targets:targets.length,due,newItems,practiced:targets.length-newItems,upcoming};
  }
  function demoDb(now=new Date()){
    const db=initialDb();const biology=addCourse(db,'Biology');const chemistry=addCourse(db,'Chemistry');const math=addCourse(db,'Mathematics');const history=addCourse(db,'History');
    const data=[
      [biology,'Enzyme catalysis','Enzymes lower activation energy by stabilising the transition state.',[
        ['How do enzymes increase reaction rates?','By stabilising the transition state and lowering activation energy.','explain'],
        ['What is activation energy?','The energy barrier a reaction must overcome to proceed.','recall'],
        ['How might extreme temperature affect an enzyme?','It may alter protein structure and reduce catalytic activity, including through denaturation.','apply']]],
      [biology,'Photosynthesis','Carbon dioxide supplies carbon in sugars; water is the source of oxygen gas released in oxygenic photosynthesis.',[
        ['Where does the carbon in sugars come from during photosynthesis?','Carbon dioxide supplies the carbon atoms.','recall'],
        ['Why is sunlight not the carbon source in photosynthesis?','Sunlight supplies energy, not carbon atoms; carbon comes from CO₂.','explain']]],
      [chemistry,'Chemical equilibrium','At equilibrium, forward and reverse reaction rates are equal; concentrations need not be equal.',[
        ['What is dynamic chemical equilibrium?','Forward and reverse reaction rates are equal, while both reactions continue.','recall'],
        ['Must reactant and product concentrations be equal at equilibrium?','No. Equal reaction rates do not imply equal concentrations.','explain'],
        ['Predict the qualitative response to a pressure increase in a gaseous equilibrium.','Depending on the system, it can favour the side with fewer moles of gas; if equal, no shift due solely to pressure.','apply']]],
      [math,'Quadratic functions','The discriminant b² − 4ac indicates the number of distinct real roots of ax² + bx + c = 0.',[
        ['What is the discriminant of a quadratic?','b² − 4ac.','recall'],
        ['What does a negative discriminant indicate?','There are no real roots; the solutions are non-real complex numbers.','explain'],
        ['Solve x² − 5x + 6 = 0.','x = 2 or x = 3.','apply']]],
      [history,'Historical reasoning','A historical explanation should distinguish a chronology of events from a causal claim supported by evidence.',[
        ['How is a chronological description different from a causal explanation?','Chronology lists when events occurred; causation explains why one event influenced another using evidence.','explain'],
        ['Why can two sources disagree about the causes of an event?','They may differ in perspective, access to evidence, interpretation, or purpose.','explain']]]
    ];
    for(const [course,title,content,qa] of data){
      const source={id:id('source'),courseId:course.id,title,content,version:1,createdAt:new Date().toISOString()};db.sources.push(source);db.sourceVersions.push({sourceId:source.id,version:1,title,content,createdAt:source.createdAt});
      for(const [question,answer,kind] of qa)addRequirement(db,{courseId:course.id,sourceId:source.id,question,answer,kind,sourceQuote:content,origin:'demo'});
    }
    addAssessment(db,{courseId:biology.id,title:'Biology unit test',date:addDays(now,3)});
    addAssessment(db,{courseId:chemistry.id,title:'Chemistry quiz',date:addDays(now,7)});
    return db;
  }
  function validateImport(x){return migrateDb(x);}

  return {DAY,id,today,addDays,daysUntil,initialDb,migrateDb,validateImport,getTarget,getTargets,getMemory,getActivities,getCriteria,addCriterion,proposeCriteria,rubricQualityReview,addRubricEvidenceDraft,reviseCriterion,setCriterionAlternatives,rubricSyllabusAlignment,setCriterionSyllabusGoals,verifyCriterion,archiveCriterion,criterionStatus,rubricProgress,chooseActivity,addRetrievalTarget,verifyRetrievalTarget,addActivityVariant,deactivateActivity,reviseSource,addCourse,addSyllabusObjectives,updateSyllabusObjective,setSyllabusLink,setSyllabusMaterialsReady,setSyllabusLearningGuide,guidedLearningInfo,archiveSyllabusObjective,syllabusCoverage,draftRequirements,addSource,addImportedDocument,addRequirement,addManualQuestionBatch,editRequirement,verifyRequirement,questionQualityAudit,confirmQuestionQuality,integrity:I.integrity,questionCoverage:I.questionCoverage,questionWarnings:I.questionWarnings,learningObjectiveMap,variationStudio,questionStudio,adoptQuestionProposal,coverageReviewQueue,addAssessment,linkedAssessments,estimatedSeconds,durationEstimate,evidenceType,inputModeFor,evidenceSummary,delayedRetrievalAudit,schedulingPolicyAudit,eligibleCandidates,planActivities,buildReviewAgenda,forecastSchedule,setExactAnswerKey,exactKeyReady,previewLiteralCheck,literalDelayedAudit,recordAttempt,latestCorrectiveFeedback,assessmentCoverage,stats,demoDb};
});
