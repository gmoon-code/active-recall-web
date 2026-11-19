# Active Recall Web — Blueprint 4.20

## Quality-gated prospective prediction evidence

The free local study app began recording two fixed, unfitted pre-answer interval-curve hypotheses in v4.19. This release adds a **read-only audit** of how those frozen guesses line up with actual, delayed written outcomes. It does **not** train FSRS, select a winner, introduce a new interval formula, change the question queue or make an educational effectiveness claim.

### Where to inspect the evidence

Open **Progress → Prospective prediction evidence check**. The audit:

1. Starts only from an existing v4.19 receipt attached to a genuinely completed study attempt. The predicted timestamp must precede the response; its prior practice timestamp must match an actual earlier attempt of the same target and requirement versions. Edited objectives and first attempts cannot inherit an old forecast.
2. Requires **at least 24 hours** since the real preceding practice *at both question selection and completion*. Hint-assisted practice resets that delay clock even though assisted work does not become a scored observation.
3. Excludes assisted, immediate-post-study, non-written and unverified-source attempts. Self-reported `Again/Hard/Good/Easy` is **not** converted to a correctness label.
4. Keeps exactly five separate evidence streams: factual Recall with strict learner-approved literal strings; Explain and Apply with the learner's own manual rubric judgments; and Explain and Apply with a human review attributed to another person. The latter role is not independently verified; the reviewer can see the reference. Inconclusive judgments and reviews after a later attempt on the same target are excluded.
5. Shows counts for usable forecasts, distinct recall targets and narrow positive/negative labels. Display gates and exclusions are inspectable, including older attempts and missing receipts.

### Scoring is intentionally withheld by default

The app will only show **descriptive target-balanced Brier errors** when one *individual evidence stream* has at least **50 qualifying predictions across 15 distinct targets**, with **10 positive and 10 negative labels**. These numbers are conservative presentation gates, **not evidence of statistical power, independent observations or a validated memory model**.

For each frozen curve prediction `p` and narrow binary observation `y` (0 or 1), the Brier error is `(p - y)²`. The app first averages observations for each target, then gives **each target equal weight**. The two displayed numbers, if available, are for the fixed v4.19 exponential and hyperbolic hypotheses, not for FSRS, and no winner is chosen. Smaller values mean closer agreement with a particular literal-match or manual-review label **on the currently selected study opportunities**, not more effective spaced scheduling.

### Important scientific limits

- Both hypotheses inherit the existing interval heuristic and assume an **arbitrary 90% value at the prior due interval**. The anchor is not measured, calibrated, or a claim of due-day retrievability.
- A literal mismatch may be a correct synonym; complete manual rubric support is not independently verified factual mastery. These label types must never be pooled.
- Actual questions were selected under the **current scheduler** and the learner's available time; counterfactual shadow dates do not provide outcomes for sessions that never happened. Multiple records per target are dependent, and equal-target averaging only partly addresses that issue.
- No held-out future experiment, external validation, formal uncertainty estimate, bias correction, model optimization, or causal test has been run. These error summaries, if ever displayed, are **descriptive diagnostics**, not a reason to switch to FSRS.
- Old records are never assigned retroactive forecasts or labels; up to 50,000 recent attempts are scanned locally. Reading the audit does not write events or change the underlying database.

### Compatibility and verification

No new database fields, network services, paid dependencies, accounts or backend. Existing schema-v5 JSON backups remain compatible, as do old attempts with no prospective receipts. Deterministic tests cover absent and self-rated-only labels, literal outcome pairing, version/lag restrictions, assisted and oral exclusions, review provenance and timing, early score suppression, minimum-gate scoring and read-only invariants. GitHub browser CI verifies visible results, mobile layout, reload and unchanged saved attempts/memory.

### Primary technical references

- [scikit-learn: Brier score for probabilistic binary outcomes](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.brier_score_loss.html)
- [Open Spaced Repetition: evaluation metrics](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Metric)
- [Anki manual: FSRS review-history optimization](https://docs.ankiweb.net/deck-options.html#fsrs)

**Next gate:** accumulate valid prospective observations naturally, audit human review validity and held-out chronology, and only then consider a genuine fitted FSRS candidate for offline comparison. Any actual review-policy change would require separate evidence and explicit user choice.
