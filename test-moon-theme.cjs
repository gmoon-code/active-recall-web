'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('Moon color families match the personal editorial palette in order',()=>{
  const css=read('moon-theme.css');
  const swatches=[
    ['yellow','#f5f566'],['green','#66f566'],['blue','#66f0f0'],['magenta','#f066f0']
  ];
  const positions=swatches.map(([name,value])=>{
    const declaration=`--section-${name}: ${value};`;
    assert.ok(css.includes(declaration),`Expected original Moon swatch: ${declaration}`);
    return css.indexOf(declaration);
  });
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions,'Highlighter families retain Moon sequence');
  assert.match(css,/font-family: "Times New Roman", Times, serif/);
  assert.match(css,/--moon-paper: #ffffff/);
  assert.match(css,/--moon-ink: #111111/);
  assert.match(css,/--moon-rule: #d8d8d8/);
  assert.match(css,/--radius: 4px/);
  assert.match(css,/--shadow: none/);
  assert.match(css,/\.hero \.orb, \.hero \.orb2 \{ display: none; \}/);
  assert.doesNotMatch(css,/@import|url\(\s*['"]?https?:|@font-face/i,'Theme loads no external resources');
});

test('Each existing app page receives its intentional Moon accent without changing study data',()=>{
  const app=read('app.js');
  for(const [page,color] of Object.entries({home:'yellow',capture:'yellow',questions:'green',study:'green',guided:'green',courses:'blue',assessments:'blue',forecast:'magenta',insights:'magenta'})){
    assert.match(app,new RegExp(`${page}:'${color}'`),`Theme accent missing for ${page}`);
  }
  assert.match(app,/data-moon-accent="\$\{moonPageAccent\[page\]\|\|'yellow'\}"/);
  assert.match(read('sw.js'),/'\.\/moon-theme\.css'/);
  assert.ok(read('index.html').indexOf('href="./styles.css"')<read('index.html').indexOf('href="./moon-theme.css"'));
  assert.match(read('manifest.webmanifest'),/"theme_color"\s*:\s*"#ffffff"/);
  assert.match(read('health.html'),/moon-theme\.css/);
});

test('highlighted heading backgrounds cover full text height, not a narrow stripe',()=>{
  const css=read('moon-theme.css'),health=read('health.html');
  assert.match(css,/\.pagehead h1, \.hero h1,[\s\S]*?background-color: var\(--moon-accent\);/);
  assert.match(css,/background-image: none;/);
  assert.match(css,/\.hero h1, \.pagehead h1 \{ display: inline;/);
  assert.match(css,/box-decoration-break: clone;/);
  assert.doesNotMatch(css,/transparent 63%|var\(--moon-accent\) 84%/);
  assert.match(health,/background-color:var\(--moon-magenta\)/);
  assert.doesNotMatch(health,/linear-gradient\(transparent 63%/);
});
