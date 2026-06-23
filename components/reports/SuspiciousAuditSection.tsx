import React from 'react';
import { Link } from 'react-router-dom';
import type { InsightSeverity, NumberFormatter, SeverityMetaMap, SmartInsightLike, SuspiciousAuditCard } from './types/smartInsightContracts';

type SuspiciousAuditSectionProps = {
  suspiciousAudit: SuspiciousAuditCard[];
  insights: SmartInsightLike[];
  severityMeta: SeverityMetaMap;
  num: NumberFormatter;
  setSelected: (value: SmartInsightLike | SuspiciousAuditCard | null) => void;
};

function SuspiciousAuditSection({
  suspiciousAudit,
  insights,
  severityMeta,
  num,
  setSelected,
}: SuspiciousAuditSectionProps) {
  if (!suspiciousAudit.length) return null;

  return (

        <section className="overflow-hidden rounded-[28px] border border-rose-200 bg-white shadow-sm dark:border-rose-500/25 dark:bg-slate-900/72">
          <div className="flex flex-col gap-3 border-b border-rose-100 bg-gradient-to-l from-rose-50 to-white p-4 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-slate-950/60 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                <i className="fa-solid fa-shield-halved" />
                ACCOUNTING RISK RADAR
              </div>
              <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white">تشخیص فاکتور مشکوک و خطای حسابداری</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">کنترل خودکار فاکتورهای چندقلمی، تخفیف‌های کلی/ردیفی، فروش زیر قیمت خرید و اختلاف جمع اقلام با مبلغ نهایی.</p>
            </div>
            <span className="inline-flex min-h-[38px] items-center justify-center rounded-2xl border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 dark:border-rose-500/25 dark:bg-slate-950 dark:text-rose-200">
              {suspiciousAudit.length.toLocaleString('fa-IR')} فاکتور قابل کنترل
            </span>
          </div>
          <div className="grid gap-3 p-4 xl:grid-cols-3">
            {suspiciousAudit.slice(0, 6).map((card) => {
              const meta = severityMeta[(card.severity || 'medium') as InsightSeverity] || severityMeta.medium;
              return (
                <article key={card.id} className={`rounded-[24px] border bg-white p-4 shadow-sm dark:bg-slate-950/55 ${meta.border}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${meta.badge}`}>
                        <i className="fa-solid fa-file-invoice-dollar" />
                        {card.title}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{card.subtitle || 'نیازمند بررسی مدیر یا حسابدار'}</p>
                    </div>
                    <div className="smart-neutral-chip shrink-0 rounded-2xl px-3 py-2 text-left text-[11px] font-black">
                      ریسک<br /><span className="text-xs">{num(card.riskScore).toLocaleString('fa-IR')}٪</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {(card.metrics || []).slice(0, 3).map((m, index) => (
                      <div key={`${card.id}-metric-${index}`} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black dark:bg-slate-900/70">
                        <span className="text-slate-500 dark:text-slate-400">{m.label}</span>
                        <span className="text-slate-900 dark:text-white">{String(m.value)}</span>
                      </div>
                    ))}
                  </div>
                  {(card.riskyItems || []).length ? (
                    <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/55 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                      <div className="text-[11px] font-black text-rose-700 dark:text-rose-200">اقلام حساس</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(card.riskyItems || []).slice(0, 4).map((item, index) => <span key={`${card.id}-item-${index}`} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-100 dark:bg-slate-950 dark:text-rose-200 dark:ring-rose-500/20">{String(item)}</span>)}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/invoices" className="smart-action-link inline-flex min-h-[40px] items-center gap-2 rounded-[16px] px-3 text-xs font-black transition hover:-translate-y-0.5"><i className="fa-solid fa-arrow-left" />مشاهده فاکتورها</Link>
                    <button type="button" onClick={() => setSelected(insights.find((x) => x.type === 'invoice_audit') || null)} className="inline-flex min-h-[40px] items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-circle-question" /> چرا؟</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
  );
}

export default React.memo(SuspiciousAuditSection);
