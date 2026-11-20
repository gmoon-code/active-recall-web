# Active Recall Web v4.30 — replay-verified outcome evidence

## Invariant

All real review dates, question priorities and study sessions continue to use `transparent-interval-v1`. The optional **Progress → FSRS prediction history check** now appends five strictly separate, descriptive outcome audits to v4.29's read-only history replay. The FSRS predictions stay frozen before an answer; this release does not train or fit a model, call a network service, change review recommendations or add data fields. Old schema-v5 backups remain compatible.

The five label streams are literal agreement for learner-verified short factual answers; self- and other-person-entered manual rubric judgments for explanations and applications, each kept distinct. For complex responses, the reviewer's identity, independence and exposure are not verified. Literal mismatch may be a correct synonym. Invalid, assisted, immediate, too-soon or non-written records do not supply delayed labels; late and inconclusive manual reviews are excluded. A stored FSRS probability enters a cohort **only after exact default-weight replay of all preceding same-target history**.

## Conservative display gates

- Each stream requires at least 50 replay-verified delayed observations, 15 distinct targets, 10 positive and 10 negative labels for a descriptive target-balanced Brier error.
- The nominal last 20% by observation time is a distinct later-time window. Its score requires at least 50 earlier records from 15 targets with 10 positive and 10 negative, and at least 20 later records from 8 targets with 5 of each label. Identical timestamps stay in the same portion.
- If the 500-receipt replay cap truncates evidence, **withhold all scores**. Older or unreplayable records must never be filled in or given a zero.
- These thresholds are prudential display rules, **not power calculations**. Even when shown, the error measures agreement with narrow observed labels, not verified learning, causal superiority, an optimal retention goal or readiness to switch the scheduler. Target overlap and active-policy selection bias remain.

## Release gate

1. Start from published v4.29 `main`; keep prior changes and learner records intact.
2. Run all deterministic Node tests, syntax and diff checks, including `test-fsrs-outcomes.cjs` for sparse/forged evidence, time-boundary ties, separate review streams and no mutations.
3. Require the full GitHub Actions Chromium suite to run the on-demand audit in a real session, expand outcome details and verify that the saved attempts, receipts and due dates remain identical.
4. Require the temporary HTTPS offline browser check to verify the new `active-recall-web-v4-30` worker cache and schema-v5 storage after a true offline reload.
5. Merge/publish only with a green gate. Do not clear live site data to force a refresh. After publication check the v4.30 label, Progress, `health.html` cache and disposable test database reload. Advise the learner to keep a private JSON backup.

## Later scientific decision

An observational time-forward Brier result cannot establish that deploying FSRS would improve spaced recall. Before replacing automatic scheduling, evaluate retention **and time/capacity costs**, different materials and deadlines, bias from which questions the existing scheduler presents, missing outcomes and the robustness of labels. A change needs an explicit versioned policy decision, rollback path and independent validation; no universal optimum is claimed.
