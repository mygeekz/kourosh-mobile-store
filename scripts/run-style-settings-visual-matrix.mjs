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
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'style-visual-matrix', timestamp));
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

const qaEnv = { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_STYLE_VISUAL_QA: '1' };
const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
  cwd: root,
  env: qaEnv,
  encoding: 'utf8',
  timeout: 180_000,
  maxBuffer: 40 * 1024 * 1024,
});
if (build.status !== 0) throw new Error(`Style Settings QA build failed:\n${build.stderr || build.stdout}`);

const port = 4192;
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
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/api/settings/quality/browser-runtime/status') {
      await request.respond({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          success: true,
          data: {
            available: true,
            browserName: 'Google Chrome',
            executablePath,
            source: browserSource,
            platform: process.platform,
            nodeVersion: process.version,
          },
        }),
      });
      return;
    }
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

  const inspectSecondaryVisualState = async () => page.evaluate(() => {
    const button = document.querySelector('[data-qa-style-hover-target="secondary"]');
    if (!(button instanceof HTMLElement)) return null;
    const style = getComputedStyle(button);
    const before = getComputedStyle(button, '::before');
    const innerNodes = Array.from(button.querySelectorAll('.ux-btn__content, .ux-btn__label, .ux-btn__label-main, .ux-btn__icon, .ux-btn__hint'));
    return {
      hoverActive: button.matches(':hover'),
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      transform: style.transform,
      color: style.color,
      overflow: style.overflow,
      borderRadius: style.borderRadius,
      beforeBackgroundColor: before.backgroundColor,
      beforeBackgroundImage: before.backgroundImage,
      beforeBorderRadius: before.borderRadius,
      beforeOpacity: before.opacity,
      beforeTransform: before.transform,
      innerBackgrounds: innerNodes.map((node) => getComputedStyle(node).backgroundColor),
    };
  });

  for (const palette of palettes) {
    for (const theme of themes) {
      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
        const slug = `${palette.key}-${theme.key}-${viewport.key}`;
        const url = `${origin}/#/__qa/style-visual?palette=${palette.key}&theme=${theme.key}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
        await page.waitForSelector('[data-qa-style-runtime-matrix="real-style-settings"][data-qa-ready="true"]', { timeout: 30_000 });
        await page.waitForSelector('[data-ui-style-control-center="true"]', { visible: true, timeout: 20_000 });
        await page.waitForSelector('[data-qa-style-hover-target="secondary"]', { visible: true, timeout: 20_000 });

        await page.mouse.move(1, 1);
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const secondaryTarget = await page.$('[data-qa-style-hover-target="secondary"]');
        assert.ok(secondaryTarget, 'Secondary hover target disappeared before visual capture.');
        const secondaryRestVisual = await inspectSecondaryVisualState();
        assert.ok(secondaryRestVisual && !secondaryRestVisual.hoverActive, 'Secondary button must begin in a non-hovered state.');
        let secondaryRestScreenshot = null;
        let secondaryHoverScreenshot = null;
        if (!skipScreenshots) {
          secondaryRestScreenshot = `screenshots/${slug}-secondary-rest.png`;
          await secondaryTarget.screenshot({ path: path.join(outputDir, secondaryRestScreenshot) });
        }

        await page.hover('[data-qa-style-hover-target="secondary"]');
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const secondaryHoverVisual = await inspectSecondaryVisualState();
        assert.ok(secondaryHoverVisual?.hoverActive, 'Puppeteer did not activate the real secondary-button hover state.');
        if (!skipScreenshots) {
          secondaryHoverScreenshot = `screenshots/${slug}-secondary-hover.png`;
          await secondaryTarget.screenshot({ path: path.join(outputDir, secondaryHoverScreenshot) });
        }

        const focusBaseline = await page.evaluate(() => {
          const target = document.querySelector('[data-qa-style-focus-target="primary"]');
          const style = target ? getComputedStyle(target) : null;
          return {
            outline: style?.outline || '',
            outlineStyle: style?.outlineStyle || '',
            boxShadow: style?.boxShadow || '',
            borderColor: style?.borderColor || '',
          };
        });
        await page.evaluate(() => {
          const target = document.querySelector('[data-qa-style-focus-target=\"primary\"]');
          if (target instanceof HTMLElement) target.blur();
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        for (let tabIndex = 0; tabIndex < 80; tabIndex += 1) {
          await page.keyboard.press('Tab');
          const focusReached = await page.evaluate(() => document.activeElement?.matches('[data-qa-style-focus-target=\"primary\"]') || false);
          if (focusReached) break;
        }

        const metrics = await page.evaluate(() => {
          const parseColor = (value) => {
            const text = String(value || '').trim();
            const rgb = text.match(/rgba?\(([^)]+)\)/i);
            if (rgb) {
              const parts = rgb[1].replaceAll(',', ' ').replace('/', ' ').split(/\s+/).filter(Boolean).map(Number);
              if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) return [parts[0], parts[1], parts[2], Number.isFinite(parts[3]) ? parts[3] : 1];
            }
            const hex = text.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);
            if (hex) {
              const raw = hex[1];
              return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16), raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1];
            }
            return null;
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
            let node = element || document.body;
            while (node) {
              chain.push(node);
              node = node.parentElement;
            }
            let result = document.documentElement.dataset.theme === 'dark' ? [2, 6, 23, 1] : [255, 255, 255, 1];
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
          const colorContrast = (element) => {
            const style = getComputedStyle(element);
            const foreground = parseColor(style.color);
            const background = effectiveBackground(element.parentElement || element);
            if (!foreground || !background) return null;
            const opacity = Number(style.opacity || 1);
            const visibleForeground = blend([foreground[0], foreground[1], foreground[2], foreground[3] * opacity], background);
            const [lighter, darker] = [luminance(visibleForeground), luminance(background)].sort((a, b) => b - a);
            return (lighter + 0.05) / (darker + 0.05);
          };
          const chroma = (rgb) => rgb ? (Math.max(...rgb.slice(0, 3)) - Math.min(...rgb.slice(0, 3))) / 255 : null;
          const inspectText = (selector) => Array.from(document.querySelectorAll(selector)).map((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
              text: element.textContent?.trim() || '',
              contrast: colorContrast(element),
              visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
              clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
            };
          });
          const root = document.querySelector('[data-ui-style-control-center="true"]');
          const shellPage = document.querySelector('.settings-shell-page');
          const workspace = document.querySelector('[data-ui-settings-workspace="true"]');
          const cards = Array.from(document.querySelectorAll('.style-settings-card'));
          const hoverButton = document.querySelector('[data-qa-style-hover-target="secondary"]');
          const hoverStyle = hoverButton ? getComputedStyle(hoverButton) : null;
          const hoverBefore = hoverButton ? getComputedStyle(hoverButton, '::before') : null;
          const innerNodes = hoverButton ? Array.from(hoverButton.querySelectorAll('.ux-btn__content, .ux-btn__label, .ux-btn__label-main, .ux-btn__icon, .ux-btn__hint')) : [];
          const innerBackgrounds = innerNodes.map((node) => getComputedStyle(node).backgroundColor);
          const selected = document.querySelector('.style-palette-choice[aria-pressed="true"]');
          const unselected = document.querySelector('.style-palette-choice[aria-pressed="false"]');
          const selectedStyle = selected ? getComputedStyle(selected) : null;
          const unselectedStyle = unselected ? getComputedStyle(unselected) : null;
          const focusTarget = document.querySelector('[data-qa-style-focus-target="primary"]');
          const focusStyle = focusTarget ? getComputedStyle(focusTarget) : null;
          const pageBackground = shellPage ? effectiveBackground(shellPage) : null;
          const workspaceBackground = workspace ? effectiveBackground(workspace) : null;
          const cardBackgrounds = cards.map((card) => effectiveBackground(card));
          const keyText = inspectText([
            '.style-workspace__title strong',
            '.style-workspace__title small',
            '.style-live-preview__header span',
            '.style-live-preview__header small',
            '.style-settings-card .ux-panel-card__title',
            '.style-settings-card .ux-panel-card__subtitle',
            '.style-control-fieldset__label',
            '[data-ui-style-quality-center="true"] strong',
            '[data-ui-style-quality-center="true"] small',
            '.style-template-card__copy > span',
            '.style-template-card__copy small',
            '.style-profile-empty',
          ].join(','));
          return {
            palette: document.documentElement.dataset.palette || '',
            theme: document.documentElement.dataset.theme || '',
            viewport: { width: innerWidth, height: innerHeight },
            rootPresent: Boolean(root),
            documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            rootOverflow: Boolean(root && root.scrollWidth > root.clientWidth + 1),
            pageSurface: pageBackground ? { rgb: pageBackground.slice(0, 3), chroma: chroma(pageBackground), luminance: luminance(pageBackground) } : null,
            workspaceSurface: workspaceBackground ? { rgb: workspaceBackground.slice(0, 3), chroma: chroma(workspaceBackground), luminance: luminance(workspaceBackground) } : null,
            cardSurfaces: cardBackgrounds.map((color) => ({ rgb: color.slice(0, 3), chroma: chroma(color), luminance: luminance(color) })),
            keyText,
            hover: {
              present: Boolean(hoverButton),
              overflow: hoverStyle?.overflow || '',
              borderRadius: hoverStyle?.borderRadius || '',
              beforePosition: hoverBefore?.position || '',
              beforeInset: [hoverBefore?.top, hoverBefore?.right, hoverBefore?.bottom, hoverBefore?.left],
              beforeBorderRadius: hoverBefore?.borderRadius || '',
              innerBackgrounds,
            },
            selected: {
              present: Boolean(selected),
              hasCheck: Boolean(selected?.querySelector('.fa-circle-check')),
              background: selectedStyle?.backgroundColor || '',
              backgroundImage: selectedStyle?.backgroundImage || '',
              borderColor: selectedStyle?.borderColor || '',
              differsFromUnselected: Boolean(selectedStyle && unselectedStyle && (
                selectedStyle.backgroundColor !== unselectedStyle.backgroundColor
                || selectedStyle.backgroundImage !== unselectedStyle.backgroundImage
                || selectedStyle.borderColor !== unselectedStyle.borderColor
              )),
            },
            focus: {
              present: document.activeElement === focusTarget,
              outline: focusStyle?.outline || '',
              outlineStyle: focusStyle?.outlineStyle || '',
              boxShadow: focusStyle?.boxShadow || '',
              borderColor: focusStyle?.borderColor || '',
            },
          };
        });

        const hoverVisualProperties = [
          'backgroundColor',
          'backgroundImage',
          'borderColor',
          'boxShadow',
          'transform',
          'color',
          'beforeBackgroundColor',
          'beforeBackgroundImage',
          'beforeOpacity',
          'beforeTransform',
        ];
        const hoverVisualChanged = hoverVisualProperties.some((property) => secondaryRestVisual[property] !== secondaryHoverVisual[property]);
        metrics.hover = {
          ...metrics.hover,
          active: secondaryHoverVisual.hoverActive,
          visualChanged: hoverVisualChanged,
          rest: secondaryRestVisual,
          hovered: secondaryHoverVisual,
        };

        const neutralLimit = theme.key === 'light' ? 0.055 : 0.12;
        const checks = {
          realStyleSettings: metrics.rootPresent,
          paletteApplied: metrics.palette === palette.key,
          themeApplied: metrics.theme === theme.key,
          pageSurfaceNeutral: Boolean(metrics.pageSurface && metrics.pageSurface.chroma <= neutralLimit && (theme.key === 'dark' || metrics.pageSurface.luminance >= 0.82)),
          workspaceSurfaceNeutral: Boolean(metrics.workspaceSurface && metrics.workspaceSurface.chroma <= neutralLimit),
          cardSurfacesNeutral: metrics.cardSurfaces.length > 0 && metrics.cardSurfaces.every((surface) => surface.chroma <= neutralLimit),
          textReadable: metrics.keyText.length > 0 && metrics.keyText.every((item) => item.visible && !item.clipped && (item.contrast === null || item.contrast >= 4.5)),
          hoverLayerRounded: metrics.hover.present
            && ['hidden', 'clip'].includes(metrics.hover.overflow)
            && metrics.hover.beforePosition === 'absolute'
            && metrics.hover.beforeInset.every((value) => value === '0px')
            && metrics.hover.beforeBorderRadius === metrics.hover.borderRadius,
          noInnerHoverRectangle: metrics.hover.innerBackgrounds.every((value) => value === 'rgba(0, 0, 0, 0)' || value === 'transparent'),
          secondaryHoverActivated: metrics.hover.active && metrics.hover.visualChanged,
          selectedStateVisible: metrics.selected.present && metrics.selected.hasCheck && metrics.selected.differsFromUnselected,
          focusStateVisible: metrics.focus.present && (
            metrics.focus.boxShadow !== focusBaseline.boxShadow
            || metrics.focus.outline !== focusBaseline.outline
            || metrics.focus.borderColor !== focusBaseline.borderColor
          ),
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
          metrics: { ...metrics, focusBaseline },
          checks,
          passed,
          screenshot,
          hoverScreenshots: {
            rest: secondaryRestScreenshot,
            hover: secondaryHoverScreenshot,
          },
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
  matrix: {
    palettes: palettes.length,
    themes: themes.length,
    viewports: viewports.length,
    total: results.length,
    secondaryButtonStates: 2,
    visualCaptures: skipScreenshots ? 0 : results.length * 3,
  },
  summary: { passed: results.length - failures.length, failed: failures.length },
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

const cards = results.map((result) => `
<article class="card ${result.passed ? 'pass' : 'fail'}">
<header><strong>${result.paletteLabel} · ${result.themeLabel} · ${result.viewportLabel}</strong><span>${result.passed ? 'PASS' : 'FAIL'}</span></header>
${result.screenshot ? `<a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.paletteLabel} ${result.themeLabel} ${result.viewportLabel}"></a>` : ''}
${result.hoverScreenshots?.rest && result.hoverScreenshots?.hover ? `<section class="hover-pair"><figure><figcaption>دکمه ثانویه · حالت عادی</figcaption><a href="${result.hoverScreenshots.rest}"><img src="${result.hoverScreenshots.rest}" alt="دکمه ثانویه در حالت عادی"></a></figure><figure><figcaption>دکمه ثانویه · Hover واقعی</figcaption><a href="${result.hoverScreenshots.hover}"><img src="${result.hoverScreenshots.hover}" alt="دکمه ثانویه در حالت هاور واقعی"></a></figure></section>` : ''}
<pre>${JSON.stringify({ checks: result.checks, page: result.metrics.pageSurface, workspace: result.metrics.workspaceSurface, hover: result.metrics.hover, selected: result.metrics.selected, focus: result.metrics.focus }, null, 2)}</pre>
</article>`).join('');
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ماتریس واقعی صفحه استایل</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:20px;background:#f4f5f7;color:#15171a}.summary,.card{background:#fff;border:1px solid #d8dde5;border-radius:16px}.summary{padding:16px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.card{overflow:hidden}.card header{display:flex;justify-content:space-between;gap:8px;padding:12px}.pass header span{color:#15803d}.fail header span{color:#b91c1c}.card> a>img{display:block;width:100%;height:auto;border-block:1px solid #e5e7eb}.hover-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px;border-bottom:1px solid #e5e7eb;background:#f8fafc}.hover-pair figure{margin:0;min-width:0}.hover-pair figcaption{margin-bottom:7px;font-size:12px;font-weight:700}.hover-pair img{display:block;max-width:100%;height:auto;margin:auto;border:1px solid #d8dde5;border-radius:12px;background:#fff}.card pre{direction:ltr;text-align:left;white-space:pre-wrap;padding:12px;margin:0;font-size:11px}@media(max-width:520px){.hover-pair{grid-template-columns:1fr}}</style></head><body><section class="summary"><h1>ماتریس واقعی تنظیمات استایل کوروش</h1><p>${report.summary.passed} موفق از ${results.length}؛ ${report.summary.failed} خطا. برای هر حالت، تصویر جداگانهٔ دکمه ثانویه در وضعیت عادی و Hover واقعی ثبت شده است.</p></section><section class="grid">${cards}</section></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), html);

console.log(`\nStyle Settings visual matrix: ${report.summary.passed}/${results.length} passed.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
if (failures.length) process.exitCode = 1;
