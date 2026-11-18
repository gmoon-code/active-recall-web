# Active Recall Web — Blueprint 4.17

## Transparent question priority inspection, without changing scheduling

This increment addresses the learner's question about Anki-style priority. It does not silently substitute Anki's algorithm, adopt FSRS, introduce a new performance claim, or rewrite any review records. The app remains fully free, browser-local, static and compatible with existing JSON backups.

### Workflow

1. Open **Study Now** and select a session length from 5 to 720 minutes.
2. Look under **Why are these questions prioritised?** for the number of eligible new, due and not-yet-due targets.
3. Inspect the **Current session shortlist**. Its first question includes the current Calendar preference when that question is among items fitting the session.
4. Inspect the **Review-first alternative**. This hypothetical packs currently due *previously attempted* targets first, then never-attempted questions, then early maintenance. Questions that do not fit remaining time are not forced in.
5. Start the ordinary study session if desired. The comparison is never applied to the real queue; later question order changes after actual answers and updated review dates.

### What counts as priority evidence

- Current prototype scores consider whether the target is new or due, elapsed time since its due date, nearby explicitly linked assessments, the most recent Again/Hard self-rating and learner-marked explanation gaps. The actual selection also considers course balancing and task duration.
- The displayed rule score is **not a probability of forgetting**, mastery score, correctness grade, or validated memory-strength estimate.
- The read-only alternative deliberately tests a different *ordering rule*, not a different memory model. It is not Anki/FSRS, and no conclusion about which order produces better learning is warranted.
- The current shortlist's first item is the immediate next-question snapshot. The rest are currently feasible candidates, not a guaranteed future sequence, because actual responses can update due dates, course balance and remaining time.
- Both approaches exclude unverified source drafts and preserve all existing learning records and due dates.

### Next research and engineering step

Use prospective, reliably evaluated delayed-retrieval outcomes to test whether FSRS or another memory-state model predicts recall better than the present fixed interval heuristic. Benchmark separately for factual recall, mechanistic explanations and application questions. Keep the tested model separate from deadline-aware, capacity-constrained *session selection* until a change is justified by evidence.

### Verification

Deterministic tests check priority categories, review-first selection, zero-data handling, valid session lengths and unchanged database state. Browser tests verify visible comparison, 5-minute updates, first-question correspondence, mobile layout and no memory changes on inspection or session start. CI must pass before production release.
