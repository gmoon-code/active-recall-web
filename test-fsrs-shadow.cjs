'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('./core.js'),Shadow=require('./fsrs-shadow.js');
const Rhythm=require('./study-rhythm.js');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'vendor/fsrs-7-shadow-vendor.js'),'utf8'));
const Vendor=globalThis.ActiveRecallFSRSVendor;
const at=day=>new Date(Date.UTC(2026,10,1,12)+day*86400000);

function fixture(kind='recall'){
  const db=C.initialDb(),course=C.addCourse(db,'Biology');
  const req=C.addRequirement(db,{courseId:course.id,kind,question:'What drives ATP synthase?',answer:'A proton gradient.'});
  const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
  const attempt=(day,options={})=>C.recordAttempt(db,{requirementId:req.id,targetId:target.id,
    activityId:activity.id,response:'A proton gradient.',rating:'good',now:at(day),...options}).attempt;
  return {db,req,target,activity,attempt};
}

test('official FSRS-7 browser bundle replays real recorded grades in shadow without mutations',async()=>{
  const f=fixture();f.attempt(0);f.attempt(3);f.attempt(9);
  const before=JSON.stringify(f.db),a=await Shadow.compare(f.db,{Core:C,Vendor,now:at(10)});
  assert.equal(a.model,'FSRS-7');
  assert.equal(a.library,'ts-fsrs@6.0.0');
  assert.equal(a.modelFitted,false);
  assert.equal(a.activePolicyChanged,false);
  assert.equal(a.comparedTargets,1,JSON.stringify(a.exclusions));
  assert.equal(a.rows[0].completedReviews,3);
  assert.equal(a.rows[0].targetId,f.target.id);
  assert.equal(a.rows[0].shadowDueAt,'2027-01-02T00:16:19.273Z');
  assert.notEqual(a.rows[0].shadowDueAt,f.db.memory[f.target.id].dueAt);
  assert.equal(JSON.stringify(f.db),before);
  assert.deepEqual(await Shadow.compare(f.db,{Core:C,Vendor,now:at(10)}),a);
});

test('FSRS-7 freezes a reproducible pre-answer probability only from complete independent history',async()=>{
  const f=fixture();for(const day of [0,3,9])f.attempt(day);
  const input={Core:C,Vendor,requirementId:f.req.id,targetId:f.target.id,
    activityId:f.activity.id,now:at(10)},before=JSON.stringify(f.db);
  const p=await Shadow.forecastProbability(f.db,input);
  assert.ok(p,'Expected a valid prospective FSRS guess');
  assert.equal(p.method,'fsrs-7-default-probability-v1');
  assert.equal(p.modelFitted,false);
  assert.equal(p.historyCount,3);
  assert.equal(p.capturedAt,at(10).toISOString());
  assert.ok(p.probability>0&&p.probability<1);
  assert.deepEqual(await Shadow.forecastProbability(f.db,input),p);
  assert.equal(JSON.stringify(f.db),before);
  const precise=fixture(),base=Date.parse('2026-11-01T12:00:00.374Z');
  for(const day of [0,5,10])precise.attempt(day,{now:new Date(base+day*86400000)});
  const preciseForecast=await Shadow.forecastProbability(precise.db,{Core:C,Vendor,
    requirementId:precise.req.id,targetId:precise.target.id,
    activityId:precise.activity.id,now:new Date(base+20*86400000+93)});
  assert.ok(preciseForecast,'FSRS Date timestamps must retain milliseconds on real attempts');
  assert.equal(await Shadow.forecastProbability(f.db,{...input,now:at(8)}),null,
    'A preview cannot replay future evidence');
  const bad=fixture();bad.attempt(0);bad.attempt(3,{assisted:true});
  assert.equal(await Shadow.forecastProbability(bad.db,{Core:C,Vendor,
    requirementId:bad.req.id,targetId:bad.target.id,
    activityId:bad.activity.id,now:at(4)}),null);
  const partial=fixture();partial.attempt(0);partial.db.memory[partial.target.id].reviewCount++;
  assert.equal(await Shadow.forecastProbability(partial.db,{Core:C,Vendor,
    requirementId:partial.req.id,targetId:partial.target.id,
    activityId:partial.activity.id,now:at(3)}),null);
});

