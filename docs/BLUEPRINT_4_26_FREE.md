# Active Recall Web — Blueprint 4.26

## Review the impact of repairing a question

The v4.23–4.25 repair flow lets learners flag, annotate, compare sources, and correct questionable Q&A. This increment closes an important integrity gap: a Save with unchanged fields previously still generated a new question version and could reset a study interval. Revision impacts are now inspectable before saving.

### Learner flow

1. Open a held question in **My Q&A → Questions needing correction → Edit Q&A**, or use the inline Q&A editor for the held question.
2. As you type or select a revision type, the **Review the proposed edit** panel lists the changed fields and their consequences. It distinguishes question wording, reference answer, practice type, learning objective, and lecture label.
3. If **substantive** is selected, the preview states how many existing focus intervals would reset and how many active additional variations would be archived. Older attempts remain in history. If **wording-only** is selected, existing intervals remain and the panel warns that equivalent knowledge and answer validity require human judgment. A changed practice type always forces the substantive policy, even when an older caller or stale form requested wording-only; the preview makes this visible.
4. An actual edit to a held question requires explicit confirmation. Cancel leaves the typed draft unsaved and editable. After saving, the quality hold remains until **Reviewed · resume** is separately confirmed.

### Integrity and compatibility

- A no-change Save is now a complete no-op. No revision event, version increment, memory reset, variation archive, or change to the quality hold occurs. A lecture-title-only organisational edit never resets recall intervals, regardless of the chosen change-type selector.
- The preview runs read-only against the current in-browser database. It does not write grades or attempts, infer meaning from text similarity, automatically approve a correction, or revise the calendar.
- The established substantive-versus-wording scheduling policy remains in place. No FSRS model, server, account, paid API, cloud sync, or schema migration is introduced. Browser-local JSON backups remain schema v5.

### Verification

Deterministic tests cover no-op preservation, impact counts, wording-only and substantive choices, rejection of invalid input, substantive treatment of changed practice types, metadata-only edits, original attempts, held status and backup compatibility. Chromium desktop/mobile regression tests preview updates, safe cancel/confirm interactions in both editors, no-op Saves, and preservation or reset of the correct intervals. Existing suites remain mandatory before merging.
