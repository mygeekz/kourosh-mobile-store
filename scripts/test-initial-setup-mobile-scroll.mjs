#!/usr/bin/env node
/* global document, HTMLButtonElement, HTMLElement, innerHeight, window */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-chromium-cache';

const { default: puppeteer } = await import('puppeteer-core');
const root = process.cwd();
const port = 4177;
const origin = `http://127.0.0.1:${port}`;
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const previewLogs = [];
const preview = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
preview.stdout.on('data', (chunk) => previewLogs.push(String(chunk)));
preview.stderr.on('data', (chunk) => previewLogs.push(String(chunk)));

const waitForPreview = async () => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited early:\n${previewLogs.join('')}`);
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Vite preview did not become ready:\n${previewLogs.join('')}`);
};

let browser;
try {
  await waitForPreview();
  const browserExecutable = await resolvePuppeteerBrowserExecutable({ root });
  browser = await puppeteer.launch({
    executablePath: browserExecutable.executablePath,
    args: browserLaunchArgs(),
    headless: true,
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('pwa_install_overlay_dismissed_v2', '1');
  });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/api/setup/status') {
      await request.respond({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ success: true, setupRequired: true, canInitialize: true }),
      });
      return;
    }
    if (url.origin === origin && url.pathname === '/api/settings/public') {
      await request.respond({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ success: true, data: { storeName: 'فروشگاه کوروش' } }),
      });
      return;
    }
    if (url.origin === origin && url.pathname.startsWith('/api/')) {
      await request.respond({
        status: 401,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ success: false, message: 'Unauthorized' }),
      });
      return;
    }
    await request.continue();
  });

  const results = [];
  for (const viewport of [
    { name: 'small-phone', width: 320, height: 568 },
    { name: 'modern-phone', width: 390, height: 844 },
    { name: 'phone-landscape', width: 844, height: 390 },
  ]) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.goto(`${origin}/#/setup`, { waitUntil: 'networkidle0', timeout: 45_000 });
    await page.waitForFunction(() =>
      Boolean(document.querySelector('#setup-confirm-password')) ||
      Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('شروع راه‌اندازی')),
    { timeout: 20_000 });
    await page.evaluate(() => {
      if (document.querySelector('#setup-confirm-password')) return;
      const start = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('شروع راه‌اندازی'));
      if (!(start instanceof HTMLButtonElement)) throw new Error('Initial setup start action was not found.');
      start.click();
    });
    await page.waitForSelector('#setup-confirm-password', { visible: true, timeout: 20_000 });
    const metrics = await page.evaluate(() => {
      const scroller = document.querySelector('[data-ui-initial-setup-scroll="true"]');
      if (!(scroller instanceof HTMLElement)) throw new Error('Initial setup scroll region was not found.');
      scroller.scrollTop = 0;
      const nestedScrollTopBefore = scroller.scrollTop;
      const pageScrollTopBefore = window.scrollY;
      window.scrollTo(0, document.documentElement.scrollHeight);
      const submit = document.querySelector('#setup-confirm-password')?.closest('form')?.querySelector('button[type="submit"]');
      const submitRect = submit?.getBoundingClientRect();
      return {
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        overflowY: window.getComputedStyle(scroller).overflowY,
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
        nestedScrollTopBefore,
        nestedScrollTopAfter: scroller.scrollTop,
        pageScrollTopBefore,
        pageScrollTopAfter: window.scrollY,
        pageScrollHeight: document.documentElement.scrollHeight,
        pageClientHeight: document.documentElement.clientHeight,
        submitTop: submitRect?.top ?? Number.MAX_SAFE_INTEGER,
        submitBottom: submitRect?.bottom ?? Number.MAX_SAFE_INTEGER,
        viewportHeight: innerHeight,
      };
    });
    assert.equal(metrics.horizontalOverflow, false, `${viewport.name} setup has horizontal overflow.`);
    assert.doesNotMatch(metrics.overflowY, /auto|scroll/, `${viewport.name} setup must not create a nested scroller.`);
    assert.ok(metrics.scrollHeight <= metrics.clientHeight + 1, `${viewport.name} setup nested region still overflows: ${JSON.stringify(metrics)}`);
    assert.equal(metrics.nestedScrollTopAfter, metrics.nestedScrollTopBefore, `${viewport.name} nested setup region moved.`);
    if (metrics.pageScrollHeight > metrics.pageClientHeight + 1) {
      assert.ok(metrics.pageScrollTopAfter > metrics.pageScrollTopBefore, `${viewport.name} page did not provide the fallback scroll owner.`);
    }
    assert.ok(metrics.submitTop >= 0 && metrics.submitBottom <= metrics.viewportHeight + 1, `${viewport.name} confirmation action is unreachable: ${JSON.stringify(metrics)}`);
    results.push({ ...viewport, ...metrics });
  }

  assert.equal(pageErrors.length, 0, `Initial setup browser errors:\n${pageErrors.join('\n')}`);
  console.log(JSON.stringify({ status: 'passed', results }, null, 2));
} finally {
  if (browser) await browser.close().catch(() => {});
  preview.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => preview.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (preview.exitCode === null) preview.kill('SIGKILL');
}