test('frozen FSRS receipt is optional, survives backup and never changes active scheduling',async()=>{
  const first=fixture();for(const day of [0,3,9])first.attempt(day);
  const other=C.validateImport(JSON.parse(JSON.stringify(first.db))),now=at(10);
  const props={requirementId:first.req.id,targetId:first.target.id,activityId:first.activity.id};
  const prospective=C.previewProspectiveForecast(first.db,{...props,now});
  const fsrs=await Shadow.forecastProbability(first.db,{Core:C,Vendor,...props,now});
  assert.ok(prospective&&fsrs);
  const options={...props,response:'A proton gradient.',rating:'good',now};
  const predicted=C.recordAttempt(first.db,{...options,prospectiveForecast:prospective,fsrsForecast:fsrs});
  const ordinary=C.recordAttempt(other,options);
  assert.equal(predicted.dueAt,ordinary.dueAt);
  assert.deepEqual(first.db.memory,other.memory);
  assert.deepEqual(predicted.attempt.fsrsForecast,fsrs);
  assert.deepEqual(C.validateImport(JSON.parse(JSON.stringify(first.db))),JSON.parse(JSON.stringify(first.db)));
  assert.equal(C.memoryModelReadinessAudit(first.db).fsrsShadowForecastReceipts,1);
  assert.equal(C.memoryModelReadinessAudit(other).fsrsShadowForecastReceipts,0);
  const tampered=JSON.parse(JSON.stringify(first.db));
  tampered.attempts.at(-1).fsrsForecast.probability=1.5;
  assert.throws(()=>C.validateImport(tampered),/Invalid FSRS shadow forecast/);
  const wrongLink=JSON.parse(JSON.stringify(first.db));
  wrongLink.attempts.at(-1).fsrsForecast.targetId='another-target';
  assert.throws(()=>C.validateImport(wrongLink),/Invalid FSRS shadow forecast/);
  const noBaseline=JSON.parse(JSON.stringify(first.db));
  delete noBaseline.attempts.at(-1).prospectiveForecast;
  assert.throws(()=>C.validateImport(noBaseline),/Invalid FSRS shadow forecast/);
});

test('historical FSRS receipts are independently replayed, not trusted by shape alone',async()=>{
  const f=fixture();for(const day of [0,3,9])f.attempt(day);
  const now=at(12),props={requirementId:f.req.id,targetId:f.target.id,activityId:f.activity.id};
  const prospective=C.previewProspectiveForecast(f.db,{...props,now});
  const fsrs=await Shadow.forecastProbability(f.db,{Core:C,Vendor,...props,now});
  assert.ok(fsrs&&prospective);
  f.attempt(12,{prospectiveForecast:prospective,fsrsForecast:fsrs});
  const before=JSON.stringify(f.db),audit=await Shadow.auditReceipts(f.db,{Vendor});
  assert.equal(audit.recordedReceipts,1);
  assert.equal(audit.replayed,1);
  assert.equal(audit.eligibleDelayedWritten,1);
  assert.equal(audit.literalOutcomeCandidates,0,'No approved literal key in this fixture');
  assert.equal(audit.activePolicyChanged,false);
  assert.equal(JSON.stringify(f.db),before);
  // Today's memory can include arbitrarily many later review outcomes. They
  // may not be used to reconstruct a forecast that was frozen before them.
  f.attempt(15);
  assert.equal((await Shadow.auditReceipts(f.db,{Vendor})).replayed,1);
  const forged=JSON.parse(JSON.stringify(f.db));
  forged.attempts[3].fsrsForecast.probability=0.123456;
  assert.equal(C.validateImport(forged).schemaVersion,5,
    'Shape validation alone cannot authenticate a numerical probability');
  const rejected=await Shadow.auditReceipts(forged,{Vendor});
  assert.equal(rejected.replayed,0);
  assert.equal(rejected.exclusions.modelMismatch,1);
  const oldValid=JSON.parse(JSON.stringify(f.db));
  delete oldValid.attempts[2].schedulingDecision;
  assert.equal((await Shadow.auditReceipts(oldValid,{Vendor})).replayed,1,
    'Older real attempts without policy snapshots can still replay their grades');
  const changed=JSON.parse(JSON.stringify(f.db));
  changed.attempts[1].rating='hard';changed.attempts[1].scheduleRating='hard';
  assert.equal((await Shadow.auditReceipts(changed,{Vendor})).exclusions.modelMismatch,1);
  const incomplete=JSON.parse(JSON.stringify(f.db));incomplete.attempts.shift();
  assert.equal((await Shadow.auditReceipts(incomplete,{Vendor})).exclusions.incompleteOrChangedHistory,1);
});

