#!/usr/bin/env node
/* global document, window, localStorage */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-responsive-v287-chromium-cache';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const reuseDist = args.has('--reuse-dist');
const skipScreenshots = args.has('--skip-screenshots');
const outputIndex = process.argv.indexOf('--output');
const requestedOutput = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'responsive-v287', new Date().toISOString().replace(/[:.]/g, '-')));
fs.mkdirSync(outputDir, { recursive: true });

const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-responsive-v287-'));
const distDir = reuseDist ? path.join(root, 'dist') : path.join(runtimeDir, 'dist');
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const viewports = [
  { key: 'desktop-1366', width: 1366, height: 768 },
  { key: 'desktop-1024', width: 1024, height: 768 },
  { key: 'tablet-768', width: 768, height: 1024 },
  { key: 'mobile-430', width: 430, height: 932 },
  { key: 'mobile-390', width: 390, height: 844 },
];

const routes = [
  { key: 'customers', path: '/customers' },
  { key: 'partners', path: '/partners' },
  { key: 'products', path: '/products' },
  { key: 'installments', path: '/installment-sales' },
  { key: 'repairs', path: '/repairs' },
  { key: 'expenses', path: '/expenses' },
  { key: 'settings-style', path: '/settings/style' },
  { key: 'reports', path: '/reports' },
];

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

if (!reuseDist) {
  if (!fs.existsSync(viteCli)) throw new Error('node_modules آماده نیست؛ ابتدا setup.bat یا npm ci را اجرا کنید.');
  const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
    cwd: root,
    env: { ...process.env, VITE_DISABLE_HTTPS: '1' },
    encoding: 'utf8',
    timeout: 240_000,
    maxBuffer: 80 * 1024 * 1024,
  });
  if (build.status !== 0) throw new Error(`Responsive v287 production build failed:\n${build.stderr || build.stdout}`);
} else if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error('dist آماده نیست؛ تست را بدون --reuse-dist اجرا کنید.');
}

const port = await reservePort();
const origin = `http://127.0.0.1:${port}`;
const previewLogs = [];
const preview = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', distDir], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
preview.stdout.on('data', (chunk) => previewLogs.push(String(chunk)));
preview.stderr.on('data', (chunk) => previewLogs.push(String(chunk)));

const waitForPreview = async () => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited early:\n${previewLogs.join('')}`);
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Vite preview did not become ready:\n${previewLogs.join('')}`);
};

const respondJson = (request, data, status = 200) => request.respond({
  status,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(data),
});

const ok = (data = []) => ({ success: true, data });
const emptyDirectory = { items: [], total: 0, totalPages: 1, summary: {} };
const emptyInstallments = {
  items: [],
  pagination: { page: 1, pageSize: 30, total: 0, totalPages: 1, hasMore: false },
  summary: {},
};
const expenseDashboard = {
  categories: [],
  insights: [],
  totals: {},
  recurring: {},
  comparison: {},
};

const fixtureFor = (url) => {
  const pathname = url.pathname;
  const view = url.searchParams.get('view');

  if (pathname === '/api/me') return { success: true, user: { id: 1, username: 'responsive-admin', firstName: 'مدیر', lastName: 'رسپانسیو', roleName: 'Admin', avatarUrl: null } };
  if (pathname === '/api/module-flags') return ok({});
  if (pathname === '/api/store-branding') return ok({ storeName: 'فروشگاه کوروش', logoUrl: null });
  if (pathname === '/api/notifications' || pathname === '/api/notifications/outbox') return ok([]);
  if (pathname === '/api/reports/installments-calendar') return ok({ items: [] });
  if (pathname === '/api/reports/sales-summary') return ok({ totalTransactions: 0, totalRevenue: 0, grossProfit: 0, averageSaleValue: 0, topSellingItems: [] });
  if (pathname === '/api/reports/financial-overview') return ok({ profit: {} });
  if (pathname === '/api/customers/trust-profiles') return ok([]);
  if (pathname.includes('/due-overview') || pathname.includes('/installment-due')) return ok([]);

  if (pathname === '/api/customers') return ok(view === 'directory' ? emptyDirectory : []);
  if (pathname === '/api/partners') return ok(view === 'directory' ? emptyDirectory : []);
  if (pathname === '/api/products' || pathname === '/api/categories' || pathname === '/api/services' || pathname === '/api/repairs') return ok([]);
  if (pathname === '/api/installment-sales') return ok(view === 'directory' ? emptyInstallments : []);
  if (pathname === '/api/sales-orders') return ok([]);

  if (pathname === '/api/expenses') return ok([]);
  if (pathname === '/api/reports/expenses-summary') return ok({ total: 0, byCategory: [] });
  if (pathname === '/api/expenses/dashboard') return ok(expenseDashboard);
  if (pathname === '/api/recurring-expenses' || pathname === '/api/expenses/title-options') return ok([]);

  if (pathname === '/api/settings') return ok({});
  if (pathname === '/api/settings/telegram') return ok({});
  if (pathname === '/api/users' || pathname === '/api/roles' || pathname === '/api/phones') return ok([]);
  if (pathname.startsWith('/api/store-ownership/')) return ok([]);
  if (pathname.startsWith('/api/telegram/')) return ok({});
  if (pathname.startsWith('/api/backup/')) return ok([]);
  if (pathname.startsWith('/api/reports/')) return ok([]);
  if (pathname.startsWith('/api/dashboard/')) return ok({});

  return ok([]);
};

