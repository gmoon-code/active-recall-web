# Active Recall Web — Blueprint 3.3: Preparation before retrieval
**Release:** 2026-11-17 · **Free public GitHub Pages** · **Storage:** unchanged schema v5

## Purpose
Syllabus objectives with no verified question can now enter an explicitly separate *preparation* part of the rolling agenda. They are **not** treated as recalled, graded, understood, or mastered. Existing per-target spaced reviews, course assessments, capacity limits, history and backups are preserved.

## Behaviour
- A syllabus objective without a verified eligible linked question receives a preparation workflow step:
  - `prepare_sources`: identify, obtain and study appropriate source material;
  - `draft_question`: source material marked prepared by learner but no question explicitly linked; write and validate a question;
  - `review_question`: question explicitly linked but still unverified or stale; review source-supported wording and answer.
- A short four-minute **planning step** is proposed for each unmatched syllabus objective at most once per rolling 7–42-day horizon, with at most one preparation step per day. These minutes share the daily budget and reserve with retrieval. On short days with fitting due recall activities, retrieval is favoured.
- Learners can mark materials **prepared (not learned)** and reopen preparation. Optional `materialsReady` and `materialsReadyAt` fields are backward-compatible. This updates only the syllabus workflow and its event history, **never** attempts or memory stability.
- A syllabus goal linked to an eligible verified question produces no duplicate preparation slot. Goal-scoped links across courses are rejected.
- Course assessment proximity can prioritise preparation, but the app does not infer the exact assessment scope from course membership.
- Calendar steps navigate to the associated syllabus goal, source-safe question form, or saved question review.
- The calendar shows both preparation steps and recall reviews, with transparent deferred preparation counts.

## Evidence and limitations
See [Research on question design & adaptive review](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md). The general importance of preparation, retrieval and spacing is supported by research; **four-minute steps and priority weights are provisional user-interface heuristics, not scientifically validated optimal allocations**. Completing preparation does not imply successful retrieval. No server, automatic remote calendar integration or closed-browser background activity is provided.

## Verification
- 223/223 automated regression tests, including 13 preparation-focused tests.
- 6/6 GitHub Pages static-deployment checks.
- Chromium desktop/mobile test: add course and syllabus objectives → calendar preparation → navigate to exact goal → mark materials prepared → next proposal becomes question drafting; no attempts, no memory writes, no script errors or horizontal overflow. Browser tests used simulated storage.
- Development stress case: 150 syllabus goals + 200 recall targets + 42 days, computed in approximately 84ms on the test host; not a universal performance guarantee.
- Live persistent storage and offline reload require testing on an end-user device; keep regular JSON backups.

**Permanent rule:** 100% free website, no required billing, paid API, subscription, account or server.
