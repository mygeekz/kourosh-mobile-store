#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createTelegramPollingRuntime } = await import(pathToFileURL(path.join(root,'server/utils/telegramPollingRuntime.ts')).href);

const run = async (seed, webhookInfo) => {
  const settings = {...seed};
  const writes=[]; const calls=[];
  const runtime = createTelegramPollingRuntime({
    getAllSettingsAsObject: async()=>settings,
    setTelegramProxy:()=>{},
    callTelegramBotApi: async (_token, method) => {
      calls.push(method);
      if (method === 'getWebhookInfo') return webhookInfo;
      return {success:true,data:{ok:true,result:true}};
    },
    resetTelegramCommandMenu: async()=>{},
    updateSetting: async(k,v)=>{settings[k]=v; writes.push([k,v]);},
    telegramLog:()=>{},
    getTelegramProxyAgentFromSettings:()=>null,
    handleTelegramUpdate:async()=>{},
    setTimeoutFn:()=>0,
    clearTimeoutFn:()=>{},
  });
  return {result: await runtime.autoConfigureTelegramUpdateMode(), writes, calls};
};

let r = await run({telegram_bot_token:'x',telegram_update_mode:'webhook'}, {success:true,data:{ok:true,result:{url:''}}});
if (r.result.mode !== 'polling' || !r.result.changed) throw new Error('empty webhook must fall back to polling');
if (!r.writes.some(([k,v])=>k==='telegram_update_mode'&&v==='polling')) throw new Error('polling mode was not persisted');

r = await run({telegram_bot_token:'x',telegram_update_mode:'webhook'}, {success:true,data:{ok:true,result:{url:'https://example.com/api/telegram/webhook'}}});
if (r.result.mode !== 'webhook' || r.result.changed) throw new Error('healthy public webhook must be preserved');

r = await run(
  {telegram_bot_token:'x',telegram_update_mode:'webhook',telegram_last_webhook_at:'2026-09-05T08:00:00Z'},
  {success:true,data:{ok:true,result:{url:'https://example.com/api/telegram/webhook',last_error_date:1788598800,last_error_message:'Bad Gateway'}}},
);
if (r.result.mode !== 'polling' || !r.result.changed) throw new Error('unrecovered Telegram webhook failure must fall back to polling');

console.log('PASS v356 Telegram webhook failover runtime contract');
