import moment from 'jalali-moment';
import type { PhoneEntry } from '../../types';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { clamp, inventorySellableStatuses, type DashboardDrilldown, type SavedInventoryView } from './mobilePhonesControllerSupport';

export const getPhoneCostBasisAmount = (phone: Pick<PhoneEntry, 'currentPurchasePrice' | 'purchasePrice'> | null | undefined) => {
  const current = Number((phone as any)?.currentPurchasePrice || 0);
  if (Number.isFinite(current) && current > 0) return current;
  const original = Number((phone as any)?.purchasePrice || 0);
  return Number.isFinite(original) ? original : 0;
};

export const getPhoneAgeDays = (phone: PhoneEntry) => {
  return phone.purchaseDate || phone.registerDate ? moment().diff(moment(phone.purchaseDate || phone.registerDate), 'days') : null;
};

export const isPhoneStaleForAtLeast = (phone: PhoneEntry, minDays: number) => {
  const baseDate = phone.purchaseDate || phone.registerDate;
  return !!baseDate && inventorySellableStatuses.includes(phone.status) && moment().diff(moment(baseDate), 'days') >= minDays;
};

export const isPhoneWithinAgeBucket = (phone: PhoneEntry, bucketKey: string) => {
  const baseDate = phone.purchaseDate || phone.registerDate;
  if (!baseDate || !inventorySellableStatuses.includes(phone.status)) return false;
  const age = moment().diff(moment(baseDate), 'days');
  if (bucketKey === 'lt7') return age < 7;
  if (bucketKey === '7to29') return age >= 7 && age <= 29;
  if (bucketKey === '30to59') return age >= 30 && age <= 59;
  if (bucketKey === '60plus') return age >= 60;
  return false;
};

