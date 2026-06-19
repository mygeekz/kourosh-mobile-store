import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import type { InstallmentCalendarItem } from '../../../types';
import type { DashboardWidgetProps } from '../types';

type Summary = {
  top: InstallmentCalendarItem[];
  paymentsCount: number;
  checksCount: number;
  totalAmount: number;
  dueSoonCount: number;
};

const pill = (accent: 'payment' | 'check') => {
  if (accent === 'payment') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200 border-emerald-200/60 dark:border-emerald-400/20';
  }
  return 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200 border-violet-200/60 dark:border-violet-400/20';
};

export default function InstallmentCalendarWidget({ ctx, container }: DashboardWidgetProps) {
  const w = container.width || 0;
  const compact = w > 0 && w < 520;
  const tiny = w > 0 && w < 400;

  const summary: Summary = useMemo(() => {
    const items = ctx.dueItems || [];
    const paymentsCount = items.filter((x) => x.type === 'payment').length;
    const checksCount = items.filter((x) => x.type === 'check').length;
    const totalAmount = items.reduce((s, x) => s + (Number(x.amount) || 0), 0);

    // Due in the next 3 days (based on Jalali date strings)
    const dueSoonCount = items.filter((x) => {
      const m = moment(x.dueDate, 'jYYYY/jMM/jDD', true);
      if (!m.isValid()) return false;
      const diff = m.startOf('day').diff(moment().startOf('day'), 'days');
      return diff >= 0 && diff <= 2;
    }).length;

    const top = [...items]
      .sort((a, b) => {
        const ma = moment(a.dueDate, 'jYYYY/jMM/jDD', true);
        const mb = moment(b.dueDate, 'jYYYY/jMM/jDD', true);
        const ta = ma.isValid() ? ma.valueOf() : 0;
        const tb = mb.isValid() ? mb.valueOf() : 0;
        return ta - tb;
      })
      .slice(0, compact ? 5 : 6);

    return { top, paymentsCount, checksCount, totalAmount, dueSoonCount };
  }, [ctx.dueItems, compact]);

  const totalCount = summary.paymentsCount + summary.checksCount;
  const pct = totalCount > 0 ? Math.round((summary.paymentsCount / totalCount) * 100) : 0;

  const rangeLabel =
    ctx.dueRange ? `۱۴ روز آینده (${ctx.dueRange.from} تا ${ctx.dueRange.to})` : '۱۴ روز آینده';

  return (
    <div data-ui-dashboard-widget-kind="installments" className="dashboard-installments-widget relative flex h-full flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-950">
      {/* premium aura */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      {/* header */}
      <div
        className={[
          'dashboard-widget-local-header relative z-10 flex items-center justify-between text-right border-b border-slate-200/80 dark:border-slate-800',
          compact ? 'px-3 py-2.5' : 'px-4 py-3',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-300">
            <i className="fa-solid fa-calendar-check text-sm" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <h3 className={[tiny ? 'text-xs' : 'text-sm', 'font-extrabold text-gray-900 dark:text-gray-100 truncate'].join(' ')}>
                خلاصه فروش اقساطی
              </h3>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">نمای سررسیدهای اقساط</span>
            </div>

            <p className="text-[11px] text-gray-600/90 dark:text-gray-300/80 mt-1 truncate">
              {rangeLabel}
              {summary.dueSoonCount > 0 ? ` • سررسید نزدیک: ${summary.dueSoonCount.toLocaleString('fa-IR')}` : ''}
            </p>
          </div>
        </div>

        <Link
          to={
            ctx.dueRange
              ? `/reports/installments-calendar?from=${encodeURIComponent(ctx.dueRange.from)}&to=${encodeURIComponent(ctx.dueRange.to)}`
              : '/reports/installments-calendar'
          }
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white whitespace-nowrap"
        >
          مشاهده کامل
        </Link>
      </div>

      <div className={[compact ? 'p-3' : 'p-4', 'dashboard-widget-scrollarea relative z-10 flex-1 overflow-auto'].join(' ')}>
        {ctx.dueLoading ? (
          <div className="dashboard-widget-empty-state h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <i className="fas fa-spinner fa-spin text-lg" />
              <span className="text-sm font-medium">در حال دریافت…</span>
            </div>
          </div>
        ) : summary.top.length === 0 ? (
          <div className="dashboard-widget-empty-state h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-900/5 dark:bg-white/10 flex items-center justify-center mb-3">
                <i className="fa-solid fa-circle-check text-gray-500 dark:text-gray-300" />
              </div>
              <div className="font-semibold">سررسید فعالی برای نمایش وجود ندارد</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">در بازه انتخابی موردی برای پیگیری ثبت نشده است</div>
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div
              className={[
                'grid gap-3 mb-4',
                tiny ? 'grid-cols-1' : compact ? 'grid-cols-2' : 'grid-cols-4',
              ].join(' ')}
            >
              <div className="rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold">اقساط</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">تعداد قسط‌ها</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                    <i className="fa-solid fa-coins text-sm" />
                  </div>
                </div>
                <div className="mt-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  {summary.paymentsCount.toLocaleString('fa-IR')}
                </div>
              </div>

              <div className="rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold">چک‌ها</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">تعداد چک‌ها</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-700 dark:text-violet-300">
                    <i className="fa-solid fa-money-check-dollar text-sm" />
                  </div>
                </div>
                <div className="mt-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  {summary.checksCount.toLocaleString('fa-IR')}
                </div>
              </div>

              <div className="rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold">جمع مبلغ</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">مبلغ قابل پیگیری</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300">
                    <i className="fa-solid fa-sack-dollar text-sm" />
                  </div>
                </div>
                <div className="mt-2 text-sm font-extrabold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {ctx.formatPrice(summary.totalAmount)}
                </div>
              </div>

              {/* mix */}
              <div className="rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold">ترکیب</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">ترکیب سررسیدها</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/15 flex items-center justify-center text-sky-700 dark:text-sky-300">
                    <i className="fa-solid fa-chart-pie text-sm" />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    اقساط: <span className="font-bold text-gray-900 dark:text-gray-100">{pct.toLocaleString('fa-IR')}%</span>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-gray-900/10 dark:bg-white/10 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-l from-emerald-500/80 to-violet-500/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* list */}
            <ul className="space-y-2">
              {summary.top.map((it) => (
                <li
                  key={`${it.type}-${it.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/65"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <div
                      className={[
                        'mt-0.5 w-10 h-10 rounded-2xl border flex items-center justify-center',
                        it.type === 'payment'
                          ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-violet-500/10 border-violet-500/15 text-violet-700 dark:text-violet-300',
                      ].join(' ')}
                    >
                      <i className={it.type === 'payment' ? 'fa-solid fa-hand-holding-dollar' : 'fa-solid fa-file-invoice-dollar'} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={['text-[11px] px-2 py-0.5 rounded-full border font-semibold', pill(it.type)].join(' ')}>
                          {it.type === 'payment' ? 'قسط' : 'چک'}

                        </span>
                        <span className="text-[11px] text-gray-600 dark:text-gray-300">{it.dueDate}</span>
                      </div>

                      <div className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {it.customerFullName}
                      </div>

                      <div className="mt-0.5 text-xs text-gray-600/90 dark:text-gray-300/80 truncate">
                        {it.type === 'check'
                          ? `${it.bankName || ''}${it.checkNumber ? ` • ${it.checkNumber}` : ''}`
                          : `فروش #${it.saleId}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {ctx.formatPrice(it.amount)}
                    </div>
                    <Link
                      to={`/installment-sales/${it.saleId}`}
                      className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white whitespace-nowrap"
                    >
                      مشاهده جزئیات

                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
