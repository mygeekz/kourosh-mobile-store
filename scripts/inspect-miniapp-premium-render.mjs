// Inspect the actual built DOM; only Telegram authentication/data are synthetic.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { fixtures as manager, permissions } from './fixtures/miniapp-manager-ui.mjs';
import { makeFixture } from './fixtures/miniapp-partner-ui.mjs';

const dist = path.resolve(process.argv.find(arg => arg.startsWith('--dist='))?.slice(7) || 'dist-miniapp');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-render-inspection-'));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end();
  try { const bytes = await fs.readFile(file); res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(bytes); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = { artifact: dist, syntheticSession: true, viewport: { width: 390, height: 844 }, screens: [], drawers: [] };
let browser;
try {
  const executable = await resolvePuppeteerBrowserExecutable({ root: process.cwd() });
  browser = await puppeteer.launch({ executablePath: executable.executablePath, args: browserLaunchArgs(), headless: true });
  for (const screen of [
    { name: 'Home', role: 'staff', route: '/', asset: 'home' },
    { name: 'PartnerHome', role: 'partner', route: '/', asset: 'home' },
    { name: 'Account', role: 'partner', route: '/account', asset: 'home' },
    { name: 'Products', role: 'partner', route: '/purchases', asset: 'product' },
    { name: 'More', role: 'staff', route: '/more', asset: 'more' },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    const assets = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { const url = new URL(response.url()); if (url.pathname.startsWith('/miniapp/premium/')) assets.push({ path: url.pathname, status: response.status() }); });
    await page.evaluateOnNewDocument(() => {
      const noop = () => {};
      window.Telegram = { WebApp: { initData: 'synthetic-render-inspection', colorScheme: 'light', themeParams: {}, version: '9.0', platform: 'android', safeAreaInset: { top: 24, bottom: 20, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 }, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, ready: noop, expand: noop, onEvent: noop, offEvent: noop } };
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.protocol === 'data:') return request.continue();
      if (url.origin === 'https://telegram.org' && url.pathname === '/js/telegram-web-app.js') return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      if (url.origin !== origin) return request.abort();
      if (!url.pathname.startsWith('/api/')) return request.continue();
      const respond = data => request.respond({ status: 200, contentType: 'application/json', headers: { 'x-kourosh-data-source': 'live' }, body: JSON.stringify({ success: true, data }) });
      if (url.pathname === '/api/miniapp/auth') return respond({ sessionToken: 'synthetic-render-session', expiresAt: new Date(Date.now() + 600000).toISOString(), identity: { kind: screen.role, subjectId: 1, telegramUserId: '1', displayName: 'فروشگاه آزمایشی کوروش', roleName: 'Admin', capabilities: [], permissions: screen.role === 'staff' ? permissions : [], workspaces: ['manager', 'partner'].map(kind => ({ kind, subjectId: 1, displayName: 'فروشگاه آزمایشی کوروش', capabilities: [], permissions: kind === 'manager' ? permissions : [] })) }, launch: { route: screen.route, startParam: null } });
      const data = screen.role === 'staff' ? manager[url.pathname.replace('/api/miniapp/manager', '')] : makeFixture(url.pathname.replace('/api/miniapp/partner', ''));
      return respond(data ?? null);
    });
    await page.goto(origin + '/miniapp.html');
    await page.waitForSelector('main header');
    // More renders navigation only; the shared freshness indicator is not its ready signal.
    if (screen.route !== '/more') await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]'));
    await page.evaluate(async src => { await document.fonts.ready; const image = new Image(); image.src = src; await image.decode(); window.scrollTo(0, 0); }, `/miniapp/premium/${screen.asset}.webp`);
    await new Promise(resolve => setTimeout(resolve, 350));
    const computed = await page.$eval('main header', header => {
      const style = getComputedStyle(header), r = header.getBoundingClientRect();
      const rect = { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
      const ancestors = []; for (let el = header; el; el = el.parentElement) { const s = getComputedStyle(el); ancestors.push({ tag: el.tagName, opacity: s.opacity, display: s.display, visibility: s.visibility, overflow: s.overflow, rect: el.getBoundingClientRect().toJSON() }); }
      const points = [[.1, .2], [.1, .7], [.5, .5], [.9, .5]].map(([x, y]) => { const el = document.elementFromPoint(r.left + r.width * x, r.top + r.height * y); return { x, y, covered: !(el === header || header.contains(el)), topElement: el?.tagName }; });
      return { title: header.innerText, backgroundImage: style.backgroundImage, backgroundSize: style.backgroundSize, opacity: style.opacity, zIndex: style.zIndex, position: style.position, rect, points, ancestors, viewportOverflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(computed.backgroundImage.includes(`/miniapp/premium/${screen.asset}.webp`));
    assert.ok(computed.ancestors.every(el => Number(el.opacity) > 0 && el.display !== 'none' && el.visibility === 'visible'));
    assert.ok(computed.points.every(point => !point.covered));
    assert.ok(computed.rect.x >= 0 && computed.rect.right <= 390 && computed.rect.bottom <= 844);
    assert.equal(computed.viewportOverflow, false);
    assert.ok(assets.some(asset => asset.path.endsWith(`/${screen.asset}.webp`) && asset.status === 200));
    // Prime Chromium's surface after a newly loaded page, then capture the presented frame.
    await page.screenshot({ fullPage: false });
    await new Promise(resolve => setTimeout(resolve, 250));
    await page.screenshot({ path: path.join(output, `${screen.name}.png`), fullPage: false });
    // A second actual browser capture proves that the image contributes visible pixels.
    const original = await page.$eval('main header', el => { const value = el.style.backgroundImage; el.style.backgroundImage = 'none'; return value; });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.screenshot({ path: path.join(output, `${screen.name}-without-background.png`), fullPage: false });
    await page.$eval('main header', (el, value) => { el.style.backgroundImage = value; }, original);
    report.screens.push({ screen: screen.name, route: screen.route, assets, computed, errors });
    if (screen.name === 'Home') for (const width of [320, 360, 390, 430]) {
      await page.setViewport({ width, height: 844 });
      await page.click('.miniapp-workspace-trigger'); await page.waitForSelector('dialog[open]');
      await new Promise(resolve => setTimeout(resolve, 250));
      const drawer = await page.$eval('dialog[open]', el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return { width: innerWidth, x: r.x, right: r.right, origin: s.transformOrigin, direction: s.direction, overflow: el.scrollWidth > el.clientWidth, options: [...el.querySelectorAll('.miniapp-workspace-option strong')].map(node => node.textContent) }; });
      assert.equal(drawer.x, 0); assert.ok(drawer.right <= width); assert.ok(drawer.origin.startsWith('0px ')); assert.equal(drawer.overflow, false);
      await page.screenshot({ path: path.join(output, `Drawer-${width}.png`), fullPage: false });
      report.drawers.push(drawer); await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await fs.writeFile(path.join(output, 'dom-inspection.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ artifact: dist, screenshots: output, visibleHeaders: report.screens.length, drawers: report.drawers, syntheticSession: true }, null, 2));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
