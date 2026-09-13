// Built application with synthetic stats; no production credentials or traffic.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { fixtures, permissions } from './fixtures/miniapp-manager-ui.mjs';
import { makeFixture as partner } from './fixtures/miniapp-partner-ui.mjs';
import { makeFixture as customer } from './fixtures/miniapp-customer-ui.mjs';

const before = process.argv.includes('--before');
const baselinePath = process.argv[process.argv.indexOf('--baseline') + 1];
const baseline = process.argv.includes('--baseline') ? JSON.parse(await fs.readFile(baselinePath, 'utf8')) : null;
const output = await fs.mkdtemp(path.join(os.tmpdir(), `kourosh-stats-${before ? 'before' : 'after'}-`));
const dist = path.resolve('dist-miniapp');
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.webp':'image/webp', '.woff2':'font/woff2', '.svg':'image/svg+xml' };
const server = http.createServer(async(req,res)=>{
  const file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end();
  try { res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream'}).end(await fs.readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin = `http://127.0.0.1:${server.address().port}`;
const scenes = [ ['manager','/','manager-home'], ['manager','/sales','manager-sales'], ['manager','/operations','manager-operations'], ['partner','/','partner-home'], ['partner','/account','partner-account'], ['partner','/phones','partner-settlements'] ];
const sample = (v,k='') => Array.isArray(v) ? v.map(x=>sample(x)) : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).map(([key,x])=>[key,sample(x,key)])) : typeof v==='number' && Math.abs(v)>1e12 ? Math.sign(v)*24000000 : typeof v==='string' && v.length>60 ? (k==='description'?'تسویه مدیر برای POCO C85':k==='name'?'POCO C71':'نگار احمدی') : v;
const report = { before, syntheticData:true, screenshots:output, scenes:[], checks:0 };
const browser = await puppeteer.launch({headless:true, executablePath:(await resolvePuppeteerBrowserExecutable({root:process.cwd()})).executablePath,args:browserLaunchArgs()});
try {
 for (const [role,route,name] of scenes) {
  const page = await browser.newPage(); const errors=[]; let stress=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.evaluateOnNewDocument(()=>{const noop=()=>{};window.Telegram={WebApp:{initData:'synthetic-record-density',colorScheme:'light',themeParams:{},version:'9.0',platform:'android',safeAreaInset:{top:24,bottom:20,left:0,right:0},contentSafeAreaInset:{top:0,bottom:0,left:0,right:0},BackButton:{show:noop,hide:noop,onClick:noop,offClick:noop},ready:noop,expand:noop,onEvent:noop,offEvent:noop}};});
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   const url=new URL(req.url());
   if(url.origin==='https://telegram.org')return req.respond({status:200,contentType:'application/javascript',body:''});
   if(url.origin!==origin){errors.push('Unexpected external request');return req.abort();}
   if(!url.pathname.startsWith('/api/'))return req.continue();
   const send=data=>req.respond({status:200,contentType:'application/json',headers:{'x-kourosh-data-source':'live'},body:JSON.stringify({success:true,data})});
   if(url.pathname==='/api/miniapp/auth')return send({sessionToken:'synthetic-record-session',expiresAt:new Date(Date.now()+3600000).toISOString(),identity:{kind:role==='manager'?'staff':role,subjectId:1,displayName:'حساب آزمایشی',telegramUserId:'1',permissions:role==='manager'?permissions:[],capabilities:[],workspaces:[{kind:role,subjectId:1,displayName:'حساب آزمایشی',permissions:role==='manager'?permissions:[],capabilities:[]}]},launch:{route,startParam:null}});
   assert.equal(req.headers().authorization,'Bearer synthetic-record-session');
   const endpoint=url.pathname.replace('/api/miniapp/'+role,'');
   const raw=role==='manager'?fixtures[endpoint]:role==='partner'?partner(endpoint):customer(endpoint);
   assert.ok(raw,endpoint);return send(stress?raw:sample(raw));
  });
  const selector=`.${role}-metric`;
  const load=async()=>{await page.goto(origin+'/miniapp.html');await page.waitForSelector(selector);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll(".miniapp-family-header img")].map(img=>img.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});};
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});await load();
  await page.screenshot({path:path.join(output,`${name}-top-390.png`)});
  const baselineMoney=await page.$$eval(`${selector} [data-field]`,els=>els.map(e=>[e.dataset.field,e.textContent]));
  const heights=await page.$$eval(selector,els=>els.map(e=>Math.round(e.getBoundingClientRect().height)));
  await page.$eval(selector,el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-110));
  await page.screenshot({path:path.join(output,`${name}-390.png`)});
  await page.screenshot({path:path.join(output,`${name}-full.png`),fullPage:true});
  report.scenes.push({name,role,route,heights,money:baselineMoney,labels:await page.$$eval(selector,els=>els.map(e=>e.textContent)),hero:await page.$eval('.miniapp-family-header',el=>({text:el.textContent,height:el.clientHeight,background:getComputedStyle(el).backgroundImage}))});
  if(baseline){
   const previous=baseline.scenes.find(s=>s.name===name);
   assert.deepEqual(baselineMoney,previous.money,`${name}: financial values changed`);
   assert.ok(heights.every((height,i)=>height<previous.heights[i]),`${name}: cards should be shorter`);
   assert.deepEqual(report.scenes.at(-1).hero,previous.hero,`${name}: hero changed`);
   assert.deepEqual(report.scenes.at(-1).labels,previous.labels,`${name}: labels/counts changed`);
  }
  if(!before) {
   assert.ok(await page.$(`${selector} .miniapp-stat-icon svg`),`${name}: semantic icon`);
   for(const extreme of [false,true]) {
    if(extreme){stress=true;await load();}
    const expected=await page.$$eval(`${selector} [data-field]`,els=>els.map(e=>[e.dataset.field,e.textContent]));
    for(const width of [320,360,390,430])for(const size of [16,24,32]) {
     await page.setViewport({width,height:844});await page.evaluate(size=>document.documentElement.style.fontSize=size+'px',size);
     const state=await page.evaluate(selector=>({overflow:document.documentElement.scrollWidth>innerWidth, money:[...document.querySelectorAll(`${selector} .miniapp-family-money`)].map(e=>{const n=e.querySelector('bdi'),r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const text=range.getBoundingClientRect(),s=getComputedStyle(n);return {fits:text.width<=r.width+1&&e.scrollWidth<=e.clientWidth+1,ellipsis:s.textOverflow==='ellipsis',size:parseFloat(s.fontSize)};}),fields:[...document.querySelectorAll(`${selector} [data-field]`)].map(e=>[e.dataset.field,e.textContent])}),selector);
     assert.equal(state.overflow,false,`${name}/${width}/${size} overflow`);
     const headingFit=await page.$$eval(`${selector} .miniapp-stat-heading`,heads=>heads.every(head=>{
      const children=[...head.children];
      return children.every(el=>el.scrollWidth<=el.clientWidth+1)&&children.every((a,i)=>children.slice(i+1).every(b=>{
       const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.right<=y.left+1||y.right<=x.left+1||x.bottom<=y.top+1||y.bottom<=x.top+1;
      }));
     }));
     assert.ok(headingFit,`${name}/${width}/${size}: title/status clipping or overlap`);
     assert.ok(state.money.every(m=>m.fits&&!m.ellipsis&&m.size>=12),`${name}/${width}/${size} money: ${JSON.stringify(state.money)}`);
     assert.deepEqual(state.fields,expected);report.checks++;
    }
    await page.evaluate(()=>document.documentElement.style.fontSize='');
   }
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
} finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