const auditGeometry = () => {
  const visible = (element) => {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0.5 && rect.height > 0.5;
  };
  const insideAllowedScroller = (element) => Boolean(element.closest('[data-ui-table-viewport="true"], [data-ui-operational-breadcrumb-scroll="true"], [data-responsive-horizontal-scroll="true"], .overflow-x-auto, .overflow-x-scroll'));
  const rectOutsideViewport = (rect) => rect.left < -1 || rect.right > window.innerWidth + 1;
  const main = document.querySelector('[data-ui-shell="main-scroll"]');
  const content = document.querySelector('[data-ui-shell="content"]');
  const sidebar = document.querySelector('[data-sidebar-contract="canonical"]');
  const bottomNav = document.querySelector('[data-ui-navigation="mobile-bottom"]');

  const clippedContainers = [...document.querySelectorAll('div,section,article,header,footer,nav,form')]
    .filter((element) => visible(element))
    .filter((element) => {
      const style = window.getComputedStyle(element);
      const clipsX = /hidden|clip/.test(style.overflowX);
      const intentionalTextClip = /ellipsis/.test(style.textOverflow) || /truncate|line-clamp/.test(String(element.className || ''));
      const layoutLike = /grid|flex|block/.test(style.display) && element.clientWidth >= 120;
      return clipsX && layoutLike && !intentionalTextClip && element.scrollWidth > element.clientWidth + 2 && !element.matches('[data-ui-shell="main-scroll"], [data-ui-shell="app-layout"]');
    })
    .slice(0, 30)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      className: String(element.className || '').slice(0, 180),
      overflow: element.scrollWidth - element.clientWidth,
    }));

  const outOfViewportControls = [...document.querySelectorAll('[data-ui-button="true"], input, select, textarea, [role="button"]')]
    .filter((element) => visible(element) && !insideAllowedScroller(element))
    .filter((element) => rectOutsideViewport(element.getBoundingClientRect()))
    .slice(0, 30)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      text: String(element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 90),
      rect: element.getBoundingClientRect().toJSON(),
    }));

  const undersizedCanonicalControls = window.innerWidth <= 768
    ? [...document.querySelectorAll('[data-ui-button="true"]')]
        .filter((element) => visible(element) && !insideAllowedScroller(element))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const hasText = String(element.textContent || '').trim().length > 0;
          return rect.height < 36 || rect.width < (hasText ? 36 : 32);
        })
        .slice(0, 30)
        .map((element) => ({
          text: String(element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 90),
          width: Math.round(element.getBoundingClientRect().width),
          height: Math.round(element.getBoundingClientRect().height),
        }))
    : [];

  const tablesWithoutViewport = [...document.querySelectorAll('[data-ui-table="true"]')]
    .filter((table) => !table.closest('[data-ui-table-viewport="true"]'))
    .map((table) => String(table.getAttribute('aria-label') || table.className || 'table').slice(0, 120));

  const fixedOutsideViewport = [...document.querySelectorAll('body *')]
    .filter((element) => visible(element) && window.getComputedStyle(element).position === 'fixed')
    .filter((element) => {
      if (element.matches('[data-sidebar-contract="canonical"]') && element.getAttribute('data-sidebar-open') !== 'true') return false;
      const rect = element.getBoundingClientRect();
      return rect.left < -2 || rect.right > window.innerWidth + 2 || rect.top < -2 || rect.bottom > window.innerHeight + 2;
    })
    .slice(0, 30)
    .map((element) => ({
      className: String(element.className || '').slice(0, 160),
      rect: element.getBoundingClientRect().toJSON(),
    }));

  const documentOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  const mainOverflow = main ? main.scrollWidth - main.clientWidth : 999;
  const contentRect = content?.getBoundingClientRect();
  const sidebarRect = sidebar?.getBoundingClientRect();
  const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    documentOverflow,
    mainOverflow,
    content: contentRect ? { left: contentRect.left, right: contentRect.right, width: contentRect.width } : null,
    sidebar: sidebarRect ? { open: sidebar?.getAttribute('data-sidebar-open') === 'true', left: sidebarRect.left, right: sidebarRect.right, width: sidebarRect.width } : null,
    bottomNavVisible: Boolean(bottomNav && bottomNavStyle?.display !== 'none' && visible(bottomNav)),
    clippedContainers,
    outOfViewportControls,
    undersizedCanonicalControls,
    tablesWithoutViewport,
    fixedOutsideViewport,
  };
};

