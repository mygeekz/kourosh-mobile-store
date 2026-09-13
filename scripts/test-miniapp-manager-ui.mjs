// Local browser validation of the built bundle. All accounts and API responses are synthetic.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { fixtures, permissions, name, screens } from './fixtures/miniapp-manager-ui.mjs';

const dist = path.resolve('dist-miniapp');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-manager-phase3-'));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end();
  try { const body = await fs.readFile(file); res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const results = [];
let browser;
try {
  const executable = await resolvePuppeteerBrowserExecutable({ root: process.cwd() });
  browser = await puppeteer.launch({ executablePath: executable.executablePath, args: browserLaunchArgs(), headless: true });
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    let launch = '/', mode = 'live', allowed = [...permissions], read = false, actionFails = false, numericAmount = null;
    const errors = [], unexpected = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(theme => {
      const noop = () => {};
      window.Telegram = { WebApp: { initData: 'synthetic-manager-ui', colorScheme: theme, themeParams: {}, version: '9.0', platform: 'android', safeAreaInset: { top: 24, bottom: 20, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 }, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, expand: noop, ready: noop, onEvent: noop, offEvent: noop } };
    }, theme);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.origin !== origin) return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      if (!url.pathname.startsWith('/api/')) return request.continue();
      requests.push({ path: url.pathname, query: url.search, method: request.method() });
      const headers = { 'x-kourosh-data-source': mode === 'snapshot' ? 'snapshot' : 'live', 'x-kourosh-snapshot-generated-at': new Date(Date.now() - 40 * 60000).toISOString(), 'x-kourosh-snapshot-received-at': new Date().toISOString() };
      const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
      if (url.pathname === '/api/miniapp/auth') return respond({ success: true, data: { sessionToken: 'synthetic-session', expiresAt: new Date(Date.now() + 600000).toISOString(), identity: { kind: 'staff', roleName: 'Admin', subjectId: 1, telegramUserId: '1', displayName: name, capabilities: [], permissions: allowed }, launch: { route: launch, startParam: null } } });
      if (request.method() === 'POST' && /\/notifications\/(1\/read|read-all)$/.test(url.pathname)) {
        if (actionFails) return respond({ success: false, message: 'ثبت آزمایشی انجام نشد.' }, 503);
        read = true; return respond({ success: true, data: {} });
      }
      const key = url.pathname.replace('/api/miniapp/manager', '');
      if (!(key in fixtures)) { unexpected.push(key); return respond({ success: false, message: 'Unexpected fixture route' }, 404); }
      if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 1000));
      if (mode === 'error') return respond({ success: false, message: 'دریافت اطلاعات آزمایشی انجام نشد.' }, 503);
      let data = structuredClone(fixtures[key]);
      if (key === '/dashboard' && numericAmount !== null) data.widgets.sales.todayAmount = numericAmount;
      if (mode === 'empty') {
        if (Array.isArray(data)) data = [];
        else { if (data.items) { data.items = []; data.total = 0; data.totalPages = 1; } if (data.widgets) data.widgets = {}; }
      }
      if ('page' in data && mode !== 'snapshot') { data.page = Number(url.searchParams.get('page') || 1); if (data.page > 1) data.items = data.items.map(item => ({ ...item, id: item.id ? item.id + 30 : undefined, fullName: item.fullName ? 'مشتری صفحه دوم' : undefined })); }
      if (key === '/sales-summary') data.period = url.searchParams.get('period') || 'today';
      if (key === '/notifications' && read) { data.unreadCount = 0; data.items.forEach(item => { item.readAt = new Date().toISOString(); }); }
      if (key === '/dashboard' && !allowed.includes('sales.read')) data.widgets = {};
      if (key === '/customers' && !allowed.includes('customers.ledger.read')) data.items.forEach(item => { delete item.currentBalance; });
      if (key === '/customers/1' && !allowed.includes('sales.read')) { delete data.purchases; delete data.account; delete data.installments; }
      return respond({ success: true, data });
    });
    const open = async route => { launch = route; await page.goto(origin + '/miniapp.html'); await page.waitForFunction(route => decodeURI(location.hash) === '#' + decodeURI(route), {}, route); await page.waitForSelector('main h1'); await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]')); await page.evaluate(() => document.fonts.ready); };
    const clickText = async text => {
      await page.waitForFunction(text => [...document.querySelectorAll('main button')].some(el => el.textContent === text && !el.disabled), {}, text);
      await page.evaluate(text => [...document.querySelectorAll('main button')].find(el => el.textContent === text && !el.disabled).click(), text);
    };
    for (const screen of screens) {
      await open(screen.route);
      for (const [field, expected] of Object.entries(screen.money)) {
        await page.waitForSelector(`[data-field="${field}"]`);
        assert.equal(await page.$eval(`[data-field="${field}"]`, el => el.textContent), expected, `${theme}/${screen.name}/${field}`);
      }
      for (const width of [320, 360, 390, 430]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        const layout = await page.evaluate(() => ({
          width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
          rtl: getComputedStyle(document.querySelector('#miniapp-root')).direction,
          top: getComputedStyle(document.querySelector('.miniapp-screen')).paddingTop,
          money: [...document.querySelectorAll('main .miniapp-money-part')].map(el => ({ width: el.getBoundingClientRect().width, parent: el.parentElement.clientWidth })),
          numberDirection: [...document.querySelectorAll('main .miniapp-money-part')].every(el => getComputedStyle(el).direction === 'ltr'),
          controls: [...document.querySelectorAll('main button, main input, main a')].map(el => el.getBoundingClientRect().height),
          truncated: [...document.querySelectorAll('main strong')].some(el => getComputedStyle(el).textOverflow === 'ellipsis'),
        }));
        assert.ok(layout.scroll <= layout.width, `${theme}/${screen.name}/${width}: overflow`);
        assert.ok(layout.money.every(el => el.width <= el.parent + 1), `${theme}/${screen.name}/${width}: clipped money ${JSON.stringify(layout.money)}`);
        assert.ok(layout.controls.every(height => height >= 44), `${theme}/${screen.name}/${width}: touch targets ${layout.controls}`);
        assert.equal(layout.rtl, 'rtl'); assert.equal(layout.top, '24px'); assert.equal(layout.truncated, false);
        assert.equal(layout.numberDirection, true, 'Financial signs must stay beside their isolated number');
        if (width === 390 || screen.name === 'home') await page.screenshot({ path: path.join(output, `${screen.name}-${theme}-${width}.png`), fullPage: true });
        if (width === 390) await page.screenshot({ path: path.join(output, `${screen.name}-${theme}-viewport.png`), fullPage: false });
      }
      await page.setViewport({ width: 320, height: 844 });
      const before = await page.$$eval('main .miniapp-money', els => els.map(el => parseFloat(getComputedStyle(el).fontSize)));
      await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      const enlarged = await page.$$eval('main .miniapp-money', els => els.map(el => ({ size: parseFloat(getComputedStyle(el).fontSize), fits: [...el.querySelectorAll('.miniapp-money-part')].every(part => part.getBoundingClientRect().width <= el.clientWidth + 1) })));
      assert.ok(enlarged.every((el, i) => el.size >= before[i] * 1.24 && el.fits), `${screen.name}: enlarged money must grow and fit`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(output, `${screen.name}-${theme}-enlarged.png`), fullPage: false });
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      if (screen.name === 'home') {
        assert.equal(await page.$eval('main section h2', el => el.textContent), 'فروش امروز');
        assert.ok(await page.evaluate(() => [...document.querySelectorAll('.manager-section h2')].some(el => el.textContent === 'پیگیری امروز')));
        assert.ok(await page.$('.manager-header'));
        assert.ok(await page.$('.manager-list'));
        assert.equal(await page.$('.manager-page.partner-page, .manager-page .partner-metric, .manager-hero'), null);
      }
      results.push(`${theme}/${screen.name}: exact money + 4 widths + enlarged text PASS`);
    }
    // Full signed Persian amounts must fit independently of currency, including at 200% text size.
    for (const [amount, expected] of [[999999999.25, '۹۹۹٬۹۹۹٬۹۹۹٫۲۵ تومان'], [-9007199254740991, '-۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۱ تومان'], [0, '۰ تومان']]) {
      numericAmount = amount; await open('/');
      assert.equal(await page.$eval('[data-field="todayAmount"]', el => el.textContent), expected);
      for (const width of [320, 430]) {
        await page.setViewport({ width, height: 844 });
        for (const size of [16, 20, 32]) {
          await page.evaluate(size => { document.documentElement.style.fontSize = size + 'px'; }, size);
          const fit = await page.$eval('[data-field="todayAmount"]', el => {
            const number = el.querySelector('bdi').getBoundingClientRect(), currency = el.querySelector('.miniapp-family-currency').getBoundingClientRect();
            return { fits: number.width <= el.clientWidth + 1, unitBelow: currency.top >= number.bottom - 1, overflow: document.documentElement.scrollWidth > innerWidth, negative: el.querySelector('bdi').textContent.startsWith('-') };
          });
          assert.deepEqual(fit, { fits: true, unitBelow: true, overflow: false, negative: amount < 0 }, `${theme}/${amount}/${width}/${size}: numeric layout`);
        }
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    }
    numericAmount = null;
    results.push(`${theme}: signed, fractional and zero amounts at 320/430px and 100/125/200% text PASS`);
    // Pagination and browser return preserve filters and page context.
    await open('/directory?type=customer&q=نام'); await clickText('صفحه بعد');
    await page.waitForSelector('main a[href="#/customers/31"]');
    assert.ok(page.url().includes('page=2')); await page.click('main a[href="#/customers/31"]');
    // Unknown detail intentionally rejected by fixture; do not count it as an unexpected implementation request.
    await page.waitForSelector('main [role="alert"]'); assert.equal(unexpected.pop(), '/customers/31');
    await page.click('button[aria-label="بازگشت"]'); await page.waitForSelector('main a[href="#/customers/31"]');
    assert.ok(page.url().includes('page=2') && page.url().includes('q='));
    await open('/dues?scope=today'); await Promise.all([page.waitForResponse(response => response.url().includes('/installments/due?scope=today&page=2')), clickText('صفحه بعد')]); await page.waitForFunction(() => location.hash.includes('page=2'));
    assert.ok(requests.some(r => r.path.endsWith('/installments/due') && r.query.includes('page=2') && r.query.includes('scope=today')));
    // Mutation feedback must reflect actual response success/failure.
    await open('/notifications'); actionFails = true; await clickText('خوانده شد'); await page.waitForSelector('main [role="alert"]');
    assert.equal(read, false); actionFails = false; await clickText('خوانده شد');
    await page.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent.includes('ثبت شد'));
    assert.ok(read); read = false; await open('/notifications'); await clickText('خواندن همه اعلان‌ها');
    await page.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent.includes('ثبت شدند'));
    assert.ok(requests.some(r => r.method === 'POST' && r.path.endsWith('/read-all')));
    // Primary provenance is unchanged; snapshot-only detail pages cannot claim working server pagination.
    mode = 'snapshot'; await open('/'); await page.waitForFunction(() => document.body.innerText.includes('اتصال زنده برقرار نیست'));
    await page.screenshot({ path: path.join(output, `snapshot-home-${theme}.png`), fullPage: true });
    await open('/customers/1'); assert.equal(await page.$$eval('main .manager-pagination button', nodes => nodes.length), 0);
    await open('/dues'); assert.equal(await page.$$eval('main .manager-pagination button', nodes => nodes.length), 0);
    await open('/directory'); assert.ok(await page.$('[data-manager-snapshot-note]'));
    // Empty, delayed and rejected reads remain distinct and recover through the existing retry.
    mode = 'empty'; await open('/'); assert.ok((await page.$eval('main', el => el.innerText)).includes('شاخصی'));
    assert.equal(await page.$$eval('main .manager-metric', els => els.length), 0);
    await open('/directory'); assert.ok((await page.$eval('main', el => el.innerText)).includes('رکوردی'));
    await page.screenshot({ path: path.join(output, `empty-${theme}.png`), fullPage: true });
    mode = 'error'; launch = '/sales'; await page.goto(origin + '/miniapp.html'); await page.waitForSelector('main [role="alert"]');
    await page.screenshot({ path: path.join(output, `error-${theme}.png`) });
    mode = 'live'; await page.click('main .miniapp-button'); await page.waitForSelector('[data-field="totalRevenue"]');
    await page.waitForFunction(() => document.body.innerText.includes('اتصال زنده برقرار است'));
    mode = 'loading'; launch = '/'; await page.goto(origin + '/miniapp.html'); await page.waitForSelector('main [aria-busy="true"]');
    await page.screenshot({ path: path.join(output, `loading-${theme}.png`) }); await page.waitForSelector('[data-field="todayAmount"]'); mode = 'live';
    // Restricted customer view must not request hidden sales, ledger or installment sections.
    allowed = ['customers.read']; requests.length = 0; await open('/customers/1');
    assert.deepEqual(requests.filter(r => r.path.startsWith('/api/miniapp/manager/')).map(r => r.path), ['/api/miniapp/manager/customers/1']);
    assert.equal(await page.$$eval('main .miniapp-money', els => els.length), 0);
    allowed = ['installments.read']; await open('/installments/1'); assert.equal(await page.$('main a[href="#/customers/1"]'), null);
    allowed = ['dashboard.read']; await open('/'); assert.equal(await page.$$eval('main .manager-metric', els => els.length), 0);
    results.push(`${theme}: pagination, return context, notifications, live/snapshot, empty/error/loading, restricted sections PASS`);
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    await page.close();
  }
  console.log(JSON.stringify({ status: 'PASS', results, screenshots: output, productionTraffic: false }, null, 2));
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
