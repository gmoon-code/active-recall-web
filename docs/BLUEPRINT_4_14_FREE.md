# Active Recall Web — Blueprint 4.14

## Study Rhythm & Schedule Fit: an honest first release

This release implements the first part of the proposed sustainability and study-habit feature without changing the active review policy, spaced intervals, grades, or due dates. It remains **100% free, browser-local and GitHub Pages compatible**; no account, paid AI, API or server is required.

### What is now implemented

1. **Overview → Schedule Fit.** A compact current-day card distinguishes user-declared available minutes, known due retrieval and preparation estimates, and estimated time for due questions which *could not fit* the capacity-constrained calendar.
2. **Calendar → Schedule Fit and next seven days.** The detailed view shows the same distinction, identifies first-pass reviews still waiting on each date, and displays how much of each day's capacity the calendar actually assigned. Conditional future revisits remain labelled as such.
3. **Progress → Recorded study rhythm.** Seven local calendar days show the latest saved dated plan, any revision, actual attempt counts, usable question-level timed attempts, and overlap with question IDs included in the observed plan. No-record dates are explicitly **unknown**, not labelled missed.
4. **Dated plan snapshots.** When the app first opens with active learning material on a date, it stores a snapshot with the available minutes, candidate due workload, planned targets and unplaced due work. Changes to availability create a *new* revision without editing the earlier record. These records travel with JSON backups.
5. **Rest-day treatment.** Dates explicitly marked unavailable and weekdays/weekends configured with zero available minutes are planned rest or unavailable days, not streak failures.
6. **Privacy-minded permanent deletion.** If a permanently erased question occurs in the planned-target list for a dated snapshot, that date's snapshots and revisions are also removed rather than retaining identifying target links or inaccurate aggregates.

### Important distinctions

- **Full known due workload** is determined from currently active, eligible, new or due targets. This is separate from the smaller set the scheduler could actually assign. Planned syllabus preparation steps are separately estimated and may contribute to today's nominal demand.
- A known due target which cannot fit today is **not** automatically given a fictitious completed review, and its memory due date is unchanged.
- The seven-day projection still includes *conditional* future spaced revisits. No future performance is simulated.
- Task duration is an estimate based on task type or previous timing samples. Session elapsed time is **not** treated as verified active study; the Progress panel only sums plausible, recorded question-attempt durations.
- A snapshot records the plan when first **observed** in the app. It is **not** evidence that a user committed to that exact plan yesterday; newly installed versions cannot reconstruct old plan commitments.
- A day without a snapshot does not establish whether the learner studied elsewhere. The app says **no plan record** or **no practice recorded in this app**.
- Self-ratings and attempt counts do not establish recall accuracy, calibrated mastery, study effectiveness or exam readiness.
- This version does not invent a productivity score, make punitive streaks, silently change spacing dates, or notify the user in the background.

### How to try it

1. Add or import reliable, user-verified Q&A for one or more courses in **My Q&A**.
2. Open **Calendar**, set realistic weekday and weekend minutes, and add unavailable dates if needed.
3. Inspect **Study Rhythm & Schedule Fit**. The *Due work left unassigned* measure surfaces due work excluded from the capacity-fitting calendar. If nominal demand fits but the scheduler still left due tasks unassigned, this is reported as a priority/assignment gap rather than proof of insufficient available time.
4. Perform some retrieval work in **Study Now** and open **Progress**. If no previous daily plan snapshots exist, the earlier days will correctly remain unknown.
5. Adjust Calendar availability and save it. The current day's plan revision is kept alongside its original snapshot.
6. Export a JSON backup regularly. Plan history uses the existing optional schema-v5 extension and is retained on a normal backup round-trip.

### Verification and limitations

- New deterministic tests cover known due overload, unavailable/rest days, snapshot revisions, attempt-vs-session timing, unknown historic days, malformed backup detection and deletion cleanup.
- Existing automated suites cover question imports, deletion, reviews, scheduling policy evidence and offline asset preflight.
- Browser smoke automation may be restricted by the execution environment; do not infer a completed visual regression from unit tests alone.
- This is a **foundational** version. It does not yet support off-app study declarations, planned-vs-actual timed sessions, a weekly schedule coaching dialogue, or a user-approved what-if rescheduling simulator.

### Next evidence-aware design step

Introduce explicit user-confirmed planned study days, optional self-reported off-app practice kept separate from recorded retrieval attempts, and a weekly reflection. Only after those records accumulate should the app provide scenario-based scheduling suggestions. It should show proposed changes and obtain permission before modifying availability or future plans. Comparing provisional interval policies remains a separate research and validation task.
