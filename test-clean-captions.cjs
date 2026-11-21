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
  assert.match(read('index.html'),/name="app-version" content="4\.42"/);
  assert.match(read('sw.js'),/active-recall-web-v4-42/);
});
