# Blueprint 4.2 — Independent human reviews, descriptive agreement, adjudication

**Release preparation:** November 17, 2026. **Host:** free GitHub Pages. **Learning data:** browser-local. **Backup format:** schema v5 unchanged. **Scheduler:** unchanged transparent-interval-v1 active and conservative-shadow-v1 hypothetical policies.

## Purpose

Version 4.1 collected traceable human assessments of saved written scientific explanations and applications. A single self-marked judgment is not a verified outcome. Version 4.2 lets two people separately enter rubric-level judgments for the **same, real, saved answer**, compare their decisions, and document a reasoned reconciliation.

This is **not** AI semantic grading, expert certification, measured scientific correctness, a calibrated memory model, or evidence that a spaced-retrieval policy is superior. Exact source excerpts prove only that the quoted words exist in the original response; a person decides whether they substantiate a criterion.

## Workflow

1. Complete a genuinely written explanation or application with a current, verified rubric. The original question, reference answer, response, target and rubric versions, and due date already exist in the v4.1 attempt snapshot.
2. Visit **Progress → Two-reviewer agreement & adjudication → Review saved answers with two people**. Open the real attempt.
3. Reviewer A makes an original, criterion-by-criterion judgment: **Included**, **Not demonstrated**, **Cannot determine**, or **Not assessed**. Include an exact excerpt for Included, and a reason for missing/uncertain criteria. Confirm that a human performed this assessment.
4. Reviewer B sees the original question, original response, reference answer and identical historical rubric, **but the B form masks A's findings and evidence**. B must attest to being a different person who did not consult A's prior judgments. Both reviewers cannot identify themselves as the learner.
5. Only after B submits does the app reveal the comparison, along with each original rationale and excerpt. Both reviews are immutable. Reviewers cannot overwrite their first submission.
6. For any status difference, a person may adjudicate that criterion as **Included**, **Not demonstrated**, or **Unresolved**, providing an explicit rationale. A later correction adds a new adjudication revision and retains earlier ones.

Both reviewers can view the original reference answer. The software **cannot prove** reviewers' identities, relevant qualifications, actual independence, or absence of previous exposure. Privacy within B's input form is a software safeguard, not real-world blind assessment. Different-person attestations are self-reported and identity is not verified.

## What agreement means

An individual criterion is **decisively comparable** only when both reviewers choose either Included or Not demonstrated.

- **Decisive agreement:** both Included, or both Not demonstrated.
- **Decisive disagreement:** Included versus Not demonstrated, in either direction.
- **Excluded:** at least one reviewer chose Uncertain or Not assessed. Exclusions are not scored incorrect, even when both marked the same uncertain category.
- **Needs reconciliation:** any difference in saved statuses, including nondecisive disagreements. An adjudicator may explicitly leave a dispute unresolved.

Progress reports completed pairs, comparable criterion counts, agreement/disagreement counts, excluded evidence and adjudication status. An agreement percentage is withheld until **20 comparable judgments from at least 10 distinct attempts and 5 distinct recall targets**. These are conservative presentation thresholds, not inferential validation. Criteria within one answer are correlated; raw agreement is not Cohen's kappa, reviewer reliability, independent mastery verification, or a memory-retention probability.

Paired comparisons do **not** enter the pre-existing delayed self-report, literal-answer or human-review outcome audits. No agreement or adjudication result updates the active scheduler or retrospective memory history.

## Data and privacy

New optional per-attempt data stores the paired-review version, one A record, one B record, and an append-only list of adjudications. Each judgment keeps its original source criterion IDs, versions, wording, response fingerprint, status, supporting evidence, reviewer role and timestamp. A fingerprint is a lightweight accidental-change check, not cryptographic authenticity.

Backups reject invalid/mismatched source evidence, review order, role attestations, duplicate submissions, forged metadata, invalid adjudication decisions and changed historical response fingerprints. All previous v4.0/v4.1 schema-v5 records remain accepted. No migration, cloud data, billing, API key, paid service, account or remote AI is needed. The public GitHub repository contains the application code only, **not saved learner answers**. Always export JSON backups; browsers may erase local storage. Avoid sensitive student data.

## Engineering verification

- New standalone paired-review.js engine plus paired-review-ui.js.
- Existing core.js import validation checks optional paired-review structures; the original v4.1 human-review feature remains available.
- Offline service worker caches both new modules and versions its cache to v4.2.
- Regression coverage: **67/67 Node tests passed**, including six free-GitHub-Pages preflights, 29 v4.1 tests and 32 v4.2 tests.
- Existing v4.1 browser smoke passes; new **real desktop/mobile Chrome smoke passes** the reviewer-A/hidden-reviewer-B handoff, disagreement, adjudication, IndexedDB persistence and unchanged due date.

The historical **308-test v4.0 suite** was not present in this published repository, so these new tests are not represented as a rerun of that suite. The browser runs are targeted workflow checks, not a randomized learning-effectiveness trial or a full accessibility audit.

## Next research priorities

The next improvement should allow privacy-preserving offline transfer of independent review packets between devices and conflict-checked import of completed evaluations; do not imply unsupported cross-device automatic sync. Then document reviewer training and disagreement resolution protocols, obtain actual delayed and varied retrieval outcomes, and only then evaluate held-out memory-model predictions or test alternative capacity-constrained scheduling policies in a prospective design.

[Blueprint 4.1](BLUEPRINT_4_1_FREE.md) · [Research foundations](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md)
