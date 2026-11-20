/* Browser regression: bundled FSRS-7 interval/calendar shadow cannot change real due dates. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');

async function main(){
  const root=process.cwd();
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const full=path.resolve(root,name);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(full,(err,data)=>{
      if(err){res.writeHead(404).end();return;}
      const ext=path.extname(full);
      res.writeHead(200,{'Content-Type':ext==='.js'?'text/javascript':ext==='.css'?'text/css':'text/html','Cache-Control':'no-store'}).end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1180,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-action=demo]').waitFor();
    const before=await page.evaluate(async()=>{
      const C=window.ActiveRecallCore,S=window.ActiveRecallStorage,db=C.initialDb();
      const course=C.addCourse(db,'Chemistry');
      const req=C.addRequirement(db,{courseId:course.id,kind:'recall',question:'What drives ATP synthesis?',answer:'A proton gradient.'});
      const target=C.getTarget(db,req.id),activity=C.getActivities(db,req.id,target.id)[0];
      const started=Date.UTC(2026,10,1,12);
      for(const day of [0,3,9])C.recordAttempt(db,{requirementId:req.id,targetId:target.id,
        activityId:activity.id,response:'A proton gradient.',rating:'good',now:new Date(started+day*86400000)});
      await S.save(db,null);await S.ready();
      return JSON.stringify({memory:db.memory,attempts:db.attempts});
    });
    await page.reload();
    await page.locator('.navbtn[data-page=insights]').click();
    const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'FSRS-7 interval comparison'})});
    await panel.getByRole('button',{name:'Compare intervals and calendar with FSRS-7'}).click();
    await panel.getByText('Comparable targets').waitFor();
    const words=await panel.innerText();
    assert.match(words,/1 examined/);
    assert.match(words,/Median interval: current/);
    assert.match(words,/Calendar opportunity comparison/);
    assert.match(words,/Current · first-pass slots/);
    assert.match(words,/Hybrid · first-pass slots/);
    assert.match(words,/partial hybrid scenario, not a full FSRS rollout/);
    assert.match(words,/The existing calendar and saved review dates are never modified/);
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      await panel.scrollIntoViewIfNeeded();
      const box=await panel.boundingBox();
      assert.ok(box&&box.width<=width+1,'The comparison must fit '+width+'px screens');
      const metrics=await page.evaluate(()=>({client:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth}));
      assert.ok(metrics.scroll<=metrics.client,
        'No page-wide horizontal overflow at '+width+'px: '+JSON.stringify(metrics));
      const navRows=await page.locator('.navbtn').evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().top)));
      assert.equal(navRows.length,8);
      assert.ok(navRows.slice(0,4).every(top=>top===navRows[0]));
      assert.ok(navRows.slice(4).every(top=>top===navRows[4]));
      assert.ok(navRows[4]>navRows[0],'All eight navigation labels must fit two mobile rows');
    }
    const saved=await page.evaluate(async()=>{
      await window.ActiveRecallStorage.ready();
      const {db}=await window.ActiveRecallStorage.load();
      return JSON.stringify({memory:db.memory,attempts:db.attempts});
    });
    assert.equal(saved,before,'FSRS preview must not persist a changed review date or attempt');
    assert.deepEqual(errors,[]);
    process.stdout.write('PASS: local FSRS shadow, unchanged memory, no page errors, responsive layout.\n');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
