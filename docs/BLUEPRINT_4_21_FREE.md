# Active Recall Web — Blueprint 4.21

## Optional due-review catch-up sessions

This release makes the earlier read-only due-first idea practical **without silently replacing the normal unified study queue**. Under **Study Now → Catch up on due reviews**, the learner can preview and explicitly start a session containing only *already-attempted recall targets whose stored due time has arrived*. New questions and not-yet-due maintenance are excluded **only from this voluntarily selected session**.

### How it works

1. Open **Study Now** and choose any supported duration from 5 to 720 minutes.
2. Inspect the **Catch up on due reviews** card. It separates due previously attempted targets from never-attempted new questions, shows how many due questions fit the chosen block, and shows what remains waiting. Estimated time is a planning aid, not observed study time or a guarantee.
3. Optionally open **Which due questions would fit?** for a read-only list of the first fitting opportunities across courses, with approximate durations and any linked assessment deadline.
4. Select **Start due-only session** to opt in. The interface clearly labels the session “Due Reviews Only.” The app continues to select due questions under its existing rule score, course balancing, assessment cues, activity-variation selection and time reserve. It never slips new questions into that session as previously due items are completed.
5. Reveal each reference answer and give an ordinary Again/Hard/Good/Easy rating. **Only an actual completed and rated attempt** changes that target's next review interval, using precisely the old policy. A preview or starting the session never changes memory. The optional v4.19 pre-answer forecast receipt, when eligible, remains frozen before reveal.

### What does “late” or “missed” mean?

- **Due review** means a prior practice occurred and the stored due timestamp is at or before now. It does **not** establish that the learner had promised to study that day, failed a habit, or forgotten the answer.
- **More than 24 hours late** is a time-from-due descriptor, not an achievement or blame label.
- The preview identifies how many due dates fell on explicitly unavailable dates or zero-capacity weekdays/weekends. This is evidence of a planning constraint, not proof of missed effort.
- Off-app study logs remain self-reported habit data and **never** automatically clear due questions or shift their review dates.
- If nothing due fits the selected duration, the start action is disabled; choose a longer block if possible or use the ordinary mixed study flow. Nothing is silently rescheduled.

### Important boundaries

- The normal **Start session** button and its mixed multi-course queue are unchanged and remain the default. The v4.17 **review-first alternative** is still a non-applying inspection, whereas this new action is a separate **due-only** filter explicitly chosen by the learner.
- No algorithmic FSRS model, learned forgetting probability, AI grading, mastery inference or new automatic rescheduling is introduced. The priority score still considers the existing assessment and difficulty evidence; the study mode only restricts which target types can be selected.
- The calendar, due-date memory, assessment timeline and session budgets are preserved. Already completed targets are not repeated in the same catch-up session just because the rating was difficult.
- Sessions gain one optional schema-v5 field (`queueMode`) indicating `mixed` or `due_only`. Old sessions and backups default to the original mixed behavior. Invalid imported mode values are rejected. The mode lives in local browser storage and JSON backups only. Permanent question purging does not restore deleted questions through session history.
- No server, payment, subscription, tracking, account or paid API. Offline/GitHub Pages compatibility remains intact.

### Verification

Deterministic tests check new/due/early separation, course-balanced fitting, unchanged original mixed planning, unavailable-day classification, small time budgets, read-only state, and old/new backup compatibility. Browser CI checks that a due-only session can be started deliberately, no new questions appear during successive ratings, the original interval formula remains in control, and the preview fits a mobile viewport.
