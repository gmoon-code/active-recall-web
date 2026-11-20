'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('static GitHub Pages entry has relative scripts and CSS',()=>{
  const s=read('index.html');assert.match(s,/src="\.\/core\.js"/);assert.match(s,/src="\.\/qa-import\.js"/);assert.match(s,/src="\.\/human-review\.js"/);assert.match(s,/href="\.\/styles\.css"/);
});
test('app version label matches the published diagnostics',()=>{
  const app=read('app.js'),health=read('health.html');
  const appVersion=app.match(/<span class="tag">Blueprint (\d+\.\d+) · Free<\/span>/);
  const healthVersion=health.match(/<div class="tag">Blueprint (\d+\.\d+) · Free · GitHub Pages<\/div>/);
  assert.ok(appVersion&&healthVersion,'Both version labels must be present');
  assert.equal(appVersion[1],healthVersion[1],'App and diagnostics must advertise the same release');
});
test('offline worker is versioned and caches review module',()=>{
  const s=read('sw.js');assert.match(s,/active-recall-web-v4-32/);assert.doesNotMatch(s,/active-recall-web-v4-31/);assert.match(s,/'\.\/qa-import\.js'/);assert.match(s,/'\.\/study-rhythm\.js'/);assert.match(s,/'\.\/human-review\.js'/);assert.match(s,/'\.\/paired-review\.js'/);assert.match(s,/'\.\/paired-review-ui\.js'/);assert.match(s,/'\.\/review-packets\.js'/);assert.match(s,/reviewer-offline\.html/);assert.match(s,/reference-reviewer-offline\.html/);assert.match(s,/'\.\/reviewer-pilot\.js'/);assert.match(s,/'\.\/reviewer-pilot-ui\.js'/);assert.match(s,/'\.\/reviewer-training\.js'/);assert.match(s,/'\.\/reviewer-training-ui\.js'/);assert.match(s,/reviewer-training-offline\.html/);assert.match(s,/'\.\/reviewer-usability\.js'/);assert.match(s,/'\.\/reviewer-usability-ui\.js'/);assert.match(s,/reviewer-usability-offline\.html/);
  const diagnostics=read('health.html');
  assert.match(diagnostics,/Blueprint 4\.32/);assert.match(diagnostics,/active-recall-web-v4-32/);assert.doesNotMatch(diagnostics,/active-recall-web-v4-31/);assert.match(diagnostics,/qa-import\.js/);assert.match(diagnostics,/study-rhythm\.js/);assert.match(diagnostics,/fsrs-shadow\.js/);assert.match(diagnostics,/fsrs-7-shadow-vendor\.js/);
  assert.match(diagnostics,/reviewer-offline\.html/);assert.match(diagnostics,/reference-reviewer-offline\.html/);assert.match(diagnostics,/reviewer-pilot\.js/);assert.match(diagnostics,/reviewer-pilot-ui\.js/);assert.match(diagnostics,/reviewer-training\.js/);assert.match(diagnostics,/reviewer-training-ui\.js/);assert.match(diagnostics,/reviewer-training-offline\.html/);assert.match(diagnostics,/reviewer-usability\.js/);assert.match(diagnostics,/reviewer-usability-ui\.js/);assert.match(diagnostics,/reviewer-usability-offline\.html/);
  assert.doesNotMatch(diagnostics,/active-recall-web-v2-8/);
});
test('offline cache manifest contains every boot asset and only real local files',()=>{
  const source=read('sw.js').match(/^const STATIC_FILES = \[(.+)\];$/m);
  assert.ok(source,'Offline asset list must be explicit and auditable');
  const files=[...source[1].matchAll(/'(\.\/[^']*)'/g)].map(match=>match[1]);
  assert.ok(files.includes('./')&&files.includes('./index.html'));
  assert.equal(new Set(files).size,files.length,'Duplicate cache paths are ambiguous');
  for(const file of files){
    if(file==='./')continue;
    assert.ok(/^\.\/[\w./-]+$/.test(file)&&!file.includes('..'),'Cache paths must remain within the app');
    assert.ok(fs.statSync(file).isFile(),`Missing offline cache asset: ${file}`);
  }
  for(const [,asset] of read('index.html').matchAll(/(?:src|href)="(\.\/[^" ]+)"/g)){
    assert.ok(files.includes(asset),`Site cannot boot offline without ${asset}`);
  }
});
test('the JS load order preserves rubric and local storage boot',()=>{
  const s=read('index.html');assert.ok(s.indexOf('human-review.js')<s.indexOf('paired-review.js'));assert.ok(s.indexOf('paired-review.js')<s.indexOf('core.js'));assert.ok(s.indexOf('paired-review-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('review-packets.js')<s.indexOf('core.js'));assert.ok(s.indexOf('review-packets-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('reference-first.js')<s.indexOf('core.js'));assert.ok(s.indexOf('reference-first-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('reviewer-pilot.js')<s.indexOf('core.js'));assert.ok(s.indexOf('reviewer-pilot-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('reviewer-training.js')<s.indexOf('core.js'));assert.ok(s.indexOf('reviewer-training-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('reviewer-usability.js')<s.indexOf('core.js'));assert.ok(s.indexOf('reviewer-usability-ui.js')<s.indexOf('app.js'));assert.ok(s.indexOf('core.js')<s.indexOf('storage.js'));assert.ok(s.indexOf('storage.js')<s.indexOf('app.js'));
});
test('the optional FSRS shadow engine is local, cached and loaded before the app',()=>{
  const s=read('index.html'),w=read('sw.js');
  assert.ok(s.indexOf('vendor/fsrs-7-shadow-vendor.js')<s.indexOf('fsrs-shadow.js'));
  assert.ok(s.indexOf('fsrs-shadow.js')<s.indexOf('app.js'));
  assert.match(w,/'\.\/vendor\/fsrs-7-shadow-vendor\.js'/);
  assert.match(w,/'\.\/fsrs-shadow\.js'/);
  assert.doesNotMatch(read('fsrs-shadow.js'),/fetch\s*\(|XMLHttpRequest|apiKey|Stripe/);
  assert.match(read('vendor/LICENSE-ts-fsrs'),/MIT License/);
  assert.match(read('vendor/LICENSE-srs-kit'),/BSD 3-Clause License/);
  assert.doesNotMatch(read('vendor/fsrs-7-shadow-vendor.js'),/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
test('the site keeps only local storage without remote account sign in',()=>{
  const s=read('storage.js'),html=read('index.html');assert.match(s,/indexedDB/);assert.doesNotMatch(html,/(?:src|href)="https?:|\/login|oauth|stripe/i);
});
test('study scheduler still has original immutable policy identifiers',()=>{
  const s=read('core.js');assert.match(s,/transparent-interval-v1/);assert.match(s,/conservative-shadow-v1/);assert.match(s,/H\.validate\(input\)/);assert.match(s,/P\.validate\(input\)/);assert.match(s,/R\.validate\(input\)/);assert.match(s,/F\.validate\(input\)/);assert.match(s,/Pilot\.validate\(input\)/);assert.match(s,/Pilot\.observe\(db,attempt\)/);assert.match(s,/Training\.validate\(input\)/);assert.match(s,/Usability\.validate\(input\)/);
});
test('no cloud semantic-grading or charging endpoint is added',()=>{
  const s=read('human-review.js');assert.doesNotMatch(s,/https?:\/\/|fetch\s*\(|Stripe|OpenAI|billing|apiKey/i);assert.match(s,/manual-criterion-review-v1/);const p=read('reviewer-pilot.js');assert.doesNotMatch(p,/fetch\s*\(|XMLHttpRequest|https?:\/\/|Stripe|OpenAI|billing|apiKey/i);const t=read('reviewer-training.js');assert.doesNotMatch(t,/fetch\s*\(|XMLHttpRequest|https?:\/\/|Stripe|OpenAI|billing|apiKey/i);const u=read('reviewer-usability.js');assert.doesNotMatch(u,/fetch\s*\(|XMLHttpRequest|https?:\/\/|Stripe|OpenAI|billing|apiKey/i);
});
