# Blueprint 4.0 — Prospective literal-answer checking

**Release:** November 17, 2026 · **Hosting:** free GitHub Pages · **Data:** browser-local · **Schema:** v5 unchanged.

## Product purpose

Strengthen the evidence behind the automatic multi-course spaced review calendar without replacing its currently provisional interval algorithm. Historical self-ratings and rubric gaps alone were not objectively checkable outcomes. Version 4.0 introduces a deliberately narrow, reproducible matching result for learner-approved short factual answers. It does not establish independent scientific correctness or calibrated retention probabilities.

## Opt-in configuration and feedback

In Knowledge, select **Literal check** on a focus containing a recall-type question. Enter 1–5 short accepted answer strings for that individual question variation and explicitly confirm them. The app does not invent answer keys or approve them automatically. This is unsuitable for scientific explanations, transfer tasks, multi-step calculations or answers requiring semantic judgement.

Literal matching applies Unicode NFC, trims outer whitespace, collapses repeated whitespace and ignores letter case. It does **not** remove punctuation, convert units or formulae, accept unlisted synonyms, handle spelling mistakes, or infer paraphrase equivalence. A scientifically correct alternative may be labelled NO MATCH. A wrong approved key can cause an inaccurate MATCH. Learners must review the key carefully.

The reference answer and match status are hidden before the learner's attempt. After revealing the reference, the screen may show MATCH or NO MATCH. Assisted answers, oral/mental responses, empty written answers and unconfigured or stale keys receive no recorded literal-result snapshot. Immediate post-study attempts may record the literal result but are excluded from the delayed audit.

Each real attempt can store a literalCheck snapshot: method literal-match-v1, key version, accepted answer strings and matching result. Approved keys are tied to their requirement, recall focus, question activity and source versions. Edits require re-approval; past attempt snapshots remain unchanged. No extra retrieval target or review obligation is created.

## Delayed evidence audit

Progress includes **Delayed short-answer literal checks**, which looks at actual, written, unassisted recorded attempts at least 24 hours after the previous actual practice of the same requirement/target versions. Interim assisted practice resets the elapsed-time baseline. The first attempt on a target is not a delayed recheck. The panel reports eligible checks, distinct targets, match counts, timing groups and exclusions.

Suppress a displayed match percentage until 20 eligible checks and 10 distinct targets are available; these conservative thresholds are presentation safeguards, not statistical proof. A displayed percentage means literal agreement with approved keys, **not** actual academic grades, demonstrated conceptual understanding or calibrated probability of memory.

## Scheduling and data invariants

The existing transparent-interval-v1 active scheduler and conservative-shadow-v1 prospective hypothetical comparison remain unchanged. Only the learner's original rubric-aware self-rating determines the active interval. NO MATCH never silently changes the due date. The app does not simulate future successful attempts, turn shadow dates into real sessions, infer efficacy or change previously stored responses.

Older schema-v5 backups missing new optional fields import unchanged. Current backups validate answer-key size/structure, approved version fields and consistency of immutable historical literal results. Learning information stays in local browser storage, without subscription, paid AI, cloud backend or billing requirements. Export JSON backups regularly; browsers can evict local storage.

## Tests

308/308 Node automated tests passed (including 10 new checks), alongside six static GitHub Pages preflight checks and Chromium desktop/mobile interaction checks covering key approval, hidden pre-reveal result, actual matching, preserved due interval and Progress audit. These are software tests, not an empirical learning-effectiveness trial.

## Further research

A next step is traceable human-reviewed grading for open-ended explanations and problem solving, followed by held-out delayed-outcome calibration and capacity-constrained schedule evaluation. The hypothetical shadow scheduler cannot be compared causally with the active one without a valid intervention design.

[Research and engineering foundations](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md) · [Previous policy audit](BLUEPRINT_3_9_FREE.md).
