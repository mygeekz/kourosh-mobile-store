#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const polling = read('server/utils/telegramPollingRuntime.ts');
const sales = read('server/salesOrders.ts');
const route = read('server/routes/salesOrderMutations.routes.ts');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const releaseNumber = Number(version.replace(/^v/, ''));
if (!Number.isFinite(releaseNumber) || releaseNumber < 356) throw new Error(`expected v356 or successor, got ${version}`);
for (const token of [
  'stale webhook detected; falling back to polling',
  'last_error_date',
  'telegram_last_webhook_at',
  'deleteWebhook',
  'telegram_update_mode',
  'telegram_polling_enabled',
]) if (!polling.includes(token)) throw new Error(`missing Telegram failover contract: ${token}`);
if (/if \(explicitMode === "webhook"\)\s*return \{ changed: false, mode: "webhook"/.test(polling)) throw new Error('blind explicit-webhook short circuit returned');
for (const token of [
  'assertSalesOrderDateIsOpen',
  "mutationStage = 'ثبت سند اصلی فروش'",
  "mutationStage = 'ثبت اقلام و به‌روزرسانی موجودی'",
  "mutationStage = 'ثبت دفتر حساب مشتری'",
  "mutationStage = 'ثبت اسنپ‌شات سود و مالکیت'",
  'ثبت فروش در مرحله «${mutationStage}» ناموفق بود',
]) if (!sales.includes(token)) throw new Error(`missing staged sales diagnostic: ${token}`);
if (!route.includes('businessFailure') || !route.includes('return res.status(409)')) throw new Error('sales business failures are not mapped away from HTTP 500');
console.log('PASS v356 bot/sales hotfix source audit');
