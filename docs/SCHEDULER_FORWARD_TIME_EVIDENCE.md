# Active Recall Web — forward-time scheduling evidence gate

**Status:** Unreleased, read-only evaluation infrastructure on `feat/known-review-calendar-priority`. The published v4.26 memory scheduling policy remains unchanged.

## Purpose

The project's highest priority is adaptive review timing plus a feasible automatic multi-course calendar. The application presently makes actual due dates with `transparent-interval-v1`, not FSRS. The [Anki manual](https://docs.ankiweb.net/deck-options.html) documents FSRS as a learnable, review-history-based scheduler with a user-selected retention/workload trade-off. Its performance for this app's mixture of short factual, explanatory and application tasks cannot be inferred from flashcard benchmarks alone.

Before fitting or enabling a new interval model, the app must distinguish observations genuinely available **before** each answer from judgments recorded afterward. Current pre-answer receipts store two **unfitted**, arbitrarily anchored curve hypotheses, never future grades. The existing `prospectiveEvidenceAudit` pairs those receipts only with delayed, unassisted, written practice and separates strict literal agreement from self-reviewed and other-person-reviewed explanation/application judgments. No single stream represents externally verified memory retention.

## Increment: later-window descriptive error

- Keep the existing minimum cohort gate: 50 eligible observations, 15 distinct targets, and at least 10 positive and 10 negative labels **within each evidence stream**.
- Sort each stream chronologically by its actual attempt timestamp. Reserve a nominal latest 20% segment, moving the boundary earlier if necessary so records sharing a timestamp are never split across earlier/later portions.
- Display a **separate later-window target-balanced Brier error** for the two frozen hypotheses only when there are at least 50 earlier observations across 15 targets and 20 later observations across 8 targets, with at least 5 positive and 5 negative labels in the later portion.
- If all records share one timestamp, no later window is available. Small and one-sided later samples retain only counts; their scores are suppressed. All metrics remain local and read-only. No review dates, ratings, backup format or algorithm coefficients change.

## What the result cannot establish

This is not training/testing FSRS. It does not yet fit any predictor. Both displayed shapes are arbitrary hypotheses; the same targets can recur in both windows, outcomes are selected by the existing scheduler, strict literal matching can reject valid synonyms, and manual rubric reviews are not independently blinded. A lower Brier error against these narrow labels is **not proof of more effective learning**, a better calendar, an optimal review date, or exam readiness. Chronological separation is a prerequisite for later fitted-model evaluation, not a substitute for a prospective intervention or independently tested delayed retention.

## Next implementation gate

1. Choose a versioned, open-source memory model candidate (FSRS is plausible) and verify its inputs, browser compatibility and licence. Keep a fallback to the existing transparent interval policy, especially when records are sparse or not meaningfully comparable.
2. Freeze candidate forecasts **before** review. Separate factual recall and complex rubric-task evidence; evaluate prediction calibration and later-window error without using later outcomes to fit the same model.
3. Evaluate both **retention and workload**, with actual task durations, course deadlines and calendar overflow. A model that recommends more reviews is not automatically superior.
4. Keep experiments in shadow mode until a safe opt-in policy transition with export/rollback exists. Never retroactively replace existing due dates or assert scientific optimality from self-report.

**Verification:** targeted deterministic tests include enough history to score a strictly later segment, same-time collections that must be withheld, separate evidence types and zero mutations. The full non-browser suite and browser regression remain release gates.
