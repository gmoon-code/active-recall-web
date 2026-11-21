# Blueprint 4.44 — Smaller contextual-help marks

## Scope

- Reduce the visible circular `?` icon on the schedule-fit, seven-day-bar and known-versus-conditional-review headings from 20px to a thin 14px gray outline.
- Reduce its visible type weight and tighten title spacing. Preserve the 28px pointer/touch target, keyboard focus ring and hover/tap disclosures.
- Do not change any tooltips' explanatory content or add extra help marks. Research warnings remain visible.
- Refresh version metadata and the offline cache to `active-recall-web-v4-44`; keep the adaptive v4.41 favicon unchanged.

## Verification and release gate

1. All deterministic tests and syntax checks pass; browser QA confirms the visual ring is 14px, its touch target is at least 28px, and every previous disclosure works.
2. GitHub Actions passes desktop/mobile, stored-record, backup and HTTPS offline tests.
3. Publish only after green CI and compare GitHub Pages assets to the verified tree.

## Rollback

Previous verified release: v4.43, commit `f7ae747aec092658c906fd1e6d6c0019f4be16b8`. Restore the prior CSS and offline cache if users cannot distinguish the smaller icon. No migration, grade, due-date or study-record changes occur in this release.
