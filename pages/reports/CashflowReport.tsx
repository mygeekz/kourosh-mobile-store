// pages/reports/CashflowReport.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Day = { date: string; inflow: number; outflow: number; net: number };
type Totals = { inflow: number; outflow: number; net: number };
type Data = { days: Day[]; forecast: Day[]; totals: Totals };

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const toJalali = (d: Date) => moment(d).locale('fa').format('jYYYY/jMM/jDD');
const startOfCurrentJalaliMonth = () => moment().startOf('jMonth').startOf('day').toDate();
const fmt = (n: number, digits = 0) => (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

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
      className="report-merged-page reports-financial-redesign-v1 cashflow-report-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? "خطا در دریافت گزارش" : "داده‌ای برای نمایش نیست"}
      emptyDescription={err ? err : "بازه زمانی را تغییر بده و دوباره تلاش کن."}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
    >
      {data && (
        <>
          <div className="cashflow-filter-panel rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="cashflow-filter-panel__head">
              <div className="cashflow-filter-panel__icon"><i className="fa-solid fa-calendar-days" /></div>
              <div>
                <h3>نمای کاری جریان نقدی</h3>
                <p>بازه گزارش و افق پیش‌بینی را تنظیم کن؛ نمودارها بر اساس همین فیلترها به‌روزرسانی می‌شوند.</p>
                <div
                  className="report-basis-badge report-basis-badge--cashflow"
                  tabIndex={0}
                  role="note"
                  aria-label="مبنای محاسبه جریان نقدی"
                  data-tooltip="ورودی یعنی مبالغ دریافت‌شده، خروجی یعنی پرداختی‌ها، خالص یعنی تفاوت روزانه؛ نمودار تجمعی اثر این تغییرات را روی نقدینگی نشان می‌دهد."
                >
                  <i className="fa-solid fa-scale-balanced" />
                  مبنای محاسبه: ورودی، خروجی، خالص روزانه و پیش‌بینی تجمعی نقدینگی
                  <span className="report-basis-badge__hint" aria-hidden="true">
                    ورودی یعنی دریافت‌ها، خروجی یعنی پرداخت‌ها؛ خالص و تجمعی از همین داده‌ها ساخته می‌شود.
                  </span>
                </div>

              </div>
            </div>

            <div className="cashflow-filter-panel__body cashflow-control-dock" aria-label="نوار فیلتر جریان نقدی">
              <ReportDatePresetChips
                fromDate={fromDate}
                toDate={toDate}
                onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
                className="cashflow-preset-chips"
              />

              <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="cashflow-filter-field cashflow-filter-field--date cashflow-filter-field--from">
                <ShamsiDatePicker
                  selectedDate={fromDate}
                  onChange={(d) => d && setFromDate(d)}
                />
              </ReportFilterField>

              <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="cashflow-filter-field cashflow-filter-field--date cashflow-filter-field--to">
                <ShamsiDatePicker
                  selectedDate={toDate}
                  onChange={(d) => d && setToDate(d)}
                />
              </ReportFilterField>

              <ReportFilterField label="افق پیش‌بینی" icon={<i className="fa-solid fa-timeline" />} minWidthClassName="cashflow-filter-field cashflow-filter-field--forecast">
                <select
                  value={forecastDays}
                  onChange={(e) => setForecastDays(Number(e.target.value))}
                  className="cashflow-select-field"
                >
                  {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} روز</option>)}
                </select>
              </ReportFilterField>

              <button type="button" onClick={load} className="cashflow-refresh-button" disabled={isLoading}>
                <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} />
                به‌روزرسانی
              </button>
            </div>
          </div>

          <div className="cashflow-kpi-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="cashflow-kpi-card cashflow-kpi-card--inflow rounded-2xl border border-black/10 dark:border-white/10 bg-white p-4 dark:bg-slate-950">
              <div className="cashflow-card-icon"><i className="fa-solid fa-arrow-trend-up" /></div>
              <div>
                <div className="text-xs text-muted">ورودی</div>
                <div className="cashflow-kpi-value mt-2 text-2xl font-extrabold">{fmt(data.totals.inflow)}</div>
              </div>
            </div>
            <div className="cashflow-kpi-card cashflow-kpi-card--outflow rounded-2xl border border-black/10 dark:border-white/10 bg-white p-4 dark:bg-slate-950">
              <div className="cashflow-card-icon"><i className="fa-solid fa-arrow-trend-down" /></div>
              <div>
                <div className="text-xs text-muted">خروجی</div>
                <div className="cashflow-kpi-value mt-2 text-2xl font-extrabold">{fmt(data.totals.outflow)}</div>
              </div>
            </div>
            <div className="cashflow-kpi-card cashflow-kpi-card--net rounded-2xl border border-black/10 dark:border-white/10 bg-white p-4 dark:bg-slate-950">
              <div className="cashflow-card-icon"><i className="fa-solid fa-scale-balanced" /></div>
              <div>
                <div className="text-xs text-muted">خالص</div>
                <div className="cashflow-kpi-value mt-2 text-2xl font-extrabold">{fmt(data.totals.net)}</div>
              </div>
            </div>
          </div>
          <div className="cashflow-risk-grid">
            <div className={`cashflow-risk-card cashflow-risk-card--${forecastRisk.riskTone}`}>
              <div className={`cashflow-risk-card__icon cashflow-risk-card__icon--${forecastRisk.riskTone}`}>
                <i className={forecastRisk.riskTone === 'danger' ? 'fa-solid fa-triangle-exclamation' : forecastRisk.riskTone === 'warning' ? 'fa-solid fa-eye' : 'fa-solid fa-circle-check'} />
              </div>
              <div>
                <div className="cashflow-risk-card__label">وضعیت نقدینگی آینده</div>
                <div className="cashflow-risk-card__value">{forecastRisk.riskLabel}</div>
                <p>بر اساس روند پیش‌بینی {forecastDays} روز آینده.</p>
              </div>
            </div>

            <div className="cashflow-risk-card">
              <div className="cashflow-risk-card__icon cashflow-risk-card__icon--neutral"><i className="fa-solid fa-arrow-trend-down" /></div>
              <div>
                <div className="cashflow-risk-card__label">کمترین مانده تجمعی پیش‌بینی</div>
                <div className="cashflow-risk-card__value">{fmt(forecastRisk.minNet)}</div>
                <p>بدترین نقطه پیش‌بینی‌شده: {forecastRisk.worstDate}</p>
              </div>
            </div>

            <div className="cashflow-risk-card">
              <div className="cashflow-risk-card__icon cashflow-risk-card__icon--warning"><i className="fa-solid fa-calendar-xmark" /></div>
              <div>
                <div className="cashflow-risk-card__label">روزهای خالص منفی</div>
                <div className="cashflow-risk-card__value">{forecastRisk.negativeDays.toLocaleString('fa-IR')} روز</div>
                <p>تعداد روزهایی که خروجی از ورودی بیشتر است.</p>
              </div>
            </div>
          </div>


          <div className="cashflow-chart-card rounded-2xl border border-black/10 dark:border-white/10 bg-white p-4 mb-4 dark:bg-slate-950">
            <div className="text-sm font-semibold mb-3">نمودار (بازه انتخابی)</div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
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
          </div>
          <div className="cashflow-chart-grid">
            <div className="cashflow-chart-card rounded-2xl border border-black/10 dark:border-white/10 bg-white p-4 dark:bg-slate-950">
              <div className="text-sm font-semibold mb-3">مانده تجمعی نقدینگی در بازه انتخابی</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={cumulativeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="cumulative" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="cashflow-chart-card rounded-2xl border border-black/10 dark:border-white/10 bg-white p-4 dark:bg-slate-950">
              <div className="text-sm font-semibold mb-3">مانده تجمعی پیش‌بینی‌شده</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={forecastCumulativeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="forecastCumulative" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>


          <div className="cashflow-kpi-card rounded-2xl border border-black/10 dark:border-white/10 bg-white p-4 dark:bg-slate-950">
            <div className="text-sm font-semibold mb-3">پیش‌بینی (میانگین {forecastDays} روز اخیر)</div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
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
          </div>
        </>
      )}
    </PageKit>
  );
}
