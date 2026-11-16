# Blueprint 2.7 — Rolling spaced-review agenda (release candidate)

**Status:** Complete and locally tested; **not yet deployed** to the public GitHub Pages branch. Current live website remains v2.6 until the site files are updated. This entry preserves the decisions and acceptance criteria.

## Main product goal

A zero-payment, browser-local, automatically recalculating study calendar across all courses. New verified material, assessment deadlines, prior attempts, missed days and changes in time availability determine feasible study opportunities. Users may still select 5–720-minute Study Now sessions.

## Tested implementation in local v2.7 release package

- The core now exposes `buildReviewAgenda` (7–42 days), honouring weekday/weekend study minutes, blocked dates and daily reserve time.
- The first scheduled opportunity reflects a real due date (or an unattempted target). Later **conditional spaced revisits** are only planning placeholders; they never imply future success and are not saved as completed attempts.
- The plan reports review overflow instead of overfilling available time, and assessment coverage reports opportunities rather than predicted grades.
- Calendar availability preferences are saved in the local schema-v5 database as an optional field; earlier backups lacking it remain compatible.
- Study Now gives preference to today's calendar targets when feasible, while retaining the wider queue for longer sessions.
- Rule-generated questions are held out of study and scheduling until a learner explicitly verifies them against the source.
- 149 automated tests passed, including 14 calendar-focused tests; 6 GitHub Pages static checks passed; Chromium desktop/mobile UI tests passed without script errors or horizontal overflow.
- A 500-target / 42-day local benchmark completed in approximately 0.43 seconds after optimisation (device-dependent; not a performance guarantee).

## Scientific qualifications

General retrieval-practice and spacing effects have solid evidence, but the precise calendar gaps, urgency weights, duration estimates and Again/Hard/Good/Easy memory intervals remain **provisional heuristics**, not individually validated optimal schedules. This update does not yet replace the memory model with a calibrated model or fully solve source-grounded question creation. Future followups are conditional; missed study does not prove forgetting. No background work or synced appointments are claimed.

## Permanent zero-cost constraint

Free public GitHub Pages hosting; no paid API, subscription, billing details, paid infrastructure or required external AI service. Study data remain local; JSON backups must not be committed to the public repository.

## Next work

1. Publish the tested v2.7 static-site files together in one atomic commit and verify the Pages run and live diagnostics.
2. Test with real browser-local saved data after exporting a backup first.
3. Improve question generation through source-grounded objective/relationship extraction, coverage audits and meaningful explanation rubrics.
4. Compare simple memory scheduling with a free, properly evaluated candidate such as FSRS using independently tested delayed retrieval outcomes.

The extensive academic baseline is preserved in `docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md`.
