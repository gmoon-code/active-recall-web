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
  const words = (value) => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(w => !STOP.has(w) && (w.length > 2 || /\d/.test(w) || w === 'ph'));
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
  // Rubric candidates are fragments quoted from the learner's saved text, not
  // independently verified statements or semantic claims about the source.
  // Qualifiers stay attached whenever separating them could reverse the claim.
  function suggestCriteria(text, limit = 5) {
    const raw=String(text||'').slice(0,20000);
    const cap=Math.max(1,Math.min(16,Math.floor(Number(limit)||5)));
    const result=[],seen=new Set();
    for(const section of segments(raw)){
      const full=section.text.trim();
      let pieces=[];
      const conditional=full.match(/^(if|when|provided that)\s+(.{9,160}?)\s*(,\s*|\s+then\s+)(.{12,180})$/i);
      const contrast=full.match(/^(.{14,180}?)\s+(whereas|in contrast to)\s+(.{14,180})$/i);
      const causal=/\s+(by|because|due to)\s+/i.exec(full);
      const qualification=/\b(?:only if|unless|except when|except for|provided that)\b/i.test(full);
      if(conditional && !/\b(?:only if|unless)\b/i.test(full)){
        // The 'if/when' clause describes the stated scope, not a causal proof.
        pieces=[{quote:full.slice(0,conditional[0].length-conditional[4].length-conditional[3].length).trim(),tag:'Stated condition',type:'condition',rule:'conditional_pair'},
                {quote:conditional[4].trim(),tag:'Outcome under that condition',type:'outcome',rule:'conditional_pair'}];
      }else if(contrast && !qualification){
        pieces=[{quote:contrast[1].trim(),tag:'First side of contrast',type:'contrast',rule:'contrast_pair'},
                {quote:contrast[3].trim(),tag:'Other side of contrast',type:'contrast',rule:'contrast_pair'}];
      }else if(causal && !qualification){
        const left=full.slice(0,causal.index).trim();
        const right=full.slice(causal.index+causal[0].length).trim();
        if(left.length>=14 && right.length>=14 && left.length<=210 && right.length<=210)
          pieces=[{quote:left,tag:'Claim / observed effect',type:'effect',rule:'relationship_split'},
                  {quote:right,tag:causal[1].toLowerCase()==='by'?'Proposed mechanism':'Stated explanation',type:causal[1].toLowerCase()==='by'?'mechanism':'explanation',rule:'relationship_split'}];
      }
      if(!pieces.length&&qualification&&full.length>=22&&full.length<=225)
        pieces=[{quote:full,tag:'Boundary or qualification',type:'qualification',rule:'qualifier_intact'}];
      if(!pieces.length&&full.length>=22&&full.length<=225)
        pieces=[{quote:full,tag:'Source statement',type:'statement',rule:'source_statement'}];
      for(const piece of pieces){
        const quote=piece.rule==='source_statement'||piece.rule==='qualifier_intact'?piece.quote:piece.quote.replace(/[.!?。！？]+$/u,'').trim();
        if(quote.length<12)continue;
        const key=norm(quote);
        if(!key||seen.has(key))continue;
        const pos=raw.indexOf(quote,Math.max(0,section.start||0));
        if(pos<0)continue; // Never substitute invented or normalised text for an exact source excerpt.
        seen.add(key);
        result.push({text:`${piece.tag}: ${quote}`.slice(0,240),sourceQuote:quote,sourceStart:pos,sourceEnd:pos+quote.length,
          origin:'offline_criterion_draft',confidence:'review',rule:piece.rule,type:piece.type});
        if(result.length>=cap)return result;
      }
    }
    return result;
  }
  // Review-only question proposals for patterns the learner's source explicitly states.
  // No outside scientific knowledge, unsupported counterfactuals, or invented answers.
  // Each proposal carries an exact substring and offsets; ambiguous prose is omitted.
  function questionProposals(text,{limit=36}={}) {
    const raw=String(text||'').slice(0,20000);
    const cap=Math.max(1,Math.min(240,Math.floor(Number(limit)||36)));
    const result=[], seen=new Set();
    const concise=v=>stripEnd(String(v||'').trim().replace(/\s+/g,' '));
    function emit(part,type,question,kind,objective){
      if(result.length>=cap)return;
      const quote=part.text;
      if(quote.length>900||part.start===null||part.start<0||raw.slice(part.start,part.end)!==quote)return;
      question=String(question||'').trim().replace(/\s+/g,' ');objective=concise(objective);
      if(question.length<14||question.length>450||!objective)return;
      let fingerprint=2166136261;for(const char of quote){fingerprint^=char.codePointAt(0);fingerprint=Math.imul(fingerprint,16777619)>>>0;}
      const key=`${part.start}:${part.end}:${type}:${fingerprint.toString(16)}`;
      if(seen.has(key))return;
      seen.add(key);
      result.push({key,sourceStart:part.start,sourceEnd:part.end,sourceQuote:quote,
        question,answer:quote,kind,objective,format:`studio_${type}`,structure:type,
        confidence:'review',origin:'rule_draft',
        notice:'Suggested from exact source wording. Review scientific accuracy, clarity and answer adequacy before approving.'});
    }
    const subject=chunk=>{let m=concise(chunk).match(/^(.{3,70}?)\s+(?:is|are|was|were|has|have|uses?|binds?|increases?|decreases?|causes?|inhibits?|contains?|produces?|remains?|can)\b/i);return m?concise(m[1]):null;};
    for(const part of segments(raw)){
      if(result.length>=cap)break;
      const s=cleanLead(part.text);if(s.length>840||s.length<18)continue;
      let m;
      // Handle exceptions and necessary conditions before causal/effect
      // templates, which could otherwise drop an important qualifier.
      if((m=s.match(/^(.{8,180}?)\s+only\s+(?:if|when)\s+(.{8,180})$/i))){
        emit(part,'necessary_condition',`What condition does the source state is necessary for ${concise(m[1])}?`,'explain',`Identify the stated necessary condition for ${concise(m[1]).slice(0,85)}`);continue;
      }
      if((m=s.match(/^(.{8,180}?)\s+unless\s+(.{8,180})$/i))){
        emit(part,'exception',`What stated exception limits this claim: ${concise(m[1])}?`,'explain',`Identify the stated exception for ${concise(m[1]).slice(0,85)}`);continue;
      }
      if((m=s.match(/^([^:;?]{3,75}):\s*(.{10,})$/))){
        emit(part,'term',`What does ${concise(m[1])} mean?`,'recall',`Define ${concise(m[1])}`);continue;
      }
      if((m=s.match(/^(.{3,75}?)\s+(?:is defined as|refers to|means)\s+(.{10,})$/i))){
        emit(part,'definition',`What is the meaning of ${concise(m[1])}, including its distinguishing features?`,'recall',`Define ${concise(m[1])}`);continue;
      }
      if((m=s.match(/^If\s+(.{6,160}?),\s*(?:then\s+)?(.{10,230})$/i))){
        emit(part,'condition',`Under what condition does the following outcome occur: ${concise(m[2])}?`,'explain',`Explain the condition associated with ${concise(m[2]).slice(0,80)}`);continue;
      }
      if((m=s.match(/^(?:At|Under)\s+(pH\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:°C|°F|K|mM|µM|uM|M|%)),\s*(.{10,230})$/i))){
        const measure=/^pH/i.test(m[1])?'pH':'measured condition';
        emit(part,'numeric_condition',`At what ${measure} does the following occur: ${concise(m[2])}?`,'recall',`Identify the ${measure} for ${concise(m[2]).slice(0,75)}`);continue;
      }
      if((m=s.match(/^(.{8,185}?)\s+(?:because|due to)\s+(.{12,230})$/i))){
        emit(part,'cause',`What explains this outcome: ${concise(m[1])}?`,'explain',`Explain the stated cause of ${concise(m[1]).slice(0,85)}`);continue;
      }
      if((m=s.match(/^(.{9,185}?)\s+by\s+(.{12,230})$/i))){
        emit(part,'mechanism',`What mechanism explains the following process or effect: ${concise(m[1])}?`,'explain',`Explain how ${concise(m[1]).slice(0,85)}`);continue;
      }
      if((m=s.match(/^(.{9,180}?)\s+(?:whereas|in contrast to)\s+(.{9,180})$/i))){
        const a=subject(m[1]),b=subject(m[2]);
        if(a&&b&&norm(a)!==norm(b))emit(part,'contrast',`How do ${embedded(a)} and ${embedded(b)} differ?`,'explain',`Distinguish ${a} from ${b}`);
        continue;
      }
      if((m=s.match(/^(.{3,85}?)\s+(requires?|depends? on)\s+(.{8,180})$/i))){
        const q=/^depend/i.test(m[2])?`Which factors does ${concise(m[1])} depend on?`:`What does ${concise(m[1])} require?`;
        emit(part,'dependency',q,'explain',`Explain the stated dependency for ${concise(m[1])}`);continue;
      }
      if((m=s.match(/^(.{4,110}?)\s+(?:results? in|leads? to)\s+(.{8,160})$/i))){
        emit(part,'consequence',`What outcome follows from ${concise(m[1])}?`,'explain',`Describe the stated consequence of ${concise(m[1])}`);continue;
      }
      if((m=s.match(/^(.{3,85}?)\s+(increases?|decreases?|reduces?|lowers?|raises?|inhibits?|promotes?|stabilises?|stabilizes?)\s+(.{5,140})$/i))){
        emit(part,'effect',`What effect does ${concise(m[1])} have on ${concise(m[3])}?`,'recall',`Describe the effect of ${concise(m[1])}`);
      }
    }
    return result;
  }
  // Reword ONE source-grounded question without creating a second skill target.
  // Only explicitly patterned English sources qualify. This is NOT a transfer
  // task generator, synonym model, source validator, or student performance model.
  function alternativeQuestionProposals(text,{limit=4}={}){
    const cap=Math.max(1,Math.min(8,Number(limit)||4));
    const proposals=questionProposals(text,{limit:36}),out=[],seen=new Set();
    for(const p of proposals){
      if(out.length>=cap)break;
      let q='';let m;
      if(p.structure==='term' && (m=p.question.match(/^What does (.+) mean\?$/)))q=`How would you define ${m[1]}?`;
      if(p.structure==='definition' && (m=p.question.match(/^What is the meaning of (.+), including its distinguishing features\?$/)))q=`How would you define ${m[1]}?`;
      if(p.structure==='cause' && (m=p.question.match(/^What explains this outcome: (.+)\?$/)))q=`What is the stated cause of ${m[1]}?`;
      if(p.structure==='mechanism' && (m=p.question.match(/^What mechanism explains the following process or effect: (.+)\?$/)))q=`How is ${m[1]} achieved? Explain the mechanism.`;
      if(p.structure==='contrast' && (m=p.question.match(/^How do (.+) and (.+) differ\?$/)))q=`What is an important difference between ${m[1]} and ${m[2]}?`;
      if(p.structure==='condition' && (m=cleanLead(p.sourceQuote).match(/^If\s+(.{6,160}?),\s*(?:then\s+)?(.{10,230})$/i)))q=`What outcome is described if ${stripEnd(m[1])}?`;
      if(p.structure==='numeric_condition' && (m=p.question.match(/^At what (pH|measured condition) does the following occur: (.+)\?$/)))q=`Which ${m[1]} is associated with ${m[2]}?`;
      if(p.structure==='effect' && (m=p.question.match(/^What effect does (.+) have on (.+)\?$/)))q=`Describe how ${m[1]} affects ${m[2]}.`;
      if(p.structure==='dependency' && (m=p.question.match(/^What does (.+) require\?$/)))q=`Identify what ${m[1]} requires.`;
      if(p.structure==='dependency' && (m=p.question.match(/^Which factors does (.+) depend on\?$/)))q=`Identify the factors affecting ${m[1]} as described in the notes.`;
      if(p.structure==='consequence' && (m=p.question.match(/^What outcome follows from (.+)\?$/)))q=`Describe the stated consequence of ${m[1]}.`;
      q=q.trim();
      if(q.length<14||q.length>500||q.toLowerCase()===p.question.toLowerCase())continue;
      const normalized=q.toLowerCase().replace(/\s+/g,' ');
      if(seen.has(normalized))continue;
      seen.add(normalized);
      let hash=2166136261;
      for(const char of q){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}
      out.push({...p,question:q,kind:p.kind,key:`${p.key}:alt:${hash.toString(16)}`,
        notice:'Alternative wording of the SAME source-backed recall target; inspect and confirm before saving. No new due date.'});
    }
    return out;
  }
  // Read-only coverage and wording inspection. These are structural warnings,
  // NOT a semantic validator, expert quality score, or syllabus coverage claim.
  function questionWarnings(requirement, source=null) {
    if(!requirement || requirement.active===false) return [];
    const q=String(requirement.question||'').trim(), a=String(requirement.answer||'').trim();
    const issues=[];
    if(requirement.origin==='rule_draft' && requirement.verificationStatus!=='verified')
      issues.push({code:'unverified',label:'Draft requires your verification'});
    if(/^(?:explain the main idea in this part of your notes|what does the note claim|explain a statement from the notes)/i.test(q)
       || requirement.format==='general')
      issues.push({code:'generic',label:'Too generic: specify the idea or relationship to retrieve'});
    if(/\b(?:this (?:note|passage|sentence)|the above|according to (?:these|the) notes|described in your notes)\b/i.test(q))
      issues.push({code:'context_dependent',label:'Question may be unclear without seeing the notes'});
    if(q.length>350)
      issues.push({code:'overlong',label:'Question may combine too many demands'});
    if(a.length>=32 && q.toLowerCase().includes(a.toLowerCase()))
      issues.push({code:'answer_leak',label:'Question appears to reveal the reference answer'});
    if(requirement.kind==='explain' && a.length<25)
      issues.push({code:'short_explanation',label:'Check whether the answer explains a relationship rather than names a fact'});
    if(requirement.possibleDuplicateOf)issues.push({code:'overlap',label:'Possible duplicate of another question'});
    if(requirement.possibleConflictWith)issues.push({code:'conflict',label:'Possible contradiction; compare both sources'});
    if(requirement.sourceRevisionPending)issues.push({code:'stale',label:'Source changed; verify the question and answer again'});
    if(requirement.sourceId && !source)issues.push({code:'missing_source',label:'Original linked source is missing'});
    else if(source && requirement.sourceQuote && !source.content.includes(requirement.sourceQuote))
      issues.push({code:'quote_mismatch',label:'Linked excerpt no longer matches the current source'});
    return issues;
  }
  // v4.8: A deliberately NON-SEMANTIC quality audit. Never present these
  // pattern warnings as scientific correctness judgments or numeric grades.
  // A learner must decide whether a question and its answer are adequate.
  function questionQualityAudit(requirement, source=null, criteria=[]) {
    if(!requirement||requirement.active===false)return {issues:[],checklist:[],currentReview:false};
    const q=String(requirement.question||'').trim(),answer=String(requirement.answer||'').trim();
    const evidence=String(requirement.sourceQuote||'');
    const issues=questionWarnings(requirement,source).slice();
    const add=(code,label)=>{if(!issues.some(i=>i.code===code))issues.push({code,label});};
    if(answer.length>500)add('long_reference','Long reference answer: identify the essential claims or checkpoints');
    if(/^(?:what|why|how)\s+(?:is|are|do|does|did|can|will)\s+(?:it|this|that|they)\b/i.test(q))
      add('ambiguous_pronoun','Question may lack the subject needed for standalone recall');
    if(evidence&&source&&source.content.includes(evidence)){
      // Literal markers indicate a human check is important; their absence
      // in a paraphrase is not proof of incorrectness.
      const qualifiers=['not','never','only','unless','except','without','provided that'];
      const missing=qualifiers.filter(w=>new RegExp('\\b'+w.replace(' ','\\s+')+'\\b','i').test(evidence)
        && !new RegExp('\\b'+w.replace(' ','\\s+')+'\\b','i').test(answer));
      if(missing.length)add('qualifier_check',`Check whether the reference preserves the source's qualification (${missing.join(', ')})`);
      if(evidence!==answer&&!evidence.includes(answer)&&!answer.includes(evidence))
        add('paraphrase_check','Reference is not a verbatim source excerpt; verify the paraphrase and omissions');
    }
    if(requirement.kind==='explain'&&!criteria.some(c=>c.active!==false&&!c.needsReview))
      add('rubric_check','Explanation has no active verified checkpoints; consider adding a mechanism or reasoning checklist');
    if(source?.importAudit?.missingPages?.length)
      add('pdf_gap','Imported PDF has pages without extracted text; check the original document for missing content');
    const checklist=[
      'The question is understandable without seeing the note and tests one coherent target.',
      'I checked that the reference is scientifically accurate and supported by the source or my own verified material.',
      'The reference preserves necessary conditions, exceptions, units and causal links.',
      'The answer is sufficient for self-checking; I considered valid alternatives and explanation criteria.'
    ];
    return {issues,checklist,sourceLinked:!!requirement.sourceId,
      sourceCurrent:!requirement.sourceId||!!(source&&(!evidence||source.content.includes(evidence))),
      warning:'Structural text checks only. No automatic semantic grading, scientific validation, or complete-coverage claim.'};
  }
  // Count traceable prose statements, never infer concept-level or exam coverage.
  // A source segment is represented only when a linked active requirement actually
  // includes its literal excerpt. Duplicates linked from prior sources do not
  // create fictional coverage for unrelated content.
  function questionCoverage(db, courseId) {
    const sources=(db.sources||[]).filter(s=>s.courseId===courseId);
    const requirements=(db.requirements||[]).filter(r=>r.active!==false && r.courseId===courseId);
    const flagged=requirements.map(req=>({requirementId:req.id,question:req.question,issues:questionWarnings(req,(db.sources||[]).find(s=>s.id===req.sourceId))})).filter(x=>x.issues.length);
    let totalSegments=0,represented=0,verified=0;
    const sourceRows=sources.map(source=>{
      const parsed=segments(String(source.content||'').slice(0,20000));
      const linked=requirements.filter(r=>r.sourceId===source.id||(r.additionalSourceIds||[]).includes(source.id));
      const uncovered=[];let mapped=0,verifiedSegments=0;
      for(const part of parsed){
        // Use exact text identity, NOT bag-of-words similarity. Distinct
        // numerical conditions can normalize to the same token set; treating
        // them as covered by one vague question would be misleading.
        const excerpt=part.text.replace(/\s+/g,' ').trim();
        const matches=linked.filter(r=>{
          const quote=String(r.sourceQuote||'').replace(/\s+/g,' ').trim();
          return !!quote && quote===excerpt;
        });
        if(matches.length){mapped++;if(matches.some(r=>r.verificationStatus==='verified'&&!r.sourceRevisionPending))verifiedSegments++;}
        else uncovered.push({text:part.text,start:part.start,end:part.end});
      }
      totalSegments+=parsed.length;represented+=mapped;verified+=verifiedSegments;
      return {sourceId:source.id,title:source.title,segments:parsed.length,represented:mapped,verified:verifiedSegments,unrepresented:parsed.length-mapped,examples:uncovered.slice(0,3),unrepresentedAll:uncovered.length};
    });
    return {courseId,totalSegments,represented,verified,unrepresented:totalSegments-represented,sourceRows,flagged,
      warning:'Coverage is of parseable source statements only. It is not proof of conceptual completeness, question correctness, or exam readiness.'};
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
  return {words, norm, similarity, segments, parseStatement, analyzeNotes, suggestCriteria, questionProposals, alternativeQuestionProposals, questionWarnings, questionQualityAudit, questionCoverage, integrity};
});
