# Active Recall Web — FSRS-7 shadow replay (unreleased)

**Goal:** Evaluate a genuine documented spaced-repetition model alongside the currently active `transparent-interval-v1` policy, without changing due dates, calendar priorities, past attempts, schema-v5 backups or private study data.

## Library and reproducibility

- `ts-fsrs` **6.0.0**, running its explicitly selected **FSRS-7** model with bundled default weights; source: <https://github.com/open-spaced-repetition/ts-fsrs>.
- Dependency: `@open-spaced-repetition/srs-kit` **1.0.0**.
- All computation runs locally. The compiled browser file `vendor/fsrs-7-shadow-vendor.js` is included in the service worker's offline cache. It contains no network service or remote optimizer.
- The repository carries `vendor/LICENSE-ts-fsrs` (**MIT**) and `vendor/LICENSE-srs-kit` (**BSD-3-Clause**). Preserve these notices with the bundle.
- To rebuild with Node 24+, create a clean temporary npm project, install `ts-fsrs@6.0.0` and `esbuild@0.25.12` there, copy `vendor/fsrs-shadow-entry.mjs` into that temporary project (so its imports resolve), and bundle it with `--bundle --platform=browser --format=iife --global-name=ActiveRecallFSRSVendor --target=es2022 --minify --legal-comments=none`. Copy the resulting JS into `vendor/fsrs-7-shadow-vendor.js`, verify its SHA-256 and preserve both licence notices. Do not update either pinned version silently; newer algorithms or presets are materially different scheduling policies.
- Rebuilt artifact SHA-256: `26ce3ffbec6f250db4d15091ce2fc78c06f37429f699e1c875843fa308f10485`. The final JS bundle has no `fetch`, XMLHttpRequest, WebSocket or beacon calls.

## Read-only flow

Open **Progress → FSRS-7 interval comparison** and click **Compare intervals and calendar with FSRS-7**. The app constructs an ephemeral replay of the review history for each currently eligible, previously attempted target, then compares the FSRS-7 next review interval and due date with the unchanged actual memory date. The result stays in volatile page state; it is never saved to local learning history or used by Study Now or the calendar.

The shadow is deliberately limited to histories with:

- A complete, chronological sequence of actual attempts for the **current target and requirement versions**, matching the saved review count and latest time/rating.
- Explicitly verified requirements, independent **written** answers, no hints and no immediate post-study attempts.
- Honest Again/Hard/Good/Easy learner ratings, including existing rubric-related conservative downgrades (`scheduleRating`). Ratings are **not independently verified correctness**.
- The established active policy ID. Legacy or incompatible histories are excluded, not retroactively imputed.

The model uses `desiredRetention: 0.9`, no fuzz, no short-term learning steps and the default FSRS-7 weights. These are **experimental comparison settings**, not scientifically established optimum values for individual learners, exams, biology explanations or application tasks. There is no personal-parameter fitting in this increment.

## Calendar workload sensitivity (partial hybrid)

The same button now runs a **read-only, one-step hybrid calendar scenario** using `Core.buildReviewAgenda` twice:

1. The baseline uses **all real saved due dates** and the user's saved availability: horizon, weekday/weekend minutes and unavailable dates.
2. A temporary in-memory copy of the database and substituted memory entries replaces **only the next `dueAt`** of each target with a complete, eligible FSRS-7 replay. It shares the unchanged, read-only reference to potentially large source documents. A target excluded by the history gates, or beyond the 500-candidate inspection limit, keeps its actual due date. The user's actual saved `intervalDays`, grades and all other data remain unchanged in both. This limits the model substitution to the next due opportunity; further reviews cannot be simulated without actual future grades.
3. The same agenda algorithm runs on the clone with identical capacity, examination constraints, task estimates and optional early-exam review rules. Both calendars use the existing **conditional revisit heuristic** after a first pass. Neither is a full FSRS-generated future sequence.
4. The screen contrasts first-pass opportunities, known due targets unplaced within the window, total assigned minutes including syllabus preparation, conditional revisit slots, first-pass date movements and eligible-target coverage before in-horizon assessments. These count **possible planning slots**, not guaranteed completed study, demonstrated recall, readiness or exam results.

