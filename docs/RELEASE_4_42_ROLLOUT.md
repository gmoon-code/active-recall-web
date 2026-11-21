# Blueprint 4.42 — Remove repetitive instructional subtitles

## Scope

- Remove generic introductory sentences from Overview and Study Now, especially the empty-course sample explanation and the post-Start-button sentence beginning “Recall first, reveal the answer”.
- Omit descriptions from selected empty states when a title, form, or existing button already makes the next step clear. The shared empty-state renderer does not create empty paragraphs or stray whitespace.
- Remove redundant paragraphs from session-duration, question-draft, catch-up, priority-inspection, schedule-comparison and daily-calendar cards. Keep information about actual due work, provisional future dates and material needing verification.
- Preserve operational instructions for importing notes and bulk Q&A, source-provenance cautions, false-recall safeguards, study history/evidence limits, destructive-action confirmations, backup information and every local data workflow.
- Refresh version metadata and the offline cache to `active-recall-web-v4-42`. The v4.41 icon assets and their cache-busting URLs remain unchanged.

## Verification and release gate

1. All deterministic Node tests pass; the copy regression asserts the two requested sentences and related static subtitles are absent while essential warnings remain.
2. GitHub Actions validates mobile and desktop Chromium navigation, empty-state and study-panel copy, schedule/calendars, offline HTTPS reload, backup/restore and all prior workflows.
3. Merge only after green CI, then compare published assets against the tested tree and sync local `main`.

## Rollback

Previous verified release: v4.41, commit `a8df89d94c382861d433e380ddcc1d6833b4da5d`. If users lack necessary context, restore the specific explanation in a focused follow-up while retaining the revised styling and all browser-local learner data. No data migration or deletion is part of this release.
