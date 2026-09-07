import { resolveNavigationContext } from './navigationContext';
import type { NavigationEntityQuickPreviewSnapshot } from './navigationEntityLabelResolver';
import {
  getNavigationReturnChain,
  type NavigationReturnRecord,
} from './navigationReturnContext';

export type OperationalBreadcrumbStage = {
  key: string;
  label: string;
  detail?: string;
  iconClass: string;
  record?: NavigationReturnRecord;
  current?: boolean;
  path?: string;
  preview?: NavigationEntityQuickPreviewSnapshot;
};

const faNumber = (value: string | number) => Number(value || 0).toLocaleString('fa-IR');

const contextHead = (value?: string) => {
  const head = String(value || '').split('•')[0]?.trim() || '';
  return head.length > 42 ? `${head.slice(0, 39).trim()}…` : head;
};

const isUsefulEntityLabel = (value: string) => {
  const text = String(value || '').trim();
  if (!text || text.length < 2) return false;
  if (/\d/.test(text)) return false;
  if (/^(?:گزارش|مرکز|جزئیات|تراکنش|پرداخت|قسط|چک|فاکتور|فروش|سند|تصمیم|ریسک|درصد|بازه|گروه|ردیف)(?:\s|#|$)/i.test(text)) return false;
  return true;
};

const iconForPath = (path: string) => {
  const pathname = String(path || '').split('?')[0].split('#')[0];
  if (pathname.startsWith('/reports')) return 'fa-solid fa-chart-line';
  if (pathname.startsWith('/customers')) return 'fa-regular fa-user';
  if (pathname.startsWith('/partners')) return 'fa-solid fa-handshake';
  if (pathname.startsWith('/installment-sales')) return 'fa-solid fa-file-invoice-dollar';
  if (pathname.startsWith('/invoices')) return 'fa-solid fa-file-invoice';
  if (pathname.startsWith('/repairs')) return 'fa-solid fa-screwdriver-wrench';
  if (pathname.startsWith('/mobile-phones')) return 'fa-solid fa-mobile-screen-button';
  if (pathname.startsWith('/products')) return 'fa-solid fa-box';
  if (pathname.startsWith('/sales')) return 'fa-solid fa-cash-register';
  return 'fa-solid fa-location-dot';
};


const basicPreview = (
  title: string,
  detail?: string,
  eyebrow = 'مرحله بررسی',
  items: NavigationEntityQuickPreviewSnapshot['items'] = [],
): NavigationEntityQuickPreviewSnapshot => ({
  eyebrow,
  title,
  subtitle: detail,
  items: (items || []).filter((item) => item?.label && item?.value),
});

const personStageLabel = (originTitle: string, previousContext?: string) => {
  if (/^مشتری\s+\S/.test(originTitle) && !/^مشتری\s+(?:جزئیات|دفتر|حساب)$/.test(originTitle)) return originTitle;
  if (/^همکار\s+\S/.test(originTitle) && !/^همکار\s+(?:جزئیات|دفتر|حساب)$/.test(originTitle)) return originTitle;
  const previousHead = contextHead(previousContext);
  if (/مشتری/.test(originTitle) && isUsefulEntityLabel(previousHead)) {
    return previousHead.startsWith('مشتری') ? previousHead : `مشتری ${previousHead}`;
  }
  if (/(?:همکار|تامین|تأمین)/.test(originTitle) && isUsefulEntityLabel(previousHead)) {
    return previousHead.startsWith('همکار') ? previousHead : `همکار ${previousHead}`;
  }
  return originTitle;
};


const withActiveNavigationContext = (path: string | undefined, search: string) => {
  if (!path) return undefined;
  const activeParams = new URLSearchParams(search || '');
  const navctx = activeParams.get('navctx');
  if (!navctx) return path;
  const url = new URL(path, 'https://kourosh.local');
  url.searchParams.set('navctx', navctx);
  return `${url.pathname}${url.search}${url.hash}`;
};

const comparablePath = (rawPath: string) => {
  const url = new URL(rawPath || '/', 'https://kourosh.local');
  url.searchParams.delete('navctx');
  url.searchParams.sort();
  return `${url.pathname}${url.search}${url.hash}`;
};

const capturedTargetStages = (
  record: NavigationReturnRecord,
  pathname: string,
  search: string,
): OperationalBreadcrumbStage[] => {
  const snapshots = (Array.isArray(record.targetEntityStages) ? record.targetEntityStages : [])
    .filter((stage) => stage && String(stage.label || '').trim());
  if (!snapshots.length) return [];

  const currentComparable = comparablePath(`${pathname}${search || ''}`);
  const targetComparable = comparablePath(record.targetPath);
  let visibleSnapshots = snapshots;

  if (currentComparable !== targetComparable) {
    const directStageIndex = snapshots.findIndex((stage) => stage.path && comparablePath(stage.path) === currentComparable);
    if (directStageIndex < 0) return [];
    visibleSnapshots = snapshots.slice(0, directStageIndex + 1);
  }

  return visibleSnapshots.map((stage, index) => ({
    key: `captured-${record.id}-${stage.key || index}`,
    label: String(stage.label || '').trim(),
    detail: stage.detail ? String(stage.detail) : undefined,
    iconClass: stage.iconClass || 'fa-solid fa-location-dot',
    path: withActiveNavigationContext(stage.path, search),
    current: index === visibleSnapshots.length - 1,
    preview: stage.preview || basicPreview(String(stage.label || '').trim(), stage.detail ? String(stage.detail) : undefined),
  }));
};

const currentTargetStages = (
  pathname: string,
  search: string,
  lastRecord: NavigationReturnRecord,
): OperationalBreadcrumbStage[] => {
  const params = new URLSearchParams(search || '');
  const currentContext = contextHead(lastRecord.originContextLabel);
  const navContext = resolveNavigationContext(pathname);
  const stages: OperationalBreadcrumbStage[] = [];
  const add = (
    key: string,
    label: string,
    iconClass: string,
    current = false,
    detail?: string,
    path?: string,
    preview?: NavigationEntityQuickPreviewSnapshot,
  ) => {
    stages.push({ key, label, iconClass, current, detail, path, preview: preview || basicPreview(label, detail) });
  };

  const installmentMatch = pathname.match(/^\/installment-sales\/(\d+)$/);
  if (installmentMatch?.[1]) {
    const saleId = installmentMatch[1];
    const paymentId = params.get('paymentId');
    const checkId = params.get('checkId');
    const baseParams = new URLSearchParams(search || '');
    baseParams.delete('paymentId');
    baseParams.delete('checkId');
    if (!baseParams.get('tab')) baseParams.set('tab', 'installments');
    const baseSearch = baseParams.toString();
    const basePath = `${pathname}${baseSearch ? `?${baseSearch}` : ''}`;
    add(`current-installment-${saleId}`, `قرارداد اقساطی #${faNumber(saleId)}`, 'fa-solid fa-file-invoice-dollar', !paymentId && !checkId, lastRecord.originContextLabel, paymentId || checkId ? basePath : undefined);
    if (paymentId) add(`current-payment-${paymentId}`, `پرداخت #${faNumber(paymentId)}`, 'fa-solid fa-hand-holding-dollar', true, lastRecord.originContextLabel);
    if (checkId) add(`current-check-${checkId}`, `چک #${faNumber(checkId)}`, 'fa-solid fa-money-check-dollar', true, lastRecord.originContextLabel);
    return stages;
  }

  const invoiceMatch = pathname.match(/^\/invoices\/(\d+)$/);
  if (invoiceMatch?.[1]) {
    const id = invoiceMatch[1];
    const legacy = params.get('source') === 'legacy';
    add(`current-invoice-${id}`, `${legacy ? 'فروش نقدی' : 'فاکتور'} #${faNumber(id)}`, legacy ? 'fa-solid fa-cash-register' : 'fa-solid fa-file-invoice', true, lastRecord.originContextLabel);
    return stages;
  }

  const repairMatch = pathname.match(/^\/repairs\/(\d+)$/);
  if (repairMatch?.[1]) {
    add(`current-repair-${repairMatch[1]}`, `تعمیر #${faNumber(repairMatch[1])}`, 'fa-solid fa-screwdriver-wrench', true, lastRecord.originContextLabel);
    return stages;
  }

  const customerMatch = pathname.match(/^\/customers\/(\d+)$/);
  if (customerMatch?.[1]) {
    const label = isUsefulEntityLabel(currentContext) ? (currentContext.startsWith('مشتری') ? currentContext : `مشتری ${currentContext}`) : `مشتری #${faNumber(customerMatch[1])}`;
    add(`current-customer-${customerMatch[1]}`, label, 'fa-regular fa-user', true, lastRecord.originContextLabel);
    return stages;
  }

  const partnerMatch = pathname.match(/^\/partners\/(\d+)$/);
  if (partnerMatch?.[1]) {
    const label = isUsefulEntityLabel(currentContext) ? (currentContext.startsWith('همکار') ? currentContext : `همکار ${currentContext}`) : `همکار #${faNumber(partnerMatch[1])}`;
    const batchId = params.get('settlementBatchId');
    const partnerParams = new URLSearchParams(search || '');
    partnerParams.delete('settlementBatchId');
    const partnerSearch = partnerParams.toString();
    const partnerPath = `${pathname}${partnerSearch ? `?${partnerSearch}` : ''}`;
    add(`current-partner-${partnerMatch[1]}`, label, 'fa-solid fa-handshake', !batchId, lastRecord.originContextLabel, batchId ? partnerPath : undefined);
    if (batchId) add(`current-settlement-${batchId}`, `سند تسویه ${batchId}`, 'fa-solid fa-file-signature', true, lastRecord.originContextLabel);
    return stages;
  }

  const phoneId = params.get('phoneId');
  if (pathname === '/mobile-phones' && phoneId) {
    add(`current-phone-${phoneId}`, `گوشی #${faNumber(phoneId)}`, 'fa-solid fa-mobile-screen-button', true, lastRecord.originContextLabel);
    return stages;
  }

  const productId = params.get('productId');
  if (pathname === '/products' && productId) {
    add(`current-product-${productId}`, `کالا #${faNumber(productId)}`, 'fa-solid fa-box', true, lastRecord.originContextLabel);
    return stages;
  }

  add('current-page', navContext.pageTitle, iconForPath(pathname), true, lastRecord.originContextLabel);
  return stages;
};

export const buildOperationalNavigationBreadcrumb = (
  record: NavigationReturnRecord,
  pathname: string,
  search: string,
): OperationalBreadcrumbStage[] => {
  const chain = getNavigationReturnChain(record);
  if (!chain.length) return [];

  const stages: OperationalBreadcrumbStage[] = chain.map((item, index) => {
    const label = index === 0 ? item.originTitle : personStageLabel(item.originTitle, chain[index - 1]?.originContextLabel);
    const uiState = item.originUiState as any;
    const isReportDrilldown = uiState?.kind === 'report-drilldown';
    return {
      key: `origin-${item.id}`,
      label,
      detail: item.originContextLabel,
      iconClass: iconForPath(item.originPathname || item.originPath),
      record: item,
      preview: basicPreview(
        label,
        item.originContextLabel,
        index === 0 ? 'مبدأ بررسی' : 'مرحله قبلی',
        [
          isReportDrilldown ? { label: 'وضعیت گزارش', value: 'فیلترها و صفحه قبلی ذخیره شده', iconClass: 'fa-solid fa-filter' } : null,
          item.originAnchorId ? { label: 'بازگشت دقیق', value: 'ردیف و موقعیت قبلی ذخیره شده', iconClass: 'fa-solid fa-location-crosshairs' } : null,
        ].filter(Boolean) as any,
      ),
    };
  });

  const lastRecord = chain[chain.length - 1];
  const enrichedTargetStages = capturedTargetStages(lastRecord, pathname, search);
  const targetStages = enrichedTargetStages.length > 0
    ? enrichedTargetStages
    : currentTargetStages(pathname, search, lastRecord);
  for (const target of targetStages) {
    const duplicate = stages[stages.length - 1]?.label === target.label;
    if (duplicate) {
      stages[stages.length - 1] = { ...stages[stages.length - 1], current: target.current, detail: target.detail || stages[stages.length - 1].detail, preview: target.preview || stages[stages.length - 1].preview };
    } else {
      stages.push(target);
    }
  }

  return stages;
};
