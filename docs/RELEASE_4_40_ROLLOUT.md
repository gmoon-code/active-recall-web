# Blueprint 4.40 — Simple [ar] logo

## Scope

- Replace the star in the sidebar and Site diagnostics with the exact text `[ar]`.
- Remove the sidebar mark's solid square and keep the existing Moon Times New Roman typography, near-black ink, white background, and restrained spacing.
- Replace the SVG favicon with the same wordmark and regenerate the 192px and 512px installable app icons from it.
- Keep all app views, controls, study records, saved schedules, import/export, and schema-v5 JSON backups unchanged.
- Refresh release metadata and the offline asset cache to `active-recall-web-v4-40`.

## Release gate

1. New deterministic logo assertions, all prior Node tests, JavaScript syntax, and `git diff --check` pass.
2. GitHub Actions Chromium checks the sidebar wordmark's exact text and transparent background alongside desktop/mobile Moon appearance and workflows.
3. The icon assets remain valid at both published sizes; HTTPS offline reload and full backup/restore checks pass.
4. Merge only after the draft PR's GitHub Actions pass, then compare deployed bytes with the tested release.

## Rollback

Known-good previous release: v4.39, commit `513649f6378fbe773f822b5906202cc71b53f972`. If icons render poorly or become unreadable at small sizes, restore the v4.39 mark and offline-cache version in a reviewed change. Do not clear local study data: no persistence or scheduling migration is involved.
