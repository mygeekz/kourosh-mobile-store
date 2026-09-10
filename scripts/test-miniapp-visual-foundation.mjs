// Built Mini App + synthetic API/Telegram fixtures only. No production traffic.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';

const dist = path.resolve('dist-miniapp');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-visual-phase1-'));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(dist, '.' + pathname);
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  try { const body = await fs.readFile(file); res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const name = 'فروشگاه آزمایشی کوروش — نام بلند برای بررسی خوانایی فارسی';
const amount = 1234567890123;
const now = new Date().toISOString();
const emptyPage = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
const permissions = ['dashboard.read', 'customers.read', 'partners.read', 'installments.read', 'inventory.read', 'repairs.read', 'sales.read', 'profits.read'];
const fixtures = {
  '/api/miniapp/manager/dashboard': { generatedAt: now, widgets: {
    sales: { todayAmount: amount, todayTransactions: 24, averageSaleValue: 5000000 },
    profit: { todayGrossProfit: -123456789 },
    customerReceivables: { debtorsCount: 4, totalReceivables: amount, creditorsCount: 0, totalCustomerCredit: 0 },
    installments: { overdueCount: 3, overdueAmount: 25000000, dueTodayCount: 2, dueTodayAmount: 5000000, next7Count: 0, next7Amount: 0 },
    inventory: { activeItemsCount: 148 },
  } },
  '/api/miniapp/partner/home': {
    partner: { id: 1, name, type: 'supplier' },
    account: { signedBalance: -amount, code: 'creditor', label: 'بستانکار از فروشگاه', amount },
    ledger: { total: 0, lastActivity: now, recent: [] },
    supplied: { total: 0, phones: 0, products: 0, totalSupplyAmount: 0 },
    phoneSettlement: { total: 0, open: 0, settled: 0, amount: 0, paidAmount: 0, remainingAmount: 0 },
  },
  '/api/miniapp/partner/phones': { ...emptyPage, summary: { total: 0, amount: 0, paidAmount: 0, remainingAmount: 0 } },
  '/api/miniapp/partner/purchases': emptyPage,
  '/api/miniapp/customer/home': {
    customer: { id: 1, fullName: name },
    account: { signedBalance: 24000000, code: 'debtor', label: 'بدهکار', amount: 24000000 },
    installments: { activeCount: 1, overdueCount: 0, next: { saleId: 1, dueDate: now, amount: 2000000 } }, lastPurchase: null,
  },
};
const results = [];
const capture = async (page, file) => {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Screenshot overflow: ${file}`);
  // Short state screens fit the viewport; avoid Chromium's stale full-page
  // content bounds after switching from a long RTL dashboard to an error.
  await page.screenshot({ path: path.join(output, file), fullPage: !/^(error|loading)-/.test(file) });
};
try {
  const executable = await resolvePuppeteerBrowserExecutable({ root: process.cwd() });
  browser = await puppeteer.launch({ executablePath: executable.executablePath, args: browserLaunchArgs(), headless: true });
  for (const role of ['staff', 'partner', 'customer']) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    const errors = [];
    const unexpected = [];
    page.on('pageerror', e => errors.push(e.message));
    let mode = 'live';
    let retries = 0;
    await page.evaluateOnNewDocument(theme => {
      const noop = () => {};
      window.Telegram = { WebApp: {
        initData: 'synthetic-ui-fixture', colorScheme: theme, themeParams: {}, version: '9.0', platform: 'android',
        safeAreaInset: { top: 24, bottom: 20, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
        BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
        expand: noop, ready: noop, onEvent: noop, offEvent: noop,
      } };
    }, theme);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.origin !== origin) { await request.respond({ status: 200, contentType: 'application/javascript', body: '' }); return; }
      if (!url.pathname.startsWith('/api/')) { await request.continue(); return; }
      const headers = { 'x-kourosh-data-source': mode === 'snapshot' ? 'snapshot' : 'live', 'x-kourosh-snapshot-generated-at': now, 'x-kourosh-snapshot-received-at': now };
      const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
      if (url.pathname === '/api/miniapp/auth') {
        await respond({ success: true, data: { sessionToken: 'synthetic-session', expiresAt: new Date(Date.now() + 600000).toISOString(), identity: { kind: role, roleName: 'Admin', subjectId: 1, telegramUserId: '1', displayName: name, capabilities: [], permissions: role === 'staff' ? permissions : [] }, launch: { startParam: null, route: '/' } } }); return;
      }
      if (!Object.hasOwn(fixtures, url.pathname)) { unexpected.push(url.pathname); await respond({ success: false, message: 'Unexpected fixture route' }, 404); return; }
      if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 700));
      if (mode === 'error') { retries++; await respond({ success: false, code: 'FIXTURE_ERROR', message: 'دریافت اطلاعات آزمایشی انجام نشد. دوباره تلاش کنید.' }, 503); return; }
      await respond({ success: true, data: fixtures[url.pathname] });
    });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(origin + '/miniapp.html');
    await page.waitForSelector('nav');
    await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]') && document.querySelector('main h1'));
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 360, 390, 430]) {
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        money: [...document.querySelectorAll('.miniapp-money')].map(el => ({ width: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).textOverflow, value: el.textContent })),
        nav: [...document.querySelectorAll('nav a')].map(el => el.getBoundingClientRect().height),
        parts: [...document.querySelectorAll('.miniapp-money-part')].map(el => ({ width: el.getBoundingClientRect().width, parent: el.parentElement.clientWidth })),
      }));
      assert.ok(layout.scroll <= layout.viewport, `${role}/${theme} horizontal overflow at ${width}: ${JSON.stringify(layout)}`);
      for (const value of layout.money) { assert.ok(value.scroll <= value.width + 1); assert.notEqual(value.overflow, 'ellipsis'); }
      assert.ok(layout.nav.every(height => height >= 44));
      assert.ok(layout.parts.every(part => part.width <= part.parent + 1), 'A financial number must fit without splitting its digits');
    }
    const contrast = await page.evaluate(() => {
      const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = xs => xs.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
      const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const root = document.querySelector('#miniapp-root');
      const s = getComputedStyle(root);
      const canvas = luminance(rgb(s.backgroundColor));
      const sample = document.createElement('span'); sample.className = 'text-mutedText'; root.append(sample);
      const muted = luminance(rgb(getComputedStyle(sample).color)); sample.remove();
      const hero = document.querySelector('.miniapp-hero');
      const description = hero?.querySelector('p');
      let heroDescription = null;
      if (description) {
        const bg = rgb(getComputedStyle(hero).backgroundColor);
        const color = getComputedStyle(description).color.match(/[\d.]+/g).map(Number);
        const alpha = color[3] ?? 1;
        heroDescription = ratio(luminance(color.slice(0, 3).map((c, i) => c * alpha + bg[i] * (1 - alpha))), luminance(bg));
      }
      return { primary: ratio(luminance(rgb(s.color)), canvas), muted: ratio(muted, canvas), heroDescription, inset: getComputedStyle(document.querySelector('.miniapp-screen')).paddingTop };
    });
    assert.ok(contrast.primary >= 4.5 && contrast.muted >= 4.5, JSON.stringify(contrast));
    assert.equal(contrast.inset, '24px');
    if (contrast.heroDescription !== null) assert.ok(contrast.heroDescription >= 4.5, 'Hero description contrast');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await capture(page, `${role}-${theme}.png`);
    await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${role} landscape/text enlargement overflow`);
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    if (role === 'staff' && theme === 'dark') {
      await page.setViewport({ width: 390, height: 844 });
      mode = 'error'; await page.reload(); await page.waitForSelector('main [role="alert"]');
      await capture(page, 'error-dark.png');
      const count = retries; mode = 'live'; await page.click('.miniapp-button');
      await page.waitForSelector('.miniapp-money'); assert.equal(retries, count);
      mode = 'loading'; await page.reload(); await page.waitForSelector('main [aria-busy="true"]');
      await capture(page, 'loading-dark.png');
      await page.waitForSelector('.miniapp-money');
    }
    if (role === 'partner') {
      await page.setViewport({ width: 390, height: 844 });
      await page.evaluate(() => { location.hash = '/purchases'; });
      await page.waitForSelector('input');
      assert.ok(await page.$eval('input', el => Boolean(el.getAttribute('aria-label'))));
      const chips = await page.$$('button[aria-pressed]'); assert.ok(chips.length > 0);
      await chips[1].click(); assert.equal(await chips[1].evaluate(el => el.getAttribute('aria-pressed')), 'true');
      await capture(page, `empty-${theme}.png`);
      mode = 'snapshot'; await page.reload(); await page.waitForSelector('nav');
      await page.waitForFunction(() => document.body.innerText.includes('اتصال زنده برقرار نیست'));
      await capture(page, `snapshot-${theme}.png`);
    }
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    results.push({ role, theme, widths: [320, 360, 390, 430], contrast, status: 'PASS' });
    await page.close();
  }
  console.log(JSON.stringify({ results, screenshots: output, productionAccountsTested: false }, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
