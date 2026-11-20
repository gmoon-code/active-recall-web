# Blueprint 4.35 — Moon editorial theme rollout

## Scope

- Align with the established personal website at `https://gmoon-code.github.io/`: Times New Roman, white paper, `#111111` text, thin grey dividers, no decorative shadows, 4px corners.
- Apply the exact Moon highlighter order and values: yellow `#f5f566`, green `#66f566`, turquoise `#66f0f0`, magenta `#f066f0`.
- Keep all eight destinations readable on narrow phones; restyle Study Now, question editors, calendar, progress, dialogs, alerts, and diagnostics.
- Add `moon-theme.css` after the existing stylesheet, cache it under `active-recall-web-v4-35`, and refresh SVG/PNG PWA icons.
- No storage, backup schema, study interval, priority, ratings, data migration, network service, or billing changes.

## Candidate checks

1. `node --check app.js` and `node --check test-moon-theme-browser.cjs`.
2. `node --test` with every deterministic test in `.github/workflows/offline-checks.yml`, including `test-moon-theme.cjs` and offline preflight.
3. GitHub Actions desktop/mobile Chromium smoke, specifically `test-moon-theme-browser.cjs`; confirm yellow, green, turquoise, magenta page accents, serif text, white backgrounds, 4px cards, 360px/390px phone fit, navigation without study-data writes, and no page errors.
4. HTTPS service-worker offline test: confirm the v4.35 cache and successful offline reload preserving an IndexedDB notebook and due dates; confirm `moon-theme.css` is cached.
5. Inspect `index.html`, `health.html` and the manifest at the published GitHub Pages subpath. Compare their delivered bytes with the released commit before marking done.

## Release gate

- Keep the PR draft until independent automated checks pass.
- Merge with the exact expected head SHA only if the branch remains unchanged, then verify the post-merge workflow and Pages deployment.
- Preserve the previous v4.34 release as a known-good rollback point. Never clear local browser storage to deploy a theme.

## Rollback

The previous production commit is `d7b5e9895c7e43a40db89f5dc401bcab9930da75` (v4.34). If theme or mobile issues are found, revert the v4.35 merge using a new reviewed PR or restore the previous commit’s visual files and cache version in a new branch. Do not roll back IndexedDB, delete stored questions, or replace user JSON backups: the release introduces no data migration. A stale offline worker may require an ordinary reload once the rollback publishes.
