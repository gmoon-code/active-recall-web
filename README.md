# Active Recall Web — Free Edition v4.23

## Blueprint 4.23 — Flag unreliable questions and repair them deliberately

During any Study Now session, **Flag for correction · skip** records no answer and puts the entire problematic Q&A out of future automatic sessions and the calendar until reviewed. The v4.22 session summary also lets you flag an already skipped question. In **My Q&A → Questions needing correction**, review or edit each held question and its reference answer, then explicitly confirm **Reviewed · resume** to return it to normal eligibility. Ordinary unflagged skips remain session-only; a genuine failed recall should still be rated **Again**. Holds never change previous attempts, ratings or due dates; wording-only versus substantive edits retain the existing interval behaviour, and backing up / permanently deleting questions handles optional schema-v5 hold metadata safely. No change to the active scheduler, free offline/local data model or GitHub Pages hosting. [Read Blueprint 4.23](docs/BLUEPRINT_4_23_FREE.md).

## Blueprint 4.22 — Skip a question without inventing a recall result

During a normal or due-only study session, use **Skip question · no rating** to set aside an unclear or unsuitable question without changing any learning record, rating, or next-review date. The skipped focus is excluded only from that session. The session summary shows skipped questions separately from actually rated attempts and provides a direct **Edit Q&A** button; the question stays eligible in later sessions under its original schedule. If the question itself is valid and you cannot remember its answer, reveal the reference and choose **Again** instead—skipping is not a difficulty rating. Optional schema-v5 session skip IDs are checked on backup import and removed on permanent question deletion. The original queue, intervals, offline storage, and 100% free GitHub Pages hosting are unchanged. [Read Blueprint 4.22](docs/BLUEPRINT_4_22_FREE.md).

## Blueprint 4.21 — Catch up on due reviews, when you choose

Open **Study Now → Catch up on due reviews** to see previously attempted questions due now, those that can fit the selected time budget, and due work still waiting. New questions are counted separately. The card notes due dates falling on declared unavailable/rest days without labelling them missed study commitments. Press **Start due-only session** to explicitly practise *only* due reviews; the normal mixed session remains the default. No new or early-maintenance questions slip into the catch-up session, while course balancing, deadlines and the **original rating/interval policy** continue to operate. Previewing or starting a session does not invent attempts, change due dates or mark anything correct. The app stays free, offline-capable and browser-local with schema-v5 backup compatibility. [Read Blueprint 4.21](docs/BLUEPRINT_4_21_FREE.md).

## Blueprint 4.20 — Inspect prospective prediction evidence

Open **Progress → Prospective prediction evidence check**. The new **read-only** quality audit pairs v4.19's frozen pre-answer curve guesses with real delayed written outcomes, while separating exact short-fact literal agreement from learner-reviewed and other-person-reviewed explanations or applications. It excludes first/revised targets, hints, short delays, non-written responses and unreviewable labels. Descriptive target-balanced Brier errors are **withheld** until each separate evidence stream has at least 50 observations across 15 targets and includes both positive and negative labels. Even then, the values concern **unfitted mathematical curves and narrow recorded labels**, not FSRS, verified memory accuracy or proof that a changed study policy would work better. The same review intervals, question selection, local schema-v5 data and permanently free hosting remain. [Read Blueprint 4.20](docs/BLUEPRINT_4_20_FREE.md).

## Blueprint 4.19 — Freeze experimental forecasts before studying

For previously practised questions, **Study Now** silently freezes two versioned, **unfitted mathematical recall-curve hypotheses** before showing the reference or receiving a rating. Only a completed attempt saves its receipt. **Progress → Memory-model evaluation readiness** now reports actual pre-answer receipts and how many can be paired with eligible delayed written and separately labelled literal/manual outcomes. The formulas share an arbitrary 90% due-interval anchor; this is **not actual measured retention, FSRS, a calibrated prediction, or a new scheduling rule**. No predictions affect question order, due dates, grading, schema-v5 backups, or the free local-only operation. [Read Blueprint 4.19](docs/BLUEPRINT_4_19_FREE.md).

## Blueprint 4.18 — Is the evidence ready for a memory-model comparison?

