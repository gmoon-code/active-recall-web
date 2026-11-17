# Active Recall Web — Free Edition v4.1

A local-first active-recall system with a **single multi-course automatic review agenda**, source-linked learning objectives, reviewed question drafts, and sessions that adjust to time budgets and assessments.

**Public website:** https://gmoon-code.github.io/active-recall-web/


## Blueprint 4.1 — Human-reviewed explanation evidence

**Progress → Human-reviewed explanations & problem-solving** now lets you inspect a saved **written** explanation/application alongside its **original question, reference answer and contemporaneous rubric**. For each criterion, a person chooses Included / Not demonstrated / Uncertain / Not assessed. "Included" requires an exact excerpt copied from the original response; gaps and uncertainty require a written reason. The software confirms that excerpts really occur in the response, but **never infers scientific correctness or grades meaning**.

Reviews can be completed by the learner or recorded as another person's review (unverified self-report). Amendments append a new version and keep earlier reviewer judgments and the original self-rating. A newer rubric is never silently applied to an older response. Older attempts without a complete saved rubric snapshot remain unreviewable rather than being given retroactive evidence. The original due date, scheduling policy, and all past practice data remain unchanged.

The new Progress audit describes **actual delayed, independent, written attempts** that received a conclusive manual review and were reviewed before any subsequent practice of that same version. Percentages stay withheld until 20 eligible reviews across 10 targets. This is descriptive human judgment, **not calibrated retention, validated grading, blinded assessment, or causal evaluation of scheduling**.

No cloud data, accounts, billing or paid AI. Existing schema-v5 backups still import; export your JSON backup before a version upgrade. [Read Blueprint 4.1](docs/BLUEPRINT_4_1_FREE.md).

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

## Blueprint 3.8 — Evidence about actual delayed retrieval

Open **Progress → Delayed retrieval evidence audit** to inspect real spacing between written recall attempts (at least 24 hours after earlier practice on the same version), without counting immediately studied, hinted, or unrecorded spoken/mental responses as equivalent evidence. The audit is descriptive, based on learner self-ratings—not externally graded correctness, scientifically calibrated retention, or proof that any interval is optimal. Small-sample percentages are suppressed. New actual attempts preserve the previously proposed review due date for later evaluation; the scheduler's current interval heuristics are unchanged. Analysis is local, schema-v5 compatible, and free. See [Blueprint 3.8](docs/BLUEPRINT_3_8_FREE.md).

## Blueprint 3.9 — Prospective scheduling policy audit

**Progress** now records two *versioned* next-review recommendations when an actual attempt is completed: the **unchanged active interval**, which sets the real next review date, and a deliberately conservative **hypothetical shadow interval**. The audit displays counts and one-step median intervals, not a claim about which policy improves learning or predicts future workload. Historical attempts remain unchanged, and older schema-v5 JSON backups remain valid. No server, payment, cloud grading, or remote analytics is required. [Read Blueprint 3.9](docs/BLUEPRINT_3_9_FREE.md).


## Blueprint 4.0 — Strict short-answer checks, without changing the scheduler

In **Knowledge → Literal check**, you can explicitly approve up to five short answer strings for a verified, recall-type question. The local app checks typed responses against those strings **only after you reveal the reference answer**. It ignores case and repeated whitespace, but does not understand synonyms, scientific equivalence, calculations, or complex reasoning; a valid explanation can produce NO MATCH.

This optional result is stored separately from your own answer rating, alongside the exact approved key version. It **does not override your self-rating or change review intervals**. In **Progress → Delayed short-answer literal checks**, results are described for actual independent written attempts spaced at least 24 hours after prior practice. Percentages are withheld for fewer than 20 checks across fewer than 10 distinct recall targets. Historical attempted answers and the calendar remain unchanged, and old schema-v5 JSON backups stay compatible.

**Everything remains permanently free and browser-local.** Literal matching is a narrow observation, not a validated grade, independent scientific correctness judgment, or evidence that one spaced scheduling policy is superior. See [Blueprint 4.0](docs/BLUEPRINT_4_0_FREE.md).
