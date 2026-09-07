import type { PricingDecisionExportColumn, PricingDecisionExportRow } from './pricingRuntime';

export const pricingDecisionExportColumns: PricingDecisionExportColumn[] = [
  { header: 'مدل گوشی', key: 'model' },
  { header: 'وضعیت', key: 'condition' },
  { header: 'نوع تصمیم', key: 'actionLabel' },
  { header: 'تاریخ', key: 'date' },
  { header: 'قیمت خرید', key: 'purchase' },
  { header: 'پیشنهاد AI', key: 'suggested' },
  { header: 'قیمت نهایی', key: 'finalSale' },
  { header: 'سود رفتاری', key: 'markup' },
  { header: 'اختلاف با AI', key: 'deltaLabel' },
];

export type PricingDecisionLogLike = {
  model: string;
  condition: string;
  meta: { label: string };
  date: string;
  purchase: string;
  suggested: string;
  finalSale: string;
  markup: string;
  deltaLabel: string;
};

export const buildPricingDecisionExportRows = (pricingDecisionLog: PricingDecisionLogLike[]): PricingDecisionExportRow[] => pricingDecisionLog.map((item) => ({
  model: item.model,
  condition: item.condition,
  actionLabel: item.meta.label,
  date: item.date,
  purchase: item.purchase,
  suggested: item.suggested,
  finalSale: item.finalSale,
  markup: item.markup,
  deltaLabel: item.deltaLabel,
}));

export const buildPricingDecisionExportFilename = (extension: 'xlsx' | 'pdf', today = new Date().toISOString().slice(0, 10)) => `pricing-decision-log-${today}.${extension}`;

export const buildPricingDecisionPdfBody = (rows: PricingDecisionExportRow[], columns = pricingDecisionExportColumns) => rows.map((row) => columns.map((col) => String(row[col.key] || '—')));
