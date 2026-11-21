'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const zlib=require('node:zlib');
const read=path=>fs.readFileSync(path,'utf8');

function topLeftAlpha(png){
  // At (0,0), every PNG row filter has zero neighbours, so the RGBA alpha
  // byte can be checked directly after inflating the first row.
  assert.equal(png[24],8,'Icons must be 8-bit PNGs');
  assert.equal(png[25],6,'Icons must preserve an RGBA transparency channel');
  let cursor=8;const compressed=[];
  while(cursor<png.length){
    const size=png.readUInt32BE(cursor),type=png.toString('ascii',cursor+4,cursor+8);
    if(type==='IDAT')compressed.push(png.subarray(cursor+8,cursor+8+size));
    cursor+=size+12;
    if(type==='IEND')break;
  }
  assert.ok(compressed.length,'PNG contains pixel data');
  return zlib.inflateSync(Buffer.concat(compressed))[4];
}

test('the navigation and diagnostics show the literal simple [ar] logo',()=>{
  const app=read('app.js'),health=read('health.html'),css=read('moon-theme.css');
  assert.match(app,/<span class="mark" aria-hidden="true">\[ar\]<\/span>/);
  assert.doesNotMatch(app,/✳/);
  assert.match(health,/<header><a href="\.\/">\[ar\] active recall<\/a>/);
  assert.doesNotMatch(health,/✳/);
  assert.match(css,/\.mark \{[^}]*background: transparent;[^}]*color: #111;[^}]*font-family: "Times New Roman"/);
});

test('the favicon and installed icons use the matching wordmark',()=>{
  const svg=read('favicon.svg'),html=read('index.html'),health=read('health.html');
  const sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
  assert.match(svg,/<text\b[^>]*>\[ar\]<\/text>/);
  assert.doesNotMatch(svg,/<rect\b|<path\b|<circle\b|background(?:-color)?\s*:/,'No solid tile behind [ar]');
  assert.match(svg,/fill: #111111/,'Dark ink for light tabs');
  assert.match(svg,/@media \(prefers-color-scheme: dark\)/,'Switch to light ink for dark tabs');
  assert.match(svg,/fill: #ffffff/,'Light ink is defined');
  assert.match(svg,/stroke: #111111/,'Dark outline for light glyphs on coloured tabs');
  assert.match(svg,/stroke: #ffffff/,'Light outline for dark glyphs on coloured tabs');
  assert.match(html,/href="\.\/favicon\.svg\?v=4-41"/,'Tab requests a fresh favicon URL');
  assert.match(health,/href="\.\/favicon\.svg\?v=4-41"/);
  assert.match(sw,/'\.\/favicon\.svg\?v=4-41'/,'Versioned favicon works offline');
  for(const [name,size] of [['icon-192.png',192],['icon-512.png',512]]){
    const bytes=fs.readFileSync(name);
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${name} is a PNG`);
    assert.equal(bytes.readUInt32BE(16),size);
    assert.equal(bytes.readUInt32BE(20),size);
    assert.equal(topLeftAlpha(bytes),0,`${name} must have a completely transparent corner`);
    assert.ok(manifest.icons.some(i=>i.src===`./${name}?v=4-41`&&i.sizes===`${size}x${size}`));
    assert.ok(sw.includes(`'./${name}?v=4-41'`),`${name} versioned icon works offline`);
  }
});
