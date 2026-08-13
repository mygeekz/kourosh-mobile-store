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
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'dashboard-visual-matrix', timestamp));
const distDir = path.join(outputDir, 'dist');
const screenshotsDir = path.join(outputDir, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const palettes = [
  { key: 'aurora', label: 'لوکس اجرایی' },
  { key: 'classic', label: 'کلاسیک iOS' },
  { key: 'ocean', label: 'اقیانوس مدرن' },
  { key: 'sunset', label: 'فروش پرانرژی' },
  { key: 'midnight', label: 'شب حرفه‌ای' },
  { key: 'gold', label: 'طلایی مات' },
];
const themes = [
  { key: 'light', label: 'روشن' },
  { key: 'dark', label: 'تاریک' },
];
const viewports = [
  { key: 'mobile', label: 'موبایل', width: 390, height: 844 },
  { key: 'tablet', label: 'تبلت', width: 768, height: 1024 },
  { key: 'desktop', label: 'دسکتاپ', width: 1440, height: 1000 },
];

const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteCli)) throw new Error('node_modules نصب نیست؛ ابتدا setup پروژه را کامل کنید.');

const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_DASHBOARD_VISUAL_QA: '1' },
  encoding: 'utf8',
  timeout: 180_000,
  maxBuffer: 40 * 1024 * 1024,
});
if (build.status !== 0) throw new Error(`Dashboard QA build failed:\n${build.stderr || build.stdout}`);

