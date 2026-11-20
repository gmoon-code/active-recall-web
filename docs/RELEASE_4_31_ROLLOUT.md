# Active Recall Web v4.31 — exact-hour short retry readiness

## Invariant

The active `transparent-interval-v1` policy still assigns **Again** a one-hour retry. This release changes only whether a question with that pending retry is *ready to be selected in Study Now*. The day-granularity calendar may show it as an opportunity later on its due date, but the live queue must not offer the question earlier than its saved `dueAt` timestamp. New or already-due questions remain eligible. When a retry becomes due, a waiting Overview or Study Now page refreshes its readiness automatically; no invented attempt or memory update occurs. The ready-queue guard applies equally to the ordinary session preview and read-only priority inspector, without modifying other ranking scores.

This guard does **not** fit FSRS or change any stored interval, grade, assessment, note, history, outside-study record, or schema-v5 JSON backup. It is a consistency correction to the provisional hourly rule, not scientific validation of the one-hour learning step or a universal optimal schedule. No account, subscription, network study-data upload or extra learner decision is introduced.

## Release gate

1. Start from published v4.30 on `main` and do not rewrite past attempts or saved due dates.
2. Run `test-short-retry-readiness.cjs`: same-day and midnight-spanning exact-hour boundaries, simultaneous new questions, calendar-day versus actual-hour distinction, unchanged memory, and the simple Overview / Study Now waiting-and-wake behavior.
3. Run the full deterministic suite, JavaScript syntax checks, GitHub Actions Chromium desktop/mobile regression suite and HTTPS offline reload with the new `active-recall-web-v4-31` worker cache.
4. Keep any pull request as draft until the release gate is green; publish through GitHub Pages only after success. Verify the version label and an empty-history Study Now path on the live site without clearing any real learner data.

## Later scientific work

This narrowly prevents a same-day planning artifact from prematurely showing a one-hour retry. The **one-hour value** itself remains an unfitted heuristic. Any future FSRS-based change requires valid delayed outcomes, transparent assessment of label quality, time/capacity tradeoffs, separate evidence streams, and a versioned rollback plan. No single spacing strategy is scientifically proven best for all learners and materials.
