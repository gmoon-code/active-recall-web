# Evidence Review and Engineering Specification: Question Quality & Automatic Review Scheduling
**Active Recall Web research baseline — 16 November 2026**

**Status:** Research and proposed engineering decisions, **not yet implemented or scientifically validated as a product**. Keep this report in the GitHub repository so subsequent work does not lose our decisions.

## Product objective and permanent requirements
The product is a **unified, automatically updating learning agenda for all courses**. New notes, documents, verified questions, deadlines, missed days, review results and available study time must all update the proposed calendar. Users must not have to select decks or manually maintain hundreds of due dates. They can choose 5–720-minute sessions and inspect why each activity was selected.

**Zero payment:** GitHub Pages public free static hosting; no billing, paid API, subscription, mandatory cloud AI, paid server or backend. Learning records stay browser-local with export/import backups. Full offline essential functionality. Do not imply automatic cross-device sync, guaranteed persistent storage or automatic background processing while the site is closed.

## 1. What is strongly supported—and what is not
### High confidence: general effects
- Practice testing usually beats rereading on delayed retention (Dunlosky et al., 2013; Rowland, 2014; Adesope et al., 2017; Agarwal et al., 2021). In 53 authentic school-classroom studies, the 2026 Ruitenburg et al. meta-analysis found an average retrieval effect of g=0.37 across 7,303 participants.
- Distributing practice over time usually beats massed practice (Cepeda et al., 2006; Mawson & Kang, 2025). Ruitenburg et al. (2026) estimate g=0.20 in authentic school classrooms; a 2021 meta-analysis of spaced **retrieval** vs massed retrieval reported g=0.74 (Latimier et al.). These estimates use different study sets and contrasts; do not compare or add them naively.
- Correct-answer feedback matters especially following errors. Providing only 'wrong' is often inadequate (Pashler et al., 2005; Butler et al., 2008). A 2025 meta-analysis found a small advantage of retrieval vs other effective elaborative strategies overall (g=0.14), strongly moderated by feedback (Gonçalves et al., 2025).
- Retrieval with actual production (e.g., short answer) often produces stronger learning benefits than recognition alone, though format interacts with content, difficulty and assessment (Rowland, 2014; McDaniel et al., 2007; Ruitenburg et al., 2026).

### Moderate/conditional evidence
- Relevant interleaving helps students discriminate between easily confused kinds of problems/categories, but does **not** imply shuffling unrelated courses at every question. Brunmair & Richter (2019) found g=0.42 overall, g=0.34 for mathematics, but negative/uncertain effects for some other material types. In 2026 authentic classroom research, g=0.40 overall, moderated by feedback. Use discriminative mixing, not arbitrary switching.
- Meaningful retrieval can support application and transfer: Pan & Rickard's (2018) transfer meta-analysis reported d=0.40 across 122 experiments. Transfer varied substantially by test type; it did not reliably extend to all unpractised material.
- Self-explanation prompts have evidence (Bisra et al., 2018, meta-analysis g=0.55), but self-explanation during guided learning is not interchangeable with successful independent recall.
- Relearning to a retrieval criterion across spaced sessions is effective. Rawson & Dunlosky (2011) recommended an initial 3 correct recalls plus 3 spaced relearning sessions **for their studied conceptual materials and efficiency criteria**. This is not a universal prescription for every target.

### Unknown or unvalidated as a universal rule
- No single optimal '1, 3, 7, 14, 30 day' schedule. Cepeda et al. (2008) show that the useful interstudy gap varies with desired retention delay. Latimier et al. (2021) found no clear general advantage of expanding over uniform review intervals (g=0.034).
- No universal recall-probability setting of 90% for all people, tasks and deadlines. The Anki manual documents a workload/forgetting tradeoff, not a universal biological optimum.
- Better predictions of flashcard recall do not automatically imply better course grades, complex reasoning, understanding or learner wellbeing.
- A generated question that sounds fluent does not necessarily measure what the learner needs. Recent AQG reviews highlight problems with pedagogical validity, cognitive-level control and expert evaluation (Gorgun & Yildiz, 2024; a 2025 review; 2026 Bloom-aligned review).

