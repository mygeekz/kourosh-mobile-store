import React from 'react';
import type { HiddenProfitOpportunity } from './types/smartInsightContracts';

type HiddenProfitSectionProps = {
  hiddenProfit: HiddenProfitOpportunity[];
};

function HiddenProfitSection({
  hiddenProfit,
}: HiddenProfitSectionProps) {
  if (!hiddenProfit.length) return null;

  return (

        <section className="smart-hidden-profit-v224 overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-sm dark:border-emerald-500/25 dark:bg-slate-900/72">
          <div className="smart-hidden-profit-v224__header flex flex-col gap-3 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-4 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-slate-950/60 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="smart-hidden-profit-v224__kicker inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                <i className="fa-solid fa-sack-dollar" />
                HIDDEN PROFIT DETECTOR
              </div>
              <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white">کشف سود پنهان</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">مغز فروشگاه از روی فروش واقعی، سود کالا و هم‌خریدها فرصت‌هایی را پیدا می‌کند که در گزارش معمولی دیده نمی‌شوند.</p>
            </div>
            <span className="smart-hidden-profit-v224__count inline-flex min-h-[38px] items-center justify-center rounded-2xl border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 dark:border-emerald-500/25 dark:bg-slate-950 dark:text-emerald-200">
              {hiddenProfit.length.toLocaleString('fa-IR')} فرصت فعال
            </span>
          </div>
          <div className="smart-hidden-profit-v224__grid grid gap-3 p-4 xl:grid-cols-3">
            {hiddenProfit.map((card) => {
              const tone = card.tone === 'amber'
                ? 'border-amber-200 bg-amber-50/55 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200'
                : card.tone === 'indigo'
                  ? 'border-indigo-200 bg-indigo-50/55 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200'
                  : 'border-emerald-200 bg-emerald-50/55 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200';
              return (
                <article key={card.id} className="smart-hidden-profit-card-v224 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${tone}`}>
                        <i className={`fa-solid ${card.icon || 'fa-sparkles'}`} />
                        {card.title}
                      </div>
                      {card.subtitle ? <p className="mt-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{card.subtitle}</p> : null}
                    </div>
                    <div className="smart-neutral-chip shrink-0 rounded-2xl px-3 py-2 text-left text-[11px] font-black">
                      اثر<br /><span className="text-xs">{card.impact || '—'}</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(card.rows || []).slice(0, 4).map((row, index) => (
                      <div key={`${card.id}-${row.productId || index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="line-clamp-1 text-sm font-black text-slate-900 dark:text-white">{row.title}</div>
                        {row.metric ? <div className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-200">{row.metric}</div> : null}
                        {row.reason ? <div className="mt-1 line-clamp-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{row.reason}</div> : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <span className="font-black text-slate-900 dark:text-white">اقدام پیشنهادی: </span>{card.action || 'بررسی و ثبت نتیجه در حافظه تصمیمات'}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
  );
}

export default React.memo(HiddenProfitSection);
