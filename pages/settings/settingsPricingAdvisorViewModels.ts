import type {
  PricingDecisionActionFilter,
  PricingDecisionDeltaFilter,
  PricingDecisionLogItem,
  PricingLearningItem,
  PricingLearningStats,
  PricingStrategyAdvisor,
  PricingToneMeta,
} from './settingsPanelTypes';
import {
  parsePricingDateTime,
  pricingStrategyLabels,
  type PricingDateInput,
  type PricingIntelligenceSettings,
  type PricingStrategyMode,
} from './pricingRuntime';
import { parsePricingDecisionDateFilter } from './settingsHelpers';

export const buildPricingLearningStatsViewModel = (pricingLearningItems: PricingLearningItem[]): PricingLearningStats => {
  const total = pricingLearningItems.length;
  const decisionItems = pricingLearningItems.filter((item) => !['sales-order-phone', 'phone-sales-history'].includes(String(item?.source || '')));
  const decisionCount = decisionItems.length;
  const historicalCount = Math.max(0, total - decisionCount);
  const accepted = decisionItems.filter((item) => item?.action === 'accepted').length;
  const overridden = decisionItems.filter((item) => item?.action === 'overridden').length;
  const manual = decisionItems.filter((item) => item?.action === 'manual').length;
  const modelCount = new Set(pricingLearningItems.map((item) => String(item?.model || '').trim()).filter(Boolean)).size;
  const learningPercent = Math.min(100, Math.round((Math.min(decisionCount, 12) / 12) * 100));
  const status = decisionCount >= 12 ? 'یادگیری رفتاری بالغ' : decisionCount >= 5 ? 'در حال یادگیری رفتاری' : decisionCount > 0 ? 'شروع یادگیری رفتاری' : historicalCount > 0 ? 'فقط سابقه فروش واقعی' : 'بدون داده قابل تحلیل';
  return { total, decisionCount, historicalCount, accepted, overridden, manual, modelCount, learningPercent, status };
};

