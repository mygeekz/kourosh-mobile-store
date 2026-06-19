import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import { Link, useLocation } from 'react-router-dom';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { exportToExcel } from '../../utils/exporters';
import { InstallmentCalendarItem, NotificationMessage } from '../../types';

const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const fmtMoney = (n: number | undefined | null) => (n ?? 0).toLocaleString('fa-IR') + ' تومان';

const statusPill = (status: string) => {
  const base = 'installments-calendar-status-pill';
  if (status === 'paid') return <span className={`${base} is-paid`}>پرداخت شده</span>;
  if (status === 'pending') return <span className={`${base} is-pending`}>در انتظار</span>;
  if (status === 'passed') return <span className={`${base} is-passed`}>سررسید گذشته</span>;
  if (status === 'cashed') return <span className={`${base} is-paid`}>وصول شده</span>;
  if (status === 'bounced') return <span className={`${base} is-passed`}>برگشت خورده</span>;
  return <span className={base}>{status}</span>;
};

const InstallmentsCalendarPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});

  const monthStart = useMemo(() => {
    const m = moment();
    const j = moment(`${m.locale('fa').format('jYYYY/jMM')}/01`, 'jYYYY/jMM/jDD');
    return j.toDate();
  }, []);

  const monthEnd = useMemo(() => {
    const m = moment().locale('fa');
    return m.clone().endOf('jMonth').toDate();
  }, []);

  const [fromDate, setFromDate] = useState<Date | null>(monthStart);
  const [toDate, setToDate] = useState<Date | null>(monthEnd);
  const [items, setItems] = useState<InstallmentCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'payment' | 'check'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'passed' | 'paid' | 'cashed' | 'bounced'>('all');

  const currentRange = useMemo(() => ({
    from: fromDate ? toShamsiStr(fromDate) : '',
    to: toDate ? toShamsiStr(toDate) : '',
  }), [fromDate, toDate]);

  const fetchData = useCallback(async () => {
    if (!token || !currentRange.from || !currentRange.to) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('from', currentRange.from);
      qs.set('to', currentRange.to);
      const res = await fetch(`/api/reports/installments-calendar?${qs.toString()}`, { headers: getAuthHeaders(token) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش');
      setItems((json.data?.items || []) as InstallmentCalendarItem[]);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش' });
    } finally {
      setIsLoading(false);
    }
  }, [currentRange.from, currentRange.to, token]);

  const refreshInstallmentsCalendar = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const parseShamsi = (s: string | null): Date | null => {
      if (!s) return null;
      const m = moment(s, 'jYYYY/jMM/jDD', true);
      return m.isValid() ? m.toDate() : null;
    };
    const parsedFrom = parseShamsi(params.get('from'));
    const parsedTo = parseShamsi(params.get('to'));
    if (parsedFrom) setFromDate(parsedFrom);
    if (parsedTo) setToDate(parsedTo);
  }, [location.search]);

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => { void refreshInstallmentsCalendar(); }, 220);
    return () => window.clearTimeout(t);
  }, [token, refreshInstallmentsCalendar]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      const matchesType = typeFilter === 'all' || it.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || it.status === statusFilter;
      const haystack = [it.customerFullName, it.customerPhoneNumber || '', it.dueDate, it.bankName || '', it.checkNumber || '', String(it.saleId), String(it.amount)].join(' ').toLowerCase();
      return matchesType && matchesStatus && (!q || haystack.includes(q));
    });
  }, [items, searchQuery, statusFilter, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, InstallmentCalendarItem[]>();
    filteredItems.forEach((it) => {
      const key = it.dueDate;
      map.set(key, [...(map.get(key) || []), it]);
    });
    const keys = Array.from(map.keys()).sort((a, b) => moment(a, 'jYYYY/jMM/jDD').valueOf() - moment(b, 'jYYYY/jMM/jDD').valueOf());
    return keys.map((date) => ({ date, items: map.get(date) || [] }));
  }, [filteredItems]);

  const exportExcel = () => {
    const rows = items.map((it) => ({
      dueDate: it.dueDate,
      type: it.type === 'payment' ? 'قسط' : 'چک',
      amount: it.amount,
      status: it.status,
      customer: it.customerFullName,
      phone: it.customerPhoneNumber ?? '',
      saleId: it.saleId,
      bank: it.bankName ?? '',
      checkNumber: it.checkNumber ?? '',
    }));
    exportToExcel(`installments-calendar-${new Date().toISOString().slice(0, 10)}.xlsx`, rows, [
      { header: 'تاریخ', key: 'dueDate' },
      { header: 'نوع', key: 'type' },
      { header: 'مبلغ', key: 'amount' },
      { header: 'وضعیت', key: 'status' },
      { header: 'مشتری', key: 'customer' },
      { header: 'تلفن', key: 'phone' },
      { header: 'کد فروش', key: 'saleId' },
      { header: 'بانک', key: 'bank' },
      { header: 'شماره چک', key: 'checkNumber' },
    ], 'Calendar');
  };

  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);

  const stats = useMemo(() => {
    const total = filteredItems.reduce((a, it) => a + (it.amount || 0), 0);
    const counts = {
      all: filteredItems.length,
      pending: filteredItems.filter((i) => i.status === 'pending').length,
      paid: filteredItems.filter((i) => i.status === 'paid').length,
      passed: filteredItems.filter((i) => i.status === 'passed').length,
      cashed: filteredItems.filter((i) => i.status === 'cashed').length,
      bounced: filteredItems.filter((i) => i.status === 'bounced').length,
    };
    return { total, counts };
  }, [filteredItems]);

  const metricCards = [
    { label: 'کل سررسیدها', value: stats.counts.all.toLocaleString('fa-IR'), hint: 'آیتم‌های فیلترشده', icon: 'fa-calendar-check', tone: 'blue' },
    { label: 'جمع مبلغ', value: fmtMoney(stats.total), hint: 'بر اساس بازه انتخابی', icon: 'fa-sack-dollar', tone: 'green' },
    { label: 'در انتظار', value: stats.counts.pending.toLocaleString('fa-IR'), hint: 'اقساط و چک‌های باز', icon: 'fa-hourglass-half', tone: 'amber' },
    { label: 'سررسید گذشته', value: stats.counts.passed.toLocaleString('fa-IR'), hint: 'نیازمند پیگیری فوری', icon: 'fa-triangle-exclamation', tone: 'red' },
  ];

  return (
    <div className="report-page installments-calendar-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="installments-calendar-filter-panel" aria-label="فیلترهای تقویم اقساط و چک‌ها">
        <div className="installments-calendar-filter-row">
          <div className="installments-calendar-presets-wrap">
            <ReportDatePresetChips fromDate={fromDate} toDate={toDate} onChange={({ from, to }) => { setFromDate(from); setToDate(to); }} compact includeLast30={false} className="installments-calendar-presets" />
          </div>
          <div className="installments-calendar-date-group">
            <label className="installments-calendar-date-box"><span>از تاریخ</span><ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} inputClassName="installments-calendar-date-input" /></label>
            <label className="installments-calendar-date-box"><span>تا تاریخ</span><ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} inputClassName="installments-calendar-date-input" /></label>
            <button onClick={() => void refreshInstallmentsCalendar()} className="installments-calendar-refresh" disabled={isLoading} type="button"><i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />{isLoading ? 'در حال دریافت' : 'به‌روزرسانی'}</button>
          </div>
        </div>
      </section>

      <section className="installments-calendar-summary-grid" aria-label="خلاصه تقویم اقساط و چک‌ها">
        {metricCards.map((card) => <article key={card.label} className={`installments-calendar-metric installments-calendar-metric--${card.tone}`}><span className="installments-calendar-metric__icon"><i className={`fa-solid ${card.icon}`} /></span><div><span>{card.label}</span><strong>{card.value}</strong><small>{card.hint}</small></div></article>)}
      </section>

      <section className="installments-calendar-toolbar" aria-label="جستجو و فیلتر تقویم">
        <div className="installments-calendar-search" dir="ltr" role="search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input dir="rtl" type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="جستجو بر اساس مشتری، موبایل، شماره چک یا سند…" aria-label="جستجوی تقویم اقساط و چک‌ها" /></div>
        <div className="installments-calendar-segments" aria-label="نوع آیتم"><button type="button" className={typeFilter === 'all' ? 'is-active' : ''} onClick={() => setTypeFilter('all')}>همه</button><button type="button" className={typeFilter === 'payment' ? 'is-active' : ''} onClick={() => setTypeFilter('payment')}>اقساط</button><button type="button" className={typeFilter === 'check' ? 'is-active' : ''} onClick={() => setTypeFilter('check')}>چک‌ها</button></div>
        <div className="installments-calendar-statusbar" aria-label="وضعیت آیتم‌ها"><button type="button" className={statusFilter === 'all' ? 'is-active' : ''} onClick={() => setStatusFilter('all')}>همه {stats.counts.all.toLocaleString('fa-IR')}</button><button type="button" className={statusFilter === 'pending' ? 'is-active' : ''} onClick={() => setStatusFilter('pending')}>در انتظار {stats.counts.pending.toLocaleString('fa-IR')}</button><button type="button" className={statusFilter === 'passed' ? 'is-active' : ''} onClick={() => setStatusFilter('passed')}>سررسید گذشته {stats.counts.passed.toLocaleString('fa-IR')}</button><button type="button" className={statusFilter === 'paid' ? 'is-active' : ''} onClick={() => setStatusFilter('paid')}>پرداخت شده {stats.counts.paid.toLocaleString('fa-IR')}</button><button type="button" className={statusFilter === 'cashed' ? 'is-active' : ''} onClick={() => setStatusFilter('cashed')}>وصول شده {stats.counts.cashed.toLocaleString('fa-IR')}</button><button type="button" className={statusFilter === 'bounced' ? 'is-active' : ''} onClick={() => setStatusFilter('bounced')}>برگشتی {stats.counts.bounced.toLocaleString('fa-IR')}</button></div>
      </section>

      {isLoading ? <div className="installments-calendar-empty-state">در حال دریافت…</div> : grouped.length === 0 ? <div className="installments-calendar-empty-state">آیتمی برای نمایش وجود ندارد.</div> : <div className="installments-calendar-groups">{grouped.map((g) => { const dateTotal = g.items.reduce((a, it) => a + (it.amount || 0), 0); return <section key={g.date} className="installments-calendar-day-group"><header className="installments-calendar-day-group__head"><div className="installments-calendar-day-title"><span className="installments-calendar-day-title__icon"><i className="fa-regular fa-clock" /></span><strong>{g.date}</strong><small>{g.items.length.toLocaleString('fa-IR')} آیتم</small></div><div className="installments-calendar-day-total">{fmtMoney(dateTotal)}</div></header><div className="installments-calendar-item-grid">{g.items.map((it) => <article key={`${it.type}-${it.id}`} className="installments-calendar-item-card"><div className="installments-calendar-item-card__main"><span className="installments-calendar-item-card__icon"><i className={it.type === 'payment' ? 'fa-solid fa-hand-holding-dollar' : 'fa-solid fa-money-check'} /></span><div className="installments-calendar-item-card__content"><div className="installments-calendar-item-card__title"><strong>{it.type === 'payment' ? 'قسط' : 'چک'} • {fmtMoney(it.amount)}</strong>{statusPill(it.status)}</div>{it.type === 'check' && (it.bankName || it.checkNumber) ? <small>{it.bankName ? `بانک: ${it.bankName}` : ''}{it.bankName && it.checkNumber ? ' • ' : ''}{it.checkNumber ? `چک: ${it.checkNumber}` : ''}</small> : null}<Link className="installments-calendar-customer-link" to={`/customers/${it.customerId}`}>{it.customerFullName}</Link>{it.customerPhoneNumber ? <small dir="ltr">{it.customerPhoneNumber}</small> : null}</div></div><Link className="installments-calendar-item-action" to={`/installment-sales/${it.saleId}`}><i className="fa-solid fa-arrow-up-from-bracket" />جزئیات</Link></article>)}</div></section>; })}</div>}
    </div>
  );
};

export default InstallmentsCalendarPage;
