/* Active Recall Web: transparent schedule fit and non-punitive study history.
   Read-only analysis except for explicit, append-only daily plan snapshots. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ActiveRecallStudyRhythm = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function preferences(db) {
    return db.agendaPreferences || {days:21,weekdayMinutes:25,weekendMinutes:60,missedDates:[]};
  }
  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function logOutsideStudy(db,{date,minutes,kind='other',note='',now=new Date()}={}) {
    const today=localDate(now);
    if(typeof date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||
      !Number.isFinite(Date.parse(date+'T12:00:00'))||localDate(new Date(date+'T12:00:00'))!==date||
      date>today||Math.round((new Date(today+'T12:00:00')-new Date(date+'T12:00:00'))/86400000)>30)
      throw Error('Choose a valid study date within the past 30 days.');
    if(!Number.isSafeInteger(minutes)||minutes<1||minutes>720)throw Error('Enter 1–720 minutes of actual outside study.');
    if(!['reading','questions','class','other'].includes(kind))throw Error('Choose a study activity.');
    if(typeof note!=='string'||note.length>240)throw Error('Notes must be 240 characters or fewer.');
    if(!Array.isArray(db.outsideStudyLogs))db.outsideStudyLogs=[];
    if(db.outsideStudyLogs.length>=10000)throw Error('Outside-study log limit reached.');
    const log={version:1,id:'outside_'+Math.random().toString(36).slice(2,12)+Date.now().toString(36),date,minutes,kind,note:note.trim(),recordedAt:now.toISOString(),basis:'self_report'};
    db.outsideStudyLogs.push(log);
    return log;
  }
  function deleteOutsideStudy(db,id){
    const entries=db.outsideStudyLogs||[];
    const index=entries.findIndex(x=>x.id===id);
    if(index<0)throw Error('Outside-study entry not found.');
    entries.splice(index,1);
  }
  function capacityOn(date, prefs) {
    if ((prefs.missedDates || []).includes(localDate(date))) return 0;
    return [0,6].includes(date.getDay()) ? prefs.weekendMinutes : prefs.weekdayMinutes;
  }
  function studyFit(db, core, now = new Date(), prefs = preferences(db)) {
    // Seven days is enough for the fit panel and avoids a 42-day calculation
    // whenever Overview redraws.
    const agenda = core.buildReviewAgenda(db,{start:now,...prefs,days:7});
    const day = agenda.days[0];
    const due = core.eligibleCandidates(db,now).filter(x => x.due || x.isNew);
    const scheduled = new Set(day.activities.filter(x=>!x.conditional).map(x=>x.targetId));
    const dueSeconds = due.reduce((sum,x)=>sum+x.seconds,0);
    const prepSeconds = (day.preparationActivities||[]).reduce((sum,x)=>sum+x.seconds,0);
    const unplaced = due.filter(x=>!scheduled.has(x.target.id));
    const unplacedSeconds = unplaced.reduce((sum,x)=>sum+x.seconds,0);
    const demandSeconds = dueSeconds+prepSeconds;
    const capacityMinutes = day.budgetMinutes;
    const shortfallSeconds = Math.max(0,demandSeconds-capacityMinutes*60);
    const restDay = capacityMinutes===0;
    const upcoming = agenda.days.slice(0,7).map(d=>({
      date:d.date,capacityMinutes:d.budgetMinutes,assignedSeconds:d.usedSeconds,
      knownFirstPasses:d.activities.filter(a=>!a.conditional).length,
      conditionalRevisits:d.activities.filter(a=>a.conditional).length,
      unplacedKnownCount:d.overdueUnplaced,
      preparationCount:(d.preparationActivities||[]).length
    }));
    return {
      date:localDate(now),capacityMinutes,restDay,dueCount:due.length,dueSeconds,prepSeconds,
      demandSeconds,shortfallSeconds,unplacedCount:unplaced.length,unplacedSeconds,
      scheduledTargetIds:[...scheduled],assignedSeconds:day.usedSeconds,
      futureUnplannedDue:agenda.unplannedDue,futureUnplannedPreparation:agenda.unplannedPreparation,
      riskDays:upcoming.filter(d=>d.unplacedKnownCount>0).length,
      upcoming,forecastWarning:agenda.warning,
      status:restDay?'rest':!due.length&&!prepSeconds?'clear':shortfallSeconds?'overload':unplaced.length?'prioritization_gap':'fit'
    };
  }
  function recordDailyPlan(db, core, {now=new Date(),reason='first_open'}={}) {
    const date=localDate(now);
    if (!['first_open','availability_changed'].includes(reason)) throw Error('Invalid study-plan record reason.');
    if (!db.courses.some(c=>c.active!==false) ||
      !(db.requirements.some(r=>r.active!==false)||(db.syllabusObjectives||[]).some(g=>g.active!==false))) return null;
    if (!Array.isArray(db.studyPlanHistory)) db.studyPlanHistory=[];
    const sameDay=db.studyPlanHistory.filter(s=>s.date===date);
    if (reason==='first_open'&&sameDay.length) return null;
    const fit=studyFit(db,core,now);
    const snapshot={version:1,date,recordedAt:now.toISOString(),reason,
      revision:sameDay.length+1,
      availabilityMinutes:fit.capacityMinutes,
      dueCount:fit.dueCount,dueSeconds:fit.dueSeconds,
      preparationSeconds:fit.prepSeconds,
      scheduledTargetIds:fit.scheduledTargetIds,
      plannedSeconds:fit.assignedSeconds,
      unplacedDueCount:fit.unplacedCount,unplacedDueSeconds:fit.unplacedSeconds,
      // The record is created on first opening the app, not retrospectively
      // before the day began. It is not a verified prior-day commitment.
      basis:'first_observed_or_explicitly_revised_plan'};
    db.studyPlanHistory.push(snapshot);
    return snapshot;
  }
  function history(db,core,now=new Date(),days=7) {
    if (!Number.isInteger(days)||days<1||days>42) throw Error('Study history must cover 1–42 days.');
    const snapshots=Array.isArray(db.studyPlanHistory)?db.studyPlanHistory:[];
    const latest=new Map();
    for(const s of snapshots) {
      const prior=latest.get(s.date);
      if(!prior||s.revision>prior.revision)latest.set(s.date,s);
    }
    const attemptsByDay=new Map();
    const logsByDay=new Map();
    for(const log of db.outsideStudyLogs||[]){
      if(!logsByDay.has(log.date))logsByDay.set(log.date,[]);
      logsByDay.get(log.date).push(log);
    }
    for(const a of db.attempts) {
      const date=new Date(a.createdAt);
      if (!Number.isFinite(date.getTime())) continue;
      const key=localDate(date);
      if (!attemptsByDay.has(key)) attemptsByDay.set(key,[]);
      attemptsByDay.get(key).push(a);
    }
    const rows=[];
    for(let i=days-1;i>=0;i--) {
      const when=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i,12);
      const date=localDate(when),plan=latest.get(date)||null;
      const attempts=attemptsByDay.get(date)||[],outsideLogs=logsByDay.get(date)||[];
      const attempted=new Set(attempts.map(a=>a.retrievalTargetId));
      const plannedIds=plan?.scheduledTargetIds||[];
      const timed=attempts.filter(a=>Number.isFinite(a.durationSeconds)&&a.durationSeconds>=10&&a.durationSeconds<=1800);
      rows.push({date,plan,attempts:attempts.length,uniqueTargets:attempted.size,
        outsideLogs,outsideMinutes:outsideLogs.reduce((n,x)=>n+x.minutes,0),
        matchedPlanTargets:plannedIds.filter(id=>attempted.has(id)).length,
        plannedTargets:plannedIds.length,
        timedAttempts:timed.length,timedSeconds:timed.reduce((n,a)=>n+a.durationSeconds,0),
        revised:plan?plan.revision>1:false,
        // A blank day is unknown: opening the app is not the same as
        // confirming that the learner had an opportunity to study.
        status:!plan?'no_plan_record':plan.availabilityMinutes===0?'planned_rest':attempts.length||outsideLogs.length?'practice_recorded':'no_practice_recorded'});
    }
    const observed=rows.filter(r=>r.plan&&r.plan.availabilityMinutes>0);
    return {rows,observedStudyDays:observed.length,daysWithAttempts:observed.filter(r=>r.attempts>0).length,
      daysWithAnyRecord:observed.filter(r=>r.attempts>0||r.outsideLogs.length>0).length,
      outsideMinutes:rows.reduce((n,r)=>n+r.outsideMinutes,0),
      unobservedDays:rows.filter(r=>!r.plan).length,
      recordedAttempts:rows.reduce((n,r)=>n+r.attempts,0),
      timedSeconds:rows.reduce((n,r)=>n+r.timedSeconds,0),
      warning:'A snapshot captures the plan when the app was first opened that day or when availability was revised. It is not evidence of what was promised the day before. Unrecorded activity, elapsed session time and actual learning are unknown; timed attempts and self-ratings are not verified mastery.'};
  }
  function validate(db) {
    if(db.outsideStudyLogs!==undefined){
      if(!Array.isArray(db.outsideStudyLogs)||db.outsideStudyLogs.length>10000)throw Error('Invalid outside-study logs in backup.');
      const ids=new Set();
      for(const l of db.outsideStudyLogs){
        if(!l||l.version!==1||typeof l.id!=='string'||!/^outside_[a-z0-9]{8,40}$/.test(l.id)||ids.has(l.id)||
          typeof l.date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(l.date)||
          !Number.isFinite(Date.parse(l.date+'T12:00:00'))||localDate(new Date(l.date+'T12:00:00'))!==l.date||
          !Number.isSafeInteger(l.minutes)||l.minutes<1||l.minutes>720||
          !['reading','questions','class','other'].includes(l.kind)||typeof l.note!=='string'||l.note.length>240||
          typeof l.recordedAt!=='string'||!Number.isFinite(Date.parse(l.recordedAt))||l.basis!=='self_report')throw Error('Invalid outside-study entry in backup.');
        ids.add(l.id);
      }
    }
    if(db.studyPlanHistory===undefined)return true;
    if(!Array.isArray(db.studyPlanHistory)||db.studyPlanHistory.length>25000)throw Error('Invalid study-plan history in backup.');
    const byDate=new Map();
    for(const s of db.studyPlanHistory) {
      if(!s||s.version!==1||typeof s.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||
        !Number.isFinite(Date.parse(s.date+'T12:00:00'))||localDate(new Date(s.date+'T12:00:00'))!==s.date||
        typeof s.recordedAt!=='string'||!Number.isFinite(Date.parse(s.recordedAt))||
        !['first_open','availability_changed'].includes(s.reason)||
        !Number.isSafeInteger(s.revision)||s.revision<1||
        !['first_observed_or_explicitly_revised_plan'].includes(s.basis)||
        ![s.availabilityMinutes,s.dueCount,s.dueSeconds,s.preparationSeconds,s.plannedSeconds,s.unplacedDueCount,s.unplacedDueSeconds].every(n=>Number.isSafeInteger(n)&&n>=0)||
        s.availabilityMinutes>720||s.dueCount>200000||s.unplacedDueCount>200000||
        !Array.isArray(s.scheduledTargetIds)||s.scheduledTargetIds.length>5000||
        s.scheduledTargetIds.some(id=>typeof id!=='string'||id.length>180||!id)||
        new Set(s.scheduledTargetIds).size!==s.scheduledTargetIds.length)throw Error('Invalid dated study-plan snapshot in backup.');
      const revisions=byDate.get(s.date)||0;
      if(s.revision!==revisions+1||(revisions===0&&s.reason!=='first_open'))throw Error('Study-plan revision sequence is inconsistent.');
      byDate.set(s.date,s.revision);
    }
    return true;
  }
  return {preferences,capacityOn,studyFit,recordDailyPlan,history,logOutsideStudy,deleteOutsideStudy,validate,localDate};
});