## 2. Question generator: design from objectives, not sentences
### A. Source-to-question pipeline
1. **Preserve input faithfully:** source file, title, revision, page/section/offset and PDF warning flags. Omitted image-only pages must not be represented as understood material.
2. **Outline the knowledge:** distinguish definitions, conceptual distinctions, mechanisms (cause -> intermediate -> effect), conditions/limits, procedure selection, mathematical relationships, examples and misconceptions. Link related parts across the same course.
3. **Identify meaningful learning requirements:** what must someone explain, recall, apply, distinguish or solve? Let learners edit objectives. Do not produce a card for every sentence or assume that 12 drafts represent document coverage.
4. **Create distinct recall targets:** one *retrievable relationship or demonstrable skill* per target, not one trivial word per atom. Avoid fragmenting mechanisms until the relationships themselves disappear.
5. **Generate a prompt family:** questions of differing formulation around a target. Save stable target ID, activity ID, question/answer version and objective. Track differing target **competencies** separately from wording variants.
6. **Construct an answer key/rubric** from traceable text, with required claims, mechanistic links, possible valid alternatives, and limitations. Do not add unverified mechanisms from general model knowledge.
7. **Audit and verify:** automated structural checks plus a fast human review step before a draft becomes authoritative. New unverified drafts should enter a low-friction *Review for study* inbox, not the actual study queue.

### B. Question-format progression
- **Foundation and discrimination**: 'What is X?', 'How does X differ from Y?', 'Which condition makes procedure A appropriate rather than B?'
- **Causal/mechanistic explanation**: 'How and why does X cause Y? Include intermediate steps and relevant conditions.'
- **Prediction and counterfactual**: 'If X changes but Z remains fixed, predict Y and explain why.' Answerability and source sufficiency must be audited.
- **Application and transfer**: a **new situation**, not merely the same fact rewritten. Mark as an advanced competency rather than assuming fact recall proves transfer.
- **Error diagnosis**: 'A student claims ...; which inference is unsupported, and how would you correct it?'
- **Procedure/solution**: choose method, work calculation/derivation, check units/assumptions, and explain why each step follows.
- **Visual/model reasoning**: identify, sketch or critique a graph/model **only when figures are actually available**; do not invent figures from missing PDF pages.
- **Synthesis**: explain interactions among two to four central objectives; do not make every retrieval task an unwieldy multi-page essay.

### C. Sample progression (science)
Validated source states: competitive inhibitors bind the active site, increasing apparent Km while Vmax remains attainable at sufficiently high substrate concentration.
- Foundation: 'What feature of enzyme binding distinguishes a competitive inhibitor from a noncompetitive inhibitor?'
- Explanation: 'Why does competitive inhibition raise apparent Km but not necessarily lower Vmax?'
- Transfer: 'An inhibitor shifts apparent Km upward without changing Vmax. Explain the most consistent mechanism and what increasing substrate concentration predicts.'
- Misconception: 'A learner says all enzyme inhibitors necessarily lower Vmax. Is that accurate? Explain with a mechanistic counterexample.'
Rubric: binding competition; effect on apparent substrate requirement; high substrate can outcompete; unchanged attainable maximum under the specified model. The actual source must support each claimed component; otherwise mark the generated target as requiring clarification.

### D. Quality gates (design criteria, NOT validated scientific cutoffs)
1. Accurate to identified source(s), and source version still current.
2. Tests a stated learning requirement and a well-defined target.
3. Clear without seeing the notes; no 'according to the above' or context-free pronouns.
4. Requires some retrieval, reasoning or generation, not merely copying cues.
5. Has a defensible model answer and explicit minimal success criteria.
6. Does not accidentally reveal its answer or reward guessing via phrasing.
7. Does not invent beyond source; any necessary external reasoning is labelled and checked.
8. Avoids duplicating the same target in different wording unless variants truly differ.
9. Covers important concepts (including conditional qualifications) rather than only conveniently parseable sentences.
10. Distinguishes confidence in **extraction**, **question alignment**, **answer key**, and **student performance**.
11. Matches target task level: basic recognition for initial scaffolding; production and explanation when appropriate.
12. Allows different correct formulations, especially multilingual learners and qualitative explanations.
13. Includes prompt and source revision snapshots; stale questions require revalidation.
14. Rejects inaccessible figure-only/table-only content unless manually transcribed.

Source-supported templates and human-editable answers are the safest **free offline baseline**. Fully automatic semantically rich questions across arbitrary PDFs cannot be promised with the current deterministic parser. Any future optional local language model must remain nonessential, free, device-appropriate, and source-verifiable.

## 3. The learning cycle must have different modes
**Learn/encode:** New material the learner cannot yet use receives a worked explanation, examples, and optional stepwise prompts. Highly complex novice problem solving may benefit more from guidance than immediate unguided recall (van Gog & Sweller, 2015).

