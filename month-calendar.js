/* Read-only monthly view of the existing rolling study agenda and dated records.
   A known saved due date outside the agenda is NOT an assigned study slot. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ActiveRecallMonthCalendar=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const pad=n=>String(n).padStart(2,'0');
  const localDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const monthOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
  function parseMonth(value){
    if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))throw Error('Choose a valid calendar month.');
    const year=Number(value.slice(0,4)),month=Number(value.slice(5));
    if(year<1900||year>2100)throw Error('Choose a month between 1900 and 2100.');
    return {year,month};
  }
  function shiftMonth(value,offset){
    const {year,month}=parseMonth(value);
    if(!Number.isInteger(offset)||Math.abs(offset)>1200)throw Error('Invalid calendar month change.');
    const moved=new Date(year,month-1+offset,1,12);
    const result=monthOf(moved);
    parseMonth(result);
    return result;
  }
  function build(db,core,agenda,{month=null,now=new Date(),prefs=db.agendaPreferences}={}){
    const monthKey=month||monthOf(now);
    const {year,month:number}=parseMonth(monthKey);
    if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid calendar date.');
    if(!agenda||!Array.isArray(agenda.days)||!agenda.days.length)throw Error('The current study plan is unavailable.');
    const today=localDate(now),first=agenda.days[0].date,last=agenda.days[agenda.days.length-1].date;
    const agendaByDate=new Map(agenda.days.map(day=>[day.date,day]));
    const assessments=new Map();
    for(const exam of db.assessments||[]){
      if(!assessments.has(exam.date))assessments.set(exam.date,[]);
      assessments.get(exam.date).push({id:exam.id,title:exam.title,courseId:exam.courseId});
    }
    const snapshots=new Map();
    for(const entry of db.studyPlanHistory||[]){
      const prior=snapshots.get(entry.date);
      if(!prior||entry.revision>prior.revision)snapshots.set(entry.date,entry);
    }
    const practice=new Map(),outside=new Map();
    for(const attempt of db.attempts||[]){
      const at=new Date(attempt.createdAt);
      if(Number.isFinite(at.getTime())){
        const date=localDate(at);practice.set(date,(practice.get(date)||0)+1);
      }
    }
    for(const log of db.outsideStudyLogs||[]){
      outside.set(log.date,(outside.get(log.date)||0)+log.minutes);
    }
    const dueByDate=new Map();
    const alreadyPlaced=new Set(agenda.days.flatMap(day=>day.activities.filter(a=>!a.conditional).map(a=>a.targetId)));
    // Existing verified/active targets only. This is the exact saved due date,
    // not a prediction of successful repetitions or a scheduled appointment.
    for(const candidate of core.eligibleCandidates(db,now)){
      const saved=db.memory[candidate.target.id],due=new Date(saved?.dueAt||'');
      if(!Number.isFinite(due.getTime()))continue;
      const date=localDate(due);
      if(date<=last||date<today)continue;
      if(!dueByDate.has(date))dueByDate.set(date,[]);
      dueByDate.get(date).push({targetId:candidate.target.id,requirementId:candidate.req.id,
        courseId:candidate.req.courseId,dueAt:saved.dueAt,
        earlierOpportunity:alreadyPlaced.has(candidate.target.id)});
    }
    const firstOfMonth=new Date(year,number-1,1,12);
    const startOffset=(firstOfMonth.getDay()+6)%7; // Monday first.
    const dayCount=new Date(year,number,0,12).getDate();
    const cells=[];
    for(let index=0;index<42;index++){
      const dateObj=new Date(year,number-1,1-startOffset+index,12);
      const date=localDate(dateObj),inMonth=dateObj.getMonth()===number-1;
      const day=agendaByDate.get(date)||null;
      const savedDue=dueByDate.get(date)||[];
      const known=day?day.activities.filter(a=>!a.conditional).length:0;
      const conditional=day?day.activities.filter(a=>a.conditional).length:0;
      const preparation=day?(day.preparationActivities||[]).length:0;
      const exams=assessments.get(date)||[];
      const plan=snapshots.get(date)||null;
      const weekday=dateObj.getDay(),budget=prefs?.missedDates?.includes(date)?0:
        ([0,6].includes(weekday)?prefs?.weekendMinutes:prefs?.weekdayMinutes);
      cells.push({date,number:dateObj.getDate(),inMonth,today:date===today,past:date<today,
        inAgenda:!!day,day,known,conditional,preparation,unplaced:day?.overdueUnplaced||0,
        savedDue,exams,plan,attempts:practice.get(date)||0,outsideMinutes:outside.get(date)||0,
        budgetMinutes:day?.budgetMinutes??budget??0,
        unavailable:budget===0});
    }
    return {month:monthKey,label:firstOfMonth.toLocaleDateString(undefined,{month:'long',year:'numeric'}),
      today,firstAgendaDate:first,lastAgendaDate:last,cells,
      previous:shiftMonth(monthKey,-1),next:shiftMonth(monthKey,1),
      // Stable day keys allow a rerender after changing availability or rating
      // an actual attempt without caching an obsolete forecast.
      byDate:new Map(cells.map(cell=>[cell.date,cell]))};
  }
  return {build,shiftMonth,monthOf,localDate};
});