let browser;
const results = [];
const failures = [];
try {
  await waitForPreview();
  const [{ default: puppeteer }, browserExecutable] = await Promise.all([
    import('puppeteer-core'),
    resolvePuppeteerBrowserExecutable({ root }),
  ]);
  browser = await puppeteer.launch({
    executablePath: browserExecutable.executablePath,
    args: browserLaunchArgs(),
    headless: true,
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin === origin && url.pathname.startsWith('/api/')) {
        await respondJson(request, fixtureFor(url));
        return;
      }
      await request.continue();
    } catch {
      try { await request.continue(); } catch {}
    }
  });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('authToken', 'responsive-v287-token');
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'responsive-admin', firstName: 'مدیر', lastName: 'رسپانسیو', fullName: 'مدیر رسپانسیو', roleName: 'Admin' }));
    localStorage.setItem('pwa_install_overlay_dismissed_v2', '1');
    localStorage.setItem('koroush.style.v2', JSON.stringify({ theme: 'light', palette: 'classic' }));
  });

  for (const viewport of viewports) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });

    for (const route of routes) {
      const pageErrors = [];
      const errorHandler = (error) => pageErrors.push(error.message);
      page.on('pageerror', errorHandler);

      try {
        await page.goto(`${origin}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await new Promise((resolve) => setTimeout(resolve, 700));
        await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0.001ms!important;animation-delay:0ms!important;transition-duration:0.001ms!important;scroll-behavior:auto!important}' });

        const geometry = await page.evaluate(auditGeometry);
        const expectedDesktop = viewport.width >= 1024;

        assert.ok(geometry.documentOverflow <= 1, `${viewport.key}/${route.key}: document horizontal overflow ${geometry.documentOverflow}px`);
        assert.ok(geometry.mainOverflow <= 1, `${viewport.key}/${route.key}: main scroll horizontal overflow ${geometry.mainOverflow}px`);
        assert.equal(geometry.clippedContainers.length, 0, `${viewport.key}/${route.key}: clipped containers ${JSON.stringify(geometry.clippedContainers.slice(0, 3))}`);
        assert.equal(geometry.outOfViewportControls.length, 0, `${viewport.key}/${route.key}: controls outside viewport ${JSON.stringify(geometry.outOfViewportControls.slice(0, 3))}`);
        assert.equal(geometry.undersizedCanonicalControls.length, 0, `${viewport.key}/${route.key}: undersized mobile buttons ${JSON.stringify(geometry.undersizedCanonicalControls.slice(0, 3))}`);
        assert.equal(geometry.tablesWithoutViewport.length, 0, `${viewport.key}/${route.key}: runtime table without TableViewport`);
        assert.equal(geometry.fixedOutsideViewport.length, 0, `${viewport.key}/${route.key}: fixed overlay outside viewport ${JSON.stringify(geometry.fixedOutsideViewport.slice(0, 3))}`);
        assert.equal(pageErrors.length, 0, `${viewport.key}/${route.key}: runtime page errors ${pageErrors.join(' | ')}`);

        if (geometry.content) {
          assert.ok(geometry.content.left >= -1 && geometry.content.right <= viewport.width + 1, `${viewport.key}/${route.key}: content shell outside viewport`);
        }
        assert.equal(geometry.bottomNavVisible, !expectedDesktop, `${viewport.key}/${route.key}: bottom navigation breakpoint mismatch`);
        if (geometry.sidebar) {
          assert.equal(geometry.sidebar.open, expectedDesktop, `${viewport.key}/${route.key}: initial sidebar open-state breakpoint mismatch`);
          if (expectedDesktop) assert.ok(geometry.sidebar.width >= 190, `${viewport.key}/${route.key}: desktop sidebar width is unexpectedly small`);
        }

        // Exercise the real overlay sidebar once per route on tablet/mobile.
        if (!expectedDesktop) {
          const menuButton = await page.$('button[aria-label*="نقشه کامل ناوبری"]');
          assert.ok(menuButton, `${viewport.key}/${route.key}: mobile/tablet menu button is missing`);
          await menuButton.click();
          await new Promise((resolve) => setTimeout(resolve, 80));
          const opened = await page.evaluate(() => {
            const sidebar = document.querySelector('[data-sidebar-contract="canonical"]');
            const backdrop = document.querySelector('[data-ui-navigation-overlay="sidebar"]');
            if (!sidebar) return { missing: true };
            const rect = sidebar.getBoundingClientRect();
            return {
              missing: false,
              open: sidebar.getAttribute('data-sidebar-open') === 'true',
              left: rect.left,
              right: rect.right,
              width: rect.width,
              viewportWidth: window.innerWidth,
              backdropVisible: Boolean(backdrop && window.getComputedStyle(backdrop).display !== 'none'),
            };
          });
          assert.equal(opened.missing, false, `${viewport.key}/${route.key}: overlay sidebar missing`);
          assert.equal(opened.open, true, `${viewport.key}/${route.key}: overlay sidebar did not open`);
          assert.ok(opened.left >= -1 && opened.right <= opened.viewportWidth + 1, `${viewport.key}/${route.key}: overlay sidebar escaped viewport`);
          assert.ok(opened.width <= opened.viewportWidth * 0.87, `${viewport.key}/${route.key}: overlay sidebar is too wide`);
          assert.equal(opened.backdropVisible, true, `${viewport.key}/${route.key}: sidebar backdrop missing`);
          await page.click('[data-ui-navigation-overlay="sidebar"]');
          await new Promise((resolve) => setTimeout(resolve, 60));
        }

        // Exercise a real form modal on the customer directory at every viewport.
        if (route.key === 'customers') {
          const openedModal = await page.evaluate(() => {
            const candidates = [...document.querySelectorAll('button')];
            const button = candidates.find((node) => String(node.textContent || '').includes('افزودن مشتری'));
            if (!button) return false;
            button.click();
            return true;
          });
          assert.equal(openedModal, true, `${viewport.key}/customers: add-customer action missing`);
          await new Promise((resolve) => setTimeout(resolve, 120));
          const modalGeometry = await page.evaluate(() => {
            const panel = document.querySelector('[data-kourosh-layer="modal"]');
            if (!panel) return { missing: true };
            const rect = panel.getBoundingClientRect();
            const body = panel.querySelector('.kourosh-modal__body, .modal-body-premium, [data-ui-modal-body="true"]');
            const bodyStyle = body ? window.getComputedStyle(body) : null;
            return {
              missing: false,
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              bodyOverflowY: bodyStyle?.overflowY || '',
            };
          });
          assert.equal(modalGeometry.missing, false, `${viewport.key}/customers: add-customer modal missing`);
          assert.ok(modalGeometry.left >= -1 && modalGeometry.right <= viewport.width + 1, `${viewport.key}/customers: modal horizontal geometry invalid`);
          assert.ok(modalGeometry.top >= -1 && modalGeometry.bottom <= viewport.height + 1, `${viewport.key}/customers: modal vertical geometry invalid`);
          assert.ok(modalGeometry.width > 0 && modalGeometry.height > 0, `${viewport.key}/customers: modal collapsed`);
          await page.keyboard.press('Escape');
          await new Promise((resolve) => setTimeout(resolve, 80));
        }

        const result = { viewport: viewport.key, route: route.key, status: 'passed', geometry };
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failure = { viewport: viewport.key, route: route.key, status: 'failed', error: message };
        results.push(failure);
        failures.push(failure);
        if (!skipScreenshots) {
          const screenshotPath = path.join(outputDir, `${viewport.key}__${route.key}.png`);
          try { await page.screenshot({ path: screenshotPath, fullPage: true }); } catch {}
        }
      } finally {
        page.off('pageerror', errorHandler);
      }
    }
  }
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (preview.exitCode === null) preview.kill();
  if (!reuseDist) fs.rmSync(runtimeDir, { recursive: true, force: true });
}

const report = {
  generatedAt: new Date().toISOString(),
  matrix: { viewports, routes, total: viewports.length * routes.length },
  summary: { passed: results.filter((item) => item.status === 'passed').length, failed: failures.length },
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

const rows = results.map((item) => `<tr><td>${item.viewport}</td><td>${item.route}</td><td>${item.status === 'passed' ? 'PASS' : 'FAIL'}</td><td>${item.error ? String(item.error).replaceAll('&','&amp;').replaceAll('<','&lt;') : ''}</td></tr>`).join('');
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Responsive Audit v287</title><style>body{font-family:Tahoma,Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:20px}main{max-width:1200px;margin:auto}.summary,table{background:white;border:1px solid #e2e8f0;border-radius:16px}.summary{padding:16px;margin-bottom:14px}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:12px}th{background:#f1f5f9}</style></head><body><main><section class="summary"><h1>Responsive Audit v287</h1><p>${report.summary.passed} PASS از ${report.matrix.total} حالت؛ ${report.summary.failed} FAIL</p><p>Viewportها: 1366، 1024، 768، 430 و 390 پیکسل</p></section><table><thead><tr><th>Viewport</th><th>Route</th><th>نتیجه</th><th>خطا</th></tr></thead><tbody>${rows}</tbody></table></main></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), html);

console.log(`Responsive runtime v287: ${report.summary.passed}/${report.matrix.total} passed.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
if (failures.length) process.exitCode = 1;
