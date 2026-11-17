# Blueprint 3.7 — Syllabus-Aligned Rubrics and Human-Reviewed Alternative Answers

**Release:** 17 November 2026. **Status:** Implemented in the free static GitHub Pages app.

## Design problem

One explanation can be correct in several wordings. Text matching alone cannot establish equivalent scientific meaning. The learner, not an automated text-matching system, must decide what counts as a valid explanation. Rubric annotations should also be explicitly aligned with the syllabus goals already attached to a question without inventing coverage, mastery or additional reviews.

## Changes

- The **Knowledge → Rubric** editor now accepts up to five distinct, learner-authored alternate expressions for a single checkpoint (each 240 characters or fewer). They appear only in answer feedback, after a retrieval response is made and the reference answer is revealed.
- Changing alternate formulations increments the criterion version and places the checkpoint on verification hold until the learner explicitly approves it. Old responses keep their original criterion text, version and any alternate-expression snapshot.
- The rubric editor lists syllabus objectives that are explicitly linked to the same learning question and course. A learner may map individual checkpoints to these goals. The display counts current verified and pending criterion links, **not** proven achievement, full curriculum coverage or validated scientific correctness.
- If the required criterion wording changes while supplementary expressions or mappings exist, these current associations are cleared and require new review. Historical snapshots remain intact.
- Removing or archiving a syllabus-objective link cannot invalidate an older backup: the present alignment view ignores inactive/unlinked goals but historical metadata is retained.
- All functionality remains browser-local and uses schema-v5 optional fields, so old notes, review records, sessions and JSON backups remain compatible.

## Safety, accuracy and limitations

Alternative expressions are manually entered; the app cannot independently determine whether they are scientifically valid or equivalent. A different essential idea belongs in a different criterion or retrieval target. The app never compares learner writing to accepted expressions for automated scoring. An unverified criterion is held out of the self-check list. Adding or editing the supplementary metadata does not generate attempts, recall grades, extra targets, memory states or scheduled obligations.

The calendar continues to use provisional heuristics, not scientifically proven optimal intervals. No remote learning records, paid AI calls, subscriptions, credit cards, cloud database, or paid hosting are required. GitHub Pages hosts public static code only. Keep regular local JSON backups.

## Tests and acceptance

**276/276 automated tests**, **6/6 GitHub Pages static deployment checks**, and desktop/mobile Chromium smoke tests passed. The browser test exercised saving an alternate, re-verifying the criterion and mapping it to an already linked syllabus objective. No script errors or mobile horizontal overflow occurred. Software validation does not establish learning efficacy.

Key regressions: reject duplicate/oversized alternatives; preserve old attempt snapshots; enforce same-course, explicitly linked syllabus mapping; preserve backups after archived/unlinked goals; prevent silent new recall obligations; invalidate potentially obsolete metadata when a criterion changes.

## Future work

1. Check rubric completeness against *learner-defined syllabus outcomes*, not just sentence fragments.
2. Improve support for complex multi-step mechanisms, equations and diagrams without inventing unsupported content.
3. Calibrate calendar policies against actual delayed independent recall, time spent and task type.

Research basis: [Evidence review and engineering specification](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).
