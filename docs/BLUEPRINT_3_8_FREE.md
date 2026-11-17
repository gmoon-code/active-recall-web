# Blueprint 3.8 — Delayed retrieval evidence before changing the scheduler

**Release:** November 17, 2026. **Hosting:** Free, static GitHub Pages. **Database:** schema v5 unchanged. **Privacy:** all analysis is on the user's device.

## Rationale

The current scheduler uses explicit but provisional interval multipliers plus a capacity-aware, multi-course rolling calendar. General cognitive science supports retrieval, feedback and distributed review, but does **not** prove that this application's interval coefficients are optimal. Its historic attempts contain self-ratings, not independently verified correctness or prospective recall-probability forecasts. This release builds a read-only audit of the evidence without fitting a misleading model.

## New functionality

- In **Progress**, the **Delayed retrieval evidence audit** counts unassisted, recorded written attempts made at least 24 hours after preceding actual practice for the same requirement version and retrieval-target version. Rewordings of one target share its history and cannot multiply the number of independent targets.
- Immediate post-study practice, assisted responses, oral/mental answers without recorded writing, first attempts, changed versions, invalid data, and attempts less than 24 hours after prior practice are shown separately rather than silently counted.
- Actual review delays are grouped as 1–3 days, 4–7 days, 8–21 days, and more than 21 days. These descriptive bands are **not** scientifically optimal intervals.
- A favourable outcome is **only** the learner's Good/Easy self-rating without a simultaneously reported missed/unsure criterion. Nothing independently verifies correctness. A blank checklist means unassessed criteria, not necessarily accuracy.
- Overall descriptive percentages appear only when there are at least 20 eligible attempts across 10 distinct targets. Subgroups require 10 eligible attempts across 5 distinct targets. These are cautious display thresholds, not statistically validated cutoffs; repeated responses from one learner are correlated.
- Newly saved attempts record their **previously proposed due date and previous interval** before scheduling the subsequent review, without modifying any historic attempt. When this optional snapshot exists, the audit classifies the observed study time as more than 24 hours before, within 24 hours of, or more than 24 hours after the prior due date. Review due dates are soft study windows, not contractual deadlines.
- For unusually large local histories, the audit scans at most the latest 50,000 attempts and discloses excluded older records. It never writes evidence records or changes the study calendar.

## What the audit cannot infer

1. A learner-rated success is not an objectively scored retention outcome. Written responses are recorded but not independently graded.
2. Twenty-four hours is a product convention for separating next-day practice from immediate study, not a universal biological threshold.
3. Differences between the delay bands are observational and subject to confounding: harder topics may be assigned shorter intervals and assessments change when learners study. Such groups do not establish that longer or shorter delays cause better learning.
4. A prior due-date snapshot does not establish a prospective **probability of recall**. No Brier score, calibrated prediction, validated mastery score or individual forgetting curve can honestly be reported from the current record.
5. Synthetic future successful attempts cannot demonstrate learning benefits. The conditional future calendar remains a planning tool, not simulated scientific evidence.
6. Existing data from before this update lack the due-date snapshots, which the app does not invent retrospectively.

## Next engineering steps

Maintain a versioned prospective evaluation protocol. Establish optional reliable delayed response scoring or independently checked criteria, then compare proposed scheduling policies using time-split held-out results, task type, study time and calendar load. Evaluate a transparent baseline alongside an FSRS-style candidate without claiming that flashcard-trained models generalise automatically to essays, mechanistic explanations or novel problems. Protect learners from punitive catch-up backlogs and preserve manual control over calendar appointments.

## Compatibility, quality and privacy

- Same local browser origin, schema v5 backup format and original question/attempt IDs.
- No new paid services, billing, mandatory cloud APIs, external grading, subscription, cloud data sync or uploaded student notes.
- 289/289 automated tests and 6/6 GitHub Pages static preflight checks passed. Chromium desktop and mobile Progress smoke tests passed with no JavaScript errors or horizontal overflow.
- Backup exports remain essential because browsers can evict non-persistent local storage.

**Research foundation:** [Question design and automatic scheduling review](./RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).
