# Blueprint 3.1 — Source coverage review inbox
**Release:** 16 November 2026. **Site:** https://gmoon-code.github.io/active-recall-web/  
**Zero-payment architecture:** static GitHub Pages, no paid APIs, billing, subscriptions or required accounts.  
**Database:** unchanged browser-local schema v5.

## Goal
Active Recall Web is principally an automatically updated **cross-course spaced review calendar**. Questions are its inputs; producing many incomplete or duplicate questions would undermine that goal. This release adds a reviewable pipeline from explicit source relationships to question drafts, while keeping learner verification mandatory.

## Implemented
1. A collapsible **Source coverage review inbox** in Knowledge, per selected course. It scans all saved source parts and proposes a limited set of explicit relationships that are unmapped or have only improvable generic drafts.
2. A larger on-demand scan of up to 240 proposals per source part, rather than stopping at 12 initially generated drafts or the previous 80-proposal internal lookup. The inbox itself shows up to 18 items by default and identifies additional items.
3. Each candidate presents its saved source title, recoverable section, relationship type, proposed question, and an expandable **exact source quote**. Proposal identity includes source offsets and content-dependent keys; stale source proposals are rejected.
4. **Improve existing draft** reuses the original requirement and recall target when appropriate; **Draft question for review** creates a new *unverified* draft. No action silently verifies content, changes due review dates, or fabricates study attempts.
5. Conservative additional English patterns: explicitly stated **requires/depends on** relationships and **results in/leads to** consequences. These merely propose questions; they are not semantic validators.
6. Grouped missing-text PDF warnings count once per document import, not once per stored chunk, and the inbox does not infer content from unextractable scanned pages.
7. Source revision handling can re-anchor an improved draft to the current exact source excerpt, still requiring user verification.
8. The compact collapsible panel preserves readability; the source-linked quality audit and v3.0 objective map remain available below it.

## Research and honesty requirements
- **These are parseable relationships, not curriculum importance rankings.** Missing relations do not prove a learning objective is important; no relations found does not prove full understanding or syllabus coverage.
- Source notes can be inaccurate, incomplete, or contradict other sources. An automatically phrased question must be inspected, edited, and verified.
- The deterministic offline parser cannot reliably construct complex mechanistic explanations, mathematical derivations, validated transfer problems, diagrams, figure-based concepts, Korean-language claims, or unsupported scientific conclusions.
- The original reference answer is an exact excerpt, not guaranteed to be a sufficient rubric. Learners should verify and refine answer criteria.
- The existing calendar's interval multipliers and future conditional reviews are not claimed to be universally optimal; the app does not independently grade recall or predict examination scores.

## Validation
- **199/199 Node automated tests** (14 new) cover dependencies/consequences, excerpt offsets, scanning beyond 80, avoiding duplicate-source obligations, source sections, prior-schema compatibility, source revision safeguards, PDF gap counts, and review-gated adoption.
- **6/6 GitHub Pages static preflight checks** passed.
- Chromium simulated-storage smoke tests covered capture → coverage review inbox → edited draft, no script errors, and 390px mobile with zero horizontal overflow.
- The browser-local study database remains v5 and the service-worker cache identifier is **active-recall-web-v3-1**. Reload rather than clearing site data.

## Subsequent work
Learner-defined syllabus objectives and explicit PDF/figure omissions; improved evidence-backed causal rubrics and distinct transfer competencies; calibrated memory models using actual delayed independent recall evidence.

See [academic research and implementation priorities](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).
