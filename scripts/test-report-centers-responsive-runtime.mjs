#!/usr/bin/env node
/* global document, window */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-report-centers-chromium-cache';

const root = process.cwd();
const reuseDist = process.argv.includes('--reuse-dist');
const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-report-centers-responsive-'));
const distDir = reuseDist ? path.join(root, 'dist') : path.join(runtimeDir, 'dist');
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

if (!reuseDist) {
  const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
    cwd: root,
    env: { ...process.env, VITE_DISABLE_HTTPS: '1' },
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 40 * 1024 * 1024,
  });
  if (build.status !== 0) throw new Error(`Reports responsive build failed:\n${build.stderr || build.stdout}`);
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
  const deadline = Date.now() + 25_000;
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

const respondJson = (request, data) => request.respond({
  status: 200,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(data),
});

const smartInsightTypes = [
  'ai_sales_agent',
  'sales_drop',
  'customer_risk',
  'stock_reorder',
  'invoice_audit',
  'collection_risk',
  'decision_memory_overview',
  'repetition_overview',
  'side_kpis_overview',
  'real_profit',
  'auto_pricing',
  'alert_management',
  'hidden_profit',
  'generic_responsive_qa',
];

const smartInsightsFixture = smartInsightTypes.map((type, index) => ({
  id: `responsive-modal-${type}`,
  type,
  title: `کنترل رسپانسیو ${type}`,
  summary: 'این متن آزمایشی عمداً چند خط دارد تا ارتفاع هدر، بدنه و اسکرول داخلی مودال در viewportهای مختلف کنترل شود.',
  category: 'کنترل رابط گزارش',
  severity: index % 3 === 0 ? 'high' : 'medium',
  score: 72 + (index % 20),
  confidence: 68 + (index % 25),
  createdAt: '2026-07-31T09:00:00.000Z',
  metrics: [
    { label: 'شاخص اصلی', value: '۱۲٬۵۰۰٬۰۰۰ تومان', icon: 'fa-chart-line' },
    { label: 'نرخ وصول', value: '۶۷٫۸٪', icon: 'fa-percent' },
    { label: 'تعداد پرونده', value: '۱۴', icon: 'fa-layer-group' },
    { label: 'وضعیت', value: 'نیازمند بررسی', icon: 'fa-circle-info' },
  ],
  reasons: [
    'دلیل اول برای کنترل شکستن متن و ارتفاع کارت داخل مودال گزارش.',
    'دلیل دوم برای اطمینان از فعال‌شدن اسکرول بدنه در ارتفاع کوتاه.',
    'دلیل سوم برای کنترل کامل‌ماندن قاب در موبایل کوچک و تبلت.',
  ],
  actions: [],
  target: { rows: [], customers: [], salesAgent: [], pricing: [], collections: [], invoices: [] },
  decision: {
    status: 'open',
    statusLabel: 'باز',
    decisionLabel: 'در انتظار تصمیم',
    occurrenceCount: index + 1,
    lastGeneratedAt: '2026-07-31T09:00:00.000Z',
  },
}));

