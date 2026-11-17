# Active Recall Web — Blueprint 3.4: Guided Learning Before Retrieval

**Release:** November 17, 2026  
**Production architecture:** Free public GitHub Pages, client-only browser-local data.  
**Database schema:** v5 unchanged; optional `syllabusObjectives[].learningGuide` and `attempts[].practiceStage` fields.

## Why this is the next stage

The central product is an automatically updating multi-course learning and spaced-review calendar. Version 3.3 distinguished *preparation tasks* from *memory reviews*, but only offered a four-minute preparation-planning prompt. Version 3.4 connects unmet syllabus goals with an actual, learner-controlled learning sequence: **choose and read a source → work through a self-written explanation → retrieve without viewing notes → receive corrective answer and self-rate**.

Cognitive research supports using explanations or worked examples for initially unfamiliar, complex tasks, and using feedback after attempts at retrieval; it does not establish that a single immediate correct retrieval proves delayed retention. See the project's academic synthesis in [`RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md`](RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md). The exact workflow and time policy remain unvalidated implementation decisions.

## New functionality

1. **Begin guided learning** from an explicitly entered syllabus goal in Knowledge or the preparation step in Calendar. This is a real browser view, not a simulated calendar event.
2. **Select a real source** from the goal's own course. Display the original text, and flag if the source version changed after the guide was saved. The app does not assume word overlap establishes curriculum coverage.
3. **Save an explanation or worked example** written by the learner (max 4,000 characters). This is *supported learning*, not an independent recall grade. No memory interval changes when saving the guide.
4. **Hide source and explanation** before the retrieval step. Only explicitly linked and verified, eligible recall questions can be used. If no verified question exists, open the question-authoring flow. Unverified generated prompts never enter the session.
5. **Require answer reveal before self-rating.** The learner types or leaves a blank response, then checks an explicitly recorded reference answer and existing criteria. Only the learner's four-grade judgment records a real attempt.
6. **Classify as `immediate_post_study`.** Progress counts this separately from later, unassisted self-rated attempts and never presents the immediate attempt as delayed recall. An actual attempt does update the next review date, because a real retrieval was performed, but future hypothetical reviews are still conditional.
7. **Keep the data local and compatible.** A learning guide stores a same-course source ID and its version, learner-authored explanation, and update time. Import validation rejects nonexistent or cross-course source references, forged evidence stages, and oversized explanations. Previous schema-v5 exports without these new optional fields remain valid.

## Safety / integrity boundaries

- No automatic scientific-content generation, correctness grading, invented model answer, artificial study attempt, or claimed mastery.
- A manually supplied reference answer may be incorrect. The learner should confirm it against reliable source material or an instructor. A verification flag means reviewed, not independently fact-checked by this system.
- Guided source study is not a substitute for instruction when prerequisite knowledge is missing or tasks are complex. Work through external worked examples if needed.
- If the linked source is revised, the saved guide becomes stale and retrieval is blocked until its current version is reselected/reviewed.
- The guided flow is available while the app is open. GitHub Pages does **not** run scheduling tasks in the background while the browser is closed or send notifications automatically.
- Browser-local persistence is not guaranteed. Export JSON backups regularly, avoid storing private student records, and never commit exports to the public repository.
- No mandatory online API calls, no subscription, no payment, no paid AI model, no billing account and no third-party data transfer. Static hosting is free.

## Verified testing scope

- `node --test test-*.cjs`: **237/237 automated tests pass** (14 v3.4-specific tests, other 223 from prior releases).
- `node deploy-preflight.cjs`: **6/6 static checks pass**.
- Chromium desktop (1280px) and mobile (390px), using isolated in-memory mock storage: source selection, saved explanation, hidden reference before reveal, independent answer, reveal, self-rating, one recorded attempt and next review. **No JavaScript errors or mobile horizontal overflow.**
- Historical notes, target IDs, review dates, and attempts are not reset or migrated to a new schema.
- **Not directly verified**: long-term learning effectiveness; live-origin IndexedDB/service-worker behaviour on a real end-user device; benefits of these precise steps relative to alternatives.

## Next priority

Further strengthen the quality of worked examples and question rubrics through learner-verifiable sources; then evaluate delayed retrieval under real time constraints and adapt session durations with actual observed study time. Do not equate better scheduling prediction with demonstrated educational efficacy.
