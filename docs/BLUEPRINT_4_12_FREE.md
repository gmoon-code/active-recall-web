# Active Recall Web Blueprint 4.12 — Copyable Q&A Formatting Rules

**18 November 2026** · Permanent guarantees: GitHub Pages, 100% free, no billing or paid APIs, local IndexedDB, compatible schema-v5 backups and no changes to the transparent review scheduler.

## User request

Make the Q&A input rules directly available where learners paste or upload a question-and-answer list, with easily copyable instructions suitable for requesting correctly formatted questions from a text-generation assistant.

## Changes

- **My Q&A → Paste or upload a list of questions & answers** now shows a shaded **Copyable Q&A formatting rules** panel.
- A visible, selectable, read-only text area contains a complete reusable prompt asking for note-supported, non-duplicative `Q:` / `A:` pairs separated by one blank line. The prompt tells the generator to preserve important conditions and exceptions, use no prose outside the actual pairs, keep questions under 500 characters and answers under 4,000, and avoid `Q:` / `A:` labels inside multiline answer continuations.
- **Copy formatting rules** writes that prompt to the local clipboard. If browser clipboard permission is unavailable, the app attempts legacy copy; if blocked, the text area is selected for manual copying.
- A second example uses only valid Q&A lines, and is independently parseable by the existing offline importer.
- The panel distinguishes **copying a generation prompt into ChatGPT** from **pasting just the resulting Q&A list into the app**. Pressing copy never creates, schedules, verifies or imports questions.

## Integrity and limits

No changes to `qa-import.js`, `core.js`, question content, stored review evidence, scheduling policy, data schema or backup format. Local validation and duplicate checks still apply at preview and confirmation. Scientific accuracy is not guaranteed by text formatting: the learner must check every question and answer against the original notes before import. No AI or cloud service is called by the app.

## Verification

Node test checks for visible, read-only rules and copy binding; browser regression test checks that the displayed example parses as two questions, that the button places the full prompt on the clipboard, and that nothing is saved by copying. Existing import and review workflows remain in the automated test suite.