const pricingDecisionActionMeta: Record<string, PricingToneMeta> = {
  accepted: { label: 'قبول پیشنهاد', icon: 'fa-check-circle', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' },
  overridden: { label: 'اصلاح توسط کاربر', icon: 'fa-pen-to-square', tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' },
  manual: { label: 'قیمت دستی', icon: 'fa-hand-pointer', tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300' },
};

const historicalPricingSources = new Set(['sales-order-phone', 'phone-sales-history']);

const getPricingSourceMeta = (sourceValue: unknown) => {
  const source = String(sourceValue || 'local-pricing-decision');
  if (source === 'sales-order-phone') return { source, label: 'فروش قطعی ثبت‌شده', historical: true };
  if (source === 'phone-sales-history') return { source, label: 'سابقه واقعی موجودی', historical: true };
  return { source, label: 'تصمیم ثبت‌شده کاربر', historical: false };
};

const formatPricingMoney = (value: number | string | null | undefined) => {
  const num = Number(value || 0);
  return num > 0 ? `${Math.round(num).toLocaleString('fa-IR')} تومان` : '—';
};

const formatPricingDecisionDate = (value: PricingDateInput) => {
  const time = parsePricingDateTime(value);
  return time ? new Date(time).toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
};

export type PricingDecisionLogViewModelInput = {
  pricingLearningItems: PricingLearningItem[];
  pricingDecisionSearch: string;
  pricingDecisionActionFilter: PricingDecisionActionFilter;
  pricingDecisionDeltaFilter: PricingDecisionDeltaFilter;
  pricingDecisionDateFrom: string;
  pricingDecisionDateTo: string;
};

export const buildPricingDecisionLogViewModel = ({
  pricingLearningItems,
  pricingDecisionSearch,
  pricingDecisionActionFilter,
  pricingDecisionDeltaFilter,
  pricingDecisionDateFrom,
  pricingDecisionDateTo,
}: PricingDecisionLogViewModelInput): PricingDecisionLogItem[] => {
  const query = pricingDecisionSearch.trim().toLowerCase();
  const fromTime = parsePricingDecisionDateFilter(pricingDecisionDateFrom);
  const toTime = parsePricingDecisionDateFilter(pricingDecisionDateTo, true);
  return pricingLearningItems
    .slice()
    .reverse()
    .map((item, index) => {
      const suggested = Number(item?.suggestedSale || 0);
      const finalSale = Number(item?.finalSale || 0);
      const delta = suggested > 0 && finalSale > 0 ? Math.round(((finalSale - suggested) / suggested) * 100) : 0;
      const action = String(item?.action || 'manual');
      const sourceMeta = getPricingSourceMeta(item?.source);
      const createdAt = parsePricingDateTime(item?.createdAt);
      const actionMeta = sourceMeta.historical
        ? { label: sourceMeta.label, icon: 'fa-receipt', tone: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200' }
        : (pricingDecisionActionMeta[action] || pricingDecisionActionMeta.manual);
      return {
        id: String(item?.id || `${index}-${item?.createdAt || ''}`),
        model: String(item?.model || 'مدل نامشخص'),
        condition: String(item?.condition || 'وضعیت ثبت نشده'),
        action,
        meta: actionMeta,
        suggested: formatPricingMoney(item?.suggestedSale),
        finalSale: formatPricingMoney(item?.finalSale),
        purchase: formatPricingMoney(item?.purchasePrice),
        markup: Number.isFinite(Number(item?.markupPercent)) ? `${Number(item.markupPercent).toFixed(1).replace('.0', '').toLocaleString()}٪` : '—',
        date: formatPricingDecisionDate(item?.createdAt),
        createdAt,
        delta,
        deltaLabel: suggested > 0 && finalSale > 0 ? `${delta > 0 ? '+' : ''}${delta.toLocaleString('fa-IR')}٪ نسبت به قیمت مبنا` : 'بدون اختلاف قابل محاسبه',
        source: sourceMeta.source,
        sourceLabel: sourceMeta.label,
        isHistorical: historicalPricingSources.has(sourceMeta.source),
      };
    })
    .filter((item) => {
      const matchesSearch = !query || `${item.model} ${item.condition} ${item.meta.label}`.toLowerCase().includes(query);
      const matchesAction = pricingDecisionActionFilter === 'all' || item.action === pricingDecisionActionFilter;
      const matchesDelta = pricingDecisionDeltaFilter === 'all'
        || (pricingDecisionDeltaFilter === 'higher' && item.delta > 0)
        || (pricingDecisionDeltaFilter === 'lower' && item.delta < 0)
        || (pricingDecisionDeltaFilter === 'same' && Math.abs(item.delta) <= 1);
      const hasDateFilter = Boolean(pricingDecisionDateFrom || pricingDecisionDateTo);
      const matchesDate = !hasDateFilter || (item.createdAt > 0 && item.createdAt >= fromTime && item.createdAt <= toTime);
      return matchesSearch && matchesAction && matchesDelta && matchesDate;
    });
};

export type PricingStrategyAdvisorViewModelInput = {
  pricingLearningItems: PricingLearningItem[];
  pricingLearningStats: PricingLearningStats;
  pricingSettings: PricingIntelligenceSettings;
};

export const buildPricingStrategyAdvisorViewModel = ({
  pricingLearningItems,
  pricingLearningStats,
  pricingSettings,
}: PricingStrategyAdvisorViewModelInput): PricingStrategyAdvisor => {
  const items = pricingLearningItems
    .map((item) => ({
      ...item,
      suggestedSaleNum: Number(item?.suggestedSale || 0),
      finalSaleNum: Number(item?.finalSale || 0),
      markupNum: Number(item?.markupPercent || 0),
      createdAtNum: parsePricingDateTime(item?.createdAt),
      modelName: String(item?.model || '').trim() || 'مدل نامشخص',
    }))
    .filter((item) => item.finalSaleNum > 0 || item.suggestedSaleNum > 0);
  const recent = items.filter((item) => item.createdAtNum && item.createdAtNum >= Date.now() - 30 * 24 * 60 * 60 * 1000);
  const source = recent.length >= 4 ? recent : items;
  const avgMarkup = source.length ? source.reduce((sum, item) => sum + Number(item.markupNum || 0), 0) / source.length : pricingSettings.targetMarkupPercent;
  const avgDelta = source.length ? source.reduce((sum, item) => item.suggestedSaleNum && item.finalSaleNum ? sum + (((item.finalSaleNum - item.suggestedSaleNum) / item.suggestedSaleNum) * 100) : sum, 0) / source.length : 0;
  const explicitDecisions = source.filter((item) => !historicalPricingSources.has(String(item.source || '')));
  const acceptedRate = explicitDecisions.length ? (explicitDecisions.filter((item) => item.action === 'accepted').length / explicitDecisions.length) * 100 : 0;
  const modelFrequency = source.reduce((acc: Record<string, number>, item) => { acc[item.modelName] = (acc[item.modelName] || 0) + 1; return acc; }, {});
  const hotModel = Object.entries(modelFrequency).sort((a, b) => b[1] - a[1])[0] || null;
  const maturity = pricingLearningStats.decisionCount >= 18 ? 'حرفه‌ای' : pricingLearningStats.decisionCount >= 10 ? 'پایدار' : pricingLearningStats.decisionCount >= 4 ? 'در حال یادگیری' : pricingLearningStats.historicalCount > 0 ? 'مبتنی بر سابقه فروش' : 'تازه‌کار';
  let recommended: PricingStrategyMode = pricingSettings.strategy;
  const confidence = source.length >= 12 ? 'بالا' : source.length >= 5 ? 'متوسط' : 'پایین';
  let title = 'استراتژی متعادل را نگه دار';
  let reason = 'داده یادگیری هنوز یا متعادل است یا برای تغییر جدی استراتژی کافی نیست.';
  let icon = 'fa-scale-balanced';
  let tone = 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200';
  if (source.length < 4) {
    recommended = 'balanced'; title = 'فعلاً یادگیری را ادامه بده'; reason = 'برای پیشنهاد قطعی‌تر، سیستم باید چند تصمیم قیمت‌گذاری واقعی دیگر از ثبت گوشی دریافت کند.'; icon = 'fa-seedling'; tone = 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200';
  } else if (acceptedRate >= 70 && Math.abs(avgDelta) <= 3) {
    recommended = 'balanced'; title = 'AI با رفتار قیمت‌گذاری تو هماهنگ شده'; reason = 'نرخ قبول پیشنهاد بالاست و اختلاف قیمت نهایی با پیشنهاد سیستم پایین مانده؛ استراتژی متعادل امن‌ترین انتخاب است.'; icon = 'fa-bullseye'; tone = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200';
  } else if (avgDelta < -5 || avgMarkup < pricingSettings.targetMarkupPercent - 2) {
    recommended = 'quick'; title = 'بازار را سریع‌تر بچرخان'; reason = 'قیمت‌های نهایی اخیر معمولاً پایین‌تر از پیشنهاد AI بوده؛ یعنی رفتار واقعی به سمت فروش سریع‌تر و آزادسازی سرمایه رفته است.'; icon = 'fa-bolt'; tone = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200';
  } else if (avgDelta > 5 || avgMarkup > pricingSettings.targetMarkupPercent + 3) {
    recommended = 'profit'; title = 'فضا برای سود بالاتر وجود دارد'; reason = 'در تصمیم‌های اخیر، قیمت نهایی معمولاً بالاتر از پیشنهاد AI ثبت شده؛ سیستم می‌تواند حالت سودمحورتر پیشنهاد بدهد.'; icon = 'fa-gem'; tone = 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200';
  }
  const cards = [
    { label: 'پیشنهاد استراتژی', value: pricingStrategyLabels[recommended].label, icon },
    { label: 'سطح اطمینان', value: confidence, icon: 'fa-shield-check' },
    { label: 'میانگین سود رفتاری', value: `${Math.round(avgMarkup).toLocaleString('fa-IR')}٪`, icon: 'fa-percent' },
    { label: 'اختلاف با AI', value: `${avgDelta > 0 ? '+' : ''}${Math.round(avgDelta).toLocaleString('fa-IR')}٪`, icon: 'fa-code-compare' },
  ];
  const actions = [
    recommended !== pricingSettings.strategy ? `تغییر حالت پیش‌فرض به «${pricingStrategyLabels[recommended].label}»` : 'ادامه با همین استراتژی فعلی',
    acceptedRate < 35 && source.length >= 5 ? 'بازبینی درصد سود هدف، چون پیشنهادهای AI زیاد اصلاح شده‌اند' : 'ثبت چند تصمیم جدید برای دقیق‌تر شدن یادگیری',
    hotModel ? `تمرکز روی ${hotModel[0]}؛ بیشترین داده یادگیری اخیر مربوط به این مدل است` : 'شروع یادگیری با چند ثبت گوشی واقعی',
  ];
  return { recommended, confidence, title, reason, icon, tone, cards, actions, maturity };
};
