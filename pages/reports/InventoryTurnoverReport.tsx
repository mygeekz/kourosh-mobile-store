// pages/reports/InventoryTurnoverReport.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';

type Data = {
  periodDays: number;
  cogs: number;
  avgInventoryValue: number;
  inventoryTurnover: number;
  daysOfInventory: number;
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const toJalali = (d: Date) => moment(d).locale('fa').format('jYYYY/jMM/jDD');

const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

const money = (n: number) => `${fmt(n)} تومان`;

const getTurnoverTone = (turnover: number) => {
  if (turnover >= 4) return { label: 'گردش عالی', icon: 'fa-arrow-trend-up', tone: 'success' };
  if (turnover >= 2) return { label: 'گردش قابل قبول', icon: 'fa-gauge-high', tone: 'primary' };
  if (turnover > 0) return { label: 'گردش کند', icon: 'fa-triangle-exclamation', tone: 'warning' };
  return { label: 'بدون گردش', icon: 'fa-circle-minus', tone: 'muted' };
};

export default function InventoryTurnoverReport() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState<Date>(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date>(() => new Date());

  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => `بازه: ${toJalali(fromDate)} تا ${toJalali(toDate)}`, [fromDate, toDate]);
  const turnoverTone = getTurnoverTone(data?.inventoryTurnover ?? 0);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const fromISO = toISODate(fromDate);
      const toISO = toISODate(toDate);

      const res = await apiFetch(
        `/api/reports/inventory-turnover?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}`
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
  }, [fromDate, toDate]);

  return (
    <PageKit
      title="گردش موجودی"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-rotate" />}
      className="report-merged-page inventory-turnover-executive-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? 'خطا در دریافت گزارش' : 'داده‌ای برای نمایش نیست'}
      emptyDescription={err ? err : 'بازه زمانی را تغییر بده و دوباره تلاش کن.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="inventory-turnover-filter-panel" dir="rtl">
          <div className="inventory-turnover-filter-presets">
            <ReportDatePresetChips
              fromDate={fromDate}
              toDate={toDate}
              onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
              compact
            />
          </div>

          <div className="inventory-turnover-filter-fields">
            <label className="inventory-turnover-date-field">
              <span>از تاریخ</span>
              <ShamsiDatePicker value={fromDate} onChange={(d: any) => d && setFromDate(d)} inputClassName="inventory-turnover-date-input" />
            </label>

            <label className="inventory-turnover-date-field">
              <span>تا تاریخ</span>
              <ShamsiDatePicker value={toDate} onChange={(d: any) => d && setToDate(d)} inputClassName="inventory-turnover-date-input" />
            </label>

            <button onClick={load} className="inventory-turnover-refresh-button" type="button" disabled={isLoading}>
              <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
              {isLoading ? 'در حال بروزرسانی' : 'بروزرسانی'}
            </button>
          </div>
        </div>
      }
    >
      {data && (
        <div className="inventory-turnover-layout">
          <section className="inventory-turnover-kpi-grid" aria-label="شاخص‌های گردش موجودی">
            <article className="inventory-turnover-kpi-card inventory-turnover-kpi-card--wide">
              <span className="inventory-turnover-kpi-card__icon"><i className="fa-solid fa-chart-line" /></span>
              <div className="inventory-turnover-kpi-card__content">
                <small>گردش موجودی</small>
                <strong>{fmt(data.inventoryTurnover, 2)}</strong>
                <p>نسبت هزینه کالای فروش‌رفته به میانگین ارزش موجودی در بازه انتخابی.</p>
              </div>
              <span className={`inventory-turnover-kpi-card__badge is-${turnoverTone.tone}`}>
                <i className={`fa-solid ${turnoverTone.icon}`} />
                {turnoverTone.label}
              </span>
            </article>

            <article className="inventory-turnover-kpi-card">
              <span className="inventory-turnover-kpi-card__icon"><i className="fa-solid fa-coins" /></span>
              <div className="inventory-turnover-kpi-card__content">
                <small>هزینه کالای فروش‌رفته</small>
                <strong>{money(data.cogs)}</strong>
                <p>COGS در بازه انتخابی</p>
              </div>
            </article>

            <article className="inventory-turnover-kpi-card">
              <span className="inventory-turnover-kpi-card__icon"><i className="fa-solid fa-boxes-stacked" /></span>
              <div className="inventory-turnover-kpi-card__content">
                <small>میانگین ارزش موجودی</small>
                <strong>{money(data.avgInventoryValue)}</strong>
                <p>میانگین سرمایه خوابیده در موجودی</p>
              </div>
            </article>

            <article className="inventory-turnover-kpi-card">
              <span className="inventory-turnover-kpi-card__icon"><i className="fa-solid fa-calendar-day" /></span>
              <div className="inventory-turnover-kpi-card__content">
                <small>روزهای موجودی</small>
                <strong>{fmt(data.daysOfInventory, 1)} روز</strong>
                <p>میانگین روزهایی که موجودی قبل از فروش در انبار می‌ماند.</p>
              </div>
            </article>
          </section>

          <section className="inventory-turnover-insight-grid" aria-label="تحلیل مدیریتی گردش موجودی">
            <article className="inventory-turnover-insight-card inventory-turnover-insight-card--formula">
              <div className="inventory-turnover-insight-card__head">
                <span><i className="fa-solid fa-calculator" /></span>
                <div>
                  <small>فرمول گزارش</small>
                  <h3>Inventory Turnover</h3>
                </div>
              </div>
              <div className="inventory-turnover-formula-compact">
                <span>گردش موجودی</span>
                <strong>=</strong>
                <span>COGS ÷ میانگین ارزش موجودی</span>
              </div>
              <p>
                <strong>COGS</strong> یعنی بهای تمام‌شده کالایی که در همین بازه فروخته شده؛ یعنی ارزش خرید/تمام‌شده کالاهایی که واقعاً از انبار خارج شده‌اند، نه مبلغ فروش آن‌ها.
              </p>
              <p className="inventory-turnover-muted-note">هرچه این عدد نسبت به میانگین موجودی بالاتر باشد، سرمایه سریع‌تر از انبار به فروش تبدیل شده است.</p>
            </article>

            <article className="inventory-turnover-insight-card">
              <div className="inventory-turnover-insight-card__head">
                <span><i className="fa-solid fa-lightbulb" /></span>
                <div>
                  <small>برداشت مدیریتی</small>
                  <h3>{turnoverTone.label}</h3>
                </div>
              </div>
              <p>
                اگر گردش موجودی پایین باشد، بخشی از سرمایه در کالاهای کم‌تحرک قفل شده است. اگر گردش خیلی بالا باشد، باید مراقب کمبود موجودی و از دست رفتن فروش باشید.
              </p>
              <div className="inventory-turnover-action-row">
                <button type="button" onClick={() => navigate('/reports/dead-stock')}>
                  <i className="fa-solid fa-box-archive" />
                  کالاهای راکد
                </button>
                <button type="button" onClick={() => navigate('/reports/abc')}>
                  <i className="fa-solid fa-layer-group" />
                  تحلیل ABC
                </button>
              </div>
            </article>
          </section>
        </div>
      )}
    </PageKit>
  );
}