const port = 4191;
const origin = `http://127.0.0.1:${port}`;
const previewLogs = [];
const preview = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', distDir], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_DASHBOARD_VISUAL_QA: '1' },
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
  browser = await puppeteer.launch({
    executablePath,
    args: browserLaunchArgs(),
    headless: true,
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/api/auth/me') {
      await request.respond({ status: 401, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: false }) });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/settings/public') {
      await request.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, data: { storeName: 'فروشگاه کوروش' } }) });
      return;
    }
    if (url.origin === origin && url.pathname.startsWith('/api/')) {
      await request.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, data: [] }) });
      return;
    }
    await request.continue();
  });

  for (const palette of palettes) {
    for (const theme of themes) {
      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
        const slug = `${palette.key}-${theme.key}-${viewport.key}`;
        const url = `${origin}/#/__qa/dashboard-visual?palette=${palette.key}&theme=${theme.key}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
        await page.waitForSelector('[data-qa-dashboard-runtime-matrix="real-dashboard"][data-qa-ready="true"]', { timeout: 30_000 });
        await page.waitForSelector('[data-ui-dashboard-risky-customers="true"]', { visible: true, timeout: 20_000 });
        await page.waitForSelector('[data-ui-dashboard-executive="true"]', { visible: true, timeout: 20_000 });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        const metrics = await page.evaluate(() => {
          const parseColor = (value) => {
            const parts = String(value || '').match(/[\d.]+/g)?.map(Number) || [];
            if (parts.length < 3) return null;
            return [parts[0], parts[1], parts[2], parts.length >= 4 ? parts[3] : 1];
          };
          const blend = (foreground, background) => {
            const alpha = foreground[3] + (background[3] * (1 - foreground[3]));
            if (alpha <= 0) return [0, 0, 0, 0];
            return [
              ((foreground[0] * foreground[3]) + (background[0] * background[3] * (1 - foreground[3]))) / alpha,
              ((foreground[1] * foreground[3]) + (background[1] * background[3] * (1 - foreground[3]))) / alpha,
              ((foreground[2] * foreground[3]) + (background[2] * background[3] * (1 - foreground[3]))) / alpha,
              alpha,
            ];
          };
          const effectiveBackground = (element) => {
            const chain = [];
            let node = element?.parentElement || null;
            while (node) {
              chain.push(node);
              node = node.parentElement;
            }
            let result = document.documentElement.dataset.theme === 'dark'
              ? [2, 6, 23, 1]
              : [255, 255, 255, 1];
            for (const ancestor of chain.reverse()) {
              const parsed = parseColor(getComputedStyle(ancestor).backgroundColor);
              if (parsed && parsed[3] > 0) result = blend(parsed, result);
            }
            return result;
          };
          const luminance = (rgb) => {
            const channels = rgb.slice(0, 3).map((value) => {
              const normalized = value / 255;
              return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
          };
          const contrast = (element) => {
            const foreground = parseColor(getComputedStyle(element).color);
            const background = effectiveBackground(element);
            if (!foreground || !background) return null;
            const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
            return (lighter + 0.05) / (darker + 0.05);
          };
          const inside = (child, parent) => {
            const childRect = child.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            return childRect.left >= parentRect.left - 1
              && childRect.right <= parentRect.right + 1
              && childRect.top >= parentRect.top - 1
              && childRect.bottom <= parentRect.bottom + 1;
          };
          const inspectText = (selector, minimumContrast) => Array.from(document.querySelectorAll(selector)).map((element) => {
            const parent = element.closest('.app-dashboard-widget-header, .app-dashboard-metric, .app-dashboard-surface, .app-dashboard-risk-banner') || element.parentElement;
            const style = getComputedStyle(element);
            return {
              text: element.textContent?.trim() || '',
              contrast: contrast(element),
              opacity: Number(style.opacity || 1),
              clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
              inside: parent ? inside(element, parent) : true,
              visible: style.display !== 'none' && style.visibility !== 'hidden' && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
              minimumContrast,
            };
          });
          const inspectIcons = () => Array.from(document.querySelectorAll('.app-dashboard-widget-header__icon')).map((element) => {
            const glyph = element.querySelector('i');
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              className: glyph?.className || '',
              contrast: contrast(element),
              opacity: Number(style.opacity || 1),
              width: rect.width,
              height: rect.height,
              hasGlyph: Boolean(glyph && /(?:^|\s)fa(?:-|s\s|r\s|b\s)/.test(glyph.className)),
              visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width >= 8 && rect.height >= 8,
              bareSurface: style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent',
            };
          });

          const titles = inspectText('.app-dashboard-widget-header__title', 4.5);
          const subtitles = inspectText('.app-dashboard-widget-header__subtitle', 4.5);
          const metricLabels = inspectText('.app-dashboard-metric__label', 4.5);
          const metricMeta = inspectText('.app-dashboard-metric__meta', 4.5);
          const icons = inspectIcons();
          const titleTexts = titles.map((item) => item.text);
          const root = document.querySelector('[data-ui-dashboard-page="home"]');
          return {
            palette: document.documentElement.dataset.palette || '',
            theme: document.documentElement.dataset.theme || '',
            viewport: { width: innerWidth, height: innerHeight },
            rootPresent: Boolean(root),
            documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            rootOverflow: Boolean(root && root.scrollWidth > root.clientWidth + 1),
            keyHeaders: {
              risk: titleTexts.includes('کنترل اعتبار مشتریان'),
              executive: titleTexts.includes('شروع روز مدیر'),
            },
            titles,
            subtitles,
            metricLabels,
            metricMeta,
            icons,
          };
        });

        const textPasses = (items) => items.length > 0 && items.every((item) =>
          item.visible
          && item.inside
          && !item.clipped
          && item.opacity >= 0.8
          && typeof item.contrast === 'number'
          && item.contrast >= item.minimumContrast,
        );
        const iconPasses = metrics.icons.length > 0 && metrics.icons.every((item) =>
          item.visible
          && item.hasGlyph
          && item.opacity >= 0.8
          && typeof item.contrast === 'number'
          && item.contrast >= 3,
        );
        const checks = {
          realDashboard: metrics.rootPresent,
          paletteApplied: metrics.palette === palette.key,
          themeApplied: metrics.theme === theme.key,
          keyHeadersPresent: metrics.keyHeaders.risk && metrics.keyHeaders.executive,
          titlesReadable: textPasses(metrics.titles),
          subtitlesReadable: textPasses(metrics.subtitles),
          metricLabelsReadable: textPasses(metrics.metricLabels),
          metricMetaReadable: metrics.metricMeta.length === 0 || textPasses(metrics.metricMeta),
          iconsVisible: iconPasses,
          noHorizontalOverflow: !metrics.documentOverflow && !metrics.rootOverflow,
        };
        const passed = Object.values(checks).every(Boolean);
        let screenshot = null;
        if (!skipScreenshots) {
          screenshot = `screenshots/${slug}.png`;
          await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
        }
        results.push({
          palette: palette.key,
          paletteLabel: palette.label,
          theme: theme.key,
          themeLabel: theme.label,
          viewport: viewport.key,
          viewportLabel: viewport.label,
          metrics,
          checks,
          passed,
          screenshot,
        });
        process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${slug}\n`);
      }
    }
  }

  assert.equal(pageErrors.length, 0, `Browser page errors:\n${pageErrors.join('\n')}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  preview.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => preview.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (preview.exitCode === null) preview.kill('SIGKILL');
}

const failures = results.filter((result) => !result.passed);
const report = {
  generatedAt: new Date().toISOString(),
  matrix: { palettes: palettes.length, themes: themes.length, viewports: viewports.length, total: results.length },
  summary: { passed: results.length - failures.length, failed: failures.length },
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

const cards = results.map((result) => `
<article class="card ${result.passed ? 'pass' : 'fail'}">
<header><strong>${result.paletteLabel} · ${result.themeLabel} · ${result.viewportLabel}</strong><span>${result.passed ? 'PASS' : 'FAIL'}</span></header>
${result.screenshot ? `<a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.paletteLabel} ${result.themeLabel} ${result.viewportLabel}"></a>` : ''}
<pre>${JSON.stringify({ checks: result.checks, keyHeaders: result.metrics.keyHeaders, counts: { titles: result.metrics.titles.length, subtitles: result.metrics.subtitles.length, metricLabels: result.metrics.metricLabels.length, icons: result.metrics.icons.length } }, null, 2)}</pre>
</article>`).join('');
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ماتریس واقعی خوانایی داشبورد</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:20px;background:#f4f5f7;color:#15171a}.summary,.card{background:#fff;border:1px solid #d8dde5;border-radius:16px}.summary{padding:16px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.card{overflow:hidden}.card header{display:flex;justify-content:space-between;gap:8px;padding:12px}.pass header span{color:#15803d}.fail header span{color:#b91c1c}.card img{display:block;width:100%;height:auto;border-block:1px solid #e5e7eb}.card pre{direction:ltr;text-align:left;white-space:pre-wrap;padding:12px;margin:0;font-size:11px}</style></head><body><section class="summary"><h1>ماتریس واقعی خوانایی داشبورد کوروش</h1><p>${report.summary.passed} موفق از ${results.length} حالت؛ ${report.summary.failed} خطا.</p></section><section class="grid">${cards}</section></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), html);

console.log(`\nDashboard runtime visual matrix: ${report.summary.passed}/${results.length} passed.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
if (failures.length) process.exitCode = 1;
