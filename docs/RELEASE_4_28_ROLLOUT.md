# Active Recall Web v4.28 — prospective FSRS evidence release

## Scope and safety invariant

The existing `transparent-interval-v1` policy still computes every real due date and study priority. A new **optional**, never-displayed FSRS-7 default-weight probability can be captured before reference reveal for a target with a complete, same-version, unassisted written review sequence. It is saved only with a **real rated attempt** and is separate from the older unfitted-curve receipt. A skipped question, an ineligible history, or a model calculation that finishes after reference reveal must not create a prediction receipt. No FSRS parameter fitting, model switching, user account, cloud transmission, or paid service is introduced.

The optional `attempt.fsrsForecast` field remains in schema-v5 JSON backups. The import validator checks structure, previous-attempt metadata and the attached original pre-answer curve receipt. It **cannot prove** the recorded probability came from the vendor: any future scientific scoring must independently replay and verify the preceding model state. Historical attempts without this field are valid and must not be backfilled.

## Before merge

1. Review the diff for just the optional shadow path, historical integrity, cache-version update, tests and release notes.
2. Run every deterministic test, including `test-fsrs-shadow.cjs`, `test-prospective-forecast.cjs`, backup import tests and deployment preflight. Verify the previous policy and all schema-v5 imports still pass.
3. Require GitHub Actions Chromium checks, especially `test-fsrs-shadow-browser.cjs`: a pre-answer receipt on a real session, persistence after rating, no active-schedule change, and exclusion of a calculation completed after reveal.
4. Require the temporary HTTPS subpath test to reload entirely offline with the new `active-recall-web-v4-28` cache and IndexedDB intact. Verify `health.html` inspects that exact cache and reports Blueprint 4.28.
5. Preserve the existing GitHub Pages audience and zero-cost, browser-local architecture. Do not merge an unknown failing check.

## After merge and Pages publication

1. The learner should retain an independent private JSON backup; do not use or upload it for QA.
2. In a disposable browser profile with fictional data, open the live home, Study Now, Calendar and Progress. Verify the 4.28 label and the new read-only FSRS evidence count; no probability should appear during answering.
3. Run `health.html` checks and its separate test-database reload. Confirm essential files, v4.28 offline cache and storage read/write/reload without touching the learner notebook.
4. If an offline toggle is available, load once online, go offline, reload, read the fictional notebook, and reconnect. Hosted offline verification is stronger than a source-only check.
5. If an essential failure is found, stop promotion and revert through a reviewable new commit (not a force push or user-data reset). Keep old JSON backups compatible and explain the impact. A stale version label alone can be ordinary CDN/browser propagation.

## Limits and next evidence gate

Default-weight FSRS-7 produces a **model guess** conditioned on a learner's grades, not independently measured recall. Even a future Brier score on literal agreement or manually reviewed explanations will not establish causal learning benefits, verified general retention, or an optimal schedule. The next step is a history-replayed, time-forward evaluation that separates factual agreement from self- and other-person-reviewed explanations, checks prediction provenance, reports exclusions and label diversity, and abstains when data are insufficient. Do not change active intervals or label FSRS as superior without this evidence and an explicit review gate.
