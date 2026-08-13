import { formatExactNumberText } from '../../utils/exactNumber';
import { IconGlyph } from '@/components/ui';
import React from 'react';
import type { DecisionMemoryOverviewState, NumberFormatter, SideKpisOverviewData, SmartInsightLearning, SmartInsightLike, SmartInsightPayload } from './types/smartInsightContracts';

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
            <span className="smart-overview-card-v223__meta rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{formatExactNumberText(num(decisionMemory.total || 0))} تصمیم</span>
            <IconGlyph tone="info" className="smart-overview-card-v223__icon h-11 w-11" aria-hidden="true"><i className="fa-regular fa-clock" /></IconGlyph>
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
            <span className="smart-overview-card-v223__meta rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{formatExactNumberText(insights.filter((insight) => num(insight.decision?.occurrenceCount) > 0).length)} پرتکرار</span>
            <IconGlyph tone="accent" className="smart-overview-card-v223__icon h-11 w-11" aria-hidden="true"><i className="fa-solid fa-chart-simple" /></IconGlyph>
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
            <span className="smart-overview-card-v223__meta rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{formatExactNumberText(activeInsightCount)} شاخص</span>
            <IconGlyph tone="success" className="smart-overview-card-v223__icon h-11 w-11" aria-hidden="true"><i className="fa-solid fa-chart-line" /></IconGlyph>
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
