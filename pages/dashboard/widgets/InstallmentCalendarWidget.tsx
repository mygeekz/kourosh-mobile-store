import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import type { InstallmentCalendarItem } from '../../../types';
import type { DashboardWidgetProps } from '../types';
import DashboardMetric from '../DashboardMetric';
import DashboardWidgetHeader from '../DashboardWidgetHeader';
import OperationalWidgetLayout from '../OperationalWidgetLayout';
import DashboardHeaderLink from '../DashboardHeaderLink';

type Summary = {
  top: InstallmentCalendarItem[];
  paymentsCount: number;
  checksCount: number;
  totalAmount: number;
  dueSoonCount: number;
};

export default function InstallmentCalendarWidget({ ctx, container }: DashboardWidgetProps) {
  const width = container.width || 0;
  const compact = width > 0 && width < 520;
  const tiny = width > 0 && width < 400;

  const summary: Summary = useMemo(() => {
    const items = ctx.dueItems || [];
    const paymentsCount = items.filter((item) => item.type === 'payment').length;
    const checksCount = items.filter((item) => item.type === 'check').length;
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const dueSoonCount = items.filter((item) => {
      const due = moment(item.dueDate, 'jYYYY/jMM/jDD', true);
      if (!due.isValid()) return false;
      const diff = due.startOf('day').diff(moment().startOf('day'), 'days');
      return diff >= 0 && diff <= 2;
    }).length;
    const top = [...items]
      .sort((first, second) => {
        const firstDate = moment(first.dueDate, 'jYYYY/jMM/jDD', true);
        const secondDate = moment(second.dueDate, 'jYYYY/jMM/jDD', true);
        return (firstDate.isValid() ? firstDate.valueOf() : 0) - (secondDate.isValid() ? secondDate.valueOf() : 0);
      })
      .slice(0, compact ? 5 : 6);
    return { top, paymentsCount, checksCount, totalAmount, dueSoonCount };
  }, [ctx.dueItems, compact]);

  const totalCount = summary.paymentsCount + summary.checksCount;
  const installmentPct = totalCount > 0 ? Math.round((summary.paymentsCount / totalCount) * 100) : 0;
  const rangeLabel = ctx.dueRange
    ? `۱۴ روز آینده، ${ctx.dueRange.from} تا ${ctx.dueRange.to}`
    : '۱۴ روز آینده';

  const detailsPath = ctx.dueRange
    ? `/reports/installments-calendar?from=${encodeURIComponent(ctx.dueRange.from)}&to=${encodeURIComponent(ctx.dueRange.to)}`
    : '/reports/installments-calendar';

  return (
    <div data-ui-dashboard-widget-kind="installments" className="app-dashboard-widget app-dashboard-installments">
      <OperationalWidgetLayout
        compact={compact}
        scrollLabel="فهرست سررسیدهای اقساط و چک‌ها"
        header={(
          <DashboardWidgetHeader
            title="خلاصه فروش اقساطی"
            subtitle={`${rangeLabel}${summary.dueSoonCount > 0 ? ` • ${summary.dueSoonCount.toLocaleString('fa-IR')} سررسید نزدیک` : ''}`}
            icon="fa-solid fa-calendar-check"
            compact={compact}
            action={(
              <DashboardHeaderLink to={detailsPath}>
                مشاهده کامل
              </DashboardHeaderLink>
            )}
          />
        )}
      >
        {ctx.dueLoading ? (
          <div className="app-dashboard-loading" aria-label="در حال دریافت سررسیدها">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>در حال دریافت…</span>
          </div>
        ) : summary.top.length === 0 ? (
          <div className="app-dashboard-empty">
            <span className="app-dashboard-empty__icon"><i className="fa-solid fa-circle-check" /></span>
            <strong>سررسید فعالی وجود ندارد</strong>
            <span>در بازه انتخابی موردی برای پیگیری ثبت نشده است.</span>
          </div>
        ) : (
          <div className="app-dashboard-widget-stack">
            <div className="app-dashboard-metric-strip" data-columns={tiny ? '2' : compact ? '2' : '4'}>
              <DashboardMetric
                compact
                label="اقساط"
                value={summary.paymentsCount.toLocaleString('fa-IR')}
                icon="fa-solid fa-coins"
                tone="emerald"
              />
              <DashboardMetric
                compact
                label="چک‌ها"
                value={summary.checksCount.toLocaleString('fa-IR')}
                icon="fa-solid fa-money-check-dollar"
                tone="violet"
              />
              <DashboardMetric
                compact
                label="جمع قابل پیگیری"
                value={ctx.formatPrice(summary.totalAmount)}
                icon="fa-solid fa-sack-dollar"
                tone="amber"
              />
              <DashboardMetric
                compact
                label="سهم اقساط"
                value={`${installmentPct.toLocaleString('fa-IR')}٪`}
                icon="fa-solid fa-chart-pie"
                tone="sky"
                meta={(
                  <progress
                    className="app-dashboard-progress"
                    max={100}
                    value={installmentPct}
                    aria-label={`سهم اقساط ${installmentPct}%`}
                  />
                )}
              />
            </div>

            <ul className="app-dashboard-list">
              {summary.top.map((item) => (
                <li key={`${item.type}-${item.id}`} className="app-dashboard-list-row">
                  <span
                    className="app-dashboard-list-row__icon"
                    data-tone={item.type === 'payment' ? 'emerald' : 'violet'}
                    aria-hidden="true"
                  >
                    <i className={item.type === 'payment' ? 'fa-solid fa-hand-holding-dollar' : 'fa-solid fa-file-invoice-dollar'} />
                  </span>
                  <span className="app-dashboard-list-row__content">
                    <span className="app-dashboard-list-row__title">{item.customerFullName}</span>
                    <span className="app-dashboard-list-row__description">
                      {item.type === 'check'
                        ? [item.bankName, item.checkNumber].filter(Boolean).join(' • ')
                        : `فروش شماره ${item.saleId}`}
                    </span>
                  </span>
                  <span className="app-dashboard-list-row__aside">
                    <strong>{ctx.formatPrice(item.amount)}</strong>
                    <span>{item.dueDate}</span>
                  </span>
                  <Link
                    className="app-dashboard-row-link"
                    to={`/installment-sales/${item.saleId}`}
                    aria-label={`مشاهده جزئیات ${item.customerFullName}`}
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </OperationalWidgetLayout>
    </div>
  );
}
