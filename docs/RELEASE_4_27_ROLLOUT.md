# Active Recall Web v4.27 — controlled GitHub Pages rollout

**Status: NOT PUBLISHED.** Published `main` is v4.26 (`444560d`). The candidate is the local `feat/known-review-calendar-priority` branch and the exact-tree GitHub [draft PR #28](https://github.com/gmoon-code/active-recall-web/pull/28). This checklist prepares a release; it does not authorise an automatic merge.

## Before changing the public site

1. In the **currently published v4.26 app**, a learner with valuable notes or study history opens **Progress → Export JSON backup**, saves the downloaded file privately, and confirms that it is a nonempty JSON file. Keep it somewhere safe outside browser storage. Do **not** commit the file, attach it to the PR or share it in CI. This is the learner's private data, not a test fixture. For a first-time learner with no valuable data, record that explicitly instead.
2. Check that the candidate remains schema v5 with unchanged real memory policy identifiers, no new paid service or account, and no import-side historical due-date rewrite. `FSRS-7` remains a read-only shadow comparison.
3. Ensure the exact review head has a successful full GitHub Actions run: deterministic suite, deployment preflight, desktop/mobile browser tests, file-picker JSON restore, and the temporary-HTTPS service-worker/offline-reload test. These tests use fictional data.
4. Confirm the live repository's `main` head is still the expected v4.26 baseline and the draft PR has no unrelated changes. Keep a reference to that baseline for a revert.
5. The new `sw.js` cache must be `active-recall-web-v4-27` (not v4.26); `health.html` must inspect that exact key. This prevents release diagnostics from silently accepting the previous cache.

## Publication — only after the above checks and a release decision

1. Merge the reviewed source to `main` through the normal repository flow. This is **production publication** because GitHub Pages serves this repository's root on `main`; it is not a separate preview. Wait for the Pages deployment to finish.
2. On the real `https://gmoon-code.github.io/active-recall-web/` origin, first use a **disposable browser profile** with fictional study data. Confirm normal load, no runtime errors, the v4.27 release label, one-click study entry, and the question queue/calendar after a reload.
3. Open `/active-recall-web/health.html`. Confirm its dedicated storage-reload probe and its current offline cache checks show v4.27 assets. The diagnostics use a separate test database and should not inspect actual learning data.
4. While online, allow the new service worker to finish installing. Go offline, reload the same GitHub Pages app URL, and confirm the fictional notebook, recall attempts, memory due dates, and schedule are still present. Reconnect after the check. A local self-signed HTTPS test is not a substitute for this real-origin check.
5. In a disposable browser profile, repeat **Export → Import → confirm → reload** with fictional data. Verify all records and the calculated queue/calendar, not merely the success message. Test a cancelled overwrite as well. Do not use real learner notes to test the import flow.
6. Check a physically narrow touch device where practical. Mobile emulation has already passed in CI, but it does not prove touch ergonomics on every device.

## If the real-origin checks fail

- **Stop further rollout and retain local browser data.** Do not advise clearing site data, unregistering the worker blindly, or deleting IndexedDB; those operations can erase learning history.
- Revert the release on `main` with a new, reviewable commit and let GitHub Pages redeploy v4.26. Do not force-reset the shared branch. A service-worker rollback still requires an online load so the restored worker and cache can install.
- Recheck the live origin and `health.html`, including offline reload. If a learner cannot read their local data, preserve the browser profile and the private JSON backup while diagnosing; do not repeatedly import over it.
- Fix and re-run the complete automated suite before attempting publication again.

## What this release does and does not establish

v4.27 prioritises known first-pass/due work over speculative conditional repeats, considers workload capacity and optional exam preparation, and keeps the learner's study path simple. It does **not** establish an empirically optimal review interval policy, calibrated mastery, objective grading of complex answers, or validation of FSRS-7 for this app. Actual due dates continue to follow the existing transparent interval policy; opening a calendar cannot invent recall outcomes.
