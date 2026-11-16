# Blueprint 2.8 — Source-linked question quality review

**16 November 2026 · Active Recall Web · Zero-payment architecture**

## Scope and motivation
A scientifically grounded review calendar requires trustworthy recall tasks. The existing offline sentence-pattern generator could yield vague prompts and leave material uncaptured after its 12-draft-per-source limit. Quantity of questions is not evidence of conceptual completeness.

## Implemented
- An explicit read-only audit for the **parseable text statements** in each course's source materials: total, cited by a question, cited by a **learner-verified** question, or uncited. Unmapped examples link to the original source editor.
- Heuristic flags for generic prompts, context dependence, possible answer leakage, long questions, too-short explanation references, suspected duplicates/conflicts, and missing or revised citations. Review/edit buttons use the existing editor.
- Exact source-quote identity is required for mapped coverage; similar vocabulary does not automatically mean two concepts are covered by the same question.
- Distinct numerical and short scientific tokens are retained when screening for duplicate source sentences, reducing false merges for different numerical conditions.
- The existing verified-question gate and v2.7 rolling agenda remain unchanged; the audit does not alter historical learning evidence, due dates, question versions or browser storage.

## Limitations
This is a **structural review instrument, not automatic semantic validation**. Mapped source statements may still be poorly assessed. Equations, figures, PDF scans, procedural knowledge, multilingual content or implicit curriculum goals may not be identified. A warning-free prompt is not proof of educational quality; a verified draft is still a learner-reviewed item, not independent mastery evidence.

## Test status
161 automated tests passed, including the 149 earlier regression tests. Chromium desktop and mobile smoke tests covered source capture, unmapped excerpts, source editor navigation, draft verification and responsive layout with simulated storage. The database remains schema v5.

## Next
Design a source-grounded learning-objective engine: relationships, mechanisms, comparisons, constraints, quantitative distinctions, and transfer tasks with explicit answer components. Evaluate question suitability with expert-labelled examples and delayed learning outcomes before asserting quality or schedule superiority.

Academic evidence and engineering audit: [RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).
