# Blueprint 4.36 — Clean editorial pages

## What changes

- Hide repetitive eyebrow captions above major page titles, empty promotional hero descriptions, and redundant page introductions, while preserving meaningful recall-focus and source context.
- Remove the generic footer slogan, sidebar promotional paragraph, duplicate top breadcrumb, fake profile avatar and free-version badge.
- Preserve the functional **Site diagnostics** link on the Progress page. Retain privacy/backup controls, explicit data-loss and unsaved-changes warnings, study instructions, and the completed-session save confirmation.
- Keep all Moon colors, Times New Roman, responsive navigation, buttons and cards. No new images, font downloads, accounts or cloud services.
- Bump the app's offline cache to `active-recall-web-v4-36`; put the version in entry/diagnostics metadata instead of a visible ornament.

## Verification gate

1. JavaScript syntax and `git diff --check` clean.
2. Every deterministic Node regression passing, including `test-clean-captions.cjs`, `test-deploy-preflight.cjs`, and the existing complete scheduling/backup suite.
3. Independent GitHub Actions Chromium desktop/mobile checks, including enhanced `test-moon-theme-browser.cjs` confirming that page introductions and decorative chrome are hidden, that diagnostics remain reachable, that mobile layout still fits, and that navigating between pages creates no study record.
4. HTTPS GitHub Pages-path worker and offline reload: `moon-theme.css` remains cached; local attempts, due dates, and schema-v5 JSON export remain unchanged.
5. Draft PR, review independent green checks, merge with expected head SHA, then verify live HTML/CSS/JS/worker bytes and the public diagnostics URL.

## Rollback

Known-good prior release: v4.35 at `87101b86bedce5cee221c20d5f91bcf680512d9f`. Restore its theme and shell in a reviewed PR if removing captions obscures important context. **Do not** delete user IndexedDB records or clear browser storage; this release has no data migration. Cached pages can require an ordinary reload after a later deployment.
