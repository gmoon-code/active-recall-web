/* Blueprint 1.6: deterministic, inspectable, no-network learning intelligence.
 * Not generative AI: all candidate answers quote the learner's own source.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ActiveRecallIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STOP = new Set(('the a an and or but to for with without of in on at by from as is are was were be been being can could should would may might will that this those these it its their when where which how why what who about into through during using use does do did have has had does than then between across under over including especially during if we they you our your').split(' '));
  const words = (value) => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const norm = (value) => words(value).join(' ');
  function similarity(a, b) {
    const aa = new Set(words(a)), bb = new Set(words(b));
    if (!aa.size || !bb.size) return 0;
    let intersection = 0;
    for (const w of aa) if (bb.has(w)) intersection++;
    return intersection / (aa.size + bb.size - intersection);
  }
  const stripEnd = (s) => String(s).replace(/[.!?\s]+$/g, '').trim();
  const cleanLead = (s) => stripEnd(s.replace(/^(?:in today's lecture,?\s*|today we (?:learned|covered) (?:that\s+|about\s+)?|we learned (?:that\s+|about\s+)?|i learned (?:that\s+|about\s+)?)/i, '').trim());
  const embedded = s => /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase()+s.slice(1) : s;

  function segments(text) {
    const source = String(text || '').replace(/\r\n?/g, '\n');
    const result = [];
    let offset = 0;
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const heading = /^#{1,5}\s+/.test(trimmed);
      const cleaned = trimmed.replace(/^(?:[-*•]\s+|\d+[.)]\s+|#{1,5}\s+)/, '').trim();
      if (cleaned.length >= 18 && !heading) {
        // Split natural sentence boundaries, but not numeric decimal points.
        const pieces = cleaned.split(/(?<=[.!?。！？])\s+(?=[\p{L}\p{N}“"(])/u);
        for (let piece of pieces) {
          piece = piece.trim();
          if (piece.length < 18) continue;
          const pos = source.indexOf(piece, offset);
          result.push({ text: piece, start: pos < 0 ? null : pos, end: pos < 0 ? null : pos + piece.length });
        }
      }
      offset += line.length + 1;
    }
    // One-line lowercase sentences may not be separated; these remain one source-backed draft.
    return result;
  }

  function parseStatement(raw) {
    const s = cleanLead(raw);
    let m;
    // Do not misparse negated statements as affirmative causal relationships.
    if (/\b(?:do|does|did|is|are|will|can|must)\s+not\b|\bnever\b|\bno\s+\w+/i.test(s)) {
      const topic = words(s).slice(0,5).join(' ');
      return {question:`What does the note claim about ${topic || 'this topic'}?`,kind:'explain',objective:'Explain or evaluate a potentially negated claim',confidence:'review',format:'negated_claim'};
    }
    // A structured term: explanation; exclude full-clause headings.
    if ((m = s.match(/^([^:;]{3,85}):\s*(.{8,})$/)) && !m[1].includes('?')) {
      return { question: `Explain ${stripEnd(m[1])}.`, kind: 'explain', objective: `Explain ${stripEnd(m[1])}`, confidence: 'structured', format: 'term_definition' };
    }
    if ((m = s.match(/^(.{4,75}?)\s+(?:is defined as|refers to|means)\s+(.{8,})$/i))) {
      return { question: `What does ${embedded(stripEnd(m[1]))} mean?`, kind: 'recall', objective: `Define ${stripEnd(m[1])}`, confidence: 'structured', format: 'definition' };
    }
    if ((m = s.match(/^(.{4,75}?)\s+(is|are)\s+(.{8,})$/i))) {
      return { question: `What ${m[2].toLowerCase()} ${embedded(stripEnd(m[1]))}?`, kind: 'recall', objective: `Describe ${stripEnd(m[1])}`, confidence: 'structured', format: 'definition' };
    }
    if ((m = s.match(/^(.{5,95}?)\s+(?:comes? from|originates? from|is derived from|are derived from)\s+(.{5,})$/i))) {
      return { question: `What is the source of ${embedded(stripEnd(m[1]))}?`, kind: 'recall', objective: `Identify the source of ${stripEnd(m[1])}`, confidence: 'structured', format: 'source_relationship' };
    }
    if ((m = s.match(/^(.{4,100}?)\s+(increases?|decreases?|lowers?|raises?|reduces?|stabilises?|stabilizes?|inhibits?|promotes?)\s+(.{5,})$/i))) {
      return { question: `How ${m[2].toLowerCase().endsWith('s') ? 'does' : 'do'} ${embedded(stripEnd(m[1]))} ${m[2].toLowerCase().replace(/s$/,'')} ${stripEnd(m[3]).split(/\s+by\s+/i)[0]}?`, kind: 'explain', objective: `Explain the effect of ${stripEnd(m[1])}`, confidence: 'structured', format: 'causal_effect' };
    }
    if ((m = s.match(/^(.{5,110}?)\s+(?:because|since|due to)\s+(.{8,})$/i))) {
      return { question: `Why does the following occur: ${stripEnd(m[1])}?`, kind: 'explain', objective: `Explain why ${stripEnd(m[1])}`, confidence: 'structured', format: 'cause' };
    }
    if ((m = s.match(/^(.{4,85}?)\s+(?:affects?|influences?|changes?)\s+(.{5,})$/i))) {
      return { question: `What relationship between ${embedded(stripEnd(m[1]))} and ${stripEnd(m[2])} is described in your notes?`, kind: 'explain', objective: `Describe the relationship involving ${stripEnd(m[1])}`, confidence: 'review', format: 'underspecified_relationship' };
    }
    const phrase = words(s).slice(0,4).join(' ');
    return { question: `Explain the main idea in this part of your notes${phrase ? ` (topic: ${phrase})` : ''}.`, kind: 'explain', objective: `Explain a statement from the notes`, confidence: 'review', format: 'general' };
  }

  function analyzeNotes(content, existing = [], courseId = null, limit = 12) {
    const parsed = segments(String(content || '').slice(0, 20000));
    const result = [], duplicates = [], conflicts = [];
    const seen = new Set();
    for (const chunk of parsed) {
      const answer = chunk.text;
      const signature = norm(answer);
      if (!signature || seen.has(signature)) continue;
      seen.add(signature);
      const match = existing.filter(r => r.active !== false && (!courseId || r.courseId === courseId))
        .map(r => ({ r, similarity: similarity(answer, r.sourceQuote || r.answer) }))
        .sort((a,b) => b.similarity - a.similarity)[0];
      const conflict = match && match.similarity >= 0.62 &&
        /\b(?:not|never|no)\b/i.test(answer) !== /\b(?:not|never|no)\b/i.test(match.r.sourceQuote || match.r.answer);
      if (conflict) conflicts.push({existingRequirementId:match.r.id,quote:answer,similarity:match.similarity});
      if (!conflict && match && match.similarity >= 0.94) {
        duplicates.push({existingRequirementId:match.r.id, quote:answer, similarity:match.similarity});
        continue;
      }
      const detail = parseStatement(answer);
      const candidate = {
        ...detail, answer, sourceQuote:answer, sourceStart:chunk.start, sourceEnd:chunk.end,
        origin:'rule_draft', confidence:detail.confidence,
        possibleDuplicateOf:!conflict && match && match.similarity >= 0.60 ? match.r.id : null,
        possibleConflictWith:conflict ? match.r.id : null
      };
      if (candidate.possibleDuplicateOf || candidate.possibleConflictWith) candidate.confidence = 'review';
      result.push(candidate);
      if (result.length >= Math.max(1,Math.min(30,limit))) break;
    }
    return {drafts:result, duplicates, conflicts, ignored:Math.max(0,parsed.length-result.length-duplicates.length), engine:'offline-rules-v1'};
  }
  // Conservative *suggestions*, not verified instructional objectives or AI grades.
  // Each point quotes an exact span from the learner's material for auditability.
  function suggestCriteria(text, limit = 5) {
    const raw = String(text || '').slice(0, 20000);
    const cap = Math.max(1, Math.min(8, Number(limit) || 5));
    const result = [], seen = new Set();
    for (const section of segments(raw)) {
      const full = section.text.trim();
      let pieces = [];
      // Distinguish a claimed effect from a claimed mechanism, or an outcome
      // from its stated cause. Do not split the word 'and' within noun phrases.
      const marker = /\s+(by|because|due to|whereas)\s+/i.exec(full);
      if (marker) {
        const left = full.slice(0, marker.index).trim();
        const right = full.slice(marker.index + marker[0].length).trim();
        if (left.length >= 14 && right.length >= 14 && left.length <= 200 && right.length <= 200) {
          pieces = [{quote:left,tag:'Claim'}, {quote:right,tag:marker[1].toLowerCase()==='by'?'Proposed mechanism':'Stated explanation'}];
        }
      }
      if (!pieces.length && full.length >= 22 && full.length <= 210) pieces = [{quote:full,tag:'Source statement'}];
      for (const piece of pieces) {
        const quote = piece.quote.replace(/[.!?。！？]+$/u,'').trim();
        if (quote.length < 12) continue;
        const key = norm(quote);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const index = raw.indexOf(piece.quote, Math.max(0,section.start || 0));
        if (index < 0) continue; // Never fabricate provenance when an exact quote cannot be located.
        result.push({
          text: `${piece.tag}: ${quote}`.slice(0,240),
          sourceQuote:piece.quote,
          sourceStart:index, sourceEnd:index+piece.quote.length,
          origin:'offline_criterion_draft',confidence:'review',rule:marker?'relationship_split':'source_statement'
        });
        if (result.length >= cap) return result;
      }
    }
    return result;
  }
  function integrity(db) {
    const active = (db.requirements || []).filter(x => x.active !== false);
    const drafts = active.filter(r => r.origin === 'rule_draft' && !(r.verifiedAt || r.reviewedAt));
    const weak = drafts.filter(r => r.confidence === 'review');
    const similar = active.filter(r => r.possibleDuplicateOf && active.some(x => x.id === r.possibleDuplicateOf));
    const conflicts = active.filter(r => r.possibleConflictWith && active.some(x => x.id === r.possibleConflictWith));
    const missing = active.filter(r => r.sourceId && !(db.sources || []).some(s=>s.id===r.sourceId));
    const sourceDuplicates=(db.sources || []).reduce((n,s)=>n+(s.duplicateLinks?.length||0),0);
    return {drafts:drafts.length,needsReview:weak.length,possibleDuplicates:similar.length,possibleConflicts:conflicts.length,brokenLinks:missing.length,linkedRepeats:sourceDuplicates};
  }
  return {words, norm, similarity, segments, parseStatement, analyzeNotes, suggestCriteria, integrity};
});
