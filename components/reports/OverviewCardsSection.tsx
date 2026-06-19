import React from 'react';
import type { NumberFormatter, SideKpisOverviewData, SmartInsightLearning, SmartInsightLike, SmartInsightPayload } from './types/smartInsightContracts';

type OverviewCardsSectionProps = {
  payload: SmartInsightPayload;
  decisionMemory: DecisionMemoryOverviewState;
  learning: SmartInsightLearning;
  insights: SmartInsightLike[];
  criticalCount: number;
  activeInsightCount: number;
  num: NumberFormatter;
  setSelected: (value: SmartInsightLike | SideKpisOverviewData | Record<string, unknown>) => void;
};

function OverviewCardsSection({
  payload,
  decisionMemory,
  learning,
  insights,
  criticalCount,
  activeInsightCount,
  num,
  setSelected,
}: OverviewCardsSectionProps) {
  return (
<section className="smart-overview-strip-v223 grid gap-3 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => setSelected({
            id: 'decision-memory-overview',
            type: 'decision_memory_overview',
            category: 'memory',
            title: 'حافظه تصمیم پیشنهادها',
            summary: 'سوابق تصمیم‌های ثبت‌شده برای پیشنهادهای هوشمند و نتیجه اجرای آن‌ها.',
            severity: 'medium',
            score: num(decisionMemory.total),
            confidence: num(learning.confidence),
            reasons: [],
            metrics: [],
            actions: [],
          })}
          className="smart-overview-card-v223 smart-overview-card-v223--memory group rounded-[24px] border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="smart-overview-card-v223__head flex items-start justify-between gap-3">
            <span className="smart-overview-card-v223__meta rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{num(decisionMemory.total || 0).toLocaleString('fa-IR')} تصمیم</span>
            <span className="smart-overview-card-v223__icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200"><i className="fa-regular fa-clock" /></span>
          </div>
          <div className="smart-overview-card-v223__body">
            <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">حافظه تصمیم</h3>
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">وضعیت پیشنهادهای ثبت‌شده، نتیجه‌ها و الگوی یادگیری تصمیم‌ها.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelected({
            id: 'repetition-overview',
            type: 'repetition_overview',
            category: 'memory',
            title: 'ردیابی دفعات تکرار پیشنهاد',
            summary: 'بررسی تکرار پیشنهادها و وضعیت اجرا بر اساس حافظه تصمیم.',
            severity: 'medium',
            score: insights.reduce((sum, insight) => sum + num(insight.decision?.occurrenceCount), 0),
            confidence: num(learning.confidence),
            reasons: [],
            metrics: [],
            actions: [],
          })}
          className="smart-overview-card-v223 smart-overview-card-v223--repetition group rounded-[24px] border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="smart-overview-card-v223__head flex items-start justify-between gap-3">
            <span className="smart-overview-card-v223__meta rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{insights.filter((insight) => num(insight.decision?.occurrenceCount) > 0).length.toLocaleString('fa-IR')} پرتکرار</span>
            <span className="smart-overview-card-v223__icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-200"><i className="fa-solid fa-chart-simple" /></span>
          </div>
          <div className="smart-overview-card-v223__body">
            <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">دفعات تکرار</h3>
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">پیشنهادهایی که چند بار تکرار شده‌اند و نیاز به تصمیم روشن دارند.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelected({
            id: 'side-kpis-overview',
            type: 'side_kpis_overview',
            category: 'kpis',
            title: 'شاخص‌های تکمیلی Insight Center',
            summary: 'نمای مکمل شاخص‌های ریسک، سود، وصول و کیفیت تصمیم‌ها.',
            severity: criticalCount > 0 ? 'high' : 'medium',
            score: activeInsightCount,
            confidence: num(learning.confidence || payload.predictiveEngine?.confidence),
            reasons: [],
            metrics: [],
            actions: [],
          })}
          className="smart-overview-card-v223 smart-overview-card-v223--kpis group rounded-[24px] border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="smart-overview-card-v223__head flex items-start justify-between gap-3">
            <span className="smart-overview-card-v223__meta rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{activeInsightCount.toLocaleString('fa-IR')} شاخص</span>
            <span className="smart-overview-card-v223__icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200"><i className="fa-solid fa-chart-line" /></span>
          </div>
          <div className="smart-overview-card-v223__body">
            <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">KPIهای جانبی</h3>
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">شاخص‌های مکمل برای ریسک موجودی، کیفیت سود، اختلاف و وصول.</p>
          </div>
        </button>
      </section>
  );
}

export default React.memo(OverviewCardsSection);
