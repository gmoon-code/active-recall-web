# Active Recall Web — Blueprint 4.22

## Skipping a question without a fake recall result

This release addresses a study-session problem: a learner may encounter an ambiguous, inaccurate, irrelevant or otherwise unsuitable question. Previously the only ways forward were to rate it as if a recall attempt occurred, or finish the whole session. Neither represents the intended workflow reliably.

### A deliberate, unrated skip

1. In **Study Now**, start a regular mixed session or the v4.21 due-only catch-up session.
2. If the current question is not suitable for a fair recall attempt, press **Skip question · no rating**. It is available before or after revealing the reference, but disabled while paused because the entire session is paused.
3. The current question is excluded from the **remainder of this session only**, including after reloading the app. The next question follows the same original priority, timing and course-balancing rules; due-only remains due-only.
4. **No attempt is recorded, no success or failure inferred, no next-review time changed, and no memorisation credit granted.** The app never represents a skip as an Again, Hard, Good or Easy rating. Prior and future intervals remain the same until a real answer is rated.
5. The completed session displays rated work and skipped work separately. The skipped list offers **Edit Q&A** for quick correction. If you finish without rating anything, the summary says that no review dates changed.

If a valid question is simply difficult or cannot be recalled, the learner should **reveal the answer and self-rate Again** instead. Skip is intended for *question suitability* or interruptions that prevent a meaningful attempt, not for artificially clearing a due backlog. A due-only question that is skipped remains due for a later session; an unattempted or early question in the mixed queue remains at its prior eligibility state.

### Data integrity and privacy

- Session-only skipped target identifiers live in an optional `sessions[].skippedIds` array in the existing schema-v5 local JSON backup; older sessions with no such field remain valid.
- Import validation rejects malformed IDs, duplicates, nonexistent targets, and a target simultaneously marked completed and skipped in the same session.
- Permanent deletion of archived questions removes their skipped target references, alongside the other existing cleanup rules.
- Skips are **not** recorded as study attempts, human assessment, reviewed answers, independent delayed evidence, outside-app study, mastery, or an input to memory-model calibration.
- No server, account, charge, subscription or remote API. Current scheduler, calendar availability, due intervals, source revisions and review history are preserved.

### Verification

Deterministic tests assert skip-only mutation, read-only memory and attempts, later-session eligibility, mode and completion safety, backup validation, and permanent-deletion cleanup. The Chromium CI test covers skipping one of two due questions, reloading, rating the other, editing the skipped question, mobile layout, revisiting the skipped due question, and ending an all-skipped session without fabricated attempts.
