# Active Recall Web — Blueprint 4.25

## Repair questions with the originally linked lecture in view

This increment builds on the v4.23 correction hold and v4.24 learner quality note. It adds **read-only source context** to the repair workflow without asserting that notes or draft answers are factually accurate.

### How to use it

1. Open **My Q&A → Questions needing correction** and expand **Check saved lecture evidence** on a held question. If the question has no saved source, the panel explicitly says so. If it has a source but no verified quote offset, it shows a clearly labelled preview, not a fabricated citation.
2. When a question's exact source quote matches its saved character position in the **originally linked version**, that passage is highlighted with nearby text. Exact positioning is a provenance check, not evidence that the scientific answer is correct.
3. Press **Edit Q&A**. Your saved issue category and repair note appear beside the editable question and reference answer. Expand the complete linked lecture in the same editor. If the source was later revised, the **original linked version and current version are shown separately** for comparison. The app warns if the historical snapshot is missing, rather than treating revised text as the original.
4. After you check the source and edit the question if necessary, return to **Questions needing correction** and explicitly choose **Reviewed · resume**. The hold does not lift automatically. A substantive Q&A change still follows the established interval-reset rule; a wording-only edit can retain the interval only if the tested knowledge is unchanged.

### Boundaries

- A source quote matched at a character offset proves only that those exact characters were present in a stored source version. It does not validate accuracy, completeness, scientific meaning, or suitability for a study question.
- A question linked to a source without an anchored quote has *organisational provenance*, not a verified answer citation. The initial note preview is capped at 900 characters; the complete stored note is available in the editor.
- Source versions and Q&A are displayed as escaped text. The comparison is generated from existing browser-local records, with no new schema fields, remote upload, paid service, automatic AI grading, or answer generation.
- Opening and closing these panels does not create learning attempts, release quality holds, alter memory, or adjust priorities, intervals or due dates. No FSRS model is introduced.

### Verification

Deterministic tests cover exact-offset matching, mismatches, manually linked questions without quotes, source revision history, unavailable snapshots, unlinked questions, unchanged recall evidence and v5 backup compatibility. Chromium regression checks mobile panels, full source display in the editor, separate original/current versions, HTML escaping, and persistent holds. All existing tests and release checks remain mandatory.
