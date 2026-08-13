#!/usr/bin/env node
/* global document, location, requestAnimationFrame, window */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-chromium-cache';

const root = process.cwd();
const dashboardSource = fs.readFileSync(path.join(root, 'pages', 'Dashboard.tsx'), 'utf8');
assert.match(dashboardSource, /type\s+ManagerActionSummary\s*=\s*\{/, 'Dashboard must define ManagerActionSummary before production build.');
assert.match(dashboardSource, /const\s+emptyManagerActionSummary\s*=\s*\(\)\s*:\s*ManagerActionSummary\s*=>/, 'Dashboard must define emptyManagerActionSummary before production build.');
const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-dashboard-stability-'));
const distDir = path.join(runtimeDir, 'dist');
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_DASHBOARD_VISUAL_QA: '1' },
  encoding: 'utf8',
  timeout: 180_000,
  maxBuffer: 40 * 1024 * 1024,
});
if (build.status !== 0) throw new Error(`Dashboard stability build failed:\n${build.stderr || build.stdout}`);

const port = await reservePort();
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
    } catch {
      // Preview is still starting; retry until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Vite preview did not become ready:\n${previewLogs.join('')}`);
};

const json = (request, data) => request.respond({
  status: 200,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(data),
});

let browser;
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
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  const requestCounts = { summary: 0, installments: 0, products: 0, phones: 0, layout: 0 };
  const apiPaths = [];
  const runtimeWarnings = [];
  const pageErrors = [];

  page.on('console', (message) => {
    const text = message.text();
    if (/Maximum update depth|width\(-1\)|height\(-1\)/i.test(text)) runtimeWarnings.push(text);
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/uploads/avatars/qa-avatar.png') {
      await request.respond({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mNkYPj/n4GBgYGJAQoAHgQCAe1a9XAAAAAASUVORK5CYII=', 'base64'),
      });
      return;
    }
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
      await request.continue();
      return;
    }
    apiPaths.push(url.pathname);

    if (url.pathname === '/api/me') {
      await json(request, { success: true, user: { id: 1, username: 'qa-admin', firstName: 'مدیر', lastName: 'کیفیت', roleName: 'Admin', avatarUrl: null } });
      return;
    }
    if (url.pathname === '/api/me/upload-avatar') {
      await json(request, { success: true, data: { avatarUrl: '/uploads/avatars/qa-avatar.png' } });
      return;
    }
    if (url.pathname === '/api/module-flags') {
      await json(request, { success: true, data: {} });
      return;
    }
    if (url.pathname === '/api/dashboard/summary') {
      requestCounts.summary += 1;
      await json(request, {
        success: true,
        data: {
          kpis: { revenueToday: 12500000, salesThisMonth: 42000000, pendingRepairs: 2, lowStockItems: 1 },
          recentActivities: [],
          salesChartData: [
            { name: 'شنبه', sales: 5000000 },
            { name: 'یکشنبه', sales: 7500000 },
          ],
        },
      });
      return;
    }
    if (url.pathname === '/api/dashboard/layout') {
      requestCounts.layout += 1;
      await json(request, { success: true, data: null });
      return;
    }
    if (url.pathname === '/api/reports/installments-calendar') {
      requestCounts.installments += 1;
      await json(request, { success: true, data: [] });
      return;
    }
    if (url.pathname === '/api/products') {
      requestCounts.products += 1;
      await json(request, { success: true, data: [] });
      return;
    }
    if (url.pathname === '/api/phones') {
      requestCounts.phones += 1;
      await json(request, { success: true, data: [] });
      return;
    }
    if (url.pathname === '/api/customers/trust-profiles') {
      await json(request, { success: true, data: [] });
      return;
    }
    if (url.pathname === '/api/intelligence/kourosh-pulse/dashboard-alerts') {
      await json(request, {
        success: true,
        data: {
          displayName: 'نبض کوروش',
          subtitle: 'اعلان‌های هوشمند فروشگاه',
          analysisState: 'insufficient',
          summary: { totalAlerts: 0, highestSeverity: null },
          alerts: [],
          signals: [],
          inventoryObservation: {
            status: 'insufficient',
            summary: { observedItems: 0, totalStockedUnits: 0, lowStockItems: 0, agingItems: 0, recentlySoldProducts: 0 },
            dataCoverage: { inventoryAvailable: false, datedInventoryCoveragePct: 0, recentSalesHistoryAvailable: false },
            items: [],
          },
        },
      });
      return;
    }
    if (url.pathname === '/api/reports/financial-overview') {
      const bucket = { fullProfit: 99_500_489, realizedProfit: 500_489, realizedRevenue: 120_000_489, rowsCount: 14 };
      const installmentBucket = { fullProfit: 29_500_489, realizedProfit: 20_000_489, realizedRevenue: 120_000_489, rowsCount: 1 };
      await json(request, {
        success: true,
        data: {
          sales: { productSalesTotal: 0 },
          profit: {
            managementBuckets: {
              accessories: bucket,
              cashPhone: bucket,
              installmentPhone: installmentBucket,
              credit: bucket,
            },
          },
        },
      });
      return;
    }
    if (url.pathname === '/api/settings/quality/style-report/status') {
      await json(request, { success: true, data: null });
      return;
    }
    await json(request, { success: true, data: [] });
  });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('authToken', 'dashboard-stability-token');
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'qa-admin', fullName: 'مدیر کنترل کیفیت', roleName: 'Admin' }));
    localStorage.setItem('koroush.style.v2', JSON.stringify({ theme: 'dark', palette: 'gold' }));
  });
  await page.goto(`${origin}/#/__qa/dashboard-visual?palette=gold&theme=dark`, { waitUntil: 'networkidle0', timeout: 60_000 });
  try {
    await page.waitForSelector('[data-ui-dashboard-widget-kind="clock"] [role="progressbar"]', { visible: true, timeout: 30_000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      body: document.body.innerText.slice(0, 1600),
      authToken: localStorage.getItem('authToken'),
      user: localStorage.getItem('currentUser'),
    }));
    throw new Error(`Dashboard clock was not available: ${JSON.stringify({ diagnostic, apiPaths, runtimeWarnings, pageErrors })}`, { cause: error });
  }
  await page.waitForSelector('[data-ui-dashboard-widget-kind="sales-chart"]', { visible: true, timeout: 30_000 });
  try {
    await page.waitForSelector('[data-ui-dashboard-widget-kind="sales-chart"] svg', { visible: true, timeout: 30_000 });
  } catch (error) {
    const diagnostic = await page.$eval('[data-ui-dashboard-widget-kind="sales-chart"]', (element) => ({
      text: element.textContent?.trim() || '',
      html: element.innerHTML.slice(0, 1200),
      rect: element.getBoundingClientRect().toJSON(),
      stageRect: element.querySelector('.app-dashboard-chart__stage')?.getBoundingClientRect().toJSON() || null,
    }));
    throw new Error(`Sales chart did not mount after measurement: ${JSON.stringify({ diagnostic, requestCounts, runtimeWarnings, pageErrors })}`, { cause: error });
  }
  await new Promise((resolve) => setTimeout(resolve, 2_500));

  const stableCounts = { ...requestCounts };
  const progressBefore = await page.$eval('[data-ui-dashboard-widget-kind="clock"] [role="progressbar"] > span', (element) => element.style.inlineSize);
  await new Promise((resolve) => setTimeout(resolve, 1_250));
  const progressAfter = await page.$eval('[data-ui-dashboard-widget-kind="clock"] [role="progressbar"] > span', (element) => element.style.inlineSize);
  const progressMotion = await page.$eval('[data-ui-dashboard-widget-kind="clock"] [role="progressbar"] > span', (element) => ({
    transitionProperty: window.getComputedStyle(element).transitionProperty,
    runningAnimations: element.getAnimations().filter((animation) => animation.playState === 'running').length,
  }));
  await new Promise((resolve) => setTimeout(resolve, 1_500));

  const viewportChecks = [];
  for (const viewport of [
    { key: 'small-mobile', width: 360, height: 800 },
    { key: 'mobile', width: 390, height: 844 },
    { key: 'tablet', width: 768, height: 1024 },
    { key: 'desktop', width: 1440, height: 1000 },
  ]) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const metrics = await page.evaluate(() => {
      const chart = document.querySelector('[data-ui-dashboard-widget-kind="sales-chart"]');
      const stage = chart?.querySelector('.app-dashboard-chart__stage');
      const progress = document.querySelector('[data-ui-dashboard-widget-kind="clock"] [role="progressbar"]');
      const managerPanel = document.querySelector('[data-ui-dashboard-executive="true"]');
      const chartRect = chart?.getBoundingClientRect();
      const stageRect = stage?.getBoundingClientRect();
      const progressRect = progress?.getBoundingClientRect();
      const managerRect = managerPanel?.getBoundingClientRect();
      const managerProfitCards = Array.from(managerPanel?.querySelectorAll('[data-ui-manager-profit-buckets="true"] > .app-dashboard-metric') || []);
      const managerRateBadges = managerProfitCards.map((card) => card.querySelector('[data-profit-collection-rate]')).filter(Boolean);
      const installmentProfitCard = managerProfitCards.find((card) => card.textContent?.includes('سود اقساطی گوشی'));
      return {
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        chartWidth: chartRect?.width || 0,
        chartHeight: chartRect?.height || 0,
        stageWidth: stageRect?.width || 0,
        stageHeight: stageRect?.height || 0,
        progressWidth: progressRect?.width || 0,
        progressHeight: progressRect?.height || 0,
        managerWidth: managerRect?.width || 0,
        managerProfitCount: managerPanel?.querySelectorAll('[data-ui-manager-profit-buckets="true"] > .app-dashboard-metric').length || 0,
        managerRateBadgeCount: managerRateBadges.length,
        installmentRateVisible: installmentProfitCard?.textContent?.includes('۶۷٫۸٪') || false,
        installmentValueExact: installmentProfitCard?.textContent?.includes('۲۰٬۰۰۰٬۴۸۹ تومان') || false,
        installmentValueRounded: installmentProfitCard?.textContent?.includes('۲۰٬۰۰۰٬۰۰۰ تومان') || false,
        installmentRateTone: installmentProfitCard?.querySelector('[data-profit-collection-rate]')?.getAttribute('data-profit-collection-rate-tone') || null,
        clippedManagerMeta: managerProfitCards.filter((card) => {
          const meta = card.querySelector('.app-dashboard-metric__meta');
          return meta && (meta.scrollWidth > meta.clientWidth + 1 || meta.scrollHeight > meta.clientHeight + 1);
        }).length,
        managerPriorityCount: managerPanel?.querySelectorAll('[data-ui-manager-daily-priorities="true"] > .app-dashboard-metric').length || 0,
        chartSvg: Boolean(chart?.querySelector('svg')),
      };
    });
    viewportChecks.push({ ...viewport, ...metrics });
    assert.equal(metrics.documentOverflow, false, `${viewport.key} dashboard has horizontal overflow.`);
    assert.ok(metrics.chartWidth > 0 && metrics.chartHeight > 0 && metrics.stageWidth > 0 && metrics.stageHeight > 0, `${viewport.key} sales chart container is not measurable.`);
    if (viewport.key !== 'small-mobile') assert.ok(metrics.progressWidth > 0 && metrics.progressHeight > 0, `${viewport.key} clock progress is not visible.`);
    assert.ok(metrics.managerWidth > 0 && metrics.managerWidth <= viewport.width, `${viewport.key} manager start-day panel exceeds the viewport.`);
    assert.equal(metrics.managerProfitCount, 4, `${viewport.key} manager start-day panel must show four profit buckets.`);
    assert.equal(metrics.managerRateBadgeCount, 4, `${viewport.key} manager profit cards must show four collection-rate badges.`);
    assert.equal(metrics.installmentRateVisible, true, `${viewport.key} installment manager card must show 67.8 percent.`);
    assert.equal(metrics.installmentValueExact, true, `${viewport.key} installment manager card must preserve the exact Toman amount.`);
    assert.equal(metrics.installmentValueRounded, false, `${viewport.key} installment manager card must not round to thousand-Toman resolution.`);
    assert.equal(metrics.installmentRateTone, 'warn', `${viewport.key} 67.8 percent manager rate must use warning tone.`);
    assert.equal(metrics.clippedManagerMeta, 0, `${viewport.key} manager profit metadata must remain fully visible.`);
    assert.equal(metrics.managerPriorityCount, 3, `${viewport.key} manager start-day panel must show three daily priorities.`);
    if (viewport.key !== 'small-mobile') assert.equal(metrics.chartSvg, true, `${viewport.key} sales chart SVG is missing.`);
  }

  assert.deepEqual(requestCounts, stableCounts, `Dashboard requests did not stabilize: ${JSON.stringify({ stableCounts, requestCounts })}`);
  assert.notEqual(progressAfter, progressBefore, 'Clock progress width did not advance after the live timer tick.');
  assert.match(progressMotion.transitionProperty, /inline-size/, 'Clock progress must animate the same logical-size property React updates.');
  assert.ok(progressMotion.runningAnimations >= 1, 'Clock progress must expose a visible live-motion indicator.');
  assert.equal(runtimeWarnings.length, 0, `Dashboard runtime warnings:\n${runtimeWarnings.join('\n')}`);
  assert.equal(pageErrors.length, 0, `Dashboard page errors:\n${pageErrors.join('\n')}`);
  assert.ok(requestCounts.summary >= 1 && requestCounts.summary <= 2, `Unexpected summary request count: ${requestCounts.summary}`);
  assert.ok(requestCounts.layout >= 1 && requestCounts.layout <= 2, `Unexpected layout request count: ${requestCounts.layout}`);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${origin}/#/profile`, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.waitForSelector('input[type="file"][accept*="image/png"]', { timeout: 30_000 });
  const fileInput = await page.$('input[type="file"][accept*="image/png"]');
  assert.ok(fileInput, 'Profile avatar input is missing.');
  const uploadAsymmetricAvatar = async () => page.$eval('input[type="file"][accept*="image/png"]', async (input) => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Avatar transform test canvas is unavailable.');
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 120, 80);
    context.fillStyle = '#00ff00';
    context.fillRect(120, 0, 120, 80);
    context.fillStyle = '#0000ff';
    context.fillRect(0, 80, 120, 80);
    context.fillStyle = '#ffff00';
    context.fillRect(120, 80, 120, 80);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Avatar test image was not created.')), 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'avatar-transform-test.png', { type: 'image/png' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await uploadAsymmetricAvatar();
  await page.waitForSelector('[data-avatar-crop-dialog="true"]', { visible: true, timeout: 15_000 });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const cropViewportChecks = [];
  for (const viewport of [
    { key: 'small-mobile', width: 320, height: 568 },
    { key: 'mobile', width: 390, height: 844 },
    { key: 'tablet', width: 768, height: 1024 },
    { key: 'desktop', width: 1440, height: 1000 },
  ]) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const metrics = await page.evaluate(() => {
      const content = document.querySelector('[data-avatar-crop-dialog="true"]');
      const dialog = content?.closest('[role="dialog"]');
      const stage = document.querySelector('[data-avatar-crop-stage="true"]');
      const dialogRect = dialog?.getBoundingClientRect();
      const stageRect = stage?.getBoundingClientRect();
      return {
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        dialogLeft: dialogRect?.left || 0,
        dialogRight: dialogRect?.right || 0,
        dialogTop: dialogRect?.top || 0,
        dialogBottom: dialogRect?.bottom || 0,
        stageWidth: stageRect?.width || 0,
        stageHeight: stageRect?.height || 0,
        canScrollDialog: Boolean(dialog && (dialog.scrollHeight > dialog.clientHeight || content?.parentElement?.scrollHeight > content?.parentElement?.clientHeight)),
      };
    });
    cropViewportChecks.push({ ...viewport, ...metrics });
    assert.equal(metrics.documentOverflow, false, `${viewport.key} avatar crop dialog has horizontal document overflow.`);
    assert.ok(metrics.dialogLeft >= -1 && metrics.dialogRight <= viewport.width + 1, `${viewport.key} avatar crop dialog exceeds viewport width: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.dialogTop >= -1 && metrics.dialogBottom <= viewport.height + 1, `${viewport.key} avatar crop dialog exceeds viewport height: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.stageWidth > 0 && metrics.stageHeight > 0, `${viewport.key} avatar crop stage is not visible: ${JSON.stringify(metrics)}`);
    assert.equal(metrics.canScrollDialog, false, `${viewport.key} avatar crop dialog must avoid nested scrolling when the responsive layout can fit: ${JSON.stringify(metrics)}`);
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const cancelCropButton = await page.evaluateHandle(() => Array.from(document.querySelectorAll('[data-avatar-crop-dialog="true"] button')).find((button) => button.textContent?.trim() === 'لغو') || null);
  assert.ok(cancelCropButton.asElement(), 'Cancel avatar crop action is missing.');
  await cancelCropButton.asElement().click();
  await page.waitForFunction(() => !document.querySelector('[data-avatar-crop-dialog="true"]'), { timeout: 5_000 });
  assert.equal(await page.$eval('input[type="file"][accept*="image/png"]', (input) => input.value), '', 'Avatar file input was not reset after crop cancellation.');
  await uploadAsymmetricAvatar();
  await page.waitForSelector('[data-avatar-crop-dialog="true"]', { visible: true, timeout: 15_000 });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const cropBefore = await page.$eval('[data-avatar-crop-stage="true"] img', (image) => ({
    transform: image.style.transform,
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height,
  }));
  assert.ok(cropBefore.width > 0 && cropBefore.height > 0, `Avatar crop source is not measurable: ${JSON.stringify(cropBefore)}`);
  await page.click('[data-avatar-crop-rotate="true"]');
  await page.click('[data-avatar-crop-mirror="true"]');
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-avatar-crop-stage="true"] img');
    const mirror = document.querySelector('[data-avatar-crop-mirror="true"]');
    return image?.style.transform.includes('rotate(90deg) scaleX(-1)') && mirror?.getAttribute('aria-pressed') === 'true';
  }, { timeout: 5_000 });
  const transformedPreview = await page.$eval('[data-avatar-crop-stage="true"] img', (image) => ({
    transform: image.style.transform,
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height,
  }));
  assert.ok(transformedPreview.width > 0 && transformedPreview.height > 0, `Rotated avatar preview is not measurable: ${JSON.stringify(transformedPreview)}`);
  assert.match(transformedPreview.transform, /rotate\(90deg\) scaleX\(-1\)/, `Avatar preview did not apply rotation and mirroring: ${JSON.stringify(transformedPreview)}`);
  await page.$eval('[data-avatar-crop-zoom="true"]', (input) => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, '1.5');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => Number(document.querySelector('[data-avatar-crop-zoom="true"]')?.value || 0) === 1.5, { timeout: 5_000 });
  const cropStage = await page.$('[data-avatar-crop-stage="true"]');
  const cropBox = await cropStage.boundingBox();
  assert.ok(cropBox, 'Avatar crop stage has no bounding box.');
  await page.mouse.move(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + cropBox.width / 2 + 24, cropBox.y + cropBox.height / 2 + 18, { steps: 4 });
  await page.mouse.up();
  const cropAfter = await page.$eval('[data-avatar-crop-stage="true"] img', (image) => ({
    transform: image.style.transform,
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height,
  }));
  assert.ok(cropAfter.width * cropAfter.height > transformedPreview.width * transformedPreview.height, `Avatar zoom did not enlarge the rotated image: ${JSON.stringify({ transformedPreview, cropAfter })}`);
  assert.notEqual(cropAfter.transform, cropBefore.transform, 'Avatar drag did not update the crop position.');
  const applyCropButton = await page.evaluateHandle(() => Array.from(document.querySelectorAll('[data-avatar-crop-dialog="true"] button')).find((button) => button.textContent?.includes('اعمال برش')) || null);
  assert.ok(applyCropButton.asElement(), 'Apply avatar crop action is missing.');
  await applyCropButton.asElement().click();
  await page.waitForFunction(() => !document.querySelector('[data-avatar-crop-dialog="true"]'), { timeout: 15_000 });
  await page.waitForFunction(() => document.querySelector('main img[alt="تصویر پروفایل"]')?.getAttribute('src')?.startsWith('blob:'), { timeout: 15_000 });
  const croppedOutput = await page.evaluate(async () => {
    const source = document.querySelector('main img[alt="تصویر پروفایل"]')?.getAttribute('src');
    if (!source) return null;
    const blob = await fetch(source).then((response) => response.blob());
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context?.drawImage(bitmap, 0, 0);
    const sample = (x, y) => Array.from(context?.getImageData(x, y, 1, 1).data || []);
    const result = {
      type: blob.type,
      size: blob.size,
      width: bitmap.width,
      height: bitmap.height,
      samples: {
        topLeft: sample(128, 128),
        topRight: sample(384, 128),
        bottomLeft: sample(128, 384),
        bottomRight: sample(384, 384),
      },
    };
    bitmap.close();
    return result;
  });
  assert.deepEqual(
    { type: croppedOutput?.type, width: croppedOutput?.width, height: croppedOutput?.height },
    { type: 'image/webp', width: 512, height: 512 },
    `Avatar crop output contract failed: ${JSON.stringify(croppedOutput)}`,
  );
  assert.ok(croppedOutput.size > 0 && croppedOutput.size <= 2 * 1024 * 1024, `Avatar crop output size is invalid: ${JSON.stringify(croppedOutput)}`);
  const [topLeft, topRight, bottomLeft, bottomRight] = [
    croppedOutput.samples.topLeft,
    croppedOutput.samples.topRight,
    croppedOutput.samples.bottomLeft,
    croppedOutput.samples.bottomRight,
  ];
  assert.ok(topLeft[0] > 180 && topLeft[1] > 180 && topLeft[2] < 80, `Rotated/mirrored output top-left must be yellow: ${JSON.stringify(croppedOutput.samples)}`);
  assert.ok(topRight[1] > 180 && topRight[0] < 80 && topRight[2] < 80, `Rotated/mirrored output top-right must be green: ${JSON.stringify(croppedOutput.samples)}`);
  assert.ok(bottomLeft[2] > 180 && bottomLeft[0] < 80 && bottomLeft[1] < 80, `Rotated/mirrored output bottom-left must be blue: ${JSON.stringify(croppedOutput.samples)}`);
  assert.ok(bottomRight[0] > 180 && bottomRight[1] < 80 && bottomRight[2] < 80, `Rotated/mirrored output bottom-right must be red: ${JSON.stringify(croppedOutput.samples)}`);

  const profileVisual = await page.evaluate(() => {
    const preview = document.querySelector('main img[alt="تصویر پروفایل"]');
    const previewButton = preview?.closest('button');
    const imageRect = preview?.getBoundingClientRect();
    const buttonRect = previewButton?.getBoundingClientRect();
    const actionLabels = ['انتخاب تصویر پروفایل', 'ذخیره تصویر پروفایل', 'حذف تصویر پروفایل', 'امنیت و تغییر رمز', 'ذخیره تغییرات پروفایل', 'روشن', 'تیره', 'سیستمی'];
    const actions = Array.from(document.querySelectorAll('main button'))
      .filter((button) => actionLabels.some((label) => button.textContent?.includes(label)))
      .map((button) => ({ text: button.textContent?.trim() || '', background: window.getComputedStyle(button).backgroundColor }));
    return {
      imageWidth: imageRect?.width || 0,
      imageHeight: imageRect?.height || 0,
      buttonWidth: buttonRect?.width || 0,
      buttonHeight: buttonRect?.height || 0,
      actions,
    };
  });
  assert.ok(profileVisual.imageWidth >= profileVisual.buttonWidth * 0.9, `Avatar preview does not fill its mobile frame: ${JSON.stringify(profileVisual)}`);
  assert.ok(profileVisual.imageHeight >= profileVisual.buttonHeight * 0.9, `Avatar preview height is still compressed: ${JSON.stringify(profileVisual)}`);
  assert.equal(profileVisual.actions.length, 8, `Profile action buttons were not all found: ${JSON.stringify(profileVisual.actions)}`);
  for (const action of profileVisual.actions) {
    const channels = action.background.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
    assert.equal(channels.length, 3, `Dark profile action has an unreadable background contract: ${JSON.stringify(action)}`);
    assert.ok(Math.max(...channels) <= 65, `Dark profile action is still light: ${JSON.stringify(action)}`);
  }

  const saveAvatarButton = await page.evaluateHandle(() => Array.from(document.querySelectorAll('main aside button')).find((button) => button.textContent?.includes('ذخیره تصویر پروفایل')) || null);
  assert.ok(saveAvatarButton.asElement(), 'Save avatar action is missing.');
  await saveAvatarButton.asElement().click();
  await page.waitForSelector('.app-header-profile img[alt^="تصویر پروفایل"]', { visible: true, timeout: 15_000 });
  const headerAvatar = await page.$eval('.app-header-profile img[alt^="تصویر پروفایل"]', (image) => {
    const imageRect = image.getBoundingClientRect();
    const buttonRect = image.closest('button')?.getBoundingClientRect();
    return {
      src: image.getAttribute('src'),
      width: imageRect.width,
      height: imageRect.height,
      buttonWidth: buttonRect?.width || 0,
      buttonHeight: buttonRect?.height || 0,
    };
  });
  assert.equal(headerAvatar.src, '/uploads/avatars/qa-avatar.png', `Header did not consume the saved avatar URL: ${JSON.stringify(headerAvatar)}`);
  assert.ok(headerAvatar.width >= headerAvatar.buttonWidth * 0.9 && headerAvatar.height >= headerAvatar.buttonHeight * 0.9, `Header avatar does not fill the account control: ${JSON.stringify(headerAvatar)}`);

  console.log(`Dashboard runtime stability passed: requests stabilized at ${JSON.stringify(requestCounts)}, chart mounted after measurement, clock progress has live motion, avatar crop zoom/drag/rotation/mirroring and 512px WebP output passed, profile preview fills its frame, saved avatar appears in Header, dark actions retain contrast, dashboard responsive checks passed for ${viewportChecks.map((item) => item.key).join(', ')}, and crop dialog checks passed for ${cropViewportChecks.map((item) => item.key).join(', ')}.`);
} finally {
  if (browser) await browser.close().catch(() => {});
  preview.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => preview.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (preview.exitCode === null) preview.kill('SIGKILL');
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}
