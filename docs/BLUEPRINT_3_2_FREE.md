# Active Recall Web — Blueprint 3.2: Syllabus-aware learning goals

**Date:** November 16, 2026. **Release:** 3.2. **Deployment:** Public GitHub Pages, no build step, payments, subscriptions or paid APIs. **Study data:** Local-only. **Database schema:** Still 5, backwards compatible.

## Problem solved

Earlier source-coverage and objective-map displays considered only objectives that already appeared in uploaded material. They could not reveal an entire syllabus outcome missing from both the notes and generated questions. This release adds **explicit learner-authored course/syllabus objectives** and makes the mismatch between intended curriculum and approved recall questions visible.

## Features

- **Knowledge → Course & syllabus objectives:** Paste one objective per line (bullets and numbered lines supported); duplicates within the course are skipped. Separate goals per course; edit and archive without deleting any question or historical attempt.
- Each goal may link to one or more existing questions only after an explicit learner action. Links are validated against the same course. A manual question can be written from a goal in the existing editor; writing the answer and verifying its correctness remain the user's responsibility. A learner may also unlink a question without changing its review history.
- **Three distinct status labels:** No linked question; Linked question needs review; Verified question linked. A verified link requires an active, previously verified question, with a current source, at least one active recall focus and an active practice activity. **Verified linked** is a relationship status, not mastery, exam readiness or question correctness.
- The app displays possible existing question matches and source mentions using **simple lexical overlap**. These are pointers for inspection, never automatic source or objective alignment. Long source files are checked across individual statements so unrelated content does not suppress potential matches.
- The **automatic rolling calendar** schedules only previously eligible, learner-verified recall targets. Unmatched syllabus objectives do **not** become invented questions or simulated review attempts. Their absence is surfaced in Knowledge so the learner can decide which missing concepts to cover.
- All study attempts, ratings, question variations, PDFs, source histories and calendar settings remain unchanged. Future cloud sync remains absent; export local JSON backups.

## Technical safeguards

`syllabusObjectives` is an **optional field** in existing schema-v5 files. Older backups lacking it remain valid with an empty syllabus list. On new records it contains stable goal IDs, course IDs, text, explicit question links, creation and update dates. Validated imports reject malformed records, duplicate IDs and cross-course question links. No existing attempts, memory intervals, or target IDs are altered. Archiving a goal changes only the goal record.

Suggested source and question matches are a deterministic client-side text heuristic. They do **not** measure semantic correctness, comprehensiveness, alignment with a real examination board, or achieved learning. The learner must independently inspect the actual syllabus and source before approving a question.

## Research relevance

This represents an **engineering validity safeguard** motivated by the distinction between educational objectives and conveniently extractable source sentences. It does not itself establish that proposed questions are optimal for delayed retrieval. See [`RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md`](https://github.com/gmoon-code/active-recall-web/blob/main/docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).

## Quality checks

- 210 automated Node tests across the suite, including 11 new syllabus tests.
- Chromium sample flow: paste syllabus → capture source → create a learner-authored question → explicitly link a verified question → correct coverage state; mobile check 390px with no horizontal overflow.
- GitHub Pages static deployment preflight checks and archive integrity checks.

## Next milestone

Make the schedule show **uncovered high-priority syllabus outcomes** alongside planned reviews, and build an initial-learning workflow so these outcomes can be prepared before becoming retrievable. Avoid treating an unverified source statement as learned or promising automatic scientifically valid semantic generation without a verified local model.