**First independent retrieval:** Ask before revealing notes; capture answer and whether hints were used. After the attempt, provide the exact source-backed correct response, rubric and specific correction. If retrieval fails, feedback still helps learning, and a later fresh attempt can check correction (Kornell et al., 2009).

**Spaced relearning:** Schedule the same meaningful target again on another day, with new question wording as appropriate. Do not count multiple immediate 'Easy' presses as independent long-term successes.

**Transfer or integrated assessment:** Once foundation exists, ask varied-context explanation, prediction, method choice or problem-solving questions; do not claim basic recall alone means competence.

**Struggle safeguard:** Repeated errors or multiple missing rubric criteria should switch the student to supported relearning rather than endlessly retest an inaccessible answer.

## 4. Automatic calendar: two separate problems
### 4.1 Predicting future recall
Maintain per-target evidence: version, last **independent** attempt, elapsed time, correct/incorrect/partially correct criteria, help used, grade, input mode, prompt, response, duration, and previous interval. Keep independent recall evidence and application competency evidence separate.

Until sufficient reliable history exists, use a clearly labelled **provisional bootstrap schedule** (e.g., after initial success, aim to revisit on a later day; then gradually widen opportunities conditional on results). Days 1/3/7/14 may be used as a user-visible starting heuristic, **not** as a universally research-validated optimum.

An advanced model can fit stability, difficulty and recall probability to actual **independent** review events. FSRS (and open-source TypeScript ts-fsrs) is a serious *candidate* because of its mathematical formulation, documentation, MIT licence and open predictive benchmarks, but must be evaluated on this product's varied question types; a flashcard benchmark is not proof for chemistry mechanism explanations or essays. The current ts-fsrs library targets newer developer tooling: vendor a static browser-compatible bundle with licence text, not a paid server or runtime dependency. Do not fit personal parameters to only a handful of noisy reviews.

Use calibration checks (predicted vs observed recall, reliability by task type, log loss/Brier score) before displaying quantitative recall probabilities. Never label self-rated rubric completion as independently tested 'mastery'.

### 4.2 Allocating actual calendar time
**The user's main product goal is here.** Build an editable rolling weekly calendar with available time blocks, course and assessment dates, personal rest constraints, expected activity minutes and catch-up limits.

Each time a new verified learning target appears, a study result is saved, an assessment changes, a day is missed, or availability is edited, locally:
- recompute future *proposed* sessions over a selectable horizon;
- place initial learning, spaced review and transfer opportunities into realistic daily time budgets;
- protect earlier deadlines and prerequisites;
- keep long-term review alive for courses without imminent exams;
- distribute opportunities across courses without indiscriminately shuffling unrelated tasks;
- assign each activity a reason and mark review dates as soft scheduling windows;
- show overflow with honest unmet demand; do not silently pretend everything fits.

**Important distinction:** a *review due-window* is an instructional target; a *calendar appointment* is a suggested block the learner can move or lock. Record actual completion separately. Avoid re-planning locked appointments without consent.

A formal optimization objective can rank expected long-term retention value, assessment relevance, coverage, uncertainty and time cost, subject to daily minute budgets. The functional form and weights are engineering hypotheses to test, **not established coefficients from cognitive science**. Initially, use simple transparent constrained allocation; later test improved policies with valid measured outcomes.

### Recommended automatic workflow
Import material -> inspect missing/unsupported sources -> review/verify goals and question drafts -> target enters one global queue -> scheduler places learning/review opportunities into upcoming time blocks -> user can study 'Now' or follow calendar -> real results update memory targets -> calendar rebalances future days.

### Exams and retention horizons
Use upcoming exam dates, requirements in exam scope, time needed for prerequisite learning, and the number of possible spaced opportunities. An exam should influence the urgency of relevant targets well *before* its final few days. Plan retrieval before the deadline, but maintain optional longer-term spaced review afterward.

### No punitive backlog
A missed day does not prove forgetting. Do not move all overdue items to tomorrow; rerank the queue with capacity and deadlines. Show what can fit, what is deferred and why. A learner who has five minutes should receive an effective feasible five-minute subset, not an impossible two-hour obligation.

## 5. Critical audit of Active Recall Web v2.6
These statements are based on repository code audited November 16, 2026.

