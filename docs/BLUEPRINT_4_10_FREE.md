# Active Recall Web Blueprint 4.10 — Paste / Upload Q&A Lists

**Date:** 18 November 2026  
**Permanent constraints:** zero cost, GitHub Pages, privacy-conscious local IndexedDB, offline after caching, compatible schema-v5 backups, preserve existing review evidence and dates.

## Owner request

The v4.9 learner-authored My Q&A page allowed adding questions one by one or pasting a limited Q/A block. This release adds direct **file upload and multi-format clipboard paste** for full lecture question lists, with a read-only preview and separate human confirmation.

## How to use

1. Go to **My Q&A** and choose a course. You may select existing lecture notes, write a lecture title, or rely on a Lecture column in your file.
2. Expand **Paste or upload a list of questions & answers**.
3. Choose a `.txt`, `.md`, `.csv`, `.tsv` or `.json` file, or paste its textual content into the box and click **Preview pasted questions**.
4. Examine *all* proposed question and answer pairs in the scrollable preview. The preview shows the course, lecture and practice type for every entry. No questions have been created yet.
5. Select **Confirm and save** to add all valid questions in one transaction-like all-or-nothing operation. Existing self-rated practice and due dates remain unchanged.

Formats:

```text
Q: How do enzymes lower activation energy?
A: They stabilise the transition state through favourable interactions.

Q: What does competitive inhibition do?
A: A competitor binds the active site and reduces substrate binding at a given concentration.
```

```csv
Question,Answer,Lecture,Type,Course
"What is ATP synthase?","An enzyme that synthesises ATP.",Lecture 6,Recall,AP Biology
"How does it use the gradient?","Proton flow drives conformational changes.",Lecture 6,Explain,AP Biology
```

The clipboard importer recognises Q/A blocks, quoted CSV, tab-separated spreadsheet rows and JSON arrays. Quoted CSV fields may include commas, line breaks and escaped double quotes. A simple two-column CSV without headers is accepted; clearly marked headers are recommended. PDF and native `.xlsx` lists are not parsed: export the list to CSV or TSV or paste its text.

## Data and safety guarantees

- Files are read locally using the browser file API, with no file-content network requests, paid endpoints or accounts.
- 400 KB source limit, 200 question limit, maximum 500 characters/question, 4,000 characters/answer and 120 characters/lecture name. More than 200 questions should be split into smaller lists.
- The selected course must match any provided Course value. A selected source's title must agree with any explicit per-row Lecture name; otherwise the import is rejected to prevent silently losing grouping information.
- Repeated questions within the same lecture or already present in the same course + lecture are rejected. The importer checks again at confirmation, so a stale preview cannot bypass duplicate protection.
- Validation finishes before any records are created. New questions use existing `addRequirement`, preserving the unified queue's individual targets and histories. No due date is modified until the learner later completes an actual review attempt.
- The preview displays exact learner-supplied answers but **cannot establish their scientific correctness**. Review these against your course material. Source links are organizational, not fabricated evidence citations.
- User-authored Q&A does not run the rule-based automatic question generator. Existing rule-generated drafts remain opt-in, unverified and out of the calendar until human approval.

## Tests

New deterministic tests exercise CSV quoting/multiline values, tab-separated paste with BOM, JSON parsing, Q/A text, malformed/missing fields, 200-item limits, cross-course protection, per-row lectures, stale-preview duplicate checks and old schema-v5 backup compatibility.

Browser tests cover actual file input through a file chooser, preview with zero preliminary writes, explicit confirmation, duplicate rejection, lecture grouping and mobile screen width. All previous workflow tests remain in CI.

## Next

Collect real usability feedback on importing lecture questions, then continue the science-informed, read-only comparison of recognition and independent retrieval schedules before changing the active study calendar.
