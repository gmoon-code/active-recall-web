# Active Recall Web Blueprint 4.9 — Your Own Lecture Q&A

**Date:** 18 November 2026  
**Constraint:** 100% free, static GitHub Pages, offline-capable, local-only learning data. No payments or paid models.

## Why this release takes precedence

The owner reported that generated questions from their notes were terrible. The offline, deterministic sentence-template generator cannot understand the actual teaching aim, disciplinary significance, omissions in source documents, diagram meaning or whether the answer makes a good test of knowledge. Earlier question-quality audits identify potential problems but cannot transform a weak automatic question into a good one. Improving the learner's direct control over question and answer creation is therefore the immediate priority. The previously planned read-only evidence-based spacing comparison remains deferred, with **no changes to active scheduling coefficients**.

## Primary workflow: course → lecture → questions

1. Select **My Q&A** from any page.
2. Select a course and optionally filter by an existing lecture. If there are no notes, enter a lecture title in the form; no upload is required.
3. Write a standalone question and a reference answer. Pick Recall for a fact, Explain for a relationship/mechanism, or Apply for a new situation. Save and continue with the same lecture.
4. Optionally expand **Paste several Q&A pairs at once**. Each entry starts with `Q:` followed by `A:` and may have a multiline answer. A new `Q:` starts the next entry. The entire batch of up to 50 entries must pass size, format and duplicate checks before saving anything.
5. Use the **Edit Q&A** control on any saved question. If only the expression changes, choose *Wording only* to preserve the review interval; if the tested content changes, choose *Meaning changed* to reset the interval. Earlier attempts and historical snapshots remain intact either way.
6. Questions written by the learner are eligible for the same unified multi-course review queue as earlier manually verified questions, not a separate deck. The learner self-checks the answer; no semantic auto-grade is promised.

## Notes workflow

- Paste lecture notes in **Capture** or import TXT, Markdown or PDF. Both workflows now have an **unchecked** opt-in for rule-generated question suggestions.
- Saving the lecture moves directly to My Q&A, filtered to the saved source. An imported document with multiple parts begins with its first part selected; other parts are selectable in the lecture filter.
- Unchecked means source text and version history are saved, but no new rule-generated questions, duplicate links or conflict proposals are generated in that operation.
- If checked, the existing source-first rule engine remains available. All its new questions are **unverified drafts** until the user explicitly approves the v4.8 four-part quality review.
- Linking a manually written question to notes stores the source ID and source version but **does not manufacture a quotation or automated verification**. A source revision still flags the linked question for human rechecking.

## Integrity and compatibility

- Existing `addSource` and `addImportedDocument` callers continue to default to legacy draft generation. **Only the interactive forms default to opt-out**, avoiding unexpected changes to programmatic older workflows.
- Manual questions may optionally store `lectureTitle` as a plain string or `sourceId` linked to lecture notes. This is an additive, optional schema-v5 field; all older backups still load.
- Creating a question validates its course and disallows cross-course source linkage. Batch imports validate all entries before mutating the database.
- Wording-only changes preserve the active memory target; substantive edits remove the current interval but not past attempts. Edits to source-stale questions no longer auto-approve revised notes.
- The calendar remains `transparent-interval-v1`, with `conservative-shadow-v1` as read-only sensitivity analysis. No personalized evidence, optimized recall prediction or guaranteed retention target is asserted.
- All content stays in browser storage. Export backups, particularly before updates or clearing browser data.

## Verification

New tests cover no-draft note capture, explicit opt-in, source-linked learner questions, arbitrary lecture titles, cross-course link rejection, bulk multiline import and all-or-nothing validation, revision effects on timing, preserved attempts, stale-source review gating, and the full create/edit/study path on desktop/mobile in a real browser. The GitHub Actions runner verifies the browser suite since local Chromium may be restricted in this execution environment.

## Next best step

After confirming that creating and editing Q&A feels natural on real lecture material, return to the research-based **read-only scheduling comparison**: recognition vs independent retrieval, immediate vs delayed practice, realistic workload and deadlines, uncertainty about optimal intervals, before experimenting with any live scheduling policy.
