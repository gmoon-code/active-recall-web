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
        const subheading=document.querySelector('.card-title h2, .section-title h2, .qa-list-head h2');
        const css=getComputedStyle(root),body=getComputedStyle(document.body);
        return {accent:css.getPropertyValue('--moon-accent').trim(),name:root.getAttribute('data-moon-accent'),
          background:body.backgroundColor,font:body.fontFamily,
          headingColor:heading?getComputedStyle(heading).backgroundColor:'',
          headingImage:heading?getComputedStyle(heading).backgroundImage:'',
          headingDisplay:heading?getComputedStyle(heading).display:'',
          headingRects:heading?[...heading.getClientRects()].map(rect=>rect.height):[],
          headingFontSize:heading?parseFloat(getComputedStyle(heading).fontSize):0,
          subheadingColor:subheading?getComputedStyle(subheading).backgroundColor:null,
          overflow:document.documentElement.scrollWidth-innerWidth,
          cardRadius:document.querySelector('.card')?getComputedStyle(document.querySelector('.card')).borderTopLeftRadius:null,
          decorativeChrome:document.querySelectorAll('.footer,.topline,.sidefoot').length,
          visibleCaptions:[...document.querySelectorAll('.hero .eyebrow,.hero > div > p,.pagehead .eyebrow,.pagehead > div > p,.modalhead .eyebrow,.reqrow .eyebrow')].filter(el=>getComputedStyle(el).display!=='none').length,
          orbs:[...document.querySelectorAll('.hero .orb,.hero .orb2')].map(el=>getComputedStyle(el).display)};
      });
      assert.equal(theme.name,expectedPage);
      assert.equal(theme.accent,expectedAccent);
      assert.equal(theme.background,'rgb(255, 255, 255)');
      assert.match(theme.font,/Times New Roman/);
      const hex=expectedAccent.slice(1);
      const expectedRgb=`rgb(${[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;
      assert.equal(theme.headingColor,expectedRgb,'Page title has a full-height highlight background');
      assert.equal(theme.headingImage,'none','Page title has no partial-height stripe');
      assert.equal(theme.headingDisplay,'inline','Wrapped page titles highlight only their text');
      assert.ok(theme.headingRects.length>0&&theme.headingRects.every(h=>h>=theme.headingFontSize*.85),'Highlighted line fragments cover the letters');
      if(theme.subheadingColor)assert.equal(theme.subheadingColor,expectedRgb,'Section titles match the page highlight');
      assert.ok(theme.overflow<=2,`No horizontal overflow (${theme.overflow}px)`);
      if(theme.cardRadius)assert.equal(theme.cardRadius,'4px');
      assert.ok(theme.orbs.every(value=>value==='none'),'Decorative orbs are removed');
      assert.equal(theme.decorativeChrome,0,'No repetitive footer, fake profile header or sidebar slogans');
      assert.equal(theme.visibleCaptions,0,'Generic small subtitles do not distract from page titles');
    }
    await inspect('yellow','#f5f566');
    assert.equal(await page.locator('.empty > p').count(),0,'First-course empty state has no redundant explanatory subtitle');
    await page.locator('.navbtn[data-page=study]').click();
    assert.equal(await page.locator('.sessionpanel > .card > p.small.muted').count(),0,'Study setup has no marketing-style explainer after the Start button');
    await page.locator('.navbtn[data-page=home]').click();
    assert.equal((await page.locator('.brand .mark').innerText()).trim(),'[ar]');
    assert.equal(await page.locator('.brand .mark').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','The [ar] wordmark has no filled square');
    async function faviconPixels(colorScheme){
      await page.emulateMedia({colorScheme});
      return page.evaluate(async scheme=>{
        const icon=new Image();
        icon.src=`./favicon.svg?v=4-41&browser-test=${scheme}`;
        await icon.decode();
        const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
        const ctx=canvas.getContext('2d');ctx.drawImage(icon,0,0,64,64);
        return Array.from(ctx.getImageData(0,0,64,64).data);
      },colorScheme);
    }
    const lightIcon=await faviconPixels('light'),darkIcon=await faviconPixels('dark');
    assert.equal(lightIcon[3],0,'Light-theme favicon has transparent corners');
    assert.equal(darkIcon[3],0,'Dark-theme favicon has transparent corners');
    let switchedPixels=0;
    for(let i=0;i<lightIcon.length;i+=4){
      if(lightIcon[i+3]>240&&darkIcon[i+3]>240&&lightIcon[i]<75&&darkIcon[i]>180)switchedPixels++;
    }
    assert.ok(switchedPixels>30,'Browser actually switches favicon ink from dark to light with the system theme');
    await page.emulateMedia({colorScheme:'light'});
    assert.equal((await page.locator('.hero h1').innerText()).trim(),'Active recall');
    const colors={questions:['green','#66f566','Questions and answers'],courses:['blue','#66f0f0','Courses and materials'],forecast:['magenta','#f066f0','Study calendar'],insights:['magenta','#f066f0','Progress'],home:['yellow','#f5f566','Active recall']};
    const before=await page.evaluate(async()=>{const S=window.ActiveRecallStorage;await S.ready();return JSON.stringify((await S.load())?.db??null);});
    for(const [route,[color,accent,heading]] of Object.entries(colors)){
      await page.locator(`.navbtn[data-page="${route}"]`).click();
      await inspect(color,accent);
      assert.equal((await page.locator('.hero h1, .pagehead h1').first().innerText()).trim(),heading,`${route} page uses a clear heading`);
    }
    await page.locator('.navbtn[data-page=forecast]').click();
    assert.equal(await page.locator('.help-tip').count(),3,'Only three meaningful calendar concepts need question-mark help');
    assert.equal(await page.getByText('Read-only workload check',{exact:false}).count(),0,'Routine read-only caption was removed');
    const fitHelp=page.locator('.rhythm-card .help-tip').first();
    const fitBubble=fitHelp.locator('.help-tip-bubble');
    const helpSizing=await fitHelp.locator('summary').evaluate(el=>{
      const hit=el.getBoundingClientRect(),ring=getComputedStyle(el,'::before');
      return {hitWidth:hit.width,hitHeight:hit.height,ringWidth:parseFloat(ring.width),ringHeight:parseFloat(ring.height),ringBorder:ring.borderTopWidth};
    });
    assert.ok(helpSizing.ringWidth<=14&&helpSizing.ringHeight<=14,'The actual question-mark icon is discreet and smaller than the heading text');
    assert.ok(helpSizing.hitWidth>=28&&helpSizing.hitHeight>=28,'The tiny icon retains a usable touch target');
    assert.equal(helpSizing.ringBorder,'1px','The icon has a fine outline rather than a heavy circle');
    assert.equal(await fitBubble.isVisible(),false,'Help stays hidden until requested');
    await fitHelp.locator('summary').hover();
    assert.equal(await fitBubble.isVisible(),true,'Mouse hover opens a brief help bubble');
    await page.mouse.move(0,0);
    assert.equal(await fitBubble.isVisible(),false,'The bubble closes on mouse leave');
    await fitHelp.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await fitHelp.getAttribute('open'),'','Keyboard activation opens a native details disclosure');
    assert.equal(await fitBubble.isVisible(),true);
    await page.keyboard.press('Enter');
    assert.equal(await fitHelp.getAttribute('open'),null,'Keyboard activation can close the disclosure');
    const knownHelp=page.locator('.help-tip').filter({has:page.locator('summary[aria-label="Known reviews versus conditional revisits"]')});
    assert.equal(await knownHelp.count(),1,'Conditional-review explanation is accessible when needed');
    assert.equal(await page.locator('.card .note').filter({hasText:'Research limitation'}).count(),1,'Research caveat remains visible, not hidden in a tooltip');
    const after=await page.evaluate(async()=>{const S=window.ActiveRecallStorage;await S.ready();return JSON.stringify((await S.load())?.db??null);});
    assert.equal(after,before,'Visual navigation does not write study data');
    await page.locator('.navbtn[data-page=insights]').click();
    assert.equal(await page.locator('.utility-link a[href="./health.html"]').innerText(),'Site diagnostics','Practical diagnostic link remains accessible in Progress');
    const rhythmHighlight=page.locator('.card-title h2').filter({hasText:'Study history (last 7 days)'});
    assert.equal(await rhythmHighlight.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(240, 102, 240)','Recorded study rhythm title has solid magenta highlighting');
    await page.locator('.navbtn[data-page=home]').click();
    for(const width of [390,360]){
      await page.setViewportSize({width,height:800});
      await inspect('yellow','#f5f566');
      const buttons=await page.locator('.navbtn').count();
      assert.equal(buttons,8,'Mobile navigation keeps all destinations');
      await page.locator('.navbtn[data-page=forecast]').click();
      await page.locator('.rhythm-card .help-tip summary').first().click();
      const bubbleBounds=await page.locator('.rhythm-card .help-tip-bubble').first().evaluate(el=>{
        const r=el.getBoundingClientRect();return {left:r.left,right:r.right,overflow:document.documentElement.scrollWidth-innerWidth};
      });
      assert.ok(bubbleBounds.left>=0&&bubbleBounds.right<=width,`Help bubble fits ${width}px screen`);
      assert.ok(bubbleBounds.overflow<=2,'Visible mobile help bubble does not cause horizontal scrolling');
      await page.locator('.navbtn[data-page=study]').click();
      await inspect('green','#66f566');
      await page.locator('.navbtn[data-page=home]').click();
    }
    await page.reload();await page.locator('.navbtn[data-page=home]').waitFor();
    await inspect('yellow','#f5f566');
    assert.deepEqual(errors,[],'No browser errors during theme navigation');
    process.stdout.write('PASS: full-height Moon highlighters, wrapped headings, uncluttered subtitles, mobile navigation, persistence, and unchanged study data.\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
