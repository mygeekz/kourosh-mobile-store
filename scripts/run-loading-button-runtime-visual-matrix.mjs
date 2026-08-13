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
const restoreOnly = args.has('--restore-only');
const outputIndex = process.argv.indexOf('--output');
const requestedOutput = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'loading-button-matrix', timestamp));
const distDir = path.join(outputDir, 'dist');
const screenshotsDir = path.join(outputDir, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const palettes = ['aurora', 'classic', 'ocean', 'sunset', 'midnight', 'gold'];
const themes = ['light', 'dark'];
const scenarios = [
  { key: 'backup', label: 'بکاپ واقعی', minHeight: 44, maxHeight: 68 },
  { key: 'restore', label: 'ریستور واقعی', minHeight: 48, maxHeight: 92 },
  { key: 'login', label: 'ورود واقعی', minHeight: 52, maxHeight: 68 },
  { key: 'setup', label: 'ساخت حساب اولیه', minHeight: 52, maxHeight: 68 },
  { key: 'phone', label: 'ثبت گوشی واقعی', minHeight: 48, maxHeight: 68 },
];
const viewports = [
  { key: 'mobile', label: 'موبایل', width: 390, height: 844 },
  { key: 'restore-narrow', label: 'مودال باریک', width: 680, height: 508, restoreOnly: true },
  { key: 'desktop', label: 'دسکتاپ', width: 1440, height: 900 },
];

const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteCli)) throw new Error('node_modules نصب نیست؛ ابتدا setup پروژه را کامل کنید.');

const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_LOADING_BUTTON_QA: '1' },
  encoding: 'utf8',
  timeout: 180_000,
  maxBuffer: 40 * 1024 * 1024,
});
if (build.status !== 0) throw new Error(`QA build failed:\n${build.stderr || build.stdout}`);

const port = 4187;
const origin = `http://127.0.0.1:${port}`;
const previewLogs = [];
const preview = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', distDir], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_LOADING_BUTTON_QA: '1' },
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