test('FSRS replay audit abstains on sparse, assisted, mixed-version and untrusted history',async()=>{
  const f=fixture();f.attempt(0);f.attempt(3,{assisted:true});
  const noReceipt=await Shadow.auditReceipts(f.db,{Vendor});
  assert.equal(noReceipt.replayed,0);
  assert.equal(noReceipt.recordedReceipts,0);
  const empty=await Shadow.auditReceipts(C.initialDb(),{Vendor});
  assert.equal(empty.inspected,0);
  await assert.rejects(Shadow.auditReceipts(f.db,{Vendor:{}}),/unavailable/);
  await assert.rejects(Shadow.auditReceipts(f.db,{Vendor,limit:501}),/1–500/);
  await assert.rejects(Shadow.auditReceipts(f.db,{Vendor,minDelayHours:0}),/1 and 720/);
});

test('missing, legacy and unverifiable histories are excluded rather than reconstructed',async()=>{
  const a=fixture();a.attempt(0);a.attempt(3,{assisted:true});
  assert.equal((await Shadow.compare(a.db,{Core:C,Vendor,now:at(4)})).exclusions.assistedOrImmediate,1);
  const b=fixture();b.attempt(0,{inputMode:'mental',response:''});
  assert.equal((await Shadow.compare(b.db,{Core:C,Vendor,now:at(4)})).exclusions.notIndependentWritten,1);
  const c=fixture();c.attempt(0);c.db.memory[c.target.id].reviewCount=5;
  assert.equal((await Shadow.compare(c.db,{Core:C,Vendor,now:at(4)})).exclusions.incompleteHistory,1);
  const d=fixture();d.attempt(0);d.db.memory[d.target.id].policyId='legacy-policy';
  assert.equal((await Shadow.compare(d.db,{Core:C,Vendor,now:at(4)})).exclusions.missingOrLegacyMemory,1);
});

test('FSRS replay cannot look ahead at future review history in a past-date preview',async()=>{
  const f=fixture();for(const day of [0,3,9])f.attempt(day);
  const before=JSON.stringify(f.db);
  const earlier=await Shadow.compare(f.db,{Core:C,Vendor,now:at(8)});
  assert.equal(earlier.comparedTargets,0);
  assert.equal(earlier.exclusions.futureDatedHistory,1);
  assert.equal(earlier.exclusions.incompleteHistory,0);
  const calendar=await Shadow.compareCalendar(f.db,{Core:C,Vendor,now:at(8),
    prefs:{days:21,weekdayMinutes:20,weekendMinutes:20}});
  assert.equal(calendar.calendar.modeledNextDueDates,0);
  assert.deepEqual(calendar.calendar.current,calendar.calendar.hybrid);
  assert.equal((await Shadow.compare(f.db,{Core:C,Vendor,now:at(9)})).comparedTargets,1);
  assert.equal(JSON.stringify(f.db),before,'Past-date preview may not mutate future records');
});

