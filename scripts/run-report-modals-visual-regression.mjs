#!/usr/bin/env node
/* global document, window, HTMLElement */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-report-modal-visual-cache';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const updateBaselines = args.has('--update-baselines');
const baselineDir = path.join(root, 'tests', 'visual-baselines', 'report-modals');
const outputDir = path.join(root, 'artifacts', 'report-modals-visual');
const currentDir = path.join(outputDir, 'current');
const diffDir = path.join(outputDir, 'diff');
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const fixedNow = Date.parse('2026-08-01T09:30:00.000Z');
const maxDiffRatio = 0.0025;

fs.rmSync(currentDir, { recursive: true, force: true });
fs.rmSync(diffDir, { recursive: true, force: true });
fs.mkdirSync(baselineDir, { recursive: true });
fs.mkdirSync(currentDir, { recursive: true });
fs.mkdirSync(diffDir, { recursive: true });

const viewports = [
  { key: 'small-mobile', width: 360, height: 800 },
  { key: 'mobile', width: 390, height: 844 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'short-desktop', width: 1366, height: 600 },
  { key: 'desktop', width: 1440, height: 1000 },
];
const themes = ['light', 'dark'];

const smartInsightTypes = [
  ['ai_sales_agent', 'دستیار فروش هوشمند'],
  ['sales_drop', 'افت و رشد فروش'],
  ['customer_risk', 'هوشمندی و ریسک مشتری'],
  ['stock_reorder', 'سفارش مجدد موجودی'],
  ['invoice_audit', 'حسابرسی فاکتور'],
  ['collection_risk', 'ریسک وصول'],
  ['decision_memory_overview', 'حافظه تصمیم'],
  ['repetition_overview', 'نمای تکرار'],
  ['side_kpis_overview', 'شاخص‌های جانبی'],
  ['real_profit', 'سیگنال و کیفیت سود'],
  ['auto_pricing', 'قیمت‌گذاری خودکار'],
  ['alert_management', 'مدیریت هشدارها'],
  ['hidden_profit', 'سود پنهان'],
  ['generic_responsive_qa', 'جزئیات عمومی بینش'],
];

const surfaceLabels = new Map([
  ...smartInsightTypes,
  ['financial-kpi-detail', 'جزئیات شاخص مالی'],
  ['financial-schedule', 'زمان‌بندی تلگرام مالی'],
  ['followup-create', 'ثبت پیگیری جدید'],
  ['followup-edit', 'ویرایش پیگیری'],
  ['compare-sales-detail', 'جزئیات مقایسه فروش'],
  ['product-collection-risk', 'اولویت وصول فروش محصول'],
  ['product-calculation-health', 'سلامت محاسبات فروش محصول'],
  ['product-calculation-detail', 'جزئیات محاسبه تخفیف و سود'],
  ['purchase-suggestion', 'تحلیل پیشنهاد خرید'],
  ['collection-followup', 'جزئیات مرکز پیگیری وصول'],
  ['mobile-sales-risk', 'جزئیات ریسک فروش موبایل'],
  ['ml-operator', 'جزئیات ML Operator'],
  ['metadata-import', 'جزئیات Metadata Import'],
  ['message-composer', 'ساخت پیام'],
]);

assert.equal(surfaceLabels.size, 28, 'Visual surface registry must contain exactly 28 report modals/drawers.');

const smartInsightsFixture = smartInsightTypes.map(([type], index) => ({
  id: `visual-${type}`,
  type,
  title: `کنترل تصویری ${type}`,
  summary: 'این محتوای ثابت برای کنترل ظاهر، کنتراست، شکست متن، ارتفاع بدنه و اسکرول داخلی مودال گزارش استفاده می‌شود.',
  category: 'کنترل کیفیت رابط گزارش',
  severity: index % 3 === 0 ? 'high' : 'medium',
  score: 72 + (index % 20),
  confidence: 68 + (index % 25),
  createdAt: '2026-08-01T09:30:00.000Z',
  metrics: [
    { label: 'شاخص اصلی', value: '۱۲٬۵۰۰٬۰۰۰ تومان', icon: 'fa-chart-line' },
    { label: 'نرخ وصول', value: '۶۷٫۸٪', icon: 'fa-percent' },
    { label: 'تعداد پرونده', value: '۱۴', icon: 'fa-layer-group' },
    { label: 'وضعیت', value: 'نیازمند بررسی', icon: 'fa-circle-info' },
  ],
  reasons: [
    'دلیل اول برای کنترل شکست متن و ارتفاع کارت داخل مودال گزارش.',
    'دلیل دوم برای کنترل اسکرول بدنه در ارتفاع کوتاه.',
    'دلیل سوم برای کنترل کامل‌ماندن قاب در موبایل و تبلت.',
  ],
  actions: [],
  target: { rows: [], customers: [], salesAgent: [], pricing: [], collections: [], invoices: [] },
  decision: { status: 'open', statusLabel: 'باز', decisionLabel: 'در انتظار تصمیم', occurrenceCount: index + 1, lastGeneratedAt: '2026-08-01T09:30:00.000Z' },
}));

