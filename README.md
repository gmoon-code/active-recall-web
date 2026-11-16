# Active Recall Web — Free Edition v2.7

One browser-local learning system spanning courses, source-grounded recall targets, explanation criteria, assessment priorities, and a recurring review calendar.

## Start

Visit the existing free GitHub Pages address: https://gmoon-code.github.io/active-recall-web/

The v2.7 code is also included here for independent deployment or backup. To deploy to a public GitHub Pages repository, upload the **site files at the repository root** and enable Pages for the `main` branch and `/(root)` folder. No paid services or build tools are required.

### Most important changes

- **Calendar** (formerly Outlook) now proposes repeated spaced reviews, not just first-pass opportunities.
- A known due date is a real saved review window. Later conditional reviews are *proposals* requiring actual future learning to become real.
- Save weekday/weekend availability, blocked days, and 7–42-day planning horizon locally. A missed study day defers the task; it is not evidence of forgetting.
- **Study Now** prioritises the current day's planned work within the user's chosen 5–720-minute session.
- Locally generated **draft questions require verification** before entering the active queue.
- Existing sources, review attempts, assessment records, and schema-v5 backups remain supported.

### Privacy and reliability

Study data are stored locally in browser IndexedDB or localStorage fallback. They do not automatically synchronize between devices. Export JSON backups regularly. **Never commit personal learning records or backups to this public repository.**

A denied persistent-storage request does not necessarily indicate inability to save. See `health.html` on the deployed website for local diagnostics.

The app does not grade arbitrary explanations, establish validated mastery, promise optimal intervals, or predict exam scores. Source-derived questions and criterion suggestions are editable and must be reviewed by a learner. Limited PDF extraction requires careful checking against the original document.

**Permanent zero-payment rule:** no paid services, subscriptions, API credits, credit cards or paid hosting are required.

## Validation and research

149 automated tests passed in the local release, plus simulated Chromium desktop/mobile checks. The calendar's timing heuristics are experimental. For technical discussion, see `BLUEPRINT_2_7_FREE.md` and the repository's research document: `docs/RESEARCH_2026_QUESTION_DESIGN_AND_AUTO_SCHEDULING.md`.