- `intelligence.js`: `analyzeNotes()` examines sentence chunks and emits at most 12 drafts per source in `addSource()`. Definition/causal phrase templates and generic explanation fallback are not dependable indicators of objective coverage, mechanism validity or question quality.
- `core.js` `recordAttempt()`: for a new target, Good yields 2 days, Easy 4 days, Hard 1 day and Again one hour; later positive intervals multiply by 2.15 or 3.0. These are deterministic **heuristics**, not a fitted memory model or validated optimal schedule.
- `eligibleCandidates()`: priority combines fixed base scores, an urgency bump in the final approximately eight days before an assessment, difficulty bonuses, and rubrics; there is no estimated recall-probability calibration.
- `planActivities()`: fits candidate activities into a requested duration with course switching penalties. It chooses tasks for **one session**, not a full repeating study calendar.
- `forecastSchedule()`: explicitly simulates **first-pass opportunities only**; once a target is selected, it is not scheduled again within the forecast. This cannot yet meet the promised multi-week spaced review agenda.
- Strengths to **retain**: source traceability; source revisions; separate requirements/targets/activities; independent rubrics and past-attempt snapshots; clear self-report labels; time estimates; user-selected sessions; free static hosting; backups; PDF error audit.

## 6. Implementation priorities and acceptance criteria
### P0 — Question-quality and scope coverage
- Objective/knowledge map across lecture sections (not merely the first 12 parseable statements).
- Reliable extraction of condition/cause/effect/procedure/contrast/qualification relationships; distinguish what notes support from what requires teacher or learner input.
- User review inbox: verify/edit/merge/reject; no unverified questions silently scheduled.
- Rubric-backed prompts and concise, useful corrective explanations.
- Quality test corpus across biology, chemistry, mathematics, history, essays and bilingual examples; versioned decisions; test source grounding and coverage.

### P1 — Real multi-week recurrent agenda
- Availability calendar with blocked days, daily budgets and due-window tolerance.
- Study tasks scheduled across days; include repeated review opportunities conditional on future results rather than inventing future successful reviews.
- Recompute on new materials, completed/failed reviews, exam changes, holidays/missed days and budget edits.
- Fit within actual total minutes; explain overflow; minimize churn and preserve locked blocks.
- Expose both the calendar and 'Study now' as views over the **same** planning state.

### P2 — Adaptivity and validation
- Replace untested interval multipliers with a conservative memory-state baseline; add candidate FSRS model only when outcome labels are sufficiently reliable.
- Benchmark on **held-out future** study events, not training fit alone. Compare against existing v2.6 baseline and a transparent simple spaced policy. Report both accuracy and time cost.
- Distinguish independent correctness from assisted success, partial rubric criteria, written/oral mode and transfer tasks.
- Never silently redate historical attempts or change source interpretation when a model is updated. Preserve algorithm version.

### P3 — Real-world robustness
- Estimate actual study durations with uncertainty; start to finish under five-minute budgets.
- Calendar export as `.ics` (free, user-controlled); no promise of automatic remote calendar write/sync without authorization.
- Offline data export, schema migration and disaster recovery.
- Usability tests: everyday capture, negligible configuration, clear correction, readable scheduling reasons, no overwhelming backlog.

### Evaluation plan (research versus product design)
- **Question alignment**: expert-labelled source support, ambiguity, coverage, answer adequacy, rubric sufficiency, distractor correctness, important omitted concepts.
- **Learning**: actual delayed independent retrieval accuracy, rubric-level changes, performance on novel transfer items, long-term retention.
- **Prediction**: time-split calibration (Brier/log loss, reliability plots) by format/course/assistance, enough observations; no speculative mastery scores.
- **Schedule utility**: minutes actually studied, completion/adherence, overdue volume, missed high-priority exam targets, available time respected, unnecessary switches, burden/stress.
- **Experimental comparisons**: if enough willing users, compare policies with matched time and task types and independent delayed outcomes, with privacy-preserving opt-in. Simulations can test capacity and invariants but **cannot demonstrate learning improvements** if they invent future successes.
- **Safeguards**: every schedule plan explains why; no generated source claims from missing PDF pages; no paid services; backup and local-only storage.

