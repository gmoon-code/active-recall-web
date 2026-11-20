# Active Recall Web v4.34 — commit-first local clear

## Scope and safeguards

- Fix the *Clear local data* path so the browser does not switch to a new empty notebook until `ActiveRecallStorage.save(empty, null)` resolves successfully. Cancelled or rejected clearing leaves the existing working notebook visible and in memory.
- Keep the existing explicit confirmation and strengthen its wording to explain that an exported schema-v5 backup is needed to recover intentionally erased work.
- Prevent regular click/form edits and automatic plan saves while a clear is pending. A successful clear resets the active session and ephemeral editor/modal state; it does not create a new recall attempt.
- Preserve the existing commit-first JSON backup import workflow, v4.33 stale-tab guard, transparent scheduling intervals, local-only storage, 100% free hosting, and schema-v5 import/export format.
- No automatic backup download (which could expose unencrypted study notes in Downloads), silent data migration, cloud account, or billing.

## Verification

1. JavaScript syntax and full local Node suite, including `test-safe-clear.cjs`: cancellation, pending write, blocked editing, simulated failure, retained historical state, successful commit, schema version.
2. Real Chromium `test-safe-clear-browser.cjs`: fictional attempt record, cancel, simulated failure, reload, delayed actual commit, persisted empty snapshot, JSON export, mobile layout.
3. Full GitHub Actions desktop/mobile Chromium, v4.33 two-tab conflict protection, backup restore and HTTPS offline reload.
4. Confirm service worker and diagnostics use `active-recall-web-v4-34`. Publish only after the checks pass and verify the live build on GitHub Pages.

## Rollback

Revert a faulty v4.34 change by a normal reviewed PR and redeploy. Do not manually delete user browser storage or perform a schema conversion. Existing schema-v5 backups and revision-protected IndexedDB records remain compatible. Anyone using an older open tab should close and reopen it after the release.
