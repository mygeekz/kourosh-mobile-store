import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { makeFixture, accounts, name, largeText, screens } from './fixtures/miniapp-customer-ui.mjs';

const dist = path.resolve('dist-miniapp');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-customer-phase5-'));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }).end(await fs.readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  const executable = await resolvePuppeteerBrowserExecutable({ root: process.cwd() });
  browser = await puppeteer.launch({ executablePath: executable.executablePath, args: browserLaunchArgs(), headless: true });
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    let launch = '/', mode = 'live', code = 'debtor';
    const errors = [], unexpected = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(theme => {
      const noop = () => {};
      window.Telegram = { WebApp: { initData: 'synthetic-customer-fixture', colorScheme: theme, themeParams: {}, version: '9.0', platform: 'android', safeAreaInset: { top: 24, bottom: 20, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 }, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, expand: noop, ready: noop, onEvent: noop, offEvent: noop } };
    }, theme);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.origin !== origin) return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      if (!url.pathname.startsWith('/api/')) return request.continue();
      requests.push({ path: url.pathname, query: url.search, method: request.method() });
      const headers = { 'x-kourosh-data-source': mode === 'snapshot' ? 'snapshot' : 'live', 'x-kourosh-snapshot-generated-at': new Date(Date.now() - 40 * 60000).toISOString(), 'x-kourosh-snapshot-received-at': new Date().toISOString() };
      const respond = (body, status = 200) => request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
      if (url.pathname === '/api/miniapp/auth') return respond({ success: true, data: { sessionToken: 'synthetic-session', expiresAt: new Date(Date.now() + 600000).toISOString(), identity: { kind: 'customer', subjectId: 1, telegramUserId: '1', displayName: name, capabilities: [], permissions: [] }, launch: { route: launch, startParam: null } } });
      const endpoint = url.pathname.replace('/api/miniapp/customer', '');
      const data = structuredClone(makeFixture(endpoint, code));
      if (!data) { unexpected.push(url.pathname); return respond({ success: false, message: 'Unexpected fixture' }, 404); }
      if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 900));
      if (mode === 'error' || mode === 'expired') return respond({ success: false, message: mode === 'expired' ? 'نشست شما منقضی شده است.' : 'دریافت اطلاعات آزمایشی انجام نشد.' }, mode === 'expired' ? 401 : 503);
      if (mode === 'unavailable') return respond({ success: true, data: null });
      if (mode === 'missing' && endpoint === '/account') { delete data.totalDebit; delete data.account.signedBalance; }
      if (mode === 'empty') {
        if (Array.isArray(data)) data.length = 0;
        if (data.entries) data.entries = [];
      }
      if ((mode === 'empty' || mode === 'cash') && endpoint === '/home') {
        data.installments = { activeCount: 0, overdueCount: 0, next: null };
        data.account = accounts.settled;
        if (mode === 'empty') data.lastPurchase = null;
      }
      if (mode === 'upcoming' && endpoint === '/home') data.installments.overdueCount = 0;
      return respond({ success: true, data });
    });
    const open = async route => {
      launch = route;
      await page.goto(origin + '/miniapp.html');
      // Auth may briefly render Home before applying its launch route.
      await page.waitForFunction(route => location.hash === '#' + route, {}, route);
      const title = route.startsWith('/invoices/') ? 'invoice' : route.startsWith('/installments/') ? 'installment-detail' : route === '/' ? 'customer-home' : route.slice(1);
      await page.waitForSelector(`main #${title}-title`);
      await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]'));
      await page.evaluate(() => document.fonts.ready);
    };
    const clickContentLink = async selector => {
      // Compact rows can leave a link geometrically inside the viewport but behind
      // the fixed dock. Scroll as a user would, then verify the actual hit target.
      await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(selector => {
        const el = document.querySelector(selector), r = el?.getBoundingClientRect();
        return r && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }, {}, selector);
      await page.click(selector);
    };
    const money = async (field, expected) => {
      await page.waitForSelector(`[data-field="${field}"]`);
      assert.equal(await page.$eval(`[data-field="${field}"]`, el => el.textContent), expected, `${theme}/${launch}/${field}`);
    };
    const checkLayout = async label => {
      const d = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        rtl: getComputedStyle(document.querySelector('#miniapp-root')).direction, top: getComputedStyle(document.querySelector('.miniapp-screen')).paddingTop,
        money: [...document.querySelectorAll('main .miniapp-money-part')].map(el => ({ width: el.getBoundingClientRect().width, parent: el.parentElement.clientWidth, direction: getComputedStyle(el).direction })),
        controls: [...document.querySelectorAll('main button, main a')].map(el => el.getBoundingClientRect().height),
        truncated: [...document.querySelectorAll('main strong')].some(el => getComputedStyle(el).textOverflow === 'ellipsis'),
      }));
      assert.ok(d.scroll <= d.width, `${label}: horizontal overflow`);
      assert.ok(d.money.every(el => el.width <= el.parent + 1 && el.direction === 'ltr'), `${label}: clipped money ${JSON.stringify(d.money)}`);
      assert.ok(d.controls.every(h => h >= 44), `${label}: touch target`);
      assert.equal(d.rtl, 'rtl'); assert.equal(d.top, '24px'); assert.equal(d.truncated, false);
    };
    for (const screen of screens) {
      await open(screen.route);
      for (const [field, expected] of Object.entries(screen.money)) await money(field, expected);
      assert.deepEqual(await page.$$eval('nav a', links => links.map(el => el.getAttribute('href'))), ['#/', '#/purchases', '#/installments', '#/account']);
      for (const width of [320, 360, 390, 430]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await checkLayout(`${theme}/${screen.name}/${width}`);
        if (width === 390) await page.screenshot({ path: path.join(output, `${screen.name}-${theme}.png`), fullPage: true });
      }
      await page.setViewport({ width: 320, height: 844 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      await checkLayout(`${theme}/${screen.name}/enlarged-320`);
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      results.push(`${theme}/${screen.name}: exact money, 4 widths, enlarged text PASS`);
    }
    for (const next of ['creditor', 'settled']) {
      code = next; await open('/account');
      await money('signedBalance', next === 'creditor' ? '-' + largeText : '۰ تومان');
      assert.ok((await page.$eval('main', el => el.innerText)).includes(next === 'creditor' ? 'بستانکاری شما از فروشگاه' : 'حساب شما تسویه است'));
    }
    code = 'debtor'; mode = 'missing'; await open('/account');
    assert.equal(await page.$('[data-field="totalDebit"]'), null); assert.equal(await page.$('[data-field="signedBalance"]'), null);
    assert.ok((await page.$eval('main', el => el.innerText)).includes('ثبت نشده'));
    mode = 'live'; await open('/installments/1?paymentId=7');
    await page.waitForSelector('[data-payment-id="7"][data-highlighted="true"]');
    await page.waitForFunction(() => { const r = document.querySelector('[data-highlighted]')?.getBoundingClientRect(); return r && r.top >= 0 && r.top < innerHeight - 100; });
    assert.equal(await page.$eval('nav a[aria-current]', el => el.getAttribute('href')), '#/installments');
    for (const [id, label] of [[6, 'پرداخت‌شده'], [7, 'عقب‌افتاده'], [8, 'سررسید امروز'], [9, 'آینده']]) assert.ok((await page.$eval(`[data-payment-id="${id}"]`, el => el.innerText)).includes(label));
    await page.screenshot({ path: path.join(output, `highlight-visible-${theme}.png`) });
    await open('/installments/1?paymentId=999'); assert.equal(await page.$('[data-highlighted]'), null);
    await open('/installments'); await clickContentLink('main a[href="#/installments/1"]'); await page.waitForSelector('[data-payment-id="6"]');
    await page.click('button[aria-label="بازگشت"]'); await page.waitForSelector('#installments-title');
    await open('/purchases');
    assert.ok(await page.$('main a[href="#/installments/3"]')); assert.equal(await page.$('main a[href="#/installments/4"]'), null);
    await clickContentLink('main a[href="#/invoices/order-1"]'); await money('grandTotal', '۹٬۸۷۶٬۵۴۳٬۲۱۰٫۲۵ تومان');
    assert.equal(await page.$eval('nav a[aria-current]', el => el.getAttribute('href')), '#/purchases');
    assert.ok((await page.$eval('main', el => el.innerText)).includes('INV-1405/ABC-001'));
    await page.click('button[aria-label="بازگشت"]'); await page.waitForSelector('#purchases-title');
    for (const next of ['empty', 'cash']) {
      mode = next; await open('/');
      assert.equal(await page.$('[data-field="nextAmount"]'), null);
      assert.equal(await page.$('main a[href="#/installments"]'), null);
      assert.ok(!(await page.$eval('main', el => el.innerText)).includes('قسطی برای پیگیری'));
      assert.equal(Boolean(await page.$('[data-field="purchase-1"]')), next === 'cash');
      await page.screenshot({ path: path.join(output, `${next}-home-${theme}.png`), fullPage: true });
    }
    mode = 'upcoming'; await open('/'); await money('nextAmount', '۷۵ تومان');
    assert.ok((await page.$eval('main', el => el.innerText)).includes('سررسید بعدی شما'));
    mode = 'empty';
    for (const route of ['/purchases', '/installments', '/account']) { await open(route); assert.equal(await page.$$eval('main [data-record]', els => els.length), 0); assert.equal(await page.$('main [role="alert"]'), null); }
    mode = 'snapshot'; await open('/'); await page.waitForFunction(() => document.body.innerText.includes('اتصال زنده برقرار نیست'));
    await page.screenshot({ path: path.join(output, `snapshot-${theme}.png`), fullPage: true });
    mode = 'live'; await open('/'); await page.waitForFunction(() => document.body.innerText.includes('اتصال زنده برقرار است'));
    mode = 'error'; await open('/purchases'); await page.waitForSelector('main [role="alert"]');
    assert.equal(await page.$('main [data-record]'), null);
    assert.ok(!(await page.$eval('main', el => el.innerText)).includes('هنوز خریدی'));
    await page.screenshot({ path: path.join(output, `error-${theme}.png`) });
    mode = 'live'; await page.click('main .miniapp-button'); await money('purchase-1', largeText);
    mode = 'unavailable'; await open('/account');
    assert.equal(await page.$('[data-field="signedBalance"]'), null);
    assert.ok((await page.$eval('main', el => el.innerText)).includes('در دسترس نیست'));
    mode = 'expired'; await open('/account'); await page.waitForSelector('main [role="alert"]');
    assert.equal(await page.evaluate(() => localStorage.getItem('kourosh-miniapp-session')), null);
    assert.equal(await page.$('[data-field="signedBalance"]'), null);
    mode = 'loading'; launch = '/'; await page.goto(origin + '/miniapp.html'); await page.waitForSelector('main [aria-busy="true"]');
    await page.screenshot({ path: path.join(output, `loading-${theme}.png`) }); await money('accountAmount', largeText);
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    assert.ok(requests.filter(r => r.path !== '/api/miniapp/auth').every(r => r.method === 'GET' && !r.query && r.path.startsWith('/api/miniapp/customer/')));
    results.push(`${theme}: first use, cash, supplied payment states, balances, missing values, deep links/back/highlight, retry, live/snapshot, unavailable/expired session PASS`);
    await page.close();
  }
  console.log(JSON.stringify({ status: 'PASS', results, screenshots: output, productionTraffic: false }, null, 2));
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
