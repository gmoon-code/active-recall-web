/* v4.5: prospective human-review pilot dashboard, all local and optional. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallPilotUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const Pilot=(typeof module!=='undefined'&&module.exports)?require('./reviewer-pilot.js'):globalThis.ActiveRecallReviewerPilot;
 const reasonLabel={
  not_written:'No saved written answer',unsupported_kind:'Not explanation or application',
  assisted:'Assisted original attempt',immediate_post_study:'Immediately after studying',
  unverified_requirement:'Question not verified at attempt',
  missing_original_rubric:'Original rubric unavailable',duplicate_target:'Repeated target; first eligible attempt already enrolled',
  clock_before_lock:'Recorded timestamp predates protocol lock'
 };
 const metric=(label,n,note,esc)=>`<div class="card slim"><div class="metric-label">${esc(label)}</div>
   <div class="metric">${esc(n)}</div><div class="metric-note">${esc(note)}</div></div>`;
 function panel({db,esc,courseName}){
  const p=db.reviewerPilot;
  if(!p)return `<section class="section" id="reviewer-pilot"><div class="card">
    <div class="card-title"><h2>Prospective human-review pilot</h2><span class="pill blue">Optional · no grading</span></div>
    <p class="small muted">Start a fixed, descriptive pilot <strong>before</strong> collecting new written answers. The app will screen each new study attempt automatically in recorded order, enroll only the first eligible unassisted written explanation/application per distinct retrieval target, and retain explicit exclusions. It does not choose only successful reviews or alter the review calendar.</p>
    <form data-form="start-reviewer-pilot" class="stack">
      <div class="field"><label for="pilot-target-count">Preselect distinct eligible retrieval targets</label>
        <select id="pilot-target-count" class="select" name="plannedTargets">
          <option value="3">3 (minimal workflow feasibility)</option>
          <option value="6" selected>6 (small descriptive pilot)</option>
          <option value="10">10 (longer descriptive pilot)</option>
          <option value="15">15 (larger feasibility sample)</option>
          <option value="20">20 (larger feasibility sample)</option>
          <option value="30">30 (maximum prototype registry)</option>
        </select></div>
      <p class="info"><strong>Fixed inclusion:</strong> future recorded attempts only, saved written explanation/application, unassisted, not immediate after studying, originally verified question, preserved contemporaneous rubric, first eligible attempt for each target. All other newly recorded attempts are screened and logged with an exclusion reason until the quota is reached. Nothing already reviewed is enrolled retrospectively.</p>
      <label class="checkline"><input type="checkbox" name="confirmed" value="yes" required/>I understand that this locks a local, non-authenticated pilot protocol before subsequent attempts; it is not a registered scientific study or a claim of learning effectiveness.</label>
      <button class="btn primary" type="submit">Lock protocol and begin prospective screening</button>
    </form>
    <p class="small muted">This app cannot verify reviewer identity, exposure, or study ethics approvals. Avoid recording identifiable student information and seek appropriate permissions for any real study.</p>
  </div></section>`;
  const a=Pilot.audit(db),display=a.rows.slice().reverse().slice(0,36);
  const status=a.status==='collecting'?'Collecting new attempts':a.status==='target_reached'?'Planned quota reached':'Stopped early with documented deviation';
  return `<section class="section" id="reviewer-pilot"><div class="card">
    <div class="card-title"><h2>Prospective human-review pilot</h2><span class="pill blue">${esc(status)}</span></div>
    <p class="small muted">Locally locked ${esc(new Date(p.lockedAt).toLocaleString())}. First ${esc(p.plannedTargets)} eligible <strong>distinct</strong> retrieval targets are enrolled in original attempt order; unsupported attempts and repeats remain screened exclusions. The protocol is not editable, and no prior answers were retrospectively selected.</p>
    <div class="grid cols3" style="margin:13px 0">
      ${metric('Eligible enrolled',a.enrolled+' / '+p.plannedTargets,'Future original answers only',esc)}
      ${metric('Excluded attempts',a.excluded,'Every screened exclusion retained',esc)}
      ${metric('Complete A/B first passes',a.paired,'Both pre-reference reviews imported',esc)}
    </div>
    <p class="small muted">Screened ${a.screened} original attempts · ${a.awaitingA} enrolled awaiting first Reviewer A · ${a.awaitingB} awaiting Reviewer B · ${a.legacyReviewConflicts} incompatible prior-method reviews.</p>
    <p class="small muted">Among ${a.paired} completed A/B pairs: ${a.agreements} decisive criterion agreements, ${a.disagreements} decisive disagreements, ${a.nondecisive} nondecisive criterion pairs. Optional post-reference responses missing: A ${a.noPostA}, B ${a.noPostB}. <strong>Missing is not incorrect.</strong></p>
    <div class="btnrow" style="margin:15px 0">
      <button class="btn secondary" type="button" data-action="export-reviewer-pilot-protocol">↓ Export protocol and descriptive summary JSON</button>
      <button class="btn secondary" type="button" data-action="export-reviewer-pilot-csv">↓ Export coded criteria CSV</button>
      ${a.status==='collecting'?'<button class="btn secondary" type="button" data-action="stop-reviewer-pilot">Document an early stop</button>':''}
    </div>
    ${p.closeReason==='stopped_early'? `<p class="info"><strong>Early-stop deviation:</strong> ${esc(p.earlyStopNote)}</p>`:''}
    <details class="document-outline"><summary><strong>Consecutive screening and missingness log</strong> <span class="small muted">${a.screened} entries; newest first</span></summary>
      ${display.length?display.map(x=>{const ent=p.entries[x.caseNumber-1],attempt=db.attempts[p.baselineAttemptCount+x.caseNumber-1];
        return `<div class="listrow"><div class="rowbody"><strong>Screened #${x.caseNumber}: ${esc(x.decision==='enrolled'?'Enrolled original explanation':'Excluded — '+(reasonLabel[x.reason]||x.reason))}</strong>
          <small>${esc(courseName(attempt.courseId))} · ${esc(new Date(ent.screenedAt).toLocaleString())}</small>
          ${x.decision==='enrolled'? `<p class="small muted">A: ${x.firstA?'locked':'missing'} · B: ${x.firstB?'locked':'missing'} · Post A: ${x.postA?'observed':'missing'} · Post B: ${x.postB?'observed':'missing'}. ${x.criterionCount} original criteria.</p>`:''}
        </div></div>`;
      }).join(''):'<p class="small muted">No newly recorded study attempts have been screened yet. New attempts will appear here automatically.</p>'}
    </details>
    <details class="document-outline" style="margin-top:12px"><summary><strong>Fixed screening reasons and evidence limits</strong></summary>
      <p class="small muted">Ineligible original attempts: ${Object.entries(a.exclusions).filter(([key,n])=>n).map(([key,n])=>esc(reasonLabel[key]||key)+': '+n).join(' · ')||'None observed'}.</p>
      <p class="small muted">The coded CSV contains only chronological case numbers, rubric-row numbers, enum judgments and missing/changed flags. It intentionally omits original question/answer text, reviewer quotes, notes, original IDs and timestamps; this reduces exposure but is not guaranteed anonymous. Interpretation requires attention to the fixed sampling rules, repeated measurements, incomplete pairs, and reference-exposure limitations.</p>
    </details>
    <p class="info" style="margin-top:12px">${esc(a.warning)}</p>
  </div></section>`;
 }
 return {panel};
});