Open **Progress → Memory-model evaluation readiness** to inspect how much genuinely delayed, written retrieval evidence is available. The read-only audit separates strict short-answer literal matching from self-reviewed and other-person-reviewed explanations, shows distinct target counts, exclusion reasons, and illustrative earlier/later chronological partitions. It explicitly reports that there are **no prospective recall-probability forecasts**: current and hypothetical interval timestamps cannot establish which scheduling model predicts retention better. **No FSRS model, grading, policy change, due-date adjustment, new schema field or network call** is introduced. The audit is not a readiness certification or a measure of mastery. [Read Blueprint 4.18](docs/BLUEPRINT_4_18_FREE.md).

## Blueprint 4.17 — Why does the app select these study questions?

Open **Study Now** and inspect **Why are these questions prioritised?**. The new read-only comparison shows the current priority shortlist alongside a hypothetical **review-first** shortlist for the chosen session length, with question-specific reasons (due vs new, assessment deadlines, earlier difficulty, explanation-checklist gaps) and explicit estimated durations. It respects question eligibility and available time. The current queue, its active interval policy and all saved data remain unchanged; review-first is **not** Anki FSRS or a calibrated recall prediction. The first item in the current shortlist reflects the app's present next-question choice, while later choices may change after each actual response. [Read Blueprint 4.17](docs/BLUEPRINT_4_17_FREE.md).

## Blueprint 4.16 — Compare study schedules before applying changes

In **Calendar → What if I changed my study time?**, enter alternative weekday/weekend minutes or unavailable dates and press **Preview schedule changes**. The app calculates two plans using the same current question priorities and time horizon, without saving the proposal. Compare available/assigned minutes, first known review opportunities, due work not placed, preparation, conditional revisits, question opportunities moved earlier/later, and assessment-specific opportunity counts. Only **Apply proposed availability** followed by explicit confirmation changes saved availability and appends a dated plan revision. Discarding or cancelling leaves your information unchanged. This does not change recall memory, due dates or question results; it is **not FSRS** and does not estimate forgetting or future exam results. [Read Blueprint 4.16](docs/BLUEPRINT_4_16_FREE.md).

## Blueprint 4.15 — Log study outside the app

**Progress** includes a quick self-report form for studying elsewhere: choose a date within the last 30 days, minutes (1–720), activity and an optional short note. Each entry appears in its date's study history and can be deleted. Entries are saved with local JSON backups. The weekly reflection flags repeated days when reported outside study exceeds declared availability, or observed available days with no activity recorded. These are prompts to inspect the plan, **not conclusions about discipline, success or memory**. Outside minutes and timed in-app question attempts remain separate, may overlap, and are never added into a misleading total. Outside-study logs do not create recall attempts, satisfy assigned questions, change spaced-review dates or silently revise the calendar. [Read Blueprint 4.15](docs/BLUEPRINT_4_15_FREE.md).

A local-first active-recall system with a **single multi-course automatic review agenda**, source-linked learning objectives, reviewed question drafts, and sessions that adjust to time budgets and assessments.

**Public website:** https://gmoon-code.github.io/active-recall-web/

## Blueprint 4.14 — Study Rhythm & Schedule Fit

**Overview** now shows a compact schedule-fit check; **Calendar** shows known due review demand *including due work left unassigned* under current capacity and priorities, plus a seven-day assigned-work outlook; **Progress** now presents seven days of recorded study rhythm. The new read-only fit model distinguishes the user's available study minutes, estimated work and actual recorded attempts, while treating rest days and unobserved days as different states. A priority/assignment gap is distinguished from a true capacity shortfall.

The app takes a dated snapshot of the current plan when opened with active learning material, and creates a separate revision when the user saves different availability. This preserves the distinction between the earlier observed plan and the current recalculation. The records live in the existing local schema-v5 JSON backups. **Old history is not fabricated** and absence of activity in this app is not proof the learner did not study. No automatic due-date changes, punitive streaks, mastery scores, paid services or cloud tracking were added. [Read Blueprint 4.14](docs/BLUEPRINT_4_14_FREE.md).

## Blueprint 4.13 — Permanently erase deleted Q&A

**My Q&A → Deleted questions · restore** now offers **Delete permanently** for each previously archived question and **Delete all permanently** for every archived question in the selected course. The operation is separate from ordinary reversible Delete/Restore and requires typing the exact confirmation word `DELETE`.

