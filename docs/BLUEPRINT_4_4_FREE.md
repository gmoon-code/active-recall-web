# Blueprint 4.4 — Reference-withheld first assessment with locked human judgments

**Release:** November 2026. **Hosting:** 100% free GitHub Pages static files. **Learning data:** browser-local. **Backups:** optional schema-v5 extension, older v4.0–4.3 records retained. **Scheduling:** existing transparent-interval-v1 active policy and conservative-shadow-v1 hypothetical policy unchanged.

## Why this is the next step

The v4.3 reviewer packet included the saved reference answer from the outset. Even when two people evaluated separately, their judgments could be anchored by the expected answer before they assessed the learner's explanation. The v4.4 opt-in protocol enables a genuinely different information sequence: an initial packet **does not contain the saved reference answer**.

That does not make an assessment blind to the scoring criteria. Rubric wording often signals desired concepts. Reviewers may have encountered the reference through other channels. Neither their identity, true independence, scientific expertise, nor their claim to have avoided the reference can be verified by an offline browser app.

The design's empirical value is in **describing whether recorded human criterion judgments change before and after a specified release of reference material**. Such change is not automatically evidence of error correction, learning, bias, or improved accuracy.

## Two-stage workflow

1. In the original study app, record a real **written explanation or application** with a verified rubric. As before, the actual response, question, answer key and original criterion versions are frozen at retrieval.
2. Open **Progress → Reference-free first-pass review → Export reference-free request**. The JSON includes the selected question, real written response, contemporaneous criterion IDs/text/versions, request UUID and a lightweight fingerprint. It **has no saved reference answer field and no complete study database**.
3. Download the distinct **reference-free reviewer HTML page**. Share it and the first-stage JSON with two trusted reviewers. Each reviewer can open the page offline in a separate browser/device.
4. Reviewer A and Reviewer B independently mark Included, Not demonstrated, Uncertain or Not assessed for every saved rubric criterion; exact original-response excerpts are required for Included and written reasons for missing/uncertain criteria. B also attests to being a different person and not consulting A's judgment. Each additionally attests, without verification, that the reference answer was unseen before their judgment.
5. **Download and lock a separate first-pass JSON.** The reviewer page hides and disables the initial form after this action. If the page closes, the reviewer can reopen the original request and their saved first-pass response to continue, without modifying that original submission.
6. The owner imports **A first, then B**. The app preserves their immutable original judgments and records the reviewer-device completion timestamps separately from the actual owner-side import times. The second reviewer cannot be imported over an earlier record.
7. **Only once BOTH first passes are imported**, the owner app permits separate **Export A reference** and **Export B reference** files. Each reveal references the locked first-submission fingerprint and contains the original saved reference answer. Neither reveal is available for an incomplete pair. This app-level rule reduces the risk that one person's released reference contaminates the other person's first judgment.
8. The reviewer opens their own matching reveal file in the standalone page. If they choose, they make a distinct **post-reference judgment** of the same original written response and download a second JSON.
9. The owner imports the optional post-reference file. Criterion status changes are recorded separately; **the first-pass A/B comparison, history, active memory state and due dates remain unchanged**. The v4.2 adjudication interface can still reconcile original A/B differences with explicit human rationale.

The owner is responsible for controlling file transfers and not sharing a reveal early through other channels. The standalone page never connects to a service and does not cryptographically enforce real-world independence or timing.

## What is and is not measured

- First-pass criterion judgments are human-entered ratings against a saved rubric **without the reference answer supplied in that initial request**.
- Post-reference judgments are a second human judgment after that reference is manually supplied. The app reports per-criterion changes and nondecisive uncertainty separately.
- A change from Not demonstrated to Included is **not** verified scientific correctness; a person may have changed their interpretation or may be influenced by the reference. A lack of change is not proof of correctness.
- Both A/B original judgments remain separate; agreement percentages retain the v4.2 conservative suppression threshold of 20 comparable criterion labels from at least 10 attempts and 5 distinct targets.
- This is **not** an intervention on the learner's study schedule, proof of calibrated retention, or a prospective randomized evaluation. It is not an AI scoring engine.

## Data integrity and privacy

The reference-free request and post-stage reveal are **separate JSON files**. Each has a random request UUID and non-cryptographic FNV response fingerprint. These can detect accidental mismatches but are **not digital signatures**. Anyone holding the files could deliberately alter and recompute fingerprints. A human reviewer's identity and self-reported non-exposure cannot be authenticated without extra infrastructure, which is intentionally absent.

The incoming first-pass file includes human statuses, original-response excerpts, rationale, notes, self-reported completion time and non-exposure attestations, but does not contain a full reference answer. The later reveal includes the reference, and optional post-file contains later opinions. A post-stage import requires a matching issued request and the locked first-pass provenance. Extra fields, changed rubric evidence, duplicate A/B, B-before-A, altered first-post records and request mismatches are rejected. Historical data remain validated during schema-v5 JSON backup import.

A request may be revoked before the first pass is accepted. Already accepted original reviews cannot be revoked or overwritten. Requests from the older v4.3 protocol remain usable in their separate interface, but cannot be silently combined with the new reference-free pair.

The reviewer HTML contains inline CSS/JS and no browser storage, network requests, account or remote API. Files manually sent through email, messaging or cloud drives may be exposed to those services. The request includes **the selected learner-written response** and the reveal includes its reference; neither should contain private identifiable student records or sensitive information.

## Engineering verification

- Existing Node tests: **101** for v4.1–4.3, including six GitHub Pages deployment checks.
- New v4.4 deterministic tests: **40**, covering absent reference content in the initial request, immutable first-pass evidence, two-reviewer locking before any reveal, guarded post-reference judgments, descriptive disagreement transitions, original due dates, corruption checks, and older backup compatibility.
- Target: **141/141 Node tests** plus the original three Chromium workflow checks and a new end-to-end browser test running two isolated **network-disconnected** reference-free reviewer pages, importing both locked judgments, revealing to A, accepting a separate post-reference change, preserving A/B disagreement, reloading IndexedDB and checking mobile layout.
- The old 308-test v4.0 suite is **not available in the published repository**, so the current test count is not a rerun of those tests.

## Next research-valid step

Develop a transparent pilot protocol with trained human reviewers, independent review order, explicitly tracked reference exposure, missing data reporting and a held-out criterion-quality audit before treating entered judgments as measures of actual science learning. Only then consider empirically comparing memory-model forecasts or changing time-constrained review scheduling. Continue to prefer descriptive limits and honest uncertainty over spurious optimization.

[Blueprint 4.3](BLUEPRINT_4_3_FREE.md) · [Earlier reviewer agreement](BLUEPRINT_4_2_FREE.md)
