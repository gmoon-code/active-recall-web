# Active Recall Web — Blueprint 4.15

## Explicit outside-app study, non-punitive weekly reflection

This increment preserves GitHub Pages hosting, fully local storage, offline use, the existing schema-v5 backup format and the v4.14 scheduler. There is no paid service or account.

### Use

1. Open **Progress** and find **Log outside study**.
2. Select today or a date in the preceding 30 days, enter actual minutes (1–720), select reading/notes, questions elsewhere, class/tutoring or other studying, and optionally enter a short note.
3. Press **Log outside study**. The self-report appears under its original date. Delete an incorrect entry and submit a corrected one; deleting an entry does not remove your actual in-app attempts.
4. Read **Schedule-fit reflection**. This considers only dates with observed plan snapshots and declared positive availability. It raises a question when two or more such dates have no recorded practice, or when outside minutes exceed declared availability on two or more observed days. It never interprets unobserved dates as failure or rest as missed work.
5. Use **Calendar** to adjust availability yourself if the estimate is unrealistic. The app never automatically changes it.

### Evidence safeguards

- The outside-app entry is explicitly **self-reported**, not verified practice or learning evidence. An entry has a recorded time and chosen study date, but does not certify when study actually occurred.
- Timed in-app attempts and outside-app study are displayed separately because a user may include the same activity in both. Their minutes are **not summed** into a single daily actual-time metric.
- There is no automatic question completion, self-rating, mastery change, spaced-interval change or due-date adjustment from these entries.
- A day without a plan snapshot has **unknown planned availability**, even if outside study was logged for that date. Rest-day study does not convert the day into a missed obligation.
- No activity recorded on an observed available day is an *absence of records*, not proof of missed study.
- Past plans cannot be inferred. Today’s observed plan may have been created after studying already happened, so the weekly reflection is only a prompt for the learner to inspect schedule assumptions, not a measured adherence percentage.
- Self-reports are retained only in the local database and exports. Deleting a local entry does not delete older exported backups.

### Verification

Deterministic tests check logging, deletion, backup validation, invalid dates/minutes, historical grouping, rest and unobserved states, and the invariant that memory/attempts are unchanged. The complete existing non-browser test suite is preserved. Browser smoke tests require Chromium in the execution environment.

### Future improvement

Add opt-in, *prospectively confirmed* study opportunities and a learner-approved what-if schedule simulation. A robust adherence measure needs reliable prior commitments and distinguishing actual time allocations from retrospectively reported time; this release does not claim either.
