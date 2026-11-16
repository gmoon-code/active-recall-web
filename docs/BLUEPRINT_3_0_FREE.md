# Blueprint 3.0 — Source-linked objective map & safe rewordings

**Release:** 16 November 2026 · **Hosting:** Free GitHub Pages · **Database:** unchanged v5

Active Recall Web remains a unified automatic multi-course active-recall calendar with source-linked goals, review history, assessment deadlines, and time budgets. This release adds a *read-only* learning objective map organised by actual saved sources and section headings, plus conservative alternate wordings of an already approved Question Studio recall target.

## What has changed
- In **Knowledge**, a Learning objective map groups explicitly saved objectives by source, shows section labels when recoverable, counts independently scheduled recall targets versus question wordings, and displays due and held-for-review states.
- In **Knowledge → recall focus → + Variation**, a learner may preview a proposed alternate wording only for unchanged, source-backed, user-verified Question Studio questions. The learner must examine and explicitly save the proposed wording. It receives the **existing target ID and review date**, never a new independent obligation.
- Unsupported, ambiguous, edited, source-revised, and unverified items receive no automatic rewording; manual authoring is still possible.
- No automatic approval, fake recall attempt, mastery estimate, or generated answer beyond the saved exact source excerpt.
- No schema migration; existing v5 notes, rubrics, review records, assessment dates, and backups stay compatible.

## Quality checks
185/185 automated tests, six GitHub Pages static preflight checks; Chromium end-to-end simulated-storage workflow passed with no JS errors, one target and two wordings, and no mobile horizontal overflow at 390 px.

## Scientific and practical limitations
This is **not** a validated semantic syllabus/concept map or scientifically proven question generator. A saved source can be wrong. These deterministic English templates do not handle arbitrary diagrams, chemical equations, maths, multilingual concepts, or complex transfer problems. Source coverage is a count of *parseable statements*, not curriculum mastery. All existing scheduling interval coefficients are provisional engineering rules, not universally optimal memory parameters. Browser data does not sync between devices; export backups regularly.

**Permanent zero-payment requirement:** no required paid hosting, paid AI API, payment details, subscription, or server. The app's static files live in public GitHub Pages; personal learning history remains local in the browser, not in GitHub.

Research foundation: [Evidence review and engineering specification](./RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).