const smartInsightsPayload = {
  insights: smartInsightsFixture,
  generatedAt: '2026-08-01T09:30:00.000Z',
  summary: { total: smartInsightsFixture.length, critical: 0, high: 5, medium: 9, low: 0 },
  profitSummary: { fullProfit: 29_500_000, realizedProfit: 20_000_000, unrecognizedProfit: 9_500_000, collectionRate: 67.8 },
  suspiciousAudit: [],
  customerIntelligence: [],
  salesAgentLeads: [],
  learning: { level: 'learning', totalDecisions: 8, accepted: 3, rejected: 1, completed: 2 },
  executiveBrain: { status: 'active', priorityCount: 4, actionCount: 3 },
};

const productRow = {
  sourceType: 'invoice', paymentType: 'credit', itemType: 'inventory', orderId: 4201,
  transactionDate: '2026-08-01T08:00:00.000Z', productId: 88, productName: 'شارژر سریع تست کیفیت',
  quantity: 2, unitPrice: 8_000_000, discountPerItem: 500_000, orderDiscount: 1_000_000,
  invoiceDiscountBase: 16_000_000, lineTotalBeforeGlobalDiscount: 15_000_000, globalDiscountShare: 1_000_000,
  totalDiscountAmount: 2_000_000, originalLineTotal: 15_000_000, lineTotal: 14_000_000,
  lineCost: 9_000_000, receivedAmount: 6_000_000, collectionRate: 42.9, fullProfit: 5_000_000,
  realizedProfit: 2_142_857, unrecognizedProfit: 2_857_143,
};

const collectionItem = {
  id: 'invoice:4201', level: 'critical', label: 'بحرانی', score: 92, sourceType: 'invoice', paymentType: 'credit',
  orderId: 4201, customerId: 142, customerName: 'مشتری کنترل تصویری', customerPhone: '09123456789',
  transactionDate: '2026-07-01T08:00:00.000Z', dueDate: '2026-07-20T08:00:00.000Z', ageDays: 31,
  dueInDays: -12, overdueDays: 12, overdueCount: 2, overdueAmount: 8_000_000,
  contractualTotal: 14_000_000, receivedAmount: 6_000_000, outstandingAmount: 8_000_000,
  fullProfit: 5_000_000, realizedProfit: 2_142_857, unrecognizedProfit: 2_857_143, collectionRate: 42.9,
  customerBalance: 8_000_000, discountRate: 12.5,
  reasons: ['مانده وصول بالا است.', 'موعد پرداخت گذشته است.', 'سود وصول‌نشده نیازمند پیگیری است.'],
  touchedToday: false, history: [{ id: 1, createdAt: '2026-07-28T09:00:00.000Z', createdByUsername: 'manager', note: 'تماس اولیه ثبت شد.', status: 'open' }],
  automation: { status: 'watch', label: 'نیازمند اقدام', reason: 'دیرکرد و مانده هم‌زمان', recommendedAction: 'call_done', recommendedActionLabel: 'تماس با مشتری', callScript: 'برای هماهنگی پرداخت تماس گرفته شود.', smsText: 'لطفاً برای هماهنگی پرداخت با فروشگاه تماس بگیرید.', touchPlan: ['تماس', 'پیام', 'ثبت نتیجه'] },
  kanbanStage: 'critical', kanbanStageLabel: 'بحرانی',
};

