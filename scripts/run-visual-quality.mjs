#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const skipScreenshots = args.has('--skip-screenshots');
const outputIndex = process.argv.indexOf('--output');
const requestedOutput = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'visual-quality', timestamp));
fs.mkdirSync(outputDir, { recursive: true });

const suites = [
  {
    key: 'loading-button',
    label: 'دکمه‌های Loading',
    script: 'scripts/run-loading-button-runtime-visual-matrix.mjs',
    expectedTotal: 100,
  },
  {
    key: 'dashboard',
    label: 'داشبورد',
    script: 'scripts/run-dashboard-runtime-visual-matrix.mjs',
    expectedTotal: 30,
  },
  {
    key: 'style',
    label: 'تنظیمات استایل',
    script: 'scripts/run-style-settings-visual-matrix.mjs',
    expectedTotal: 30,
  },
  {
    key: 'pwa-platform-install',
    label: 'تشخیص پلتفرم و نصب PWA',
    script: 'scripts/run-pwa-platform-install-runtime-matrix.mjs',
    expectedTotal: 8,
  },
];

const results = [];
for (const suite of suites) {
  const suiteOutput = path.join(outputDir, suite.key);
  const runnerArgs = [suite.script, '--output', suiteOutput];
  if (skipScreenshots) runnerArgs.push('--skip-screenshots');
  console.log(`\n=== ${suite.label} ===`);
  const run = spawnSync(process.execPath, runnerArgs, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 900_000,
    maxBuffer: 80 * 1024 * 1024,
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);

  const reportPath = path.join(suiteOutput, 'report.json');
  let report = null;
  let readError = null;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    readError = error instanceof Error ? error.message : String(error);
  }
  const total = Number(report?.matrix?.total || suite.expectedTotal || 0);
  const passed = Number(report?.summary?.passed || 0);
  const failed = Number(report?.summary?.failed ?? Math.max(0, total - passed));
  results.push({
    key: suite.key,
    label: suite.label,
    script: suite.script,
    exitCode: run.status ?? 1,
    reportAvailable: Boolean(report),
    reportPath: report ? `${suite.key}/index.html` : null,
    total,
    passed,
    failed,
    generatedAt: report?.generatedAt || null,
    error: run.error?.message || readError,
  });
}

const total = results.reduce((sum, item) => sum + item.total, 0);
const passed = results.reduce((sum, item) => sum + item.passed, 0);
const failed = results.reduce((sum, item) => sum + item.failed, 0);
const commandFailures = results.filter((item) => item.exitCode !== 0 || !item.reportAvailable).length;
const report = {
  generatedAt: new Date().toISOString(),
  command: skipScreenshots ? 'npm run test:visual-quality:ci' : 'npm run test:visual-quality',
  summary: {
    suites: results.length,
    total,
    passed,
    failed,
    commandFailures,
    status: failed === 0 && commandFailures === 0 ? 'passed' : 'failed',
  },
  suites: results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

const suiteCards = results.map((item) => `
<article class="suite ${item.failed === 0 && item.exitCode === 0 ? 'pass' : 'fail'}">
  <header><strong>${item.label}</strong><span>${item.passed}/${item.total}</span></header>
  <p>${item.failed.toLocaleString('fa-IR')} خطا · خروجی فرمان ${item.exitCode === 0 ? 'موفق' : 'ناموفق'}</p>
  ${item.reportPath ? `<a href="${item.reportPath}">مشاهده گزارش جزئی</a>` : '<span>گزارش جزئی ساخته نشد</span>'}
  ${item.error ? `<pre>${String(item.error).replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</pre>` : ''}
</article>`).join('');
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>گزارش تجمیعی کیفیت تصویری کوروش</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:24px;background:#f4f5f7;color:#15171a}.summary,.suite{background:#fff;border:1px solid #d8dde5;border-radius:18px}.summary{padding:18px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.suite{padding:16px}.suite header{display:flex;justify-content:space-between;gap:10px}.pass header span{color:#15803d}.fail header span{color:#b91c1c}.suite a{display:inline-flex;margin-top:8px;color:#0369a1;font-weight:700}.suite pre{direction:ltr;text-align:left;white-space:pre-wrap;font-size:11px}</style></head><body><section class="summary"><h1>کیفیت تصویری کوروش</h1><p>${passed} موفق از ${total} حالت؛ ${failed} خطا در ${results.length} مجموعه.</p><strong>وضعیت: ${report.summary.status === 'passed' ? 'کاملاً سالم' : 'نیازمند بررسی'}</strong></section><section class="grid">${suiteCards}</section></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), html);

console.log(`\nVisual quality aggregate: ${passed}/${total} passed across ${results.length} suites.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
if (failed > 0 || commandFailures > 0) process.exitCode = 1;