export const getPhoneOperationalFlags = (phone: PhoneEntry) => {
  const flags: Array<{ label: string; tone: string; icon: string }> = [];
  const ageDays = getPhoneAgeDays(phone);
  if (ageDays !== null && ageDays >= 45 && inventorySellableStatuses.includes(phone.status)) {
    flags.push({ label: ageDays >= 60 ? 'فروش فوری' : 'راکد', tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300', icon: 'fa-hourglass-half' });
  }
  if (Number(phone.salePrice || 0) > 0 && Number(phone.salePrice || 0) <= Number(phone.purchasePrice || 0)) {
    flags.push({ label: 'سود ضعیف', tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300', icon: 'fa-triangle-exclamation' });
  }
  if (!(Number(phone.salePrice || 0) > 0) && inventorySellableStatuses.includes(phone.status)) {
    flags.push({ label: 'بی‌قیمت', tone: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300', icon: 'fa-tags' });
  }
  if (Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80) {
    flags.push({ label: 'باتری ضعیف', tone: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300', icon: 'fa-battery-quarter' });
  }
  return flags.slice(0, 3);
};

export const buildInventoryMetrics = (phones: PhoneEntry[]) => {
  const sellable = phones.filter((phone) => inventorySellableStatuses.includes(phone.status));
  const returns = phones.filter((phone) => phone.status === 'مرجوعی' || phone.status === 'مرجوعی اقساطی');
  const withoutSalePrice = sellable.filter((phone) => !(Number(phone.salePrice) > 0));
  const totalPurchaseValue = sellable.reduce((sum, phone) => sum + getPhoneCostBasisAmount(phone), 0);
  const totalSaleValue = sellable.reduce((sum, phone) => sum + Number(phone.salePrice || 0), 0);
  const potentialProfit = totalSaleValue - totalPurchaseValue;
  const stalePhones = sellable.filter((phone) => isPhoneStaleForAtLeast(phone, 30));
  const todayEntries = phones.filter((phone) => moment(phone.registerDate).isSame(moment(), 'day')).length;
  return { sellable, returns, withoutSalePrice, totalPurchaseValue, totalSaleValue, potentialProfit, stalePhones, todayEntries };
};

export const buildInventoryIntelligence = (phones: PhoneEntry[]) => {
  const sellable = phones.filter((phone) => inventorySellableStatuses.includes(phone.status));
  const stale45 = sellable.filter((phone) => isPhoneStaleForAtLeast(phone, 45));
  const stale60 = sellable.filter((phone) => isPhoneStaleForAtLeast(phone, 60));
  const lossRisk = sellable.filter((phone) => Number(phone.salePrice || 0) > 0 && Number(phone.salePrice || 0) <= getPhoneCostBasisAmount(phone));
  const missingSupplier = phones.filter((phone) => Number(phone.purchasePrice || 0) > 0 && !String(phone.supplierName || '').trim());
  const lowBatterySellable = sellable.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
  const missingSale = sellable.filter((phone) => !(Number(phone.salePrice || 0) > 0));
  const noPurchaseDate = phones.filter((phone) => !phone.purchaseDate);

  const soldByModel = phones.reduce((acc, phone) => {
    const key = String(phone.model || '').trim();
    if (!key) return acc;
    const item = acc.get(key) || { sold: 0, active: 0 };
    if (phone.status === 'فروخته شده' || phone.status === 'فروخته شده (قسطی)') item.sold += 1;
    if (inventorySellableStatuses.includes(phone.status)) item.active += 1;
    acc.set(key, item);
    return acc;
  }, new Map<string, { sold: number; active: number }>);
  const fastMoving = Array.from(soldByModel.entries()).filter(([, value]) => value.sold >= 2).sort((a, b) => (b[1].sold - a[1].sold) || (a[1].active - b[1].active)).slice(0, 3).map(([model, value]) => ({ model, sold: value.sold, active: value.active }));

  const topAction = lossRisk.length > 0
    ? 'بازبینی فوری قیمت فروش چند دستگاه'
    : stale60.length > 0
    ? 'طراحی کمپین خروج برای راکدهای ۶۰+ روز'
    : missingSale.length > 0
    ? 'تکمیل قیمت‌گذاری دستگاه‌های بدون نرخ فروش'
    : 'انبار در وضعیت متعادل قرار دارد';

  const pressureScore = clamp((stale45.length * 7) + (lossRisk.length * 14) + (missingSale.length * 5) + (missingSupplier.length * 4) + (lowBatterySellable.length * 3), 0, 100);
  const pressureLabel = pressureScore >= 65 ? 'فشار عملیاتی بالا' : pressureScore >= 35 ? 'فشار عملیاتی متوسط' : 'پایدار';

  const alerts = [
    { key: 'loss', label: 'ریسک سود منفی', value: lossRisk.length, icon: 'fa-triangle-exclamation', tone: 'rose', hint: 'قیمت فروش کمتر یا مساوی بهای خرید' },
    { key: 'stale', label: 'راکدهای ۴۵+ روز', value: stale45.length, icon: 'fa-hourglass-end', tone: 'amber', hint: 'دستگاه‌هایی که تصمیم فروش یا کاهش قیمت می‌خواهند' },
    { key: 'missingSale', label: 'بدون قیمت فروش', value: missingSale.length, icon: 'fa-tags', tone: 'violet', hint: 'فروش‌پذیری آن‌ها هنوز نهایی نشده' },
    { key: 'supplier', label: 'بدون تامین‌کننده', value: missingSupplier.length, icon: 'fa-user-slash', tone: 'sky', hint: 'نیازمند تکمیل منبع خرید' },
    { key: 'battery', label: 'باتری پایین', value: lowBatterySellable.length, icon: 'fa-battery-quarter', tone: 'amber', hint: 'به قیمت‌گذاری یا توضیح شفاف‌تر نیاز دارند' },
    { key: 'date', label: 'بدون تاریخ خرید', value: noPurchaseDate.length, icon: 'fa-calendar-xmark', tone: 'slate', hint: 'نیازمند تکمیل سابقه خرید' },
  ].filter((item) => item.value > 0);

  return { stale45, stale60, lossRisk, missingSupplier, lowBatterySellable, missingSale, noPurchaseDate, fastMoving, topAction, pressureScore, pressureLabel, alerts };
};

export const buildWorkspaceFilteredPhones = (filteredPhones: PhoneEntry[], workspace: string) => {
  switch (workspace) {
    case 'stale': return filteredPhones.filter((phone) => isPhoneStaleForAtLeast(phone, 30));
    case 'returns': return filteredPhones.filter((phone) => phone.status === 'مرجوعی' || phone.status === 'مرجوعی اقساطی');
    case 'insights': return filteredPhones.filter((phone) => inventorySellableStatuses.includes(phone.status));
    case 'inventory': return filteredPhones;
    case 'intake':
    default: return filteredPhones;
  }
};

export const buildInventoryExplorerPhones = (args: {
  workspaceFilteredPhones: PhoneEntry[];
  savedView: SavedInventoryView;
  statusFilter: string;
  supplierFilter: string;
  modelFilter: string;
  batteryFilter: string;
  sortMode: string;
  dashboardDrilldown: DashboardDrilldown;
  inventoryExplorerDateRange: { startDate: string; endDate: string };
}) => {
  const { workspaceFilteredPhones, savedView, statusFilter, supplierFilter, modelFilter, batteryFilter, sortMode, dashboardDrilldown, inventoryExplorerDateRange } = args;
  let next = [...workspaceFilteredPhones];

  if (savedView === 'sellable') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status));
  if (savedView === 'missingSale') next = next.filter((phone) => !(Number(phone.salePrice) > 0));
  if (savedView === 'stale') next = next.filter((phone) => isPhoneStaleForAtLeast(phone, 30));
  if (savedView === 'returns') next = next.filter((phone) => phone.status === 'مرجوعی' || phone.status === 'مرجوعی اقساطی');
  if (savedView === 'today') next = next.filter((phone) => moment(phone.registerDate).isSame(moment(), 'day'));

  if (statusFilter !== 'all') next = next.filter((phone) => phone.status === statusFilter);
  if (supplierFilter !== 'all') next = next.filter((phone) => (phone.supplierName || '') === supplierFilter);
  if (modelFilter !== 'all') next = next.filter((phone) => (phone.model || '') === modelFilter);
  if (batteryFilter === 'low') next = next.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
  if (batteryFilter === 'good') next = next.filter((phone) => Number(phone.batteryHealth || 0) >= 80);

  if (inventoryExplorerDateRange.startDate) {
    next = next.filter((phone) => {
      const baseDate = phone.purchaseDate || phone.registerDate;
      return baseDate ? moment(baseDate).isSameOrAfter(moment(inventoryExplorerDateRange.startDate), 'day') : false;
    });
  }
  if (inventoryExplorerDateRange.endDate) {
    next = next.filter((phone) => {
      const baseDate = phone.purchaseDate || phone.registerDate;
      return baseDate ? moment(baseDate).isSameOrBefore(moment(inventoryExplorerDateRange.endDate), 'day') : false;
    });
  }

  if (dashboardDrilldown.kind === 'model' && dashboardDrilldown.value) next = next.filter((phone) => String(phone.model || '').trim() === dashboardDrilldown.value);
  if (dashboardDrilldown.kind === 'supplier' && dashboardDrilldown.value) next = next.filter((phone) => String(phone.supplierName || '').trim() === dashboardDrilldown.value);
  if (dashboardDrilldown.kind === 'staleBucket' && dashboardDrilldown.value) next = next.filter((phone) => isPhoneWithinAgeBucket(phone, dashboardDrilldown.value));
  if (dashboardDrilldown.kind === 'missingSale') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && !(Number(phone.salePrice || 0) > 0));
  if (dashboardDrilldown.kind === 'lossRisk') next = next.filter((phone) => Number(phone.salePrice || 0) > 0 && Number(phone.salePrice || 0) <= getPhoneCostBasisAmount(phone));
  if (dashboardDrilldown.kind === 'lowBattery') next = next.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
  if (dashboardDrilldown.kind === 'readyForSale') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > 0);
  if (dashboardDrilldown.kind === 'sellable') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status));
  if (dashboardDrilldown.kind === 'pricedInventory') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > 0);
  if (dashboardDrilldown.kind === 'profitableInventory') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > getPhoneCostBasisAmount(phone));
  if (dashboardDrilldown.kind === 'staleAll') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && (getPhoneAgeDays(phone) ?? 0) >= 30);

  const staleDays = (phone: PhoneEntry) => {
    const baseDate = phone.purchaseDate || phone.registerDate;
    return baseDate ? moment().diff(moment(baseDate), 'days') : -1;
  };
  const marginValue = (phone: PhoneEntry) => Number(phone.salePrice || 0) - getPhoneCostBasisAmount(phone);

  next.sort((a, b) => {
    switch (sortMode) {
      case 'oldest': return moment(a.registerDate).valueOf() - moment(b.registerDate).valueOf();
      case 'purchaseHigh': return Number(b.purchasePrice || 0) - Number(a.purchasePrice || 0);
      case 'purchaseLow': return Number(a.purchasePrice || 0) - Number(b.purchasePrice || 0);
      case 'saleHigh': return Number(b.salePrice || 0) - Number(a.salePrice || 0);
      case 'saleLow': return Number(a.salePrice || 0) - Number(b.salePrice || 0);
      case 'marginHigh': return marginValue(b) - marginValue(a);
      case 'staleMost': return staleDays(b) - staleDays(a);
      case 'newest':
      default: return moment(b.registerDate).valueOf() - moment(a.registerDate).valueOf();
    }
  });

  return next;
};