const mobileRiskRow = {
  id: 'installment-77', saleId: 77, saleDate: '2026-07-01T08:00:00.000Z', saleTypeLabel: 'اقساطی',
  customerName: 'مشتری فروش موبایل', customerPhone: '09121112233', phoneModel: 'iPhone 17 Pro 256GB', imei: '356789012345678',
  purchasePrice: 70_500_000, referencePrice: 72_000_000, currentPurchasePrice: 72_000_000, contractTotal: 100_000_000,
  downPayment: 20_000_000, paidInstallments: 1, receivedAmount: 20_000_000, outstandingAmount: 80_000_000,
  collectionRate: 20, downPaymentRate: 20, fullProfit: 29_500_000, realizedProfit: 5_900_000, unrecognizedProfit: 23_600_000,
  realProfit: 28_000_000, replacementDelta: 1_500_000, referencePriceAvailable: true, referencePriceSource: 'inventory-current-purchase-price',
  overdueAmount: 12_000_000, overdueCount: 2, overdueChecks: 1, overdueDays: 18, dueInDays: -18,
  nextDueDate: '2026-08-05T08:00:00.000Z', nextDueAmount: 10_000_000, numberOfInstallments: 8,
  customerBalance: 80_000_000, riskScore: 91, riskLevel: 'critical', riskLabel: 'بحرانی', riskTone: 'rose',
  riskReasons: ['دو قسط معوق ثبت شده است.', 'نرخ وصول قرارداد پایین است.', 'مانده قرارداد بالا است.'],
};

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const respondJson = (request, data, status = 200) => request.respond({
  status,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(data),
});

