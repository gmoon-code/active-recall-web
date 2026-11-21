# Blueprint 4.43 — Contextual help without clutter

## Scope

- Remove the visible “Read-only workload check · no automatic changes to due dates, grades or memory intervals” subtitle and equivalent redundant pills in question priorities, available study time and schedule comparison.
- Place three small, accessible `?` disclosures beside the few concepts that need context: schedule fit, the seven-day assigned-time bars, and the distinction between known reviews and conditional revisits.
- Keep help hidden by default, available on mouse hover, keyboard focus and touch activation; use ordinary HTML details elements with no data writes.
- Keep visible research limitations, actual scheduling warnings, incorrect-recall safeguards, local-storage safety notices, backup guidance and destructive-action confirmations.
- Refresh the app version and offline worker cache to `active-recall-web-v4-43`. The v4.41 adaptive favicon URLs remain unchanged.

## Verification and release gate

1. Run the full deterministic test suite and syntax checks; confirm the old caption is absent, just three contextual tips are rendered, and safety warnings remain.
2. Run GitHub Actions with desktop and mobile Chromium hover, keyboard and touch checks, as well as storage nonmutation, calendar, schedule, backup/restore and offline HTTPS regressions.
3. Merge only after the draft PR's CI succeeds; verify live GitHub Pages assets match the tested tree byte-for-byte, and sync local `main`.

## Rollback

Last verified release: v4.42, commit `23875102009450e281acf2fa56937146c0c81c8c`. Revert this release's display and cache changes if tooltip usability fails, without clearing browser storage or changing learner records. No storage migration is involved.
