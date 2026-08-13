#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-chromium-cache';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const skipScreenshots = args.has('--skip-screenshots');
const outputIndex = process.argv.indexOf('--output');
const requestedOutput = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'pwa-platform-install-matrix', timestamp));
const distDir = path.join(outputDir, 'dist');
const screenshotsDir = path.join(outputDir, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const platforms = [
  {
    id: 'windows',
    label: 'ویندوز',
    installLabel: 'نصب برنامه روی ویندوز',
    family: 'desktop',
    viewport: { width: 1366, height: 900, isMobile: false, hasTouch: false },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    navigatorPlatform: 'Win32',
    clientHintPlatform: 'Windows',
    maxTouchPoints: 0,
  },
  {
    id: 'macos',
    label: 'macOS',
    installLabel: 'نصب برنامه روی مک',
    family: 'desktop',
    viewport: { width: 1366, height: 900, isMobile: false, hasTouch: false },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    navigatorPlatform: 'MacIntel',
    clientHintPlatform: 'macOS',
    maxTouchPoints: 0,
  },
  {
    id: 'android',
    label: 'اندروید',
    installLabel: 'نصب برنامه روی اندروید',
    family: 'mobile',
    viewport: { width: 412, height: 915, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    navigatorPlatform: 'Linux armv8l',
    clientHintPlatform: 'Android',
    maxTouchPoints: 5,
  },
  {
    id: 'ios',
    label: 'iPhone / iPad',
    installLabel: 'نصب برنامه روی iPhone / iPad',
    family: 'mobile',
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
    navigatorPlatform: 'iPhone',
    clientHintPlatform: 'iOS',
    maxTouchPoints: 5,
  },
];
const installedStates = [false, true];

const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteCli)) throw new Error('node_modules نصب نیست؛ ابتدا setup پروژه را کامل کنید.');

const qaEnv = { ...process.env, VITE_DISABLE_HTTPS: '1' };
const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
  cwd: root,
  env: qaEnv,
  encoding: 'utf8',
  timeout: 180_000,
  maxBuffer: 40 * 1024 * 1024,
});
if (build.status !== 0) throw new Error(`PWA platform matrix build failed:\n${build.stderr || build.stdout}`);

const port = 4194;
const origin = `http://127.0.0.1:${port}`;
const previewLogs = [];
const preview = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', distDir], {
  cwd: root,
  env: qaEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
preview.stdout.on('data', (chunk) => previewLogs.push(String(chunk)));
preview.stderr.on('data', (chunk) => previewLogs.push(String(chunk)));

const waitForPreview = async () => {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited early:\n${previewLogs.join('')}`);
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Vite preview did not become ready:\n${previewLogs.join('')}`);
};