const apiFixture = (pathname) => {
  if (pathname === '/api/me') return { success: true, user: { id: 1, username: 'qa-admin', firstName: 'مدیر', lastName: 'کیفیت', roleName: 'Admin', avatarUrl: null } };
  if (pathname === '/api/module-flags') return { success: true, data: {} };
  if (pathname === '/api/reports/smart-insights') return { success: true, data: smartInsightsPayload };
  if (pathname === '/api/reports/financial-overview/drilldown') return { success: true, data: { rows: [
    { orderId: 4201, date: '2026-08-01T08:00:00.000Z', customerName: 'مشتری کنترل تصویری', customerPhone: '09123456789', amount: 14_000_000, profit: 5_000_000 },
    { orderId: 4202, date: '2026-07-31T08:00:00.000Z', customerName: 'مشتری دوم', customerPhone: '09120000000', amount: 9_800_000, profit: 2_600_000 },
  ] } };
  if (pathname === '/api/reports/financial-overview') return { success: true, data: {
    range: { from: '1405/05/01', to: '1405/05/10' },
    sales: { ordersCount: 14, subtotal: 160_000_000, discounts: 6_000_000, netSalesBeforeTax: 154_000_000, taxAmount: 0, totalSales: 154_000_000, refundsTotal: 0, productSalesTotal: 54_000_000 },
    profit: { grossProfit: 29_500_000, cogs: 124_500_000, realizedProfit: 20_000_000, realizedRevenue: 120_000_000, realizedCost: 100_000_000, unrecognizedProfit: 9_500_000, collectionRate: 67.8, managementBuckets: {
      accessories: { fullProfit: 5_000_000, realizedProfit: 4_000_000, realizedRevenue: 20_000_000, rowsCount: 4 },
      cashPhone: { fullProfit: 8_000_000, realizedProfit: 8_000_000, realizedRevenue: 60_000_000, rowsCount: 3 },
      installmentPhone: { fullProfit: 29_500_000, realizedProfit: 0, realizedRevenue: 20_000_000, rowsCount: 1 },
      credit: { fullProfit: 7_000_000, realizedProfit: 3_500_000, realizedRevenue: 20_000_000, rowsCount: 6 },
    } },
    repairs: { count: 2, revenue: 4_000_000, partsCost: 1_000_000, laborFee: 2_000_000, costs: 1_000_000, profit: 3_000_000 },
    workingCapital: { receivables: 80_000_000, payables: 30_000_000, inventoryValue: 150_000_000, netWorkingCapital: 200_000_000 },
    balances: { receivables: 80_000_000, payables: 30_000_000 }, cashflow: {}, top: { debtors: [], creditors: [] },
    expensesSummary: { total: 8_000_000, byCategory: [{ category: 'rent', total: 5_000_000 }, { category: 'salary', total: 3_000_000 }] },
  } };
  if (pathname === '/api/reports/followups') return { success: true, data: [{ id: 12, customerId: 142, createdAt: '2026-07-28T09:00:00.000Z', createdByUsername: 'manager', note: 'پیگیری مانده قرارداد و هماهنگی پرداخت بعدی', nextFollowupDate: '2026-08-05T10:00:00.000Z', status: 'open', customerName: 'مشتری کنترل تصویری', customerPhone: '09123456789' }] };
  if (pathname === '/api/reports/compare-sales') return { success: true, data: { currentAmount: 154_000_000, previousAmount: 132_000_000, percentageChange: 16.7, currentRange: { from: '1405/05/01', to: '1405/05/10' }, previousRange: { from: '1405/04/21', to: '1405/04/30' }, baseline: 'prev' } };
  if (pathname === '/api/sales') return { success: true, data: [{ id: 4201, transactionDate: '2026-08-01T08:00:00.000Z', customerFullName: 'مشتری کنترل تصویری', totalPrice: 14_000_000, profit: 5_000_000 }] };
  if (pathname === '/api/reports/product-sales/details') return { success: true, data: {
    rows: [productRow], summary: { cashSales: 0, creditSales: 14_000_000, installmentSales: 0, cashReceived: 0, creditReceived: 6_000_000, installmentReceived: 0, contractualTotal: 14_000_000, receivedTotal: 6_000_000, totalProfit: 5_000_000, realizedProfit: 2_142_857, unrecognizedProfit: 2_857_143, rowsCount: 1 },
    filteredSummary: { lineTotal: 14_000_000, receivedAmount: 6_000_000, totalProfit: 5_000_000, realizedProfit: 2_142_857, unrecognizedProfit: 2_857_143, totalDiscountAmount: 2_000_000, itemDiscountAmount: 1_000_000, invoiceDiscountShare: 1_000_000 },
    auditCounts: { all: 1, discounted: 1, itemDiscounted: 1, invoiceDiscounted: 1 },
    calculationHealth: { status: 'warning', checkedDocs: 1, checkedRows: 1, skippedPartialDocs: 0, issueCount: 1, errorCount: 0, warningCount: 1, roundingCount: 1, totalAbsoluteDifference: 1_000, issues: [{ id: 'issue-1', severity: 'warning', sourceType: 'invoice', orderId: 4201, title: 'اختلاف رُندی قابل بررسی', description: 'اختلاف محدود ناشی از توزیع تخفیف فاکتور در ردیف‌ها.', difference: 1_000, expectedAmount: 14_000_000, actualAmount: 13_999_000, invoiceDiscountShareTotal: 1_000_000, rowsCount: 1, rowIssues: [{ productName: productRow.productName, reason: 'رُندشدن سهم تخفیف', difference: 1_000 }] }] },
    collectionRisk: { status: 'critical', totalDocs: 1, counts: { low: 0, followup: 0, urgent: 0, critical: 1 }, totalOutstanding: 8_000_000, totalUnrecognizedProfit: 2_857_143, highestScore: 92, items: [collectionItem] },
    pagination: { page: 1, pageSize: 50, totalRows: 1, totalPages: 1, startRow: 1, endRow: 1 }, topProducts: [{ productName: productRow.productName, quantity: 2, total: 14_000_000 }],
  } };
  if (pathname === '/api/analysis/purchase-suggestions') return { success: true, data: [{ itemId: 88, itemName: 'شارژر سریع تست کیفیت', itemType: 'product', currentStock: 3, salesPerDay: 1.25, daysOfStockLeft: 2.4, suggestedPurchaseQuantity: 18, reason: 'فروش روزانه بالا و موجودی کمتر از سه روز است.' }] };
  if (pathname === '/api/reports/collection-center') return { success: true, data: { items: [collectionItem], summary: { totalItems: 1, counts: { low: 0, followup: 0, urgent: 0, critical: 1, touchedToday: 0 }, totalOutstanding: 8_000_000, totalUnrecognizedProfit: 2_857_143, highestScore: 92 } } };
  if (pathname === '/api/reports/mobile-sales-analytics') return { success: true, data: {
    summary: { totalPhones: 1, cashCount: 0, installmentCount: 1, totalSales: 100_000_000, cashSales: 0, installmentSales: 100_000_000, cashProfit: 0, cashRealProfit: 0, installmentFullProfit: 29_500_000, installmentRealizedProfit: 5_900_000, installmentUnrecognizedProfit: 23_600_000, installmentReceived: 20_000_000, installmentOutstanding: 80_000_000, installmentCollectionRate: 20, highRiskCount: 1, criticalRiskCount: 1, averageDownPaymentRate: 20, totalReplacementDelta: 1_500_000, totalRealProfit: 28_000_000, referencePricedCount: 1, referenceCoverageRate: 100 },
    cashRows: [], installmentRows: [mobileRiskRow], realProfitRows: [mobileRiskRow], risk: { highRiskCount: 1, rows: [mobileRiskRow] }, partnerCapital: { summary: {}, rows: [] },
  } };
  if (pathname === '/api/customers') return { success: true, data: [] };
  if (pathname === '/api/partners') return { success: true, data: [] };
  return { success: true, data: [] };
};

