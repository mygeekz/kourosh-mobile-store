import React from 'react';
import type { SideKpisOverviewData, ProfitSummaryLike, SmartInsightPayload, SmartInsightSummary, SuspiciousAuditLike } from './types/smartInsightContracts';

type SideKpisOverviewModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  profitSummary: ProfitSummaryLike | null;
  summary: SmartInsightSummary;
  suspiciousAudit: SuspiciousAuditLike[];
  num: NumberFormatter;
  percent: PercentFormatter;
  onClose: () => void;
};

export default function SideKpisOverviewModal({
  selected,
  payload,
  profitSummary,
  summary,
  suspiciousAudit,
  num,
  percent,
  onClose,
}: SideKpisOverviewModalProps) {
  const stockoutCount = num(payload.predictiveEngine?.risks?.stockout?.length);
  const collectionCount = num(payload.predictiveEngine?.risks?.collection?.overdueCount) + num(payload.predictiveEngine?.risks?.collection?.dueSoonCount);
  const operationalKpis = [
    { label: 'ریسک موجودی', value: stockoutCount.toLocaleString('fa-IR'), icon: 'fa-cube', tone: stockoutCount > 0 ? 'rose' : 'emerald' },
    { label: 'کیفیت سود', value: profitSummary.qualityScore != null ? percent(profitSummary.qualityScore) : percent(summary.profitQualityScore || 0), icon: 'fa-arrow-trend-up', tone: 'emerald' },
    { label: 'ریسک اختلاف', value: num(summary.auditRiskCount || suspiciousAudit.length).toLocaleString('fa-IR'), icon: 'fa-chart-line', tone: num(summary.auditRiskCount || suspiciousAudit.length) > 0 ? 'orange' : 'emerald' },
    { label: 'اعتماد تحلیل', value: percent(learning.confidence || payload.predictiveEngine?.confidence || 0), icon: 'fa-shield-halved', tone: 'violet' },
    { label: 'کالاهای در خطر', value: stockoutCount.toLocaleString('fa-IR'), icon: 'fa-triangle-exclamation', tone: stockoutCount > 0 ? 'rose' : 'emerald' },
    { label: 'سررسیدهای حساس', value: collectionCount.toLocaleString('fa-IR'), icon: 'fa-calendar-days', tone: collectionCount > 0 ? 'orange' : 'emerald' },
    { label: 'وصول فعال', value: num((insights || []).filter((x) => x.type === 'collection_risk').length).toLocaleString('fa-IR'), icon: 'fa-phone', tone: 'blue' },
    { label: 'مشتریان نیازمند اقدام', value: num(customerIntelligence.length || salesAgentLeads.length).toLocaleString('fa-IR'), icon: 'fa-user', tone: 'violet' },
  ];
  const dependentAlerts = [
    ...insights.slice(0, 6).map((insight) => ({ title: insight.title, category: typeLabels[String(insight.type)] || insight.category, severity: insight.severity })),
    ...(payload.predictiveEngine?.alerts || []).slice(0, 3).map((alert) => ({ title: alert.title, category: 'پیش‌بینی', severity: (alert.severity || 'medium') as Severity })),
  ].slice(0, 6);

  return (
    <div className="fixed inset-0 z-[2310] flex items-center justify-center bg-slate-950/38 p-4 backdrop-blur-sm lg:pr-[280px]" onClick={() => onClose()}>
      <div className="w-full max-w-[1120px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="border-b border-slate-200/80 px-5 py-5 text-right dark:border-slate-800 sm:px-6">
      <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-200"><i className="fa-solid fa-chart-line" /> KPIهای جانبی</span>
      <h2 className="mt-3 text-[1.35rem] font-black text-slate-950 dark:text-white sm:text-[1.6rem]">شاخص‌های تکمیلی Insight Center</h2>
      <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300 sm:text-sm">نمای کامل شاخص‌های مکمل برای تحلیل ریسک، سود، وصول و کیفیت تصمیم‌ها.</p>
    </header>

    <main className="max-h-[72vh] overflow-y-auto p-5 sm:p-6">
      <section className="insight-modal-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {operationalKpis.map((card) => (
          <article key={card.label} className="insight-modal-kpi-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between gap-3">
              <div className="insight-modal-kpi-copy"><div className="insight-modal-kpi-label text-[11px] font-black text-slate-500 dark:text-slate-400">{card.label}</div><div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{card.value}</div></div>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200' : card.tone === 'orange' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200' : card.tone === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-200' : card.tone === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200'}`}><i className={`fa-solid ${card.icon}`} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-sm font-black text-slate-900 dark:text-white"><i className="fa-regular fa-bell ml-2" /> هشدارهای وابسته</h3>
          <div className="mt-3 space-y-2">
            {dependentAlerts.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className={`h-2.5 w-2.5 rounded-full ${alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'high' ? 'bg-orange-500' : alert.severity === 'positive' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <div className="min-w-0"><div className="truncate text-sm font-black text-slate-900 dark:text-white">{alert.title}</div><div className="mt-1 text-[11px] font-bold text-slate-500">{alert.category}</div></div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-950">{severityMeta[alert.severity]?.label || alert.severity}</span>
              </div>
            ))}
            {!dependentAlerts.length ? <div className="py-8 text-center text-sm font-bold text-slate-400">هشدار وابسته‌ای از بک‌اند ارسال نشده است.</div> : null}
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-sm font-black text-slate-900 dark:text-white"><i className="fa-solid fa-chart-line ml-2" /> روند شاخص‌ها</h3>
          <div className="mt-4 grid gap-3">
            {operationalKpis.slice(0, 5).map((kpi, index) => {
              const numericValue = Math.min(100, Math.max(0, parseLocalizedNumber(kpi.value) || (index + 1) * 12));
              return (
                <div key={`trend-${kpi.label}`} className="rounded-[16px] border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-700 dark:text-slate-200">{kpi.label}</span><span className="text-xs font-black text-slate-500">{kpi.value}</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${numericValue}%` }} /></div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <article className="mt-4 rounded-[20px] border border-blue-200 bg-blue-50/45 p-4 text-right dark:border-blue-500/25 dark:bg-blue-500/10">
        <h3 className="text-sm font-black text-blue-800 dark:text-blue-200"><i className="fa-solid fa-sparkles ml-2" /> برداشت نهایی</h3>
        <p className="mt-2 text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">شاخص‌های تکمیلی برای تقویت تصمیم‌های مرکز Insight و اولویت‌بندی هشدارها استفاده می‌شوند.</p>
      </article>
    </main>
      </div>
    </div>
  );
}
