'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('the homepage title is exactly Active recall',()=>{
  assert.match(read('app.js'),/<h1>Active recall<\/h1>/);
  assert.match(read('index.html'),/<title>Active recall<\/title>/);
  const manifest=JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name,'Active recall');
  assert.equal(manifest.short_name,'Active recall');
});

test('primary page titles describe their actual study function',()=>{
  const app=read('app.js');
  for(const title of ['Lecture notes','Questions and answers','Courses and materials',
    'Assessments','Study now','Study session','Session complete','Progress','Study calendar']){
    assert.ok(app.includes(`<h1>${title}</h1>`),`Missing literal page title: ${title}`);
  }
  for(const heading of ['Session length','Question drafts','Schedule fit','Study history (last 7 days)',
    'Suggested questions','Question priorities','Practice records','Compare study schedules',
    'Known and conditional reviews','Daily review plan']){
    assert.ok(app.includes(`>${heading}</h2>`),`Missing functional section title: ${heading}`);
  }
});

test('previous marketing and question-style headings are absent',()=>{
  const app=read('app.js');
  for(const phrase of ['One place to learn.','One queue to remember.','Every course, connected.',
    'Progress without guesswork.','Study what matters next.','Assessments shape your plan.',
    'What if I changed my study time?','Why are these questions prioritised?',
    'Your recorded study rhythm · past seven days','Question Studio']){
    assert.ok(!app.includes(phrase),`Old heading still present: ${phrase}`);
  }
  assert.match(read('health.html'),/<h1>Site diagnostics<\/h1>/);
});

test('important evidence, data, and safety labels remain visible',()=>{
  const app=read('app.js');
  for(const phrase of ['FSRS prediction history check','Data and privacy controls',
    'Question &amp; answer quality review','Questions needing correction',
    'Human-reviewed explanations &amp; problem-solving']){
    assert.ok(app.includes(phrase),`Required evidence or safety heading disappeared: ${phrase}`);
  }
});
