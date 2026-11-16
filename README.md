# Active Recall Web — Free Edition v2.9

A unified browser-local learning system with a rolling, capacity-aware multi-course active recall agenda. Fully free on public GitHub Pages, with no paid hosting, API keys, subscriptions, credit cards or required accounts.

## New in v2.9

**Question Studio** (Knowledge → Source notes → Question Studio) suggests prompts from explicitly described definitions, mechanisms, causes, contrasts, conditions, numerical relationships and effects. Each candidate has an exact source excerpt and is **held for human verification**. Unverified drafts do not enter the study calendar. The source and its version remain linked. The system does not claim to fact-check scientific content or grade learner answers.

The previous v2.8 audit, v2.7 recurrent study calendar, v2.6 PDF missing-page safeguards, independent rubric checks, and JSON backup support remain available. No data-schema migration is required.

## Deployment (free)

GitHub Pages: https://gmoon-code.github.io/active-recall-web/  
Diagnostics: https://gmoon-code.github.io/active-recall-web/health.html  
Publish `main` / `(root)` as a public GitHub Pages site. Do not upload personal learning backups or sensitive notes to this public repo. Data stays in the browser and is not automatically synced. Export JSON backups regularly.

## Evidence and limitations

See [`docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md`](docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md), `docs/BLUEPRINT_2_9_FREE.md`, and earlier specifications for the cognitive-science rationale. Retrieval and spacing are well-supported general principles, but this prototype's exact review intervals and its rule-based question generation are **not** scientifically validated as optimal.
