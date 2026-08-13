import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';
import moment from 'jalali-moment';
import ModernReportShell from '../../components/reports/ModernReportShell';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Button from '../../components/Button';
import AppSearchField from '../../components/ui/AppSearchField';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { apiFetch } from '../../utils/apiFetch';
import { formatReportMoneyText } from '../../utils/reportPresentation';
import { formatExactNumberText } from '../../utils/exactNumber';

type RiskStatus = 'no-safe-limit' | 'over-limit' | 'low-trust' | 'within-current-limit' | 'insufficient-data';

type ApprovalRow = {
  id: number;
  customerId: number;
  customerName: string;
  grandTotal: number;
  subtotal: number;
  discount: number;
  transactionDate: string;
  suggestedCreditLimit: number | null;
  remainingSuggestedCredit: number | null;
  customerTrustScore: number | null;
  customerTrustTier: string | null;
  currentExposure: number | null;
  projectedExposure: number | null;
  overLimitAmount: number | null;
  riskStatus: RiskStatus;
};

type ApprovalMeta = {
  totalCount: number;
  rawTotalCount: number;
  riskyOnly: boolean;
  totalAmount: number;
  overLimitCount: number;
  noLimitCount: number;
  insufficientTrustCount: number;
  averageTrustScore: number | null;
};

type ReportPayload = {
  success: boolean;
  generatedAt: string;
  dataSource: string;
  sourceTables: string[];
  data: ApprovalRow[];
  meta: ApprovalMeta;
  message?: string;
};

const emptyMeta: ApprovalMeta = {
  totalCount: 0,
  rawTotalCount: 0,
  riskyOnly: false,
  totalAmount: 0,
  overLimitCount: 0,
  noLimitCount: 0,
  insufficientTrustCount: 0,
  averageTrustScore: null,
};

const startOfCurrentJalaliMonth = () => moment().startOf('jMonth').startOf('day').toDate();
const toIsoDate = (value: Date) => moment(value).locale('en').format('YYYY-MM-DD');
const shamsi = (value: string | Date | null | undefined) => value ? moment(value).locale('fa').format('jYYYY/jMM/jDD') : '—';
const money = (value: number | null | undefined) => value == null ? '—' : formatReportMoneyText(value);
const numberFa = (value: number | null | undefined) => value == null ? '—' : formatExactNumberText(value);

const riskMeta: Record<RiskStatus, { label: string; icon: string; tone: string }> = {
  'no-safe-limit': { label: 'بدون سقف امن', icon: 'fa-shield-circle-exclamation', tone: 'warning' },
  'over-limit': { label: 'بالاتر از سقف فعلی', icon: 'fa-arrow-trend-up', tone: 'danger' },
  'low-trust': { label: 'اعتماد نیازمند بررسی', icon: 'fa-user-shield', tone: 'warning' },
  'within-current-limit': { label: 'در محدوده فعلی', icon: 'fa-circle-check', tone: 'success' },
  'insufficient-data': { label: 'اطلاعات اعتباری ناکافی', icon: 'fa-circle-info', tone: 'neutral' },
};

