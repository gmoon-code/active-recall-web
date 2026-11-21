'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('pages omit repeated identity, promotional footer and fake profile chrome',()=>{
  const app=read('app.js'),theme=read('moon-theme.css');
  assert.doesNotMatch(app,/Free &amp; static · Notes stay in this browser/);
  assert.doesNotMatch(app,/100% free · Browser-local/);
  assert.doesNotMatch(app,/Blueprint 4\.35 · Free/);
  assert.doesNotMatch(app,/class="footer"|class="sidefoot"|class="topline"/);
  assert.match(app,/page==='insights'\?'<p class="utility-link"><a href="\.\/health\.html">Site diagnostics<\/a><\/p>'/);
  assert.match(theme,/\.pagehead \.eyebrow/);
  assert.match(theme,/\.modalhead \.eyebrow/);
  assert.match(theme,/\.pagehead > div > p/);
  assert.match(theme,/\.sessionpanel \.pagehead > div > p \{ display: block; \}/);
});

test('empty states and study setup have no generic explanatory subtitles',()=>{
  const app=read('app.js');
  for(const phrase of [
    'Create your own course or explore a clearly labelled sample',
    'Recall first, reveal the answer, then rate yourself.',
    'The same unified system adjusts to a quick break or a longer study block.',
    'Compare the current queue with a hypothetical review-first approach',
    'Use this when you want to work through previously attempted questions that are due',
    'Try different weekday/weekend minutes or unavailable dates.',
    'Use the simple form to write your first question and its answer.',
    'The plan is recalculated from your current learning records whenever you open it.'
  ])assert.ok(!app.includes(phrase),`Repeated explainer remained visible: ${phrase}`);
  assert.match(app,/function empty\(title,desc='',cta='',action=''\)/);
  assert.match(app,/\$\{desc\?`<p>\$\{esc\(desc\)\}<\/p>`:''\}/);
  assert.match(app,/empty\('Begin with your first course','','Explore sample data','demo'\)/);
  assert.match(app,/id="study-more-options"/);
  assert.match(app,/class="study-ready-summary" role="status"/);
  for(const phrase of ['Permanent deletion cannot be undone:',
    'No automatic cross-device sync.',
    'Rate what you could recall independently.']){
    assert.ok(app.includes(phrase),`Important warning or instruction missing: ${phrase}`);
  }
  assert.match(read('moon-theme.css'),/\.empty h2 \+ \.btn \{ margin-top: 16px; \}/);
});

test('study guidance, privacy and loss-prevention warnings remain explicit',()=>{
  const app=read('app.js');
  for(const phrase of ['Unsaved changes in this tab.','Export JSON backup','Clear local data',
    'No automatic cross-device sync.','Your answer (optional for oral recall)',
    'Rate what you could recall independently.','RECALL FOCUS ·','Question held for correction']){
    assert.ok(app.includes(phrase),`Required functional text disappeared: ${phrase}`);
  }
  assert.match(read('index.html'),/name="app-version" content="4\.45"/);
  assert.match(read('sw.js'),/active-recall-web-v4-45/);
});

test('contextual help replaces only useful explanations and leaves safety warnings visible',()=>{
  const app=read('app.js'),theme=read('moon-theme.css');
  for(const phrase of [
    'Read-only workload check · no automatic changes to due dates, grades or memory intervals',
    'Read-only priority inspector',
    'Private simulation · no automatic changes',
    'Saved locally with your learning data',
    'Assigned bars show only work the scheduler could fit.',
    '<strong>Known review:</strong>'
  ])assert.ok(!app.includes(phrase),`Unnecessary always-visible subtitle remains: ${phrase}`);
  assert.match(app,/function helpTip\(label,message\)/);
  assert.equal((app.match(/helpTip\('/g)||[]).length,6,'Help appears only at a small set of ambiguous calendar and progress concepts');
  assert.match(app,/helpTip\('About schedule fit'/);
  assert.match(app,/helpTip\('About the study-time bars'/);
  assert.match(app,/helpTip\('Known reviews versus conditional revisits'/);
  assert.match(theme,/\.help-tip:hover \.help-tip-bubble/);
  assert.match(theme,/\.help-tip summary:focus-visible \.help-tip-bubble/);
  assert.match(theme,/\.help-tip\[open\] \.help-tip-bubble/);
  assert.match(theme,/\.help-tip-glyph \{[^}]*width: 14px; height: 14px;/,'The visible help ring is smaller than the touch target');
  for(const warning of ['Research limitation','A scheduled opportunity is not a forecast of grades',
    'Permanent deletion cannot be undone:','Unsaved changes in this tab.']){
    assert.ok(app.includes(warning),`Safety or evidence limitation must stay visible: ${warning}`);
  }
});

test('Progress leads with recorded work, groups optional research, and moves outside-log caveats into help',()=>{
  const app=read('app.js'),theme=read('moon-theme.css');
  assert.doesNotMatch(app,/Self-reported, editable by deletion and re-entry\. Logging does not complete/);
  assert.doesNotMatch(app,/Local plan snapshots<\/span>/);
  assert.match(app,/Log study outside the app/);
  assert.match(app,/helpTip\('About outside-study logs'/);
  assert.match(app,/helpTip\('About study history'/);
  assert.match(app,/function arrangeProgressPage\(\)/);
  assert.match(app,/Research and reviewer tools/);
  assert.match(app,/id="progress-research" \$\{progressResearchOpen\?'open':''\}/);
  assert.match(theme,/\.progress-advanced > details/);
  for(const warning of ['No automatic cross-device sync.','Clear local data','Unsaved changes in this tab.']){
    assert.ok(app.includes(warning),`Data-protection warning must remain visible: ${warning}`);
  }
});
