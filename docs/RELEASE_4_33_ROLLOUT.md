# Active Recall Web v4.33 — stale-tab save protection

## Scope and data safety

- Preserve the current free GitHub Pages/static/offline model, local study history, existing scheduling intervals, and schema-v5 JSON backup format.
- IndexedDB stores a monotonic row revision and checks that **both the revision and previously read raw payload** still match, inside the same readwrite transaction as the replacement. An out-of-date tab receives a stale-snapshot rejection; the newer persisted snapshot is never replaced by that stale save.
- Read older IndexedDB rows with no revision as revision zero. The next authorised write adds revision one; no database version bump, destructive migration or JSON backup rewrite is necessary.
- An out-of-date tab displays a persistent warning. The learner may export that tab's *unsaved in-memory* JSON backup, reload to see the newer notebook, and reconcile differences manually before importing anything. A rejected write never masquerades as a saved review attempt.
- Within a single tab, serialized saves still capture their payload at the time of each request and commit in order. Loading data for read-only inspection does not silently grant stale writes renewed authority.
- **Limitations:** Tabs still running v4.32 or older cannot be stopped from doing their own unguarded writes. Close older tabs after updating. The localStorage fallback lacks an atomic compare-and-swap mechanism, so the IndexedDB multi-tab guarantee does not apply in fallback mode. The app does not automatically merge competing notebooks, synchronize devices, or restore unsaved memory after a browser crash.

## Verification before publication

1. Check JavaScript syntax for app, storage, workflow browser tests; run the entire local deterministic Node suite.
2. Real Chromium browser test 'test-storage-concurrency-browser.cjs': initial two-tab same-revision read, first accepted write, second rejected write with persistent warning, unmodified saved record, unsaved JSON export, direct stale-backup import rejection, reload and renewed authorised save, reverse-direction conflict, mobile viewport.
3. Real Chromium also tests v4.32 IndexedDB rows without revision metadata, initial revision migration, an older-format writer changing data without incrementing revision, and rapid same-tab queued writes.
4. Run the full GitHub Actions desktop/mobile browser, JSON backup/restore and HTTPS offline checks; confirm offline cache 'active-recall-web-v4-33'.
5. Only after successful checks: merge through the normal PR review workflow, confirm Pages deployment and the live health page report Blueprint 4.33 and matching offline cache.

## Rollback

If independent checks or live verification fail, revert the release commit through a normal reviewed PR and redeploy. Never clear IndexedDB/localStorage or learner records as part of rollback. The added revision field is non-destructive metadata understood as an extra property by the older app. **Close any older tabs before switching builds**, because they do not enforce the guard. Keep user-exported schema-v5 backups intact.
