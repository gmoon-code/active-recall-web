# Blueprint 4.5 — Prospective reviewer-pilot protocol and coded evidence audit

**Release:** November 2026. **Architecture:** 100% free static GitHub Pages; local IndexedDB or localStorage; no accounts, billing, API-based grading or cloud sync. **Database:** optional schema-v5 extension; no migration, and prior backups remain compatible. **Scheduling:** original active and shadow policies untouched.

## Purpose and scientific boundaries

Versions 4.1–4.4 established original rubric snapshots, human-entered judgments, two distinct attestable review slots, independent offline request files, and a first stage that does not contain the saved reference answer. Those tools can describe a specific judgment, but manually choosing which attempts to send to reviewers after viewing the results creates a risk of selective reporting.

v4.5 adds a **locally locked, prospective, automatic screening protocol**. Once activated, each subsequently saved study attempt is screened immediately in attempt-creation order, and the first eligible response from each distinct retrieval target is enrolled until the chosen quota is met. Original exclusions, missing human reviews and incomplete post-reference assessments remain visible. The protocol does not alter lessons, questions, due dates, actual recall ratings or any automatic scheduling interval.

This is a **descriptive workflow feasibility pilot**, not a power-calculated efficacy trial. The timestamp is based on a mutable local device clock and is **not independently authenticated preregistration**. The evidence cannot establish that reviewers are independent experts, that judgments are correct, that students learned more, or that a memory policy optimises time.

## Fixed protocol and sampling

The user locks the protocol before recording subsequent attempts and selects one fixed maximum of **3, 6, 10, 15, 20 or 30 distinct eligible retrieval targets**; 6 is the default small-pilot option. Sample size determines a feasibility ceiling, **not statistical precision or hypothesis-test power**. Changing the target after locking is not offered. The original lock event, its sample target, baseline attempt count and all screening events are cross-validated when restoring a backup.

Each later recorded attempt is screened in the original event order until the target is reached. Eligibility is determined only from information captured at that attempt:

- Explanation/application activity; a saved nonempty original **written** response.
- **Unassisted**, not labelled immediate-post-study; no inference from hints or an immediate learning task as if they were independent retrieval.
- Original requirement marked verified and preserved original question, reference and criterion snapshots; no newly created rubric is applied retrospectively.
- **First eligible attempt per distinct retrieval target**. Later eligible attempts from that target are excluded to prevent the same content from inflating the number of independent topics.

Excluded and screened attempts are recorded with explicit typed reasons, including assisted, nonwritten, different activity kind, immediate-after-study, missing original rubric, unverified original question, duplicate target and a timestamp that predates the local lock. Recording continues in order; there is no control to drop a missed answer, select only favourable answers or import earlier attempts into the pilot.

**Stopping rule:** automatically close at the preselected quota of distinct eligible targets. The user may document an early stop with an explicit, locally preserved reason. An early-stop deviation is not represented as planned completion; it does not erase incomplete or excluded attempts. Only one local pilot registration is supported, preventing repeated registration of convenient cohorts in the same database. A full browser reset or edited backup is always possible; this is not adversary-proof audit infrastructure.

## Human-review process

For each enrolled answer, coordinators may use the existing v4.4 **reference-free A/B** protocol. The initial packet contains one original learner answer and its original criterion checklist but not the saved reference answer. Obtain genuinely separate human first-pass reviews; import A then B. The app prevents exporting either reference reveal until both initial reviews are imported. Afterward, each reviewer may optionally record a separate post-reference judgment. Preserve the first-pass judgments and subsequent disagreement or adjudication history.

**Suggested pilot procedure:** use an example answer unrelated to the actual pilot to practise the rubric and evidence-excerpt requirements with reviewers beforehand; agree how to distinguish Included, Not demonstrated and Cannot determine. Document the reviewers' background, training, recruitment, any prior exposure to the reference, reasons for missed reviews, and transfer problems in a separately protected study log if appropriate. Neither training quality nor identities are verified by the app, and no sensitive participant information should be put into publicly shared files.

