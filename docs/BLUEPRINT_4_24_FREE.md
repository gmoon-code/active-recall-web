# Active Recall Web — Blueprint 4.24

## Actionable reasons and notes for question-quality holds

Question and answer quality is distinct from retrieval performance. Building on v4.23's hold and explicit-review flow, this increment makes question problems easier to identify and repair without creating evidence of learning.

### Learner flow

1. In an active Study Now session, select the suspected problem from the **Issue** dropdown and press **Flag for correction · skip**. Options are **Unclear wording**, **Reference answer may be wrong**, **Possible duplicate**, **Not relevant to learning goal**, **Other question issue**, or **Not specified**. The current question is skipped without a rating and held from all future automatic queues.
2. Go to **My Q&A → Questions needing correction** to see the saved category on each held question. Open **Reason and repair note** to change it and add a private note (maximum 500 characters), for example a missing condition in the reference answer. Save the note independently from editing the Q&A.
3. Use **Edit Q&A** to check and repair the question and reference answer. The hold persists until **Reviewed · resume** is deliberately confirmed. A substantive edit still follows the established interval reset rule; a wording-only edit that preserves knowledge continues the original interval.

The completed-session skip summary can still flag an earlier unrated skip. Such a flag defaults to **Not specified** and can be classified in the correction queue. No auto-classification or claim that a suspected error is factually confirmed is made.

### Integrity, compatibility, and scope

- Optional `studyHold.reason` and `studyHold.note` fields live inside the existing schema-v5 hold object. Optional `updatedAt` records later category/note edits; its original `heldAt` remains fixed. Existing v4.23 holds without these fields remain valid and editable. Unsupported categories, malformed timestamps and notes beyond 500 characters fail backup validation.
- Quality-note updates do **not** change recall attempts, ratings, memory, due dates, the stored hold status, or scheduling priorities. Holds exclude the whole Q&A from both due-only and mixed study until explicit release. No learning progress is inferred from a flag.
- User-entered notes are HTML-escaped when displayed. All data remains on the device in existing backups. There is no cloud service, paid API, grading, account, FSRS model, or new schema version.

### Verification

Deterministic tests check categorical session flags, old-backup compatibility, invalid metadata, idempotent quality-note edits, unchanged recall evidence, queue exclusion and explicit release. Chromium regression checks the Study Now category selector, mobile correction-queue edit, escaped note display, browser reload persistence, restored due queue and absence of invented study attempts. Existing regression suites remain mandatory before release.
