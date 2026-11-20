# Blueprint 4.39 — Monthly study calendar

## Scope

- Add a read-only, Monday-first monthly calendar **below** the existing Daily review plan list, keeping its 7–42-day selection and 21-day default.
- Navigate any valid month through Previous, Next, Today, and month-jump controls; inspect an individual day.
- Inside the rolling planning horizon, show exactly the same known review opportunities, conditional revisits, syllabus preparation and capacity constraints as the list.
- For later months, show only saved due dates, assessments and unavailable dates. Do not extrapolate future successful answers, promise new study slots, or silently change the scheduler's validated 42-day maximum.
- For past days, show only real dated plan snapshots, revisions, attempts and logged outside-study minutes; missing data never implies a missed commitment.
- Keep the Moon design and accurate headings, add accessible keyboard navigation and mobile-responsive seven-column grid, and include the small month-view module in the offline cache.
- Refresh release metadata and cache to `active-recall-web-v4-39` without changing the schema-v5 notebook.

## Release gate

1. Full deterministic Node suite, month-grid leap-year/boundary/due-date/history tests, JavaScript syntax, and `git diff --check` pass.
2. GitHub Actions Chromium verifies month navigation, current and long-range dates, selected-day details, mobile width, preservation of the original daily list, and no invented attempts, due-date changes, or plan revisions from browsing.
3. HTTPS Pages-path offline reload, backup import/export, safe storage and all prior browser tests remain green.
4. Open a draft PR for independent CI, merge only when green, and check live deployed file hashes against the tested tree.

## Rollback

Known-good previous release: v4.38, commit `98b2170d726fea0ce217778f86dae5c5f479a2cc`. If month navigation or its read-only labels misrepresent known due dates or history, revert its module, UI/CSS and cache manifest through a reviewed release. Do not clear browser storage or import an older backup: this is a presentation-only addition, not a data migration.
