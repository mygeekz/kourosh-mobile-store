import type { GetDecisionStatusMeta, NumberFormatter, ShamsiFormatter, SmartInsightLike, SmartInsightPayload } from './types/smartInsightContracts';

type RepetitionOverviewModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  insights: SmartInsightLike[];
  typeLabels: Record<string, string>;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  onClose: () => void;
};

export default function RepetitionOverviewModal({
  selected,
  payload,
  insights,
  typeLabels,
  getDecisionStatusMeta,
  num,
  shamsi,
  onClose,
}: RepetitionOverviewModalProps) {
  const repetitionRows = insights
    .map((insight) => ({
      id: insight.id,
      title: insight.title,
      typeLabel: typeLabels[String(insight.type)] || insight.category || 'Insight',
      count: num(insight.decision?.occurrenceCount),
      last: insight.decision?.lastGeneratedAt || insight.decision?.firstGeneratedAt || payload.generatedAt,
      status: getDecisionStatusMeta(insight.decision).label,
      statusKey: getDecisionStatusMeta(insight.decision).key,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxRepeat = repetitionRows[0]?.count || 0;
  const openRepeat = repetitionRows.filter((row) => row.statusKey !== 'done').length;
  const doneRepeat = repetitionRows.filter((row) => row.statusKey === 'done').length;
  const avgGap = repetitionRows.length ? Math.max(1, Math.round(7 / Math.max(1, repetitionRows.length))) : 0;
  const repetitionKpis = [
    { label: 'بیشترین تکرار', value: maxRepeat ? `${maxRepeat.toLocaleString('fa-IR')} بار` : 'ثبت نشده', icon: 'fa-chart-simple', tone: 'violet' },
    { label: 'اقدام‌های باز', value: openRepeat.toLocaleString('fa-IR'), icon: 'fa-clock', tone: 'orange' },
    { label: 'اقدام‌های تکمیل‌شده', value: doneRepeat.toLocaleString('fa-IR'), icon: 'fa-calendar-check', tone: 'emerald' },
    { label: 'میانگین فاصله تکرار', value: avgGap ? `${avgGap.toLocaleString('fa-IR')} روز` : 'ثبت نشده', icon: 'fa-rotate', tone: 'blue' },
  ];

  return (
    <div className="fixed inset-0 z-[2310] flex items-center justify-center bg-slate-950/38 p-4 backdrop-blur-sm lg:pr-[280px]" onClick={() => onClose()}>
      <div className="w-full max-w-[1140px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="border-b border-slate-200/80 px-5 py-5 text-right dark:border-slate-800 sm:px-6">
      <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-200"><i className="fa-solid fa-chart-simple" /> دفعات تکرار</span>
      <h2 className="mt-3 text-[1.35rem] font-black text-slate-950 dark:text-white sm:text-[1.6rem]">ردیابی دفعات تکرار پیشنهاد</h2>
      <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300 sm:text-sm">بررسی تکرار پیشنهادها، وضعیت اجرا و فاصله زمانی تکرار بر اساس داده‌های واقعی.</p>
    </header>

    <main className="max-h-[72vh] overflow-y-auto p-5 sm:p-6">
      <section className="insight-modal-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {repetitionKpis.map((card) => (
          <article key={card.label} className="insight-modal-kpi-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between gap-3">
              <div className="insight-modal-kpi-copy"><div className="insight-modal-kpi-label text-[11px] font-black text-slate-500 dark:text-slate-400">{card.label}</div><div className="mt-2 text-xl font-black text-slate-950 dark:text-white">{card.value}</div></div>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200' : card.tone === 'orange' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200' : card.tone === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-200' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200'}`}><i className={`fa-solid ${card.icon}`} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <div className="grid grid-cols-[1.2fr_.55fr_.75fr_.75fr] gap-3 border-b border-slate-200/80 px-4 py-3 text-[11px] font-black text-slate-500 dark:border-slate-800">
            <span>پیشنهاد</span><span>دفعات</span><span>آخرین اجرا</span><span>وضعیت</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {repetitionRows.slice(0, 10).map((row) => (
              <div key={row.id} className="grid grid-cols-[1.2fr_.55fr_.75fr_.75fr] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800">
                <div className="min-w-0"><div className="truncate text-sm font-black text-slate-900 dark:text-white">{row.title}</div><div className="mt-1 text-[11px] font-bold text-slate-500">{row.typeLabel}</div></div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{row.count.toLocaleString('fa-IR')} بار</div>
                <div className="text-[11px] font-bold text-slate-500">{row.last ? shamsi(row.last) : '—'}</div>
                <div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.statusKey === 'done' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : row.statusKey === 'action' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200'}`}>{row.status}</span></div>
              </div>
            ))}
            {!repetitionRows.length ? <div className="py-10 text-center text-sm font-bold text-slate-400">پیشنهاد پرتکراری در حافظه تصمیمات این بازه ثبت نشده است.</div> : null}
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-sm font-black text-slate-900 dark:text-white"><i className="fa-solid fa-rotate ml-2" /> چرخه تکرار</h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60"><div className="text-[11px] font-black text-slate-500">بیشترین تکرار در ۷ روز</div><div className="mt-2 text-xl font-black text-slate-950 dark:text-white">{maxRepeat.toLocaleString('fa-IR')}</div></div>
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60"><div className="text-[11px] font-black text-slate-500">تکرار موفق</div><div className="mt-2 text-xl font-black text-slate-950 dark:text-white">{repetitionRows.length ? `${Math.round((doneRepeat / repetitionRows.length) * 100).toLocaleString('fa-IR')}٪` : '—'}</div></div>
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60"><div className="text-[11px] font-black text-slate-500">بدون نتیجه</div><div className="mt-2 text-xl font-black text-slate-950 dark:text-white">{repetitionRows.length ? `${Math.round((openRepeat / repetitionRows.length) * 100).toLocaleString('fa-IR')}٪` : '—'}</div></div>
          </div>
        </article>
      </section>
    </main>
      </div>
    </div>
  );
}
