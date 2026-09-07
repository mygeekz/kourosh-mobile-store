#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const outputArgIndex = process.argv.indexOf('--output');
const requestedOutput = outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null;
const skipScreenshots = args.has('--skip-screenshots');
const keepServer = args.has('--keep-server');

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
  { key: 'desktop', label: 'دسکتاپ', width: 1440, height: 900 },
];

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'palette-matrix', timestamp));
const screenshotsDir = path.join(outputDir, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const executableCandidates = [
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  process.platform === 'win32' ? path.join(process.env.PROGRAMFILES || '', 'Google/Chrome/Application/chrome.exe') : null,
  process.platform === 'win32' ? path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google/Chrome/Application/chrome.exe') : null,
  process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe') : null,
  process.platform === 'win32' ? path.join(process.env.PROGRAMFILES || '', 'Microsoft/Edge/Application/msedge.exe') : null,
  process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null,
  process.platform === 'darwin' ? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' : null,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const executable = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executable) {
  throw new Error('Chrome/Chromium پیدا نشد. مسیر مرورگر را با CHROME_PATH مشخص کنید.');
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
]);

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
  const relative = decodeURIComponent(requestUrl.pathname === '/' ? '/tools/palette-matrix/index.html' : requestUrl.pathname);
  const absolute = path.resolve(root, `.${relative}`);
  if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': mimeTypes.get(path.extname(absolute).toLowerCase()) || 'application/octet-stream',
    'Cache-Control': 'no-store, max-age=0',
  });
  fs.createReadStream(absolute).pipe(response);
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
const origin = `http://127.0.0.1:${port}`;

const browserProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-palette-matrix-'));
const commonChromeArgs = [
  '--headless=new',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=1500',
  `--user-data-dir=${browserProfile}`,
];

const runChrome = (extraArgs) => {
  let result = spawnSync(executable, [...commonChromeArgs, ...extraArgs], {
    cwd: root,
    encoding: 'utf8',
    timeout: 45_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0 && String(result.stderr || '').includes('headless')) {
    const fallback = commonChromeArgs.map(item => item === '--headless=new' ? '--headless' : item);
    result = spawnSync(executable, [...fallback, ...extraArgs], {
      cwd: root,
      encoding: 'utf8',
      timeout: 45_000,
      maxBuffer: 20 * 1024 * 1024,
    });
  }
  if (result.status !== 0) {
    throw new Error(`Chrome matrix command failed (${result.status}):\n${result.stderr || result.stdout}`);
  }
  return result;
};

const parseMatrixResult = (html) => {
  const match = html.match(/<script id="palette-matrix-result" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('خروجی JSON ماتریس در DOM پیدا نشد.');
  return JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
};

const results = [];
try {
  for (const palette of palettes) {
    for (const theme of themes) {
      for (const viewport of viewports) {
        const slug = `${palette.key}-${theme.key}-${viewport.key}`;
        const url = `${origin}/tools/palette-matrix/index.html?palette=${palette.key}&theme=${theme.key}`;
        const dom = runChrome([
          `--window-size=${viewport.width},${viewport.height}`,
          '--dump-dom',
          url,
        ]).stdout;
        const result = parseMatrixResult(dom);
        const screenshotRelative = `screenshots/${slug}.png`;
        const screenshotAbsolute = path.join(outputDir, screenshotRelative);
        if (!skipScreenshots) {
          runChrome([
            `--window-size=${viewport.width},${viewport.height}`,
            `--screenshot=${screenshotAbsolute}`,
            url,
          ]);
        }

        const checks = {
          noHorizontalOverflow: !result.overflow.horizontal,
          bodyContrast: typeof result.contrast.body === 'number' && result.contrast.body >= 4.5,
          cardContrast: typeof result.contrast.card === 'number' && result.contrast.card >= 4.5,
          inputContrast: typeof result.contrast.input === 'number' && result.contrast.input >= 4.5,
          paletteApplied: Boolean(result.tokens.primary && result.tokens.page && result.tokens.surface && result.tokens.text),
        };
        results.push({
          ...result,
          paletteLabel: palette.label,
          themeLabel: theme.label,
          viewportLabel: viewport.label,
          screenshot: skipScreenshots ? null : screenshotRelative,
          checks,
          passed: Object.values(checks).every(Boolean),
        });
        process.stdout.write(`${Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL'} ${slug}\n`);
      }
    }
  }
} finally {
  if (!keepServer) server.close();
  fs.rmSync(browserProfile, { recursive: true, force: true });
}

const failures = results.filter(result => !result.passed);
const report = {
  generatedAt: new Date().toISOString(),
  browser: executable,
  matrix: { palettes: palettes.length, themes: themes.length, viewports: viewports.length, total: results.length },
  summary: { passed: results.length - failures.length, failed: failures.length },
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

const cards = results.map(result => `
  <article class="result ${result.passed ? 'pass' : 'fail'}">
    <header><strong>${result.paletteLabel} · ${result.themeLabel} · ${result.viewportLabel}</strong><span>${result.passed ? 'PASS' : 'FAIL'}</span></header>
    ${result.screenshot ? `<a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.paletteLabel} ${result.themeLabel} ${result.viewportLabel}" loading="lazy"></a>` : ''}
    <pre>${JSON.stringify({ contrast: result.contrast, overflow: result.overflow, checks: result.checks }, null, 2)}</pre>
  </article>`).join('');
const reportHtml = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>گزارش ماتریس پالت کوروش</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:20px;background:#f4f5f7;color:#15171a}.summary{padding:16px;border-radius:16px;background:white;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.result{background:white;border:1px solid #d8dde5;border-radius:16px;overflow:hidden}.result header{display:flex;justify-content:space-between;gap:8px;padding:12px 14px}.result.pass header span{color:#15803d}.result.fail header span{color:#b91c1c}.result img{display:block;width:100%;height:auto;border-block:1px solid #e5e7eb}.result pre{direction:ltr;text-align:left;white-space:pre-wrap;padding:12px;margin:0;font-size:11px}</style></head><body><section class="summary"><h1>ماتریس تصویری سیستم رنگ کوروش</h1><p>${report.summary.passed} مورد موفق از ${results.length} حالت؛ ${report.summary.failed} خطا.</p></section><section class="grid">${cards}</section></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), reportHtml);

console.log(`\nPalette visual matrix: ${report.summary.passed}/${results.length} passed.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
if (failures.length) {
  console.error(`Matrix failed in ${failures.length} state(s).`);
  process.exitCode = 1;
}
