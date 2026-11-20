# Active Recall Web v4.32 — due retries inside an active session

## Scope and safety

- The existing transparent interval policy still assigns **Again** an exact one-hour retry. v4.32 only changes *session eligibility* at that saved timestamp; it does not alter any interval, calendar, rating, priority weight or policy.
- A retry can reappear when the user moves to the next question while a long session is still active. It is not offered early, and if the session has ended it can be reviewed by starting another session when due. There is no automatic resumption of completed sessions.
- The latest recorded attempt for that target must be an **Again** self-rating in the **same session**, and its saved timestamp must match memory. Other sessions' attempts and later positive ratings cannot unlock a replay.
- A repeated question is visibly labeled **Due retry**. A real new response and rating creates a new attempt; merely selecting the question, skipping it, or flagging it creates no attempt.
- An unrated skipped retry gets its own optional `retrySkippedIds` session navigation list. Ordinary `skippedIds` remain disjoint from `completedIds`, both lists are validated on schema-v5 import, and permanently erased target IDs are scrubbed from both.
- The app remains free, static, browser-local, and usable offline. FSRS-7 stays an unfitted read-only comparison. This change is **not** evidence of an optimal or scientifically proven universal review schedule.

## Verification before publication

1. `node --check core.js && node --check app.js && node --check test-in-session-retries.cjs`.
2. Run the local Node suite from the `Local deterministic tests` line in `.github/workflows/offline-checks.yml`, including `test-in-session-retries.cjs`.
3. Confirm tests for early 59-minute exclusion, exact 60-minute inclusion, midnight, due-only queue, cross-session attempts, later ratings, tampered memory, repeat skip, backup import, deletion, and Study Now selection.
4. Confirm GitHub Actions desktop/mobile Chromium smoke and HTTPS offline reload with `active-recall-web-v4-32` cache.
5. Publish using the PR review/merge and Pages workflow. Verify the production site displays **Blueprint 4.32** and its health page reports the expected cache.

## Rollback

If smoke or Pages verification fails, revert the v4.32 merge with a normal reviewable Git commit and redeploy. Do not delete learner records or claim to migrate/convert historical ratings. Existing schema-v5 backups remain valid on v4.32 and the prior version (the new optional navigation field is ignored by the older queue logic).
