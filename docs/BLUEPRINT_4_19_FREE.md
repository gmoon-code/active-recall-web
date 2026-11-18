# Active Recall Web — Blueprint 4.19

## Prospective, unfitted recall-curve receipts — without changing the real scheduler

The v4.18 audit found that saved due dates and alternative intervals were **not probability forecasts**. This increment records two fixed, openly provisional mathematical hypotheses **at the moment Study Now selects a previously practised target**, before the learner reveals the reference answer or rates their performance. The saved receipt remains attached to that attempt, including across local backups. The hypotheses never choose the next question, move a due date or mark a response correct.

### Precisely what is captured

Only for an already-practised, unchanged requirement and retrieval target with matching active memory:

- The current requirement, target, and question-variation versions, the timestamp at question selection, the actual earlier practice time, prior due date and interval length.
- Two fixed numerical hypotheses at the actual time since the last practice. Let `t` be elapsed days and `I` the previously saved scheduled interval in days. **Exponential:** `0.9 ^ (t/I)`. **Hyperbolic:** `1 / (1 + t/(9 I))`.
- Both curves are arbitrarily set to **0.90 at one scheduled interval**. This value is a convention for inspecting shape differences, **not observed retention, a scientifically justified 90% target, fitted FSRS parameters, a guarantee of recall or a recommended interval**. The model IDs and formulas are frozen as `interval-shapes-v1` and must never be silently revised.

An initial, missing or changed-version target produces **no receipt**, even when an old due date remains in storage. The prediction is not generated after the rating. The session holds it when the question first appears, and it is saved to the attempt only after the learner finishes and rates it. An abandoned question does not count as an observed outcome. A session more than six hours old stores no predictive receipt for that question. Returning from a pause or reload does not reconstruct a missing receipt using hindsight.

### Evidence and use

**Progress → Memory-model evaluation readiness** now shows how many completed attempts actually carry a frozen pre-answer receipt, how many are independently eligible as delayed written practice and how many of the separate literal/self-reviewed/other-person-reviewed streams can be paired with those receipts. Having a numerical prediction is not proof of correctness: the outcomes are still local learner reports, strict literal agreement or potentially unblinded human judgment. No model accuracy, forecast calibration, predicted exam score or FSRS comparison is displayed.

The current scheduling algorithm is untouched. These two unfitted shapes are **not competing scheduling policies**, so observing their predictions cannot establish that switching intervals would improve retention. Data availability depends on normal study behaviour; learners need not create unnatural sessions to populate the dashboard. Do not collect student private data or use this as a scientific evaluation without a separate validation design and review-quality safeguards.

### Scope and verification

All processing is local/offline; no accounts, backend, network request, pricing or payments. No schema change (still v5); older backups without receipts remain compatible. Receipts have strict validation against saved attempt identity/version, frozen earlier due/interval, timestamp and mathematical formula. New checks cover missing/edited/invalid histories, refusal of stale/reconstructed/tampered guesses, backup round trip, unchanged real active intervals, full browser selection-to-rating flow, and mobile Progress display. All historical attempt and memory data remain intact.

### Research context

- [Anki manual: FSRS review-history optimization and parameters](https://docs.ankiweb.net/deck-options.html#fsrs)
- [FSRS optimizer open-source implementation](https://github.com/open-spaced-repetition/fsrs-optimizer)

**Next gate:** once prospective evidence quality and sample sizes are plausible, plan a genuine held-out evaluation with clearly separated evidence modalities. A proper FSRS candidate should be implemented and validated independently; neither v4.19 hypothesis pretends to be FSRS.
