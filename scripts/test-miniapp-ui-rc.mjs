// Cross-workspace release audit. All identities, responses and sessions are synthetic.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { fixtures as manager, permissions, name } from './fixtures/miniapp-manager-ui.mjs';
import { makeFixture as partner } from './fixtures/miniapp-partner-ui.mjs';
import { makeFixture as customer } from './fixtures/miniapp-customer-ui.mjs';

const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-ui-rc-'));
// Match the artifact under test explicitly; never navigate to a live/dev backend.
const dist = path.resolve(process.argv.find(arg => arg.startsWith('--dist='))?.slice(7) || 'dist-miniapp');
await fs.access(path.join(dist, 'miniapp.html'));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end();
  try { const body = await fs.readFile(file); res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const issues = [], results = [], diagnostics = [], premiumHeaders = [];
const check = (condition, issue) => { if (!condition) issues.push(issue); };
let browser;
try {
  const executable = await resolvePuppeteerBrowserExecutable({ root: process.cwd() });
  browser = await puppeteer.launch({ executablePath: executable.executablePath, args: browserLaunchArgs(), headless: true });
  for (const role of ['manager', 'partner', 'customer']) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    let launch = '/', mode = 'live', completed = 0;
    const errors = [];
    const trace = { role, theme, errors, console: [], network: [], authentication: [] };
    diagnostics.push(trace);
    const sanitize = value => String(value).replace(/synthetic-(?:session|rc-fixture)/g, '[fixture-redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
    const safePath = value => { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.pathname : `[${url.protocol}]`; };
    page.on('pageerror', error => errors.push(sanitize(error.message)));
    page.on('console', message => { if (message.type() === 'error' || message.type() === 'warn') trace.console.push(sanitize(message.text())); });
    page.on('requestfailed', request => trace.network.push({ path: safePath(request.url()), failed: request.failure()?.errorText }));
    page.on('response', response => trace.network.push({ path: safePath(response.url()), status: response.status() }));
    await page.evaluateOnNewDocument(theme => {
      const noop = () => {};
      window.Telegram = { WebApp: { initData: 'synthetic-rc-fixture', colorScheme: theme, themeParams: {}, version: '9.0', platform: 'android', safeAreaInset: { top: 24, bottom: 20, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 }, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, ready: noop, expand: noop, onEvent: noop, offEvent: noop } };
    }, theme);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.protocol === 'data:') return request.continue();
      if (url.origin === 'https://telegram.org' && url.pathname === '/js/telegram-web-app.js') return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      if (url.origin !== origin) { issues.push(`Unexpected external request: ${url.origin}${url.pathname}`); return request.abort(); }
      if (!url.pathname.startsWith('/api/')) return request.continue();
      const headers = { 'x-kourosh-data-source': mode === 'snapshot' ? 'snapshot' : 'live', 'x-kourosh-snapshot-generated-at': new Date(Date.now() - 40 * 60000).toISOString() };
      const respond = (body, status = 200) => request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
      if (url.pathname === '/api/miniapp/auth') {
        const validMock = request.method() === 'POST' && request.headers()['content-type']?.includes('application/json') && JSON.parse(request.postData() || '{}').initData === 'synthetic-rc-fixture';
        check(validMock, `${role}/${theme}: Telegram mock did not reach auth POST`);
        trace.authentication.push({ method: request.method(), mockAccepted: Boolean(validMock), status: 200, identityKind: role === 'manager' ? 'staff' : role, permissionCount: role === 'manager' ? permissions.length : 0 });
        return respond({ success: true, data: { sessionToken: 'synthetic-session', expiresAt: new Date(Date.now() + 600000).toISOString(), identity: { kind: role === 'manager' ? 'staff' : role, subjectId: 1, displayName: name, roleName: 'Admin', telegramUserId: '1', permissions: role === 'manager' ? permissions : [], capabilities: [] }, launch: { route: launch, startParam: null } } });
      }
      check(request.headers().authorization === 'Bearer synthetic-session', `${role}/${theme}: data request missing established fixture session`);
      const endpoint = url.pathname.replace(`/api/miniapp/${role}`, '');
      const data = role === 'manager' ? manager[endpoint] : role === 'partner' ? partner(endpoint) : customer(endpoint);
      if (!data) { issues.push(`Unexpected ${role} request: ${url.pathname}`); return respond({ success: false, message: 'Unknown fixture' }, 404); }
      const current = mode;
      if (current === 'background-loading') await new Promise(resolve => setTimeout(resolve, 600));
      await respond(current === 'error' || current === 'expired' ? { success: false, message: 'خطای آزمایشی دریافت اطلاعات' } : { success: true, data: current === 'unavailable' ? null : data }, current === 'error' ? 503 : current === 'expired' ? 401 : 200);
      completed++;
    });
    const open = async route => {
      launch = route;
      const previous = completed;
      await page.goto(origin + '/miniapp.html');
      // A caught React render failure does not emit pageerror and removes the shell.
      // Fail at the actual boundary instead of waiting 30 seconds for navigation.
      await page.waitForFunction(() => document.querySelector('.miniapp-shell-dock') || document.querySelector('main[role="alert"]') || document.querySelector('main[aria-busy="false"]'));
      assert.ok(await page.$('.miniapp-shell-dock'), `${role}/${theme}${route}: bootstrap/render failed; see failure.json`);
      await page.waitForFunction(route => decodeURI(location.hash) === '#' + decodeURI(route), {}, route);
      assert.ok(await page.evaluate(() => sessionStorage.getItem('kourosh-miniapp-session') === 'synthetic-session'), `${role}/${theme}: auth did not store fixture session`);
      if (route !== '/more') await page.waitForFunction(() => document.querySelector('main[role="alert"]') || (!document.querySelector('main [aria-busy="true"]') && (document.querySelector('#miniapp-content h1') || document.querySelector('#miniapp-content .miniapp-state'))));
      assert.equal(await page.$('main[role="alert"]'), null, `${role}/${theme}${route}: render error boundary`);
      if (mode === 'live' && route === '/') await page.waitForSelector(`[data-field="${role === 'manager' ? 'todayAmount' : role === 'partner' ? 'signedBalance' : 'accountAmount'}"]`);
      if (mode === 'live' && route === '/' && role === 'manager') {
        assert.ok(await page.$('.manager-page'), 'staff identity must render ManagerHome');
        assert.ok(await page.$('.manager-header'), 'dedicated Manager header must render');
        assert.ok(await page.$('.manager-list'), 'dedicated Manager records must render');
        assert.equal(await page.$('.manager-page .partner-section, .manager-page.partner-page, .manager-hero'), null, 'rejected Manager redesign must not return');
      }
      // More has no primary data request; all other routes must complete a response.
      if (route !== '/more') { for (let i = 0; completed === previous && i < 50; i++) await new Promise(resolve => setTimeout(resolve, 100)); }
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    };
    const routes = role === 'manager' ? ['/', '/sales', '/directory?type=customer', '/more', '/customers/1'] : role === 'partner' ? ['/', '/purchases', '/phones', '/account'] : ['/', '/purchases', '/invoices/order-1', '/installments', '/account'];
    for (const [index, route] of routes.entries()) {
      mode = 'live'; await open(route);
      const artwork = await page.$eval('main .miniapp-family-header .miniapp-artwork', el => el.getAttribute('src'));
      assert.ok(artwork.startsWith('/miniapp/premium/illustrations/') && artwork.endsWith('.webp'));
      await page.$eval('main .miniapp-family-header .miniapp-artwork', el => el.decode());
      for (const width of [320, 360, 390, 430]) {
        await page.setViewport({ width, height: 844 });
        await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        const art = await page.$eval('main .miniapp-family-header .miniapp-artwork', el => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el), header = el.closest('header').getBoundingClientRect();
          return { decoded: el.naturalWidth > 0, visible: r.width > 0 && s.opacity !== '0' && s.visibility !== 'hidden', contained: r.left >= header.left && r.right <= header.right, square: Math.abs(r.width - r.height) < 1, fit: s.objectFit };
        });
        assert.deepEqual(art, { decoded: true, visible: true, contained: true, square: true, fit: 'contain' });
        await page.screenshot({ path: path.join(output, `premium-${role}-${index}-${theme}-${width}.png`), fullPage: false });
      }
      premiumHeaders.push({ role, route, asset: artwork, theme, decoded: true, widths: [320, 360, 390, 430] });
      await page.setViewport({ width: 390, height: 844 });
      await page.waitForFunction(() => innerWidth === 390);
      await page.evaluate(async () => { window.scrollTo(0, 0); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      await page.screenshot({ path: path.join(output, `${role}-${index}-${theme}.png`), fullPage: route !== '/more' });
      for (const size of [{ width: 320, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewport(size);
        const read = () => page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main .miniapp-money, main .manager-muted, main .partner-muted, main .customer-muted')].map(el => ({ size: parseFloat(getComputedStyle(el).fontSize), fluid: el.matches('.manager-hero h2') })));
        const before = await read();
        await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
        const after = await read();
        // The existing hero title uses clamp(rem, rem + vw, rem). Its viewport
        // contribution stays fixed during root-text resizing; require growth,
        // while ordinary rem typography must still scale by the full 25%.
        check(before.length > 0 && before.length === after.length && before.every((item, i) => item.fluid ? after[i].size > item.size : after[i].size >= item.size * 1.24), `${role}/${theme}${route}: text did not scale at ${size.width}`);
        const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, money: [...document.querySelectorAll('main .miniapp-money-part')].every(el => el.getBoundingClientRect().width <= el.parentElement.clientWidth + 1) }));
        check(layout.scroll <= layout.width && layout.money, `${role}/${theme}${route}: enlarged text/financial overflow at ${size.width}`);
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      }
    }
    await page.setViewport({ width: 390, height: 844 });
    mode = 'live'; await open('/');
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, visible: document.activeElement.matches(':focus-visible'), outline: getComputedStyle(document.activeElement).outlineStyle }));
    check(focus.tag === 'A' && focus.visible && focus.outline !== 'none', `${role}/${theme}: keyboard focus indicator`);
    await page.keyboard.press('Enter');
    check(await page.evaluate(() => document.activeElement.id === 'miniapp-content'), `${role}/${theme}: skip link focus`);
    const homeField = role === 'manager' ? 'todayAmount' : role === 'partner' ? 'signedBalance' : 'accountAmount';
    const fieldSelector = `[data-field="${homeField}"]`;
    const original = await page.$eval(fieldSelector, el => el.textContent);
    for (const next of ['background-loading', 'error', 'snapshot', 'live', 'expired']) {
      mode = next; const previous = completed;
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      for (let i = 0; completed === previous && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 50));
      check(completed > previous, `${role}/${theme}: background refresh request ${next}`);
      if (next === 'expired') {
        await page.waitForSelector('main [role="alert"]');
        check(await page.$(fieldSelector) === null, `${role}/${theme}: auth failure retained financial data`);
        check(await page.evaluate(() => sessionStorage.getItem('kourosh-miniapp-session')) === null, `${role}/${theme}: expired session not cleared`);
      } else {
        await page.waitForSelector(fieldSelector);
        check(await page.$eval(fieldSelector, el => el.textContent) === original, `${role}/${theme}: background refresh lost data`);
        if (next === 'snapshot' || next === 'live') await page.waitForFunction(next => document.body.innerText.includes(next === 'live' ? 'اتصال زنده برقرار است' : 'اتصال زنده برقرار نیست'), {}, next);
      }
    }
    // Null is unavailable data, never proof that a business list is empty.
    mode = 'unavailable';
    const unavailableRoutes = role === 'manager' ? ['/', '/sales', '/directory', '/customers/1', '/partners/1', '/installments/1'] : ['/', '/account'];
    for (const route of unavailableRoutes) {
      // Manager Home/detail had no state element for null before the RC repair.
      await open(route);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      check((await page.$eval('main', el => el.innerText)).includes('در دسترس نیست'), `${role}/${theme}${route}: missing unavailable message`);
    }
    check(errors.length === 0, `${role}/${theme}: browser errors ${errors.join(', ')}`);
    check(trace.console.filter(message => message.includes('[miniapp-render-error]')).length === 0, `${role}/${theme}: caught React render error`);
    results.push({ role, theme, screens: routes.length, authentication: { identityKind: role === 'manager' ? 'staff' : role, mockAccepted: trace.authentication.every(item => item.mockAccepted), sessionStoredAndSent: true }, backgroundRefresh: true, keyboard: true, unavailable: unavailableRoutes.length });
    await page.close();
  }
  const report = { status: issues.length ? 'FAIL' : 'PASS', artifact: dist, issues, results, premiumHeaders, screenshots: output, productionAccountsTested: false };
  await fs.writeFile(path.join(output, 'audit.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert.deepEqual(issues, []);
} catch (error) {
  const pages = browser ? await browser.pages() : [];
  const dom = await Promise.all(pages.map(page => page.evaluate(() => ({ path: location.pathname, hash: location.hash, text: document.body.innerText.slice(0, 1800), telegramMockPresent: Boolean(window.Telegram?.WebApp?.initData), sessionEstablished: Boolean(sessionStorage.getItem('kourosh-miniapp-session')) })).catch(() => ({ unavailable: true }))));
  const failure = { message: error.message, artifact: dist, diagnostics: diagnostics.map(trace => ({ ...trace, network: trace.network.slice(-60) })), dom };
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify(failure, null, 2));
  console.error(JSON.stringify({ message: failure.message, artifact: dist, diagnosticFile: path.join(output, 'failure.json'), renderErrors: diagnostics.flatMap(trace => trace.console.filter(message => message.includes('[miniapp-render-error]'))), dom }, null, 2));
  throw error;
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
