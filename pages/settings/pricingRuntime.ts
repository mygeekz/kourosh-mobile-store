import type { PhoneEntry } from '../../types';
import type { PricingLearningItem } from './settingsPanelTypes';

export type PricingDateInput = string | number | Date | null | undefined;
export type PricingLearningApiResult = {
  data?: { items?: PricingLearningItem[] } | PricingLearningItem[];
  items?: PricingLearningItem[];
};
export type PricingDecisionExportColumn = {
  header: string;
  key: keyof PricingDecisionExportRow;
};
export type PricingDecisionExportRow = {
  model: string;
  condition: string;
  actionLabel: string;
  date: string;
  purchase: string;
  suggested: string;
  finalSale: string;
  markup: string;
  deltaLabel: string;
};

export type PricingStrategyMode = 'quick' | 'balanced' | 'profit';
export type PricingIntelligenceSettings = {
  strategy: PricingStrategyMode;
  targetMarkupPercent: number;
  riskTolerance: number;
  staleDaysThreshold: number;
  roundStep: number;
};

export const PRICING_INTELLIGENCE_STORAGE_KEY = 'kourosh.phonePricingIntelligenceSettings.v1';
export const PRICING_BEHAVIOR_STORAGE_KEY = 'kourosh.phonePricingBehavior.v1';
export const DEFAULT_PRICING_INTELLIGENCE_SETTINGS: PricingIntelligenceSettings = {
  strategy: 'balanced',
  targetMarkupPercent: 14,
  riskTolerance: 3,
  staleDaysThreshold: 21,
  roundStep: 500000,
};

export const pricingStrategyLabels: Record<PricingStrategyMode, { label: string; icon: string; hint: string }> = {
  quick: { label: 'فروش سریع', icon: 'fa-bolt', hint: 'حاشیه سود کمتر، گردش موجودی سریع‌تر' },
  balanced: { label: 'متعادل', icon: 'fa-scale-balanced', hint: 'تعادل بین سرعت فروش و سود' },
  profit: { label: 'سودمحور', icon: 'fa-chart-line', hint: 'تمرکز روی بیشینه‌سازی حاشیه سود' },
};

export const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const clampPricingSettings = (settings: Partial<PricingIntelligenceSettings>): PricingIntelligenceSettings => ({
  strategy: ['quick', 'balanced', 'profit'].includes(String(settings.strategy)) ? settings.strategy as PricingStrategyMode : DEFAULT_PRICING_INTELLIGENCE_SETTINGS.strategy,
  targetMarkupPercent: clampNumber(Number(settings.targetMarkupPercent || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.targetMarkupPercent), 6, 30),
  riskTolerance: Math.round(clampNumber(Number(settings.riskTolerance || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.riskTolerance), 1, 5)),
  staleDaysThreshold: Math.round(clampNumber(Number(settings.staleDaysThreshold || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.staleDaysThreshold), 7, 90)),
  roundStep: [100000, 250000, 500000, 1000000].includes(Number(settings.roundStep)) ? Number(settings.roundStep) : DEFAULT_PRICING_INTELLIGENCE_SETTINGS.roundStep,
});

export const loadPricingIntelligenceSettings = (): PricingIntelligenceSettings => {
  if (typeof window === 'undefined') return DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
  try {
    const raw = localStorage.getItem(PRICING_INTELLIGENCE_STORAGE_KEY);
    return raw ? clampPricingSettings(JSON.parse(raw)) : DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
  } catch {
    return DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
  }
};

export const savePricingIntelligenceSettings = (settings: PricingIntelligenceSettings): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PRICING_INTELLIGENCE_STORAGE_KEY, JSON.stringify(settings));
};

export const loadPricingLearningItems = (): PricingLearningItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRICING_BEHAVIOR_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const parsePricingDateTime = (value: PricingDateInput): number => {
  if (!value) return 0;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\//g, '-');
  const direct = new Date(normalized).getTime();
  if (Number.isFinite(direct)) return direct;
  const dateOnly = new Date(`${normalized}T00:00:00`).getTime();
  return Number.isFinite(dateOnly) ? dateOnly : 0;
};

export const toIsoFromPhoneDate = (value: PricingDateInput): string => {
  const time = parsePricingDateTime(value);
  return time ? new Date(time).toISOString() : new Date().toISOString();
};

export const roundPricingMoney = (value: number, step = 500000) => {
  const safeStep = Number(step) > 0 ? Number(step) : 500000;
  return Math.round(Number(value || 0) / safeStep) * safeStep;
};

export const buildPricingLearningFromPhones = (phones: PhoneEntry[], settings: PricingIntelligenceSettings): PricingLearningItem[] => {
  const targetMarkup = Number(settings.targetMarkupPercent || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.targetMarkupPercent);
  return (Array.isArray(phones) ? phones : [])
    .filter((phone) => Number(phone?.purchasePrice || 0) > 0 && Number(phone?.salePrice || 0) > 0)
    .map((phone) => {
      const purchasePrice = Number(phone.purchasePrice || 0);
      const finalSale = Number(phone.salePrice || 0);
      const markupPercent = purchasePrice > 0 ? ((finalSale - purchasePrice) / purchasePrice) * 100 : 0;
      const suggestedSale = roundPricingMoney(purchasePrice * (1 + targetMarkup / 100), settings.roundStep);
      const delta = suggestedSale > 0 ? Math.abs(finalSale - suggestedSale) / suggestedSale : 1;
      return {
        id: `phone-${phone.id}`,
        source: 'phone-sales-history',
        userKey: 'system-history',
        model: String(phone.model || '').trim() || 'مدل نامشخص',
        condition: phone.condition || phone.status || 'ثبت فروش واقعی',
        purchasePrice,
        suggestedSale,
        finalSale,
        markupPercent,
        suggestedMarkupPercent: targetMarkup,
        action: delta <= 0.015 ? 'accepted' : delta > 0.04 ? 'overridden' : 'manual',
        createdAt: toIsoFromPhoneDate(phone.saleDate || phone.registerDate || phone.purchaseDate),
      };
    })
    .sort((a, b) => parsePricingDateTime(a.createdAt) - parsePricingDateTime(b.createdAt))
    .slice(-250);
};


export const extractPricingLearningItems = (result: PricingLearningApiResult | null | undefined): PricingLearningItem[] => {
  const data = result?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { items?: PricingLearningItem[] }).items)) {
    return (data as { items: PricingLearningItem[] }).items;
  }
  if (Array.isArray(result?.items)) return result.items;
  return [];
};

export const mergePricingLearningItems = (items: PricingLearningItem[], fallbackSource = 'local'): PricingLearningItem[] => (items || []).reduce<PricingLearningItem[]>((acc, item) => {
  const key = String(item?.id || `${item?.source || fallbackSource}-${item?.model || ''}-${item?.createdAt || ''}-${item?.finalSale || ''}`);
  if (!acc.some((existing) => String(existing?.id) === key)) acc.push(item);
  return acc;
}, []).sort((a, b) => parsePricingDateTime(a?.createdAt) - parsePricingDateTime(b?.createdAt)).slice(-500);
