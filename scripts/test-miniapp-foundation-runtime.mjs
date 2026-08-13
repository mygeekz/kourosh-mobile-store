#!/usr/bin/env node
/* global document, window */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-chromium-cache';

const root = process.cwd();
const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const externalOrigin = process.env.KOUROSH_MINIAPP_ORIGIN;
const useDevelopmentServer = process.env.KOUROSH_MINIAPP_DEV === '1';
const port = externalOrigin ? null : await reservePort();
const origin = externalOrigin || `http://127.0.0.1:${port}`;
const previewLogs = [];
const preview = externalOrigin ? null : spawn(
  process.execPath,
  [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), ...(useDevelopmentServer ? [] : ['preview']), '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    cwd: root,
    env: { ...process.env, VITE_DISABLE_HTTPS: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
preview?.stdout.on('data', (chunk) => previewLogs.push(String(chunk)));
preview?.stderr.on('data', (chunk) => previewLogs.push(String(chunk)));

const waitForPreview = async () => {
  if (!preview) return;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited early:\n${previewLogs.join('')}`);
    try {
      if ((await fetch(`${origin}/miniapp.html`)).ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Vite preview did not become ready:\n${previewLogs.join('')}`);
};

await waitForPreview();
const [{ default: puppeteer }, browserExecutable] = await Promise.all([
  import('puppeteer-core'),
  resolvePuppeteerBrowserExecutable({ root }),
]);

const browser = await puppeteer.launch({
  executablePath: browserExecutable.executablePath,
  args: browserLaunchArgs(),
  headless: true,
});
const observedApiRequests = [];
const observeNetworkBoundary = (url) => {
  if (!url.pathname.startsWith('/api/')) return;
  observedApiRequests.push(url.toString());
  assert.equal(url.origin, origin, `Mini App API request escaped same origin: ${url}`);
  assert.ok(url.pathname.startsWith('/api/miniapp/'), `Mini App requested a non-allowlisted API path: ${url.pathname}`);
};

const json = (request, data) => request.respond({
  status: 200,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(data),
});

const assertResponsiveWidths = async (page, label) => {
  for (const width of [360, 390, 430]) {
    await page.setViewport({ width, height: 820, deviceScaleFactor: 1 });
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    }));
    assert.ok(layout.page <= layout.viewport, `${label} overflows horizontally at ${width}px.`);
  }
};

const collectPageError = (target) => (error) => {
  if (useDevelopmentServer && /WebSocket closed without opened/i.test(error.message)) return;
  target.push(error.message);
};

const collectConsoleError = (target) => (message) => {
  if (message.type() !== 'error') return;
  const text = message.text();
  if (useDevelopmentServer && /WebSocket|failed to connect to websocket/i.test(text)) return;
  target.push(text);
};

