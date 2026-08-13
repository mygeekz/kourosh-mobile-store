// pages/reports/CashflowReport.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import { Button, PageKit, PanelCard, SelectField } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';
import { formatExactNumberText } from '../../utils/exactNumber';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportControlDock, {
  ReportControlDateSection,
  ReportControlFilters,
  ReportControlFooter,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Day = { date: string; inflow: number; outflow: number; net: number };
type Totals = { inflow: number; outflow: number; net: number };
type Data = { days: Day[]; forecast: Day[]; totals: Totals };

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const toJalali = (d: Date) => moment(d).locale('fa').format('jYYYY/jMM/jDD');
const startOfCurrentJalaliMonth = () => moment().startOf('jMonth').startOf('day').toDate();
const fmt = (n: number, _digits = 0) => formatExactNumberText(Number.isFinite(n) ? n : 0);

export default function CashflowReport() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState<Date>(() => startOfCurrentJalaliMonth());
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [forecastDays, setForecastDays] = useState<number>(30);

  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => `بازه: ${toJalali(fromDate)} تا ${toJalali(toDate)} • پیش‌بینی: ${forecastDays} روز`, [fromDate, toDate, forecastDays]);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const fromISO = toISODate(fromDate);
      const toISO = toISODate(toDate);

      const res = await apiFetch(
        `/api/reports/cashflow?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}&forecastDays=${encodeURIComponent(String(forecastDays))}`
      );
      const json = await res.json();

      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setData(json.data as Data);
    } catch (e: any) {
      setErr(e?.message || 'خطا در دریافت گزارش');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  const t = window.setTimeout(() => { void load(); }, 250);
  return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fromDate, toDate, forecastDays]);

  const chartData = useMemo(() => {
    const base = data?.days || [];
    return base.map(d => ({
      ...d,
      label: moment(d.date).locale('fa').format('jMM/jDD'),
    }));
  }, [data]);

  const forecastChartData = useMemo(() => {
    const f = data?.forecast || [];
    return f.map(d => ({
      ...d,
      label: moment(d.date).locale('fa').format('jMM/jDD'),
    }));
  }, [data]);

  const cumulativeChartData = useMemo(() => {
    let running = 0;
    return (data?.days || []).map(d => {
      running += Number(d.net || 0);
      return {
        ...d,
        label: moment(d.date).locale('fa').format('jMM/jDD'),
        cumulative: running,
      };
    });
  }, [data]);

  const forecastRisk = useMemo(() => {
    const forecast = data?.forecast || [];
    if (!forecast.length) {
      return {
        minNet: 0,
        negativeDays: 0,
        worstDate: '—',
        riskLabel: 'بدون داده پیش‌بینی',
        riskTone: 'neutral' as const,
      };
    }

    let running = 0;
    let minNet = Number.POSITIVE_INFINITY;
    let worstDate = forecast[0]?.date || '';
    let negativeDays = 0;

    forecast.forEach((d) => {
      running += Number(d.net || 0);
      if (Number(d.net || 0) < 0) negativeDays += 1;
      if (running < minNet) {
        minNet = running;
        worstDate = d.date;
      }
    });

    const riskTone = minNet < 0 ? 'danger' : negativeDays > Math.max(2, Math.ceil(forecast.length * 0.25)) ? 'warning' : 'success';
    const riskLabel = riskTone === 'danger'
      ? 'ریسک کمبود نقدینگی'
      : riskTone === 'warning'
        ? 'نیازمند پایش'
        : 'وضعیت پایدار';

    return {
      minNet: Number.isFinite(minNet) ? minNet : 0,
      negativeDays,
      worstDate: worstDate ? moment(worstDate).locale('fa').format('jYYYY/jMM/jDD') : '—',
      riskLabel,
      riskTone,
    };
  }, [data]);

  const forecastCumulativeChartData = useMemo(() => {
    let running = 0;
    return (data?.forecast || []).map(d => {
      running += Number(d.net || 0);
      return {
        ...d,
        label: moment(d.date).locale('fa').format('jMM/jDD'),
        forecastCumulative: running,
      };
    });
  }, [data]);

  return (
    <PageKit
      title="جریان نقدی"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-money-bill-trend-up" />}
      className="report-merged-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? "خطا در دریافت گزارش" : "داده‌ای برای نمایش نیست"}
      emptyDescription={err ? err : "بازه زمانی را تغییر بده و دوباره تلاش کن."}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      controlDock={(
        <ReportControlDock
          ariaLabel="کنترل گزارش جریان نقدی"
          presentation="approved"
          title="کنترل گزارش"
          subtitle="انتخاب بازه زمانی و افق پیش‌بینی جریان نقدی"
          icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
          footer={(
            <ReportControlFooter
              ariaLabel="عملیات و وضعیت جریان نقدی"
              statuses={(
                <>
                  <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-scale-balanced" aria-hidden="true" />}>
                    <span>ورودی، خروجی و خالص واقعی</span>
                  </ReportControlStatus>
                  <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>
                    <span className="whitespace-nowrap">بازه فعال:</span>
                    <bdi dir="ltr" className="font-black">{toJalali(fromDate)}</bdi>
                    <span aria-hidden="true" className="font-black text-[var(--ds-text-muted)]">|</span>
                    <bdi dir="ltr" className="font-black">{toJalali(toDate)}</bdi>
                  </ReportControlStatus>
                  <ReportControlStatus tone="info" icon={<i className="fa-solid fa-timeline" aria-hidden="true" />}>
                    <span>پیش‌بینی {formatExactNumberText(forecastDays)} روزه</span>
                  </ReportControlStatus>
                </>
              )}
              actions={(
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => void load()}
                  disabled={isLoading}
                  loading={isLoading}
                  loadingText="در حال به‌روزرسانی…"
                  leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
                >
                  محاسبه / به‌روزرسانی
                </Button>
              )}
            />
          )}
        >
          <ReportControlDateSection
            presets={(
              <ReportDatePresetChips
                fromDate={fromDate}
                toDate={toDate}
                compact
                includeLast30
                onChange={({ from, to }) => {
                  setFromDate(from);
                  setToDate(to);
                }}
              />
            )}
            fromField={(
              <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="min-w-0">
                <ShamsiDatePicker selectedDate={fromDate} onDateChange={(date) => date && setFromDate(date)} size="standard" />
              </ReportFilterField>
            )}
            toField={(
              <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="min-w-0">
                <ShamsiDatePicker selectedDate={toDate} onDateChange={(date) => date && setToDate(date)} size="standard" />
              </ReportFilterField>
            )}
          />
          <ReportControlFilters>
            <ReportFilterField label="افق پیش‌بینی" icon={<i className="fa-solid fa-timeline" />} className="max-w-md" minWidthClassName="min-w-0">
              <SelectField
                controlOnly
                size="md"
                icon={false}
                value={String(forecastDays)}
                onValueChange={(value) => setForecastDays(Number(value))}
                options={[7, 14, 30, 60, 90].map((days) => ({ value: String(days), label: `${formatExactNumberText(days)} روز` }))}
                ariaLabel="افق پیش‌بینی جریان نقدی"
              />
            </ReportFilterField>
          </ReportControlFilters>
        </ReportControlDock>
      )}
    >
      {data && (
        <>
          <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <PanelCard variant="metric"
              title="ورودی"
              metricValue={fmt(data.totals.inflow)}
              metricHint="جمع جریان‌های نقدی ورودی در بازه انتخابی"
              icon={<i className="fa-solid fa-arrow-trend-up" />}
              tone="success"
            />
            <PanelCard variant="metric"
              title="خروجی"
              metricValue={fmt(data.totals.outflow)}
              metricHint="جمع جریان‌های نقدی خروجی در بازه انتخابی"
              icon={<i className="fa-solid fa-arrow-trend-down" />}
              tone="danger"
            />
            <PanelCard variant="metric"
              title="خالص"
              metricValue={fmt(data.totals.net)}
              metricHint="اختلاف ورودی و خروجی نقدی در بازه انتخابی"
              icon={<i className="fa-solid fa-scale-balanced" />}
              tone={data.totals.net >= 0 ? 'success' : 'danger'}
            />
          </section>

          <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <PanelCard variant="metric"
              title="وضعیت نقدینگی آینده"
              metricValue={forecastRisk.riskLabel}
              metricHint={`بر اساس روند پیش‌بینی ${formatExactNumberText(forecastDays)} روز آینده`}
              icon={<i className={forecastRisk.riskTone === 'danger' ? 'fa-solid fa-triangle-exclamation' : forecastRisk.riskTone === 'warning' ? 'fa-solid fa-eye' : forecastRisk.riskTone === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'} />}
              tone={forecastRisk.riskTone === 'danger' ? 'danger' : forecastRisk.riskTone === 'warning' ? 'warning' : forecastRisk.riskTone === 'success' ? 'success' : 'neutral'}
            />
            <PanelCard variant="metric"
              title="کمترین مانده تجمعی پیش‌بینی"
              metricValue={fmt(forecastRisk.minNet)}
              metricHint={`بدترین نقطه پیش‌بینی‌شده: ${forecastRisk.worstDate}`}
              icon={<i className="fa-solid fa-arrow-trend-down" />}
              tone={forecastRisk.minNet < 0 ? 'danger' : 'neutral'}
            />
            <PanelCard variant="metric"
              title="روزهای خالص منفی"
              metricValue={`${formatExactNumberText(forecastRisk.negativeDays)} روز`}
              metricHint="تعداد روزهایی که خروجی از ورودی بیشتر است"
              icon={<i className="fa-solid fa-calendar-xmark" />}
              tone={forecastRisk.negativeDays > 0 ? 'warning' : 'success'}
            />
          </section>

          <PanelCard
            title="نمودار بازه انتخابی"
            subtitle="روند ورودی، خروجی و خالص نقدینگی در بازه فعال گزارش."
            icon={<i className="fa-solid fa-chart-line" />}
            className="mb-4"
          >
            <div dir="ltr" style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 320, height: 240 }}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="inflow" />
                  <Line type="monotone" dataKey="outflow" />
                  <Line type="monotone" dataKey="net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <PanelCard
              title="مانده تجمعی نقدینگی در بازه انتخابی"
              subtitle="اثر تجمعی خالص جریان نقدی واقعی در بازه فعال."
              icon={<i className="fa-solid fa-chart-area" />}
            >
              <div dir="ltr" style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 320, height: 240 }}>
                  <LineChart data={cumulativeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="cumulative" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </PanelCard>

            <PanelCard
              title="مانده تجمعی پیش‌بینی‌شده"
              subtitle={`مسیر تجمعی نقدینگی در افق ${formatExactNumberText(forecastDays)} روزه.`}
              icon={<i className="fa-solid fa-timeline" />}
            >
              <div dir="ltr" style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 320, height: 240 }}>
                  <LineChart data={forecastCumulativeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="forecastCumulative" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </PanelCard>
          </section>

          <PanelCard
            title={`پیش‌بینی (میانگین ${formatExactNumberText(forecastDays)} روز اخیر)`}
            subtitle="برآورد روند ورودی، خروجی و خالص نقدینگی بر اساس داده‌های واقعی ثبت‌شده."
            icon={<i className="fa-solid fa-wand-magic-sparkles" />}
          >
            <div dir="ltr" style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 320, height: 240 }}>
                <LineChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="inflow" />
                  <Line type="monotone" dataKey="outflow" />
                  <Line type="monotone" dataKey="net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>
        </>
      )}
    </PageKit>
  );
}
