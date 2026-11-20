/* Desktop/mobile regression of Moon design without altering learner records. */
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};

async function main(){
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const full=path.resolve(root,name);
    if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(full,(err,data)=>{
      if(err){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':types[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1280,height:850}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('[data-action=demo]').waitFor();
    async function inspect(expectedPage,expectedAccent){
      const theme=await page.evaluate(()=>{
        const root=document.querySelector('.app'),heading=document.querySelector('.hero h1, .pagehead h1');
        const css=getComputedStyle(root),body=getComputedStyle(document.body);
        return {accent:css.getPropertyValue('--moon-accent').trim(),name:root.getAttribute('data-moon-accent'),
          background:body.backgroundColor,font:body.fontFamily,heading:heading?getComputedStyle(heading).backgroundImage:'',
          overflow:document.documentElement.scrollWidth-innerWidth,
          cardRadius:document.querySelector('.card')?getComputedStyle(document.querySelector('.card')).borderTopLeftRadius:null,
          orbs:[...document.querySelectorAll('.hero .orb,.hero .orb2')].map(el=>getComputedStyle(el).display)};
      });
      assert.equal(theme.name,expectedPage);
      assert.equal(theme.accent,expectedAccent);
      assert.equal(theme.background,'rgb(255, 255, 255)');
      assert.match(theme.font,/Times New Roman/);
      assert.ok(theme.heading.includes('linear-gradient'),'Headings retain highlighter lines');
      assert.ok(theme.overflow<=2,`No horizontal overflow (${theme.overflow}px)`);
      if(theme.cardRadius)assert.equal(theme.cardRadius,'4px');
      assert.ok(theme.orbs.every(value=>value==='none'),'Decorative orbs are removed');
    }
    await inspect('yellow','#f5f566');
    const colors={questions:['green','#66f566'],courses:['blue','#66f0f0'],forecast:['magenta','#f066f0'],home:['yellow','#f5f566']};
    const before=await page.evaluate(async()=>{const S=window.ActiveRecallStorage;await S.ready();return JSON.stringify((await S.load()).db);});
    for(const [route,[color,accent]] of Object.entries(colors)){
      await page.locator(`.navbtn[data-page="${route}"]`).click();
      await inspect(color,accent);
    }
    const after=await page.evaluate(async()=>{const S=window.ActiveRecallStorage;await S.ready();return JSON.stringify((await S.load()).db);});
    assert.equal(after,before,'Visual navigation does not write study data');
    for(const width of [390,360]){
      await page.setViewportSize({width,height:800});
      await inspect('yellow','#f5f566');
      const buttons=await page.locator('.navbtn').count();
      assert.equal(buttons,8,'Mobile navigation keeps all destinations');
      await page.locator('.navbtn[data-page=study]').click();
      await inspect('green','#66f566');
      await page.locator('.navbtn[data-page=home]').click();
    }
    await page.reload();await page.locator('.navbtn[data-page=home]').waitFor();
    await inspect('yellow','#f5f566');
    assert.deepEqual(errors,[],'No browser errors during theme navigation');
    process.stdout.write('PASS: Moon typography, color order, desktops, mobile navigation, persistence, and unchanged study data.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
