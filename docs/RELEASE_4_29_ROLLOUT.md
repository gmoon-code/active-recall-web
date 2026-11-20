# Active Recall Web v4.29 — FSRS replay audit

## Scope

New **Progress → FSRS prediction history check** runs locally only when the learner asks for it. It walks saved FSRS-7 pre-answer receipts, replays *only preceding* same-target, same-version, independent written practice with the bundled default-weight model, and compares the resulting probability to the saved six-decimal value. It displays included and excluded counts. The live scheduler (`transparent-interval-v1`), unified question queue, calendar, ratings, source history and schema-v5 backup format remain unchanged.

The replay proves only mathematical consistency with recorded historical grades and times. The saved record itself is not cryptographically signed; imported timestamps, user labels and reviewer claims can be fabricated. Replayed receipt counts and delayed literal-label candidates must **not** be advertised as validated calibration, superior FSRS scheduling, mastery or verified recall. This new FSRS audit calculates **no** Brier scores or fitted parameters; the older, unrelated unfitted-curve analysis remains separate.

## Pre-merge gate

1. Confirm the branch starts at published v4.28 `main`, with no untracked learner data or unrelated changes.
2. All Node deterministic tests, syntax checks, backup-compatibility and deploy-preflight checks must pass.
3. GitHub Actions Chromium must exercise the real session forecast, then click the replay audit, confirm the receipt is replayed, and verify that the persisted attempts and due date do not change.
4. Temporary HTTPS offline test must reload with the **new** `active-recall-web-v4-29` cache and unchanged schema-v5 local study data. `health.html` must check this cache.
5. Any failure blocks merge and publication. Never clear actual site data to force an update.

## After publication

1. Open the existing [GitHub Pages origin](https://gmoon-code.github.io/active-recall-web/) in a disposable browser profile and verify the Blueprint 4.29 label and the Progress audit.
2. Check `health.html` for the current cache, essential-file coverage and a separate database value surviving reload. If possible, perform a true offline reload; otherwise distinguish CI offline proof from hosted checks.
3. Preserve the user's saved study history. Encourage independent JSON backups; never request a private learner export for QA.

## Next evidence gate

Only replay-verified, prospectively recorded, delayed, unassisted responses should be considered for an exploratory time-forward calibration check. Keep strict literal agreement, self-reviewed explanations and unverified other-person reviews **separate**; check diversity, missingness, model choice and repeated targets. An observational error score cannot establish that switching review intervals would improve outcomes. Any live FSRS scheduler change requires an explicit new decision and rollback plan.
