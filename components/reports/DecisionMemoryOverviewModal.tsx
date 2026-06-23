import type { DecisionMemoryOverviewState, GetDecisionStatusMeta, NumberFormatter, ShamsiFormatter, SmartInsightLike, SmartInsightPayload } from './types/smartInsightContracts';

type DecisionMemoryOverviewModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  insights: SmartInsightLike[];
  typeLabels: Record<string, string>;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  onClose: () => void;
};

export default function DecisionMemoryOverviewModal({
  selected,
  payload,
  insights,
  typeLabels,
  getDecisionStatusMeta,
  num,
  shamsi,
  onClose,
}: DecisionMemoryOverviewModalProps) {
  const decisionMemory = ((payload.summary?.decisionMemory || payload.decisionMemory || {}) as DecisionMemoryOverviewState);
  const memoryRows = insights
    .filter((insight) => insight.decision)
    .map((insight) => {
      const statusMeta = getDecisionStatusMeta(insight.decision);
      return {
    id: insight.id,
    title: insight.title,
    typeLabel: typeLabels[String(insight.type)] || insight.category || 'Insight',
    statusKey: statusMeta.key,
    statusLabel: statusMeta.label,
    occurrence: num(insight.decision?.occurrenceCount),
    date: insight.decision?.decidedAt || insight.decision?.lastGeneratedAt || insight.decision?.firstGeneratedAt || payload.generatedAt,
    outcome: insight.decision?.outcomeLabel || insight.decision?.decisionLabel || 'ثبت نشده',
      };
    })
    .sort((a, b) => num(b.occurrence) - num(a.occurrence));
  const memoryKpis = [
    { label: 'پیشنهادهای ثبت‌شده', value: num(decisionMemory.total || memoryRows.length).toLocaleString('fa-IR'), icon: 'fa-file-lines', tone: 'blue' },
    { label: 'در انتظار تصمیم', value: num(decisionMemory.pending || memoryRows.filter((row) => row.statusKey !== 'done').length).toLocaleString('fa-IR'), icon: 'fa-clock', tone: 'violet' },
    { label: 'نتیجه مثبت', value: num(decisionMemory.outcome_positive || decisionMemory.positive).toLocaleString('fa-IR'), icon: 'fa-check', tone: 'emerald' },
    { label: 'نتیجه منفی', value: num(decisionMemory.outcome_negative || decisionMemory.negative).toLocaleString('fa-IR'), icon: 'fa-circle-minus', tone: 'rose' },
  ];
  const avgRepeat = memoryRows.length
    ? Math.round(memoryRows.reduce((sum, row) => sum + num(row.occurrence), 0) / memoryRows.length)
    : 0;

  return (
    <div className="fixed inset-0 z-[2310] flex items-center justify-center bg-slate-950/38 p-4 backdrop-blur-sm lg:pr-[280px]" onClick={() => onClose()}>
      <div className="w-full max-w-[1100px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="border-b border-slate-200/80 px-5 py-5 text-right dark:border-slate-800 sm:px-6">
      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200"><i className="fa-regular fa-clock" /> حافظه تصمیم</span>
      <h2 className="mt-3 text-[1.35rem] font-black text-slate-950 dark:text-white sm:text-[1.6rem]">حافظه تصمیم پیشنهادها</h2>
      <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300 sm:text-sm">سوابق تصمیم‌های ثبت‌شده برای پیشنهادهای هوشمند و نتیجه اجرای آن‌ها بر اساس داده‌های واقعی.</p>
    </header>

    <main className="max-h-[72vh] overflow-y-auto p-5 sm:p-6">
      <section className="insight-modal-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {memoryKpis.map((card) => (
          <article key={card.label} className="insight-modal-kpi-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between gap-3">
              <div className="insight-modal-kpi-copy"><div className="insight-modal-kpi-label text-[11px] font-black text-slate-500 dark:text-slate-400">{card.label}</div><div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{card.value}</div></div>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200' : card.tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200' : card.tone === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-200' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200'}`}><i className={`fa-solid ${card.icon}`} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-sm font-black text-slate-900 dark:text-white"><i className="fa-solid fa-diagram-project ml-2" /> الگوی تصمیم</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-[11px] font-black text-slate-500">میانگین تکرار</div>
              <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">{avgRepeat.toLocaleString('fa-IR')} بار</div>
            </div>
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-[11px] font-black text-slate-500">آخرین به‌روزرسانی</div>
              <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{payload.generatedAt ? shamsi(payload.generatedAt) : 'ثبت نشده'}</div>
            </div>
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-[11px] font-black text-slate-500">منبع</div>
              <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">Smart Insight / Backend</div>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white"><i className="fa-solid fa-list ml-2" /> آخرین تصمیم‌ها</h3>
            <span className="text-[11px] font-bold text-slate-400">{memoryRows.length.toLocaleString('fa-IR')} مورد</span>
          </div>
          <div className="max-h-[330px] overflow-y-auto p-3">
            {memoryRows.slice(0, 8).map((row) => (
              <div key={row.id} className="mb-2 grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50/60 px-3 py-3 last:mb-0 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-900 dark:text-white">{row.title}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">{row.typeLabel} · {row.date ? shamsi(row.date) : '—'}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.statusKey === 'done' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : row.statusKey === 'action' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200'}`}>{row.statusLabel}</span>
                <span className="text-[11px] font-black text-slate-500">{row.occurrence.toLocaleString('fa-IR')} بار</span>
              </div>
            ))}
            {!memoryRows.length ? <div className="py-8 text-center text-sm font-bold text-slate-400">هنوز حافظه تصمیمی از بک‌اند برای این بازه ارسال نشده است.</div> : null}
          </div>
        </article>
      </section>

      <article className="mt-4 rounded-[20px] border border-blue-200 bg-blue-50/45 p-4 text-right dark:border-blue-500/25 dark:bg-blue-500/10">
        <h3 className="text-sm font-black text-blue-800 dark:text-blue-200"><i className="fa-solid fa-brain ml-2" /> خلاصه یادگیری</h3>
        <p className="mt-2 text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">نتیجه تصمیم‌های ثبت‌شده برای اولویت‌بندی پیشنهادهای بعدی استفاده می‌شود.</p>
      </article>
    </main>
      </div>
    </div>
  );
}
