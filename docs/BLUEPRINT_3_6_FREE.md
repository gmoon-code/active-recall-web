# Active Recall Web — Blueprint 3.6: Source evidence and rubric quality

**Release:** November 17, 2026. **Privacy and cost:** 100% free, browser-local, GitHub Pages-hosted. **Storage:** schema v5; compatible with previous source versions, criteria, attempts, schedules and JSON backups.

## Research-informed motivation

Retrieval and corrective feedback help learning, but an answer rubric must capture meaningful knowledge and relationships. v3.5 supported criterion-level Included/Missed/Unsure self-checks but proposed overly general checkpoints. v3.6 supports a conservative, human-verified source-evidence review rather than claiming to assess correctness.

## New functionality

The **Knowledge → Rubric → Source evidence checklist** shows up to twelve candidate excerpts derived from the saved source quote or, when no matching source is available, a clearly labelled *reference answer (not independently source-validated)*. Candidate structures include claim/effect, proposed mechanism, stated explanation, explicit if/when condition and outcome, two sides of a whereas contrast, and intact qualifications using only if/unless/except. Unstructured sentences may appear as lower-information source statements.

Each candidate uses exact source characters and offsets. The view distinguishes *exact quote linked to user-verified criterion*, *linked to pending criterion*, and *not explicitly linked*. These are literal-link checks, **not** proof of accuracy or completeness; manually phrased correct criteria may have no exact quote match. Expand **Inspect the complete excerpt** to read conditions and outcomes together.

Choose **Add as unverified draft** for a relevant candidate. It creates a pending criterion without a new recall target, review date, attempt, automated grade, or mastery estimate. The learner must edit/verify it before it appears in post-answer self-checking. The app re-derives candidates when selected and rejects stale source versions, changed question versions, changed excerpts, and duplicates. The legacy bulk suggestion action also rejects a revised source that has not been reverified.

## Preserved invariants

- No database migration, external upload, mandatory remote AI, paid dependency, automatic evaluation, or change in memory scheduling.
- Historical criterion versions and previous attempts remain intact; unverified drafts do not enter practice rubrics.
- Missing exact links do not mean a curriculum gap. A source quotation does not establish scientific correctness, difficulty, or exam relevance.
- Incomplete figure-only PDFs, mathematical derivations and complex or multilingual explanations require manual authoring and verification.
- Existing 7–42-day calendar and Study Now queue are unchanged; interval coefficients remain provisional heuristics.

## Validation

**264/264 automated tests** plus **6/6 static Pages checks** passed. Chromium desktop/mobile checks covered source evidence → pending draft → explicit verification with no JavaScript errors or horizontal overflow. The v3.5 guided-learning and correction-reuse browser tests also passed. Browser tests use simulated local storage, not a guarantee of storage persistence or offline functionality on each device.

## Next priority

Test whether learner-authored rubrics represent important syllabus requirements and acceptable alternative explanations, then evaluate scheduling policies against actual delayed independent retrieval and study-minute costs. Follow [Research and engineering specification](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md) for the academic background.