test('shadow model fails closed if missing and rejects invalid preview inputs',async()=>{
  const f=fixture();f.attempt(0);const before=JSON.stringify(f.db);
  await assert.rejects(Shadow.compare(f.db,{Core:C,Vendor:{},now:at(3)}),/unavailable/);
  await assert.rejects(Shadow.compare(f.db,{Core:C,Vendor,limit:501}),/1–500/);
  await assert.rejects(Shadow.compare(f.db,{Core:C,Vendor,now:new Date('nope')}),/Invalid preview/);
  assert.equal(JSON.stringify(f.db),before);
});

test('calendar shadow compares feasible first-pass windows without changing memory or availability',async()=>{
  const f=fixture();for(const day of [0,3,9])f.attempt(day);
  // An unmodeled new question must keep its actual first-study opportunity.
  C.addRequirement(f.db,{courseId:f.req.courseId,kind:'recall',question:'What is ATP?',answer:'An energy carrier.'});
  const before=JSON.stringify(f.db);
  const prefs={days:42,weekdayMinutes:25,weekendMinutes:0,missedDates:['2026-11-19']};
  const out=await Shadow.compareCalendar(f.db,{Core:C,Vendor,now:at(10),prefs});
  assert.equal(out.comparedTargets,1);
  assert.equal(out.calendar.modeledNextDueDates,1);
  assert.equal(out.calendar.firstDate,'2026-11-11');
  assert.equal(out.calendar.lastDate,'2026-12-22');
  assert.equal(out.calendar.current.horizonDays,42);
  assert.equal(out.calendar.current.availableMinutes,out.calendar.hybrid.availableMinutes);
  assert.equal(out.calendar.current.availableMinutes,29*25); // 30 weekdays, one unavailable
  assert.equal(out.calendar.current.firstPassOpportunities,2);
  assert.equal(out.calendar.hybrid.firstPassOpportunities,1);
  assert.equal(out.calendar.movements.onlyCurrent,1);
  assert.equal(out.calendar.movements.unchanged,1);
  assert.equal(out.calendar.movements.onlyHybrid,0);
  assert.equal(out.calendar.current.unplacedKnownDue,0);
  assert.equal(out.calendar.hybrid.unplacedKnownDue,0);
  assert.equal(JSON.stringify(f.db),before);
  assert.equal(f.db.memory[f.target.id].dueAt,out.rows[0].activeDueAt);
  assert.equal(out.activePolicyChanged,false);
  assert.deepEqual((await Shadow.compareCalendar(f.db,{Core:C,Vendor,now:at(10),prefs})).calendar,out.calendar);
});

test('exam opportunity coverage remains scoped and is not mistaken for a memory-model prediction',async()=>{
  const f=fixture();for(const day of [0,3,9])f.attempt(day);
  C.addRequirement(f.db,{courseId:f.req.courseId,kind:'recall',question:'Which molecule stores energy?',answer:'ATP.'});
  C.addAssessment(f.db,{courseId:f.req.courseId,title:'Biology midterm',date:'2026-12-18',
    scope:'selected',requirementIds:[f.req.id]});
  const before=JSON.stringify(f.db);
  const out=await Shadow.compareCalendar(f.db,{Core:C,Vendor,now:at(10),
    prefs:{days:42,weekdayMinutes:25,weekendMinutes:25,missedDates:[]}});
  assert.equal(out.calendar.examCoverage.length,1);
  assert.equal(out.calendar.examCoverage[0].title,'Biology midterm');
  assert.equal(out.calendar.examCoverage[0].eligibleTargets,1);
  assert.equal(out.calendar.examCoverage[0].currentFirstPass,1);
  assert.equal(out.calendar.examCoverage[0].hybridFirstPass,1);
  assert.match(out.calendar.warning,/not verified learning or predicted grades/);
  assert.equal(JSON.stringify(f.db),before);
});

