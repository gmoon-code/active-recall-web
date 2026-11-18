# Blueprint 4.8 — Source-grounded question and reference-answer quality

**Date:** 18 November 2026. **Platform:** free GitHub Pages; static, offline-capable JavaScript; browser-local learning data. **Storage:** existing schema v5, no mandatory new fields or migration. **Active interval policy and review calendar:** unchanged.

## Problem and focused scope

The existing Rule Studio, Question Studio and source audit preserve original text and propose recall questions from explicit English patterns. However, grammatical proposals and source excerpts do not establish whether a question asks a coherent, standalone learning target or whether the answer is scientifically accurate and sufficient. Previous research reviewed in `RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md` emphasises the importance of valid learning targets, adequate feedback, and spacing, but does not justify automatic semantic assessment by this deterministic prototype.

v4.8 improves the **human decision workflow** without falsely claiming a meaning-understanding model. It does not replace the scheduling algorithm, build a retrieval-probability predictor, add multiple-choice distractors, or change any review date.

## Question-generation improvement

`intelligence.questionProposals()` now handles two explicit qualification patterns **before** the broad effect/cause templates:

- A statement of `X only if/when Y` becomes a question about the **necessary** condition for `X`, not a claim that `Y` is sufficient for `X`.
- A statement of `X unless Y` becomes a question asking about the **stated exception**, not an invented counterfactual.

Both retain the verbatim source quote and character offsets; these are rule-based suggestions only. They can fail with complicated grammar, nested conditions, unusual terminology, logical scopes, or long documents. Other note structures, unsupported mathematical reasoning, visual PDF content and nuanced semantic connections must still be authored or verified by a person.

## Non-semantic quality audit

The new `questionQualityAudit` returns structural *review prompts*, not a grade or proof of truth:

1. Existing generic, context-dependent, excessive-length, answer-exposure, stale-source, missing-source, possible-duplicate and suspected-contradiction warnings.
2. A long reference-answer flag, so the person can identify essential claims or rubric checkpoints.
3. A warning when a common qualification marker occurs in the exact source quotation but disappears from a nonverbatim answer. Paraphrases may preserve meaning without identical words, so this is deliberately a **check**, not a verdict.
4. A source-paraphrase check when the edited answer does not literally occur within the cited evidence; valid paraphrases are permitted.
5. An optional warning for an explanation without active verified criteria, and a warning when its linked imported PDF contains known missing-text pages.

No warning-free result validates scientific truth, curriculum completeness, answer sufficiency, fairness, successful retrieval, or readiness for an assessment. Original exact quotes can themselves be factually wrong or misleading. The learner is responsible for resolving problems, ideally with a textbook, instructor, or other dependable source.

## Human quality confirmation

The Knowledge tab exposes **Q&A quality** beside each active learning requirement. The previous direct **Verify** action for an unverified generated question now opens the same review panel. The panel displays the current question, reference answer and linked source excerpt. Before confirming, the learner must check all four statements:

1. The question stands alone and represents one coherent learning target.
2. The reference is scientifically accurate and supported by the source or separately checked material.
3. The reference preserves conditions, exceptions, units and causal links.
4. The answer is sufficient for self-checking, accounting for alternatives and explanation criteria.

On submission, the app re-derives the audit from the currently saved record, verifies the four acknowledgments, and rejects a missing or no-longer-matching linked excerpt. For a draft, it then calls the existing verification method; for an already verified question, it leaves the verification date unchanged. It appends `question_quality.reviewed` with the question version, source version, checklist version 1, explicit confirmation and local timestamp. A subsequent question/source revision removes the **current-review** indicator without erasing the earlier event.

The event is locally editable and **not** cryptographic proof of review, competence, accuracy or timing. The app cannot verify that the person read the source or correctly interpreted the science. Manual questions without a source link can be reviewed, but the interface explicitly says their content must be independently verified.

## Compatibility and constraints

- No account, upload, paid API, cloud inference, external service or data collection.
- Source notes, historical answers, literal keys, manual review history, prototype pilot records, memory intervals and scheduled due dates are not rewritten.
- Backup validation accepts older schema-v5 data and checks the structure of new quality-review events; malformed or nonexisting requirement versions are rejected. The event validation prevents accidental malformed imports, **not determined tampering**.
- Editing an **unverified or source-stale rule-generated draft** retains draft status, even after its wording improves. It cannot enter study merely because the editor saved it. Already verified questions and manually authored questions retain their pre-existing editing workflow; a new quality review is optional for them.
- Source-backed draft suggestions and typed answer alternatives remain editable. No automated correctness, semantic similarity grading, mastery percentages or retention forecasts are produced.

## Evaluation before further changes

The 15 new Node tests cover necessary conditions and exceptions, original quote offsets, qualifier and paraphrase warnings, mandatory human checks, editing a pending draft without bypassing verification, current/versioned review indicators, source-revision refusal and source-preserving reapproval, preserved due dates and attempts, schema-v5 compatibility and malformed review-event rejection.

The new browser workflow covers the Knowledge tab’s real four-checkbox confirmation, persistence and restored review status, unchanged scheduled dates and a mobile-width dialog. The existing seven browser workflows remain part of CI; do not report them as passed until that workflow actually succeeds on the feature branch and deployed main.

For a more rigorous future evaluation, ask human reviewers to judge a fixed note corpus using clear categories (specificity, source support, answer completeness, stand-alone usability, qualifier preservation, ambiguity) and report disagreements and missing judgments. Do not infer that fewer structural warnings establish higher educational effectiveness.

## Next scope — v4.9

Introduce a **read-only science-informed scheduling comparison**: distinguish recognition/assisted study from independent retrieval, compare existing due windows with a transparent alternative under real calendar capacity and assessments, preserve all original dates, and measure workload/overdue pressure without fabricating learning outcomes. The prototype multiplier coefficients must remain labelled heuristics. Later, only prospective delayed independently assessed evidence can support a claim that one policy improves retention.

[Research baseline](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md) · [Previous Blueprint 4.7](BLUEPRINT_4_7_FREE.md)