Permanent erasure removes the question and answer from the current browser database, including stored earlier versions, all its recall targets, variations, rubrics, linked practice attempts and response snapshots, personal timing/memory data and local audit records. It also removes stale references from syllabus goals, selected assessments and source overlap links. Original lecture notes, other questions and courses are kept. A locked reviewer pilot prevents erasing attempted questions when that would invalidate its fixed evidence record. **This cannot be undone through Restore**: export a JSON backup before proceeding if you may want the material later. Existing backups or copies on other devices are **not** erased. No server or billing is involved, and schema v5 and the existing scheduler remain. [Read Blueprint 4.13](docs/BLUEPRINT_4_13_FREE.md).

## Blueprint 4.12 — Copyable bulk Q&A formatting instructions

In **My Q&A → Paste or upload a list of questions & answers**, the new **Copyable Q&A formatting rules** section shows a compatible two-question example and a fully selectable, read-only set of instructions. Press **Copy formatting rules** and paste the instructions into ChatGPT along with your lecture notes to request precisely labelled `Q:` / `A:` pairs, one blank line between pairs, no unrelated headings, and no unsupported factual additions. Paste **only the generated question-and-answer blocks** back into the app, then use its read-only preview before confirming import. Copying the rules does not add anything to the study queue. The source text remains local, and no paid or remote generation is built into the application. [Read Blueprint 4.12](docs/BLUEPRINT_4_12_FREE.md).

## Blueprint 4.11 — Easily delete or restore lecture Q&A

In **My Q&A**, press **Delete** beside any question and confirm. To delete several questions at once, choose **Select multiple**, check the relevant items (or **Select all shown** for the selected lecture), and press **Delete selected**. Nothing is removed if you cancel confirmation. A **Deleted questions · restore** section lets you bring individual Q&A pairs back.

Deletion takes the question and its answer out of My Q&A, future study sessions and the calendar. It is deliberately **reversible**: original question/answer records, previous study attempts and review dates are retained locally, and restoring the question reinstates its existing schedule. It does not silently reset progress, remove other lectures, or change scheduling algorithms. All deletion and restoration work happens in the same local storage as before; schema-v5 JSON backups remain compatible. [Read Blueprint 4.11](docs/BLUEPRINT_4_11_FREE.md).

## Blueprint 4.10 — Paste or upload complete Q&A lists

Open **My Q&A → Paste or upload a list of questions & answers**. Select the destination **course** and (optionally) lecture, then either paste or choose a file. The local importer accepts:

- **TXT/Markdown:** one `Q:` line followed by one `A:` line, repeated (including multiline answers).
- **CSV/TSV:** exported from Excel or Google Sheets, with `Question` and `Answer` headers (or simply two columns). Optional `Lecture`, `Type` and `Course` columns preserve lecture grouping and retrieval type or check the selected course.
- **JSON:** an array of `{ "question": "...", "answer": "..." }` objects, with optional lecture/type/course fields.

**Preview the entire parsed list before clicking Confirm and save.** Uploading a file or previewing pasted text **does not create questions** or schedule reviews. All 200-or-fewer entries are checked together for structural problems, wrong courses, lecture-source mismatches and duplicate questions. If any entry fails, the entire import is rejected, without changing existing records. Source notes, attempts, review dates, scheduling policies, rubrics and backups are preserved. Imported questions remain learner-authored reference answers—not automatically scientifically checked or semantically graded. Maximum input size: **400 KB**. `.xlsx` should be exported to `.csv` or `.tsv` first.

The site stays 100% free, offline-capable and browser-local. No upload server, payment, paid AI, account or database migration is involved. [Read Blueprint 4.10](docs/BLUEPRINT_4_10_FREE.md).

## Blueprint 4.9 — Your lecture questions, written your way

**My Q&A** is now a dedicated navigation page for creating, organising and editing the questions you actually want to practise. Choose a course, optionally link saved lecture notes, or simply type a lecture name without uploading any notes. Write a question and reference answer and choose Recall / Explain / Apply. **Save question + add another** keeps the lecture context selected for rapid successive entry. You can also paste up to **50 clearly labelled `Q:` / `A:` pairs** at once, including multiline answers; any malformed or repeated pair rejects the entire batch rather than saving some silently.

