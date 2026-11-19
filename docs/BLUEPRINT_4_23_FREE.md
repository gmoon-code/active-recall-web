# Active Recall Web — Blueprint 4.23

## Correction queue for unreliable questions

This increment separates three different situations that should not be conflated in an adaptive study tracker:

1. **Couldn't remember a valid question:** Reveal the reference and self-rate **Again**, providing actual recall evidence to the existing scheduler.
2. **Need to set something aside temporarily:** **Skip question · no rating**, excluding it only from the current session, as in v4.22.
3. **Question or reference answer appears unclear, inaccurate, duplicated or unsuitable:** **Flag for correction · skip** to prevent it appearing in future automatic study until explicitly reviewed.

### Repair flow

- Flagging from an active session records an unrated skip for that session and places the whole learning requirement, including its focus variations, on a correction hold.
- A completed v4.22 skip summary also offers **Flag for correction** for previously skipped questions.
- **My Q&A → Questions needing correction** lists held questions for the selected course, with direct **Edit Q&A** and **Reviewed · resume** actions. The ordinary question list and Knowledge page also identify held questions visibly.
- Editing alone does **not** silently remove the hold. Releasing it requires a separate, affirmative confirmation that the question and reference answer were checked for clarity and correctness. Other existing eligibility checks still apply to an unverified draft or source revision.
- A released question becomes eligible according to its original due time (or first-attempt status) unless the learner made a substantive edit. A substantive edit follows the existing policy of resetting the changed recall target's future interval; wording-only edits preserve it only when the tested knowledge is unchanged.

### Boundaries and safety

- The hold filters through the same `requirementEligible` function used by the unified mixed queue, due-only mode, calendar, and recording of actual recall attempts. Merely hiding a UI card would not be sufficient.
- Flagging, viewing, skipping, and releasing the hold **do not** alter memory or previous attempts, create a self-rating, or count as actual studying. Prior responses and linked evidence remain intact.
- An optional `studyHold` object on a requirement contains only a fixed `correction_required` status and timestamp; schema-v5 JSON backups preserve it without schema migration, reject malformed values, and permanently erase it and its event history when that archived question is purged.
- The scheduler, current rating/interval policy, evidence audits, course balancing, deadlines, and local-only storage are unchanged. No FSRS training, AI grading, cloud sync, paid API, subscription, account, or remote data processing is introduced.

### Verification

Deterministic tests cover queue/calendar exclusion, unchanged memory and attempts, explicit release, state after revision, active-session flagging, tampered and legacy backups, and archival/permanent deletion. Chromium CI tests flags from study and session summary, persistence across reload, mobile repair list, editing, confirmed resume, due-only eligibility after resume, and actual rating as the only event changing the next review.
