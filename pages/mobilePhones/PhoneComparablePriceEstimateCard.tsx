import React from 'react';
import { ArrowDownToLine, Brain, Layers, ShieldCheck, ShoppingCart, Tag, type LucideIcon } from 'lucide-react';
import Button from '../../components/Button';
import PhoneMarketEvidencePanel, { type MarketSnapshotDraft, type PhoneMarketEvidence, type SupplierFeedDraft, type SupplierFeedReview, type SupplierFeedReviewItem } from './PhoneMarketEvidencePanel';

export type PhoneEstimateSide = {
  suggestedPrice: number | null;
  range: { min: number; max: number } | null;
  comparableCount: number;
  dataLevel: 'sufficient' | 'limited' | 'insufficient';
  basis: 'purchase-history' | 'actual-sales-history';
  specificationMatch?: 'exact-model-storage-ram' | 'exact-model-storage' | 'model-only' | 'none';
  confidence?: 'high' | 'medium' | 'low' | 'insufficient';
  confidenceReason?: string;
  outliersExcluded?: number;
  monotonicityStatus?: 'consistent' | 'warning' | 'not-evaluable';
};

export type PhoneComparablePriceEstimate = {
  mode: 'read-only-ml-advisory-with-comparable-fallback';
  estimatorKind: 'portable-trained-regression-and-deterministic-fallback';
  purchase: PhoneEstimateSide;
  sale: PhoneEstimateSide;
  recommendation: {
    strategy: 'guarded-ensemble-v1';
    currencyUnit: 'toman';
    qualityGate: 'passed' | 'fallback-engaged' | 'insufficient';
    conflictDetected: boolean;
    purchase: PhoneUnifiedRecommendationSide;
    sale: PhoneUnifiedRecommendationSide;
  };
  reasons: string[];
  limitations: string[];
  mlAdvisory: {
    status: 'available' | 'abstained';
    executionMode: 'portable-trained-regression' | 'approved-artifact' | 'approved-artifact-unavailable' | 'advisory-disabled' | 'safety-abstention';
    artifactIds?: string[];
    purchasePrice: number | null;
    salePrice: number | null;
    safeMaximumBuyPrice: number | null;
    estimatedDaysToSell: number | null;
    confidence: 'high' | 'medium' | 'insufficient';
    abstentionReason: string | null;
    evidence: { purchaseTrainingRows: number; saleTrainingRows: number; exactOrRelatedModelRows: number };
  };
  marketEvidence: PhoneMarketEvidence;
};

type PhoneUnifiedRecommendationSide = {
  suggestedPrice: number | null;
  source: 'guarded-blend' | 'comparable-baseline' | 'insufficient';
  status: 'ready' | 'review-required' | 'insufficient';
  mlStatus: 'accepted' | 'rejected-scale-mismatch' | 'rejected-out-of-range' | 'unavailable';
  mlDeviationPercent: number | null;
  reason: string;
};

type Props = {
  enabled: boolean;
  hasModel: boolean;
  estimate: PhoneComparablePriceEstimate | null;
  loading: boolean;
  error: string | null;
  formatPrice: (value: number) => string;
  onApplyPurchase: () => void;
  onApplySale: () => void;
  canRecordMarketSnapshot: boolean;
  onRecordMarketSnapshot: (draft: MarketSnapshotDraft) => Promise<void>;
  onCreateSupplierFeed: (draft: SupplierFeedDraft, attachment: File | null) => Promise<SupplierFeedReview>;
  onApproveSupplierFeed: (feedId: number, items: SupplierFeedReviewItem[]) => Promise<number>;
  variant?: 'standalone' | 'embedded';
  showMarketEvidence?: boolean;
};

const coverageLabel: Record<PhoneEstimateSide['dataLevel'], string> = {
  sufficient: 'داده کافی', limited: 'داده محدود', insufficient: 'داده ناکافی',
};

const coverageTone: Record<PhoneEstimateSide['dataLevel'], string> = {
  sufficient: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  limited: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  insufficient: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300',
};

const matchLabel: Record<NonNullable<PhoneEstimateSide['specificationMatch']>, string> = {
  'exact-model-storage-ram': 'مدل، حافظه و RAM دقیق',
  'exact-model-storage': 'مدل و حافظه دقیق',
  'model-only': 'فقط مدل مشابه',
  none: 'بدون تطابق مشخصات',
};

