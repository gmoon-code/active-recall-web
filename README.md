# Active Recall Web — Free Edition v3.7

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

## Blueprint 3.4 — Guided learning before recall

In **Knowledge → Course & syllabus objectives → Guided first learning**, choose a saved source from that course, inspect its current version, and write a worked explanation. Only after that source and explanation are hidden does a linked, verified question become available for an independent attempt. Reveal the reference answer, then self-rate. This **real** attempt schedules a next review and is labelled *immediate post-study*, distinct from evidence of delayed retrieval. If the syllabus goal has no verified question, the app routes to question creation instead of inventing a grade. Old schema-v5 backups remain compatible. See [`docs/BLUEPRINT_3_4_FREE.md`](docs/BLUEPRINT_3_4_FREE.md).

## Blueprint 3.5 — Specific corrective feedback

The **Guided first learning** and **Study Now** answer-reveal screens now offer the same learner-verified explanation checklist: Included / Missed / Unsure. You can also save a short correction or next-step note. The relevant prior correction stays hidden before the next independent retrieval attempt and can be opened **after** its answer is revealed. History shows the original criterion snapshots; edited criteria are not silently treated as current. Missing or uncertain criteria keep the review schedule conservative, as before. An empty checklist remains unassessed rather than wrong. No AI grading, no paid services, no schema migration or old-history rewrite. See [Blueprint 3.5](docs/BLUEPRINT_3_5_FREE.md).

**Verification:** 252/252 automated tests and 6/6 free GitHub Pages preflight checks passed; separate Chromium desktop/mobile interaction tests passed with simulated local storage. The study calendar still uses provisional interval heuristics, not empirically validated optimum intervals.


## Blueprint 3.6 — Source evidence and rubric quality review

Open **Knowledge → Rubric** for a recall focus to see an offline **Source evidence checklist**. It highlights explicit conditions, consequences, contrasts, mechanisms and qualifiers from exact saved text, and indicates which excerpts are literally linked to verified or pending criteria. You may select individual candidates as **unverified drafts**, inspect their context, edit, and explicitly verify them. This does not produce automatic correctness judgments, fabricated study attempts, new due dates or external AI calls. Changed sources and questions invalidate stale suggestions. The study calendar and database schema v5 remain unchanged. See [Blueprint 3.6](docs/BLUEPRINT_3_6_FREE.md).

**Verification:** 264/264 automated tests and six static deployment checks passed. Chromium desktop/mobile rubric review and legacy guided-learning smoke tests passed with simulated local storage. The matching statuses are string-level evidence links, not scientific validation or proof of curriculum completeness.

## Blueprint 3.7 — Syllabus-aligned answer rubrics

In **Knowledge → Rubric**, learners can save up to five human-reviewed alternative expressions for one explanation checkpoint, then re-verify the checkpoint before using these forms in study. A checkpoint can also be explicitly mapped to syllabus objectives already linked to its question. Mappings are annotation counts, not proof of knowledge, curriculum coverage or scientific correctness. Changing the criterion's wording invalidates its current alternate expressions and goal mappings while retaining history. No new due reviews, automatic grading, payments, accounts, or database migration. [Read Blueprint 3.7](docs/BLUEPRINT_3_7_FREE.md).
