# Active Recall Web — Blueprint 3.5: Criterion-level feedback and corrections

**Release:** November 17, 2026 · **Hosting:** free GitHub Pages · **Schema:** v5 unchanged.

## Purpose

Active Recall Web is an automatically updating, multi-course learning and spaced-review planner. Blueprint 3.4 added guided source learning followed by an immediate retrieval attempt, but that guided attempt collected only an overall self-rating. Version 3.5 extends the existing rubric-check workflow to guided learning and records the learner's specific corrections, without automatic correctness grading.

## Changes

1. **Reveal before feedback.** The original answer is recorded before the reference, rubric or prior correction becomes visible. Guided learning and Study Now offer Included, Missed, Unsure, or unassessed for each verified criterion.
2. **Learner-authored repair note.** After comparing against the source, the learner can store up to 2,000 characters describing a corrected explanation or next step. The note is text, not a generated answer, and is saved with the actual retrieval attempt.
3. **Scheduling safeguard.** When a learner explicitly marks Missed or Unsure, a positive Good/Easy overall rating is scheduled conservatively as Hard. The existing multipliers are provisional, not scientifically optimal. A note by itself has no learning effect or new due date.
4. **Review corrections at the appropriate moment.** On a later attempt, a read-only panel containing the previous applicable gap and repair note is available only after revealing the reference answer. The independent first attempt is not exposed to that cue.
5. **Version-aware evidence.** The latest-correction summary uses the matching current requirement and target version and excludes checks tied to older criterion versions. Historical original text snapshots stay in study records.
6. **Visible feedback history.** Study session summaries and Progress show learner notes and marked gaps. Immediate post-study attempts remain separate from later retrieval.
7. **Backward compatibility.** Optional attempts[].correctionNote adds no database migration. Existing v5 backups import; invalid or oversized notes are rejected. Notes never automatically create an attempt or additional review target.
8. **Calendar preservation.** Preparation-only calendar days are not labelled empty; the existing live fix is retained and covered by a regression test.

## Interpretation and limitations

These are learner self-assessments, not independent grading, model-scored correctness or demonstrated long-term retention. Source material and rubrics can be wrong; the learner must verify them. An unassessed criterion means unknown, not incorrect. The system does not run background work while the page is closed, does not automatically sync devices, and cannot guarantee browser-local persistence. Export JSON backups regularly. No payments, paid APIs, accounts, billing, or cloud servers are required.

## Validation

- 252/252 automated Node tests, including new cases for rubric history, backup validation, conservative scheduling, cross-target isolation and preparation-only calendar days.
- 6/6 GitHub Pages static preflight checks.
- Chromium desktop and mobile, using an isolated simulated browser data store: a source-guided attempt with rubric feedback, a later Study Now attempt with prior correction available only after reveal, persistence of second correction, and correction visibility in Progress. No JavaScript errors or horizontal overflow.
- Live browser IndexedDB, offline caching and durable storage on the user's device still require end-user diagnostics.

## Research

See [Evidence review and engineering specification](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md) for retrieval, corrective feedback, distributed practice, adaptive scheduling, task-complexity and evaluation evidence. The efficacy of this precise user-interface workflow has not been independently tested.

## Next

Evaluate the source-grounding and adequacy of explanation rubrics in biology, chemistry, maths, history and multilingual answers, then validate review intervals against delayed retrieval outcomes. Do not claim automatic mastery predictions.
