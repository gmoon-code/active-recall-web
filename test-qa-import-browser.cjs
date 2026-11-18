/* Real browser: preview and confirm Q&A file imports without external uploads. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1180,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('.navbtn[data-page=courses]').click();
    await page.locator('[data-form=add-course] [name=name]').fill('AP Biology');
    await page.locator('[data-form=add-course] [type=submit]').click();
    await page.waitForFunction(async()=>{const x=await window.ActiveRecallStorage.load();return x?.db?.courses.length===1;});
    await page.locator('.navbtn[data-page=questions]').click();
    await page.locator('.qa-bulk summary').click();
    const csv='Question,Answer,Lecture,Type,Course\n"How do proton gradients store energy?","An electrochemical difference, across the membrane.",Lecture 8,Explain,AP Biology\n"What is ATP synthase?","An enzyme that makes ATP.",Lecture 8,Recall,AP Biology';
    await page.locator('#qa-import-file').setInputFiles({name:'lecture-8.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
    const preview=page.locator('.qa-import-preview');await preview.waitFor();
    assert.match(await preview.innerText(),/Ready to import 2 question/);
    assert.match(await preview.innerText(),/electrochemical difference, across the membrane/);
    const before=await page.evaluate(async()=>{const saved=await window.ActiveRecallStorage.load();return saved.db.requirements.length;});
    assert.equal(before,0,'Uploading and previewing must never silently save questions.');
    await page.setViewportSize({width:390,height:844});
    const previewRect=await preview.boundingBox();assert.ok(previewRect&&previewRect.width<=390,'Import preview fits mobile width.');
    await preview.locator('[data-action=qa-confirm-import]').click();
    await page.waitForFunction(async()=>{const saved=await window.ActiveRecallStorage.load();return saved?.db?.requirements.length===2;});
    assert.equal(await page.locator('.qa-item').count(),2);
    let saved=await page.evaluate(async()=>{const {db}=await window.ActiveRecallStorage.load();return db.requirements.map(r=>({q:r.question,lecture:r.lectureTitle,kind:r.kind,source:r.sourceId}));});
    assert.equal(saved[0].lecture,'Lecture 8');assert.equal(saved[0].kind,'explain');assert.equal(saved[1].kind,'recall');
    assert.ok(saved.every(r=>!r.source));

    // A second file containing a duplicate of this lecture's question must
    // reject the entire import without changing the two saved requirements.
    await page.locator('.qa-bulk summary').click();
    await page.locator('#qa-import-file').setInputFiles({name:'duplicate.csv',mimeType:'text/csv',buffer:Buffer.from('Question,Answer,Lecture\nWhat is NADH?,A carrier.,Lecture 8\nWhat is ATP synthase?,An enzyme.,Lecture 8')});
    await page.waitForFunction(()=>document.querySelector('.toast.error')?.textContent.includes('Repeated question'));
    assert.match(await page.locator('.toast.error').innerText(),/Repeated question/);
    assert.equal(await page.locator('.qa-import-preview').count(),0);
    assert.equal((await page.evaluate(async()=>{const {db}=await window.ActiveRecallStorage.load();return db.requirements.length;})),2);

    // File import also supports a Q:/A: text file with no notes uploaded.
    await page.locator('#qa-lecture-title').fill('Lecture 9 — Photosynthesis');
    await page.locator('#qa-import-file').setInputFiles({name:'lecture-9.txt',mimeType:'text/plain',buffer:Buffer.from('Q: What does PSII absorb?\nA: Light energy.\n\nQ: What molecule donates electrons to PSII?\nA: Water.')});
    await page.locator('.qa-import-preview').waitFor();
    assert.match(await page.locator('.qa-import-preview').innerText(),/Ready to import 2 question/);
    await page.locator('[data-action=qa-confirm-import]').click();
    await page.waitForFunction(async()=>{const {db}=await window.ActiveRecallStorage.load();return db.requirements.length===4;});
    saved=await page.evaluate(async()=>{const {db}=await window.ActiveRecallStorage.load();return {questions:db.requirements.length,lectures:db.requirements.map(r=>r.lectureTitle),eligible:window.ActiveRecallCore.eligibleCandidates(db).length};});
    assert.equal(saved.questions,4);assert.equal(saved.eligible,4);
    assert.deepEqual(saved.lectures.slice(2),['Lecture 9 — Photosynthesis','Lecture 9 — Photosynthesis']);
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: local CSV and TXT uploads, full preview, no premature writes, duplicate rejection, lecture labels, desktop/mobile and unified queue.\n');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
