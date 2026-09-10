import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { makeFixture, name, largeText, negativeText, screens } from './fixtures/miniapp-partner-ui.mjs';

const dist = path.resolve('dist-miniapp');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-partner-phase4-'));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end();
  try { const body = await fs.readFile(file); res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }).end(body); }
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
    let launch = '/', mode = 'live', code = 'creditor', failMore = false, appendSnapshot = false;
    const errors = [], unexpected = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(theme => {
      const noop = () => {};
      window.Telegram = { WebApp: { initData: 'synthetic-partner-fixture', colorScheme: theme, themeParams: {}, version: '9.0', platform: 'android', safeAreaInset: { top: 24, bottom: 20, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 }, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, expand: noop, ready: noop, onEvent: noop, offEvent: noop } };
    }, theme);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.origin !== origin) return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      if (!url.pathname.startsWith('/api/')) return request.continue();
      const currentPage = Number(url.searchParams.get('page') || 1);
      requests.push({ path: url.pathname, page: currentPage, query: url.search, method: request.method() });
      const source = mode === 'snapshot' || appendSnapshot && currentPage > 1 ? 'snapshot' : 'live';
      const headers = { 'x-kourosh-data-source': source, 'x-kourosh-snapshot-generated-at': new Date(Date.now() - 40 * 60000).toISOString(), 'x-kourosh-snapshot-received-at': new Date().toISOString() };
      const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
      if (url.pathname === '/api/miniapp/auth') return respond({ success: true, data: { sessionToken: 'synthetic-session', expiresAt: new Date(Date.now() + 600000).toISOString(), identity: { kind: 'partner', subjectId: 1, telegramUserId: '1', displayName: name, capabilities: [], permissions: [] }, launch: { route: launch, startParam: null } } });
      const endpoint = url.pathname.replace('/api/miniapp/partner', '');
      let data = structuredClone(makeFixture(endpoint, code));
      if (!data) { unexpected.push(url.pathname); return respond({ success: false, message: 'Unexpected fixture' }, 404); }
      if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 900));
      if (mode === 'error' || failMore && currentPage > 1) return respond({ success: false, message: 'دریافت اطلاعات آزمایشی انجام نشد.' }, 503);
      if (mode === 'unavailable') return respond({ success: true, data: null });
      if (data.items) {
        if (mode === 'empty') { data.items = []; data.total = 0; data.totalPages = 1; }
        if (currentPage > 1) {
          // Deliberate overlap verifies stable IDs/deduplication across responses.
          const first = data.items[0];
          data.items = [first, { ...first, ...(first.id ? { id: 4, description: 'رکورد صفحه دوم' } : { ref: 'phone-4', name: 'کالای صفحه دوم' }) }];
        }
        data.page = currentPage;
      }
      if (mode === 'missing' && endpoint === '/account') { delete data.totalDebit; delete data.account.signedBalance; }
      return respond({ success: true, data });
    });
    const open = async route => { launch = route; await page.goto(origin + '/miniapp.html'); await page.waitForSelector('main h1'); await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]')); await page.evaluate(() => document.fonts.ready); };
    const clickText = async text => {
      await page.waitForFunction(text => [...document.querySelectorAll('main button')].some(el => el.textContent === text && !el.disabled), {}, text);
      await page.evaluate(text => [...document.querySelectorAll('main button')].find(el => el.textContent === text && !el.disabled).click(), text);
    };
    for (const screen of screens) {
      await open(screen.route);
      for (const [field, expected] of Object.entries(screen.money)) { await page.waitForSelector(`[data-field="${field}"]`); assert.equal(await page.$eval(`[data-field="${field}"]`, el => el.textContent), expected, `${theme}/${screen.name}/${field}`); }
      assert.deepEqual(await page.$$eval('nav a', links => links.map(el => el.getAttribute('href'))), ['#/', '#/purchases', '#/phones', '#/account']);
      if (screen.route === '/more') assert.ok(page.url().endsWith('#/account'));
      for (const width of [320, 360, 390, 430]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
          rtl: getComputedStyle(document.querySelector('#miniapp-root')).direction, top: getComputedStyle(document.querySelector('.miniapp-screen')).paddingTop,
          money: [...document.querySelectorAll('main .miniapp-money-part')].map(el => ({ width: el.getBoundingClientRect().width, parent: el.parentElement.clientWidth, direction: getComputedStyle(el).direction })),
          controls: [...document.querySelectorAll('main button, main input, main a')].map(el => el.getBoundingClientRect().height),
          truncated: [...document.querySelectorAll('main strong')].some(el => getComputedStyle(el).textOverflow === 'ellipsis'),
        }));
        assert.ok(layout.scroll <= layout.width, `${theme}/${screen.name}/${width}: horizontal overflow`);
        assert.ok(layout.money.every(el => el.width <= el.parent + 1 && el.direction === 'ltr'), `${theme}/${screen.name}/${width}: clipped or ambiguous money ${JSON.stringify(layout.money)}`);
        assert.ok(layout.controls.every(height => height >= 44)); assert.equal(layout.rtl, 'rtl'); assert.equal(layout.top, '24px'); assert.equal(layout.truncated, false);
        if (width === 390) await page.screenshot({ path: path.join(output, `${screen.name}-${theme}.png`), fullPage: true });
      }
      results.push(`${theme}/${screen.name}: exact amounts and 4 widths PASS`);
    }
    for (const next of ['debtor', 'settled']) for (const route of ['/', '/account', '/ledger']) {
      code = next; await open(route); await page.waitForSelector('[data-field="signedBalance"]');
      assert.equal(await page.$eval('[data-field="signedBalance"]', el => el.textContent), next === 'debtor' ? negativeText : '۰ تومان');
      assert.ok((await page.$eval('main', el => el.innerText)).includes(next === 'debtor' ? 'شما به فروشگاه بدهکار هستید' : 'حساب شما تسویه است'));
    }
    code = 'creditor'; mode = 'missing'; await open('/account');
    assert.equal(await page.$('[data-field="totalDebit"]'), null); assert.equal(await page.$('[data-field="signedBalance"]'), null);
    mode = 'live';
    // First load, failed append, retry same page, deduplication and mixed provenance.
    for (const route of ['/ledger', '/purchases', '/phones']) {
      requests.length = 0; appendSnapshot = false; failMore = false; await open(route);
      await page.waitForSelector('main [data-record]');
      assert.equal(await page.$$eval('main [data-record]', els => els.length), 3);
      failMore = true; await clickText('نمایش موارد بیشتر'); await page.waitForSelector('main [role="alert"]');
      assert.equal(await page.$$eval('main [data-record]', els => els.length), 3);
      assert.equal(await page.$('main [data-partner-snapshot-note]'), null);
      await page.screenshot({ path: path.join(output, `load-more-error-${route.slice(1)}-${theme}.png`), fullPage: true });
      failMore = false; appendSnapshot = true; await clickText('تلاش دوباره برای موارد بیشتر');
      await page.waitForFunction(() => document.querySelectorAll('main [data-record]').length === 4);
      assert.ok(await page.$('main [data-partner-snapshot-note]'));
      assert.ok((await page.$eval('main', el => el.innerText)).includes('صفحه ۲: اطلاعات همگام‌شده'));
      assert.deepEqual(requests.filter(r => r.path.endsWith(route)).map(r => r.page), [1, 2, 2]);
      assert.ok(requests.filter(r => r.path.endsWith(route)).every(r => r.query.includes('pageSize=20') && r.method === 'GET'));
      assert.equal(await page.$('main [role="alert"]'), null);
    }
    appendSnapshot = false;
    await open('/purchases?q=صفحه'); await page.waitForSelector('input');
    assert.equal(await page.$$eval('main [data-record]', els => els.length), 0);
    assert.ok((await page.$eval('main', el => el.innerText)).includes('فقط روی'));
    await clickText('نمایش موارد بیشتر'); await page.waitForSelector('main [data-record="phone-4"]');
    // Account -> ledger -> back, and legacy links stay inside Partner.
    await open('/account'); await page.click('main a[href="#/ledger"]'); await page.waitForSelector('#partner-ledger-title');
    assert.equal(await page.$eval('nav a[aria-current]', el => el.getAttribute('href')), '#/account');
    await page.click('button[aria-label="بازگشت"]'); await page.waitForSelector('#partner-account-title');
    mode = 'snapshot'; await open('/'); await page.waitForFunction(() => document.body.innerText.includes('اتصال زنده برقرار نیست'));
    await page.screenshot({ path: path.join(output, `snapshot-${theme}.png`), fullPage: true });
    mode = 'empty'; await open('/purchases'); assert.equal(await page.$$eval('main [data-record]', els => els.length), 0);
    assert.ok((await page.$eval('main', el => el.innerText)).includes('کالایی در اطلاعات دریافت‌شده'));
    await page.screenshot({ path: path.join(output, `empty-${theme}.png`) });
    mode = 'error'; await open('/phones'); await page.waitForSelector('main [role="alert"]');
    assert.ok(!(await page.$eval('main', el => el.innerText)).includes('گوشی‌ای در اطلاعات دریافت‌شده'));
    mode = 'live'; await page.click('main .miniapp-button'); await page.waitForSelector('[data-field="summaryAmount"]');
    mode = 'unavailable'; await open('/account');
    assert.equal(await page.$('[data-field="signedBalance"]'), null);
    assert.ok((await page.$eval('main', el => el.innerText)).includes('در دسترس نیست'));
    mode = 'loading'; launch = '/'; await page.goto(origin + '/miniapp.html'); await page.waitForSelector('main [aria-busy="true"]');
    await page.screenshot({ path: path.join(output, `loading-${theme}.png`) }); await page.waitForSelector('[data-field="signedBalance"]');
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []); assert.ok(!requests.some(r => r.path.includes('/manager/') || r.path.includes('/customer/')));
    results.push(`${theme}: direction, missing/zero, all settlement amounts, append/retry/dedup, loaded search, provenance, errors and navigation PASS`);
    await page.close();
  }
  console.log(JSON.stringify({ status: 'PASS', results, screenshots: output, productionTraffic: false }, null, 2));
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
