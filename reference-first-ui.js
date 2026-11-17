/* Active Recall v4.4 owner-side interface for reference-free first and post responses. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallReferenceFirstUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const F=(typeof module!=='undefined'&&module.exports)?require('./reference-first.js'):globalThis.ActiveRecallReferenceFirst;
 const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
 const fmt=x=>x===null||x===undefined?'—':String(x);
 function panel({db,esc,courseName}){
  const rows=db.attempts.slice().reverse().filter(a=>
    ['explain','apply'].includes(a.activityKind)&&a.inputMode==='written'&&a.response?.trim()).slice(0,24);
  const a=F.audit(db);
  return `<section class="section"><div class="card">
    <div class="card-title"><h2>Reference-free first-pass review</h2><span class="pill blue">Versioned · separate files</span></div>
    <p class="small muted">Reviewers first assess the <strong>original written response without receiving the saved reference answer</strong>. They return a locked first-pass JSON. Only after <strong>both A and B's locked first passes</strong> have been imported does this browser allow you to export each reviewer's <strong>separate reference reveal</strong>. After reading it, the reviewer may submit an optional second judgment. The first pass and any A/B disagreement history remain unchanged.</p>
    <p class="info">The original rubric itself describes expected elements, so this is <strong>reference-answer withheld</strong>, not content-blind assessment. No software can verify that reviewers have not seen the reference elsewhere. Files may contain the learner's writing or quotations; only share with trusted people, not identifiable student records.</p>
    <div class="btnrow" style="margin:12px 0">
      <a class="btn secondary" href="./reference-reviewer-offline.html" download="active-recall-reference-free-reviewer.html">↓ Download reference-free reviewer page</a>
      <a class="btn secondary" href="./reference-reviewer-offline.html" target="_blank" rel="noopener noreferrer">Open reference-free reviewer page ↗</a>
    </div>
    <div class="grid cols3" style="margin:12px 0">
      <div class="card slim"><div class="metric-label">Attempts with first-pass review</div><div class="metric">${a.attempts}</div><div class="metric-note">Human judgments · not verified grades</div></div>
      <div class="card slim"><div class="metric-label">Completed A/B pairs</div><div class="metric">${a.paired}</div><div class="metric-note">Compare original pre-reference judgments</div></div>
      <div class="card slim"><div class="metric-label">Post-reference reviews</div><div class="metric">${a.posts}</div><div class="metric-note">Separate human judgments</div></div>
    </div>
    <p class="small muted">${a.changed} decisive criterion status changes · ${a.unchanged} decisive statuses unchanged · ${a.nondecisive} nondecisive/uncertain pairs. These are descriptive observations, not correctness measures.</p>
    <div class="field"><label for="reference-first-import">Import a locked first-pass response JSON (A first, then B)</label>
      <input id="reference-first-import" type="file" accept=".json,application/json" />
    </div>
    <div class="field" style="margin-top:12px"><label for="reference-post-import">Import an optional post-reference response JSON</label>
      <input id="reference-post-import" type="file" accept=".json,application/json" />
    </div>
    <details class="document-outline" style="margin-top:16px"><summary><strong>Export reference-free request and release later references</strong> <span class="small muted">${rows.length} saved explanations</span></summary>
      <p class="small muted" style="margin:12px 0">First send the <strong>reference-free request</strong> and the standalone page. Receive and import both A and B's initial files before any reveal buttons become available. Then send each person's bound reference file privately; the initial labels remain preserved.</p>
      ${rows.length?rows.map(x=>{const ready=H.eligibility(x),rec=F.activeRequest(x),pair=x.independentReviewPair,firstA=!!pair?.A?.referenceFirstPass,firstB=!!pair?.B?.referenceFirstPass;
        const old=!!pair?.A&&!firstA,post=x.referencePostReviews||[];
        return `<div class="listrow"><div class="rowbody"><strong>${esc(x.questionSnapshot)}</strong>
          <small>${esc(courseName(x.courseId))} · ${new Date(x.createdAt).toLocaleDateString()} · ${firstA?'A locked':'A pending'} · ${firstB?'B locked':'B pending'} · ${post.length} post-reference</small>
          ${!ready.ok?`<p class="small warningtext">${esc(ready.reason)}</p>`:''}
          ${old?'<p class="small muted">Earlier review already exists; choose a different attempt for reference-free collection.</p>':''}
          </div><div class="btnrow">
            <button class="btn small secondary" type="button" data-action="export-reference-first-request" data-id="${esc(x.id)}" ${!ready.ok||!!pair?.A?'disabled':''}>${rec?'Re-download first request':'Export reference-free request'}</button>
            ${rec&&!firstA?`<button class="btn small secondary" type="button" data-action="revoke-reference-first-request" data-id="${esc(x.id)}">Revoke</button>`:''}
            ${firstA&&firstB?`<button class="btn small secondary" type="button" data-action="export-reference-reveal" data-id="${esc(x.id)}" data-slot="A">Export A reference</button>`:''}
            ${firstA&&firstB?`<button class="btn small secondary" type="button" data-action="export-reference-reveal" data-id="${esc(x.id)}" data-slot="B">Export B reference</button>`:''}
          </div></div>`;}).join(''):'<p class="small muted">Save a written explanation/application with original verified rubric first.</p>'}
    </details>
    <p class="small muted" style="margin-top:12px">${esc(a.warning)}</p>
  </div></section>`;
 }
 return {panel};
});
