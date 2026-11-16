# Active Recall Web — Blueprint 2.9: Source-Grounded Question Studio

**Release:** November 16, 2026  
**Hosting:** Free GitHub Pages; offline-first browser-local application; no paid API, subscriptions, billing, or accounts.  
**Compatibility:** Preserves local schema v5, existing review attempts, source versions and the v2.7–v2.8 rolling calendar.

## Purpose

The website's primary goal remains a continually updated, time-budgeted and assessment-aware **multi-course active-recall calendar**. The quality of its questions limits the calendar's educational usefulness. The v2.8 audit can identify vague questions and unmapped source statements; v2.9 adds a way to prepare better questions without making unsupported scientific claims or inventing learning successes.

## Implemented

1. **Offline Question Studio** on each saved source in Knowledge. The user can open suggested, literal-source-linked retrieval questions and reference answers. No download or paid generative model is required.
2. **Explicitly structured templates**, currently limited to definitions, mechanisms (the source says **by**), causes (**because/due to**), contrasts (**whereas/in contrast to**), conditional outcomes (**if …, then …**), some numerical conditions such as pH or temperature, and simple described effects.
3. **Exact provenance:** each candidate references an exact saved source span with character offsets and a source-content fingerprint in its key. Candidate acceptance re-generates the suggestion from the latest saved source; arbitrary or stale keys are rejected.
4. **No automatic acceptance:** choosing a candidate creates an **unverified rule draft** or improves an existing generic unverified rule draft. It opens the existing question editor, where the learner may revise the question and answer before verification. Neither a new nor an improved unverified draft can enter the rolling calendar until verified.
5. **Question coverage recovery:** draft generation initially produces up to twelve drafts for each saved source. Question Studio can offer candidates for additional explicitly structured statements, helping cover some otherwise unmapped text without fabricating coverage.
6. **Duplicate and history safety:** exact already-saved wording is not offered again for adoption. Structured proposals may reuse previously represented source material, but existing verified requirements and their practice history are never overwritten. An overlapping new question is flagged for review. Revising an unverified generic draft keeps its ID and snapshot history rather than generating a separate duplicate recall target.
7. **Existing rubric support:** independently managed criterion checklists and source-linked suggestion features remain available; pending criteria are held for re-verification after substantive draft changes.
8. **Rolling agenda compatibility:** the calendar and Study Now only schedule eligible, learner-verified targets. The question creation process never fabricates learning attempts or predicted outcomes.

## Limits and scientific caution

- This is **deterministic pattern recognition, not a language model**, scientific fact-checking, validated concept extraction or comprehensive curriculum analysis. It is strongest for explicit English prose. It does not guarantee quality, complete coverage or novel transfer.
- The reference answer reproduces the saved excerpt; the learner must check accuracy, relevance, comprehensibility and completeness. A source can be wrong.
- The current templates do not semantically interpret multi-column PDF layouts, figures, graphs, diagrams, chemical equations, derivations, symbolic mathematics or all Korean/multilingual writing. Unstructured material may receive no proposal, deliberately.
- Conditional outcomes have been classified as explanation questions rather than pretending an unchanged source scenario constitutes validated transfer.
- Source-referenced question proposals are reviewed by the learner. Verification means a **human learner approved the wording**, not independent certification of content quality or proof of learning.
- The review intervals, model weights and calendar capacity rules still remain provisional product models, not established optimal intervals or validated learning forecasts.

## Quality and safety tests

- Regression suite: **173 passing tests** (161 prior + 12 new v2.9 tests), covering exact source snippets, seven structural templates, ambiguity abstention, number leakage, stale source rejection, duplicate guards, unverified gating, improvement of weak drafts, recovering beyond the original 12-draft cap, and preservation of verified requirements.
- Browser smoke test: Chromium simulated local storage, create course, save source, open Question Studio, select an improvement, inspect source-backed edit modal, verify draft remains unverified before approval, and test mobile for overflow and JavaScript errors.
- GitHub Pages checks: relative paths, cached required scripts, no required paid or remotely loaded runtime, and valid .nojekyll deployment.

## Next steps

Prioritise a learner-friendly **learning-objective map across whole lectures** (including user-added goals, definitions, mechanisms, distinctions, procedures and missing PDF material), preview **genuinely distinct question families** for the same independently scheduled target, and improve the feedback/answer-rubric workflow. Only after validity checks should we evaluate adding optional, offline AI models. The rolling calendar remains the central product and should integrate better-quality questions without multiplying redundant targets or misrepresenting self-reported mastery.

See `docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md` in the connected repository for the scholarly rationale and cautions.