export const buildInventoryExplorerDateRangeLabel = (inventoryExplorerDateRange: { startDate: string; endDate: string }) => {
  if (!inventoryExplorerDateRange.startDate && !inventoryExplorerDateRange.endDate) return null;
  const fromLabel = inventoryExplorerDateRange.startDate ? formatIsoToShamsi(inventoryExplorerDateRange.startDate) : 'ابتدای ثبت اطلاعات‌ها';
  const toLabel = inventoryExplorerDateRange.endDate ? formatIsoToShamsi(inventoryExplorerDateRange.endDate) : 'امروز';
  if (inventoryExplorerDateRange.startDate && !inventoryExplorerDateRange.endDate) return `از ${fromLabel} به بعد`;
  if (!inventoryExplorerDateRange.startDate && inventoryExplorerDateRange.endDate) return `تا ${toLabel}`;
  return `${fromLabel} تا ${toLabel}`;
};

export const buildExplorerContextCard = (dashboardDrilldown: DashboardDrilldown, phones: PhoneEntry[]) => {
  if (dashboardDrilldown.kind === 'model' && dashboardDrilldown.value) {
    const sameModel = phones.filter((phone) => String(phone.model || '').trim() === dashboardDrilldown.value);
    const priced = sameModel.filter((phone) => Number(phone.salePrice || 0) > 0).length;
    const sellable = sameModel.filter((phone) => inventorySellableStatuses.includes(phone.status)).length;
    return {
      tone: 'violet' as const,
      icon: 'fa-mobile-screen-button',
      kicker: 'نمای متمرکز مدل',
      title: `مدل ${dashboardDrilldown.label}`,
      description: 'قیمت، وضعیت فروش و کیفیت موجودی این مدل را یک‌جا مقایسه کنید.',
      chips: [`${sameModel.length.toLocaleString('fa-IR')} دستگاه`, `${sellable.toLocaleString('fa-IR')} قابل‌فروش`, `${priced.toLocaleString('fa-IR')} قیمت‌گذاری‌شده`],
    };
  }
  if (dashboardDrilldown.kind === 'supplier' && dashboardDrilldown.value) {
    const sameSupplier = phones.filter((phone) => String(phone.supplierName || '').trim() === dashboardDrilldown.value);
    const priced = sameSupplier.filter((phone) => Number(phone.salePrice || 0) > 0).length;
    const stale = sameSupplier.filter((phone) => (getPhoneAgeDays(phone) ?? 0) >= 30).length;
    return {
      tone: 'sky' as const,
      icon: 'fa-user',
      kicker: 'نمای متمرکز تامین‌کننده',
      title: `تامین‌کننده ${dashboardDrilldown.label}`,
      description: 'خریدها، قیمت‌گذاری و گردش کالاهای این تأمین‌کننده را یک‌جا بررسی کنید.',
      chips: [`${sameSupplier.length.toLocaleString('fa-IR')} دستگاه`, `${priced.toLocaleString('fa-IR')} قیمت‌گذاری‌شده`, `${stale.toLocaleString('fa-IR')} راکد ۳۰+ روز`],
    };
  }
  return null;
};

