/* Active Recall Web v4.2 — user interface for browser-local paired human review. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ActiveRecallPairedUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const P=(typeof module!=='undefined'&&module.exports)?require('./paired-review.js'):globalThis.ActiveRecallPairedReview;
  const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
  const statuses=[['unassessed','Not assessed'],['included','Included'],['not_demonstrated','Not demonstrated'],['uncertain','Cannot determine']];
  const label=x=>Object.fromEntries(statuses)[x]||x;
  const metric=(name,value,note,esc)=>`<div class="card slim"><div class="metric-label">${esc(name)}</div><div class="metric">${esc(value)}</div><div class="metric-note">${esc(note)}</div></div>`;
  function panel({db,esc,courseName}){
    const audit=P.agreementAudit(db);
    const recent=db.attempts.slice().reverse().filter(a=>(a.activityKind==='explain'||a.activityKind==='apply')&&a.inputMode==='written'&&a.response?.trim()).slice(0,24);
    return `<section class="section"><div class="card"><div class="card-title"><h2>Two-reviewer agreement &amp; adjudication</h2><span class="pill blue">Human-entered · optional</span></div>
      <p class="small muted">Two people can assess one saved written explanation against the same original rubric. Reviewer B receives a blank form that hides A's decisions. Afterwards, compare judgments and document any reconciliation. The app cannot verify separate identities or genuine independence.</p>
      <div class="grid cols3" style="margin:15px 0">
        ${metric('Completed pairs',audit.completedPairs,'Two submitted judgments',esc)}
        ${metric('Comparable criteria',audit.comparable,'Both judgments decisive',esc)}
        ${metric('Decisive agreement',audit.agreementShare===null?'Not enough data':audit.agreementShare+'%','Shown after 20 criteria, 10 attempts, 5 targets',esc)}
      </div>
      <p class="small muted">${audit.agreements} agreed · ${audit.disagreements} disagreed · ${audit.excluded} uncertain/unassessed · ${audit.pendingAdjudication} pairs await reconciliation.</p>
      <details class="document-outline"><summary><strong>Review saved answers with two people</strong><span class="small muted">Recent ${recent.length} written explanations</span></summary>
        <p class="small muted" style="margin:10px 0">Reviewer B should be genuinely different from Reviewer A and must not inspect any of A's judgments before making their own. Both reviewers may see the original reference answer. Do not enter private student records.</p>
        ${recent.length?recent.map(a=>{const e=H.eligibility(a),p=a.independentReviewPair;return `<div class="listrow"><div class="rowbody"><strong>${esc(a.questionSnapshot)}</strong><small>${esc(courseName(a.courseId))} · ${new Date(a.createdAt).toLocaleDateString()} · ${p?.B?'Both recorded':p?.A?'A recorded · B pending':'Not started'}</small>${!e.ok?`<p class="small warningtext">${esc(e.reason)}</p>`:''}</div><button class="btn small secondary" type="button" data-action="open-pair-review" data-id="${esc(a.id)}">${p?.B?'Compare & adjudicate':p?.A?'Review as B':'Review as A'}</button></div>`;}).join(''):'<p class="info">Record an original written explanation with a verified rubric in Study Now first.</p>'}
      </details><p class="info">${esc(audit.warnings)}</p></div></section>`;
  }
  function modal({db,esc,courseName,attemptId}){
    const a=db.attempts.find(x=>x.id===attemptId),e=H.eligibility(a);
    const close='<button type="button" class="close" data-action="close-pair-review" aria-label="Close paired-review dialog">×</button>';
    if(!e.ok)return `<div class="modalwrap"><div class="modal" role="dialog" aria-modal="true" aria-label="Paired review unavailable"><div class="modalhead"><h2>Review unavailable</h2>${close}</div><p class="note">${esc(e.reason)}</p></div></div>`;
    const p=a.independentReviewPair,c=P.comparison(a),slot=p?.A?'B':'A';
    const top=`<div class="modalhead"><div><div class="eyebrow">Two human assessments · original record</div><h2>${c?'Review comparison':slot==='B'?'Reviewer B':'Reviewer A'}</h2><p class="small muted">${esc(courseName(a.courseId))} · ${new Date(a.createdAt).toLocaleString()}</p></div>${close}</div>
      <div class="note"><strong>Original question</strong><p>${esc(a.questionSnapshot)}</p></div>
      <div class="field" style="margin-top:12px"><label>Original written response</label><div class="answerbox">${esc(a.response)}</div></div>
      <details class="document-outline" open style="margin-top:10px"><summary><strong>Original reference answer</strong></summary><div class="answerbox" style="margin-top:9px">${esc(a.referenceSnapshot)}</div></details>`;
    if(!c){
      return `<div class="modalwrap"><div class="modal" role="dialog" aria-modal="true" aria-label="Independent reviewer ${slot}" style="width:min(790px,100%)">${top}
        <div class="note" style="margin:13px 0"><strong>${slot==='B'?'Second independent judgment — A’s findings hidden':'First judgment'}</strong><p class="small">${slot==='B'?'A’s ratings and evidence are hidden from this form. Do not consult prior individual reviews or related history before submitting your assessment.':'Review the original answer and rubric. A separate person should later form a judgment without seeing yours.'}</p></div>
        <form class="stack" data-form="save-pair-review">
          <input type="hidden" name="attemptId" value="${esc(a.id)}"/><input type="hidden" name="slot" value="${slot}"/>
          <div class="field"><label>Reviewer role (not identity verified)</label><select name="reviewerRole" class="select"><option value="self">Learner</option><option value="other_person">Another person</option></select></div>
          ${e.criteria.map((criterion,i)=>`<fieldset class="criterion-check"><legend>${i+1}. ${esc(criterion.textSnapshot)} <span class="pill">v${criterion.version}</span></legend>
            <div class="field"><label>Human assessment</label><select name="status_${i}" class="select">${statuses.map(([key,title])=>`<option value="${key}">${title}</option>`).join('')}</select></div>
            <div class="field" style="margin-top:10px"><label>Verbatim excerpt, required for Included</label><textarea class="textarea" rows="2" name="excerpt_${i}" maxlength="700" style="min-height:65px" placeholder="Copy exact words from the saved response"></textarea></div>
            <div class="field" style="margin-top:10px"><label>Explanation, required for a missing or uncertain criterion</label><textarea class="textarea" rows="2" name="rationale_${i}" maxlength="1200" style="min-height:65px" placeholder="Explain which evidence or reasoning is missing or unclear"></textarea></div></fieldset>`).join('')}
          <div class="field"><label>Review note (optional)</label><textarea class="textarea" rows="2" name="note" maxlength="3000" style="min-height:65px"></textarea></div>
          ${slot==='B'?'<label class="checkline"><input type="checkbox" name="differentPerson" value="yes" required/>I am a different person from Reviewer A.</label><label class="checkline"><input type="checkbox" name="noPriorJudgments" value="yes" required/>I have not seen A’s judgments or evidence before assessing the answer.</label>':''}
          <label class="checkline"><input type="checkbox" name="confirmed" value="yes" required/>I personally assessed this answer; this is not automatic grading.</label>
          <div class="btnrow"><button class="btn primary" type="submit">Save Reviewer ${slot}'s judgment</button><button type="button" class="btn secondary" data-action="close-pair-review">Cancel</button></div>
        </form>
        <p class="info">Original judgments cannot be overwritten. The interface can hide earlier decisions but cannot prove genuine independent assessment.</p>
      </div></div>`;
    }
    const latest=p.adjudications.at(-1);
    return `<div class="modalwrap"><div class="modal" role="dialog" aria-modal="true" aria-label="Compare independent reviewer judgments" style="width:min(850px,100%)">${top}
      <div class="grid cols3" style="margin:14px 0">
        ${metric('Decisive agreements',c.agreements,'Same included/gap judgment',esc)}
        ${metric('Decisive disagreements',c.disagreements,'Included versus gap',esc)}
        ${metric('Non-comparable',c.uncertainOrUnassessed,'Uncertain or not assessed',esc)}
      </div>
      ${c.rows.map(row=>`<div class="criterion-check"><strong>${esc(row.text)}</strong><p class="small muted">${row.comparable?(row.agree?'Decisive agreement':'Decisive disagreement'):'Not both decisive'}</p>
        <div class="grid cols2" style="margin-top:8px">
          <div class="note"><strong>A: ${esc(label(row.A.status))}</strong><p class="small">${esc(row.A.excerpt||row.A.rationale||'No evidence given')}</p></div>
          <div class="note"><strong>B: ${esc(label(row.B.status))}</strong><p class="small">${esc(row.B.excerpt||row.B.rationale||'No evidence given')}</p></div>
        </div></div>`).join('')}
      ${c.differences.length?`<form data-form="save-pair-adjudication" class="stack" style="margin-top:15px">
        <h3>Reconcile disputed criteria</h3><input type="hidden" name="attemptId" value="${esc(a.id)}"/>
        <p class="small muted">A person must choose a documented resolution or mark the disagreement unresolved. This does not establish a verified grade. Every amendment appends a new adjudication record.</p>
        ${c.differences.map((row,i)=>{const previous=latest?.decisions[i];return `<div class="criterion-check"><strong>${esc(row.text)}</strong><p class="small muted">A: ${esc(label(row.A.status))} · B: ${esc(label(row.B.status))}</p>
          <div class="field"><label>Reconciliation decision</label><select name="resolution_${i}" class="select">
            ${[['unresolved','Unresolved'],['included','Included'],['not_demonstrated','Not demonstrated']].map(([value,title])=>`<option value="${value}" ${(previous?.resolution||'unresolved')===value?'selected':''}>${title}</option>`).join('')}
          </select></div><div class="field" style="margin-top:8px"><label>Reason (required)</label><textarea name="reason_${i}" class="textarea" maxlength="1200" rows="2" style="min-height:65px">${esc(previous?.reason||'')}</textarea></div></div>`;}).join('')}
        <div class="field"><label>Adjudicator role</label><select name="adjudicatorRole" class="select"><option value="self">Learner</option><option value="other_person">Another person</option></select></div>
        <div class="field"><label>Additional note (optional)</label><textarea name="note" class="textarea" rows="2" maxlength="3000" style="min-height:65px">${esc(latest?.note||'')}</textarea></div>
        <label class="checkline"><input type="checkbox" name="confirmed" value="yes" required/>A person considered these disagreements; no automatic semantic grading was used.</label>
        <button class="btn primary" type="submit">${latest?'Append adjudication revision':'Save reconciliation'}</button>
      </form>`:'<p class="note" style="margin-top:13px">The two reviewers selected identical statuses for every criterion. There is no disagreement to reconcile; agreement alone does not establish correctness.</p>'}
      ${p.adjudications.length?`<details class="document-outline" style="margin-top:15px"><summary><strong>Earlier adjudications (unaltered)</strong> · ${p.adjudications.length}</summary>
        ${p.adjudications.map(d=>`<div class="criterion-check"><strong>Adjudication ${d.revision} · ${new Date(d.recordedAt).toLocaleString()}</strong>${d.decisions.map(x=>`<p class="small">${esc(x.textSnapshot)}: ${esc(x.resolution)} — ${esc(x.reason)}</p>`).join('')}</div>`).join('')}
      </details>`:''}
      <p class="info" style="margin-top:12px">No review, adjudication or agreement statistic affects scheduling. Reviewer identity, independence and expertise are self-reported and unverified.</p>
      <button class="btn secondary" type="button" data-action="close-pair-review">Close comparison</button>
    </div></div>`;
  }
  return {panel,modal};
});
