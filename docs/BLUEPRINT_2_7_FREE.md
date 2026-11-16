# Active Recall Web — Blueprint 2.7: Rolling spaced-review agenda

**Release date:** 16 November 2026  
**Status:** Tests passed locally; production publication recorded in repository commits.  
**Permanent constraint:** The app must be 100% free to build, publish on public GitHub Pages, maintain and use. No subscriptions, paid APIs, payment details, required external account, server or paid AI model.

## Purpose

Move from the earlier **first-pass opportunity forecast** to a genuinely recurring, capacity-aware, multi-course study agenda. This addresses the product's main goal: when new learning is verified, when an assessment approaches, when study time is changed or missed, and when actual recall results arrive, the next proposed plan recalculates from current browser-local records.

### What is implemented

1. **`buildReviewAgenda`** (in `core.js`) generates a 7–42-day *read-only* plan, honouring weekday/weekend minutes (0–720) and excluded dates. It does not mutate study history, due dates, memory models, or attempt records.
2. An unattempted target gets a **first retrieval opportunity**. A previously attempted target's **first slot uses its actual saved due date**, with a limited opportunity to practise before a nearer assessment. Deferred first slots remain visible rather than disappearing. The scheduling priority weights are product heuristics, **not scientifically validated coefficients**.
3. After that first real opportunity, the plan contains up to three explicitly **conditional future spaced revisits**. These windows indicate capacity and potential practice, not predicted correct answers or actual future memory states. Conditional gaps use an explicit provisional heuristic, roughly 2 days then growing for new targets, and a function of the previous interval for reviewed targets.
4. No target is placed twice on one day. Every day respects its time budget plus reserve. Unscheduled known-due work is counted as **Could not fit** instead of silently postponed indefinitely.
5. Upcoming assessments can influence prioritisation and opportunities before their dates. Coverage separates actual first review opportunities from future conditional ones; it is not examination readiness.
6. **Availability settings persist in the same browser-local database** as `agendaPreferences`; existing schema-v5 backup files without the optional field still load. This requires no database schema increment or new backend.
7. The redesigned **Calendar** UI shows days, tasks, reasons, conditional labels, capacity, assessment coverage, and overflow. **Study Now** prioritises today's matching calendar tasks where they fit the selected session duration, but can still draw from other eligible tasks in longer sessions.
8. **Unverified rule-generated questions are now excluded from both scheduling and Study Now.** The learner can review, edit, and verify source-linked drafts in Knowledge; verified question versions retain source history.
9. Performance: the rolling 42-day agenda over 500 targets took approximately **0.43 seconds in a local Node benchmark**, versus about seven seconds in the first implementation. This is an engineering smoke test, not a guaranteed performance result on mobile devices.

## Research boundaries and limitations

- Retrieval practice, distributed practice, feedback, and successful spaced relearning have strong general research support. **Our exact calendar gaps, priority weights, duration estimates, and rating-based memory intervals remain provisional engineering choices**, not a validated optimal schedule or clinical/educational assessment.
- The memory model still uses the earlier simple Again/Hard/Good/Easy interval heuristic. It has **not** yet been replaced by a calibrated learner-specific model or FSRS.
- Future spaced revisit slots assume only that *a revisit could be attempted*, not that the first opportunity was completed or answered correctly. If the learner does not complete the activity, any later slots are hypothetical and should not be mistaken for appointments. The agenda refreshes when opened and after an actual saved attempt; no background agent runs while the site is closed.
- The deterministic question generator still depends on simple sentence patterns and cannot guarantee completeness, pedagogical appropriateness, multilingual accuracy, or deep mechanistic question generation. The strict question-verification gate is an important safeguard, **not a complete quality solution**.
- The calendar is still a local web view, not an operating-system calendar, email notification, synchronized device calendar, or persistent appointment system. No automatic remote data sync exists.
- A denied browser persistent-storage permission does not necessarily mean writes fail. JSON backups remain essential and may include private data; **do not upload backups to the public GitHub repo**.

## Verification

- **149/149 automated tests passed**: previous-version imports, question verification, interval evidence, PDF and source safeguards, and 14 new recurring-calendar tests.
- Chromium in-memory UI tests passed: calendar from sample courses, saved availability, five-minute study session, mobile layout without horizontal scrolling. These simulate browser storage.
- GitHub Pages preflight checks cover local static paths and absence of required paid services. Live HTTPS storage and offline cache should be verified on the deployed address after updating GitHub.
- The new calendar does not invent study outcomes or modify `db.attempts`, `db.memory`, or any other learning record when calculating forecasts.

## Next best development steps

**P0 — Higher-quality questions:** structured objective extraction across full uploaded lectures, source-supported causal and contrast relationships, assessment-level tasks, deduplication across documents, question-validation checklists, and visible *coverage gaps*. No general-purpose semantic model is assumed available offline for free; do not fabricate unsupported inferences.

**P1 — Evidence-informed memory modelling:** instrument independent delayed retrieval outcomes, provide conservative calibration, and compare a transparent baseline with a freely vendored FSRS implementation and other candidates. Hold-out validation and transfer tests must distinguish factual retrieval from mechanistic explanations and problem solving.

**P2 — Real calendar control:** allow learner-pinned study appointments, preferred hours and start dates, rest constraints, an `.ics` export, and stronger backlog recovery, without breaking the common Study Now queue or requiring paid services.

## Research reference

Full literature audit, selected 30 academic/technical sources and explicit hypotheses:  
https://github.com/gmoon-code/active-recall-web/blob/main/docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md
