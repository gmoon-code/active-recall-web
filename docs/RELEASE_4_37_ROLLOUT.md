# Blueprint 4.37 — Full-height Moon highlighters

## Scope

- Replace the `63%–84%` background stripe on highlighted headings with a solid colour behind the full text height.
- Display page titles as inline text fragments so wrapped title lines do not create a broad highlighter rectangle beyond their words.
- Use the same colour and line-height treatment for card and section headings, including the recorded study rhythm.
- Update the diagnostics page heading to match. Keep the section colour system, accessible black text, mobile layout and all other site controls.
- Version the offline worker as `active-recall-web-v4-37` so existing installations receive the new stylesheet.

## Release gate

1. JavaScript syntax, `git diff --check`, and full deterministic Node regressions pass.
2. Independent desktop/mobile Chromium checks verify each page's computed highlighter background colour, absence of the former narrow gradient, text-specific inline page titles, heading line fragments, no horizontal overflow, and unchanged local study records.
3. HTTPS offline reload, JSON export and saved due dates remain intact, and diagnostics still load.
4. Merge a draft PR only after GitHub Actions passes; check deployed HTML, CSS, worker and diagnostics byte hashes against the tested release.

## Rollback

Known-good previous release: v4.36, commit `376125fcefcf597892f00046d6fd1e88e064fbae`. Restore its CSS and cache version in a new reviewed PR if full-height highlights obscure text, increase line spacing excessively or break wrapping. Do not clear user browser storage: this is an appearance-only release with no data migration.
