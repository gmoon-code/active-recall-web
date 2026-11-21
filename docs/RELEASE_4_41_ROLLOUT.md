# Blueprint 4.41 — Transparent, adaptive [ar] icons

## Scope

- Remove the opaque white square from the `[ar]` tab favicon and installed-app icons.
- Use SVG `prefers-color-scheme` to select dark lettering for light browser themes and light lettering for dark themes. A thin opposite-ink outline keeps the wordmark readable against more coloured backgrounds without creating a tile.
- Regenerate 192px and 512px PNG icons on a transparent canvas; PNG icons cannot automatically change colour with the device theme, so keep the thin high-contrast outline.
- Version the favicon URL and installed-icon URLs to avoid stale browser icon caches; include versioned and bare icon paths in the offline precache and advance the cache to `active-recall-web-v4-41`.
- Preserve the site's intentionally white page layout, `[ar]` navigation mark, entire study experience, scheduler, stored study records, and schema-v5 JSON backup semantics.

## Release gate

1. The SVG contains no opaque tile and includes both light and dark CSS rules. The PNGs have transparent corner alpha bytes, real image data, and the required dimensions.
2. Deterministic tests, syntax checks, `git diff --check`, and GitHub Actions Chromium desktop/mobile, backup/restore, and offline HTTPS checks pass.
3. Confirm GitHub Pages serves the exact tested favicon, manifest, PNG assets, HTML and offline worker after CI passes, before reporting publication.

## Browser limitation

Most browsers derive SVG favicon colour preference from light/dark appearance, rather than sampling the actual tab-strip colour. On arbitrary coloured tab themes, the thin opposite-colour outline improves contrast but cannot guarantee an exact automatic colour match. Raster installed icons are transparent but static by design.

## Rollback

Known-good previous release: v4.40 commit `f79ab74708c0b64a990d05c02f8e1e2648effbec`. If the transparent favicon becomes illegible on particular browsers, restore the v4.40 icon assets through a reviewed follow-up, without clearing any learner data.
