# Active Recall Web Blueprint 4.11 — Delete / Restore Q&A

**18 November 2026** · Permanently free, GitHub Pages, browser-local storage, no accounts or paid services.

## The problem

Learners need to remove wrong, irrelevant or duplicate Q&A pairs as easily as they can add or edit them, particularly after importing an entire lecture's list. Accidental deletion must not silently destroy their previous retrieval records.

## How it works

1. In **My Q&A**, choose a course and optionally a lecture filter.
2. For one question, use **Delete** beside its existing **Edit Q&A** control. Confirm the browser dialog. Cancelling leaves it untouched.
3. For several questions, press **Select multiple**, check the desired questions (or **Select all shown**), then **Delete selected** and confirm. The selection is restricted to the currently displayed lecture filter and cleared when the filter or course changes.
4. Expand **Deleted questions (N) · restore** beneath the list to read removed questions and answers, then press **Restore** for any you want to practise again. The 50 most recently deleted items in the course are displayed if the list is very long.

## Data and integrity design

- **Delete** is a reversible *archive*: `requirement.active=false`, `archivedAt` and an audit event. No physical removal of records or answers occurs. This is stated to the learner in the confirmation and restore UI.
- Archived questions are not eligible for future Study Now selection, planning or upcoming calendar items, and do not appear in active learning requirements. Their previous attempts, snapshots, memory intervals, rubrics, linked lecture notes and other course data remain in place.
- **Restore** returns the same requirement ID to active study without inventing an attempt or resetting the due date. If an identically worded active question already exists in the same lecture, restoration is blocked to avoid a silent duplicate.
- **Bulk deletion** validates all selected IDs before any item changes. Stale, duplicate or nonexistent IDs fail together without partial deletion. The UI confirms the exact number of items and limits selection to visible questions.
- If the deleted question was the current item in an active practice session, the session advances to another eligible item or finishes when nothing remains; it never records an answer to an archived question.
- The current schema is still `schemaVersion: 5`. Existing export/import backups continue to work. No change to the versioned scheduling policy or self-assessment interpretation.

## Verification

- Deterministic tests cover single and batch deletion, cancelled/no-op behavior at the UI level, failed atomic validation, exclusion from future candidates, preserved responses and due dates, restoration, duplicate safeguards and schema-v5 backup round trips.
- Browser tests cover cancel/confirm dialogs, course/lecture-scoped multi-selection, a real previously imported question list, restoration and narrow mobile layout.

## Known limits and next steps

There is no **permanent erase** button here: physically removing study history would require a separate explicit irreversible action and a careful policy for linked assessments and audit evidence. Browser data can still be lost if its storage is cleared; export JSON backups regularly. Future Q&A improvements can include sorting, search and larger-list management without changing the transparent spaced-repetition policy.