const configureScenario = async (page, platform, installed) => {
  await page.setViewport(platform.viewport);
  await page.setUserAgent(platform.userAgent);
  await page.evaluateOnNewDocument((scenario) => {
    const defineNavigatorValue = (key, value) => {
      try {
        Object.defineProperty(navigator, key, { configurable: true, get: () => value });
      } catch {
        try { Object.defineProperty(Navigator.prototype, key, { configurable: true, get: () => value }); } catch {}
      }
    };

    defineNavigatorValue('platform', scenario.navigatorPlatform);
    defineNavigatorValue('maxTouchPoints', scenario.maxTouchPoints);
    defineNavigatorValue('standalone', scenario.standalone);
    defineNavigatorValue('userAgentData', {
      brands: [{ brand: 'Chromium', version: '150' }, { brand: 'Google Chrome', version: '150' }],
      mobile: scenario.family === 'mobile',
      platform: scenario.clientHintPlatform,
      getHighEntropyValues: async () => ({
        architecture: scenario.family === 'desktop' ? 'x86' : 'arm',
        bitness: '64',
        mobile: scenario.family === 'mobile',
        platform: scenario.clientHintPlatform,
        platformVersion: '1.0.0',
      }),
      toJSON: () => ({
        brands: [{ brand: 'Chromium', version: '150' }, { brand: 'Google Chrome', version: '150' }],
        mobile: scenario.family === 'mobile',
        platform: scenario.clientHintPlatform,
      }),
    });

    if (scenario.relatedAppsSupported) {
      Object.defineProperty(navigator, 'getInstalledRelatedApps', {
        configurable: true,
        value: async () => scenario.installed
          ? [{ platform: 'webapp', url: '/manifest.webmanifest', id: '/' }]
          : [],
      });
    } else {
      Object.defineProperty(navigator, 'getInstalledRelatedApps', { configurable: true, value: undefined });
    }

    try {
      localStorage.removeItem('kourosh_pwa_installed_v1');
      localStorage.setItem('pwa_install_overlay_dismissed_v2', '1');
    } catch {}
  }, {
    ...platform,
    installed,
    standalone: platform.id === 'ios' && installed,
    relatedAppsSupported: platform.id !== 'ios',
  });

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled?.()) return;
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/__kourosh/pwa-health') {
      await request.respond({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          ok: true,
          runtime: 'kourosh-local-pwa',
          secure: true,
          serviceWorker: '/sw.js',
          manifest: '/manifest.webmanifest',
          network: {
            publicHost: '192.168.1.110',
            publicPort: 5173,
            publicUrl: 'https://192.168.1.110:5173/#/',
            bindAddress: '0.0.0.0',
            shareable: true,
            hostDevice: platform.family === 'desktop',
            remoteAccessVerified: platform.family === 'mobile',
          },
        }),
      });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/setup/status') {
      await request.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, setupRequired: false }) });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/auth/me') {
      await request.respond({ status: 401, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: false }) });
      return;
    }
    if (url.origin === origin && (url.pathname === '/api/settings/public' || url.pathname === '/api/branding/public')) {
      await request.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, data: { storeName: 'فروشگاه کوروش' } }) });
      return;
    }
    if (url.origin === origin && url.pathname.startsWith('/api/')) {
      await request.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, data: [] }) });
      return;
    }
    await request.continue();
  });
};

