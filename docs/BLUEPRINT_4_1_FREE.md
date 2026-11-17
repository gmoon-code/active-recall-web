# Blueprint 4.1 — Traceable, append-only human review of complex recall

**Prepared:** 17 November 2026  
**Scope:** Criterion-by-criterion retrospective assessment of genuine written explanations and application/problem-solving responses.  
**Deployment:** Free GitHub Pages static files; all learner data stored in the local browser.  
**Schema:** v5 unchanged; new optional attempt fields only.  
**Scheduler:** transparent-interval-v1 and conservative-shadow-v1 untouched.

## Rationale

Strict literal agreement (Blueprint 4.0) improves reproducibility for carefully approved short facts, but string matching is invalid for causal explanations, mathematical solutions and other open-ended reasoning. The existing rubric-aware self-ratings are useful formative reflections, yet they do not constitute independently verified performance. This release collects richer *human-entered* criterion judgments linked to an actual saved answer without treating those judgments as ground truth.

## What is frozen prospectively

For every new explain/apply attempt, recordAttempt now stores an optional rubricAtAttempt containing the ID, version and exact text of **all active verified criteria** at the time of the attempt, even when the learner leaves the immediate self-check blank. The existing response, questionSnapshot, referenceSnapshot, activity/target/requirement version IDs, timestamps, self-ratings, prior due date, and schedulingDecision remain the preserved primary practice record.

The review feature NEVER borrows a newer rubric for an older attempt. Legacy attempts can use contemporaneous criterionChecks only if the original self-check recorded every criterion (criterionCounts.unassessed = 0). A missing/incomplete old rubric is displayed as unreviewable rather than silently backfilled. The selected rubric need not represent the entire science topic; a complete judgment means only *all saved rubric criteria* were addressed.

## Review workflow

1. In **Progress → Human-reviewed explanations & problem-solving → Review history & limitations**, find a saved written explanation/application and choose **Review answer**.
2. Inspect the **original written answer, preserved question, reference answer and versioned rubric**.
3. Choose a reviewer type: **self**, or **another person (self-reported)**. No examiner identity is verified.
4. For each criterion, choose **Included / Not demonstrated / Uncertain / Not assessed**. Included requires an exact excerpt of the written response. Not demonstrated and Uncertain require a reason (at least eight characters). Not assessed leaves both fields blank. The app checks excerpt **existence**, not whether the excerpt actually proves the criterion.
5. Explicitly confirm the human review and save. All criteria must be represented, with at least one assessed.
6. To correct or revise an assessment, reopen and save again. Each submission appends an immutable historical revision with timestamp, rubric wording/version, reviewer role, evidence and overall derived classification. Original attempts and prior reviews are not rewritten.

Derived labels: all_supported if every saved criterion is marked Included; gap_identified if any criterion is Not demonstrated; inconclusive otherwise. These are descriptive labels for human-entered findings, not automated semantic grades or proof of correctness.

A small non-cryptographic response fingerprint detects accidental mismatch in exported records. It is **not an authenticity guarantee or protection against deliberate tampering**. Local storage is not a secure student-data system. Avoid sensitive student/patient data and export backups regularly.

## Delayed judgment audit

The Progress panel scans the most recent 50,000 actual attempt records and groups by stable requirement + target version, not by question variant. A record is eligible only when:

- It has a saved, conclusive human review of a written explanation/application.
- The attempt was independent of hints, not immediate post-study, and occurred at least 24 hours after an earlier *real* practice on the same target/version.
- The reviewer submission occurred before a **later** practice of that same target/version, to reduce retrospective outcome contamination.
- The outcome is conclusive: all criteria included, or an explicit criterion-level gap. Ambiguous and unassessed-only outcomes are never coded as incorrect.

The audit reports the reviewer-role mix and explicit exclusion counts. It suppresses any supported-share percentage until there are 20 eligible judgments covering at least 10 distinct targets. This threshold is a cautious display rule, not statistical validation. Because reviews occur after answers and often with the reference visible, even other-person review is not automatically independent, blinded, calibrated or equivalent to an exam. Review behavior, rubric coverage, feedback, course differences and selection effects may confound later scheduling research.

**No review result changes the real next due date or memory state.** The shadow policy remains hypothetical and is not credited with outcomes that were never observed under it. No simulated future attempts or causal effects are invented.

## Data and backward compatibility

- New optional data: attempt.rubricAtAttempt and attempt.humanReviews[] (append-only revisions), with summary events in db.events.
- Existing schemaVersion stays 5, IndexedDB/localStorage storage engine untouched.
- Historic responses and rated reviews remain unchanged.
- Old exports without new fields are valid.
- Import validation checks criterion IDs, frozen wording/versions, evidence excerpts, reviewer roles, conclusion consistency, monotonic review revisions/timestamps and a non-cryptographic response fingerprint.
- Review history is capped at 50 revisions per attempt, evidence excerpts at 700 characters and reasons at 1,200 characters. The interface only exposes the latest 24 saved written complex responses to keep the screen usable. An archive/bulk human-review interface is a possible later improvement.

## Engineering verification

This branch adds Node built-in tests covering original snapshots, missing and uncertain evidence, exact-quote anchoring, explicit confirmation, legacy data, unsafe retrospective grading, append-only corrections, schedule immutability, delayed-audit exclusions, tampered backup rejection and static UI/offline-cache integration. A free GitHub Actions job checks JavaScript syntax and runs tests. A separate six-test static preflight checks essential GitHub Pages architecture. **GitHub Actions reported 35/35 tests passed**, including six free-deployment preflights, with JavaScript syntax checks. Its real Chromium desktop/mobile browser run also passed: the interface displayed preserved question/answer and rubric snapshots, saved a human review in IndexedDB, appended a correction without overwriting the original and confirmed the live schedule was unchanged. The smoke run used a free temporary test dependency on the CI runner only; the public app requires none.

The previous release reported 308 tests and desktop/mobile browser checks, but those historical test files were not present in the published repository when v4.1 development began. These new checks do **not** replace or certify that original full regression suite. The browser smoke is a targeted v4.1 workflow check, not comprehensive end-to-end or accessibility certification.

## Research priorities after v4.1

1. Recruit or collect structured human judgments and compare disagreement across reviewers, using an explicit rubric and adjudication procedure; avoid assuming that another person automatically provides a gold standard.
2. Collect enough delayed independent responses without leakage from repeated near-identical questions; report measurement uncertainty, missingness and class/topic differences.
3. Use held-out prospective predictions to evaluate any proposed memory model. Compare capacity- and deadline-constrained schedules under an appropriate intervention design, rather than interpreting shadow-policy dates as counterfactual learning outcomes.

See [Blueprint 4.0](BLUEPRINT_4_0_FREE.md) and [Research foundations](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).
