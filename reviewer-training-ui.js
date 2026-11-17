/* v4.6 owner-side synthetic reviewer calibration-practice interface.
   Reports human interpretation differences, never "pass rates" or pilot grades. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallReviewerTrainingUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const T=(typeof module!=='undefined'&&module.exports)?require('./reviewer-training.js'):globalThis.ActiveRecallReviewerTraining;
 const STATUS={included:'Included',not_demonstrated:'Not demonstrated',uncertain:'Uncertain',unassessed:'Not assessed'};
 const FLAG={none:'No flag',vague:'Vague wording',multiple_demands:'Multiple demands',overlap:'Overlap',insufficient_evidence_rule:'Missing evidence rule',other:'Other concern',missing:'Missing'};
 function panel({db,esc}){
   const training=db.reviewerTraining,summary=T.compare(db);
   const intro=`<section class="section" id="reviewer-training"><div class="card">
     <div class="card-title"><h2>Reviewer training & rubric clarity</h2><span class="pill blue">Synthetic examples · human-led</span></div>
     <p class="small muted">Practise reading scientific explanations and flagging ambiguous criteria using <strong>three fictional examples, never pilot attempts or other learners' records</strong>. Two separate reviewers can save their first judgments offline before reading interpretive discussion prompts. The exercise is not an expertise test, an accuracy score, or a statistical calibration.</p>
     <div class="btnrow" style="margin:12px 0">
       <a href="./reviewer-training-offline.html" class="btn secondary" download="active-recall-reviewer-training-offline.html">↓ Save standalone offline training page</a>
       <a href="./reviewer-training-offline.html" class="btn secondary" target="_blank" rel="noopener noreferrer">Open training page ↗</a>
     </div>`;
   if(!training)return intro+`<form data-form="start-reviewer-training" class="stack">
       <p class="info">For the most useful workflow, start and complete this training <strong>before</strong> locking a prospective pilot (v4.5). Existing pilot evidence and earlier reviewer judgments will not be changed.</p>
       <label class="checkline"><input type="checkbox" name="confirmed" value="yes" required/>
         I understand this creates one locally linked training session using fictional scenarios; it is not a formal reviewer certification or a study registration.</label>
       <button class="btn primary" type="submit">Create independent training cycle</button>
     </form></div></section>`;
   const flags=summary.flagged,disagreements=summary.disagreements;
   return intro+`
     <p class="small muted">Training request issued ${esc(new Date(summary.createdAt).toLocaleString())}. The exact same synthetic training request can be re-downloaded for either reviewer; original reviewer files cannot be silently replaced.</p>
     <div class="grid cols3" style="margin:12px 0">
       <div class="card slim"><div class="metric-label">Initial training reviews</div><div class="metric">${summary.completed} / 2</div><div class="metric-note">Independent identity is self-attested</div></div>
       <div class="card slim"><div class="metric-label">Different criterion statuses</div><div class="metric">${summary.A&&summary.B?disagreements.length:'—'}</div><div class="metric-note">Only count after both first passes</div></div>
       <div class="card slim"><div class="metric-label">Rubric concerns flagged</div><div class="metric">${flags.length}</div><div class="metric-note">Criterion rows, not learners</div></div>
     </div>
     <div class="btnrow" style="margin:13px 0">
       <button class="btn secondary" type="button" data-action="export-reviewer-training-request">↓ Download synthetic request JSON</button>
       <button class="btn secondary" type="button" data-action="export-reviewer-training-summary">↓ Download coded training summary</button>
     </div>
     <div class="field"><label for="reviewer-training-import">Import an original completed human training file (A or B)</label>
       <input type="file" id="reviewer-training-import" accept=".json,application/json"/></div>
     <p class="small muted">Reviewer A: ${summary.A?'imported':'not imported'} · Reviewer B: ${summary.B?'imported':'not imported'}. A and B can complete the exercises separately, in either order. Both must assess without consulting the discussion prompts first; this remains unverified self-report.</p>
     ${summary.cycleAfterPilot||summary.importedAfterPilot?`<p class="info warningtext"><strong>Timing limitation:</strong> ${summary.cycleAfterPilot?'This training cycle was created after the local pilot lock. ':''}${summary.importedAfterPilot?'At least one original reviewer training file was imported after the local pilot lock. ':''}Do not report these events as verified pre-pilot reviewer preparation.</p>`:
       db.reviewerPilot?`<p class="small muted">The training cycle was issued before the pilot lock. File completion, independent training and timing are still self-reported; import timing may be later.</p>`:''}
     ${summary.A&&summary.B?
       `<details class="document-outline" style="margin-top:14px" open><summary><strong>Human first-pass differences</strong> · ${disagreements.length} of ${summary.totalCriteria} rubric rows</summary>
         ${disagreements.length?disagreements.map(x=>`<p class="small"><strong>${esc(x.caseId)} / ${esc(x.criterionId)}</strong> — A: ${esc(STATUS[x.A])} · B: ${esc(STATUS[x.B])}</p>`).join(''):'<p class="small muted">No status differences recorded for these fictional criteria. This is not proof of rubric validity or reviewer correctness.</p>'}
       </details>`:''}
     <details class="document-outline" style="margin-top:14px" ${flags.length?'open':''}>
       <summary><strong>Rubric ambiguity flags</strong> · ${flags.length} distinct criterion rows</summary>
       ${flags.length?flags.map(x=>`<p class="small"><strong>${esc(x.caseId)} / ${esc(x.criterionId)}</strong> — A: ${esc(FLAG[x.A])} · B: ${esc(FLAG[x.B])}</p>`).join(''):
          '<p class="small muted">No concerns have been flagged in imported training files. Absence of flags does not establish that a criterion is reliable.</p>'}
       <p class="small muted">Discuss concerns with human reviewers. Where justified, edit the live rubric for future study attempts only. The app never updates previous saved criterion versions, earlier judgments, the pilot sample, or the actual memory calendar.</p>
     </details>
     <p class="info" style="margin-top:12px">${esc(summary.interpretation)}</p>
   </div></section>`;
 }
 return {panel};
});