Changing the next due date can change which other tasks fit because the calendars compete for the same finite time; earlier/later/only-in-one-calendar movements count **all first-pass opportunities**, including indirect displacement. Unavailable days are still zero-capacity days. There is no account of people actually following the plan, and no automatic recommendation to switch scheduling policy based on a difference in workload.

`compareCalendar()` never calls storage or changes the input database. The browser UI holds the result in ephemeral state and invalidates it after an actual data change; no shadow due date enters a session queue, the real calendar, or an exported backup. Deterministic regression tests assert unchanged input and policy, availability equality, unmodeled-target opportunities, assessment scoping, and failure on invalid settings. A separate browser regression must be rerun in an environment where Chromium can launch.

## Interpretation and remaining limitations

The replay answers *what the default FSRS implementation would calculate if supplied these recorded grades and timestamps*. It does **not** establish which intervals are better for delayed understanding, exam performance or study efficiency. The observed reviews came from the active scheduler; only the actual schedule produced observed outcomes. In particular, hypothetical future dates cannot be treated as counterfactual successes. Excluded histories are not missing-at-random. FSRS flashcard benchmarks are informative but cannot independently validate complex scientific reasoning tasks. Use the existing forward-time evidence audits to assess future predictive calibration and label reliability before considering any live policy switch.

**Release gate:** full non-browser tests, static asset checks, offline-cache coverage, browser/mobile workflow and backup/reload verification are required before publishing to the existing GitHub Pages site. Current live v4.26 is unaffected until that gate passes.

Past-date comparisons exclude histories containing a review timestamp **later than the chosen preview instant**. These could be legitimate future reviews or device-clock errors; either way, a preview cannot use observations that had not occurred. The UI reports this exclusion count. No record is corrected, deleted or backdated.

### Managed-browser preview QA — 2026-11-19

- Opened an isolated copy of the review branch in the managed Chrome browser, using the static `http://127.0.0.1` preview. Generated the four-course built-in demo. With no eligible written reviews, current and hybrid 21-day calendars rendered identically, without pretending there was FSRS history.
- Completed one genuine **unassisted written** sample retrieval, rated `Good`, through the study UI. The FSRS panel then showed **1 comparable target**, a **2-day active** interval and a **4.78-day hypothetical** interval; the expanded example retained **Nov 21** as the saved due date and showed **Nov 24** only as the FSRS shadow. First-pass opportunity counts remained identical because the normal pre-exam calendar heuristic applied in both scenarios.
- Reloaded the actual page, reopened Progress, and recomputed the comparison: the written attempt, saved due date and hypothetical date all remained consistent. Expanded assessment coverage also rendered the two demo assessment rows without implying exam readiness.
- The diagnostics page could reach **28 essential files**, read/write its separate test database, and persist its test value across a full page reload. The local HTTP preview intentionally does **not** register the offline service worker (`index.html` requires HTTPS), so this test **does not establish offline-reload success**. A real-device mobile/touch check and the full automated browser regression remain outstanding.
- A subsequent managed-browser responsive test framed the unchanged app at **390px and 320px**, preserving the real iframe viewport/media queries. It exposed a compressed eight-item bottom navigation, intrinsic-width import fields, cramped two-column metrics and long controls that pushed content sideways. The review branch now uses four destinations per row at widths up to 640px, narrows form/button content and stacks metric grids below 400px. After fixing these, the Progress panel and FSRS button remained usable, and document `scrollWidth` equalled `clientWidth` at **both widths**. The automated browser test now asserts those two viewport widths and the two-row nav; it still needs an environment where its Chromium process can launch. A frame preview is not a real-device touch test.
- A deterministic **schema-v5 backup round-trip** now serializes the same full JSON shape as the app's Export action, validates it through `Core.validateImport`, and confirms identical saved due dates, current study queue, available-day calendar, outside-study logs, daily plan history and recalculated FSRS read-only output. JSON's normal omission of `undefined` optional properties is not construed as lost evidence. The serialized backup contains no FSRS-7 preview model selection, and an altered historical active-policy decision is rejected. This is a core-level test; the browser file chooser import/restore interaction remains to be tested separately.
- A past-date replay regression now excludes future-dated reviews, leaves the hypothetical calendar equal to the active one when none is eligible, and permits a normal comparison once the last recorded attempt has occurred; the saved records remain unchanged throughout.

This is a workflow smoke check on fictional demo data, not a retention-model validation, a real learner study, or permission to promote the shadow scheduler into the active policy.