## 7. Selected academic references and implementation references
1. Ruitenburg, S. K., et al. (2026). Meta-analysis in authentic school classrooms. *Educational Psychology Review*. https://doi.org/10.1007/s10648-026-10225-5
2. Dunlosky, J., et al. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest*. https://doi.org/10.1177/1529100612453266
3. Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin*. https://doi.org/10.1037/0033-2909.132.3.354
4. Cepeda, N. J., et al. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*. https://pubmed.ncbi.nlm.nih.gov/19076480/
5. Rowland, C. A. (2014). Testing versus restudy meta-analytic review. *Psychological Bulletin*. https://pubmed.ncbi.nlm.nih.gov/25150680/
6. Adesope, O. O., et al. (2017). Rethinking the use of tests: Meta-analysis. *Review of Educational Research*. https://doi.org/10.3102/0034654316689306
7. Agarwal, P. K., et al. (2021). Retrieval practice in applied schools/classrooms. *Educational Psychology Review*. https://doi.org/10.1007/s10648-021-09595-9
8. Mawson, R. D., & Kang, S. H. K. (2025). Distributed practice in classrooms: Meta-analysis. https://pubmed.ncbi.nlm.nih.gov/40564553/
9. Latimier, A., Peyre, H., & Ramus, F. (2021). Spacing retrieval practice episodes meta-analysis. *Educational Psychology Review*. https://eric.ed.gov/?id=EJ1310148
10. Rawson, K. A., & Dunlosky, J. (2011). Optimizing retrieval practice schedules. *Journal of Experimental Psychology: General*. https://doi.org/10.1037/a0023956
11. Rawson, K. A., Dunlosky, J., & Sciartelli, S. M. (2013). Successive relearning. *Educational Psychology Review*. https://eric.ed.gov/?id=EJ1036741
12. Lindsey, R. V., et al. (2014). Personalized review in a middle-school course. *Psychological Science*. https://doi.org/10.1177/0956797613504302
13. Pavlik, P. I., & Anderson, J. R. (2008). Model-based optimal practice schedule. https://pubmed.ncbi.nlm.nih.gov/18590367/
14. Settles, B., & Meeder, B. (2016). Trainable spaced repetition for language learning. *ACL*. https://research.duolingo.com/papers/settles.acl16.pdf
15. Pan, S. C., & Rickard, T. C. (2018). Transfer of test-enhanced learning: Meta-analysis. https://pubmed.ncbi.nlm.nih.gov/29733621/
16. Butler, A. C. (2010). Repeated testing and transfer. https://pubmed.ncbi.nlm.nih.gov/20804289/
17. Karpicke, J. D., & Roediger, H. L. (2007). Expanding versus equally spaced retrieval. https://pubmed.ncbi.nlm.nih.gov/17576148/
18. Brunmair, M., & Richter, T. (2019). Similarity matters: Interleaved learning meta-analysis. https://pubmed.ncbi.nlm.nih.gov/31556629/
19. Rohrer, D., et al. (2010). Interleaving mathematical problem types. https://doi.org/10.1002/acp.1598
20. Bisra, K., et al. (2018). Inducing self-explanation meta-analysis. https://doi.org/10.1007/s10648-018-9434-x
21. van Gog, T., & Sweller, J. (2015). Limits of testing with highly complex materials. https://doi.org/10.1007/s10648-015-9310-x
22. Pashler, H., et al. (2005). Feedback after errors. https://pubmed.ncbi.nlm.nih.gov/15641900/
23. Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval can enhance later learning. https://web.williams.edu/Psychology/Faculty/Kornell/Publications/Kornell.Hays.Bjork.2009.pdf
24. Gonçalves, et al. (2025). Retrieval versus elaborative encoding meta-analysis. https://doi.org/10.1007/s10648-025-10076-6
25. Gorgun et al. (2024). Limitations of evaluation in automatic question generation. https://proceedings.mlr.press/v257/gorgun24a.html
26. Question generation in education review (2025). https://pmc.ncbi.nlm.nih.gov/articles/PMC12453861/
27. Bloom-aligned question generation review (2026). https://www.mdpi.com/2076-3417/16/21/10742
28. Official Anki FSRS and desired retention documentation, **software documentation, not independent efficacy trial**: https://docs.ankiweb.net/deck-options.html
29. Open-source FSRS benchmark, **developer-run prediction benchmark, not randomized educational efficacy study**: https://github.com/open-spaced-repetition/srs-benchmark
30. Open-source static-build candidate with MIT licence: https://github.com/open-spaced-repetition/ts-fsrs

**Bottom line:** Build a learner-supervised, source-grounded question-quality engine and a capacity-aware rolling multi-week review agenda. Use the strong *general* evidence for retrieval, feedback and spacing, but label the exact prioritization weights, memory parameters, schedules and performance claims as hypotheses until validated on real delayed learning outcomes.
