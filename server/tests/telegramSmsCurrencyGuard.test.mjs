import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const serverPath = path.resolve(process.cwd(), 'server/index.ts');
const source = fs.readFileSync(serverPath, 'utf8');

assert.match(source, /const REPORT_CURRENCY_CONTRACT = \{[\s\S]*currencyBase: 'IRR'[\s\S]*displayCurrency: 'تومان'[\s\S]*moneyDivisor: 10[\s\S]*\} as const;/);
assert.match(source, /const formatPriceForSms = \(price: number\): string => \{[\s\S]*Math\.round\(n \/ REPORT_CURRENCY_CONTRACT\.moneyDivisor\)[\s\S]*toLocaleString\('fa-IR'\)/);
assert.ok(!/formatMoney\([^)]*\)[^`\n]*تومان/.test(source), 'Telegram/SMS monetary injections must not append تومان to raw formatMoney output.');

const toFaDigits = (value) => String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const formatPriceForSmsLikeServer = (price) => {
  const n = Number(price || 0);
  const toman = Number.isFinite(n) ? Math.round(n / 10) : 0;
  return toFaDigits(toman.toLocaleString('en-US')).replace(/,/g, '٬');
};

assert.equal(formatPriceForSmsLikeServer(5_200_000), '۵۲۰٬۰۰۰');
assert.equal(formatPriceForSmsLikeServer(0), '۰');

console.log('telegram/sms currency guard passed');
