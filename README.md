# Active Recall Web — Free Edition

A free, browser-local active-recall learning system for multiple courses.

## What it does

- Capture notes and import text, Markdown, and supported text-layer PDF documents.
- Organize source-linked learning requirements, recall focuses, and question variations.
- Create unified study sessions across courses, with selectable durations from 5 minutes to 12 hours.
- Consider assessment deadlines, due reviews, and previous self-reported practice when proposing activities.
- Review explanations using editable criteria; inspect source excerpts and schedule reasons.
- Export and import JSON backups.

Study responses are **self-rated**, not independently graded by an AI. Scheduling and mastery indicators are provisional, not exam-score predictions.

## Publish free with GitHub Pages

1. Open **Settings → Pages** in this public repository.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose **main** and **/(root)**, then select **Save**.
4. After GitHub reports the site is deployed, open:  
   https://gmoon-code.github.io/active-recall-web/
5. Check on-site diagnostics:  
   https://gmoon-code.github.io/active-recall-web/health.html

The website is static. No paid hosting, API key, billing information, subscription, or account is required by the app.

## Important data notes

Your notes, study attempts, and review schedule are stored **locally in your browser**, not in this public GitHub repository. GitHub Pages hosts only the application's code and static files.

- Do not publish personal notes, exported backups, or private course documents to the repository.
- Export JSON backups regularly. Browser data can be lost when you clear site data, switch devices or browsers, or use private browsing.
- Data does not automatically sync between devices. Import a backup on another device to transfer it.
- Keep using the same GitHub Pages URL for future updates to preserve the browser storage origin.
- PDF extraction is limited: carefully verify extracted text, especially for equations, diagrams, complex layouts, and scanned documents.
- For offline usage, visit the deployed site online first to allow the service worker to cache the static files.

## Project constraint

**Permanent zero-payment rule:** deployment, maintenance, and required functionality must remain possible without paid services, paid AI APIs, subscriptions, or billing details.

## Status

Code release: **v2.5 Free Edition**. GitHub Pages is enabled, and its initial build and deployment [completed successfully](https://github.com/gmoon-code/active-recall-web/actions/runs/43787614869) on November 16, 2026. The app is published from `main` at https://gmoon-code.github.io/active-recall-web/. Live-device storage persistence and offline reload have not yet been independently confirmed; use [Site Diagnostics](https://gmoon-code.github.io/active-recall-web/health.html) to check them in your browser.