try {
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', collectPageError(pageErrors));
  page.on('console', collectConsoleError(consoleErrors));

  await page.evaluateOnNewDocument(() => {
    const noOp = () => undefined;
    window.Telegram = {
      WebApp: {
        initData: 'runtime-signed-init-data',
        initDataUnsafe: {},
        version: '9.1',
        platform: 'android',
        colorScheme: 'light',
        themeParams: {
          bg_color: '#f5f7fb',
          text_color: '#172033',
          hint_color: '#667085',
          button_color: '#1867c0',
          button_text_color: '#ffffff',
        },
        safeAreaInset: { top: 18, bottom: 12, left: 0, right: 0 },
        contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
        BackButton: { show: noOp, hide: noOp, onClick: noOp, offClick: noOp },
        ready: noOp,
        expand: noOp,
        onEvent: noOp,
        offEvent: noOp,
        setHeaderColor: noOp,
        setBackgroundColor: noOp,
      },
    };
  });

  await page.setRequestInterception(true);
  let customerAuthCalls = 0;
  let customerLaunch = { startParam: 'v1_c_inst_44_440', route: '/installments/44?paymentId=440' };
  page.on('request', async (request) => {
    const url = new URL(request.url());
    observeNetworkBoundary(url);
    if (url.hostname === 'telegram.org' && url.pathname.endsWith('/telegram-web-app.js')) {
      await request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/auth') {
      customerAuthCalls += 1;
      await json(request, {
        success: true,
        data: {
          sessionToken: 'runtime-session-token-abcdefghijklmnopqrstuvwxyz',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          identity: {
            kind: 'customer',
            subjectId: 12,
            displayName: 'بهزاد آزمایشی',
            telegramUserId: '99200123',
            capabilities: [
              'customer:read_own',
              'customer:account:read_own',
              'customer:installments:read_own',
              'customer:invoices:read_own',
            ],
          },
          launch: customerLaunch,
          telegram: { userId: '99200123', platform: 'android' },
        },
        requestId: 'runtime-foundation-check',
      });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/customer/installments/44') {
      await json(request, {
        success: true,
        data: {
          id: 44, saleType: 'installment', itemsSummary: 'گوشی موبایل آزمایشی', saleDate: '2026-08-01',
          totalAmount: 35000000, downPayment: 10000000, collectedAmount: 12500000, remainingAmount: 22500000,
          installmentCount: 10, paidInstallmentCount: 1, remainingInstallmentCount: 9, nextDueDate: '1405/05/28',
          nextDueAmount: 2500000, overdueCount: 0, status: 'در حال پرداخت', items: [], checks: [],
          timeline: [{ id: 440, installmentNumber: 2, dueDate: '1405/05/28', amount: 2500000, paidAmount: 0, remainingAmount: 2500000, paymentDate: null, state: 'upcoming' }],
        },
        requestId: 'runtime-installment-detail',
      });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/customer/invoices/order-91') {
      await json(request, {
        success: true,
        data: {
          business: { name: 'کوروش', logoUrl: '/kourosh-logo.svg' }, invoiceNumber: '91', transactionDate: '2026-08-01',
          paymentMethod: 'cash', paymentMethodLabel: 'نقدی', status: 'active',
          items: [{ id: 1, description: 'گوشی آزمایشی', quantity: 1, unitPrice: 32000000, discountAmount: 0, totalPrice: 32000000 }],
          totals: { subtotal: 32000000, itemsDiscount: 0, globalDiscount: 0, taxAmount: 0, grandTotal: 32000000 },
        },
        requestId: 'runtime-invoice-detail',
      });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/customer/home') {
      await json(request, {
        success: true,
        data: {
          customer: { id: 12, fullName: 'بهزاد آزمایشی' },
          account: { signedBalance: 12500000, code: 'debtor', label: 'بدهکار', amount: 12500000 },
          installments: {
            activeCount: 1,
            overdueCount: 0,
            next: { saleId: 44, dueDate: '1405/05/28', amount: 2500000 },
          },
          lastPurchase: {
            ref: 'sales_order-91',
            source: 'sales_order',
            id: 91,
            transactionDate: '2026-08-01',
            itemsSummary: 'گوشی موبایل آزمایشی',
            quantity: 1,
            totalAmount: 32000000,
            purchaseType: 'cash',
            purchaseTypeLabel: 'نقدی',
            invoiceRef: 'order-91',
          },
        },
        requestId: 'runtime-home',
      });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/customer/installments') {
      await json(request, {
        success: true,
        data: [{
          id: 44,
          saleType: 'installment',
          itemsSummary: 'گوشی موبایل آزمایشی',
          saleDate: '2026-08-01',
          totalAmount: 35000000,
          downPayment: 10000000,
          collectedAmount: 12500000,
          remainingAmount: 22500000,
          installmentCount: 10,
          paidInstallmentCount: 1,
          remainingInstallmentCount: 9,
          nextDueDate: '1405/05/28',
          nextDueAmount: 2500000,
          overdueCount: 0,
          status: 'در حال پرداخت',
        }],
        requestId: 'runtime-installments',
      });
      return;
    }
    await request.continue();
  });

  await page.setViewport({ width: 360, height: 800, deviceScaleFactor: 1 });
  const response = await page.goto(`${origin}/miniapp.html`, { waitUntil: 'networkidle0', timeout: 30_000 });
  assert.equal(response?.status(), 200, 'Mini App entry must load successfully.');
  await page.waitForSelector('nav[aria-label="ناوبری مشتری"]', { timeout: 10_000 });
  assert.match(await page.$eval('h1', (element) => element.textContent || ''), /گوشی موبایل آزمایشی/);
  assert.equal(await page.$$eval('li.ring-1', (items) => items.length), 1, 'validated paymentId must highlight the owned timeline row');

  await assertResponsiveWidths(page, 'Customer deep-linked installment');

  customerLaunch = { startParam: 'v1_c_inv_order_91', route: '/invoices/order-91' };
  await page.reload({ waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('فاکتور'));
  assert.equal(customerAuthCalls, 2, 'a fresh Telegram boot must re-authenticate even while sessionStorage is populated');
  await assertResponsiveWidths(page, 'Customer invoice deep link');
  await page.click('a[href="#/"]');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('بهزاد آزمایشی'));
  await assertResponsiveWidths(page, 'Customer Home');
  await page.click('a[href="#/installments"]');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('اقساط من'));
  assert.equal(await page.$$eval('main ul li', (items) => items.length), 1);
  await assertResponsiveWidths(page, 'Customer Installments');
  assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join('\n')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join('\n')}`);

  const partnerPage = await browser.newPage();
  const partnerPageErrors = [];
  const partnerConsoleErrors = [];
  partnerPage.on('pageerror', collectPageError(partnerPageErrors));
  partnerPage.on('console', collectConsoleError(partnerConsoleErrors));
  await partnerPage.evaluateOnNewDocument(() => {
    const noOp = () => undefined;
    window.Telegram = {
      WebApp: {
        initData: 'runtime-signed-partner-init-data', initDataUnsafe: {}, version: '9.1',
        platform: 'android', colorScheme: 'dark',
        themeParams: { bg_color: '#0f172a', secondary_bg_color: '#020617', text_color: '#f8fafc', hint_color: '#94a3b8', button_color: '#1867c0', button_text_color: '#ffffff' },
        safeAreaInset: { top: 18, bottom: 12, left: 0, right: 0 },
        contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
        BackButton: { show: noOp, hide: noOp, onClick: noOp, offClick: noOp },
        ready: noOp, expand: noOp, onEvent: noOp, offEvent: noOp,
        setHeaderColor: noOp, setBackgroundColor: noOp,
      },
    };
  });
  await partnerPage.setRequestInterception(true);
  partnerPage.on('request', async (request) => {
    const url = new URL(request.url());
    observeNetworkBoundary(url);
    if (url.hostname === 'telegram.org' && url.pathname.endsWith('/telegram-web-app.js')) {
      await request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/auth') {
      await json(request, { success: true, data: { sessionToken: 'runtime-partner-session-token-abcdefghijklmnop', expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), identity: { kind: 'partner', subjectId: 17, displayName: 'همکار آزمایشی', telegramUserId: '77200123', capabilities: ['partner:read_own', 'partner:ledger:read_own', 'partner:purchases:read_own', 'partner:phones:read_own'] }, launch: { startParam: 'v1_p_ledger', route: '/ledger' }, telegram: { userId: '77200123', platform: 'android' } }, requestId: 'runtime-partner-auth' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/partner/home') {
      await json(request, { success: true, data: { partner: { id: 17, name: 'همکار آزمایشی', type: 'Supplier', contactName: null, phoneNumber: '09121111111', email: null }, account: { signedBalance: -4500000, code: 'creditor', label: 'بستانکار از فروشگاه', amount: 4500000 }, ledger: { total: 4, lastActivity: '2026-08-10', recent: [] }, supplied: { total: 6, phones: 4, products: 2, totalSupplyAmount: 120000000 }, phoneSettlement: { total: 2, open: 1, settled: 1, amount: 70000000, paidAmount: 50000000, remainingAmount: 20000000 } }, requestId: 'runtime-partner-home' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/partner/ledger') {
      const requestedPage = Number(url.searchParams.get('page') || 1);
      await json(request, { success: true, data: { items: [{ id: requestedPage, transactionDate: '2026-08-10', description: `گردش صفحه ${requestedPage}`, debit: requestedPage === 1 ? 2000000 : 0, credit: requestedPage === 2 ? 500000 : 0, balance: -4500000 }], page: requestedPage, pageSize: 20, total: 21, totalPages: 2, account: { signedBalance: -4500000, code: 'creditor', label: 'بستانکار از فروشگاه', amount: 4500000 } }, requestId: 'runtime-partner-ledger' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/partner/phones') {
      await json(request, { success: true, data: { items: [{ ref: 'phone-1', name: 'گوشی همکار', identifier: 'TEST-IMEI', status: 'فروخته شده', purchaseDate: '2026-08-09', settlement: { code: 'open', label: 'تسویه‌نشده', amount: 10000000, paidAmount: 4000000, remainingAmount: 6000000, lastPaymentDate: null } }], page: 1, pageSize: 20, total: 1, totalPages: 1, summary: { total: 1, amount: 10000000, paidAmount: 4000000, remainingAmount: 6000000 } }, requestId: 'runtime-partner-phones' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/partner/purchases') {
      await json(request, { success: true, data: { items: [{ ref: 'product-1', type: 'product', name: 'کالای همکار', quantity: 2, unit: 'عدد', supplyAmount: 3000000, purchaseDate: '2026-08-08', identifier: null, status: null, settlement: null }], page: 1, pageSize: 20, total: 1, totalPages: 1 }, requestId: 'runtime-partner-purchases' });
      return;
    }
    await request.continue();
  });

  await partnerPage.setViewport({ width: 360, height: 800, deviceScaleFactor: 1 });
  const partnerResponse = await partnerPage.goto(`${origin}/miniapp.html`, { waitUntil: 'networkidle0', timeout: 30_000 });
  assert.ok([200, 304].includes(partnerResponse?.status() || 0), 'Partner Mini App entry must load successfully.');
  await partnerPage.waitForSelector('nav[aria-label="ناوبری همکار"]', { timeout: 10_000 });
  assert.match(await partnerPage.$eval('h1', (element) => element.textContent || ''), /گردش حساب من/);
  const resolvedTokens = await partnerPage.evaluate(() => {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      page: styles.getPropertyValue('--palette-page-rgb').trim(),
      radius: styles.getPropertyValue('--radius-md').trim(),
      theme: document.documentElement.dataset.theme,
    };
  });
  assert.ok(resolvedTokens.page, 'Kourosh semantic page token must resolve.');
  assert.equal(resolvedTokens.radius, '14px', 'Mini App radius token must resolve.');
  assert.equal(resolvedTokens.theme, 'dark', 'Telegram dark mode must activate Kourosh dark tokens.');
  await assertResponsiveWidths(partnerPage, 'Partner Ledger page 1');
  assert.equal(await partnerPage.$$eval('main ul li', (items) => items.length), 1);
  await partnerPage.click('button');
  await partnerPage.waitForFunction(() => document.querySelectorAll('main ul li').length === 2);
  assert.equal(await partnerPage.$$eval('main ul li', (items) => items.length), 2, 'Partner Load More must append page 2 without replacing page 1');
  await assertResponsiveWidths(partnerPage, 'Partner Ledger Load More page 2');
  await partnerPage.click('a[href="#/"]');
  await partnerPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('همکار آزمایشی'));
  await assertResponsiveWidths(partnerPage, 'Partner Home');
  await partnerPage.click('a[href="#/purchases"]');
  await partnerPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('کالاهای من'));
  await assertResponsiveWidths(partnerPage, 'Partner Purchases');
  await partnerPage.click('a[href="#/phones"]');
  await partnerPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('تسویه گوشی‌ها'));
  await assertResponsiveWidths(partnerPage, 'Partner Phones');
  await partnerPage.click('a[href="#/purchases"]');
  await partnerPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('کالاهای من'));
  assert.deepEqual(partnerPageErrors, [], `Partner browser page errors: ${partnerPageErrors.join('\n')}`);
  assert.deepEqual(partnerConsoleErrors, [], `Partner browser console errors: ${partnerConsoleErrors.join('\n')}`);

  const staffPage = await browser.newPage();
  const staffErrors = [];
  const staffConsoleErrors = [];
  staffPage.on('pageerror', collectPageError(staffErrors));
  staffPage.on('console', collectConsoleError(staffConsoleErrors));
  await staffPage.evaluateOnNewDocument(() => {
    const noOp = () => undefined;
    window.Telegram = { WebApp: {
      initData: 'runtime-signed-staff-init-data', initDataUnsafe: {}, version: '9.1', platform: 'android', colorScheme: 'light',
      themeParams: { bg_color: '#f5f7fb', text_color: '#172033', hint_color: '#667085', button_color: '#1867c0', button_text_color: '#ffffff' },
      safeAreaInset: { top: 18, bottom: 12, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      BackButton: { show: noOp, hide: noOp, onClick: noOp, offClick: noOp }, ready: noOp, expand: noOp, onEvent: noOp, offEvent: noOp,
      setHeaderColor: noOp, setBackgroundColor: noOp,
    } };
  });
  await staffPage.setRequestInterception(true);
  staffPage.on('request', async (request) => {
    const url = new URL(request.url());
    observeNetworkBoundary(url);
    if (url.hostname === 'telegram.org' && url.pathname.endsWith('/telegram-web-app.js')) return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
    if (url.origin === origin && url.pathname === '/api/miniapp/auth') {
      await json(request, { success: true, data: { sessionToken: 'runtime-staff-session-token-abcdefghijklmnop', expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), identity: { kind: 'staff', subjectId: 1, displayName: 'مدیر آزمایشی', telegramUserId: '88100123', roleName: 'Admin', capabilities: ['staff:executive:read','staff:sales_summary:read','staff:customer_lookup:read','staff:inventory_lookup:read','staff:installments:read','staff:invoice_lookup:read'] }, launch: { startParam: 'v1_s_home', route: '/' }, telegram: { userId: '88100123', platform: 'android' } }, requestId: 'runtime-staff-auth' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/home') {
      await json(request, { success: true, data: { today: { sales: 1234567890, grossProfit: 234567890, transactions: 7, averageSaleValue: 176366841 }, financialPosition: { totalReceivables: 9876543210, debtorsCount: 12 }, installments: { dueTodayCount: 2, dueTodayAmount: 34567890, overdueCount: 3, overdueAmount: 45678901 }, inventory: { activeItemsCount: 44 }, month: { totalSales: 22345678901, phoneCashSales: 11234567890, installmentSales: 8765432100 } }, requestId: 'staff-home' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/search') {
      const q = url.searchParams.get('q') || '';
      const customerQuery = q.includes('کیان');
      await json(request, { success: true, data: { query: q, groups: { customers: customerQuery ? [{ customerId: 12, fullName: 'کیان رضایی', phoneNumber: '09121234567', balance: 15000000, accountState: 'debtor', accountStateLabel: 'بدهکار' }] : [], phones: customerQuery ? [] : [{ id: 7, model: 'آیفون ۱۵ پرو مکس', imei: '356789012345678', color: 'مشکی', storage: '256', ram: '8', status: 'موجود در انبار', salePrice: 987654321 }], invoices: [], installments: [] } }, requestId: 'staff-search' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/customers/12') {
      await json(request, { success: true, data: { customer: { customerId: 12, fullName: 'کیان رضایی', phoneNumber: '09121234567', balance: 15000000, accountState: 'debtor', accountStateLabel: 'بدهکار' }, installments: { activeCount: 1, overdueCount: 1, nextDue: { saleId: 41, dueDate: '1405/05/20', amount: 2500000 } }, recentPurchases: [{ date: '2026-08-10', type: 'cash', itemSummary: 'آیفون ۱۵ پرو مکس', total: 987654321, invoiceRef: 'order-21' }], recentLedger: [{ date: '2026-08-11', description: 'دریافت از مشتری', debit: 0, credit: 5000000, runningBalance: 15000000 }] }, requestId: 'staff-customer' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/phones') {
      await json(request, { success: true, data: { query: url.searchParams.get('q') || '', page: 1, limit: 20, items: [{ id: 7, model: 'آیفون ۱۵ پرو مکس', imei: '356789012345678', color: 'مشکی', storage: '256', ram: '8', status: 'موجود در انبار', salePrice: 987654321 }] }, requestId: 'staff-phones' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/phones/7') {
      await json(request, { success: true, data: { id: 7, model: 'آیفون ۱۵ پرو مکس', imei: '356789012345678', color: 'مشکی', storage: '256', ram: '8', status: 'فروخته شده', salePrice: 987654321, condition: 'نو', purchasePrice: 765432109, currentPurchasePrice: 800000000, supplierName: 'همکار آزمایشی', purchaseDate: '2026-08-01', sale: { source: 'order', ref: 'order-21', date: '2026-08-10', customer: { id: 12, fullName: 'کیان رضایی', phoneNumber: '09121234567' } } }, requestId: 'staff-phone' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/installments/due') {
      const scope = url.searchParams.get('scope') || 'overdue';
      await json(request, { success: true, data: { scope, page: 1, pageSize: 20, total: 1, totalPages: 1, items: [{ paymentId: scope === 'today' ? 2 : scope === 'next7' ? 3 : 1, saleId: 41, customerId: 12, customerName: 'کیان رضایی', customerPhone: '09121234567', dueDate: scope === 'today' ? '1405/05/20' : scope === 'next7' ? '1405/05/23' : '1405/05/10', remainingAmount: 98765432, status: scope === 'today' ? 'today' : scope === 'next7' ? 'upcoming' : 'overdue', overdueDays: scope === 'overdue' ? 10 : 0 }] }, requestId: `staff-due-${scope}` });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/installments/41') {
      await json(request, { success: true, data: { saleId: 41, customer: { id: 12, fullName: 'کیان رضایی' }, saleDate: '1405/05/01', itemSummary: 'آیفون اقساطی', items: [{ description: 'آیفون ۱۵ پرو مکس', quantity: 1, unitPrice: 987654321, total: 987654321 }], actualSalePrice: 987654321, downPayment: 123456789, totalInstallmentCount: 10, paidAmount: 223456789, remainingAmount: 764197532, paymentTimeline: [{ paymentId: 2, installmentNumber: 1, dueDate: '1405/05/20', amount: 98765432, paidAmount: 0, remainingAmount: 98765432, paymentDate: null, status: 'today' }], checks: [], status: 'در حال پرداخت' }, requestId: 'staff-installment' });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/miniapp/staff/sales-summary') {
      const period = url.searchParams.get('period') || 'today';
      await json(request, { success: true, data: { period, from: period === 'month' ? '1405/05/01' : '1405/05/20', to: '1405/05/20', totalRevenue: period === 'month' ? 22345678901 : 1234567890, grossProfit: period === 'month' ? 3456789012 : 234567890, totalTransactions: period === 'month' ? 48 : 7, averageSaleValue: 176366841, topSellingItems: [{ id: 7, itemType: 'phone', itemName: 'آیفون ۱۵ پرو مکس', totalRevenue: 9876543210, quantitySold: 5 }] }, requestId: `staff-sales-${period}` });
      return;
    }
    await request.continue();
  });
  await staffPage.setViewport({ width: 360, height: 800, deviceScaleFactor: 1 });
  await staffPage.goto(`${origin}/miniapp.html`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await staffPage.waitForSelector('nav[aria-label="ناوبری مدیریتی"]', { timeout: 10_000 });
  await staffPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('وضعیت واقعی فروشگاه'));
  await assertResponsiveWidths(staffPage, 'Staff Home');

  await staffPage.click('a[href="#/search"]');
  await staffPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('جستجوی مدیریتی'));
  assert.match(await staffPage.$eval('main', (element) => element.textContent || ''), /حداقل یک عبارت/);
  await assertResponsiveWidths(staffPage, 'Staff Search empty');
  const searchInput = 'main input';
  await staffPage.type(searchInput, 'کیان');
  await staffPage.waitForFunction(() => document.querySelector('main')?.textContent?.includes('کیان رضایی'));
  await assertResponsiveWidths(staffPage, 'Staff Search Customer');
  await staffPage.click('a[href="#/customers/12"]');
  await staffPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('کیان رضایی'));
  await assertResponsiveWidths(staffPage, 'Staff Customer detail');
  await staffPage.evaluate(() => { window.location.hash = '#/search'; });
  await staffPage.waitForSelector(searchInput);
  await staffPage.$eval(searchInput, (element) => { element.value = ''; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await staffPage.type(searchInput, '356789012345678');
  await staffPage.waitForFunction(() => document.querySelector('main')?.textContent?.includes('IMEI: 356789012345678'));
  await assertResponsiveWidths(staffPage, 'Staff Search IMEI');

  await staffPage.click('a[href="#/inventory"]');
  await staffPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('موجودی گوشی'));
  await assertResponsiveWidths(staffPage, 'Staff Inventory search');
  await staffPage.click('a[href="#/phones/7"]');
  await staffPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('آیفون ۱۵ پرو مکس'));
  await assertResponsiveWidths(staffPage, 'Staff Phone detail');

  await staffPage.click('a[href="#/dues"]');
  await staffPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('مرکز سررسیدها'));
  await assertResponsiveWidths(staffPage, 'Staff Due Overdue');
  await staffPage.$$eval('main button', (buttons) => buttons.find((button) => button.textContent?.includes('امروز'))?.click());
  await staffPage.waitForFunction(() => document.querySelector('main')?.textContent?.includes('1405/05/20'));
  await assertResponsiveWidths(staffPage, 'Staff Due Today');
  await staffPage.$$eval('main button', (buttons) => buttons.find((button) => button.textContent?.includes('۷ روز'))?.click());
  await staffPage.waitForFunction(() => document.querySelector('main')?.textContent?.includes('1405/05/23'));
  await assertResponsiveWidths(staffPage, 'Staff Due Next 7');

  await staffPage.evaluate(() => { window.location.hash = '#/sales'; });
  await staffPage.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('خلاصه فروش'));
  await assertResponsiveWidths(staffPage, 'Staff Sales Today');
  await staffPage.$$eval('main button', (buttons) => buttons.find((button) => button.textContent?.includes('ماه جاری'))?.click());
  await staffPage.waitForFunction(() => document.querySelector('main')?.textContent?.includes('۲۲٬۳۴۵٬۶۷۸٬۹۰۱'));
  await assertResponsiveWidths(staffPage, 'Staff Sales Month');
  assert.deepEqual(staffErrors, [], `Staff browser page errors: ${staffErrors.join('\n')}`);
  assert.deepEqual(staffConsoleErrors, [], `Staff browser console errors: ${staffConsoleErrors.join('\n')}`);
  assert.ok(observedApiRequests.length > 0, 'Browser runtime must exercise Mini App APIs.');
  assert.equal(observedApiRequests.some((url) => /localhost:3001|127\.0\.0\.1:3001|192\.168\.|10\./.test(url)), false);

  const runtimeLabel = externalOrigin ? 'external same-origin runtime' : useDevelopmentServer ? 'Vite development runtime' : 'Vite preview runtime';
  console.log(`Customer/Partner and Staff v150 ${runtimeLabel} Home/Search/Customer/Inventory/Phone/Dues/Sales browser checks passed at 360px, 390px, and 430px.`);
} finally {
  await browser.close();
  preview?.kill('SIGTERM');
}