const ManagerCreditApprovalsReport: React.FC = () => {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [meta, setMeta] = useState<ApprovalMeta>(emptyMeta);
  const [fromDate, setFromDate] = useState<Date>(() => startOfCurrentJalaliMonth());
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const reportUiState = useMemo(() => ({
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    riskyOnly,
    search,
  }), [fromDate, riskyOnly, search, toDate]);

  const restoreReportUiState = useCallback((state: Record<string, unknown>) => {
    if (state.fromDate) setFromDate(new Date(String(state.fromDate)));
    if (state.toDate) setToDate(new Date(String(state.toDate)));
    setRiskyOnly(Boolean(state.riskyOnly));
    setSearch(String(state.search || ''));
  }, []);

  const { onDrilldownClick } = useReportDrilldownNavigation({
    reportKey: 'manager-credit-approvals',
    uiState: reportUiState,
    restoreUiState: restoreReportUiState,
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        from: toIsoDate(fromDate),
        to: toIsoDate(toDate),
        ...(riskyOnly ? { riskyOnly: '1' } : {}),
      });
      const response = await apiFetch(`/api/reports/manager-credit-approvals?${query.toString()}`, { signal });
      const payload = await response.json() as ReportPayload;
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'دریافت کنترل اعتبار مدیریتی ناموفق بود.');
      if (payload.dataSource !== 'sqlite-business-records') throw new Error('منبع داده گزارش قابل تأیید نیست.');
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setMeta({ ...emptyMeta, ...(payload.meta || {}) });
      setGeneratedAt(payload.generatedAt || null);
    } catch (requestError: any) {
      if (requestError?.name === 'AbortError') return;
      setRows([]);
      setMeta(emptyMeta);
      setGeneratedAt(null);
      setError(requestError?.message || 'خطا در دریافت اطلاعات کنترل اعتبار مدیریتی.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [fromDate, toDate, riskyOnly]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fa');
    if (!needle) return rows;
    return rows.filter((row) => [row.id, row.customerName, row.customerId, row.transactionDate, row.customerTrustTier]
      .some((value) => String(value ?? '').toLocaleLowerCase('fa').includes(needle)));
  }, [rows, search]);

  const generatedAtLabel = generatedAt
    ? new Date(generatedAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <ModernReportShell
      title="کنترل اعتبار مدیریتی"
      subtitle="ردیابی فروش‌های اعتباری ثبت‌شده با تأیید مدیر و کنترل وضعیت فعلی اعتبار مشتری"
      icon={<i className="fa-solid fa-user-shield" />}
    >
      <div className="manager-credit-report" data-report-source="sqlite-business-records">
        <section className="manager-credit-source" aria-label="وضعیت منبع گزارش">
          <div className="manager-credit-source__identity">
            <span className="manager-credit-source__icon"><i className="fa-solid fa-database" /></span>
            <div>
              <strong>متصل به اسناد واقعی فروشگاه</strong>
              <span>فروش، مشتری و وضعیت اعتبار مستقیماً از پایگاه داده خوانده می‌شود.</span>
            </div>
          </div>
          <div className="manager-credit-source__meta">
            <span><i className="fa-regular fa-clock" /> آخرین دریافت: {generatedAtLabel}</span>
            <span><i className="fa-solid fa-shield-halved" /> فقط فروش‌های دارای ثبت تأیید مدیر</span>
          </div>
        </section>

        <section className="manager-credit-controls" aria-label="فیلترهای کنترل اعتبار">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            includeLast30
            className="manager-credit-presets"
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
          />
          <label className="manager-credit-field">
            <span><i className="fa-regular fa-calendar" /> از تاریخ</span>
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={(date) => date && setFromDate(date)} hideIcon className="manager-credit-date" />
          </label>
          <label className="manager-credit-field">
            <span><i className="fa-regular fa-calendar-check" /> تا تاریخ</span>
            <ShamsiDatePicker selectedDate={toDate} onDateChange={(date) => date && setToDate(date)} hideIcon className="manager-credit-date" />
          </label>
          <div className="manager-credit-search">
            <span className="manager-credit-field-label"><i className="fa-solid fa-magnifying-glass" /> جستجو</span>
            <AppSearchField value={search} onChange={setSearch} placeholder="نام مشتری یا شماره فاکتور…" ariaLabel="جستجو در کنترل اعتبار" clearable className="manager-credit-search-control" />
          </div>
          <Button
            variant="neutral"
            size="sm"
            autoIcon={false}
            leftIcon={<i className="fa-solid fa-filter-circle-dollar" />}
            data-skip-global-button="true"
            aria-pressed={riskyOnly}
            className={`manager-credit-risk-toggle ${riskyOnly ? 'is-active' : ''}`}
            onClick={() => setRiskyOnly((current) => !current)}
          >
            <span>{riskyOnly ? 'فقط نیازمند بررسی' : 'همه تأییدها'}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            autoIcon={false}
            leftIcon={<i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />}
            data-skip-global-button="true"
            className="manager-credit-refresh"
            onClick={() => void load()}
            disabled={loading}
          >
            <span>بازخوانی</span>
          </Button>
        </section>

        {error ? (
          <section className="manager-credit-error" role="alert">
            <div><i className="fa-solid fa-triangle-exclamation" /><span><strong>دریافت گزارش انجام نشد</strong><small>{error}</small></span></div>
            <button type="button" data-skip-global-button="true" onClick={() => void load()}>تلاش دوباره</button>
          </section>
        ) : null}

        {loading ? (
          <div className="manager-credit-loading">
            <div className="manager-credit-loading__kpis">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="manager-credit-loading__kpi" rounded="xl" />)}</div>
            <Skeleton className="manager-credit-loading__table" rounded="xl" />
          </div>
        ) : !error ? (
          <>
            <section className="manager-credit-kpis" aria-label="خلاصه کنترل اعتبار">
              <article className="manager-credit-kpi manager-credit-kpi--primary"><span><i className="fa-solid fa-stamp" /></span><div><small>تأییدهای ثبت‌شده</small><strong>{numberFa(meta.totalCount)}</strong><p>{riskyOnly ? `از ${numberFa(meta.rawTotalCount)} تأیید` : 'در بازه انتخابی'}</p></div></article>
              <article className="manager-credit-kpi manager-credit-kpi--money"><span><i className="fa-solid fa-wallet" /></span><div><small>ارزش فروش‌های تأییدشده</small><strong>{money(meta.totalAmount)}</strong><p>جمع مبلغ فاکتورهای نمایش‌داده‌شده</p></div></article>
              <article className="manager-credit-kpi manager-credit-kpi--warning"><span><i className="fa-solid fa-arrow-trend-up" /></span><div><small>بالاتر از سقف فعلی</small><strong>{numberFa(meta.overLimitCount)}</strong><p>{numberFa(meta.noLimitCount)} مشتری بدون سقف امن</p></div></article>
              <article className="manager-credit-kpi manager-credit-kpi--trust"><span><i className="fa-solid fa-gauge-high" /></span><div><small>میانگین اعتماد فعلی</small><strong>{meta.averageTrustScore == null ? '—' : `${numberFa(meta.averageTrustScore)}٪`}</strong><p>{meta.insufficientTrustCount ? `${numberFa(meta.insufficientTrustCount)} پرونده با داده ناکافی` : 'بر پایه پرونده‌های دارای امتیاز'}</p></div></article>
            </section>

            <section className="manager-credit-table-shell">
              <header className="manager-credit-table-head">
                <div><h2>سوابق تأیید اعتبار</h2><p>وضعیت اعتبار، وضعیت فعلی مشتری است و به‌عنوان وضعیت زمان ثبت فروش نمایش داده نمی‌شود.</p></div>
                <span>{numberFa(filteredRows.length)} نتیجه</span>
              </header>

              {filteredRows.length === 0 ? (
                <EmptyState
                  title={rows.length ? 'نتیجه‌ای مطابق جستجو پیدا نشد' : 'در این بازه تأیید مدیریتی ثبت نشده است'}
                  description={rows.length ? 'عبارت جستجو را تغییر دهید.' : 'بازه زمانی را گسترده‌تر کنید؛ این گزارش فقط فروش‌هایی را نشان می‌دهد که ثبت تأیید مدیر دارند.'}
                  tone={rows.length ? 'info' : 'success'}
                  className="manager-credit-empty"
                />
              ) : (
                <div className="manager-credit-table-scroll">
                  <table className="manager-credit-table">
                    <thead><tr><th>فاکتور و تاریخ</th><th>مشتری</th><th>مبلغ فروش</th><th>سقف اعتبار فعلی</th><th>تعهد فعلی</th><th>اعتماد مشتری</th><th>وضعیت</th><th>دسترسی</th></tr></thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        const status = riskMeta[row.riskStatus] || riskMeta['insufficient-data'];
                        return (
                          <tr key={row.id} data-navigation-anchor={reportNavigationAnchor('manager-credit-approvals', row.id)}>
                            <td data-label="فاکتور و تاریخ"><strong>فاکتور {numberFa(row.id)}</strong><small>{shamsi(row.transactionDate)}</small></td>
                            <td data-label="مشتری"><strong>{row.customerName || 'مشتری ثبت‌نشده'}</strong><small>شناسه {numberFa(row.customerId)}</small></td>
                            <td data-label="مبلغ فروش"><strong>{money(row.grandTotal)}</strong>{row.discount > 0 ? <small>تخفیف: {money(row.discount)}</small> : <small>بدون تخفیف</small>}</td>
                            <td data-label="سقف اعتبار فعلی"><strong>{money(row.suggestedCreditLimit)}</strong><small>{row.remainingSuggestedCredit == null ? 'مانده قابل محاسبه نیست' : `مانده پیشنهادی: ${money(row.remainingSuggestedCredit)}`}</small></td>
                            <td data-label="تعهد فعلی"><strong>{money(row.currentExposure)}</strong>{Number(row.overLimitAmount || 0) > 0 ? <small className="is-danger">مازاد: {money(row.overLimitAmount)}</small> : <small>مانده جاری حساب</small>}</td>
                            <td data-label="اعتماد مشتری"><strong>{row.customerTrustScore == null ? '—' : `${numberFa(row.customerTrustScore)}٪`}</strong><small>{row.customerTrustTier || 'اطلاعات ناکافی'}</small></td>
                            <td data-label="وضعیت"><span className={`manager-credit-status manager-credit-status--${status.tone}`}><i className={`fa-solid ${status.icon}`} />{status.label}</span></td>
                            <td data-label="دسترسی"><div className="manager-credit-row-actions"><Link to={`/invoices/${row.id}`} onClick={(event) => onDrilldownClick(event, `/invoices/${row.id}`, { contextLabel: `${row.customerName || 'مشتری'} • فاکتور ${numberFa(row.id)}` })}><i className="fa-regular fa-file-lines" />فاکتور</Link>{row.customerId ? <Link to={`/customers/${row.customerId}`} onClick={(event) => onDrilldownClick(event, `/customers/${row.customerId}`, { contextLabel: `${row.customerName || 'مشتری'} • کنترل اعتبار` })}><i className="fa-regular fa-user" />پرونده</Link> : null}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </ModernReportShell>
  );
};

export default ManagerCreditApprovalsReport;
