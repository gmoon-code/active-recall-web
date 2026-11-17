# Blueprint 3.9 — Prospective, versioned review-policy comparisons

**Release:** November 17, 2026. **Hosting:** free GitHub Pages. **Privacy:** all learning evidence remains in the learner's browser. **Database:** schema v5 unchanged.

## The research and engineering problem

Retrieval practice and distributed review are supported in general, but the fixed interval multipliers in Active Recall Web have not been validated as optimal for any individual learner or task. The v3.8 delayed-retrieval audit preserves timing and learner-written self-ratings; it does **not** supply objectively graded delayed recall, calibrated probabilities or controlled comparisons.

This release records prospective, versioned scheduling *decisions*, alongside a read-only shadow alternative. **It does not change the active scheduler or claim to establish educational effectiveness.**

## Interval policies

| Scheduling rating | Existing active policy (days) | Deliberately more frequent shadow (days) |
| --- | --- | --- |
| Again | 1/24 | 1/24 |
| Hard | max(0.5, previous × 1.25, 1) | max(1, previous × 1.10) |
| Good | max(2, previous × 2.15) | max(1.5, previous × 1.8) |
| Easy | max(4, previous × 3.0) | max(3, previous × 2.4) |

Both interval proposals are capped at one day when the learner used assistance. A reported missing or uncertain explanation criterion can make a Good or Easy self-rating **Hard for scheduling**, without overwriting the learner's original rating.

The fixed active policy is labelled `transparent-interval-v1`. The comparison is labelled `conservative-shadow-v1`. Coefficients are provisional engineering choices, **not scientifically established optimal intervals**. The live calendar and memory state use **only the active due date**.

Each new, actual attempt saves `schedulingDecision`: snapshot version, both immutable policy IDs, both suggested intervals and both proposed dates at the time of the rating. The active memory state also stores its policy ID. The comparison makes **no future attempt**, does **not** schedule extra work, and does **not** overwrite an old due date or historical answer.

## Progress → Prospective scheduling policy audit

The browser-only dashboard summarises:
- Number of prospectively saved decisions and distinct recall targets.
- Count of shadow intervals earlier than, equal to, or later than their actual active intervals.
- Median proposed one-step interval for the active and shadow policies.
- Number of earlier/unversioned attempts without prospective information.

The calculation reads no more than the most recent 50,000 attempts, never mutates the database, and does not send answers or notes anywhere. Different policy versions remain importable, but results from an unrecognised pair are not silently mixed into the v3.9 comparison.

## Strict limitations

1. **The shadow policy was never applied.** Its alternative dates cannot reveal how the learner would have responded, how subsequent memory would change, or whether it would be more efficient. They are **not comparable observed learning outcomes**.
2. These figures do not count future reviews. An earlier review would change future scheduling decisions, available study time, and learning history.
3. No review policy here predicts recall probability. Do not compute Brier scores, calibration or exam-probability estimates from this output.
4. Good/Easy and rubric checks remain **learner self-reports**, not independent scoring or validated retention.
5. Existing assessment urgency, time capacities, missed-day recovery, preparation tasks, verified-question safeguards and the automatic multi-course calendar continue unchanged.
6. This comparison is not a randomised experiment and cannot justify switching policies.

## Compatibility and validation

The real scheduling multipliers were checked against the prior algorithm for every combination of four ratings, six previous intervals and assisted/unassisted attempts. New backup fields are validated for dates, intervals, policy labels and consistency with the attempt timestamp. Older schema-v5 exports that lack these fields remain valid without modification. Future well-formed policy IDs can be imported without rewriting old decisions.

**Tests:** 298 automated tests passed; all six static GitHub Pages checks passed; Chromium desktop (1260px) and mobile (390px) Progress workflows passed with no JS errors or horizontal overflow. Browser smoke tests use simulated local storage, not a claim of live-device persistence. Free, offline-capable static hosting remains the only required service; retain regular local JSON backups.

## What comes next

Improve **independent delayed outcome measurement** and establish appropriate assessment criteria before fitting predictive memory models or experimentally comparing live scheduling policies. Evaluate retention quality and actual calendar burden separately, with learner consent and reversible settings. Do not treat algorithm complexity, simulated future repetitions or high self-confidence as proof of improved learning.

See [scientific research specification](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md) and [v3.8 delayed-retrieval audit](BLUEPRINT_3_8_FREE.md).
