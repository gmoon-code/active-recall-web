'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('the navigation and diagnostics show the literal simple [ar] logo',()=>{
  const app=read('app.js'),health=read('health.html'),css=read('moon-theme.css');
  assert.match(app,/<span class="mark" aria-hidden="true">\[ar\]<\/span>/);
  assert.doesNotMatch(app,/✳/);
  assert.match(health,/<header><a href="\.\/">\[ar\] active recall<\/a>/);
  assert.doesNotMatch(health,/✳/);
  assert.match(css,/\.mark \{[^}]*background: transparent;[^}]*color: #111;[^}]*font-family: "Times New Roman"/);
});

test('the favicon and installed icons use the matching wordmark',()=>{
  const svg=read('favicon.svg'),html=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest'));
  assert.match(svg,/<text\b[^>]*>\[ar\]<\/text>/);
  assert.match(svg,/fill="#ffffff"/);
  assert.match(svg,/fill="#111111"/);
  assert.doesNotMatch(svg,/<path|<circle/);
  assert.match(html,/href="\.\/favicon\.svg"/);
  for(const [name,size] of [['icon-192.png',192],['icon-512.png',512]]){
    const bytes=fs.readFileSync(name);
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${name} is a PNG`);
    assert.equal(bytes.readUInt32BE(16),size);
    assert.equal(bytes.readUInt32BE(20),size);
    assert.ok(manifest.icons.some(i=>i.src==='./'+name&&i.sizes===`${size}x${size}`));
  }
});
