# Blueprint 4.38 — Clear, accurate headings

## Scope

- Use **Active recall** for the homepage title, browser tab, and installed app name, replacing the two-line tagline.
- Give actual study pages concise, accurate headings: Courses and materials, Questions and answers, Lecture notes, Assessments, Study now, Progress, and Study calendar.
- Rename vague or question-shaped section titles with functional labels; retain the meaning of evidence and safety headings, including FSRS audit labels and data/privacy controls.
- Keep the existing Moon colours, full-height heading highlights, fonts, navigation, accessible controls and minimal subtitle treatment.
- Update the diagnostics title and versioned offline cache to `active-recall-web-v4-38`.

## Release gate

1. `node --check app.js`, the new plain-heading assertions, `git diff --check`, and the entire deterministic Node suite must pass.
2. GitHub Actions desktop/mobile Chromium tests verify the new homepage and page headings, existing highlighter coverage, keyboard/mobile navigation, and no study-record changes from visiting pages.
3. The HTTPS offline reload, saved records, JSON backup and restore workflows, and diagnostics continue to pass without data migration.
4. Merge the draft PR only after independent CI is green; compare live GitHub Pages files with the tested release after deployment.

## Rollback

Known-good previous release: v4.37, commit `37e0f6c22771fe17c633253efcb5322a34bf4b74`. If headings misidentify an action, lose accessibility, or make content confusing, restore its wording and offline-cache version through a new reviewed change. Do not clear browser storage: this update only changes presentation text and has no data migration.
