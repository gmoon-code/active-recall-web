/* Active Recall Web v4.6 — deliberately out-of-cohort reviewer training.
   Frozen synthetic examples; human interpretation, not a calibration test.
   No change to mastery, learning records, active/shadow scheduling or pilot selection. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallReviewerTraining=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
 if(!H)throw Error('Manual review module is required.');
 const FORMAT={request:'arw-reviewer-training-request-v1',submission:'arw-reviewer-training-submission-v1',summary:'arw-reviewer-training-summary-v1'};
 const KIT_ID='synthetic-rubric-interpretation-v1';
 const CASES=[
  {id:'energy-transfer',title:'Membrane energy transfer',question:'Explain how electron transport supports ATP production across a membrane.',
   response:'Electron carriers move protons across the membrane. Protons return through ATP synthase, and ATP is produced.',
   criteria:[
    {id:'gradient',text:'Explains that electron transport establishes a proton concentration difference across the membrane.'},
    {id:'coupling',text:'Connects proton movement through ATP synthase to the formation of ATP.'}
   ],
   discussion:'Would moving protons across a membrane be sufficient evidence of a concentration difference, or should the learner explicitly name a gradient? Discuss why, without assuming a single indisputable rating.'},
  {id:'recessive-inheritance',title:'Inherited recessive trait',question:'Explain how a recessive trait could appear in a child when neither parent shows it.',
   response:'Each parent can carry a recessive allele without showing it. Their child can inherit recessive alleles from both parents and express the trait.',
   criteria:[
    {id:'alleles',text:'Identifies how inherited recessive alleles are transmitted from parents to offspring.'},
    {id:'genotype-phenotype',text:'Connects a recessive genotype to the observed phenotype of the offspring.'}
   ],
   discussion:'Which phrases support a causal claim about phenotype, rather than merely repeating a vocabulary word? Where would the judgment require assumptions not stated in the rubric?'},
  {id:'food-web-model',title:'Food-web representation',question:'Describe something a food-web diagram can represent and an important limitation of the diagram.',
   response:'Arrows can show who eats whom. But a food web cannot show how much energy actually flows without more data.',
   criteria:[
    {id:'links',text:'Describes a relationship depicted by links in a food-web representation.'},
    {id:'limitations',text:'Names a limitation of the model and indicates what further evidence would be needed.'},
    {id:'vague',text:'Provides a complete and convincing scientific explanation.'}
   ],
   discussion:'The third criterion was deliberately written as a vague, potentially overlapping demand. What observable evidence would make it usable? Do not reinterpret earlier learners’ work against a newly rewritten criterion.'}
 ];
 const FLAGS=new Set(['none','vague','multiple_demands','overlap','insufficient_evidence_rule','other']);
 const STATUSES=new Set(['included','not_demonstrated','uncertain','unassessed']);
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const fields={
  request:['format','version','kitId','sessionId','issuedAt','casesFingerprint','cases'],
  submission:['format','version','kitId','sessionId','casesFingerprint','slot','reviewerRole','completedAt','confirmed','discussionUnseenAttested','differentPersonAttested','noPriorJudgmentsAttested','judgments','note']
 };
 const iso=s=>typeof s==='string'&&s.length<=40&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
 const exact=(obj,keys)=>obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&
   Object.keys(obj).sort().join('|')===keys.slice().sort().join('|');
 const copy=x=>JSON.parse(JSON.stringify(x));
 const sig=x=>H.fingerprint(JSON.stringify(x));
 const KIT_FINGERPRINT=sig(CASES);
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function request(session){
   return {format:FORMAT.request,version:1,kitId:KIT_ID,sessionId:session.id,issuedAt:session.issuedAt,
     casesFingerprint:KIT_FINGERPRINT,cases:copy(CASES)};
 }
 function validateRequest(raw){
   if(!exact(raw,fields.request)||raw.format!==FORMAT.request||raw.version!==1||
     raw.kitId!==KIT_ID||!UUID.test(raw.sessionId)||!iso(raw.issuedAt)||
     raw.casesFingerprint!==KIT_FINGERPRINT||!same(raw.cases,CASES)||
     JSON.stringify(raw).length>40000)
     throw Error('Training request does not match the frozen synthetic casebook.');
   return raw;
 }
 function start(db,{now=new Date(),confirmed=false,sessionId=null}={}){
   if(db.reviewerTraining!==undefined)
     throw Error('An immutable local training cycle is already registered. Its original results cannot be silently replaced.');
   if(!confirmed)throw Error('Confirm that the training uses only synthetic, non-pilot examples.');
   if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
     throw Error('Invalid reviewer-training session time.');
   const id=sessionId??(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():null);
   if(!UUID.test(id||''))throw Error('A secure training-session UUID is required.');
   if(!Array.isArray(db?.events))throw Error('Missing local audit event history.');
   const record={version:1,id,issuedAt:now.toISOString(),kitId:KIT_ID,
     casesFingerprint:KIT_FINGERPRINT,pilotLockedAtAtIssue:db.reviewerPilot?.lockedAt||null,
     submissions:[]};
   db.reviewerTraining=record;
   db.events.push({type:'reviewer_training.created',entityId:id,at:record.issuedAt,
     kitId:KIT_ID,casesFingerprint:KIT_FINGERPRINT,pilotLockedAtAtIssue:record.pilotLockedAtAtIssue});
   return request(record);
 }
 function issued(db){
   const s=db?.reviewerTraining;
   if(!s)throw Error('Create a synthetic reviewer-training cycle first.');
   return validateRequest(request(s));
 }
 function expectedRows(){
   return CASES.flatMap(c=>c.criteria.map(k=>({caseId:c.id,criterionId:k.id})));
 }
 function checkJudgments(rows){
   const expected=expectedRows();
   if(!Array.isArray(rows)||rows.length!==expected.length)throw Error('Every original training criterion requires a record, including Not assessed.');
   let seen=0;
   const out=rows.map((r,i)=>{
     const spec=expected[i],caseObj=CASES.find(x=>x.id===spec.caseId);
     if(!exact(r,['caseId','criterionId','status','excerpt','rationale','issue','issueNote'])||
       r.caseId!==spec.caseId||r.criterionId!==spec.criterionId||
       !STATUSES.has(r.status)||!FLAGS.has(r.issue)||
       typeof r.excerpt!=='string'||r.excerpt.length>700||r.excerpt!==r.excerpt.trim()||
       typeof r.rationale!=='string'||r.rationale.length>1200||r.rationale!==r.rationale.trim()||
       typeof r.issueNote!=='string'||r.issueNote.length>1200||r.issueNote!==r.issueNote.trim()||
       r.status==='included'&&(!r.excerpt||!caseObj.response.includes(r.excerpt))||
       r.status!=='included'&&r.excerpt||
       (r.status==='not_demonstrated'||r.status==='uncertain')&&r.rationale.length<8||
       r.status==='unassessed'&&(r.excerpt||r.rationale)||
       r.issue==='none'&&r.issueNote||
       r.issue!=='none'&&r.issueNote.length<12)
       throw Error('The training judgment or exact excerpt for '+spec.caseId+' / '+spec.criterionId+' is incomplete or mismatched.');
     if(r.status!=='unassessed')seen++;
     return {...r};
   });
   if(!seen)throw Error('At least one criterion must be assessed by a person.');
   return out;
 }
 function validateSubmission(raw,req){
   validateRequest(req);
   if(!exact(raw,fields.submission)||raw.format!==FORMAT.submission||raw.version!==1||
     raw.kitId!==KIT_ID||raw.sessionId!==req.sessionId||
     raw.casesFingerprint!==KIT_FINGERPRINT||!['A','B'].includes(raw.slot)||
     !['self','other_person'].includes(raw.reviewerRole)||
     !iso(raw.completedAt)||raw.confirmed!==true||raw.discussionUnseenAttested!==true||
     raw.differentPersonAttested!==(raw.slot==='B')||
     raw.noPriorJudgmentsAttested!==(raw.slot==='B')||
     typeof raw.note!=='string'||raw.note.length>2000||raw.note!==raw.note.trim()||
     JSON.stringify(raw).length>50000)
     throw Error('Training file is invalid, incomplete, or from the wrong issued cycle.');
   if(!same(checkJudgments(raw.judgments),raw.judgments))
     throw Error('Training criterion order or written evidence is altered.');
   return raw;
 }
 function makeSubmission(req,{slot,reviewerRole,judgments,note='',confirmed=false,
   discussionUnseen=false,differentPerson=false,noPriorJudgments=false,completedAt=new Date().toISOString()}={}){
   validateRequest(req);
   if(!confirmed||!discussionUnseen)
     throw Error('Confirm this was a human first judgment made before opening the discussion guidance.');
   if(!['A','B'].includes(slot)||!['self','other_person'].includes(reviewerRole))
     throw Error('Choose reviewer A or B and the true reviewer role.');
   if(slot==='B'&&(!differentPerson||!noPriorJudgments))
     throw Error('Reviewer B must attest to being a different person and not having consulted A.');
   if(!iso(completedAt)||typeof note!=='string'||note.length>2000)
     throw Error('Invalid training completion time or reviewer note.');
   return validateSubmission({format:FORMAT.submission,version:1,kitId:KIT_ID,
     sessionId:req.sessionId,casesFingerprint:KIT_FINGERPRINT,slot,reviewerRole,
     completedAt,confirmed:true,discussionUnseenAttested:true,
     differentPersonAttested:slot==='B',noPriorJudgmentsAttested:slot==='B',
     judgments:checkJudgments(judgments),note:note.trim()},req);
 }
 function importSubmission(db,raw,{now=new Date()}={}){
   const s=db?.reviewerTraining;
   if(!s)throw Error('No local training cycle was issued. Restore the matching owner backup.');
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>50000)
     throw Error('The imported training response file is malformed or too large.');
   validateSubmission(raw,request(s));
   if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getTime()<Date.parse(s.issuedAt))
     throw Error('Training import cannot predate local issuance.');
   if(s.submissions.some(x=>x.slot===raw.slot))throw Error('This reviewer slot already has an original training record. Reviews are append-only.');
   if(raw.slot==='B'&&s.submissions.some(x=>x.reviewerRole==='self')&&raw.reviewerRole==='self')
     throw Error('Two reviewer slots cannot both claim to be the learner.');
   if(raw.slot==='A'&&s.submissions.some(x=>x.slot==='B'&&x.reviewerRole==='self')&&raw.reviewerRole==='self')
     throw Error('Two reviewer slots cannot both claim to be the learner.');
   const rec={version:1,slot:raw.slot,reviewerRole:raw.reviewerRole,importedAt:now.toISOString(),
     submission:copy(raw),submissionFingerprint:sig(raw)};
   s.submissions.push(rec);
   db.events.push({type:'reviewer_training.imported',entityId:s.id,slot:raw.slot,at:rec.importedAt,
     submissionFingerprint:rec.submissionFingerprint});
   return rec;
 }
 function compare(db){
   const s=db?.reviewerTraining;if(!s)return null;
   const A=s.submissions.find(x=>x.slot==='A')?.submission,
     B=s.submissions.find(x=>x.slot==='B')?.submission;
   const all=expectedRows();
   const aa=A?.judgments||[],bb=B?.judgments||[];
   const disagreements=[];
   for(let i=0;i<all.length;i++){
     const a=aa[i],b=bb[i];
     if(a&&b&&a.status!==b.status)
       disagreements.push({caseId:all[i].caseId,criterionId:all[i].criterionId,
         A:a.status,B:b.status});
   }
   const flagRows=all.map((x,i)=>({
      ...x,A:aa[i]?.issue??'missing',B:bb[i]?.issue??'missing'
   })).filter(x=>x.A!=='none'&&x.A!=='missing'||x.B!=='none'&&x.B!=='missing');
   const cycleAfterPilot=!!s.pilotLockedAtAtIssue;
   const importedAfterPilot=!!(db.reviewerPilot&&s.submissions.some(x=>
     Date.parse(x.importedAt)>=Date.parse(db.reviewerPilot.lockedAt)));
   return {kitId:s.kitId,sessionId:s.id,createdAt:s.issuedAt,
     A:!!A,B:!!B,totalCriteria:all.length,completed:s.submissions.length,
     statusMatches:A&&B?all.length-disagreements.length:null,
     disagreements,flagged:flagRows,
     cycleAfterPilot,importedAfterPilot,
     interpretation:'These are judgments on fabricated practice responses, not calibration accuracy or qualifications. The discussion guidance provides no gold standard. Disagreements and ambiguity flags should prompt a human conversation before revising criteria for future attempts. No older rubric snapshot or pilot record changes. Self-reported reviewers, timestamps and non-exposure are not authenticated.'};
 }
 function exportSummary(db){
   if(!db?.reviewerTraining)throw Error('No reviewer training cycle exists.');
   validate(db);
   const c=compare(db);
   return {format:FORMAT.summary,version:1,kitId:c.kitId,issuedAt:c.createdAt,
     firstACompleted:c.A,firstBCompleted:c.B,totalCriteria:c.totalCriteria,
     statusMatches:c.statusMatches,disagreementCount:c.disagreements.length,
     ambiguousCriterionCount:c.flagged.length,
     criteriaWithFlags:c.flagged.map(x=>({caseId:x.caseId,criterionId:x.criterionId,flaggedA:x.A!=='none'&&x.A!=='missing',flaggedB:x.B!=='none'&&x.B!=='missing'})),
     sessionStartedAfterLocalPilotLock:c.cycleAfterPilot,
     atLeastOneImportAfterLocalPilotLock:c.importedAfterPilot,
     caution:'Counts from frozen synthetic scenarios. Not grades, training certification, inter-rater reliability, anonymisation, true preregistration or evidence of memory effects. Import times use local device clocks.'};
 }
 function validate(db){
   const s=db?.reviewerTraining;if(s===undefined)return true;
   if(!s||!exact(s,['version','id','issuedAt','kitId','casesFingerprint','pilotLockedAtAtIssue','submissions'])||
     s.version!==1||s.kitId!==KIT_ID||!UUID.test(s.id)||!iso(s.issuedAt)||
     s.casesFingerprint!==KIT_FINGERPRINT||
     s.pilotLockedAtAtIssue!==null&&!iso(s.pilotLockedAtAtIssue)||
     !Array.isArray(s.submissions)||s.submissions.length>2)
     throw Error('Invalid local synthetic training-cycle provenance.');
   const created=db.events.filter(x=>x.type==='reviewer_training.created');
   if(created.length!==1||created[0].entityId!==s.id||created[0].at!==s.issuedAt||
     created[0].kitId!==KIT_ID||created[0].casesFingerprint!==KIT_FINGERPRINT||
     created[0].pilotLockedAtAtIssue!==s.pilotLockedAtAtIssue)
     throw Error('Synthetic training request does not match its original issuance event.');
   if(db.reviewerPilot?.lockedAt&&
     s.pilotLockedAtAtIssue!==null&&s.pilotLockedAtAtIssue!==db.reviewerPilot.lockedAt)
     throw Error('Training cycle original pilot lock does not match current local pilot.');
   if(s.pilotLockedAtAtIssue!==null&&!db.reviewerPilot)
     throw Error('Training cycle cannot refer to an absent pilot lock.');
   const imported=db.events.filter(x=>x.type==='reviewer_training.imported');
   if(imported.length!==s.submissions.length)
     throw Error('Training import history does not match its original events.');
   const slots=new Set();
   for(const rec of s.submissions){
     if(!exact(rec,['version','slot','reviewerRole','importedAt','submission','submissionFingerprint'])||
       rec.version!==1||!['A','B'].includes(rec.slot)||slots.has(rec.slot)||
       !iso(rec.importedAt)||Date.parse(rec.importedAt)<Date.parse(s.issuedAt)||
       rec.submissionFingerprint!==sig(rec.submission))
       throw Error('Invalid recorded training review provenance.');
     slots.add(rec.slot);
     try{validateSubmission(rec.submission,request(s));}
     catch{throw Error('Imported training first-pass file does not match the frozen synthetic casebook.');}
     if(rec.submission.slot!==rec.slot||rec.submission.reviewerRole!==rec.reviewerRole)
       throw Error('Training reviewer slot or role was changed after import.');
   }
   if(s.submissions.length===2&&s.submissions.every(x=>x.reviewerRole==='self'))
     throw Error('Two purportedly independent training reviewers cannot both be the learner.');
   for(let i=0;i<imported.length;i++){
     if(imported[i].entityId!==s.id||imported[i].slot!==s.submissions[i].slot||
       imported[i].at!==s.submissions[i].importedAt||
       imported[i].submissionFingerprint!==s.submissions[i].submissionFingerprint)
       throw Error('Training import event no longer matches the submitted original judgment.');
   }
   return true;
 }
 return {FORMAT,KIT_ID,CASES,KIT_FINGERPRINT,start,issued,expectedRows,validateRequest,
   makeSubmission,validateSubmission,importSubmission,compare,exportSummary,validate};
});