const waitForInstallState = async (page, selector) => {
  await page.waitForSelector(selector, { visible: true, timeout: 20_000 });
  await page.waitForFunction(
    (target) => {
      const element = document.querySelector(target);
      const value = element?.getAttribute('data-ui-pwa-install-state');
      return value === 'installed' || value === 'not-installed';
    },
    { timeout: 20_000 },
    selector,
  );
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

const collectLoginMetrics = (page) => page.evaluate(() => {
  const root = document.querySelector('form[data-ui-pwa-install-state]');
  const entry = document.querySelector('[data-ui-pwa-install-entry]');
  const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();
  return {
    platform: root?.getAttribute('data-ui-pwa-platform') || '',
    installState: root?.getAttribute('data-ui-pwa-install-state') || '',
    entryPresent: Boolean(entry),
    entryPlatform: entry?.getAttribute('data-ui-pwa-install-entry') || '',
    entryText: entry?.textContent?.replace(/\s+/g, ' ').trim() || '',
    bodyText,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

const collectInstallMetrics = (page) => page.evaluate(() => {
  const root = document.querySelector('[data-ui-pwa-install-state]');
  const primary = document.querySelector('[data-ui-pwa-primary-action]');
  const statusBadge = document.querySelector('[data-ui-pwa-status-badge]');
  const title = document.querySelector('h1');
  const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();
  const connectionQr = document.querySelector('[data-ui-connection-qr]');
  return {
    platform: root?.getAttribute('data-ui-pwa-platform') || '',
    installState: root?.getAttribute('data-ui-pwa-install-state') || '',
    title: title?.textContent?.replace(/\s+/g, ' ').trim() || '',
    primaryPresent: Boolean(primary),
    primaryText: primary?.textContent?.replace(/\s+/g, ' ').trim() || '',
    statusBadge: statusBadge?.textContent?.replace(/\s+/g, ' ').trim() || '',
    connectionQrState: connectionQr?.getAttribute('data-ui-connection-qr') || '',
    connectionQrPresent: Boolean(connectionQr?.querySelector('svg')),
    connectionPublicUrl: document.querySelector('[data-ui-connection-public-url]')?.textContent?.trim() || '',
    bodyText,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

let browser;
const results = [];
try {
  await waitForPreview();
  const [{ default: puppeteer }, browserExecutable] = await Promise.all([
    import('puppeteer-core'),
    resolvePuppeteerBrowserExecutable({ root }),
  ]);
  const { executablePath, source: browserSource } = browserExecutable;
  console.log(`[browser] ${browserSource}: ${executablePath}`);
  browser = await puppeteer.launch({ executablePath, args: browserLaunchArgs(), headless: true });

  for (const platform of platforms) {
    for (const installed of installedStates) {
      const slug = `${platform.id}-${installed ? 'installed' : 'not-installed'}`;
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await configureScenario(page, platform, installed);

      try {
        await page.goto(`${origin}/?pwa-matrix=${slug}#/login`, { waitUntil: 'domcontentloaded', timeout: 50_000 });
        await waitForInstallState(page, 'form[data-ui-pwa-install-state]');
        const login = await collectLoginMetrics(page);
        let loginScreenshot = null;
        if (!skipScreenshots) {
          loginScreenshot = `screenshots/${slug}-login.png`;
          await page.screenshot({ path: path.join(outputDir, loginScreenshot), fullPage: true });
        }

        await page.goto(`${origin}/?pwa-matrix=${slug}#/install`, { waitUntil: 'domcontentloaded', timeout: 50_000 });
        await waitForInstallState(page, '[data-ui-pwa-install-state]');
        await page.waitForSelector('[data-ui-connection-qr]', { visible: true, timeout: 20_000 });
        const install = await collectInstallMetrics(page);
        let installScreenshot = null;
        if (!skipScreenshots) {
          installScreenshot = `screenshots/${slug}-install.png`;
          await page.screenshot({ path: path.join(outputDir, installScreenshot), fullPage: true });
        }

        const expectedState = installed ? 'installed' : 'not-installed';
        const allowedUninstalledPrimaryLabels = platform.id === 'ios'
          ? ['راهنمای نصب iPhone / iPad']
          : ['بررسی و آماده‌سازی نصب', platform.installLabel];
        const checks = {
          loginPlatformDetected: login.platform === platform.id,
          loginInstallState: login.installState === expectedState,
          loginEntryVisibility: installed ? !login.entryPresent : login.entryPresent,
          loginEntryPlatform: installed || login.entryPlatform === platform.id,
          loginOperatingSystemLabel: installed || login.entryText === platform.installLabel,
          desktopNeverUsesMobileLabel: platform.family !== 'desktop' || !login.bodyText.includes('نصب برنامه روی موبایل'),
          loginNoHorizontalOverflow: !login.documentOverflow,
          installPlatformDetected: install.platform === platform.id,
          installInstallState: install.installState === expectedState,
          installPageTitle: install.title === platform.installLabel,
          installPrimaryVisibility: installed ? !install.primaryPresent : install.primaryPresent,
          installPrimaryLabel: installed || allowedUninstalledPrimaryLabels.includes(install.primaryText),
          installedStatusVerified: installed
            ? install.statusBadge === 'نصب شده' && install.bodyText.includes(`برنامه روی ${platform.label} نصب شده است.`)
            : install.statusBadge !== 'نصب شده',
          installPageMentionsPlatform: install.bodyText.includes(platform.label),
          connectionQrPolicy: platform.family === 'desktop'
            ? install.connectionQrState === 'ready' && install.connectionQrPresent
            : install.connectionQrState === 'blocked' && !install.connectionQrPresent,
          connectionAddressPolicy: platform.family === 'desktop'
            ? install.connectionPublicUrl === 'https://192.168.1.110:5173/#/'
            : install.connectionPublicUrl === '',
          installNoHorizontalOverflow: !install.documentOverflow,
          noBrowserPageErrors: pageErrors.length === 0,
        };
        const passed = Object.values(checks).every(Boolean);
        results.push({
          platform: platform.id,
          platformLabel: platform.label,
          family: platform.family,
          installed,
          installedDetection: platform.id === 'ios' ? 'navigator.standalone' : 'getInstalledRelatedApps',
          checks,
          passed,
          pageErrors,
          login,
          install,
          screenshots: { login: loginScreenshot, install: installScreenshot },
        });
        process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${slug}\n`);
      } catch (error) {
        results.push({
          platform: platform.id,
          platformLabel: platform.label,
          family: platform.family,
          installed,
          installedDetection: platform.id === 'ios' ? 'navigator.standalone' : 'getInstalledRelatedApps',
          checks: {},
          passed: false,
          pageErrors,
          error: error instanceof Error ? error.stack || error.message : String(error),
          screenshots: { login: null, install: null },
        });
        process.stdout.write(`FAIL ${slug}\n`);
      } finally {
        await page.close().catch(() => {});
      }
    }
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  preview.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => preview.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (preview.exitCode === null) preview.kill('SIGKILL');
}

const failures = results.filter((result) => !result.passed);
const report = {
  generatedAt: new Date().toISOString(),
  matrix: {
    platforms: platforms.length,
    installedStates: installedStates.length,
    routesPerScenario: 2,
    total: results.length,
    totalScenarios: results.length,
    totalRouteChecks: results.length * 2,
  },
  summary: { passed: results.length - failures.length, failed: failures.length },
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

const cards = results.map((result) => {
  const checks = result.checks || {};
  const failedChecks = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  const screenshots = result.screenshots || {};
  return `
  <article class="card ${result.passed ? 'pass' : 'fail'}">
    <header><strong>${escapeHtml(result.platformLabel)} · ${result.installed ? 'نصب‌شده' : 'نصب‌نشده'}</strong><span>${result.passed ? 'PASS' : 'FAIL'}</span></header>
    <p>روش تشخیص نصب: <b>${escapeHtml(result.installedDetection)}</b></p>
    <div class="shots">
      ${screenshots.login ? `<a href="${escapeHtml(screenshots.login)}"><img src="${escapeHtml(screenshots.login)}" alt="Login ${escapeHtml(result.platform)}"></a>` : ''}
      ${screenshots.install ? `<a href="${escapeHtml(screenshots.install)}"><img src="${escapeHtml(screenshots.install)}" alt="Install ${escapeHtml(result.platform)}"></a>` : ''}
    </div>
    <pre>${escapeHtml(JSON.stringify({ failedChecks, checks, login: result.login, install: result.install, pageErrors: result.pageErrors, error: result.error }, null, 2))}</pre>
  </article>`;
}).join('');

const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PWA Platform Install Runtime Matrix</title>
<style>
body{margin:0;background:#f4f6f9;color:#172033;font-family:Tahoma,Arial,sans-serif}.wrap{max-width:1500px;margin:auto;padding:24px}h1{margin:0 0 8px}.summary{margin:0 0 22px;color:#526078}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}.card{background:white;border:1px solid #d8dee8;border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(20,30,50,.06)}.card header{display:flex;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e5e9f0}.card.pass header span{color:#087c4c}.card.fail{border-color:#e5484d}.card.fail header span{color:#c3222a}.card p{padding:0 16px}.shots{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 16px}.shots img{display:block;width:100%;max-height:420px;object-fit:contain;border:1px solid #e1e6ee;border-radius:12px;background:#0a0b10}pre{direction:ltr;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 16px 16px;padding:12px;border-radius:12px;background:#101522;color:#dce5f7;font:12px/1.6 Consolas,monospace}@media(max-width:640px){.wrap{padding:12px}.grid{grid-template-columns:1fr}.shots{grid-template-columns:1fr}}
</style>
</head>
<body><main class="wrap"><h1>ماتریس واقعی تشخیص پلتفرم و نصب PWA</h1><p class="summary">${report.summary.passed} از ${results.length} سناریو موفق · Windows، macOS، Android و iOS · نصب‌شده و نصب‌نشده</p><section class="grid">${cards}</section></main></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), html);

console.log(`PWA platform install runtime matrix: ${report.summary.passed}/${results.length} passed.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
assert.equal(failures.length, 0, `PWA platform install runtime matrix failed:\n${failures.map((item) => `${item.platform}-${item.installed ? 'installed' : 'not-installed'}`).join('\n')}`);