const parseRgb = (value) => {
  const parts = value.match(/[\d.]+/g)?.map(Number) || [];
  return parts.length >= 3 ? parts.slice(0, 3) : null;
};
const luminance = ([r, g, b]) => {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (foreground, background) => {
  const fg = parseRgb(foreground);
  const bg = parseRgb(background);
  if (!fg || !bg) return null;
  const [lighter, darker] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
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
        for (const scenario of scenarios) {
          if (restoreOnly && scenario.key !== 'restore') continue;
          if (viewport.restoreOnly && scenario.key !== 'restore') continue;
          const slug = `${scenario.key}-${palette}-${theme}-${viewport.key}`;
          const url = `${origin}/#/__qa/loading-buttons?scenario=${scenario.key}&palette=${palette}&theme=${theme}`;
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 50_000 });
          await page.waitForSelector('[data-qa-ready="true"]', { timeout: 20_000 });
          await page.waitForSelector('button[data-loading-contract="canonical-v2"]', { visible: true, timeout: 20_000 });
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

          const metrics = await page.evaluate(() => {
            const button = document.querySelector('button[data-loading-contract="canonical-v2"]');
            // Button also renders an off-screen intrinsic measurement tree. Every
            // assertion must be scoped to the visible state content; querying the
            // whole button selects the hidden measurement nodes first and makes
            // all 100 scenarios fail even when the runtime button is correct.
            const content = button?.querySelector(':scope > .ux-btn__content--state')
              || button?.querySelector('.ux-btn__content--state');
            const icon = content?.querySelector('.ux-btn__state-icon');
            const spinner = content?.querySelector('.ux-btn__state-spinner');
            const copy = content?.querySelector('.ux-btn__state-copy');
            const main = content?.querySelector('.ux-btn__state-main');
            const hint = content?.querySelector('.ux-btn__state-hint');
            const track = content?.querySelector('.ux-btn__loading-track');
            const runner = track?.querySelector('.ux-btn__loading-runner');
            const rect = button?.getBoundingClientRect();
            const mainRect = main?.getBoundingClientRect();
            const hintRect = hint?.getBoundingClientRect();
            const trackRect = track?.getBoundingClientRect();
            const style = button ? getComputedStyle(button) : null;
            const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
            const trackStyle = track ? getComputedStyle(track) : null;
            const dialog = button?.closest('[role="dialog"]');
            const modalBody = dialog?.querySelector('.kourosh-modal__body');
            const actionHost = button?.parentElement;
            const dialogRect = dialog?.getBoundingClientRect();
            const actionRect = actionHost?.getBoundingClientRect();
            const within = (child) => !child || !rect || (child.left >= rect.left - 1 && child.right <= rect.right + 1 && child.top >= rect.top - 1 && child.bottom <= rect.bottom + 1);
            return {
              contract: button?.getAttribute('data-loading-contract') || '',
              layout: button?.getAttribute('data-loading-layout') || '',
              hostMode: button?.getAttribute('data-loading-host-mode') || '',
              viewportWidth: innerWidth,
              button: rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
              documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
              stateNodes: {
                content: Boolean(content), icon: Boolean(icon), spinner: Boolean(spinner), copy: Boolean(copy), main: Boolean(main), track: Boolean(track), runner: Boolean(runner), hint: Boolean(hint),
              },
              selectedVisibleStateTree: Boolean(content && copy && main && track && !content.closest('.ux-btn__intrinsic-measure')),
              mainText: main?.textContent?.trim() || '',
              hintText: hint?.textContent?.trim() || '',
              mainInside: within(mainRect),
              hintInside: within(hintRect),
              trackInside: within(trackRect),
              trackWidth: trackRect?.width || 0,
              trackHeight: trackRect?.height || 0,
              opacity: Number(style?.opacity || 0),
              borderRadius: Number.parseFloat(style?.borderTopLeftRadius || '0') || 0,
              spinnerAnimationName: spinnerStyle?.animationName || '',
              color: style?.color || '',
              backgroundColor: style?.backgroundColor || '',
              backgroundImage: style?.backgroundImage || '',
              trackBackground: trackStyle?.backgroundColor || '',
              internalSignature: content ? Array.from(content.children).map((node) => `${node.tagName}.${node.className}`).join('>') : '',
              modal: {
                found: Boolean(dialog && dialogRect && modalBody && actionHost && actionRect),
                panelContained: Boolean(dialogRect && dialogRect.left >= -1 && dialogRect.right <= innerWidth + 1 && dialogRect.top >= -1 && dialogRect.bottom <= innerHeight + 1),
                panelHorizontalOverflow: Boolean(dialog && dialog.scrollWidth > dialog.clientWidth + 1),
                bodyHorizontalOverflow: Boolean(modalBody && modalBody.scrollWidth > modalBody.clientWidth + 1),
                actionsHorizontalOverflow: Boolean(actionHost && actionHost.scrollWidth > actionHost.clientWidth + 1),
                buttonInsideActions: Boolean(rect && actionRect && rect.left >= actionRect.left - 1 && rect.right <= actionRect.right + 1),
              },
            };
          });

          const ratio = contrast(metrics.color, metrics.backgroundColor);
          const checks = {
            canonicalContract: metrics.contract === 'canonical-v2' && metrics.layout === 'adaptive',
            completeDom: metrics.selectedVisibleStateTree && Object.entries(metrics.stateNodes).filter(([key]) => key !== 'hint').every(([, value]) => value),
            minimumHeight: Boolean(metrics.button && metrics.button.height >= scenario.minHeight - 1),
            controlledHeight: Boolean(metrics.button && metrics.button.height <= scenario.maxHeight + 1),
            controlledRadius: metrics.borderRadius > 0 && metrics.borderRadius <= 24,
            activeStateMotion: metrics.stateNodes.spinner && metrics.spinnerAnimationName !== 'none',
            viewportContained: Boolean(metrics.button && metrics.button.left >= -1 && metrics.button.right <= metrics.viewportWidth + 1),
            noHorizontalOverflow: !metrics.documentOverflow,
            textInside: metrics.mainInside && metrics.hintInside,
            progressInside: metrics.trackInside && metrics.trackWidth >= 80 && metrics.trackHeight >= 4,
            visibleState: metrics.opacity >= 0.95,
            readableContrast: ratio === null || ratio >= 4.5 || metrics.backgroundImage !== 'none',
            restoreModalContained: scenario.key !== 'restore' || (
              metrics.modal.found
              && metrics.modal.panelContained
              && !metrics.modal.panelHorizontalOverflow
              && !metrics.modal.bodyHorizontalOverflow
              && !metrics.modal.actionsHorizontalOverflow
              && metrics.modal.buttonInsideActions
            ),
          };
          const passed = Object.values(checks).every(Boolean);
          let screenshot = null;
          if (!skipScreenshots) {
            screenshot = `screenshots/${slug}.png`;
            await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
          }
          results.push({ palette, theme, viewport: viewport.key, scenario: scenario.key, scenarioLabel: scenario.label, metrics, contrast: ratio, checks, passed, screenshot });
          process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${slug}\n`);
        }
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
  matrix: { palettes: palettes.length, themes: themes.length, viewports: viewports.length, scenarios: scenarios.length, total: results.length },
  summary: { passed: results.length - failures.length, failed: failures.length },
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

const cards = results.map((result) => `
<article class="card ${result.passed ? 'pass' : 'fail'}">
<header><strong>${result.scenarioLabel} · ${result.palette} · ${result.theme} · ${result.viewport}</strong><span>${result.passed ? 'PASS' : 'FAIL'}</span></header>
${result.screenshot ? `<a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.scenarioLabel}"></a>` : ''}
<pre>${JSON.stringify({ checks: result.checks, button: result.metrics.button, track: [result.metrics.trackWidth, result.metrics.trackHeight], signature: result.metrics.internalSignature }, null, 2)}</pre>
</article>`).join('');
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ماتریس واقعی دکمه‌های Loading</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:20px;background:#f4f5f7;color:#15171a}.summary,.card{background:#fff;border:1px solid #d8dde5;border-radius:16px}.summary{padding:16px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.card{overflow:hidden}.card header{display:flex;justify-content:space-between;gap:8px;padding:12px}.pass header span{color:#15803d}.fail header span{color:#b91c1c}.card img{display:block;width:100%;height:auto;border-block:1px solid #e5e7eb}.card pre{direction:ltr;text-align:left;white-space:pre-wrap;padding:12px;margin:0;font-size:11px}</style></head><body><section class="summary"><h1>ماتریس واقعی دکمه‌های Loading کوروش</h1><p>${report.summary.passed} موفق از ${results.length}؛ ${report.summary.failed} خطا.</p></section><section class="grid">${cards}</section></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), html);

console.log(`\nRuntime loading-button visual matrix: ${report.summary.passed}/${results.length} passed.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
if (failures.length) process.exitCode = 1;
