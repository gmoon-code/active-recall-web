# Blueprint 4.45 — Clear everyday Progress, optional research tools

## Scope

- Reorder Progress so learners see actual practice metrics, course coverage, recent reviews and the seven-day study history before specialist evidence tools.
- Give outside-study logging a distinct heading and one small contextual disclosure; remove the repeated “Self-reported, editable by deletion and re-entry...” caption without changing what logged minutes do.
- Shorten historical day summaries to saved availability, planned questions, recorded attempts and outside-study minutes. Missing records do not imply missed study.
- Put experimental reviewer workflows and memory-model evidence panels in a single collapsed-by-default research disclosure, preserving all panels, options and warnings. Keep that disclosure expanded across app rerenders during an active workflow.
- Retain visible local-data backup, sync and deletion warnings. The app still uses learner ratings to adjust review dates; outside logs cannot change memory intervals.
- Refresh version metadata and offline cache to `active-recall-web-v4-45`; keep the adaptive v4.41 favicon untouched.

## Verification and release gate

1. Run all deterministic tests and static copy/layout checks, with no schedule or storage schema changes.
2. GitHub Actions passes Chromium desktop/mobile navigation, expanded specialist workflows, outside-study logging, backup/restore and HTTPS offline reload; assert no new data writes from disclosure toggling.
3. Publish only after CI succeeds; verify published assets byte-match the tested tree, and sync local `main`.

## Rollback

Previous verified release: v4.44, commit `a63133d4cd344618230aef618996fb575fb33171`. Restore the earlier Progress page arrangement and offline cache if the grouped navigation prevents users from reaching existing research tools. This release performs no data migration or deletion.
