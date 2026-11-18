# Active Recall Web — Blueprint 4.16

## A learner-controlled what-if study schedule

The current priority model is still a transparent, provisional heuristic. Rather than claiming it has Anki/FSRS-style calibrated retrievability, this release makes the consequences of the learner's time choices inspectable. It is fully free, offline-capable, local-only and GitHub Pages compatible.

### Workflow

1. Open **Calendar**. Saved weekday, weekend and unavailable-day settings remain above the new simulator.
2. Under **What if I changed my study time?**, enter alternative study minutes and/or unavailable dates. The comparison covers the **same horizon** as the saved plan (7–42 days).
3. Press **Preview schedule changes**. No saved data, scheduled due date, attempts or plan-history record is changed by this action.
4. Compare both plans' available and assigned minutes, first-pass review opportunities, known due reviews not placed, preparation steps, conditional revisit slots, moved-first-opportunity counts and per-assessment first-pass opportunities. Expand the daily comparison for a date-by-date view.
5. **Discard comparison** or **Apply proposed availability**. Applying requires a confirmation dialogue. If the proposed values have been edited since the preview, the application refuses to apply them until they are previewed again. A newly applied availability plan is recorded as a new dated revision rather than rewriting earlier ones.

### Evidence boundaries

- This is a comparison of two **possible schedules**, with the same unchanged current questions, attempts, due dates and priority rules. The app does not simulate correct answers, subsequent forgetting, mastery, exam grades, or future compliance.
- A first-pass opportunity is a time slot for a currently known target. If a different availability plan moves that slot earlier, **the memory due date remains the same**.
- Conditional revisits are contingent placeholders. They must not be added to the known review count or interpreted as completed practice.
- A larger time budget may accommodate more work, but the app does not claim that more scheduled slots produce better learning.
- Preparation tasks and eligibility can affect which questions fit; increased availability is not guaranteed to improve every specific assessment's first-pass coverage.
- This does not implement FSRS or a calibrated personal forgetting probability. Later work can compare scheduling policies using prospective and independently checked delayed-retrieval evidence.
- No account, API key, paid AI, analytics service or backend is needed. Local JSON backups continue using the existing schema v5.

### Testing

Deterministic tests verify no mutation during previews, stable comparisons, changed available minutes, rest-day scenarios, invalid settings and fixed horizons. A separate browser test exercises previewing, refusing un-previewed edits, cancelling a confirmation, applying an explicitly confirmed proposal, mobile layout, IndexedDB persistence and unchanged memory/due dates. The GitHub Actions free Chromium suite is required before publishing.
