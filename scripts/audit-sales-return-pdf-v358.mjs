#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`[v358 return/pdf audit] FAIL: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

const version = read('KOUROSH_SOURCE_VERSION').trim();
const releaseNumber = Number(version.replace(/^v/, ''));
expect(Number.isFinite(releaseNumber) && releaseNumber >= 358, `expected v358 or successor, got ${version}`);

const page = read('pages/InvoiceDetail.tsx');
const sales = read('server/salesOrders.ts');
const mutations = read('server/services/salesOrderMutations.service.ts');

for (const token of [
  'title="ثبت مرجوعی فاکتور"',
  'hideCloseButton',
  'closeOnBackdrop={false}',
  'مبلغ برگشتی محاسبه‌شده',
  'فاکتور اصلی تغییر نمی‌کند',
  'قبلاً مرجوع',
  'قابل مرجوعی',
  "submitDisabled={!hasReturnableItems || selectedReturnItemCount === 0 || !returnReason.trim()}",
]) expect(page.includes(token), `return modal contract missing: ${token}`);

expect(!page.includes('setRefundAmount'), 'editable refund amount state returned');
const postBodySlice = page.slice(page.indexOf("body: JSON.stringify({\n        type: 'refund'"), page.indexOf('items: payloadItems', page.indexOf("body: JSON.stringify({\n        type: 'refund'")) + 40);
expect(!postBodySlice.includes('refundAmount'), 'client still posts refundAmount');
expect(!postBodySlice.includes('unitPrice'), 'client still posts return unitPrice');
expect(!postBodySlice.includes('description'), 'client still posts return description');

for (const token of [
  "if (!normalizedReason) throw new Error('ثبت دلیل مرجوعی الزامی است.')",
  'SELECT itemType, itemId, quantity, description, unitPrice, totalPrice',
  'const computedRefundAmount = returnsAllRemainingItems',
  'invoiceGrandTotal / invoiceItemsNetTotal',
  'Math.min(remainingInvoiceRefund, proportionalRefund)',
  'const description = String(sold.description || \'\')',
  'const unitPrice = Math.max(0, Number(sold.unitPrice) || 0)',
]) expect(sales.includes(token), `immutable server-side return contract missing: ${token}`);

const createReturnSlice = sales.slice(sales.indexOf('export async function createSalesReturn('), sales.indexOf('export async function getSalesReturnsForOrder('));
expect(!createReturnSlice.includes('payload.refundAmount'), 'server still trusts client refundAmount');
expect(!createReturnSlice.includes('item.description || sold.description'), 'server still trusts client description');
expect(!createReturnSlice.includes('item.unitPrice ?? sold.unitPrice'), 'server still trusts client price');
expect(mutations.includes("throw new Error('ثبت دلیل مرجوعی الزامی است.')"), 'request normalizer does not require return reason');
expect(mutations.includes('Invoice line description/price are intentionally not accepted from the client.'), 'request normalizer still owns client price/description');

for (const token of [
  '.inv, .inv *{ letter-spacing:0 !important; font-synthesis:none; }',
  '.inv__table thead th{\n    letter-spacing:0 !important;',
  'word-spacing:4px;',
  'position:relative; top:-2px;',
  "clone.classList.add('inv--pdf-capture')",
  'host.style.width="794px"',
  'scale: 2.5',
]) expect(page.includes(token), `PDF Persian-render contract missing: ${token}`);
expect(!/\.inv__title\{[^}]*letter-spacing:-\.2px/s.test(page), 'negative Persian title letter-spacing returned');
expect(!page.includes('.split(/\\s+/)'), 'business title is still split into independent RTL word spans');

// Money allocation behavior: line-net proportion follows immutable invoice grand total,
// and the final remaining return settles the exact outstanding refundable amount.
const calc = ({ lineNet, invoiceNet, grandTotal, previousRefund = 0, allRemaining = false }) => {
  const remaining = Math.max(0, grandTotal - previousRefund);
  const ratio = invoiceNet > 0 ? grandTotal / invoiceNet : 1;
  const proportional = Math.max(0, Math.round(lineNet * ratio));
  return allRemaining ? remaining : Math.min(remaining, proportional);
};
expect(calc({ lineNet: 1500000, invoiceNet: 3750000, grandTotal: 3750000 }) === 1500000, 'plain invoice return allocation mismatch');
expect(calc({ lineNet: 1000000, invoiceNet: 2000000, grandTotal: 1800000 }) === 900000, 'global discount allocation mismatch');
expect(calc({ lineNet: 1000000, invoiceNet: 2000000, grandTotal: 2180000 }) === 1090000, 'tax-inclusive allocation mismatch');
expect(calc({ lineNet: 1, invoiceNet: 3, grandTotal: 1000, previousRefund: 667, allRemaining: true }) === 333, 'final remainder settlement mismatch');

console.log('PASS v358 immutable sales-return modal + Persian PDF capture audit');
