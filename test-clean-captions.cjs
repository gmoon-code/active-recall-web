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

test('study guidance, privacy and loss-prevention warnings remain explicit',()=>{
  const app=read('app.js');
  for(const phrase of ['Unsaved changes in this tab.','Export JSON backup','Clear local data',
    'No automatic cross-device sync.','Your answer (optional for oral recall)',
    'Rate what you could recall independently.','RECALL FOCUS ·','Question held for correction']){
    assert.ok(app.includes(phrase),`Required functional text disappeared: ${phrase}`);
  }
  assert.match(read('index.html'),/name="app-version" content="4\.36"/);
  assert.match(read('sw.js'),/active-recall-web-v4-36/);
});