Every saved question appears by lecture with an **Edit Q&A** action. Revisions preserve earlier study attempts. Explicitly choose between a *wording-only* edit (retains existing review timing) and a *substantive* edit (restarts that question's current interval). Existing unverified rule-generated drafts remain unverified even after being rewritten; the **human Q&A check** is still required before scheduling them. The manual question's association with a lecture is for organisation, **not proof** that the reference answer was scientifically verified against the notes.

**Capture and PDF/TXT/Markdown import now default to saving notes without generating any questions.** You can opt in to older deterministic source-grounded draft proposals when they are useful, but they remain drafts until reviewed. After saving notes, the app opens My Q&A with that lecture selected. This change responds to the current rule generator's limited ability to make specific, useful questions from arbitrary notes; no AI quality or understanding is claimed.

No account, payment, paid API, cloud service, schema upgrade or scheduling-policy change. Existing learning records and schema-v5 JSON backups remain compatible. The evidence-based alternative spacing-policy comparison planned previously remains next **after this learner-controlled question-writing usability correction**.

[Read Blueprint 4.9](docs/BLUEPRINT_4_9_FREE.md) · [Read the underlying question-design and scheduling research](docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md)

## Blueprint 4.8 — Question and answer quality, before schedule changes

The **Knowledge → Q&A quality** action now opens a source-aware, **human-confirmed** inspection of any active question and its reference answer. It shows the saved source excerpt, question and answer, and non-semantic structural warnings for overly generic wording, missing standalone context, outdated source links, suspiciously long reference answers, omitted literal qualifier words in a paraphrase, and absent active explanation checkpoints. No automatic scientific correctness or answer grade is inferred.

When verifying a generated draft from Knowledge, the owner now explicitly confirms **four separate checks**: standalone and coherent question, reference accuracy/support, retention of conditions/exceptions/units and causal links, and answer sufficiency/valid alternatives. **Editing an unverified generated question keeps it a draft** until those checks are acknowledged. Each affirmative review is recorded against the **current question version and source version**. A newer version is not silently presented as previously checked; an excerpt missing from the currently linked source blocks the approval workflow until repaired. This is a learner attestation, not independent scientific validation.

Offline Question Studio also recognizes explicitly stated **necessary conditions** (`only if` / `only when`) and **exceptions** (`unless`) before broad effect patterns, preserving the original exact quote. It does not invent a causal explanation or treat a necessary condition as sufficient. Every suggestion remains an unverified draft until reviewed.

**No scheduling policy or due date has changed.** v4.8 preserves schema v5, all prior study attempts, human reviews, reviewer exercises, memory states, backups, no-account operation and 100%-free GitHub Pages hosting. A human Q&A review does not count as a study attempt or prove retention. Quality flags are prompts for inspection, not a validation score. Next: evidence-based, read-only spacing-policy and calendar comparison before any active-policy change.

[Read Blueprint 4.8 and its verification/limitations](docs/BLUEPRINT_4_8_FREE.md) · [Research baseline for question generation and scheduling](docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md)


## Blueprint 4.7 — Small, voluntary reviewer-usability pilot

In **Progress → Reviewer usability micro-pilot**, a coordinator can preallocate **3, 5, 8, or 12 fixed invitation slots** before recruiting volunteers. Each invitation has a random code and contains only the frozen v4.6 **fictional** science explanation casebook, seven original rubric rows and a five-item optional clarity questionnaire. The separate [offline participant exercise](reviewer-usability-offline.html) runs as a standalone file without accounts, network requests or browser storage.

Each participant records first-pass fictional judgments and exact text evidence, then optionally rates clarity of the response categories, quotation rules, Uncertain option, rubric criteria and navigation from **1 (strongly disagree) to 5 (strongly agree)**. Every question can be skipped. The participant can end without sharing a file; only an explicitly consented download can be imported by a coordinator. Discussion guidance becomes visible in the interface after submission, but is always inspectable in the HTML source. No technical blinding or reviewer verification is claimed.

The coordinator's local dashboard counts fixed invitations, **returned files, nonreturns and skipped answers separately**. It shows fixed-category distributions and optionally local free-text comments for human inspection. A **coded CSV** includes all invitation slots, counts and fixed-category responses but no real student information, original UUIDs, excerpts or free text. An **aggregate JSON** excludes identifiable original file content as well. Coded small-group records are **not guaranteed anonymous**.

Original human judgments, the v4.5 pilot cohort and **all study scheduling decisions remain unchanged**. The usability instrument is unvalidated and deliberately calculates no reviewer quality score, learning gain or retention forecast. Historic and new backups remain schema v5; everything remains **100% free**.

**282 Node tests and seven real Chromium workflows passed** on the feature branch, including two disconnected fictional volunteers, one nonreturned invitation, optional question skips, safe exports, persistence, unchanged due dates and mobile layout.

[Read Blueprint 4.7 and the fixed-invitation protocol](docs/BLUEPRINT_4_7_FREE.md) · [Open standalone usability exercise](reviewer-usability-offline.html)

## Blueprint 4.6 — Independent fictional-reviewer training and rubric clarity

Before involving actual pilot answers, reviewers can practise using a frozen set of **three fictional science explanations and seven rubric criteria** through a new **Progress → Reviewer training & rubric clarity** workflow. The owner creates a locally linked synthetic training cycle, then shares its request JSON and the standalone [offline reviewer training page](reviewer-training-offline.html) with A and B.

Reviewers record original human statuses, exact quoted evidence and optional rubric-quality flags such as vague criteria, overlapping criteria and multi-part demands. The standalone page preserves a downloaded first-pass JSON **before displaying interpretive discussion prompts**. It provides no gold-standard labels, reviewer score, pass/fail certification or AI-generated correctness verdict. The owner imports A/B files without changing saved study attempts, old rubrics, the prospective pilot or any due date.

The app highlights differences in reviewer interpretation and which **fictional** rubric criteria were flagged for discussion. Its optional coded JSON summary excludes reviewer excerpts, original notes, private study information and the local session identifier. The dashboard indicates if the session began or files were imported after a prospective pilot lock, rather than claiming verified pre-pilot preparation.

**Important limit:** discussion prompts are hidden by the interface, but remain inspectable in the local HTML source. No independent verification of reviewer identity, conduct, expertise or completion time exists. Any new rubric wording should be applied to **future** attempts only; archived evidence must never be rescored retroactively.

The permanently free GitHub Pages implementation retains schema-v5 backups, local-only storage and original scheduling rules. **227 Node tests and six real Chromium workflows passed** on the feature branch. These tests include two disconnected standalone reviewer sessions, a real owner import/export flow and a later pilot lock.

[Read Blueprint 4.6](docs/BLUEPRINT_4_6_FREE.md) · [Use standalone offline reviewer training](reviewer-training-offline.html)

## Blueprint 4.5 — Prospective reviewer-pilot registry and coded exports

A new **Progress → Prospective human-review pilot** section lets learners lock a descriptive evaluation protocol **before** recording the study attempts that will be screened. Choose a fixed number of **3–30 distinct eligible retrieval targets**; the default is six. The app then screens **every newly recorded original study attempt in order** and logs exclusions such as assisted/oral responses, immediate-post-study attempts, unverified explanations, absent original rubrics, and repeated retrieval targets. It automatically closes enrolment when the preselected eligible quota is reached. Incomplete A/B reviews and optional post-reference judgments are reported as **missing**, never counted as wrong or silently excluded.

Reviewers can use the established **v4.4 reference-free A/B workflow** for enrolled answers. The pilot audit reports original criterion-level decisive agreements, disagreements and nondecisive rows, without inventing correctness or memory retention estimates. A premature stop is documented as an explicit deviation rather than deleting unfinished work. The local versioned protocol, original selection records and append-only event history are checked during schema-v5 backup validation.

Download either a **protocol + descriptive summary JSON** or a **coded rubric-status CSV**. The CSV includes only automatically generated case order, criterion positions and categorical statuses; it excludes the learner's question, written answer, reference, course, quotes, reviewer notes, original IDs and timestamps. It is **data-minimised, not guaranteed anonymous**, and locally generated timestamps are not externally authenticated preregistration. No files are uploaded.

**183/183 Node tests and five real Chromium browser workflows passed** on the feature branch, including prospective enrolment, privacy-safe exports, and unchanged scheduled due dates. All prior reviewer tools, original study evidence, browser-local storage, GitHub Pages hosting and the 100% free/no-payment requirement remain intact.

[Read Blueprint 4.5 and the pilot protocol](docs/BLUEPRINT_4_5_FREE.md)

## Blueprint 4.4 — Reference-free first judgments and separate reference reveal

In **Progress → Reference-free first-pass review**, learners can export a new **reference-free request JSON** for one saved written explanation/application. This file includes the original question, written response and versioned checklist but **does not contain the original reference answer**. Give the request and separate [reference-free offline reviewer page](reference-reviewer-offline.html) to reviewers A and B. Both can work from disconnected devices and download their own **locked first-pass JSON** files.

Import **A first, then B** into the owner's browser. **Neither reviewer can receive a reference-reveal file from the app until both first passes are imported and preserved.** The learner then exports separate A/B reference-reveal JSON files bound to those saved first passes. Each reviewer can optionally enter a second human judgment after viewing the original reference; those later judgments are kept separate and never overwrite A/B's first marks or their inter-rater comparison. Differences are descriptive human label changes, not validated grades.

The scoring rubric remains visible in the first stage and may disclose expected concepts; identity, actual non-exposure, reviewer expertise and independence are self-reported and not verified. JSON fingerprints detect accidental mismatches, **not deliberate tampering or reviewer identity**. Review packet transfer may disclose learner writing and human excerpts to recipients and any services used to send files; avoid private student records.

**100% free; browser-local; schema v5; no account, AI API, subscription, automatic cloud sync or payment details.** The study planner, actual due dates, self-ratings, existing A/B reviews and all historical evidence are unchanged. The old v4.3 reviewer packet exchange remains available as a separate optional workflow.

[Blueprint 4.4 details](docs/BLUEPRINT_4_4_FREE.md) · [Reference-free standalone reviewer](reference-reviewer-offline.html)

## Blueprint 4.3 — Separate-device offline reviewer packets

In **Progress → Offline reviewer packets**, the learner can export one written explanation, its original reference answer and versioned rubric into a **single-answer JSON request**. Download the **standalone offline reviewer HTML page** and share it with two trusted people. It runs without networking or an account and makes each reviewer download a separate JSON judgment file. The owner's browser **imports Reviewer A first, then Reviewer B**, validating that both submissions belong to its original issued request. Malformed, revoked, duplicate, mismatched and out-of-order submissions are rejected. The existing v4.2 disagreement and adjudication interface then works with both accepted reviews.

The outgoing request deliberately excludes other notes, courses, calendar data, prior review judgments and the complete learning database. However, it includes the selected answer and reference, and completed responses may contain quoted excerpts; share files carefully. Reviewers can see the reference answer, and their identity and independence remain unverified. A request UUID/fingerprint checks file provenance but is not a cryptographic signature or proof of trustworthy grading.

**100% free, browser-local learning history, GitHub Pages, no accounts, cloud sync, paid services or automatic semantic grading.** All original spaced review dates, active and shadow policies, assessment priorities and prior outcomes remain untouched. Original schema-v5 backups still import.

**101/101 Node tests and three targeted Chromium browser flows passed**, including isolated networking-disabled file-based reviewers and mobile checks. These are not a replacement for the historical 308-test v4.0 suite, which is not present in the repository.

[Read Blueprint 4.3](docs/BLUEPRINT_4_3_FREE.md) · [Standalone reviewer page](reviewer-offline.html)

## Blueprint 4.2 — Two-person rubric comparison and adjudication

In **Progress → Two-reviewer agreement & adjudication**, two separate people can review the same saved written explanation/application against the original versioned rubric. The second reviewer receives a blank form that **hides the first reviewer's criterion judgments**. They must attest to being a different person and not having seen the first review; the app cannot independently verify their identities or conduct.

Once both assessments are saved, comparison shows decisive agreements, disagreements, and uncertain/unassessed evidence separately. A person can document a reasoned resolution, including **Unresolved**; revisions append without rewriting either review. Agreement percentages are suppressed until at least 20 decisive criteria from 10 written attempts covering 5 targets. This is **descriptive human-entered agreement, not scientific correctness, independent expert grading, or evidence for a better review schedule**. Both reviewers may view the original reference answer.

The original active scheduler, hypothetical shadow, review calendar, self-ratings and v4.1 evidence remain unchanged. Data stay **100% browser-local and free** on GitHub Pages; schema-v5 backups remain compatible, with no paid API, account, sync service or cloud grading. **67/67 Node checks** and targeted desktop/mobile Chromium review workflows passed. The older historical v4.0 suite of 308 tests is not part of this repository and was not rerun.

[Read Blueprint 4.2](docs/BLUEPRINT_4_2_FREE.md).

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
