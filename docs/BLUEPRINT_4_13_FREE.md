# Active Recall Web Blueprint 4.13 — Permanent Q&A Deletion

**18 November 2026** · Still free, local-only, GitHub Pages, no accounts/payments/paid APIs, unchanged schema-v5 backups and transparent interval policy.

## What the user asked for

Allow questions already in **Deleted questions · restore** to be removed **permanently**, so they are not retained forever in the application's active local data store.

## Interface and safety

1. Open **My Q&A → Deleted questions · restore** for the selected course.
2. Each deleted item has both **Restore** and **Delete permanently**. The section also has **Delete all N permanently** for all archived questions in that course, even if more than 50 exist and only the latest 50 are displayed.
3. A native prompt states how many Q&A pairs and linked attempts will be removed. The learner must type exactly `DELETE`; dismissal or a different response does nothing.
4. The app waits for local storage to finish saving before reporting success. If persistence fails, the in-memory working copy is restored and an error is shown.

## Purge semantics

The purge accepts **only previously archived** requirements. It validates every ID before changing anything; a mixed active/deleted selection is rejected without partial erasure. On success the current local database loses:

- Question and reference answer, all requirement versions and associated historical question/answer revisions.
- Retrieval targets, alternative activities, rubric criteria and their versions, exact answer keys and personal review memory for these targets.
- All linked attempts: learner responses, question/reference snapshots, self-ratings, corrective notes, literal checks, human/paired/offline reviewer annotations, and their attempt-linked events.
- Pending/current session references and drafts for those questions, plus completed-target IDs and the corresponding course counts.
- Stale links in syllabus goals, selected assessments, source duplicate/conflict pointers and other questions' overlap flags.
- Audit entries tied to removed requirement/target/activity/criterion/attempt IDs; the remaining audit gets only an anonymous count and timestamp indicating a purge occurred.

Personal timing models are recalculated from remaining attempts; the **scheduling algorithm and existing review intervals for other questions do not change**. Original lecture notes, courses, other questions and unrelated attempts remain unchanged. The purge does not call any remote service. No data migration is needed.

### Integrity exception

An optional **locked prospective reviewer-pilot** relies on an immutable sequence of attempts and denominator. If a targeted question has an attempt and the pilot is registered, the purge is **blocked in full**, with an explanation. Quietly dropping those attempts would corrupt the study's audit. Never-attempted archived questions can still be removed without changing a pilot.

## What “permanent” means

The Q&A is no longer retrievable through the app's active database or Restore list, and the app saves the purged state. **This is not certified secure erasure of browser/database disk remnants.** Any JSON backups already downloaded, browser backups, other-device copies or photographs are unaffected. The user may export a backup before purging; such a backup could still be re-imported later. This action is irreversible within the currently saved app state.

## Verification

Automated tests check strict archived-only selection, mixed-list atomic rejection, deep removal of Q&A/rubric/target/attempt/memory data and attempt-linked events, global time-model recomputation, other-course preservation, source/assessment/syllabus link cleanup, session draft cleanup, schema-v5 JSON restore validation, and locked pilot protection. Desktop and mobile browser tests check prompt cancellation, exact typed confirmation, individual permanent deletion and course-scoped delete-all.
