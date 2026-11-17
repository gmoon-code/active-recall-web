/* v4.7: Opt-in reviewer usability cohort, purely local and outside study attempts. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallReviewerUsabilityUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const U=(typeof module!=='undefined'&&module.exports)?require('./reviewer-usability.js'):globalThis.ActiveRecallReviewerUsability;
 const OBSTACLE_LABELS={none:'No obstacle selected',status_options:'Distinguishing status options',
   finding_excerpt:'Finding an exact excerpt',uncertain_option:'Understanding Uncertain',
   criterion_wording:'Interpreting criteria',interface:'Using interface',other:'Other concern',skipped:'Skipped question'};
 function panel({db,esc}){
  const s=db.reviewerUsability;
  const intro=`<section class="section" id="reviewer-usability"><div class="card">
    <div class="card-title"><h2>Reviewer usability micro-pilot</h2><span class="pill blue">Voluntary · fictional responses</span></div>
    <p class="small muted">Invite a small fixed group to try the same three <strong>fictional</strong> science explanations before giving optional feedback about clarity, exact excerpts, rubric wording and navigation. Invitations receive anonymous-looking <strong>codes, not verified anonymous identities</strong>. Every unreturned invitation stays visible, and skipped questions are not replaced with negative ratings.</p>
    <div class="btnrow" style="margin:13px 0">
      <a class="btn secondary" href="./reviewer-usability-offline.html" download="active-recall-reviewer-usability-offline.html">↓ Save standalone offline exercise</a>
      <a class="btn secondary" href="./reviewer-usability-offline.html" target="_blank" rel="noopener noreferrer">Open fictional exercise ↗</a>
    </div>`;
  if(!s)return intro+`<form data-form="start-reviewer-usability" class="stack">
      <p class="info">Choose and lock the number of invitations <strong>before recruiting</strong>. This is an exploratory usability exercise, not verified pre-registration, an assessment of learner mastery, or a representative statistical sample. No real student responses are used.</p>
      <div class="field"><label for="usability-invitations">Fixed number of invitation slots</label>
        <select id="usability-invitations" class="select" name="planned">
          <option value="3">3 (small walkthrough)</option>
          <option value="5" selected>5 (small usability exercise)</option>
          <option value="8">8 (more feedback)</option>
          <option value="12">12 (maximum fixed invitation cohort)</option>
        </select></div>
      <label class="checkline"><input type="checkbox" name="confirmed" value="yes" required/>
        I understand invitations and nonreturns will be fixed in this browser, answers are voluntary, and I should obtain appropriate permission and consent for any research involving people.</label>
      <button class="btn primary" type="submit">Lock fictional usability invitations</button>
      <p class="small muted">This is separate from the v4.5 real-answer reviewer pilot and the v4.6 two-person training cycle. No learning schedule, criterion version or original human review will be changed.</p>
    </form></div></section>`;
  const audit=U.audit(db);
  const bars=audit.items.map(x=>`<div class="listrow">
      <div class="rowbody"><strong>${esc(x.prompt)}</strong>
        <small>Rated 1–5: ${[1,2,3,4,5].map(v=>v+': '+x.counts[v]).join(' · ')}
        · Skipped by returned reviewers: ${x.skipped}
        · No response file: ${x.notReturned}</small>
      </div></div>`).join('');
  const slots=audit.rows.map(r=>`<div class="listrow"><div class="rowbody">
      <strong>Invitation ${r.slot}: ${r.returned?'Response received':'Not returned'}</strong>
      <small>${r.returned?'Optional questions answered: '+r.questionnaireAnswered+' / 5 · Criteria assessed: '+r.criteriaAssessed+' / 7 · Rubric flags: '+r.rubricConcerns:
        'No returned file. Not counted as a negative evaluation.'}</small>
    </div>
    <button class="btn secondary" data-action="export-reviewer-usability-invite" data-index="${r.slot-1}" type="button">↓ ${r.returned?'Re-download':'Download'} invitation</button>
  </div>`).join('');
  const localComments=s.invitations.map((x,i)=>({slot:i+1,record:s.responses.find(r=>r.invitationId===x.id)}))
   .filter(x=>x.record?.submission.note);
  return intro+`
    <p class="small muted">Plan locally locked ${esc(new Date(s.issuedAt).toLocaleString())}. Fixed ${s.planned} invitation slots. Invitation codes are not names, and receiving an answer does not verify a person's identity.</p>
    ${audit.issuedAfterPilot?'<p class="info warningtext"><strong>Timing:</strong> This usability invitation plan was created after the local v4.5 pilot lock. It cannot establish that actual reviewers were trained in advance.</p>':''}
    <div class="grid cols3" style="margin:14px 0">
      <div class="card slim"><div class="metric-label">Fixed invitations</div><div class="metric">${s.planned}</div><div class="metric-note">No selective replacement</div></div>
      <div class="card slim"><div class="metric-label">Returned files</div><div class="metric">${audit.received}</div><div class="metric-note">Voluntarily shared</div></div>
      <div class="card slim"><div class="metric-label">Nonreturns</div><div class="metric">${audit.notReturned}</div><div class="metric-note">Missing, not poor ratings</div></div>
    </div>
    <div class="btnrow" style="margin:14px 0">
      <button type="button" class="btn secondary" data-action="export-reviewer-usability-csv">↓ Download coded invitation CSV</button>
      <button type="button" class="btn secondary" data-action="export-reviewer-usability-summary">↓ Download aggregate protocol JSON</button>
    </div>
    <div class="field"><label for="reviewer-usability-import">Import voluntary response JSON</label>
      <input type="file" accept=".json,application/json" id="reviewer-usability-import"/></div>
    <details class="document-outline" style="margin-top:15px" open>
      <summary><strong>Invitation status</strong> · every reserved slot</summary>${slots}
    </details>
    <details class="document-outline" style="margin-top:12px">
      <summary><strong>Instruction-clarity response counts</strong> · no percentages or average scores</summary>
      <p class="small muted">These are subjective, optional 1–5 self-reports. A person who does not return a file is different from a person who returns one but skips a question.</p>
      ${bars}
    </details>
    <details class="document-outline" style="margin-top:12px">
      <summary><strong>Most important obstacles</strong> · self-reported categories</summary>
      ${Object.entries(audit.obstacles).map(([key,n])=>`<p class="small">${esc(OBSTACLE_LABELS[key]||key)}: ${n}</p>`).join('')}
      <p class="small muted">Criterion judgments and quality flags are human-generated, not an objective correctness measure. Not assessed, Uncertain and absent files are distinct.</p>
    </details>
    ${localComments.length?`<details class="document-outline" style="margin-top:12px">
      <summary><strong>Optional free-text usability comments</strong> · only in this local database</summary>
      <p class="small muted">Free text can identify a person. It is deliberately excluded from exported CSV and summary JSON.</p>
      ${localComments.map(x=>`<p class="small"><strong>Invitation ${x.slot}:</strong> ${esc(x.record.submission.note)}</p>`).join('')}
    </details>`:''}
    <p class="info" style="margin-top:14px">${esc(audit.warning)}</p>
  </div></section>`;
 }
 return {panel};
});
