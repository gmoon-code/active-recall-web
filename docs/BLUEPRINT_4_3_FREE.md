# Blueprint 4.3 — Portable offline reviewer packets and conflict-checked import

**Release preparation:** 17 November 2026. **Hosting:** free GitHub Pages. **Learner data:** local browser, IndexedDB or localStorage fallback. **Backup:** schema v5 unchanged. **Active and shadow scheduling:** unchanged.

## Purpose

Version 4.2 introduced two human-entered judgments of one saved written explanation and an adjudication procedure, but sharing one browser could inadvertently expose previous answers or create logistical barriers. Version 4.3 lets people independently review on separate devices using **single-answer JSON requests** and a **standalone offline HTML page**. Reviewers download their own response JSON files and send those files back to the owner for conflict-checked manual import.

This is not automatic cloud synchronisation, authenticated professional examination, AI scientific grading, or evidence that spaced scheduling is effective.

## Reviewer handoff workflow

1. Record a real written explanation or application with an original verified rubric, then open **Progress → Offline reviewer packets**.
2. Expand **Create or re-download a request** and choose the recorded answer. Download the request JSON. The owner browser stores a versioned issued request ID and a fingerprint of the frozen evidence. Re-downloading an active request reuses the original ID.
3. Download the **Standalone reviewer page** (reviewer-offline.html). Share that single self-contained HTML file and the request JSON with both trusted reviewers. The HTML runs locally without internet, an account or an installation.
4. Reviewer A opens the HTML, selects the request, reads the original question, written response, reference answer and rubric, and marks each criterion. Included requires an exact excerpt from the response; missing or uncertain points require a reason. A explicitly confirms the judgment is human, then downloads a completed response JSON.
5. Reviewer B works from their own copy, selects slot B, explicitly attests to being a different person who has not seen A's findings, and downloads a separate response JSON. There is **no first-reviewer assessment in the request**, and the standalone page has no connection to A's browser or saved results.
6. The owner imports **A first, then B** via **Import a completed reviewer-response JSON**. B may have completed earlier than A, but must be imported second. A response will not be accepted unless it matches a request actually issued and recorded in the owner's local database.
7. When both imports succeed, the existing v4.2 comparison and append-only adjudication tools can identify disagreements and record a reasoned human reconciliation, including an unresolved decision.

If the owner has cleared their browser's local records, they need to restore a JSON backup containing the issued request record before importing responses. No remote server keeps a backup.

## Minimal scope and privacy

The outgoing request contains **one chosen learner-written response**, its original question, reference answer, full contemporaneous rubric, version numbers, request UUID and limited metadata. No other courses, notes, deadlines, agendas, scores, stored reviewer conclusions or complete database are included.

The completed response file contains reviewer statuses, supporting excerpts, rationale, optional note, slot, role, self-reported attestations and the request identifiers. It does **not** echo the whole original answer or full reference. Excerpts and notes may still contain private information.

The reviewer HTML is standalone with inline styles and scripts, a restrictive Content Security Policy, no networking, and no browser storage. An actual browser test ran two isolated file-based review pages with networking disabled. The reviewer must keep their exported JSON because the standalone page does not automatically save drafts. The owner remains a browser-local static app.

**Sharing a request grants the recipient access to the answer and reference.** Sending files using third-party messaging, email or storage may expose them to those services. The app itself does not send anything. Avoid sensitive or identifiable student information.

The random UUID prevents accidental cross-request matching, and exact source/rubric checks reject stale or altered imports. The lightweight fingerprint is **not cryptographically secure and is not a signature**. An adversary with the request could fabricate a response. Reviewer identity, expertise and claimed independence are self-reported and not verified. Both reviewers see the reference answer, so this is not reference-blinded evaluation.

## Provenance and validation

Each eligible attempt may have up to ten versioned request records, with no more than one active request. Revoking a request blocks future imports under that ID and keeps already imported judgments intact; a fresh request may be issued for an incomplete pair.

The owner validates request existence, original attempt binding, response fingerprint, exact criterion IDs and versions, verbatim excerpts, mandatory rationales, reviewer role, B attestations, file type and allowed fields. Duplicate A, duplicate B, B-before-A, unknown, revoked and mismatched submissions fail before they can silently replace originals. Backup import independently checks stored request history, provenance and original submitted findings.

The owner-side paired-review entry's timestamp represents **the actual local import**, because the v4.2 historical model orders A before B. The separate offline provenance field stores **reviewer-device completion time**, an unverified timestamp that may be inaccurate. Neither date is converted into a measured learning outcome. Historical responses, original retrieval ratings, active due dates and shadow proposals remain untouched.

Earlier schema-v5 v4.0, v4.1 and v4.2 backups remain supported. Local data are not published to the public GitHub repository.

## Engineering tests

- **101/101 Node tests**: 67 retained versioned human-review, pair-review and free deployment checks, plus 34 new tests of request scope, revocation, replay resistance, import order, source matching, tampered file rejection, optional data compatibility, and calendar immutability.
- Three real Chromium browser flows passed: the original v4.1 manual-review desktop/mobile workflow; the v4.2 A/B comparison and adjudication desktop/mobile workflow; and a v4.3 cross-device workflow exporting a request, completing reviews in two isolated offline HTML pages, rejecting B-before-A, importing both, comparing their ratings, reloading IndexedDB and checking mobile layout.
- GitHub Pages and GitHub Actions remain free. The CI runner installs a temporary free browser test dependency only; the public web app and reviewer page require no installation or paid API.

The historic 308 tests reported for v4.0 are not present in this published repository and have **not** been rerun. Passing 101 tests does not establish scientifically valid or independent grading or educational effectiveness.

## Next evidence-quality development

Consider a **reference-hidden first judgment**, preserving an explicitly locked pre-reveal evaluation before exposing the reference answer for feedback or adjudication. This would reduce some reference-answer anchoring risks but would still not verify reviewer expertise, independence or scientific correctness. Before calibrating a memory model or revising the spaced-review calendar, collect and evaluate actual delayed written outcomes with defensible measures, appropriate controls, and prospective out-of-sample comparisons.

[Blueprint 4.2](BLUEPRINT_4_2_FREE.md) · [Research foundations](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md)
