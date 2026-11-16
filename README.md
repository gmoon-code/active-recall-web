# Active Recall Web — Free Edition v3.0

A unified browser-local learning system with a rolling, capacity-aware multi-course active recall agenda. Fully free on public GitHub Pages, with no paid hosting, API keys, subscriptions, credit cards or required accounts.

## New in v3.0

**Question Studio** (Knowledge → Source notes → Question Studio) suggests prompts from explicitly described definitions, mechanisms, causes, contrasts, conditions, numerical relationships and effects. Each candidate has an exact source excerpt and is **held for human verification**. Unverified drafts do not enter the study calendar. The source and its version remain linked. The system does not claim to fact-check scientific content or grade learner answers.

The previous v2.8 audit, v2.7 recurrent study calendar, v2.6 PDF missing-page safeguards, independent rubric checks, and JSON backup support remain available. No data-schema migration is required.

## Deployment (free)

GitHub Pages: https://gmoon-code.github.io/active-recall-web/  
Diagnostics: https://gmoon-code.github.io/active-recall-web/health.html  
Publish `main` / `(root)` as a public GitHub Pages site. Do not upload personal learning backups or sensitive notes to this public repo. Data stays in the browser and is not automatically synced. Export JSON backups regularly.

## Evidence and limitations

See [`docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md`](docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md), `docs/BLUEPRINT_2_9_FREE.md`, and earlier specifications for the cognitive-science rationale. Retrieval and spacing are well-supported general principles, but this prototype's exact review intervals and its rule-based question generation are **not** scientifically validated as optimal.

## Blueprint 3.0: Objective map and safe question variants

The Knowledge page now contains a **Learning objective map** showing saved objectives by source and section, individually scheduled recall focuses, alternative question wordings, due items, and held drafts. Verified, unchanged Question Studio items may offer conservative source-backed rewordings in **+ Variation**; selecting a suggestion fills a form, never auto-approves a new question or due date. Prior local schema-v5 data and JSON backups remain compatible. [Read the v3.0 specification](docs/BLUEPRINT_3_0_FREE.md).
