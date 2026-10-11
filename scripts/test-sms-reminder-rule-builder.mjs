// Browser interaction test: real feature components, native UI primitive doubles,
// fixture-only local API. Never connects to the running app or its database.
import assert from 'node:assert/strict';
import http from 'node:http';
import esbuild from 'esbuild';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { loadShadowModules } from './lib/notification-rule-shadow-harness.mjs';
const { getSmsReminderReadiness, validateSmsReminderContract } = loadShadowModules();
const settings = { meli_payamak_username:'fixture', meli_payamak_password:'fixture' };
let schemaReady=true, dangerousRequests=0;
const saved=[], errors=[];
const primitiveCode=`import React from 'react';
  const field=tag=>({label,children,value,onChange,disabled,type,min,max,step,maxLength,dir,...rest})=>React.createElement('label',{},label,
    React.createElement(tag,{'aria-label':label,value,onChange,disabled,type,min,max,step,maxLength,dir},children));
  export const TextField=field('input'),SelectField=field('select'),TextareaField=field('textarea');
  export const Dialog=({isOpen,children,title})=>isOpen?React.createElement('div',{role:'dialog','aria-label':title},children):null;`;
const bundle=await esbuild.build({ stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Builder from './components/ReminderRulesBuilder';createRoot(document.getElementById('root')).render(<Builder/>);`,resolveDir:process.cwd(),loader:'tsx'},
  bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent',plugins:[{name:'fixture-boundaries',setup(build){
    build.onResolve({filter:/^(@\/components\/ui|\.\/ui)$/},args=>({path:args.path,namespace:'ui-double'}));
    build.onLoad({filter:/.*/,namespace:'ui-double'},()=>({contents:primitiveCode,loader:'js',resolveDir:process.cwd()}));
    build.onResolve({filter:/^\.\/Button$/},()=>({path:'button',namespace:'button-double'}));
    build.onLoad({filter:/.*/,namespace:'button-double'},()=>({contents:`import React from 'react';export default ({children,onClick,disabled,type,...rest})=>React.createElement('button',{onClick,disabled,type},children);`,loader:'js',resolveDir:process.cwd()}));
    build.onResolve({filter:/utils\/apiFetch$/},()=>({path:'api',namespace:'api-double'}));
    build.onLoad({filter:/.*/,namespace:'api-double'},()=>({contents:`export const apiFetch=(...args)=>fetch(...args);`,loader:'js'}));
  }}],define:{'process.env.NODE_ENV':'"test"'} });
const script=bundle.outputFiles[0].text;
const server=http.createServer(async(req,res)=>{
  if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}
  if(req.url==='/'){res.writeHead(200,{'content-type':'text/html'}).end('<html dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><div id="root"></div><script src="/fixture.js"></script></html>');return;}
  if(req.url==='/fixture.js'){res.writeHead(200,{'content-type':'text/javascript'}).end(script);return;}
  const json=value=>{res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(value));};
  if(req.url==='/api/reminders/config')return json({success:true,data:{sendStartHour:10,sendEndHour:21,maxPerDayPerCustomer:1}});
  if(req.url==='/api/reminders/rules' && req.method==='GET')return json({success:true,data:[{id:1,name:'قانون تلگرام قبلی',enabled:0,channel:'telegram',matchType:'days_until',value:3,template:'متن اصلی تلگرام',targetType:'both'}],smsSchemaReady:schemaReady});
  let body='';for await(const chunk of req)body+=chunk;const input=body?JSON.parse(body):{};
  if(req.url==='/api/reminders/rules/validate-sms'){
    const readiness=getSmsReminderReadiness(input,settings),contract=validateSmsReminderContract(input);
    return json({success:true,data:{valid:!contract.errors.length&&(!input.enabled||readiness.ready),readiness,schemaReady}});
  }
  if(req.url==='/api/reminders/rules' && req.method==='POST'){saved.push(input);return json({success:true,data:{id:saved.length+1}});}
  if(req.url==='/api/reminders/rules/preview')return json({success:true,data:{totalMatched:0,previews:[],fallback:{vars:{},text:'نمونه'}}});
  dangerousRequests++;res.writeHead(403).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
let browser,passed=0;
try{
  const executable=await resolvePuppeteerBrowserExecutable();
  browser=await puppeteer.launch({executablePath:executable.executablePath,headless:true,args:browserLaunchArgs()});
  const page=await browser.newPage();await page.setViewport({width:390,height:844});
  page.on('pageerror',error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request',request=>request.url().startsWith(url)?request.continue():request.abort());
  const clickText=async text=>{
    await page.waitForFunction(text=>{const scope=document.querySelector('[role="dialog"]')||document;return [...scope.querySelectorAll('button')].some(b=>b.textContent.trim()===text&&!b.disabled);},{},text);
    await page.evaluate(text=>{const scope=document.querySelector('[role="dialog"]')||document;[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===text).click();},text);
  };
  const choose=async(label,value)=>page.select(`select[aria-label="${label}"]`,value);
  const settled=async()=>page.waitForFunction(()=>{const element=document.querySelector('[data-sms-rule-editor] [data-sms-rule-readiness]');return element&&element.dataset.smsRuleReadiness!=='LOADING';});
  const openSms=async()=>{await clickText('افزودن قانون');await choose('کانال اعلان','sms');await page.waitForSelector('[data-sms-rule-editor]');await settled();};
  await page.goto(url);await page.waitForSelector('[data-reminders-rules-count="1"]');
  assert.ok((await page.$eval('body',e=>e.innerText)).includes('متن اصلی تلگرام'));passed++;
  await openSms();
  assert.equal(await page.$eval('select[aria-label="وضعیت قانون پیامک"]',e=>e.value),'0');
  assert.equal(await page.$eval('select[aria-label="وضعیت قانون پیامک"] option[value="1"]',e=>e.disabled),true);passed++;
  assert.ok((await page.$eval('[data-sms-rule-description]',e=>e.textContent)).includes('۳ روز قبل از سررسید'));passed++;
  await clickText('ذخیره تغییرات');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
  assert.equal(saved[0].enabled,false);assert.equal(saved[0].eventType,'INSTALLMENT_DUE');passed++;
  settings.meli_payamak_installment_due_notice_pattern_id='123';
  await openSms();assert.equal(await page.$eval('select[aria-label="وضعیت قانون پیامک"] option[value="1"]',e=>e.disabled),false);
  await choose('وضعیت قانون پیامک','1');await settled();await clickText('ذخیره تغییرات');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
  assert.equal(saved[1].enabled,true);assert.equal(saved[1].daysOffset,3);assert.equal(saved[1].channel,'sms');passed++;
  await openSms();await choose('موضوع یادآوری','check');await settled();
  const options=await page.$$eval('select[aria-label="قالب پیامک"] option',options=>options.map(o=>o.value));
  assert.ok(options.includes('check_due'));assert.ok(!options.includes('installment_due_notice'));passed++;
  await choose('نوع اعلان','CHECK_FAILED');await settled();
  assert.equal(await page.$eval('input[aria-label="تعداد روز"]',e=>e.disabled),true);
  assert.equal(await page.$eval('select[aria-label="زمان یادآوری"]',e=>e.value),'IMMEDIATE');passed++;
  await clickText('انصراف');schemaReady=false;await page.reload();await page.waitForSelector('[data-reminders-rules-count="1"]');await openSms();
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent.trim()==='ذخیره تغییرات')?.disabled),true);passed++;
  assert.equal(dangerousRequests,0);assert.deepEqual(errors,[]);passed++;
  console.log(`${passed}/${passed} Rule Builder browser interaction checks passed; fixture API only; no provider or database calls.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
