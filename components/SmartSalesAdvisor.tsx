import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

export type SmartSalesSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface SmartSalesInsight {
  id: string;
  title: string;
  summary: string;
  severity: SmartSalesSeverity;
  confidence: number;
  icon?: string;
  reasons?: string[];
  metrics?: Array<{ label: string; value: string }>;
  actionLabel?: string;
  actionTo?: string;
}

interface SmartSalesAdvisorProps {
  title?: string;
  subtitle?: string;
  contextLabel?: string;
  learningStatus?: 'empty' | 'learning' | 'trusted' | 'excellent';
  insights: SmartSalesInsight[];
  compact?: boolean;
}

const severityWeight: Record<SmartSalesSeverity, number> = {
  critical: 4,
  warning: 3,
  info: 2,
  success: 1,
};

const severityCopy: Record<SmartSalesSeverity, { label: string; icon: string; ring: string; text: string }> = {
  critical: {
    label: 'نیاز به توقف و بررسی',
    icon: 'fa-solid fa-triangle-exclamation',
    ring: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200',
    text: 'text-rose-700 dark:text-rose-200',
  },
  warning: {
    label: 'هشدار هوشمند',
    icon: 'fa-solid fa-circle-exclamation',
    ring: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200',
    text: 'text-amber-700 dark:text-amber-200',
  },
  info: {
    label: 'پیشنهاد سیستم',
    icon: 'fa-solid fa-lightbulb',
    ring: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-200',
    text: 'text-sky-700 dark:text-sky-200',
  },
  success: {
    label: 'شرایط سالم',
    icon: 'fa-solid fa-check',
    ring: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200',
    text: 'text-emerald-700 dark:text-emerald-200',
  },
};

const learningCopy: Record<NonNullable<SmartSalesAdvisorProps['learningStatus']>, { label: string; hint: string }> = {
  empty: { label: 'داده کم', hint: 'هنوز برای تحلیل قطعی داده کافی نیست.' },
  learning: { label: 'در حال یادگیری', hint: 'سیستم از رفتار فروشگاه الگو می‌گیرد.' },
  trusted: { label: 'قابل اعتماد', hint: 'تحلیل‌ها بر اساس داده‌های کافی ساخته شده‌اند.' },
  excellent: { label: 'بسیار قابل اعتماد', hint: 'داده‌ها برای تصمیم‌گیری عملیاتی کامل‌تر هستند.' },
};

