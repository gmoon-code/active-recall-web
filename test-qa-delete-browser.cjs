/* Real-browser deletion, bulk selection, cancellation, restore, mobile sizing. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1100,height:860}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('.navbtn[data-page=courses]').click();
    await page.locator('[data-form=add-course] [name=name]').fill('AP Biology');
    await page.locator('[data-form=add-course] [type=submit]').click();
    await page.locator('.navbtn[data-page=questions]').click();
    await page.locator('.qa-bulk summary').click();
    await page.locator('#qa-import-file').setInputFiles({name:'lecture-list.csv',mimeType:'text/csv',buffer:Buffer.from('Question,Answer,Lecture\n"What is ATP?","A cellular energy carrier.",Lecture 1\n"What is NADH?","An electron carrier.",Lecture 1\n"What is PSII?","A photosynthetic protein complex.",Lecture 2')});
    await page.locator('[data-action=qa-confirm-import]').click();
    await page.waitForFunction(async()=>{const {db}=await window.ActiveRecallStorage.load();return db?.requirements.length===3;});
    assert.equal(await page.locator('.qa-item').count(),3);

    // A cancelled confirmation must never delete anything.
    page.once('dialog',dialog=>dialog.dismiss());
    await page.locator('.qa-item').filter({hasText:'What is ATP?'}).locator('[data-action=qa-delete]').click();
    assert.equal(await page.locator('.qa-item').count(),3);

    page.once('dialog',dialog=>dialog.accept());
    await page.locator('.qa-item').filter({hasText:'What is ATP?'}).locator('[data-action=qa-delete]').click();
    await page.waitForFunction(async()=>{const {db}=await window.ActiveRecallStorage.load();return db.requirements.filter(r=>r.active).length===2;});
    assert.equal(await page.locator('.qa-item').count(),2);
    assert.match(await page.locator('.qa-deleted summary').innerText(),/Deleted questions \(1\)/);

    // Restoration returns the question and keeps its original identity.
    await page.locator('.qa-deleted summary').click();
    await page.locator('[data-action=qa-restore]').click();
    await page.waitForFunction(async()=>{const {db}=await window.ActiveRecallStorage.load();return db.requirements.filter(r=>r.active).length===3;});

    // Filter to one lecture, then delete ONLY the two visible rows as a batch.
    await page.locator('#qa-filter').selectOption({label:'Lecture 1 · no notes'});
    assert.equal(await page.locator('.qa-item').count(),2);
    await page.locator('[data-action=qa-toggle-select]').click();
    await page.locator('[data-action=qa-select-all]').click();
    assert.equal(await page.locator('input[data-question-select]:checked').count(),2);
    await page.setViewportSize({width:390,height:844});
    const bar=await page.locator('.qa-delete-bar').boundingBox();
    assert.ok(bar&&bar.width<=390,'Bulk delete controls fit on a mobile screen.');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-action=qa-delete-selected]').click();
    await page.waitForFunction(async()=>{const {db}=await window.ActiveRecallStorage.load();return db.requirements.filter(r=>r.active).length===1;});
    const state=await page.evaluate(async()=>{const {db}=await window.ActiveRecallStorage.load();return {active:db.requirements.filter(r=>r.active).map(r=>r.question),archived:db.requirements.filter(r=>!r.active).length,candidates:window.ActiveRecallCore.eligibleCandidates(db).length};});
    assert.deepEqual(state.active,['What is PSII?']);
    assert.equal(state.archived,2);
    assert.equal(state.candidates,1);
    assert.match(await page.locator('.qa-deleted summary').innerText(),/Deleted questions \(2\)/);
    const deletedRect=await page.locator('.qa-deleted').boundingBox();
    assert.ok(deletedRect&&deletedRect.width<=390,'Restoration controls fit on mobile.');
    await page.locator('.qa-deleted summary').click();
    await page.locator('[data-action=qa-restore]').first().click();
    await page.waitForFunction(async()=>{const {db}=await window.ActiveRecallStorage.load();return db.requirements.filter(r=>r.active).length===2;});
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: individual and bulk delete, cancellation, lecture filter boundaries, restoration, queue removal and mobile layout.\n');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
