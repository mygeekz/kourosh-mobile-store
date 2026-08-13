import { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../../components/ShamsiDatePicker';
import Skeleton from '../../../components/ui/Skeleton';
import { apiFetch } from '../../../utils/apiFetch';
import type { DashboardWidgetProps } from '../types';
import DashboardMetric from '../DashboardMetric';
import DashboardWidgetHeader from '../DashboardWidgetHeader';
import DashboardHeaderLink from '../DashboardHeaderLink';

type RangeMode = 'weekly' | 'monthly' | 'custom';

type ProductSalesSummary = {
  total: number;
  receivedTotal: number;
  realizedProfit: number;
  breakdown: {
    cashSales: number;
    creditSales: number;
    installmentSales: number;
    cashReceived: number;
    creditReceived: number;
    installmentReceived: number;
  };
};

const toJalali = (date: Date) => moment(date).locale('en').format('jYYYY/jMM/jDD');

export default function ProductSalesKPIWidget({ ctx, container }: DashboardWidgetProps) {
  const [mode, setMode] = useState<RangeMode>('monthly');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ProductSalesSummary>({
    total: 0,
    receivedTotal: 0,
    realizedProfit: 0,
    breakdown: {
      cashSales: 0,
      creditSales: 0,
      installmentSales: 0,
      cashReceived: 0,
      creditReceived: 0,
      installmentReceived: 0,
    },
  });

  const compact = (container.width || 0) > 0 && (container.width || 0) < 520;
  const computed = useMemo(() => {
    const now = moment().locale('fa');
    if (mode === 'weekly') {
      return {
        fromJ: now.clone().startOf('week').format('jYYYY/jMM/jDD'),
        toJ: now.clone().endOf('week').format('jYYYY/jMM/jDD'),
      };
    }
    if (mode === 'monthly') {
      return {
        fromJ: now.clone().startOf('jMonth').format('jYYYY/jMM/jDD'),
        toJ: now.clone().endOf('jMonth').format('jYYYY/jMM/jDD'),
      };
    }
    return {
      fromJ: fromDate ? toJalali(fromDate) : now.clone().startOf('jMonth').format('jYYYY/jMM/jDD'),
      toJ: toDate ? toJalali(toDate) : now.clone().endOf('jMonth').format('jYYYY/jMM/jDD'),
    };
  }, [fromDate, mode, toDate]);

  useEffect(() => {
    if (!ctx.token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/reports/product-sales?from=${encodeURIComponent(computed.fromJ)}&to=${encodeURIComponent(computed.toJ)}`);
        const body = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && body?.success !== false) {
          setSummary({
            total: Number(body?.data?.total ?? 0) || 0,
            receivedTotal: Number(body?.data?.receivedTotal ?? 0) || 0,
            realizedProfit: Number(body?.data?.realizedProfit ?? 0) || 0,
            breakdown: {
              cashSales: Number(body?.data?.breakdown?.cashSales ?? 0) || 0,
              creditSales: Number(body?.data?.breakdown?.creditSales ?? 0) || 0,
              installmentSales: Number(body?.data?.breakdown?.installmentSales ?? 0) || 0,
              cashReceived: Number(body?.data?.breakdown?.cashReceived ?? 0) || 0,
              creditReceived: Number(body?.data?.breakdown?.creditReceived ?? 0) || 0,
              installmentReceived: Number(body?.data?.breakdown?.installmentReceived ?? 0) || 0,
            },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [computed.fromJ, computed.toJ, ctx.token]);

  const modeLabel = mode === 'weekly' ? 'هفتگی' : mode === 'monthly' ? 'ماهانه' : 'بازه دلخواه';

  return (
    <section data-ui-dashboard-widget-kind="product-sales" className="app-dashboard-widget app-dashboard-product-sales">
      <div className="app-dashboard-widget__header">
        <DashboardWidgetHeader
          title="فروش محصولات جانبی"
          subtitle={`${modeLabel} • ${computed.fromJ} تا ${computed.toJ}`}
          icon="fa-solid fa-boxes-stacked"
          compact={compact}
          action={<DashboardHeaderLink to="/reports/product-sales">گزارش کامل</DashboardHeaderLink>}
        />
      </div>
      <div className="app-dashboard-widget__body app-dashboard-widget-stack">
        <div className="app-dashboard-range-tabs" data-rgl-no-drag>
          {(['weekly', 'monthly', 'custom'] as RangeMode[]).map((item) => (
            <button
              key={item}
              type="button"
              data-skip-global-button="true"
              className="app-dashboard-range-tab"
              data-active={mode === item ? 'true' : 'false'}
              onClick={() => setMode(item)}
            >
              {item === 'weekly' ? 'هفتگی' : item === 'monthly' ? 'ماهانه' : 'دلخواه'}
            </button>
          ))}
        </div>

        {mode === 'custom' ? (
          <div className="app-dashboard-date-range" data-rgl-no-drag>
            <ShamsiDatePicker selectedDate={fromDate} onChange={setFromDate} preview="از تاریخ" size="compact" />
            <ShamsiDatePicker selectedDate={toDate} onChange={setToDate} preview="تا تاریخ" size="compact" />
          </div>
        ) : null}

        <div className="app-dashboard-metric-strip" data-columns={compact ? '1' : '3'}>
          <DashboardMetric
            label="فروش کل"
            icon="fa-solid fa-receipt"
            tone="amber"
            value={loading || ctx.showLoadingSkeletons ? <Skeleton tone="warning" className="h-4 w-24" rounded="lg" /> : ctx.formatPrice(summary.total)}
          />
          <DashboardMetric
            label="وصول‌شده"
            icon="fa-solid fa-wallet"
            tone="emerald"
            value={loading || ctx.showLoadingSkeletons ? <Skeleton tone="success" className="h-4 w-24" rounded="lg" /> : ctx.formatPrice(summary.receivedTotal)}
          />
          <DashboardMetric
            label="سود واقعی"
            icon="fa-solid fa-chart-line"
            tone="violet"
            value={loading || ctx.showLoadingSkeletons ? <Skeleton tone="violet" className="h-4 w-24" rounded="lg" /> : ctx.formatPrice(summary.realizedProfit)}
          />
        </div>

        <div className="app-dashboard-breakdown">
          {[
            { label: 'نقدی', sales: summary.breakdown.cashSales, received: summary.breakdown.cashReceived, icon: 'fa-solid fa-money-bill-wave', tone: 'amber' },
            { label: 'اعتباری', sales: summary.breakdown.creditSales, received: summary.breakdown.creditReceived, icon: 'fa-solid fa-file-invoice', tone: 'sky' },
            { label: 'اقساطی', sales: summary.breakdown.installmentSales, received: summary.breakdown.installmentReceived, icon: 'fa-solid fa-calendar-check', tone: 'violet' },
          ].map((item) => (
            <div key={item.label} className="app-dashboard-breakdown__row">
              <span className="app-dashboard-list-row__icon" data-tone={item.tone}><i className={item.icon} /></span>
              <span className="app-dashboard-breakdown__label">{item.label}</span>
              <span><small>فروش</small><strong>{ctx.formatPrice(item.sales)}</strong></span>
              <span><small>وصول</small><strong>{ctx.formatPrice(item.received)}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