const clampConfidence = (value: number) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const SmartSalesAdvisor: React.FC<SmartSalesAdvisorProps> = ({
  title = 'دستیار هوشمند فروش',
  subtitle = 'پیشنهادها و هشدارهای لحظه‌ای قبل از ثبت نهایی فاکتور',
  contextLabel,
  learningStatus = 'learning',
  insights,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [selectedInsight, setSelectedInsight] = useState<SmartSalesInsight | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sortedInsights = useMemo(() => {
    return [...insights].sort((a, b) => {
      const bySeverity = severityWeight[b.severity] - severityWeight[a.severity];
      if (bySeverity !== 0) return bySeverity;
      return clampConfidence(b.confidence) - clampConfidence(a.confidence);
    });
  }, [insights]);

  const primaryInsight = sortedInsights[0];
  const visibleInsights = expanded ? sortedInsights : sortedInsights.slice(0, compact ? 2 : 3);
  const learning = learningCopy[learningStatus];
  const overallConfidence = sortedInsights.length
    ? Math.round(sortedInsights.reduce((sum, item) => sum + clampConfidence(item.confidence), 0) / sortedInsights.length)
    : null;

  const openAction = (insight: SmartSalesInsight) => {
    if (insight.actionTo) navigate(insight.actionTo);
  };

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-[0_22px_48px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/88" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <i className="fa-solid fa-brain text-[13px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-[13px] font-black text-slate-900 dark:text-slate-100">{title}</h3>
              {contextLabel ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-extrabold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {contextLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 text-left">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {learning.label}
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-400">{overallConfidence === null ? 'اعتماد —' : `اعتماد ${overallConfidence.toLocaleString('fa-IR')}٪`}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {visibleInsights.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-[12px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200">
            فعلاً هشدار خاصی دیده نشد؛ با انتخاب مشتری و اقلام، تحلیل لحظه‌ای فعال می‌شود.
          </div>
        ) : visibleInsights.map((insight) => {
          const severity = severityCopy[insight.severity];
          return (
            <button
              key={insight.id}
              type="button"
              onClick={() => setSelectedInsight(insight)}
              className="group flex w-full items-start justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/65 px-3 py-2 text-right transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_34px_-30px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900/45 dark:hover:bg-slate-900"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-[11px] ${severity.ring}`}>
                  {insight.severity === 'success' ? <span className="text-[13px] font-black leading-none">✓</span> : <i className={insight.icon || severity.icon} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-black text-slate-900 dark:text-slate-100">{insight.title}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[10.5px] leading-5 text-slate-500 dark:text-slate-400">{insight.summary}</span>
                </span>
              </div>
              <span className="shrink-0 self-start rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-extrabold leading-none text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">دلیل</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="text-[10.5px] leading-5 text-slate-500 dark:text-slate-400">
          {primaryInsight ? `${severityCopy[primaryInsight.severity].label} • ${learning.hint}` : learning.hint}
        </div>
        {sortedInsights.length > (compact ? 2 : 3) ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-[11px] font-extrabold text-slate-700 transition hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
          >
            {expanded ? 'نمایش کمتر' : `نمایش همه (${sortedInsights.length.toLocaleString('fa-IR')})`}
          </button>
        ) : null}
      </div>

      {selectedInsight && typeof document !== 'undefined' ? createPortal((
        <div data-kourosh-overlay="backdrop" className="ux-overlay-backdrop fixed inset-0 z-[2147483646] flex justify-end bg-slate-950/45 p-3 pt-4" onClick={() => setSelectedInsight(null)}>
          <aside
            className="relative z-[2147483647] h-full w-full max-w-md overflow-auto rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_28px_90px_-28px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${severityCopy[selectedInsight.severity].ring}`}>
                  {selectedInsight.severity === 'success' ? <span className="text-[16px] font-black leading-none">✓</span> : <i className={selectedInsight.icon || severityCopy[selectedInsight.severity].icon} />}
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">چرا این پیشنهاد؟</div>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{selectedInsight.title}</h3>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">{selectedInsight.summary}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInsight(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="بستن"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-[10px] font-extrabold text-slate-400">سطح تحلیل</div>
                <div className={`mt-1 text-[12px] font-black ${severityCopy[selectedInsight.severity].text}`}>{severityCopy[selectedInsight.severity].label}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-[10px] font-extrabold text-slate-400">اعتماد سیستم</div>
                <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-100">{clampConfidence(selectedInsight.confidence).toLocaleString('fa-IR')}٪</div>
              </div>
            </div>

            {selectedInsight.metrics && selectedInsight.metrics.length > 0 ? (
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-2 text-[12px] font-black text-slate-900 dark:text-slate-100">عددهای اثرگذار</div>
                <div className="grid gap-2">
                  {selectedInsight.metrics.map((metric) => (
                    <div key={`${selectedInsight.id}-${metric.label}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-[12px] dark:bg-slate-950/60">
                      <span className="text-slate-500 dark:text-slate-400">{metric.label}</span>
                      <strong className="text-slate-900 dark:text-slate-100">{metric.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedInsight.reasons && selectedInsight.reasons.length > 0 ? (
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                <div className="mb-2 text-[12px] font-black text-slate-900 dark:text-slate-100">منطق تصمیم سیستم</div>
                <ul className="space-y-2">
                  {selectedInsight.reasons.map((reason) => (
                    <li key={`${selectedInsight.id}-${reason}`} className="flex items-start gap-2 text-[12px] leading-6 text-slate-600 dark:text-slate-300">
                      <i className="fa-solid fa-check mt-1.5 text-[10px] text-slate-400" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {selectedInsight.actionTo ? (
              <div className="sticky bottom-0 mt-4 border-t border-slate-100 bg-white pt-3 dark:border-slate-800 dark:bg-slate-950">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => openAction(selectedInsight)}
                  leftIcon={<i className="fa-solid fa-arrow-left" />}
                >
                  {selectedInsight.actionLabel || 'رفتن به اقدام پیشنهادی'}
                </Button>
              </div>
            ) : null}
          </aside>
        </div>
      ), document.body) : null}
    </section>
  );
};

export default SmartSalesAdvisor;