const confidenceLabel: Record<NonNullable<PhoneEstimateSide['confidence']>, string> = {
  high: 'اطمینان بالا', medium: 'اطمینان متوسط', low: 'اطمینان پایین', insufficient: 'اطمینان ناکافی',
};

const PriceSide: React.FC<{
  title: string;
  icon: LucideIcon;
  side: PhoneEstimateSide;
  recommendation: PhoneUnifiedRecommendationSide;
  formatPrice: Props['formatPrice'];
  onApply: () => void;
}> = ({ title, icon: Icon, side, recommendation, formatPrice, onApply }) => (
  <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-3.5 dark:border-slate-800 dark:bg-slate-950/45">
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 dark:text-slate-400"><Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.35} aria-hidden="true" /> {title}</div>
        <div className="mt-2 text-[15px] font-black text-slate-900 dark:text-slate-50">{side.suggestedPrice ? formatPrice(side.suggestedPrice) : '—'}</div>
      </div>
      <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${coverageTone[side.dataLevel]}`}>{coverageLabel[side.dataLevel]}</span>
    </div>
    <div className="mt-2 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
      {side.comparableCount > 0 ? `${side.comparableCount.toLocaleString('fa-IR')} نمونه مشابه${side.range ? ` • بازه ${formatPrice(side.range.min)} تا ${formatPrice(side.range.max)}` : ''}` : 'نمونه مشابه قابل اتکا ثبت نشده است.'}
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${recommendation.source === 'guarded-blend' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300' : recommendation.source === 'comparable-baseline' ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{recommendation.source === 'guarded-blend' ? 'ترکیب کنترل‌شده' : recommendation.source === 'comparable-baseline' ? 'معاملات مشابه' : 'داده ناکافی'}</span>
      {side.specificationMatch && <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">{matchLabel[side.specificationMatch]}</span>}
      {side.confidence && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{confidenceLabel[side.confidence]}</span>}
      {side.monotonicityStatus === 'warning' && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">ناسازگاری ظرفیت؛ بررسی دستی</span>}
    </div>
    <p className={`mt-2 text-[9px] leading-4 ${recommendation.status === 'review-required' ? 'font-bold text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>{recommendation.reason}</p>
    {side.confidenceReason && <p className="mt-1.5 text-[9px] leading-4 text-slate-500 dark:text-slate-400">{side.confidenceReason}{side.outliersExcluded ? ` • ${side.outliersExcluded.toLocaleString('fa-IR')} داده پرت حذف شد` : ''}</p>}
    <Button type="button" size="sm" variant="secondary" className="mt-3 w-full justify-center" onClick={onApply} disabled={!recommendation.suggestedPrice} autoIcon={false} leftIcon={<ArrowDownToLine className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />}>قرار دادن در فرم</Button>
  </div>
);

const PhoneComparablePriceEstimateCard: React.FC<Props> = ({
  enabled,
  hasModel,
  estimate,
  loading,
  error,
  formatPrice,
  onApplyPurchase,
  onApplySale,
  canRecordMarketSnapshot,
  onRecordMarketSnapshot,
  onCreateSupplierFeed,
  onApproveSupplierFeed,
  variant = 'standalone',
  showMarketEvidence = true,
}) => {
  if (!enabled) return null;

  const embedded = variant === 'embedded';
  const wrapperClass = embedded
    ? 'mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-800'
    : 'mt-4 rounded-[20px] border border-sky-200/80 bg-sky-50/55 p-4 text-slate-800 shadow-[0_18px_38px_-32px_rgba(2,132,199,0.3)] dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-slate-100';

  return (
    <section className={wrapperClass} aria-label="پیشنهاد هوشمند قیمت گوشی">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-black text-slate-900 dark:text-slate-100"><Brain className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" strokeWidth={2.35} aria-hidden="true" />پیشنهاد هوشمند</div>
          <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">ترکیب کنترل‌شده ML و معاملات مشابه واقعی فروشگاه</p>
        </div>
        <span className="shrink-0 rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-[9px] font-black text-sky-700 dark:border-sky-800 dark:bg-slate-950/40 dark:text-sky-300">فقط مشاوره</span>
      </div>

      {!hasModel ? (
        <div className="mt-3 rounded-[16px] border border-slate-200 bg-white/70 px-3 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-300">برای دریافت پیشنهاد، ابتدا مدل و مشخصات گوشی را وارد کنید.</div>
      ) : loading ? (
        <div className="mt-3 animate-pulse rounded-[16px] border border-sky-100 bg-white/70 px-3 py-5 text-center text-xs text-slate-500 dark:border-sky-900/40 dark:bg-slate-950/35 dark:text-slate-400">در حال بررسی ML و معاملات مشابه…</div>
      ) : error ? (
        <div className="mt-3 rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300">{error}</div>
      ) : estimate ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9px] font-black">
            <span className={`rounded-full border px-2 py-1 ${estimate.mlAdvisory.status === 'available' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}>
              {estimate.mlAdvisory.status === 'available' ? 'ML مشاور فعال' : 'ML از پاسخ خودداری کرد'}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/75 px-2 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              {estimate.mlAdvisory.executionMode === 'approved-artifact' ? 'منبع: مدل تأییدشده' : estimate.mlAdvisory.executionMode === 'portable-trained-regression' ? 'منبع: آموزش خواندنی' : estimate.mlAdvisory.executionMode === 'advisory-disabled' ? 'خاموش با Kill Switch' : 'Fallback ایمن'}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/75 px-2 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              {estimate.mlAdvisory.confidence === 'high' ? 'اطمینان ML بالا' : estimate.mlAdvisory.confidence === 'medium' ? 'اطمینان ML متوسط' : 'اطمینان ML ناکافی'}
            </span>
          </div>
          <div className={`mt-3 rounded-[16px] border px-3 py-2.5 text-[11px] leading-5 ${estimate.recommendation.qualityGate === 'fallback-engaged' ? 'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200' : estimate.recommendation.qualityGate === 'passed' ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200' : 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-300'}`}>
            <div className="flex items-center gap-1.5 font-black">{estimate.recommendation.qualityGate === 'fallback-engaged' ? <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2.35} aria-hidden="true" /> : <Layers className="h-4 w-4 shrink-0" strokeWidth={2.35} aria-hidden="true" />}<span>{estimate.recommendation.qualityGate === 'fallback-engaged' ? 'خروجی ناسازگار ML کنار گذاشته شد' : estimate.recommendation.qualityGate === 'passed' ? 'پیشنهاد یکپارچه آماده است' : 'داده کافی برای پیشنهاد مطمئن وجود ندارد'}</span></div>
            <div className="mt-1">{estimate.recommendation.qualityGate === 'fallback-engaged' ? 'پیشنهاد نهایی از معاملات مشابه واقعی فروشگاه گرفته شده است.' : 'نتیجه نهایی پس از کنترل ایمنی بین ML و معاملات مشابه نمایش داده می‌شود.'}{estimate.mlAdvisory.estimatedDaysToSell ? ` • فروش برآوردی در ${estimate.mlAdvisory.estimatedDaysToSell.toLocaleString('fa-IR')} روز` : ''}</div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
            <PriceSide title="حداکثر بهای خرید پیشنهادی" icon={ShoppingCart} side={{ ...estimate.purchase, suggestedPrice: estimate.recommendation.purchase.suggestedPrice }} recommendation={estimate.recommendation.purchase} formatPrice={formatPrice} onApply={onApplyPurchase} />
            <PriceSide title="قیمت فروش پیشنهادی" icon={Tag} side={{ ...estimate.sale, suggestedPrice: estimate.recommendation.sale.suggestedPrice }} recommendation={estimate.recommendation.sale} formatPrice={formatPrice} onApply={onApplySale} />
          </div>
          {showMarketEvidence ? <PhoneMarketEvidencePanel evidence={estimate.marketEvidence} canRecord={canRecordMarketSnapshot} formatPrice={formatPrice} onRecord={onRecordMarketSnapshot} onCreateSupplierFeed={onCreateSupplierFeed} onApproveSupplierFeed={onApproveSupplierFeed} /> : null}
          <div className="mt-3 space-y-1 rounded-[16px] border border-sky-100 bg-white/60 px-3 py-2.5 text-[10px] leading-5 text-slate-600 dark:border-sky-900/40 dark:bg-slate-950/30 dark:text-slate-300">{estimate.reasons.slice(0, 2).map((reason) => <div key={reason}>• {reason}</div>)}</div>
          <p className="mt-2 text-[9px] leading-5 text-slate-500 dark:text-slate-400">هیچ قیمتی بدون انتخاب شما روی فرم اعمال نمی‌شود.</p>
        </>
      ) : (
        <div className="mt-3 rounded-[16px] border border-slate-200 bg-white/70 px-3 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-300">داده کافی برای برآورد قیمت این مشخصات وجود ندارد.</div>
      )}
    </section>
  );
};

export default PhoneComparablePriceEstimateCard;
