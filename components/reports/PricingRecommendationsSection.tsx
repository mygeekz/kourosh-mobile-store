import React from 'react';
import type { MoneyFormatter, NumberFormatter, PercentFormatter, PricingRecommendationRow } from './types/smartInsightContracts';

export type PricingRecommendationCardData = PricingRecommendationRow & {
  productId?: string | number;
  productName: string;
  currentPrice?: number;
  purchasePrice?: number;
  safeMinPrice?: number;
  optimalPrice?: number;
  aggressivePrice?: number;
  marginPct?: number;
  elasticityScore?: number;
  sold7?: number;
  sold30?: number;
  daysToStockout?: number;
  expectedProfitDelta?: number;
  expectedVolumeDelta?: number;
  confidence?: number;
  risk?: string;
  action?: string;
};

type PricingRecommendationsSectionProps = {
  recommendations: PricingRecommendationCardData[];
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
};

function PricingRecommendationCard({
  item,
  money,
  percent,
  num,
}: {
  item: PricingRecommendationCardData;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
}) {
  return (
    <article className="smart-pricing-card-v223 smart-pricing-card-v262 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
      <div className="smart-pricing-card-v223__head smart-pricing-card-v262__head flex items-start justify-between gap-3">
        <div className="smart-pricing-card-v223__title smart-pricing-card-v262__title min-w-0">
          <div className="line-clamp-1 text-base font-black text-slate-950 dark:text-white">{item.productName}</div>
          <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{item.action || 'پایش قیمت'}</p>
        </div>
        <div className="smart-pricing-card-v223__confidence smart-pricing-card-v262__confidence smart-neutral-chip shrink-0 rounded-2xl px-3 py-2 text-left text-[11px] font-black">
          <span><i className="fa-solid fa-circle-check" /> اعتماد</span>
          <strong>{percent(item.confidence)}</strong>
        </div>
      </div>

      <div className="smart-pricing-card-v223__stats smart-pricing-card-v262__stats mt-4 grid grid-cols-2 gap-2">
        <div className="smart-pricing-card-v223__stat smart-pricing-card-v262__stat rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/70">
          <div className="smart-pricing-card-v225__label smart-pricing-card-v262__label text-[10px] font-black text-slate-500"><i className="fa-solid fa-tag" /> قیمت فعلی</div>
          <div className="mt-1 text-xs font-black text-slate-900 dark:text-white">{money(item.currentPrice)}</div>
        </div>
        <div className="smart-pricing-card-v223__stat smart-pricing-card-v223__stat--accent smart-pricing-card-v262__stat smart-pricing-card-v262__stat--accent rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/10">
          <div className="smart-pricing-card-v225__label smart-pricing-card-v262__label text-[10px] font-black text-amber-700 dark:text-amber-200"><i className="fa-solid fa-wand-magic-sparkles" /> پیشنهادی</div>
          <div className="mt-1 text-xs font-black text-amber-800 dark:text-amber-100">{money(item.optimalPrice)}</div>
        </div>
        <div className="smart-pricing-card-v223__stat smart-pricing-card-v262__stat rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/70">
          <div className="smart-pricing-card-v225__label smart-pricing-card-v262__label text-[10px] font-black text-slate-500"><i className="fa-solid fa-shield-halved" /> حد امن</div>
          <div className="mt-1 text-xs font-black text-slate-900 dark:text-white">{money(item.safeMinPrice)}</div>
        </div>
        <div className="smart-pricing-card-v223__stat smart-pricing-card-v262__stat rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/70">
          <div className="smart-pricing-card-v225__label smart-pricing-card-v262__label text-[10px] font-black text-slate-500"><i className="fa-solid fa-chart-line" /> اثر سود</div>
          <div className="mt-1 text-xs font-black text-slate-900 dark:text-white">{money(item.expectedProfitDelta)}</div>
        </div>
      </div>

      <div className="smart-pricing-card-v223__footer smart-pricing-card-v262__footer mt-4 flex flex-wrap gap-1.5">
        <span className="smart-pricing-card-v223__chip smart-pricing-card-v262__chip rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-cart-shopping" /> فروش ۳۰ روز: {num(item.sold30).toLocaleString('fa-IR')}</span>
        <span className="smart-pricing-card-v223__chip smart-pricing-card-v262__chip rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-wave-square" /> کشش: {num(item.elasticityScore).toLocaleString('fa-IR')}</span>
        <span className="smart-pricing-card-v223__chip smart-pricing-card-v262__chip rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-triangle-exclamation" /> ریسک: {item.risk || 'کم'}</span>
      </div>
    </article>
  );
}

function PricingRecommendationsSection({
  recommendations,
  money,
  percent,
  num,
}: PricingRecommendationsSectionProps) {
  if (!recommendations.length) return null;

  return (
    <section className="smart-pricing-board-v223 smart-pricing-board-v262 overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-sm dark:border-amber-500/25 dark:bg-slate-900/72">
      <div className="smart-pricing-board-v223__header smart-pricing-board-v262__header flex flex-col gap-3 border-b border-amber-100 bg-gradient-to-l from-amber-50 to-white p-4 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-slate-950/60 md:flex-row md:items-center md:justify-between">
        <div className="smart-pricing-board-v223__header-copy smart-pricing-board-v262__header-copy">
          <div className="smart-pricing-board-v223__kicker smart-pricing-board-v262__kicker inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
            <i className="fa-solid fa-tags" />
            AUTO PRICING ENGINE
          </div>
          <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white">قیمت‌گذاری هوشمند و حد امن فروش</h2>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">قیمت پیشنهادی بر اساس سرعت فروش، حاشیه سود، تخفیف‌پذیری، موجودی و کشش قیمت تخمینی محاسبه شده است.</p>
        </div>
        <span className="smart-pricing-board-v223__count smart-pricing-board-v262__count inline-flex min-h-[38px] items-center justify-center rounded-2xl border border-amber-200 bg-white px-3 text-xs font-black text-amber-700 dark:border-amber-500/25 dark:bg-slate-950 dark:text-amber-200">
          {recommendations.length.toLocaleString('fa-IR')} پیشنهاد قیمت
        </span>
      </div>

      <div className="smart-pricing-board-v223__grid smart-pricing-board-v262__grid grid gap-3 p-4 xl:grid-cols-3">
        {recommendations.slice(0, 6).map((item) => (
          <PricingRecommendationCard
            key={String(item.productId || item.productName)}
            item={item}
            money={money}
            percent={percent}
            num={num}
          />
        ))}
      </div>
    </section>
  );
}

export default React.memo(PricingRecommendationsSection);