Never interpret:
- a missing reviewer as Not demonstrated;
- a reviewer change after seeing the reference as confirmed correction;
- a high first-pass agreement proportion as proof of scientific correctness;
- separate answers on one topic as statistically independent participants;
- a pilot with a small number of topics as a calibrated model of memory, causal learning gains, or equitable treatment.

## Descriptive outcomes and explicit missingness

The Progress panel reports screened, excluded, enrolled and A/B-completed counts. It distinguishes: missing Reviewer A; Reviewer A recorded but Reviewer B missing; an incompatible earlier-method review; post-reference Reviewer A missing; post-reference Reviewer B missing; decisive agreements; decisive disagreements; uncertain or unassessed rows.

The **coded-criteria CSV** is row-per-original-criterion plus a row per excluded original attempt. Columns include screen order, generated case number, criterion position, inclusion/exclusion, categorical first and post statuses, whether both initial reviewers made decisive judgments, whether they agreed and whether a person's post-reference status changed. Unavailable human decisions are the explicit value **missing**, not zero, false or wrong. Uncertain and Not assessed remain distinct. Small cells are given as counts, not a statistically meaningful agreement or mastery percentage.

The CSV intentionally does **not** contain original attempt IDs, the question, written response, saved reference, criterion text, human quotes, notes, course labels or timestamps. It uses only internally generated case numbers, row numbers and fixed categorical values, avoiding formula injection. **The export is data-minimised/pseudonymised, not guaranteed anonymous:** the recipient may still infer provenance from context, case order or other information.

The separate **protocol/summary JSON** contains the static protocol, stated target, mutable local lock timestamp, screening counts and missingness, but no original writing or human review quotes. A potentially identifying free-text early-stop reason remains in the learner's local backup; only a yes/no early-stop flag is exported. Every data export is initiated by a user action, stored as a local downloaded file and never transmitted by the app. Using email, third-party storage or messaging to distribute it introduces external privacy considerations.

## Reproducible data safeguards

- The pilot begins with an immutable-by-UI baseline attempt count and a full versioned protocol snapshot.
- Core original-attempt recording immediately appends a screening outcome while leaving the existing scheduling decision unchanged.
- The restored database must reproduce each recorded selection/exclusion from the original attempts in order. No missing, reordered or reconstructed favourable-only selections are accepted in normal backup validation.
- The frozen target count, initial baseline, screened decisions and early-stop or quota events must match their original local event history. Original-answer fingerprints identify accidental mismatches and rubric changes.
- Old v4.0–4.4 data and reviews remain valid when no pilot is present. The schema remains 5.

The history remains **local, user-editable and not cryptographically signed**. A person intentionally changing every linked record could defeat these checks. Cross-validation is for accidental corruption and traceable ordinary revisions, not fraud detection or independent provenance.

## Verification

- Existing 142 Node tests remain in CI, including prior human judgment, original snapshot, separate-device packet, historical audit and static deployment tests.
- 41 additional deterministic tests verify automatic enrolment, duplicate target exclusions, initial immutable sample size, quota closure, early-stop records, missing outcome handling, A/B integration, untrusted-data-safe CSV, backup round-trips, and rejection of reordered or erased screening entries: **183 Node tests** total.
- A fifth real Chromium workflow checks locking the protocol from the web UI, creating future attempts, capturing excluded and eligible cases, automatically reaching quota, downloading and inspecting CSV and JSON files, adding a later A/B comparison, verifying persisted audit counts, ensuring the due date stays fixed, and testing mobile layout.
- The original four Chromium workflows for v4.1–v4.4 remain in CI. The historical 308-test v4.0 suite is not present in the public repository and is not represented as rerun.

## Future methodological improvement

First **pilot reviewer recruitment, training, data completeness and rubric interpretation**. Examine why original ratings disagree, why post-reference ratings change and whether unclear criteria should be revised for *future* attempts without re-grading saved answers. Only later, with an independently justified reference standard, adequate participant and topic coverage, delayed assessment outcomes, and external/prospective validation, consider testing retention forecasts or changing an automatic study schedule.

[Blueprint 4.4](BLUEPRINT_4_4_FREE.md) · [Blueprint 4.3](BLUEPRINT_4_3_FREE.md)
