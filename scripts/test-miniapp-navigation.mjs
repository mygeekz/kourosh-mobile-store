// Browser navigation tests use synthetic identities and local fixtures only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';

const dist = path.resolve('dist-miniapp');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-navigation-phase2-'));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(dist, '.' + pathname);
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); res.end(await fs.readFile(file)); }
  catch { res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const now = new Date().toISOString();
const name = 'فروشگاه آزمایشی کوروش';
const permissions = ['dashboard.read', 'sales.read', 'profits.read', 'customers.read', 'partners.read', 'installments.read', 'repairs.read', 'inventory.read'];
const empty = { items: [], total: 0, page: 1, pageSize: 30, totalPages: 0 };
const account = { code: 'settled', label: 'تسویه', amount: 0, signedBalance: 0 };
const partner = { partner: { id: 1, name, type: 'supplier' }, account, supplied: { total: 0, phones: 0, products: 0, totalSupplyAmount: 0 }, ledger: { total: 0, recent: [], lastActivity: now }, phoneSettlement: { total: 0, open: 0, settled: 0, amount: 0, paidAmount: 0, remainingAmount: 0 }, totalDebit: 0, totalCredit: 0 };
const fixtures = {
  '/api/miniapp/manager/dashboard': { generatedAt: now, widgets: { sales: { todayAmount: 24500000, todayTransactions: 12 }, profit: { todayGrossProfit: 3200000 }, inventory: { activeItemsCount: 148 } } },
  '/api/miniapp/manager/repairs': { ...empty, summary: { openCount: 0, readyForPickupCount: 0, waitingPartCount: 0 } },
  '/api/miniapp/manager/inventory/phones': { ...empty, items: [{ id: 1, model: 'Inventory fixture', imei: '123456789012345', status: 'موجود' }] },
  '/api/miniapp/manager/me': {},
  '/api/miniapp/manager/installments/due': { ...empty, items: [{ paymentId: 7, saleId: 1, customerName: name, dueDate: now, remainingAmount: 200000, status: 'due', overdueDays: 0 }] },
  '/api/miniapp/manager/customers': { ...empty, items: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, fullName: `${name} ${i + 1}`, phoneNumber: '09000000000', currentBalance: 0 })) },
  '/api/miniapp/manager/partners': { ...empty, items: [{ id: 1, name, currentBalance: 0 }] },
  '/api/miniapp/partner/home': partner,
  '/api/miniapp/partner/account': partner,
  '/api/miniapp/partner/phones': { ...empty, summary: partner.phoneSettlement },
  '/api/miniapp/partner/ledger': { ...empty, account, summary: { totalDebit: 0, totalCredit: 0, balance: 0 } },
  '/api/miniapp/partner/purchases': empty,
  '/api/miniapp/customer/home': { customer: { id: 1, fullName: name }, account, installments: { activeCount: 0, overdueCount: 0, next: null }, lastPurchase: null },
  '/api/miniapp/customer/account': { account, totalDebit: 0, totalCredit: 0, entries: [] },
  '/api/miniapp/customer/installments': [],
  '/api/miniapp/customer/purchases': [{ ref: 'sale:1', id: 1, transactionDate: now, itemsSummary: 'خرید آزمایشی', totalAmount: 100000, purchaseTypeLabel: 'نقدی', invoiceRef: 'sale:1' }],
};
const results = [];
let browser;
let activePage, activeScenario;
const scenarios = [
  { id: 'manager', role: 'staff', permissions },
  { id: 'manager-partner', role: 'staff', permissions, multi: true },
  { id: 'partner', role: 'partner' },
  { id: 'customer', role: 'customer' },
  { id: 'restricted', role: 'staff', permissions: ['inventory.read'] },
  { id: 'partner-directory', role: 'staff', permissions: ['partners.read'] },
  { id: 'repairs-only', role: 'staff', permissions: ['repairs.read'] },
  { id: 'notifications-only', role: 'staff', permissions: [] },
];
const navigate = async (page, route, expected = route) => {
  await page.evaluate(route => { window.location.hash = route; }, route);
  await page.waitForFunction(route => decodeURI(location.hash) === '#' + route, {}, expected);
  await page.waitForFunction(() => document.querySelector('.miniapp-shell-title'));
};
const active = page => page.$eval('nav a[aria-current="page"]', el => el.getAttribute('href'));
const screenshot = async (page, file) => {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  await page.screenshot({ path: path.join(output, file) });
};
try {
  const executable = await resolvePuppeteerBrowserExecutable({ root: process.cwd() });
  browser = await puppeteer.launch({ executablePath: executable.executablePath, args: browserLaunchArgs(), headless: true });
  for (const scenario of scenarios.filter(item => !process.env.MINIAPP_NAV_SCENARIO || item.id === process.env.MINIAPP_NAV_SCENARIO)) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    activePage = page; activeScenario = `${scenario.id}/${theme}`;
    const errors = [], requests = [];
    let currentRole = scenario.role, failSwitch = false, launch = '/', source = 'live';
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(theme => {
      const noop = () => {};
      window.__backHandlers = new Set();
      window.Telegram = { WebApp: {
        initData: 'synthetic-navigation-fixture', colorScheme: theme, themeParams: {}, version: '9.0', platform: 'android',
        safeAreaInset: { top: 24, bottom: 20, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
        BackButton: { show: noop, hide: noop, onClick: callback => window.__backHandlers.add(callback), offClick: callback => window.__backHandlers.delete(callback) },
        expand: noop, ready: noop, onEvent: noop, offEvent: noop,
      } };
    }, theme);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.origin !== origin) { await request.respond({ status: 200, contentType: 'application/javascript', body: '' }); return; }
      if (!url.pathname.startsWith('/api/')) { await request.continue(); return; }
      requests.push(url.pathname + url.search);
      const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', headers: { 'x-kourosh-data-source': source, 'x-kourosh-snapshot-generated-at': now }, body: JSON.stringify(data) });
      if (url.pathname === '/api/miniapp/auth') {
        const requested = JSON.parse(request.postData() || '{}').workspaceKind;
        if (requested && failSwitch) { await respond({ success: false, code: 'TEST_SWITCH_FAILED', message: 'تغییر فضای کاری آزمایشی انجام نشد.' }, 503); return; }
        if (requested) currentRole = requested === 'manager' ? 'staff' : requested;
        const kinds = scenario.multi ? ['manager', 'partner'] : [currentRole === 'staff' ? 'manager' : currentRole];
        await respond({ success: true, data: { sessionToken: 'synthetic-session', expiresAt: new Date(Date.now() + 600000).toISOString(), identity: {
          kind: currentRole, subjectId: 1, telegramUserId: '1', displayName: name, roleName: 'Admin', capabilities: [], permissions: currentRole === 'staff' ? scenario.permissions : [],
          workspaces: kinds.map(kind => ({ kind, subjectId: 1, displayName: name, capabilities: [], permissions: kind === 'manager' ? scenario.permissions : [] })),
        }, launch: { startParam: null, route: requested ? '/' : launch } } }); return;
      }
      if (Object.hasOwn(fixtures, url.pathname)) { await respond({ success: true, data: fixtures[url.pathname] }); return; }
      // Detail failures intentionally exercise shell navigation independently of data availability.
      await respond({ success: false, code: 'FIXTURE_DETAIL_ERROR', message: 'خطای آزمایشی جزئیات' }, 503);
    });
    await page.goto(origin + '/miniapp.html');
    await page.waitForSelector('nav a[aria-current="page"]');
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 360, 390, 430]) {
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
      const layout = await page.evaluate(() => {
        const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
        return { viewport: innerWidth, scroll: document.documentElement.scrollWidth, header: box(document.querySelector('.miniapp-shell-header')), dock: box(document.querySelector('nav')), controls: [...document.querySelectorAll('nav a, .miniapp-shell-header button')].filter(el => el.getClientRects().length).map(box), current: document.querySelectorAll('nav a[aria-current]').length };
      });
      assert.ok(layout.scroll <= width, JSON.stringify(layout));
      assert.equal(layout.header.y, 24);
      assert.ok(layout.dock.bottom <= 844);
      assert.equal(layout.current, 1);
      for (const control of layout.controls) { assert.ok(control.width >= 44 && control.height >= 48, JSON.stringify(control)); assert.ok(control.x >= 0 && control.right <= width); }
    }
    await screenshot(page, `${scenario.id}-${theme}.png`);
    if (scenario.id === 'manager') {
      await page.click('nav a[href="#/more"]'); await page.waitForSelector('#manager-more-title');
      assert.deepEqual(await page.$$eval('.miniapp-more-link', links => links.map(link => link.getAttribute('href'))), ['#/dues', '#/notifications']);
      await screenshot(page, `manager-more-${theme}.png`);
      await navigate(page, '/directory?type=customer&q=نام'); await page.waitForSelector('main a[href="#/customers/15"]');
      assert.equal(await page.$eval('input', el => el.value), 'نام');
      await page.$eval('main a[href="#/customers/15"]', el => el.scrollIntoView({ block: 'center' }));
      await page.waitForFunction(() => scrollY > 200);
      await new Promise(resolve => setTimeout(resolve, 100));
      const scroll = await page.evaluate(() => scrollY);
      await page.click('main a[href="#/customers/15"]'); await page.waitForSelector('main [role="alert"]');
      assert.equal(await active(page), '#/directory');
      assert.equal(await page.evaluate(() => window.__backHandlers.size), 1);
      await page.evaluate(() => [...window.__backHandlers][0]());
      await page.waitForSelector('main a[href="#/customers/15"]');
      assert.ok((await page.url()).endsWith('/directory?type=customer&q=%D9%86%D8%A7%D9%85'));
      await page.waitForFunction(value => Math.abs(scrollY - value) < 3, {}, scroll);
      const partnerSearch = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === '/api/miniapp/manager/partners' && url.searchParams.get('q') === 'همکار'; });
      await navigate(page, '/directory?type=partner&q=همکار');
      await partnerSearch;
      await page.waitForFunction(() => document.querySelector('main button[aria-pressed="true"]')?.textContent === 'همکاران');
      assert.equal(await page.$eval('input', el => el.value), 'همکار');
      await page.waitForSelector('main a[href="#/partners/1"]'); await page.locator('main a[href="#/partners/1"]').click();
      await page.waitForSelector('main [role="alert"]'); assert.equal(await active(page), '#/directory');
      await page.click('button[aria-label="بازگشت"]'); await page.waitForSelector('input');
      assert.equal(await page.$eval('input', el => el.value), 'همکار');
      await navigate(page, '/operations?tab=inventory&q=phone'); await page.waitForSelector('input');
      await page.waitForFunction(() => document.querySelector('main button[aria-pressed="true"]')?.textContent === 'موجودی');
      assert.equal(await page.$eval('input', el => el.value), 'phone');
      await page.click('main button[aria-pressed="false"]');
      await page.waitForFunction(() => location.hash.includes('tab=repairs'));
      assert.equal(await page.$eval('input', el => el.value), '');
      await page.goBack(); await page.waitForFunction(() => location.hash.includes('tab=inventory'));
      assert.equal(await page.$eval('input', el => el.value), 'phone');
      await navigate(page, '/dues?scope=next7'); await page.waitForSelector('main a[href="#/installments/1"]'); await page.click('main a[href="#/installments/1"]');
      await page.waitForSelector('main [role="alert"]'); assert.equal(await active(page), '#/more');
      await page.click('button[aria-label="بازگشت"]'); await page.waitForSelector('main a[href="#/installments/1"]'); assert.ok((await page.url()).endsWith('/dues?scope=next7'));
      for (const [route, parent] of [['/customers/1', '/directory?type=customer'], ['/partners/1', '/directory?type=partner'], ['/installments/1', '/dues']]) {
        launch = route; await page.reload(); await page.waitForSelector('main [role="alert"]'); await page.click('button[aria-label="بازگشت"]');
        await page.waitForFunction(parent => location.hash === '#' + parent, {}, parent);
      }
      source = 'snapshot'; launch = '/more'; await page.reload(); await page.waitForSelector('#manager-more-title');
      await page.waitForFunction(() => document.body.innerText.includes('اتصال زنده برقرار نیست'));
      await screenshot(page, `manager-snapshot-${theme}.png`);
    }
    if (scenario.multi) {
      await page.click('.miniapp-workspace-trigger'); await page.waitForSelector('dialog[open]');
      assert.equal(await page.$$eval('.miniapp-workspace-option', nodes => nodes.length), 2);
      assert.ok(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)));
      for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement))); }
      await screenshot(page, `workspace-picker-${theme}.png`);
      await page.keyboard.press('Escape'); assert.ok(await page.$eval('.miniapp-workspace-trigger', el => el === document.activeElement));
      await page.click('.miniapp-workspace-trigger'); failSwitch = true;
      await page.click('.miniapp-workspace-option[aria-pressed="false"]'); await page.waitForSelector('main [role="alert"]');
      assert.equal(await page.$eval('.miniapp-workspace-trigger', el => el.textContent.trim()), 'مدیریت فروشگاه');
      failSwitch = false; await page.click('.miniapp-workspace-trigger'); await page.click('.miniapp-workspace-option[aria-pressed="false"]');
      await page.waitForFunction(() => document.querySelector('.miniapp-workspace-trigger')?.textContent === 'حساب همکار');
      assert.equal(await page.$$eval('nav a', links => links.length), 4);
      await page.click('.miniapp-workspace-trigger'); await page.click('.miniapp-workspace-option[aria-pressed="false"]');
      await page.waitForFunction(() => document.querySelector('.miniapp-workspace-trigger')?.textContent === 'مدیریت فروشگاه');
    }
    if (scenario.id === 'partner') {
      assert.deepEqual(await page.$$eval('nav a', links => links.map(link => link.getAttribute('href'))), ['#/', '#/purchases', '#/phones', '#/account']);
      assert.equal(await page.$('.miniapp-workspace-trigger'), null);
      assert.equal(await page.$('.miniapp-shell-header a[href="#/more"]'), null);
      for (const [route, parent] of [['/ledger', '#/account'], ['/phones', '#/phones']]) { await navigate(page, route); await page.waitForFunction(parent => document.querySelector('nav [aria-current]')?.getAttribute('href') === parent, {}, parent); }
      await navigate(page, '/sales', '/'); await page.waitForFunction(() => location.hash === '#/');
      assert.ok(!requests.some(route => route.startsWith('/api/miniapp/manager/')));
    }
    if (scenario.id === 'customer') {
      await navigate(page, '/purchases'); await page.waitForSelector('main a[href="#/invoices/sale:1"]'); await page.click('main a[href="#/invoices/sale:1"]');
      await page.waitForSelector('main [role="alert"]'); assert.equal(await active(page), '#/purchases');
      await page.click('button[aria-label="بازگشت"]'); await page.waitForSelector('#purchases-title');
      launch = '/installments/1?paymentId=7'; await page.reload(); await page.waitForSelector('main [role="alert"]'); assert.equal(await active(page), '#/installments');
      assert.ok((await page.url()).includes('paymentId=7'));
      await page.click('button[aria-label="بازگشت"]'); await page.waitForFunction(() => location.hash === '#/installments');
      await navigate(page, '/more', '/'); await page.waitForFunction(() => location.hash === '#/');
      assert.ok(!requests.some(route => /\/api\/miniapp\/(manager|partner)\//.test(route)));
    }
    if (scenario.id === 'restricted' || scenario.id === 'repairs-only') {
      assert.deepEqual(await page.$$eval('nav a', links => links.map(link => link.getAttribute('href'))), ['#/operations', '#/more']);
      await navigate(page, '/operations?tab=' + (scenario.id === 'restricted' ? 'repairs' : 'inventory'));
      await page.waitForSelector('input');
      assert.ok((await page.$eval('input', el => el.placeholder)).includes(scenario.id === 'restricted' ? 'IMEI' : 'مشتری'));
      await page.click('nav a[href="#/more"]'); await page.waitForSelector('#manager-more-title');
      assert.deepEqual(await page.$$eval('.miniapp-more-link', links => links.map(link => link.getAttribute('href'))), ['#/notifications']);
      assert.ok(!requests.some(route => route.startsWith(scenario.id === 'restricted' ? '/api/miniapp/manager/repairs' : '/api/miniapp/manager/inventory')));
      await navigate(page, '/sales', '/operations');
      assert.ok(!requests.some(route => route.startsWith('/api/miniapp/manager/sales')));
    }
    if (scenario.id === 'partner-directory') {
      assert.deepEqual(await page.$$eval('nav a', links => links.map(link => link.getAttribute('href'))), ['#/directory', '#/more']);
      await navigate(page, '/directory?type=customer'); await page.waitForSelector('input');
      assert.ok((await page.$eval('input', el => el.placeholder)).includes('همکار'));
      assert.ok(!requests.some(route => route.startsWith('/api/miniapp/manager/customers')));
    }
    if (scenario.id === 'notifications-only') {
      assert.deepEqual(await page.$$eval('nav a', links => links.map(link => link.getAttribute('href'))), ['#/more']);
      assert.equal(await active(page), '#/more');
      await page.waitForSelector('#manager-more-title');
      assert.deepEqual(await page.$$eval('.miniapp-more-link', links => links.map(link => link.getAttribute('href'))), ['#/notifications']);
      assert.ok(!requests.some(route => route.startsWith('/api/miniapp/manager/')));
    }
    await page.setViewport({ width: 844, height: 390 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; document.documentElement.style.setProperty('--tg-safe-area-inset-left', '44px'); document.documentElement.style.setProperty('--tg-safe-area-inset-right', '44px'); });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    results.push({ scenario: scenario.id, theme, status: 'PASS', widths: [320, 360, 390, 430] });
    console.log(`PASS ${scenario.id}/${theme}`);
    await page.close();
  }
  console.log(JSON.stringify({ results, screenshots: output, productionAccountsTested: false }, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: path.join(output, 'failure.png') });
    console.error(JSON.stringify({ scenario: activeScenario, screenshots: output, state: await activePage.evaluate(() => ({ route: location.hash, text: document.body.innerText.slice(0, 1000) })) }));
  }
  throw error;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