export const buildExplorerFocusCards = (inventoryExplorerPhones: PhoneEntry[]) => ([
  {
    key: 'sellable',
    label: 'آماده فروش',
    value: inventoryExplorerPhones.filter((phone) => inventorySellableStatuses.includes(phone.status)).length.toLocaleString('fa-IR'),
    hint: 'دستگاه‌هایی که همین حالا در مسیر فروش‌اند.',
    icon: 'fa-bolt',
    tone: 'from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-950/20',
  },
  {
    key: 'flagged',
    label: 'نیازمند توجه',
    value: inventoryExplorerPhones.filter((phone) => getPhoneOperationalFlags(phone).length > 0).length.toLocaleString('fa-IR'),
    hint: 'پرچم‌دارهای ریسک، راکدی یا داده ناقص.',
    icon: 'fa-triangle-exclamation',
    tone: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950/20',
  },
]);

export const buildInsightsActionCards = (inventoryMetrics: any, inventoryIntelligence: any) => ([
  {
    key: 'readyForSale',
    label: 'آماده فروش',
    value: inventoryMetrics.sellable.filter((phone: PhoneEntry) => Number(phone.salePrice || 0) > 0).length,
    hint: 'گوشی‌های قابل عرضه با قیمت فروش مشخص',
    icon: 'fa-bolt',
    tone: 'from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-950/20',
    drilldown: { kind: 'readyForSale' as const, value: 'ready', label: 'آماده فروش' },
  },
  {
    key: 'missingSale',
    label: 'بی‌قیمت',
    value: inventoryIntelligence.missingSale.length,
    hint: 'دستگاه‌هایی که قیمت فروش نگرفته‌اند',
    icon: 'fa-tags',
    tone: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-slate-950/20',
    drilldown: { kind: 'missingSale' as const, value: 'missingSale', label: 'بی‌قیمت' },
  },
  {
    key: 'lossRisk',
    label: 'ریسک سود',
    value: inventoryIntelligence.lossRisk.length,
    hint: 'فروش کمتر یا مساوی بهای خرید',
    icon: 'fa-triangle-exclamation',
    tone: 'from-rose-50 to-white dark:from-rose-950/20 dark:to-slate-950/20',
    drilldown: { kind: 'lossRisk' as const, value: 'lossRisk', label: 'ریسک سود' },
  },
  {
    key: 'lowBattery',
    label: 'کم‌باتری',
    value: inventoryIntelligence.lowBatterySellable.length,
    hint: 'گوشی‌های با سلامت باتری کمتر از ۸۰٪',
    icon: 'fa-battery-quarter',
    tone: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950/20',
    drilldown: { kind: 'lowBattery' as const, value: 'lowBattery', label: 'کم‌باتری' },
  },
]);

export const buildWorkspaceLead = (workspace: string, inventoryMetrics: any, inventoryExplorerPhonesLength: number, formatPrice: (value?: number | null) => string) => {
  if (workspace === 'stale') return `راکدهای قابل پیگیری: ${inventoryMetrics.stalePhones.length.toLocaleString('fa-IR')} دستگاه`;
  if (workspace === 'returns') return `مرجوعی‌های باز: ${inventoryMetrics.returns.length.toLocaleString('fa-IR')} دستگاه`;
  if (workspace === 'insights') return `فروش بالقوه موجودی: ${formatPrice(inventoryMetrics.totalSaleValue)}`;
  if (workspace === 'intake') return 'ثبت مشخصات، قیمت و وضعیت فروش دستگاه جدید';
  return `نمایش ${inventoryExplorerPhonesLength.toLocaleString('fa-IR')} مورد از انبار گوشی`;
};
