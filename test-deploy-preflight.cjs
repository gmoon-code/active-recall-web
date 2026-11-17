'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('static GitHub Pages entry has relative scripts and CSS',()=>{
  const s=read('index.html');assert.match(s,/src="\.\/core\.js"/);assert.match(s,/src="\.\/human-review\.js"/);assert.match(s,/href="\.\/styles\.css"/);
});
test('offline worker is versioned and caches review module',()=>{
  const s=read('sw.js');assert.match(s,/active-recall-web-v4-1/);assert.match(s,/'\.\/human-review\.js'/);
});
test('the JS load order preserves rubric and local storage boot',()=>{
  const s=read('index.html');assert.ok(s.indexOf('human-review.js')<s.indexOf('core.js'));assert.ok(s.indexOf('core.js')<s.indexOf('storage.js'));assert.ok(s.indexOf('storage.js')<s.indexOf('app.js'));
});
test('the site keeps only local storage without remote account sign in',()=>{
  const s=read('storage.js'),html=read('index.html');assert.match(s,/indexedDB/);assert.doesNotMatch(html,/signin|oauth|payment|stripe|billing/i);
});
test('study scheduler still has original immutable policy identifiers',()=>{
  const s=read('core.js');assert.match(s,/transparent-interval-v1/);assert.match(s,/conservative-shadow-v1/);assert.match(s,/H\.validate\(input\)/);
});
test('no cloud semantic-grading or charging endpoint is added',()=>{
  const s=read('human-review.js');assert.doesNotMatch(s,/https?:\/\/|fetch\s*\(|Stripe|OpenAI|billing|apiKey/i);assert.match(s,/manual-criterion-review-v1/);
});