const smartInsightsPayload = {
  insights: smartInsightsFixture,
  generatedAt: '2026-07-31T09:00:00.000Z',
  summary: { total: smartInsightsFixture.length, critical: 0, high: 5, medium: 9, low: 0 },
  profitSummary: { fullProfit: 29_500_000, realizedProfit: 20_000_000, unrecognizedProfit: 9_500_000, collectionRate: 67.8 },
  suspiciousAudit: [],
  customerIntelligence: [],
  salesAgentLeads: [],
  learning: { level: 'learning', totalDecisions: 8, accepted: 3, rejected: 1, completed: 2 },
  executiveBrain: { status: 'active', priorityCount: 4, actionCount: 3 },
};

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
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
      await request.continue();
      return;
    }
    if (url.pathname === '/api/me') {
      await respondJson(request, { success: true, user: { id: 1, username: 'qa-admin', firstName: 'مدیر', lastName: 'کیفیت', roleName: 'Admin', avatarUrl: null } });
      return;
    }
    if (url.pathname === '/api/module-flags') {
      await respondJson(request, { success: true, data: {} });
      return;
    }
    if (url.pathname === '/api/reports/smart-insights') {
      await respondJson(request, { success: true, data: smartInsightsPayload });
      return;
    }
    if (url.pathname === '/api/reports/financial-overview') {
      const bucket = { fullProfit: 99_500_000, realizedProfit: 500_000, realizedRevenue: 120_000_000, rowsCount: 14 };
      const installmentBucket = { fullProfit: 29_500_000, realizedProfit: 5_900_000, realizedRevenue: 20_000_000, rowsCount: 1 };
      await respondJson(request, {
        success: true,
        data: {
          sales: {},
          profit: {
            managementBuckets: {
              accessories: bucket,
              cashPhone: bucket,
              installmentPhone: installmentBucket,
              credit: bucket,
            },
          },
          balances: {},
          cashflow: {},
          meta: {},
        },
      });
      return;
    }
    if (url.pathname === '/api/reports/realized-profit') {
      await respondJson(request, {
        success: true,
        data: {
          summary: {
            contractualRevenue: 100_000_000,
            contractualCost: 70_500_000,
            fullProfit: 29_500_000,
            realizedRevenue: 20_000_000,
            realizedCost: 14_100_000,
            realizedProfit: 5_900_000,
            unrecognizedProfit: 23_600_000,
            collectionRate: 20,
            docsCount: 1,
            rowsCount: 1,
            byPaymentType: { installment: { realizedRevenue: 20_000_000, realizedProfit: 5_900_000, fullProfit: 29_500_000, rowsCount: 1 } },
            byItemType: { phone: { realizedRevenue: 20_000_000, realizedProfit: 5_900_000, fullProfit: 29_500_000, rowsCount: 1 } },
          },
          docs: [{
            docKey: 'installment:42',
            sourceType: 'installment',
            orderId: 42,
            customerId: 7,
            customerName: 'مشتری تست وصول',
            paymentType: 'installment',
            transactionDate: '2026-07-01',
            contractualTotal: 100_000_000,
            contractualCost: 70_500_000,
            receivedInRange: 20_000_000,
            primaryItemName: 'گوشی تست اقساطی',
            itemsSummary: 'گوشی تست اقساطی',
            totalProfit: 29_500_000,
            realizedProfit: 5_900_000,
            unrecognizedProfit: 29_500_000,
            collectionRate: 20,
          }],
          rows: [{
            rowId: 1,
            docKey: 'installment:42',
            sourceType: 'installment',
            orderId: 42,
            itemType: 'phone',
            productName: 'گوشی تست اقساطی',
            customerName: 'مشتری تست وصول',
            transactionDate: '2026-07-01',
            paymentType: 'installment',
            quantity: 1,
            lineTotal: 100_000_000,
            lineCost: 70_500_000,
            receivedAmount: 20_000_000,
            fullProfit: 29_500_000,
            realizedProfit: 0,
            unrecognizedProfit: 29_500_000,
            collectionRate: 20,
          }],
          byDay: [],
        },
      });
      return;
    }
    await respondJson(request, { success: true, data: [] });
  });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('authToken', 'report-centers-responsive-token');
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'qa-admin', fullName: 'مدیر کنترل کیفیت', roleName: 'Admin' }));
    localStorage.setItem('pwa_install_overlay_dismissed_v2', '1');
    localStorage.setItem('koroush.style.v2', JSON.stringify({ theme: 'dark', palette: 'gold' }));
  });

  const results = [];
  for (const viewport of [
    { key: 'small-mobile', width: 360, height: 800 },
    { key: 'mobile', width: 390, height: 844 },
    { key: 'tablet', width: 768, height: 1024 },
    { key: 'short-desktop', width: 1366, height: 600 },
    { key: 'desktop', width: 1440, height: 1000 },
  ]) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.goto(`${origin}/#/reports`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.waitForSelector('[data-ui-report-centers="8"]', { visible: true, timeout: 30_000 });

    const hub = await page.evaluate(() => ({
      cards: document.querySelectorAll('[data-report-center]').length,
      profitLabels: Array.from(document.querySelectorAll('[aria-label="چهار شاخص سود مدیر"] > *')).length,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    }));
    assert.equal(hub.cards, 8, `${viewport.key}: reports hub card count`);
    assert.equal(hub.profitLabels, 4, `${viewport.key}: manager profit shortcut count`);
    assert.ok(hub.overflow <= 1, `${viewport.key}: reports hub horizontal overflow ${hub.overflow}px`);

    await page.goto(`${origin}/#/reports/collection-center`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.waitForSelector('[data-report-center-navigation="collection-credit"]', { visible: true, timeout: 30_000 });
    const center = await page.evaluate(() => {
      const nav = document.querySelector('[data-report-center-navigation="collection-credit"]');
      const links = Array.from(nav?.querySelectorAll('nav a') || []);
      return {
        tabs: links.length,
        shortTabs: links.filter((link) => link.getBoundingClientRect().height < 42).length,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        navOverflow: nav ? nav.scrollWidth - nav.clientWidth : 999,
      };
    });
    assert.equal(center.tabs, 7, `${viewport.key}: collection center tab count`);
    assert.equal(center.shortTabs, 0, `${viewport.key}: center tabs must remain touch friendly`);
    assert.ok(center.overflow <= 1, `${viewport.key}: collection page horizontal overflow ${center.overflow}px`);
    assert.ok(center.navOverflow <= 1, `${viewport.key}: center navigation overflow ${center.navOverflow}px`);

    await page.goto(`${origin}/#/reports/financial-overview`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.waitForSelector('[data-manager-profit-primary="true"] [data-ui-card-kind="stat"]', { visible: true, timeout: 30_000 });
    const financial = await page.evaluate(() => {
      const section = document.querySelector('[data-manager-profit-section="true"]');
      const cards = Array.from(section?.querySelectorAll('[data-manager-profit-primary="true"] [data-ui-card-kind="stat"]') || []);
      const hints = cards.map((card) => card.querySelector('[data-ui-panel-metric-hint="true"]')).filter(Boolean);
      const rateBadges = Array.from(section?.querySelectorAll('[data-profit-collection-rate]') || []);
      const installmentCard = cards.find((card) => card.textContent?.includes('سود اقساطی گوشی'));
      const installmentRateBadge = installmentCard?.querySelector('[data-profit-collection-rate]');
      const realizedTotalBox = Array.from(section?.querySelectorAll('[data-manager-profit-summary="true"] [data-ui-card-kind="stat"]') || [])
        .find((box) => box.textContent?.includes('جمع سود وصول‌شده چهارگانه'));
      const profitCollectionRateBox = Array.from(section?.querySelectorAll('[data-manager-profit-summary="true"] [data-ui-card-kind="stat"]') || [])
        .find((box) => box.textContent?.includes('نرخ وصول سود چهارگانه'));
      return {
        cards: cards.length,
        compactBoxes: section?.querySelectorAll('[data-manager-profit-summary="true"] [data-ui-card-kind="stat"]').length || 0,
        badges: cards.filter((card) => card.textContent?.includes('سود وصول‌شده')).length,
        fullHints: hints.filter((hint) => hint.textContent?.includes('درصد وصول سود:') && hint.textContent?.includes('سود وصول‌نشده:') && hint.textContent?.includes('مبلغ وصولی:')).length,
        installmentValueIsCollected: installmentCard?.querySelector('[data-ui-panel-metric-value="true"]')?.textContent?.includes((5_900_000).toLocaleString('fa-IR')) || false,
        installmentHintIsRemaining: installmentCard?.querySelector('[data-ui-panel-metric-hint="true"]')?.textContent?.includes((23_600_000).toLocaleString('fa-IR')) || false,
        realizedTotalIncludesInstallment: realizedTotalBox?.textContent?.includes((7_400_000).toLocaleString('fa-IR')) || false,
        installmentCollectionRateVisible: cards.some((card) => card.textContent?.includes('سود اقساطی گوشی') && card.textContent?.includes('۲۰٪')),
        rateBadges: rateBadges.length,
        installmentRateTone: installmentRateBadge?.getAttribute('data-profit-collection-rate-tone') || null,
        badRateBadges: rateBadges.filter((badge) => badge.getAttribute('data-profit-collection-rate-tone') === 'bad').length,
        warnRateBadges: rateBadges.filter((badge) => badge.getAttribute('data-profit-collection-rate-tone') === 'warn').length,
        uncoloredRateBadges: rateBadges.filter((badge) => {
          const style = window.getComputedStyle(badge);
          return style.color === 'rgb(100, 116, 139)' || style.backgroundColor === 'rgba(0, 0, 0, 0)';
        }).length,
        profitCollectionRateBoxVisible: Boolean(profitCollectionRateBox),
        nowrapHints: hints.filter((hint) => window.getComputedStyle(hint).whiteSpace === 'nowrap').length,
        clippedHints: hints.filter((hint) => hint.scrollWidth > hint.clientWidth + 1 || hint.scrollHeight > hint.clientHeight + 1).length,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      };
    });
    assert.equal(financial.cards, 4, `${viewport.key}: financial overview profit card count`);
    assert.equal(financial.compactBoxes, 4, `${viewport.key}: financial overview summary box count`);
    assert.equal(financial.badges, 4, `${viewport.key}: financial overview realized-profit badge count`);
    assert.equal(financial.fullHints, 4, `${viewport.key}: financial overview uncollected-profit hint count`);
    assert.equal(financial.installmentValueIsCollected, true, `${viewport.key}: installment primary value must show 5.9M realized profit`);
    assert.equal(financial.installmentHintIsRemaining, true, `${viewport.key}: installment hint must show 23.6M unrecognized profit`);
    assert.equal(financial.realizedTotalIncludesInstallment, true, `${viewport.key}: realized total must include installment realized profit`);
    assert.equal(financial.installmentCollectionRateVisible, true, `${viewport.key}: installment profit collection rate must be 20 percent`);
    assert.equal(financial.rateBadges, 5, `${viewport.key}: four cards and total must show semantic collection-rate badges`);
    assert.equal(financial.installmentRateTone, 'bad', `${viewport.key}: 20 percent must use danger tone`);
    assert.equal(financial.badRateBadges, 5, `${viewport.key}: all low card rates and total rate must use danger tone`);
    assert.equal(financial.warnRateBadges, 0, `${viewport.key}: no warning-rate badge is expected in this fixture`);
    assert.equal(financial.uncoloredRateBadges, 0, `${viewport.key}: collection-rate badges must have visible semantic colors`);
    assert.equal(financial.profitCollectionRateBoxVisible, true, `${viewport.key}: four-bucket profit collection rate summary must be visible`);
    assert.equal(financial.nowrapHints, 0, `${viewport.key}: financial overview hints must wrap`);
    assert.equal(financial.clippedHints, 0, `${viewport.key}: financial overview hints must be fully visible`);
    assert.ok(financial.overflow <= 1, `${viewport.key}: financial overview horizontal overflow ${financial.overflow}px`);

    await page.evaluate(() => {
      const trigger = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('جزئیات جمع فروش'));
      if (!(trigger instanceof HTMLElement)) throw new Error('Financial detail modal trigger was not found.');
      trigger.click();
    });
    await page.waitForSelector('[data-kourosh-layer="modal"][role="dialog"]', { visible: true, timeout: 15_000 });
    const standardModal = await page.evaluate(() => {
      const panel = document.querySelector('[data-kourosh-layer="modal"][role="dialog"]');
      const backdrop = document.querySelector('[data-kourosh-layer="modal-backdrop"]');
      if (!(panel instanceof HTMLElement) || !(backdrop instanceof HTMLElement)) return { missing: true };
      const panelRect = panel.getBoundingClientRect();
      const backdropRect = backdrop.getBoundingClientRect();
      const panelChildren = Array.from(panel.children);
      const body = panelChildren.find((child) => /(?:modal|dialog).*(?:body|content)|(?:body|content).*(?:modal|dialog)/i.test(String(child.className || '')))
        || panelChildren.find((child) => child instanceof HTMLElement && child.tagName !== 'SPAN' && !/(?:header|footer|actions)/i.test(String(child.className || '')));
      const bodyStyle = body instanceof HTMLElement ? window.getComputedStyle(body) : null;
      return {
        missing: false,
        panelTop: panelRect.top,
        panelLeft: panelRect.left,
        panelRight: panelRect.right,
        panelBottom: panelRect.bottom,
        backdropTop: backdropRect.top,
        backdropLeft: backdropRect.left,
        backdropRight: backdropRect.right,
        backdropBottom: backdropRect.bottom,
        bodyOverflowY: bodyStyle?.overflowY || '',
        viewportWidth: window.innerWidth,
        viewportHeight: window.visualViewport?.height || window.innerHeight,
      };
    });
    assert.equal(standardModal.missing, false, `${viewport.key}: shared DialogShell modal exists`);
    assert.ok(standardModal.panelTop >= -1 && standardModal.panelLeft >= -1, `${viewport.key}: shared modal starts inside viewport`);
    assert.ok(standardModal.panelRight <= standardModal.viewportWidth + 1 && standardModal.panelBottom <= standardModal.viewportHeight + 1, `${viewport.key}: shared modal ends inside viewport`);
    assert.ok(standardModal.backdropTop >= -1 && standardModal.backdropLeft >= -1, `${viewport.key}: shared backdrop starts inside viewport`);
    assert.ok(standardModal.backdropRight <= standardModal.viewportWidth + 1 && standardModal.backdropBottom <= standardModal.viewportHeight + 1, `${viewport.key}: shared backdrop ends inside viewport`);
    assert.match(standardModal.bodyOverflowY, /auto|scroll/, `${viewport.key}: shared modal body owns scrolling`);
    await page.evaluate(() => {
      const backdrop = document.querySelector('[data-kourosh-layer="modal-backdrop"]');
      if (!(backdrop instanceof HTMLElement)) throw new Error('Shared modal backdrop was not available for close.');
      backdrop.click();
    });
    await page.waitForSelector('[data-kourosh-layer="modal"][role="dialog"]', { hidden: true, timeout: 15_000 });

    const installmentRateHref = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-manager-profit-primary="true"] [data-ui-card-kind="stat"]'));
      const installmentCard = cards.find((card) => card.textContent?.includes('سود اقساطی گوشی'));
      return installmentCard?.querySelector('[data-profit-collection-rate]')?.getAttribute('href') || '';
    });
    assert.match(installmentRateHref, /group=installmentPhone/, `${viewport.key}: installment rate must link its manager group`);
    assert.match(installmentRateHref, /focus=uncollected/, `${viewport.key}: installment rate must focus uncollected profit`);

    await Promise.all([
      page.waitForSelector('[data-manager-profit-group="installmentPhone"]', { visible: true, timeout: 30_000 }),
      page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[data-manager-profit-primary="true"] [data-ui-card-kind="stat"]'));
        const installmentCard = cards.find((card) => card.textContent?.includes('سود اقساطی گوشی'));
        const badge = installmentCard?.querySelector('[data-profit-collection-rate]');
        if (!(badge instanceof HTMLElement)) throw new Error('Installment profit collection badge is not clickable.');
        badge.click();
      }),
    ]);
    const drilldown = await page.evaluate(() => {
      const groupBanner = document.querySelector('[data-manager-profit-group="installmentPhone"]');
      const summaryCards = Array.from(document.querySelectorAll('[data-realized-profit-doc-summary="true"] [data-ui-card-kind="stat"]'));
      const activeFilter = document.querySelector('[data-realized-profit-documents="true"] [data-profit-doc-filter="unrecognized"][aria-pressed="true"]');
      const docsPanel = document.querySelector('[data-realized-profit-documents="true"]');
      return {
        hash: location.hash,
        groupLabel: groupBanner?.textContent || '',
        activeUncollectedFilter: Boolean(activeFilter),
        uncollectedSummaryVisible: summaryCards.some((card) => card.textContent?.includes('سود وصول‌نشده') && card.textContent?.includes((9_500_000).toLocaleString('fa-IR'))),
        collectedProfitVisible: docsPanel?.textContent?.includes((20_000_000).toLocaleString('fa-IR')) || false,
        contractVisible: docsPanel?.textContent?.includes('گوشی تست اقساطی') || false,
        clearGroupButtonVisible: Array.from(docsPanel?.querySelectorAll('button') || []).some((button) => button.textContent?.includes('نمایش همه گروه‌ها')),
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      };
    });
    assert.match(drilldown.hash, /group=installmentPhone/, `${viewport.key}: drilldown URL must preserve the manager group`);
    assert.match(drilldown.groupLabel, /سود اقساطی گوشی/, `${viewport.key}: drilldown must identify the active group`);
    assert.equal(drilldown.activeUncollectedFilter, true, `${viewport.key}: uncollected filter must be active after badge navigation`);
    assert.equal(drilldown.uncollectedSummaryVisible, true, `${viewport.key}: drilldown must show 9.5M uncollected profit`);
    assert.equal(drilldown.collectedProfitVisible, true, `${viewport.key}: drilldown must show 20M collected profit`);
    assert.equal(drilldown.contractVisible, true, `${viewport.key}: drilldown must show the matching installment contract`);
    assert.equal(drilldown.clearGroupButtonVisible, true, `${viewport.key}: drilldown must allow clearing the group filter`);
    assert.ok(drilldown.overflow <= 1, `${viewport.key}: profit drilldown horizontal overflow ${drilldown.overflow}px`);

    await page.goto(`${origin}/#/reports/smart-insights`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.waitForSelector('.sic257-insight-card', { visible: true, timeout: 30_000 });
    await page.evaluate(() => {
      const fullModeButton = Array.from(document.querySelectorAll('.smart-insight-mode-v213__actions button'))
        .find((button) => button.textContent?.includes('کامل'));
      if (!(fullModeButton instanceof HTMLElement)) throw new Error('Smart Insights full-mode button was not found.');
      fullModeButton.click();
    });
    await page.waitForFunction((expected) => document.querySelectorAll('.sic257-insight-card').length === expected, { timeout: 15_000 }, smartInsightTypes.length);
    const cardCount = await page.$$eval('.sic257-insight-card', (cards) => cards.length);
    assert.equal(cardCount, smartInsightTypes.length, `${viewport.key}: smart modal fixture card count`);

    const smartModals = [];
    for (let modalIndex = 0; modalIndex < smartInsightTypes.length; modalIndex += 1) {
      await page.evaluate((index) => {
        const card = document.querySelectorAll('.sic257-insight-card')[index];
        const openButton = Array.from(card?.querySelectorAll('button') || []).find((button) => button.textContent?.includes('چرا'));
        if (!(openButton instanceof HTMLElement)) throw new Error(`Smart Insight open button ${index} was not found.`);
        openButton.click();
      }, modalIndex);
      await page.waitForSelector('[data-report-modal-frame="true"]', { visible: true, timeout: 15_000 });

      const geometry = await page.evaluate(() => {
        const frame = document.querySelector('[data-report-modal-frame="true"]');
        const surface = frame?.querySelector('[data-report-modal-surface="true"]');
        const body = surface?.querySelector(':scope > [data-report-modal-body="true"]');
        const header = surface?.querySelector(':scope > header, :scope > [class*="header"]');
        if (!(frame instanceof HTMLElement) || !(surface instanceof HTMLElement) || !(body instanceof HTMLElement)) {
          return { missingContract: true };
        }
        const frameRect = frame.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const headerRect = header?.getBoundingClientRect();
        const bodyStyle = window.getComputedStyle(body);
        return {
          missingContract: false,
          frameTop: frameRect.top,
          frameLeft: frameRect.left,
          frameRight: frameRect.right,
          frameBottom: frameRect.bottom,
          surfaceTop: surfaceRect.top,
          surfaceLeft: surfaceRect.left,
          surfaceRight: surfaceRect.right,
          surfaceBottom: surfaceRect.bottom,
          surfaceWidth: surfaceRect.width,
          surfaceHeight: surfaceRect.height,
          surfaceHorizontalOverflow: surface.scrollWidth - surface.clientWidth,
          bodyHeight: bodyRect.height,
          bodyScrollable: body.scrollHeight > body.clientHeight + 1,
          bodyOverflowY: bodyStyle.overflowY,
          headerTop: headerRect?.top ?? null,
          headerBottom: headerRect?.bottom ?? null,
          viewportWidth: window.innerWidth,
          viewportHeight: window.visualViewport?.height || window.innerHeight,
        };
      });

      assert.equal(geometry.missingContract, false, `${viewport.key}/${smartInsightTypes[modalIndex]}: modal contract markers`);
      assert.ok(geometry.frameTop >= -1 && geometry.frameLeft >= -1, `${viewport.key}/${smartInsightTypes[modalIndex]}: frame must start inside viewport`);
      assert.ok(geometry.frameRight <= geometry.viewportWidth + 1 && geometry.frameBottom <= geometry.viewportHeight + 1, `${viewport.key}/${smartInsightTypes[modalIndex]}: frame must end inside viewport`);
      assert.ok(geometry.surfaceTop >= -1 && geometry.surfaceLeft >= -1, `${viewport.key}/${smartInsightTypes[modalIndex]}: surface must start inside viewport`);
      assert.ok(geometry.surfaceRight <= geometry.viewportWidth + 1 && geometry.surfaceBottom <= geometry.viewportHeight + 1, `${viewport.key}/${smartInsightTypes[modalIndex]}: surface must end inside viewport`);
      assert.ok(geometry.surfaceWidth >= 280 && geometry.surfaceHeight > 0, `${viewport.key}/${smartInsightTypes[modalIndex]}: surface must remain usable`);
      assert.ok(geometry.surfaceHorizontalOverflow <= 1, `${viewport.key}/${smartInsightTypes[modalIndex]}: surface horizontal overflow ${geometry.surfaceHorizontalOverflow}px`);
      assert.ok(geometry.bodyHeight > 0, `${viewport.key}/${smartInsightTypes[modalIndex]}: body must retain visible height`);
      assert.match(geometry.bodyOverflowY, /auto|scroll/, `${viewport.key}/${smartInsightTypes[modalIndex]}: body owns scrolling`);
      if (geometry.headerTop != null && geometry.headerBottom != null) {
        assert.ok(geometry.headerTop >= geometry.surfaceTop - 1 && geometry.headerBottom <= geometry.surfaceBottom + 1, `${viewport.key}/${smartInsightTypes[modalIndex]}: header must remain visible`);
      }
      if (process.env.REPORT_MODAL_QA_SCREENSHOTS === '1' && smartInsightTypes[modalIndex] === 'hidden_profit' && ['small-mobile', 'short-desktop'].includes(viewport.key)) {
        await page.screenshot({ path: path.join('/tmp', `kourosh-report-modal-${viewport.key}.png`), fullPage: false });
      }
      smartModals.push({ type: smartInsightTypes[modalIndex], geometry });

      await page.evaluate(() => {
        const frame = document.querySelector('[data-report-modal-frame="true"]');
        if (!(frame instanceof HTMLElement)) throw new Error('Smart modal frame did not remain available for close.');
        frame.click();
      });
      await page.waitForSelector('[data-report-modal-frame="true"]', { hidden: true, timeout: 15_000 });
    }

    results.push({ viewport: viewport.key, hub, center, financial, standardModal, drilldown, smartModals });
  }

  assert.deepEqual(pageErrors, [], `reports responsive runtime errors: ${pageErrors.join(' | ')}`);
  console.log(`Reports centers and modals responsive runtime passed: ${results.length} viewports, ${smartInsightTypes.length} Smart Insight modal templates per viewport.`);
} finally {
  await browser?.close().catch(() => {});
  if (preview.exitCode === null) preview.kill('SIGTERM');
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}
