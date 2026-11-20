/* Real Chromium regression: a stale tab must never overwrite newer local study records.
   All data is fictional and isolated to ephemeral browser contexts. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

async function waitForBoot(page){
  await page.locator('.navbtn[data-page=courses]').waitFor();
  await page.evaluate(()=>window.ActiveRecallStorage.ready());
}
async function addCourse(page,name){
  await page.locator('.navbtn[data-page=courses]').click();
  await page.locator('#new-course').fill(name);
  await page.locator('form[data-form=add-course] button[type=submit]').click();
}
async function snapshot(page){
  return page.evaluate(async()=>{
    const S=window.ActiveRecallStorage;
    const saved=await S.load();
    return {names:saved.db.courses.map(c=>c.name),schema:saved.db.schemaVersion};
  });
}
async function revision(page){
  return page.evaluate(async()=>{
    const database=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('active-recall-web-local',1);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return new Promise((resolve,reject)=>{
      const request=database.transaction('snapshots','readonly').objectStore('snapshots').get('primary');
      request.onsuccess=()=>resolve(request.result?.revision);
      request.onerror=()=>reject(request.error);
    });
  });
}
async function staleTabs(browser,url){
  const context=await browser.newContext({viewport:{width:1180,height:820},acceptDownloads:true});
  const a=await context.newPage(),b=await context.newPage(),errors=[];
  a.on('pageerror',error=>errors.push('A: '+error.message));
  b.on('pageerror',error=>errors.push('B: '+error.message));
  try{
    await a.goto(url);await waitForBoot(a);
    await addCourse(a,'Fictional initial course');
    await a.evaluate(()=>window.ActiveRecallStorage.ready());
    await a.reload();await waitForBoot(a);
    await b.goto(url);await waitForBoot(b);
    const startingRevision=await revision(a);
    assert.equal(await revision(b),startingRevision);
    await addCourse(a,'Tab A committed');
    await a.evaluate(()=>window.ActiveRecallStorage.ready());
    assert.equal(await revision(a),startingRevision+1);

    await addCourse(b,'Tab B unsaved');
    await b.locator('[data-storage-warning][role=alert]').waitFor();
    assert.match(await b.locator('[data-storage-warning]').innerText(),/another tab saved a newer notebook/i);
    assert.equal(await b.evaluate(()=>window.ActiveRecallStorage.hasStorageConflict()),true);
    const staleWrite=await b.evaluate(async()=>{
      try{await window.ActiveRecallStorage.ready();return 'accepted';}
      catch(error){return error.code;}
    });
    assert.equal(staleWrite,'STALE_SNAPSHOT');
    assert.deepEqual((await snapshot(a)).names,['Fictional initial course','Tab A committed']);
    assert.equal(await revision(a),startingRevision+1,'A rejected stale save cannot advance revision');

    // The stale tab can export its unsaved in-memory work without overwriting A.
    await b.setViewportSize({width:390,height:844});
    await b.locator('[data-storage-warning] [data-page=insights]').click();
    const [download]=await Promise.all([
      b.waitForEvent('download'),b.locator('[data-action=export]').click()]);
    const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(backup.schemaVersion,5);
    assert.deepEqual(backup.courses.map(c=>c.name),['Fictional initial course','Tab B unsaved']);
    assert.deepEqual((await snapshot(a)).names,['Fictional initial course','Tab A committed']);

    await b.reload();await waitForBoot(b);
    assert.equal(await b.locator('[data-storage-warning]').count(),0);
    assert.deepEqual((await snapshot(b)).names,['Fictional initial course','Tab A committed']);
    await addCourse(b,'Tab B after reload');
    await b.evaluate(()=>window.ActiveRecallStorage.ready());
    assert.deepEqual((await snapshot(b)).names,
      ['Fictional initial course','Tab A committed','Tab B after reload']);
    assert.equal(await revision(b),startingRevision+2);

    // Conflict protection works in the other direction too.
    await addCourse(a,'Tab A now stale');
    await a.locator('[data-storage-warning]').waitFor();
    assert.deepEqual((await snapshot(b)).names,
      ['Fictional initial course','Tab A committed','Tab B after reload']);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}
async function oldRowAndQueue(browser,url){
  const context=await browser.newContext({viewport:{width:1180,height:820}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await waitForBoot(page);
    // Simulate a legitimate pre-v4.33 IndexedDB snapshot lacking revision metadata.
    await page.evaluate(async()=>{
      const S=window.ActiveRecallStorage;
      const saved=await S.load();
      const database=await new Promise((resolve,reject)=>{
        const request=indexedDB.open('active-recall-web-local',1);
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      });
      await new Promise((resolve,reject)=>{
        const tx=database.transaction('snapshots','readwrite');
        tx.objectStore('snapshots').put({id:'primary',payload:JSON.stringify(saved)});
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
    });
    assert.equal(await revision(page),undefined);
    await page.reload();await waitForBoot(page);
    assert.equal(await revision(page),undefined,'Reading old records never silently rewrites them');
    await addCourse(page,'Migrated old row');
    await page.evaluate(()=>window.ActiveRecallStorage.ready());
    assert.equal(await revision(page),1,'First v4.33 write starts revision at one');

    await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage;
      const saved=await S.load(),db=saved.db;
      C.addCourse(db,'First quick save');
      const first=S.save(db,null);
      C.addCourse(db,'Second quick save');
      const second=S.save(db,null);
      await Promise.all([first,second]);
    });
    assert.equal(await revision(page),3);
    assert.deepEqual((await snapshot(page)).names,
      ['Migrated old row','First quick save','Second quick save']);
    assert.equal(await page.evaluate(()=>window.ActiveRecallStorage.hasStorageConflict()),false);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}
async function unversionedWriter(browser,url){
  const context=await browser.newContext();
  const page=await context.newPage();
  try{
    await page.goto(url);await waitForBoot(page);
    // Force a pre-4.33 row, then load it as the expected baseline.
    await page.evaluate(async()=>{
      const S=window.ActiveRecallStorage,C=window.ActiveRecallCore;
      const saved=await S.load()||{db:C.initialDb(),activeSessionId:null};
      const database=await new Promise((resolve,reject)=>{
        const request=indexedDB.open('active-recall-web-local',1);
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      });
      await new Promise((resolve,reject)=>{
        const tx=database.transaction('snapshots','readwrite');
        tx.objectStore('snapshots').put({id:'primary',payload:JSON.stringify(saved)});
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
    });
    await page.reload();await waitForBoot(page);
    assert.equal(await revision(page),undefined);
    // Emulate an older tab overwriting the row without a revision increment.
    await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage;
      const saved=await S.load();
      C.addCourse(saved.db,'Older tab committed');
      const request=indexedDB.open('active-recall-web-local',1);
      const database=await new Promise((resolve,reject)=>{
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      });
      await new Promise((resolve,reject)=>{
        const tx=database.transaction('snapshots','readwrite');
        tx.objectStore('snapshots').put({id:'primary',payload:JSON.stringify(saved)});
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
    });
    await addCourse(page,'Stale newer tab');
    await page.locator('[data-storage-warning]').waitFor();
    assert.equal(await revision(page),undefined);
    // The revision is still zero, but the payload fingerprint prevents loss.
    const persisted=await page.evaluate(async()=>{
      const database=await new Promise((resolve,reject)=>{
        const request=indexedDB.open('active-recall-web-local',1);
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      });
      return new Promise((resolve,reject)=>{
        const request=database.transaction('snapshots','readonly').objectStore('snapshots').get('primary');
        request.onsuccess=()=>resolve(JSON.parse(request.result.payload).db.courses.map(c=>c.name));
        request.onerror=()=>reject(request.error);
      });
    });
    assert.deepEqual(persisted,['Older tab committed']);
  }finally{await context.close();}
}
async function staleDirectImport(browser,url){
  const context=await browser.newContext({acceptDownloads:true});
  const a=await context.newPage(),b=await context.newPage();
  try{
    await a.goto(url);await waitForBoot(a);
    await addCourse(a,'Original course');
    await a.evaluate(()=>window.ActiveRecallStorage.ready());
    await a.reload();await waitForBoot(a);
    await b.goto(url);await waitForBoot(b);
    await addCourse(a,'Newer tab change');
    await a.evaluate(()=>window.ActiveRecallStorage.ready());
    const backup=await b.evaluate(()=>{
      const C=window.ActiveRecallCore,db=C.initialDb();
      C.addCourse(db,'Attempted import');
      return JSON.stringify(db);
    });
    await b.locator('.navbtn[data-page=insights]').click();
    b.once('dialog',dialog=>dialog.accept());
    await b.locator('#import-file').setInputFiles({
      name:'fictional-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await b.locator('[data-storage-warning]').waitFor();
    assert.equal(await b.evaluate(()=>window.ActiveRecallStorage.hasStorageConflict()),true);
    assert.deepEqual((await snapshot(a)).names,['Original course','Newer tab change'],
      'An imported stale backup cannot replace another tab’s newer notebook');
  }finally{await context.close();}
}
async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>error?res.writeHead(404).end():res.writeHead(200,{
      'Content-Type':path.extname(file)==='.js'?'text/javascript':path.extname(file)==='.css'?'text/css':'text/html',
      'Cache-Control':'no-store'}).end(data));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const url='http://127.0.0.1:'+server.address().port+'/';
    await staleTabs(browser,url);
    await oldRowAndQueue(browser,url);
    await unversionedWriter(browser,url);
    await staleDirectImport(browser,url);
    process.stdout.write('PASS: real Chromium stale-tab protection, unsaved backup, direct import warning, reload, old-version writes, queued saves, and mobile.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
