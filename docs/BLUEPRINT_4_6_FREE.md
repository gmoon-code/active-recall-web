# Blueprint 4.6 — Synthetic reviewer training and rubric-quality discussion

**Release:** November 2026. **Hosting:** permanently free static GitHub Pages. **Data:** browser-local, optional schema-v5 extension. **No accounts, external AI, cloud sync, payment processing, or changes to the active/shadow review scheduler.** v4.0–4.5 original study records remain compatible.

## Purpose

Versions 4.4 and 4.5 established reference-free first-pass reviewer packets and prospective screening of study attempts. However, even a genuinely reference-withheld judgment cannot establish that criteria themselves are interpretable, that different reviewers apply the same rubric in the same way, or that a status change corresponds to scientific correctness.

v4.6 adds **independent human practice on a small, frozen, fictional casebook**, completely outside the pilot cohort. It makes rubric interpretation and unclear assessment language visible before subsequent reviews. It **does not** score or certify reviewers, infer science-learning effects, or calibrate a mastery model.

## The frozen, out-of-cohort examples

The casebook is versioned as synthetic-rubric-interpretation-v1. It contains three fictional science responses with seven total original criterion rows:

1. **Membrane energy transfer:** A learner explanation about proton movement and ATP synthase. Separate criteria ask about a proton concentration difference and a mechanistic connection to ATP synthesis. Discussion considers whether an implied mechanism is sufficient or must be explicit.
2. **Recessive inheritance:** A fictional parental-carrier explanation with criteria distinguishing inheritance from the genotype–phenotype relationship. Discussion asks what an original excerpt supports without additional assumed information.
3. **Food-web representation:** A fictional explanation of what arrows represent and what a diagram cannot show without additional data. A deliberately poor criterion reads **“Provides a complete and convincing scientific explanation.”** It is intended to elicit concerns about vagueness and lack of observable evidence rules.

These cases are static public code, not student answers or actual pilot outcomes. They are not psychometrically validated reviewer tests. **There is no single authoritative gold-standard label set** in the tool; disagreement is a topic for human discussion, not a scored failure.

## Offline, independent training workflow

1. Open **Progress → Reviewer training & rubric clarity** in the main study application and create a single local training cycle. It generates a random session identifier, versioned casebook and a local issuance event. Ideally conduct this exercise before locking a prospective v4.5 pilot.
2. Download the **synthetic training-request JSON** and the standalone **reviewer-training-offline.html** file. Share the same request and page with A and B. Each person works independently on their own device and can remain fully offline.
3. For each of the seven criteria, reviewers record Included, Not demonstrated, Uncertain or Not assessed. Included requires an exact original-response excerpt. Not demonstrated and Uncertain require a written reason.
4. Independently, each criterion may be flagged as vague, containing multiple demands, overlapping another criterion, lacking an evidence rule, or another concern. Flagging requires a short explanation. An unassessed criterion remains visible rather than silently becoming a negative rating.
5. Before submitting, a person confirms this is a human first judgment and attests that they did not open the **in-interface discussion guidance** beforehand. B separately self-attests to being a different person and not consulting A's judgments.
6. The person downloads the first-pass training JSON. The page hides the assessment form and then shows **interpretive discussion prompts**. It does not disclose an automatically computed correct answer, a pass rate, or an expertise certificate. Original files are returned to the coordinator.
7. The owner imports A and B's first-pass files. Either import order is valid. The app checks the issued session ID, fixed casebook fingerprint, criterion order, verbatim excerpts, self-reported attestations, duplicate slots and original import events. Original imported assessments cannot be overwritten via the interface.
8. The owner dashboard displays **criterion-level differences**, **decisive/nondecisive status-pair counts**, and **rubric-ambiguity flags**. The optional coded summary contains only counts and fixed case/criterion identifiers, not reviewer notes, exact excerpts or study answers. A report can flag whether the cycle was created or a file was imported after the pilot's local lock; those timestamps remain unauthenticated.

## Important protocol limits

**Not technical blinding.** The discussion prompts are built into the offline HTML file and merely hidden by the interface until first-pass export. A reviewer can inspect source code or encounter guidance elsewhere. The application cannot establish non-exposure, authentic identity, expertise, independent behaviour or true completion time. The checksum is non-cryptographic and detects accidental mismatches only. A user could edit a file and recompute it; this is not proof against deliberate forgery.

**Not validated scoring.** Different statuses may result from unclear wording, incomplete excerpts, different assumptions or genuine interpretive differences. Two Unassessed entries (and any Uncertain pair) are treated as **nondecisive, never substantive agreement**. Agreement is not correctness. Quality flags are human observations, not automatic criterion assessments. No percentages or pass/fail awards are displayed for the training cases.

**Not retrospective regrading.** Any revision made following discussion should use the existing future-only rubric versioning. Neither saved historical criterion snapshots, original A/B judgments, prior pilot inclusion decisions, nor actual schedule intervals are changed automatically.

**Not verified pre-pilot training.** The interface tracks local issuance and import relative to the v4.5 local pilot lock. Starting before the pilot is helpful for documenting preparation but does not independently authenticate when reviewers completed work. Imported-after-lock status remains visible rather than silently counted as completed pre-pilot reviewer preparation.

**Privacy.** The reviewer training kit contains fictional examples; original submitted notes still belong to humans and deserve care. The coded export omits free text and raw reviewer excerpts. It is data-minimised, not a guarantee of anonymity or a public ethics approval. Human-participant research requires appropriate consent, privacy handling and local institutional permissions.

## Verification

- Existing v4.5 tests: **183 Node tests and five Chromium workflows**.
- Added v4.6: **44 deterministic tests** for the fixed casebook, original exact excerpts, rubric-ambiguity flags, self-reported independence/non-exposure, mismatched session files, append-only A/B imports, session timing relative to pilot lock, coded exports, corruption rejection, and legacy schema-v5 backups.
- Full present suite: **227 Node tests and six actual Chromium workflows**, including a new browser flow with two independent fully disconnected training-page contexts, first-pass JSON download before discussion, B then A import, coded summary export, later pilot lock, IndexedDB round-trip and desktop/mobile layout.
- The historical 308-test v4.0 collection is unavailable in the published repository and is **not** represented as rerun.

## Next evidence-oriented step

Conduct a tiny consented usability exercise with independent reviewers before collecting scientific research data: test whether instructions are comprehensible, distinguish implicit versus explicit evidence, discuss vague versus compound criteria and document missing information. Only with adequate samples, defensible reference standards, independently verifiable observations and ethical safeguards should the project consider estimates of reliability, true correctness, retention forecasts or scheduler optimisation.

[Blueprint 4.5](BLUEPRINT_4_5_FREE.md) · [Blueprint 4.4](BLUEPRINT_4_4_FREE.md)
