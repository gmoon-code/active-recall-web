/* v4.3: owner-side request and response controls, no network. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ActiveRecallReviewPacketUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const R=(typeof module!=='undefined'&&module.exports)?require('./review-packets.js'):globalThis.ActiveRecallReviewPackets;
 const H=(typeof module!=='undefined'&&module.exports)?require('./human-review.js'):globalThis.ActiveRecallHumanReview;
 function panel({db,esc,courseName}){
  const recent=db.attempts.slice().reverse().filter(a=>
    (a.activityKind==='explain'||a.activityKind==='apply')&&a.inputMode==='written'&&a.response?.trim()).slice(0,24);
  const active=recent.filter(a=>!!R.activeRequest(a)).length;
  const imported=db.attempts.reduce((n,a)=>n+[a.independentReviewPair?.A,a.independentReviewPair?.B].filter(x=>x?.offlinePacket).length,0);
  return `<section class="section"><div class="card"><div class="card-title"><h2>Offline reviewer packets</h2><span class="pill blue">Portable · browser-local</span></div>
    <p class="small muted">Share a single-answer review-request JSON and a standalone, downloadable reviewer HTML page with each of two people. The page works from a file offline, without an account. They independently return completed JSON responses. Import <strong>A first, then B</strong>; matching original evidence, rubric versions and request IDs are checked. No complete learning database is shared.</p>
    <p class="info"><strong>Privacy:</strong> The request contains the selected learner-written answer, reference answer and historical rubric. Send it only to trusted people after checking the contents. Completed reviews include quoted excerpts and rationale. Sharing files using a third-party service exposes them to that service; the app itself sends no files or data over the network.</p>
    <div class="btnrow" style="margin:15px 0">
      <a class="btn secondary" href="./reviewer-offline.html" download="active-recall-offline-reviewer.html">↓ Download standalone reviewer page</a>
      <a class="btn secondary" href="./reviewer-offline.html" target="_blank" rel="noopener noreferrer">Open reviewer page ↗</a>
    </div>
    <p class="small muted">${active} active request(s) among recent written responses · ${imported} imported independent assessment(s).</p>
    <div class="field"><label for="offline-review-response-file">Import a completed reviewer-response JSON</label>
      <input id="offline-review-response-file" class="input" type="file" accept=".json,application/json"/>
      <small>Import A before B. Duplicate, revoked, unmatched and malformed reviewer responses are rejected without replacing existing judgments.</small>
    </div>
    <details class="document-outline" style="margin-top:16px"><summary><strong>Create or re-download a request for one saved answer</strong> <span class="small muted">${recent.length} recent written explanations</span></summary>
      ${recent.length?recent.map(a=>{const eligible=H.eligibility(a),request=R.activeRequest(a),complete=!!a.independentReviewPair?.B;
        return `<div class="listrow"><div class="rowbody"><strong>${esc(a.questionSnapshot)}</strong>
          <small>${esc(courseName(a.courseId))} · ${new Date(a.createdAt).toLocaleDateString()} · ${complete?'Two original reviews already saved':request?'Request '+esc(request.id.slice(0,8))+'… active':'No active request'}</small>
          ${!eligible.ok?`<p class="small warningtext">${esc(eligible.reason)}</p>`:''}</div>
          <div class="btnrow">
            <button type="button" class="btn small secondary" data-action="export-offline-review-request" data-id="${esc(a.id)}" ${!eligible.ok||complete?'disabled':''}>${request?'Re-download request':'Export request'}</button>
            ${request?`<button type="button" class="btn small secondary" data-action="revoke-offline-review-request" data-id="${esc(a.id)}">Revoke</button>`:''}
          </div></div>`;}).join(''):'<p class="small muted">Save a written explanation with a verified rubric to create a packet.</p>'}
    </details>
    <p class="small muted" style="margin-top:13px">The random request ID binds an import to the issuing browser record; it is not a reviewer signature or proof of identity. Revocation blocks future responses but does not delete already imported evidence. Neither import nor adjudication changes the study calendar.</p>
  </div></section>`;
 }
 return {panel};
});
