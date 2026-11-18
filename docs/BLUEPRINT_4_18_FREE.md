# Active Recall Web — Blueprint 4.18

## Is our data ready for an Anki-style memory-model evaluation?

**No model is trained, evaluated, enabled, or used to move review dates in this release.** This is a browser-local, read-only audit answering a narrower question: what genuinely delayed answer evidence is available, and which missing pieces prevent an honest model comparison?

### Where to see it

Open **Progress → Memory-model evaluation readiness**. The panel reports:

- Distinct, version-matched retrieval targets and written answers captured at least **24 hours** after an actual previous practice of the same target and version. Shorter attempts, hints and immediate-post-study work do not become delayed observations. Assisted practice *still resets* the latest-practice clock.
- **Three non-interchangeable evidence sources**: strict agreement to a previously approved literal key on a short factual answer; manual criterion judgments reviewed by the learner; and manual judgments attributed by the learner to another person. Other-person reviewer identity is not verified. Literal agreement can reject correct synonyms. None provides verified exam grading.
- Separately counts *Recall*, *Explain* and *Apply* observations. Self-ratings without matching literal checks or usable manual judgments remain visible as comparable attempts, but **are not relabeled as graded correct/incorrect**.
- For each evidence source, an **illustrative chronological 80%/20% partition** and the number of distinct targets in the later group. This does *not* train a model, ensure target independence, constitute a holdout test, or establish sufficient sample size.
- Exclusions with reasons: invalid/missing version or timestamp, first attempt/version edits, too-short delays, assisted or immediate attempts, non-written responses, unverified questions, absent outcome labels, manual review conducted after further practice, and inconclusive human review. Only the most recent 50,000 attempts are scanned.
- A clear blocker: **zero prospective model probability forecasts**. The current scheduler stores its **actual interval and due date**, alongside a hypothetical conservative interval. These are *not* probability estimates or counterfactual outcomes.

### Why this precedes FSRS

Anki's FSRS optimizes memory-model parameters against actual rating histories and schedules using an estimated probability of recall. Active Recall Web currently applies simple transparent interval rules and adds calendar-capacity and deadline priorities. Anki-style optimization and fair prospective comparison are distinct questions: neither the existing ratings nor a different *suggested due date* proves one policy would improve subsequent memory. Before claiming a probability model improves outcomes, a future study would need time-stamped forecasts recorded **before** subsequent attempts, carefully separated observation labels, enough delayed repeats, held-out chronology, and controls for practice-selection bias and question changes. Independent review quality needs separate study; other-person and self-review must not silently be treated as blinded, verified exam judgments.

This dashboard is deliberately an **evidence accounting and research-planning aid**, not a readiness certification. No minimum count in the panel implies statistical adequacy. Learners need not change their natural study habits to fill it.

### Privacy, compatibility and regression checks

No new network calls, accounts, services, charges, saved state, database fields or changes to schema v5. Existing JSON backups import as before. Reading the audit cannot create attempts, judge existing answers, change due dates, select different questions, alter availability or schedule sessions. Synthetic deterministic tests cover zero and malformed histories, version boundaries, strict literal labels, manual review timing, evidence provenance, the 50,000-record limit and read-only invariance. Browser CI checks Progress, mobile width, reload and persisted attempt/memory invariance.

### Primary research sources

- [Anki manual: FSRS parameters, optimization and health check](https://docs.ankiweb.net/deck-options.html#fsrs)
- [Open Spaced Repetition: FSRS optimizer source](https://github.com/open-spaced-repetition/fsrs-optimizer)
