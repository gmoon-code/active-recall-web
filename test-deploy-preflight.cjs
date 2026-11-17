'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('static GitHub Pages entry has relative scripts and CSS',()=>{
  const s=read('index.html');assert.match(s,/src="\.\/core\.js"/);assert.match(s,/src="\.\/human-review\.js"/);assert.match(s,/href="\.\/styles\.css"/);
});
test('offline worker is versioned and caches review module',()=>{
  const s=read('sw.js');assert.match(s,/active-recall-web-v4-5/);assert.match(s,/'\.\/human-review\.js'/);assert.match(s,/'\.\/paired-review\.js'/);assert.match(s,/'\.\/paired-review-ui\.js'/);assert.match(s,/'\.\/review-packets\.js'/);assert.match(s,/reviewer-offline\.html/);assert.match(s,/reference-reviewer-offline\.html/);assert.match(s,/reference-first\.js/);
  const diagnostics=read('health.html');
  assert.match(diagnostics,/active-recall-web-v4-5/);
  assert.match(diagnostics,/reviewer-offline\.html/);assert.match(diagnostics,/reference-reviewer-offline\.html/);
  assert.doesNotMatch(diagnostics,/active-recall-web-v2-8/);
});
test('the JS load order preserves rubric and local storage boot',()=>{
  const s=read('index.html');assert.ok(s.indexOf('human-review.js')<s.indexOf('paired-review.js'));assert.ok(s.indexOf('paired-review.js')<s.indexOf('core.js'));assert.ok(s.indexOf('paired-review-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('review-packets.js')<s.indexOf('core.js'));assert.ok(s.indexOf('review-packets-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('reference-first.js')<s.indexOf('core.js'));assert.ok(s.indexOf('reference-first-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('core.js')<s.indexOf('storage.js'));assert.ok(s.indexOf('storage.js')<s.indexOf('app.js'));
});
test('the site keeps only local storage without remote account sign in',()=>{
  const s=read('storage.js'),html=read('index.html');assert.match(s,/indexedDB/);assert.doesNotMatch(html,/(?:src|href)="https?:|\/login|oauth|stripe/i);
});
test('study scheduler still has original immutable policy identifiers',()=>{
  const s=read('core.js');assert.match(s,/transparent-interval-v1/);assert.match(s,/conservative-shadow-v1/);assert.match(s,/H\.validate\(input\)/);assert.match(s,/P\.validate\(input\)/);assert.match(s,/R\.validate\(input\)/);assert.match(s,/F\.validate\(input\)/);
});
test('no cloud semantic-grading or charging endpoint is added',()=>{
  const s=read('human-review.js');assert.doesNotMatch(s,/https?:\/\/|fetch\s*\(|Stripe|OpenAI|billing|apiKey/i);assert.match(s,/manual-criterion-review-v1/);
});