test('excluded histories produce an identical calendar and invalid capacity is rejected read-only',async()=>{
  const f=fixture();f.attempt(0,{assisted:true});
  const before=JSON.stringify(f.db);
  const out=await Shadow.compareCalendar(f.db,{Core:C,Vendor,now:at(3)});
  assert.equal(out.comparedTargets,0);
  assert.deepEqual(out.calendar.current,out.calendar.hybrid);
  assert.equal(out.calendar.movements.unchanged,1);
  await assert.rejects(Shadow.compareCalendar(f.db,{Core:C,Vendor,now:at(3),
    prefs:{days:42,weekdayMinutes:721}}),/0–720/);
  assert.equal(JSON.stringify(f.db),before);
});

test('schema-v5 JSON backup round-trip preserves live due dates, study history and FSRS-only previews',async()=>{
  const f=fixture();for(const day of [0,3,9])f.attempt(day);
  C.addRequirement(f.db,{courseId:f.req.courseId,kind:'recall',question:'Where is genetic information stored?',answer:'DNA.'});
  C.addAssessment(f.db,{courseId:f.req.courseId,title:'Biology exam',date:'2026-12-18',
    scope:'selected',requirementIds:[f.req.id]});
  f.db.agendaPreferences={days:42,weekdayMinutes:20,weekendMinutes:0,missedDates:['2026-11-19']};
  Rhythm.logOutsideStudy(f.db,{date:'2026-11-10',minutes:35,kind:'reading',
    note:'Read notes without answering recall questions',now:at(10)});
  Rhythm.recordDailyPlan(f.db,C,{now:at(10)});
  const originalMemory=JSON.stringify(f.db.memory),before=JSON.stringify(f.db);
  const activeAgenda=C.buildReviewAgenda(f.db,{start:at(10),...f.db.agendaPreferences});
  const activeQueue=C.planActivities(f.db,25,[],{},at(10));
  const shadow=await Shadow.compareCalendar(f.db,{Core:C,Vendor,now:at(10)});
  assert.equal(shadow.comparedTargets,1);
  assert.equal(JSON.stringify(f.db),before,'Shadow preview must not appear in the backup database');
  // This is the exact JSON encoding used by the app's export button.
  const exported=JSON.stringify(f.db,null,2),restored=C.validateImport(JSON.parse(exported));
  assert.deepEqual(restored,JSON.parse(exported),
    'Modern backups must round-trip without new inferred history or JSON-level changes');
  assert.equal(JSON.stringify(restored),before,
    'Optional undefined JS fields do not belong to the saved JSON representation');
  assert.equal(JSON.stringify(restored.memory),originalMemory);
  assert.equal(restored.memory[f.target.id].dueAt,shadow.rows[0].activeDueAt);
  assert.equal(restored.attempts.length,3,'Outside study must not create recall attempts');
  assert.deepEqual(restored.outsideStudyLogs,f.db.outsideStudyLogs);
  assert.deepEqual(restored.studyPlanHistory,f.db.studyPlanHistory);
  assert.deepEqual(C.buildReviewAgenda(restored,{start:at(10),...restored.agendaPreferences}),activeAgenda);
  assert.deepEqual(C.planActivities(restored,25,[],{},at(10)),activeQueue);
  assert.deepEqual(await Shadow.compareCalendar(restored,{Core:C,Vendor,now:at(10)}),shadow);
  assert.doesNotMatch(exported,/FSRS-7|default-weights-shadow-v1/,
    'The FSRS preview and its hypothetical model choice must not be exported');
  const tampered=JSON.parse(exported);
  tampered.attempts.at(-1).schedulingDecision.activeDueAt=shadow.rows[0].shadowDueAt;
  assert.throws(()=>C.validateImport(tampered),/Invalid versioned scheduling decision/,
    'A hypothetical date cannot silently replace the recorded active decision in an import');
  assert.equal(JSON.stringify(f.db),before);
});