const comparePng = (currentBuffer, baselinePath, diffPath) => {
  if (!fs.existsSync(baselinePath)) return { missing: true, diffPixels: null, diffRatio: null };
  const current = PNG.sync.read(currentBuffer);
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  if (current.width !== baseline.width || current.height !== baseline.height) {
    return { missing: false, dimensionMismatch: `${baseline.width}x${baseline.height} -> ${current.width}x${current.height}`, diffPixels: current.width * current.height, diffRatio: 1 };
  }
  const diff = new PNG({ width: current.width, height: current.height });
  const diffPixels = pixelmatch(baseline.data, current.data, diff.data, current.width, current.height, { threshold: 0.1, includeAA: false });
  const diffRatio = diffPixels / (current.width * current.height);
  if (diffRatio > maxDiffRatio) fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return { missing: false, diffPixels, diffRatio };
};

const waitForServer = async (origin, child, logs) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited early:\n${logs.join('')}`);
    try { if ((await fetch(origin)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Vite did not become ready:\n${logs.join('')}`);
};

const stabilizePage = async (page) => {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' });
  await page.evaluate(async () => { await document.fonts?.ready; window.scrollTo(0, 0); });
  await new Promise((resolve) => setTimeout(resolve, 80));
};

const clickButtonContaining = (page, text, rootSelector = 'body') => page.evaluate(({ textValue, root }) => {
  const container = document.querySelector(root);
  const button = Array.from(container?.querySelectorAll('button') || []).find((item) => item.textContent?.includes(textValue));
  if (!(button instanceof HTMLElement)) throw new Error(`Button containing "${textValue}" was not found in ${root}.`);
  button.click();
}, { textValue: text, root: rootSelector });

const dispatchPageState = (page, rootSelector, stateIndex, value) => page.evaluate(({ selector, index, nextValue }) => {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new Error(`React state root ${selector} was not found.`);
  const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
  if (!fiberKey) throw new Error(`React fiber was not found for ${selector}.`);
  let fiber = node[fiberKey];
  while (fiber) {
    const stateHooks = [];
    let hook = fiber.memoizedState;
    while (hook) {
      if (hook.queue && typeof hook.queue.dispatch === 'function') stateHooks.push(hook);
      hook = hook.next;
    }
    if (stateHooks.length > index) {
      stateHooks[index].queue.dispatch(nextValue);
      return stateHooks.length;
    }
    fiber = fiber.return;
  }
  throw new Error(`State hook ${index} was not found above ${selector}.`);
}, { selector: rootSelector, index: stateIndex, nextValue: value });

const geometryFor = (page, frameSelector, surfaceSelector) => page.evaluate(({ frameQuery, surfaceQuery }) => {
  const frame = document.querySelector(frameQuery);
  const surface = document.querySelector(surfaceQuery);
  if (!(frame instanceof HTMLElement) || !(surface instanceof HTMLElement)) return { missing: true };
  const frameRect = frame.getBoundingClientRect();
  const surfaceRect = surface.getBoundingClientRect();
  return {
    missing: false,
    frame: { top: frameRect.top, left: frameRect.left, right: frameRect.right, bottom: frameRect.bottom, width: frameRect.width, height: frameRect.height },
    surface: { top: surfaceRect.top, left: surfaceRect.left, right: surfaceRect.right, bottom: surfaceRect.bottom, width: surfaceRect.width, height: surfaceRect.height },
    viewport: { width: window.innerWidth, height: window.visualViewport?.height || window.innerHeight },
    horizontalOverflow: surface.scrollWidth - surface.clientWidth,
  };
}, { frameQuery: frameSelector, surfaceQuery: surfaceSelector });

