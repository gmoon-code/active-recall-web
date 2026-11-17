# Active Recall Web — Free Edition v3.3

A local-first active-recall system with a **single multi-course automatic review agenda**, source-linked learning objectives, reviewed question drafts, and sessions that adjust to time budgets and assessments.

**Public website:** https://gmoon-code.github.io/active-recall-web/

## New in v3.1

- The **Knowledge → Source coverage review inbox** identifies parseable, explicit relationships that still need a question or can improve an unverified generic draft. Review candidates across all saved source parts, not just the first 12 questions.
- View source title, section, a proposed standalone question and the exact original quote before choosing. Existing drafts are improved in place when safe; new proposals require explicit verification before joining the automatic review queue.
- New transparent offline templates support stated dependencies and consequences. They are not semantic proof, curriculum validation or an AI tutor.
- Source-based PDF gaps remain visible, and edited source versions invalidate stale proposals. No schema migration, memory reset, review history rewrite or paid dependency.

## Recommended workflow

Capture or import your material → inspect PDF extraction and source gaps → open **Knowledge** → expand **Source coverage review inbox** → inspect a relevant excerpt and click to create or improve a **draft** → edit and verify the question and answer → let the existing **Calendar** and **Study Now** organise future retrieval.

**Important:** The inbox detects explicit English sentence relationships only. It does **not** guarantee identification of important curriculum concepts, conceptual understanding, mathematical derivations, diagrams, or all learning goals. Drafts may be inaccurate even when copied directly from incorrect notes. Learners must verify science and question quality themselves.

The rolling agenda proposes future review opportunities within time budgets and assessment constraints. Its precise interval coefficients are not scientifically validated as optimal, and its conditional future sessions are not claimed to be successful future learning.

## Privacy and permanent free-only rule

The app uses free GitHub Pages to host **static code only**. Your learning materials, notes, question edits, attempts and review history stay in your browser, not in GitHub. Data are not synced between devices; export JSON backups. Browser data may be evicted even when persistent-storage permission is denied. Never upload private course notes or backup files to this public repository.

Everything necessary to build, host, maintain and use this software must remain **100% free**: no paid API, hosting, subscription, credit card, billing details or mandatory remote AI. The optional full PDF.js fallback uses a free third-party library and asks before loading it online.

## Tests

```bash
node --test test-*.cjs
node deploy-preflight.cjs
```

Documentation: [`docs/BLUEPRINT_3_1_FREE.md`](docs/BLUEPRINT_3_1_FREE.md) · [`docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md`](docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md).

## Blueprint 3.3 — Syllabus objectives

The **Knowledge** page now supports an explicit, learner-authored syllabus objective list per course. Paste one outcome per line, then link existing approved questions or write new ones. Unmatched syllabus outcomes remain visible and are **not** silently omitted from the curricular audit or fabricated as studied material. Links are explicit and cross-course links are rejected. A goal being linked to a question is not a mastery grade or evidence the learner has passed an exam. This feature is local-only and retains the schema-v5 backup format.

Specification: [`docs/BLUEPRINT_3_2_FREE.md`](docs/BLUEPRINT_3_2_FREE.md).

## Blueprint 3.3 — Preparation before spaced review
Unmet syllabus objectives now generate short, explicitly separate preparation steps in the rolling calendar. After you mark materials **prepared (not learned)**, the proposed step becomes question writing, then draft review. Only explicitly verified recall targets enter spaced practice. The calendar never creates imaginary study attempts or adjusts memory on the basis of preparation. Daily preparation and review fit the same available time budget. The learning record remains schema v5; download JSON backups regularly. See [Blueprint 3.3](docs/BLUEPRINT_3_3_FREE.md).
