// Actual built React pages, synthetic Telegram/API records. Never connects to production.
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

const dist = path.resolve('dist-miniapp');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-visual-family-screens-'));
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.woff2':'font/woff2' };
const server = http.createServer(async (req,res) => {
  const f=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname);
  if(!f.startsWith(dist+path.sep))return res.writeHead(403).end();
  try{res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'}).end(await fs.readFile(f));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const report={artifact:dist,syntheticData:true,productionAccountsTested:false,checks:[],screenshots:output};
const sample=(v,k='')=>Array.isArray(v)?v.map(x=>sample(x)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,sample(x,k)])):typeof v==='number'&&Math.abs(v)>1e12?Math.sign(v)*178500000:typeof v==='string'&&v.length>60?(['fullName','customerName'].includes(k)?'نگار احمدی':k==='name'||k==='contactName'?'همراه آریا':'خرید گوشی و ثبت حساب فروشگاه'):v;
const browser=await puppeteer.launch({headless:true,executablePath:(await resolvePuppeteerBrowserExecutable({root:process.cwd()})).executablePath,args:browserLaunchArgs()});
try{
 for(const role of ['manager','partner','customer'])for(const theme of ['light','dark']){
  const page=await browser.newPage();let launch='/',mode='live';const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.evaluateOnNewDocument(theme=>{const noop=()=>{};window.Telegram={WebApp:{initData:'synthetic-visual-family',colorScheme:theme,themeParams:{},version:'9.0',platform:'android',safeAreaInset:{top:24,bottom:20,left:0,right:0},contentSafeAreaInset:{top:0,bottom:0,left:0,right:0},BackButton:{show:noop,hide:noop,onClick:noop,offClick:noop},ready:noop,expand:noop,onEvent:noop,offEvent:noop}};},theme);
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   const url=new URL(req.url());
   if(url.origin==='https://telegram.org'&&url.pathname==='/js/telegram-web-app.js')return req.respond({status:200,contentType:'application/javascript',body:''});
   if(url.origin!==origin){errors.push('Unexpected external request');return req.abort();}
   if(!url.pathname.startsWith('/api/'))return req.continue();
   const respond=body=>req.respond({status:200,contentType:'application/json',headers:{'x-kourosh-data-source':mode,'x-kourosh-snapshot-generated-at':new Date(Date.now()-12*60000).toISOString()},body:JSON.stringify({success:true,data:body})});
   if(url.pathname==='/api/miniapp/auth')return respond({sessionToken:'synthetic-visual-session',expiresAt:new Date(Date.now()+3600000).toISOString(),identity:{kind:role==='manager'?'staff':role,subjectId:1,displayName:role==='manager'?'فروشگاه کوروش':role==='partner'?'همراه آریا':'نگار احمدی',telegramUserId:'1',permissions:role==='manager'?permissions:[],capabilities:[],workspaces:(role==='manager'?['manager','partner']:[role]).map(kind=>({kind,subjectId:1,displayName:kind==='partner'?'همراه آریا':'فروشگاه کوروش',permissions:kind==='manager'?permissions:[],capabilities:[]}))},launch:{route:launch,startParam:null}});
   assert.equal(req.headers().authorization,'Bearer synthetic-visual-session');
   const endpoint=url.pathname.replace('/api/miniapp/'+role,'');
   const raw=role==='manager'?fixtures[endpoint]:role==='partner'?partner(endpoint):customer(endpoint);
   assert.ok(raw,`Missing fixture ${endpoint}`);
   const data=sample(raw);
   if(endpoint==='/dashboard'){data.widgets.sales.todayAmount=248500000;data.widgets.profit.todayGrossProfit=32750000;data.widgets.sales.averageSaleValue=20708333;data.widgets.installments.overdueAmount=18750000;}
   return respond(data);
  });
  const routes=role==='manager'?['/','/directory','/customers/1','/more']:role==='partner'?['/','/purchases','/account','/ledger']:['/','/account','/invoices/order-1'];
  for(const [i,route]of routes.entries()){
   launch=route;await page.setViewport({width:390,height:844,deviceScaleFactor:1});
   await page.goto(origin+'/miniapp.html');await page.waitForSelector('.miniapp-family-header');
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.miniapp-artwork')].map(el=>{const img=new Image();img.src=el.src;return img.decode()}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
   const badgeContrast = await page.$$eval('.miniapp-family-header-summary .miniapp-badge', els => {
    const luminance = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    return els.map(el=>{const s=getComputedStyle(el),fg=luminance(s.color),bg=luminance(s.backgroundColor);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)});
   });
   assert.ok(badgeContrast.every(ratio=>ratio>=4.5),`${role}${route}: account badge contrast`);
   await new Promise(r=>setTimeout(r,200));
   await page.screenshot({path:path.join(output,`${role}-${i}-${theme}-390.png`)});
   for(const width of [320,360,390,430])for(const rootSize of [16,32]){
    await page.setViewport({width,height:844});await page.evaluate(s=>document.documentElement.style.fontSize=s+'px',rootSize);
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,money:[...document.querySelectorAll('main .miniapp-family-money')].map(el=>{const n=el.querySelector('bdi').getBoundingClientRect(),u=el.querySelector('.miniapp-family-currency').getBoundingClientRect();return n.width<=el.clientWidth+1&&(u.top>=n.bottom-1||u.left>=n.right-1||n.left>=u.right-1)}),art:[...document.querySelectorAll('.miniapp-family-header .miniapp-artwork')].every(el=>el.complete&&el.naturalWidth>0&&el.getBoundingClientRect().width>0)}));
    assert.equal(layout.overflow,false,`${role}${route} ${width}/${rootSize} overflow`);assert.ok(layout.money.every(Boolean),`${role}${route} financial fit`);assert.ok(layout.art);
    report.checks.push({role,theme,route,width,rootSize,pass:true});
   }
   await page.evaluate(()=>document.documentElement.style.fontSize='');
  }
  if(role!=='customer'){
   for(const width of [320,360,390,430]){
    await page.setViewport({width,height:844});await page.click('.miniapp-workspace-trigger');
    const menu=await page.$eval('dialog[open]',el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,overflow:el.scrollWidth>el.clientWidth,roles:el.querySelectorAll('.miniapp-workspace-option').length}));
    assert.equal(menu.left,0);assert.ok(menu.right<=width);assert.equal(menu.overflow,false);assert.equal(menu.roles,role==='manager'?2:1);
    await page.screenshot({path:path.join(output,`${role}-menu-${theme}-${width}.png`)});await page.keyboard.press('Escape');
   }
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:true,cases:report.checks.length,output}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