const port = await reservePort();
const origin = `http://127.0.0.1:${port}`;
const viteLogs = [];
const vite = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  env: {
    ...process.env,
    VITE_DISABLE_HTTPS: '1',
    CHOKIDAR_USEPOLLING: '1',
    CHOKIDAR_INTERVAL: '1000',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
vite.stdout.on('data', (chunk) => viteLogs.push(String(chunk)));
vite.stderr.on('data', (chunk) => viteLogs.push(String(chunk)));

let browser;
const results = [];
const failures = [];

try {
  await waitForServer(origin, vite, viteLogs);
  const [{ default: puppeteer }, browserExecutable] = await Promise.all([
    import('puppeteer-core'),
    resolvePuppeteerBrowserExecutable({ root }),
  ]);
  browser = await puppeteer.launch({ executablePath: browserExecutable.executablePath, args: browserLaunchArgs(), headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => {
    if (error.message === 'WebSocket closed without opened.') return;
    pageErrors.push(error.message);
  });
  await page.evaluateOnNewDocument((timestamp) => {
    const NativeDate = Date;
    function FixedDate(...dateArgs) {
      if (!(this instanceof FixedDate)) return new NativeDate(timestamp).toString();
      return new NativeDate(...(dateArgs.length ? dateArgs : [timestamp]));
    }
    FixedDate.prototype = NativeDate.prototype;
    Object.setPrototypeOf(FixedDate, NativeDate);
    FixedDate.now = () => timestamp;
    window.Date = FixedDate;
    const visualTheme = new URLSearchParams(window.location.search).get('visualTheme');
    localStorage.setItem('authToken', 'report-modal-visual-token');
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'qa-admin', fullName: 'مدیر کنترل کیفیت', roleName: 'Admin' }));
    if (visualTheme) localStorage.setItem('koroush.style.v2', JSON.stringify({ theme: visualTheme, palette: 'gold', reducedMotion: true }));
    localStorage.setItem('smartInsightViewMode', 'advanced');
    localStorage.setItem('pwa_install_overlay_dismissed_v2', '1');
  }, fixedNow);
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin === origin && url.pathname.startsWith('/api/')) {
        await respondJson(request, apiFixture(url.pathname));
      } else {
        await request.continue();
      }
    } catch (error) {
      if (!request.isInterceptResolutionHandled()) await request.abort();
      pageErrors.push(error instanceof Error ? error.message : String(error));
    }
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const capture = async ({ id, theme, viewport, frameSelector, surfaceSelector }) => {
    const label = surfaceLabels.get(id);
    assert.ok(label, `Unknown report modal surface ${id}`);
    await page.waitForSelector(frameSelector, { visible: true, timeout: 20_000 });
    await page.waitForSelector(surfaceSelector, { visible: true, timeout: 20_000 });
    await stabilizePage(page);
    const geometry = await geometryFor(page, frameSelector, surfaceSelector);
    assert.equal(geometry.missing, false, `${id}/${theme}/${viewport.key}: surface must exist`);
    assert.ok(geometry.frame.top >= -1 && geometry.frame.left >= -1, `${id}/${theme}/${viewport.key}: frame starts outside viewport`);
    assert.ok(geometry.frame.right <= geometry.viewport.width + 1 && geometry.frame.bottom <= geometry.viewport.height + 1, `${id}/${theme}/${viewport.key}: frame ends outside viewport`);
    assert.ok(geometry.surface.top >= -1 && geometry.surface.left >= -1, `${id}/${theme}/${viewport.key}: surface starts outside viewport`);
    assert.ok(geometry.surface.right <= geometry.viewport.width + 1 && geometry.surface.bottom <= geometry.viewport.height + 1, `${id}/${theme}/${viewport.key}: surface ends outside viewport (${JSON.stringify({ surface: geometry.surface, viewport: geometry.viewport })})`);
    assert.ok(geometry.surface.width >= 280 && geometry.surface.height > 0, `${id}/${theme}/${viewport.key}: surface is unusable`);
    assert.ok(geometry.horizontalOverflow <= 1, `${id}/${theme}/${viewport.key}: horizontal overflow ${geometry.horizontalOverflow}px`);

    const slug = `${viewport.key}--${theme}--${id}`;
    const currentPath = path.join(currentDir, `${slug}.png`);
    const baselinePath = path.join(baselineDir, `${slug}.png`);
    const diffPath = path.join(diffDir, `${slug}.png`);
    const buffer = await page.screenshot({ type: 'png', fullPage: false, captureBeyondViewport: false });
    fs.writeFileSync(currentPath, buffer);
    if (updateBaselines) fs.writeFileSync(baselinePath, buffer);
    const comparison = comparePng(buffer, baselinePath, diffPath);
    const passed = !comparison.missing && !comparison.dimensionMismatch && Number(comparison.diffRatio || 0) <= maxDiffRatio;
    const result = { id, label, theme, viewport: viewport.key, width: viewport.width, height: viewport.height, geometry, ...comparison, passed };
    results.push(result);
    if (!passed) failures.push(result);
  };

  const gotoApp = async (route, theme, readySelector) => {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await page.goto(`${origin}/?visualTheme=${encodeURIComponent(theme)}#${route}`, { waitUntil: 'networkidle0', timeout: 60_000 });
        if (readySelector) await page.waitForSelector(readySelector, { visible: true, timeout: 45_000 });
        await stabilizePage(page);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    const body = await page.evaluate(() => document.body?.innerText || document.documentElement?.textContent || '');
    throw new Error(`Report route ${route} did not become ready after two attempts. Vite exit: ${vite.exitCode ?? 'running'}. Vite logs: ${viteLogs.join('').slice(-2000) || 'none'}. Runtime errors: ${pageErrors.join(' | ') || 'none'}. Body: ${body.slice(0, 1200)}`, { cause: lastError });
  };
  const gotoHarness = async (scenario, theme) => {
    await page.goto(`${origin}/tests/fixtures/report-modals-visual-harness.html?scenario=${encodeURIComponent(scenario)}&visualTheme=${encodeURIComponent(theme)}`, { waitUntil: 'networkidle0', timeout: 60_000 });
    try {
      await page.waitForSelector(`[data-visual-harness-ready="${scenario}"]`, { timeout: 20_000 });
    } catch (error) {
      const body = await page.evaluate(() => document.body?.innerText || document.documentElement?.textContent || '');
      throw new Error(`Visual harness ${scenario} did not mount. Runtime errors: ${pageErrors.join(' | ') || 'none'}. Body: ${body.slice(0, 1200)}`, { cause: error });
    }
    await stabilizePage(page);
  };

  for (const viewport of viewports) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    for (const theme of themes) {
      await gotoApp('/reports/smart-insights', theme, '.sic257-insight-card');
      await clickButtonContaining(page, 'کامل', '.smart-insight-mode-v213__actions');
      await page.waitForFunction((expected) => document.querySelectorAll('.sic257-insight-card').length === expected, { timeout: 20_000 }, smartInsightTypes.length);
      for (let index = 0; index < smartInsightTypes.length; index += 1) {
        const [id] = smartInsightTypes[index];
        await page.evaluate((cardIndex) => {
          const card = document.querySelectorAll('.sic257-insight-card')[cardIndex];
          const button = Array.from(card?.querySelectorAll('button') || []).find((item) => item.textContent?.includes('چرا'));
          if (!(button instanceof HTMLElement)) throw new Error(`Smart Insight button ${cardIndex} was not found.`);
          button.click();
        }, index);
        await capture({ id, theme, viewport, frameSelector: '[data-report-modal-frame="true"]', surfaceSelector: '[data-report-modal-surface="true"]' });
        await page.evaluate(() => {
          const frame = document.querySelector('[data-report-modal-frame="true"]');
          if (!(frame instanceof HTMLElement)) throw new Error('Smart Insight frame was not available for close.');
          frame.click();
        });
        await page.waitForSelector('[data-report-modal-frame="true"]', { hidden: true, timeout: 15_000 });
      }

      await gotoApp('/reports/financial-overview', theme, '[data-manager-profit-section="true"]');
      await clickButtonContaining(page, 'جزئیات جمع فروش');
      await capture({ id: 'financial-kpi-detail', theme, viewport, frameSelector: '[data-kourosh-layer="modal-backdrop"]', surfaceSelector: '[data-kourosh-layer="modal"]' });

      await gotoHarness('financial-schedule', theme);
      await capture({ id: 'financial-schedule', theme, viewport, frameSelector: '[data-kourosh-layer="modal-backdrop"]', surfaceSelector: '[data-kourosh-layer="modal"]' });

      await gotoHarness('followup-create', theme);
      await capture({ id: 'followup-create', theme, viewport, frameSelector: '[data-kourosh-layer="modal-backdrop"]', surfaceSelector: '[data-kourosh-layer="modal"]' });

      await gotoApp('/reports/followups', theme, '.followups-row-action--edit');
      await page.click('.followups-row-action--edit');
      await capture({ id: 'followup-edit', theme, viewport, frameSelector: '[data-kourosh-layer="modal-backdrop"]', surfaceSelector: '[data-kourosh-layer="modal"]' });

      await gotoApp('/reports/periodic-comparison', theme);
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('جزئیات دوره فعلی')), { timeout: 30_000 });
      await clickButtonContaining(page, 'جزئیات دوره فعلی');
      await capture({ id: 'compare-sales-detail', theme, viewport, frameSelector: '[data-kourosh-layer="modal-backdrop"]', surfaceSelector: '[data-kourosh-layer="modal"]' });

      await gotoApp('/reports/product-sales', theme, '.product-sales-executive-page');
      await page.waitForSelector('[data-report-collection-risk-ready="true"]', { timeout: 30_000 });
      await dispatchPageState(page, '.product-sales-executive-page', 14, true);
      await capture({ id: 'product-collection-risk', theme, viewport, frameSelector: '[data-kourosh-layer="drawer-backdrop"]', surfaceSelector: '[data-kourosh-layer="drawer"]' });
      await dispatchPageState(page, '.product-sales-executive-page', 14, false);
      await page.waitForSelector('[data-kourosh-layer="drawer-backdrop"]', { hidden: true, timeout: 15_000 });
      await dispatchPageState(page, '.product-sales-executive-page', 13, true);
      await capture({ id: 'product-calculation-health', theme, viewport, frameSelector: '[data-kourosh-layer="drawer-backdrop"]', surfaceSelector: '[data-kourosh-layer="drawer"]' });
      await dispatchPageState(page, '.product-sales-executive-page', 13, false);
      await page.waitForSelector('[data-kourosh-layer="drawer-backdrop"]', { hidden: true, timeout: 15_000 });
      await clickButtonContaining(page, 'محاسبه');
      await capture({ id: 'product-calculation-detail', theme, viewport, frameSelector: '[data-kourosh-layer="drawer-backdrop"]', surfaceSelector: '[data-kourosh-layer="drawer"]' });

      await gotoApp('/reports/analysis/suggestions', theme, '.purchase210-analyze-btn');
      await page.click('.purchase210-analyze-btn');
      await capture({ id: 'purchase-suggestion', theme, viewport, frameSelector: '[data-kourosh-layer="drawer-backdrop"]', surfaceSelector: '[data-kourosh-layer="drawer"]' });

      await gotoApp('/reports/collection-followup', theme);
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.trim() === 'جزئیات'), { timeout: 30_000 });
      await clickButtonContaining(page, 'جزئیات');
      await capture({ id: 'collection-followup', theme, viewport, frameSelector: '[data-report-drawer-frame="collection-followup"]', surfaceSelector: '[data-report-drawer-frame="collection-followup"] [data-report-drawer-surface="true"]' });

      await gotoApp('/reports/mobile-sales-analytics', theme, '.ux-filter-chip-bar');
      await clickButtonContaining(page, 'ریسک اقساط', '.ux-filter-chip-bar');
      await page.waitForSelector('[data-ui-card-kind="risk-followup"]', { visible: true, timeout: 20_000 });
      await clickButtonContaining(page, 'مشاهده جزئیات', '[data-ui-card-kind="risk-followup"]');
      await capture({ id: 'mobile-sales-risk', theme, viewport, frameSelector: '[data-kourosh-overlay="mobile-sales-risk"][data-kourosh-layer="drawer-backdrop"]', surfaceSelector: '#mobile-sales-risk-panel[data-kourosh-layer="drawer"]' });

      for (const harnessId of ['ml-operator', 'metadata-import', 'message-composer']) {
        await gotoHarness(harnessId, theme);
        if (harnessId === 'message-composer') {
          await capture({ id: harnessId, theme, viewport, frameSelector: '[data-kourosh-layer="modal-backdrop"]', surfaceSelector: '[data-kourosh-layer="modal"]' });
        } else {
          await capture({ id: harnessId, theme, viewport, frameSelector: `[data-report-drawer-frame="${harnessId}"]`, surfaceSelector: `[data-report-drawer-frame="${harnessId}"] [data-report-drawer-surface="true"]` });
        }
      }
    }
  }

  assert.equal(results.length, 28 * themes.length * viewports.length, 'Visual matrix must execute all 280 report modal states.');
  assert.deepEqual(pageErrors, [], `Browser runtime errors:\n${pageErrors.join('\n')}`);
} finally {
  await browser?.close().catch(() => {});
  if (vite.exitCode === null) vite.kill('SIGTERM');
}

const report = {
  generatedAt: new Date().toISOString(),
  updateBaselines,
  surfaces: surfaceLabels.size,
  themes: themes.length,
  viewports: viewports.length,
  total: results.length,
  passed: results.filter((result) => result.passed).length,
  failed: failures.length,
  maxDiffRatio,
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`Report modal visual regression: ${report.passed}/${report.total} passed (${report.surfaces} surfaces × ${report.themes} themes × ${report.viewports} viewports).`);
if (updateBaselines) console.log(`Updated ${report.total} visual baselines in tests/visual-baselines/report-modals.`);
assert.equal(failures.length, 0, `Report modal visual failures:\n${failures.map((failure) => `${failure.id}/${failure.theme}/${failure.viewport}: ${failure.missing ? 'missing baseline' : failure.dimensionMismatch || `diff ${(Number(failure.diffRatio || 0) * 100).toFixed(3)}%`}`).join('\n')}`);
