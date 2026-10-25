const { chromium } = require('playwright-core');
// usage: node test.js URL [customStepsModule]
(async () => {
  const url = process.argv[2], custom = process.argv[3];
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, permissions:['camera','microphone','geolocation'], geolocation:{latitude:35.03,longitude:-85.27} });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text().slice(0,200)); });
  p.on('pageerror', e => errs.push('pageerror: '+String(e).slice(0,200)));
  p.on('response', r => { if (r.status()>=400) errs.push('HTTP '+r.status()+' '+r.url().slice(0,120)); });
  if (/localhost/.test(url)) await p.route(/pollinations\.ai/, async rt => { if (rt.request().method()==='OPTIONS') return rt.fulfill({status:204, headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}}); const res = await rt.fetch({ headers: { ...rt.request().headers(), origin:'https://walterhendersonjr41-blip.github.io', referer:'https://walterhendersonjr41-blip.github.io/x/' } }); await rt.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin':'*' } }); });
  const r = await p.goto(url, {waitUntil:'networkidle', timeout:45000}); const out = {url, status:r.status()};
  await p.waitForTimeout(1000);
  out.pwa = await p.evaluate(async () => ({ manifest: !!document.querySelector('link[rel=manifest]'), sw: !!(await navigator.serviceWorker?.getRegistration?.()) }));
  if (await p.$('#aih-fab')) {
    await p.click('#aih-fab'); await p.click('#aih .chips button');
    await p.waitForFunction(() => { const m=[...document.querySelectorAll('#aih .m.a')].pop(); return m && !/^Thinking/.test(m.textContent); }, null, {timeout:90000}).catch(()=>{});
    out.ai = await p.evaluate(() => [...document.querySelectorAll('#aih .m.a')].pop().textContent.slice(0,220));
    await p.screenshot({ path: 'shots/t-'+url.replace(/\W+/g,'_').slice(-40)+'-ai.png' });
    await p.click('#aih .x');
  }
  if (custom) out.custom = await require(require('path').resolve(custom))(p);
  await p.screenshot({ path: 'shots/t-'+url.replace(/\W+/g,'_').slice(-40)+'.png', fullPage:false });
  out.errs=[...new Set(errs)].filter(e=>!/favicon/.test(e)).slice(0,10);
  console.log(JSON.stringify(out,null,1)); await b.close();
})();
