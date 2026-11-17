# Blueprint 4.7 — Fixed-invitation reviewer-usability micro-pilot

**Platform:** Forever free GitHub Pages, offline-capable static JavaScript, private browser-local data and voluntary file exchange. **Database:** Optional extension to existing schema v5; prior backups remain valid. **Study calendar:** Unchanged.

## Research problem and scope

Versions 4.4–4.6 established reference-withheld first-pass human reviews, prospective inclusion of original study attempts, and independent human practice using a frozen fictional casebook. None establishes whether unfamiliar reviewers understand the interface, status options, quotation rule, or rubric wording.

v4.7 is a tool for a **small, voluntary, descriptive usability exercise** on the three fictional v4.6 science explanations and seven original rubric rows. It does not involve real student records, automatically recruit anyone, conduct research on the user's behalf or certify reviewers' expertise. It collects no actual learning outcome.

## Before participants: one fixed local invitation plan

Within **Progress → Reviewer usability micro-pilot**, the coordinator locks a plan of **3, 5, 8, or 12** invitation slots. The app allocates a random UUID for the plan and one per invitation, records a local timestamp, and saves the fixed casebook, questionnaire and pseudonymous invitation-ID fingerprint in local event history. This is a **locally mutable intention record, not independent preregistration or a cryptographic signature**.

Each slot can be exported repeatedly, but no ordinary control can reallocate it, add replacements or selectively remove nonrespondents. All locked invitation slots must appear in reporting even when no file returns. The software cannot tell why a file was not returned: a recipient may never have received the invitation, declined, exited, experienced a technical problem or withheld data. It must therefore be called **nonreturn**, not necessarily refusal or failure.

An invitation includes ONLY the three fictional public science explanations, original seven criteria, five fixed usability prompts, categorical choices, and a unique code. It does not include real study questions, attempts, original reviewers, student names or private notes.

## Offline volunteer workflow

The recipient opens the standalone reviewer-usability-offline.html file with their invitation JSON, preferably on their own offline device. The page has a restrictive Content Security Policy and no network requests or browser storage; sharing an exported file happens only after the respondent chooses to do so.

1. **First-pass fictional judgments:** The person independently marks all seven criteria Included, Not demonstrated, Uncertain or Not assessed. At least one must be assessed. Included requires an exact verbatim excerpt. Not demonstrated and Uncertain require a written rationale. Optional rubric issues (vague, multi-part, overlapping, unclear evidence rule or other) require explanatory comments.
2. **Lock judgments before feedback:** The interface freezes the first-stage answers before showing the optional survey. No discussion prompts are shown in the interface yet.
3. **Optional usability self-report:** Each of five fixed statements is answered 1 (strongly disagree) through 5 (strongly agree) or **Skip**. They ask about comprehending status categories, using exact excerpts, selecting Uncertain, interpreting rubric criteria, and navigating the interface. The participant may report one categorical obstacle, or Skip, and enter at most 400 characters of optional feedback. Avoid identifiable or sensitive comments.
4. **Voluntary sharing:** The response file is downloaded only after an affirmative agreement to share fictional judgments and optional comments with a trusted coordinator. Exiting the page before submitting produces no file or transmission. No response is coerced and individual survey questions can be skipped.
5. **Discussion afterwards:** The interface reveals interpretive discussion prompts only after response export. They are present in the inspectable HTML source all along. This is interface sequencing, **not verified blindness or exposure prevention**.

Submitted files contain participant-written rationale and optional comments. The coordinator must store and transfer them responsibly, even though the exercise examples are fictional. Email/cloud transfer can expose files; browser-local records are not encrypted by this prototype.

## Original files and reporting

The owner may import files in any invitation order. App validation requires a matching issued invitation and casebook version, exact original rubric rows, literal excerpts, appropriate reasons, voluntary consent, and categorical/null questionnaire entries. Reusing a token is rejected rather than overwriting an earlier response.

Reporting explicitly distinguishes:

- **Nonreturn:** an invitation slot without a valid returned file
- **Skipped questionnaire item:** a returned file containing null for a specific prompt
- **Not assessed rubric criterion:** an explicit human status for a fictional criterion, not a missing participant
- **1–5 response counts:** subjective clarity self-reports, not numeric reviewer quality
- **Reported obstacle and rubric-issue categories:** descriptive labels, not validated error diagnoses

The CSV has one row for **every original invitation slot**, returned yes/no, five numeric or separately skipped/missing entries, fixed obstacle category and counts of fictional criteria assessed and flagged. The JSON summary includes item-level distribution and nonresponse counts, versioned protocol and privacy caveat. Both exports exclude real or fictional answer text, original UUIDs, human excerpts, notes, identifiable names, and free-text comments. CSV fields are internally generated numeric/enum values, not user-supplied spreadsheet formulas.

**Data minimisation is not anonymity.** Even a small coded data table can be reidentified if others know who was invited and when. Optional comments are visible only inside a collapsed panel in the owner’s local interface and in private backup files; they are omitted from both coded exports.

## Validity limitations

This is a new, unvalidated usability instrument with potentially self-selected, nonrepresentative respondents. Small numbers, prior exposure, nonreturn, demand characteristics, question interpretation and the order of tasks constrain any interpretation.

No claims of statistically adequate sample size, interrater reliability, expert reviewer qualifications, scientific accuracy, educational efficacy, mastery, retention prediction or scheduling optimisation are supported. The dashboard deliberately displays **counts**, with no inferred pass rate, p-values, psychometric scores or automatic intervention.

The local fingerprint is a **noncryptographic accidental-change detector**. A determined editor who modifies all linked local records and recalculates fingerprints can defeat it; identities, timing and independence are self-reported rather than externally authenticated. Formal human-participant research requires separate ethical approvals, consent procedures and privacy controls suitable for its jurisdiction and participants.

v4.7 never changes original real learner attempts, historical criterion versions, earlier human reviews, original reviewer-pilot enrolment, calendar entries or actual active/shadow scheduling decisions. Everything remains free and local.

## Automated verification

v4.7 adds **55 deterministic unit tests** for one-time invitation registration, frozen cohort, returned/nonreturned distinctions, all-null optional survey, original rubric evidence validation, wrong/duplicate responses, coded privacy exports, schema-v5 backup compatibility and event-history corruption detection. The seventh Chromium workflow uses a **three-invitation cohort, two disconnected fictional respondents and one nonreturn**, locks fictional human judgments before voluntary feedback, tests skipped questions and privacy-safe files, restores original local data and checks desktop/mobile layout. The inherited six browser workflows remain.

Target cumulative totals are **282 Node tests and seven Chromium workflows**; verify success on the final production deployment rather than claiming unreleased checks passed. The original 308-test v4.0 collection is not in the public repository and is not claimed as rerun.

## Next scientific step

Invite a small group of willing people under appropriate conditions, then inspect voluntary feedback for genuine interface problems, misunderstood concepts, ambiguously worded criteria and reasons for missing responses. Only change **future-facing instructions or criteria**, retaining all original observations. Do not treat response counts as proof of any science-learning effect.

[Blueprint 4.6](BLUEPRINT_4_6_FREE.md) · [Blueprint 4.5](BLUEPRINT_4_5_FREE.md)
