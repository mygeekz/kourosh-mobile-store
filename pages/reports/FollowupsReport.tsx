import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Modal from '../../components/Modal';
import ModalActions from '../../components/ModalActions';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { exportToExcel } from '../../utils/exporters';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';

type Row = {
  id: number;
  customerId: number;
  createdAt: string;
  createdByUsername?: string | null;
  note: string;
  nextFollowupDate?: string | null;
  status: 'open' | 'closed';
  customerName?: string;
  customerPhone?: string;
};

const isoStartOfDay = (d: Date) => moment(d).startOf('day').toDate().toISOString();
const isoEndOfDay = (d: Date) => moment(d).endOf('day').toDate().toISOString();


const getRowTone = (r: { status: string; nextFollowupDate?: string | null }) => {
  if (r.status !== 'open') return '';
  if (!r.nextFollowupDate) return 'bg-slate-50/60 dark:bg-slate-900/30';
  const due = new Date(r.nextFollowupDate).getTime();
  const now = Date.now();
  if (Number.isFinite(due) && due < now) return 'bg-rose-50 dark:bg-rose-900/10';
  if (Number.isFinite(due) && due - now <= 24 * 60 * 60 * 1000) return 'bg-amber-50 dark:bg-amber-900/10';
  return '';
};

export default function FollowupsReport() {
  const { token, currentUser } = useAuth();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});

  const today = useMemo(() => new Date(), []);
  const weekEnd = useMemo(() => moment().add(7, 'day').toDate(), []);

  const [status, setStatus] = useState<'open'|'closed'|'all'>('open');
  const [dateField, setDateField] = useState<'next'|'created'>('next');
  const [fromDate, setFromDate] = useState<Date | null>(today);
  const [toDate, setToDate] = useState<Date | null>(weekEnd);
  const [owner, setOwner] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [noDueOnly, setNoDueOnly] = useState(false);


  const [newCustomerId, setNewCustomerId] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newNextDate, setNewNextDate] = useState<Date | null>(new Date());
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editNextDate, setEditNextDate] = useState<Date | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  
  
  
  
  const quickSetDue = async (row: Row, daysFromNow: number) => {
    if (!token) return;
    try {
      const next = moment().add(daysFromNow, 'day').endOf('day').toDate().toISOString();
      const res = await fetch(`/api/customers/${row.customerId}/followups/${row.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextFollowupDate: next }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر موعد');
      setNotification({ message: 'موعد پیگیری تغییر کرد.', type: 'success' });
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

const quickReschedule = async (row: Row, addDays: number) => {
    if (!token) return;
    try {
      const base = row.nextFollowupDate ? moment(row.nextFollowupDate) : moment();
      const next = base.add(addDays, 'day').endOf('day').toDate().toISOString();

      const res = await fetch(`/api/customers/${row.customerId}/followups/${row.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextFollowupDate: next }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر موعد');
      setNotification({ message: 'موعد پیگیری تغییر کرد.', type: 'success' });
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

const openEdit = (row: Row) => {
    setEditingRow(row);
    setEditNote(row.note || '');
    setEditNextDate(row.nextFollowupDate ? new Date(row.nextFollowupDate) : new Date());
  };

  const saveEdit = async () => {
    if (!token || !editingRow) return;
    const note = String(editNote || '').trim();
    if (!note) {
      setNotification({ message: 'متن پیگیری الزامی است.', type: 'error' });
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/customers/${editingRow.customerId}/followups/${editingRow.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          nextFollowupDate: editNextDate ? isoEndOfDay(editNextDate) : null,
        }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ویرایش اطلاعات پیگیری');
      setNotification({ message: 'پیگیری ویرایش اطلاعات شد.', type: 'success' });
      setEditingRow(null);
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally {
      setIsSavingEdit(false);
    }
  };

const closeFollowup = async (customerId: number, followupId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/followups/${followupId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در بستن پیگیری');
      setRows((prev) => (prev || []).map((r) => (r.id === followupId ? ({ ...r, status: 'closed' } as any) : r)));
      setNotification({ message: 'پیگیری بسته شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

  const createFollowup = async (customerId: number, note: string, nextFollowupIso?: string | null) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/followups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, nextFollowupDate: nextFollowupIso || null }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت اطلاعات پیگیری');
      setNotification({ message: 'پیگیری ثبت اطلاعات شد.', type: 'success' });
      // refresh list to include new item
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);

    try {
      const fromIso = fromDate ? isoStartOfDay(fromDate) : '';
      const toIso = toDate ? isoEndOfDay(toDate) : '';
      const qs = new URLSearchParams();
      qs.set('status', status);
      qs.set('dateField', dateField);
      if (noDueOnly) qs.set('noDue', '1');
      if (fromIso) qs.set('from', fromIso);
      if (toIso) qs.set('to', toIso);
      const effectiveOwner = onlyMine ? (currentUser?.username || '') : owner.trim();
      if (effectiveOwner) qs.set('owner', effectiveOwner);

      const res = await fetch(`/api/reports/followups?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش');
      setRows((js?.data || []) as Row[]);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (!token) return;
  const t = window.setTimeout(() => { fetchData(); }, 250);
  return () => window.clearTimeout(t);
}, [token, status, dateField, fromDate, toDate, owner, onlyMine, noDueOnly]);

  const exportExcel = () => {
    const out = rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName || '',
      customerPhone: r.customerPhone || '',
      status: r.status === 'open' ? 'باز' : 'بسته',
      nextFollowupDate: r.nextFollowupDate || '',
      createdAt: r.createdAt,
      createdBy: r.createdByUsername || '',
      note: r.note,
    }));

    exportToExcel(
      `followups-${new Date().toISOString().slice(0, 10)}.xlsx`,
      out,
      [
        { header: 'ID', key: 'id' },
        { header: 'شناسه مشتری', key: 'customerId' },
        { header: 'نام مشتری', key: 'customerName' },
        { header: 'تلفن', key: 'customerPhone' },
        { header: 'وضعیت', key: 'status' },
        { header: 'موعد پیگیری', key: 'nextFollowupDate' },
        { header: 'تاریخ ثبت اطلاعات', key: 'createdAt' },
        { header: 'ثبت اطلاعات کننده', key: 'createdBy' },
        { header: 'یادداشت', key: 'note' },
      ]
    );
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  const faNum = (value: number | string) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const normalizeText = (value: unknown) => String(value || '').toLowerCase().trim();
  const cleanFollowupNote = (value: unknown) => {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const withoutTokens = raw
      .replace(/\[?collection:[^\]\s|]+\]?/gi, '')
      .replace(/\[?action:[^\]\s|]+\]?/gi, '')
      .replace(/\s*\|\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!withoutTokens) return 'یادداشت سیستمی پیگیری';
    return withoutTokens;
  };
  const visibleRows = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return rows;
    return rows.filter((r) => [r.customerName, r.customerPhone, r.createdByUsername, cleanFollowupNote(r.note), r.status === 'open' ? 'باز' : 'بسته']
      .some((item) => normalizeText(item).includes(query)));
  }, [rows, searchQuery]);

  const openCount = visibleRows.filter((r) => r.status === 'open').length;
  const overdueCount = visibleRows.filter((r) => r.status === 'open' && r.nextFollowupDate && new Date(r.nextFollowupDate).getTime() < Date.now()).length;
  const todayCount = visibleRows.filter((r) => r.nextFollowupDate && moment(r.nextFollowupDate).isSame(moment(), 'day')).length;
  const noDueCount = visibleRows.filter((r) => r.status === 'open' && !r.nextFollowupDate).length;
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = visibleRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, pageSize, status, dateField, fromDate, toDate, owner, onlyMine, noDueOnly]);

  const statusLabel = (value: Row['status']) => value === 'open' ? 'باز' : 'بسته';
  const dueTone = (row: Row) => {
    if (row.status !== 'open') return 'followups-status followups-status--closed';
    if (!row.nextFollowupDate) return 'followups-status followups-status--neutral';
    const due = new Date(row.nextFollowupDate).getTime();
    if (Number.isFinite(due) && due < Date.now()) return 'followups-status followups-status--danger';
    if (Number.isFinite(due) && due - Date.now() <= 24 * 60 * 60 * 1000) return 'followups-status followups-status--warning';
    return 'followups-status followups-status--open';
  };

  const summaryCards = [
    { label: 'پیگیری‌های باز', value: openCount, hint: 'موارد در جریان', icon: 'fa-list-check', tone: 'blue' },
    { label: 'سررسید گذشته', value: overdueCount, hint: 'نیازمند اقدام فوری', icon: 'fa-triangle-exclamation', tone: 'rose' },
    { label: 'موعد امروز', value: todayCount, hint: 'پیگیری‌های امروز', icon: 'fa-calendar-day', tone: 'amber' },
    { label: 'بدون موعد', value: noDueCount, hint: 'موارد بدون زمان بعدی', icon: 'fa-circle-question', tone: 'slate' },
  ];

  return (
    <div className="followups-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="followups-panel followups-panel--header" aria-label="گزارش پیگیری‌ها">
        <div className="followups-metric-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className={`followups-metric-card followups-metric-card--${card.tone}`}>
              <span className="followups-metric-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <div>
                <span>{card.label}</span>
                <strong>{faNum(card.value)}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="followups-filter-row">
          <div className="followups-filter-group followups-filter-group--status" role="group" aria-label="وضعیت پیگیری">
            {([
              ['open', 'باز'],
              ['closed', 'بسته'],
              ['all', 'همه'],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>{label}</button>
            ))}
          </div>

          <div className="followups-filter-group followups-filter-group--date-field" role="group" aria-label="مبنای تاریخ">
            {([
              ['next', 'موعد پیگیری'],
              ['created', 'تاریخ ثبت'],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={dateField === value ? 'is-active' : ''} onClick={() => setDateField(value)}>{label}</button>
            ))}
          </div>

          <div className="followups-date-actions">
            <label className="followups-date-box">
              <span>از تاریخ</span>
              <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} inputClassName="followups-date-input" />
            </label>

            <label className="followups-date-box">
              <span>تا تاریخ</span>
              <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} inputClassName="followups-date-input" />
            </label>

            <button type="button" className="followups-refresh-button" onClick={fetchData} disabled={isLoading}>
              <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
              {isLoading ? 'در حال دریافت' : 'به‌روزرسانی'}
            </button>
          </div>
        </div>

        <div className="followups-filter-row followups-filter-row--secondary">
          <div className="followups-search-final" dir="ltr" role="search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              aria-label="جستجوی پیگیری‌ها"
              dir="rtl"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="جستجو بر اساس مشتری، موبایل، یادداشت یا ثبت‌کننده…"
            />
          </div>

          <div className="followups-page-size-final">
            <select aria-label="تعداد ردیف در صفحه" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              <option value={10}>۱۰</option>
              <option value={20}>۲۰</option>
              <option value={50}>۵۰</option>
            </select>
            <span>تعداد در صفحه</span>
          </div>

          <label className="followups-owner-field">
            <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="ثبت‌کننده اختیاری…" disabled={onlyMine} />
          </label>

          <label className="followups-toggle-chip">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            <span>فقط پیگیری‌های من</span>
          </label>

          <label className="followups-toggle-chip">
            <input type="checkbox" checked={noDueOnly} onChange={(e) => setNoDueOnly(e.target.checked)} />
            <span>فقط بدون موعد</span>
          </label>
        </div>
      </section>

      <section className="followups-panel followups-table-section" aria-label="لیست پیگیری‌ها">
        <div className="followups-table-header">
          <div className="followups-table-title">
            <span className="followups-table-title__icon"><i className="fa-solid fa-phone-volume" /></span>
            <div>
              <h2>لیست پیگیری‌ها</h2>
              <p>{faNum(visibleRows.length)} ردیف فیلترشده · {faNum(openCount)} باز · {faNum(overdueCount)} سررسید گذشته</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="followups-empty-state">در حال دریافت داده‌ها…</div>
        ) : pageRows.length === 0 ? (
          <div className="followups-empty-state">داده‌ای برای نمایش وجود ندارد.</div>
        ) : (
          <div className="followups-table-shell">
            <table className="followups-table">
              <colgroup>
                <col className="followups-col-due" />
                <col className="followups-col-customer" />
                <col className="followups-col-status" />
                <col className="followups-col-owner" />
                <col className="followups-col-note" />
                <col className="followups-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>موعد</th>
                  <th>مشتری</th>
                  <th>وضعیت</th>
                  <th>ثبت‌کننده</th>
                  <th>یادداشت</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.nextFollowupDate ? moment(r.nextFollowupDate).locale('fa').format('jYYYY/jMM/jDD') : 'بدون موعد'}</strong>
                      <small>{r.nextFollowupDate ? moment(r.nextFollowupDate).locale('fa').format('HH:mm') : 'زمان بعدی ثبت نشده'}</small>
                    </td>
                    <td>
                      <a className="followups-customer-link" href={`#/customers/${r.customerId}`}>
                        <span>{(r.customerName || `مشتری #${r.customerId}`).slice(0, 1)}</span>
                        <div>
                          <strong>{r.customerName || `مشتری #${r.customerId}`}</strong>
                          {r.customerPhone ? <small>{r.customerPhone}</small> : null}
                        </div>
                      </a>
                    </td>
                    <td><span className={dueTone(r)}>{statusLabel(r.status)}</span></td>
                    <td>
                      <strong>{r.createdByUsername || '—'}</strong>
                      <small>{r.createdAt ? moment(r.createdAt).locale('fa').format('jYYYY/jMM/jDD') : ''}</small>
                    </td>
                    <td><p className="followups-note">{cleanFollowupNote(r.note)}</p></td>
                    <td>
                      <div className="followups-row-actions">
                        <button type="button" className="followups-row-action followups-row-action--edit" onClick={() => openEdit(r)}><i className="fa-solid fa-pen-to-square" /><span>ویرایش</span></button>
                        {r.status === 'open' ? <button type="button" className="followups-row-action followups-row-action--success" onClick={() => closeFollowup(r.customerId, r.id)}><i className="fa-solid fa-check-circle" /><span>بستن</span></button> : null}
                        <a className="followups-row-action followups-row-action--customer" href={`#/customers/${r.customerId}`}><i className="fa-solid fa-user-clock" /><span>پرونده مشتری</span></a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="followups-pagination">
          <span>صفحه {faNum(safePage)} از {faNum(totalPages)}</span>
          <div>
            <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>قبلی</button>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>بعدی</button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="ثبت پیگیری جدید"
        variant="operational"
        size="md"
        layout="vertical"
        tone="info"
        iconClass="fa-solid fa-user-clock"
        kicker="مرکز پیگیری وصول"
        ariaDescription="ثبت پیگیری جدید برای مشتری انتخاب‌شده."
        wrapperClassName="followups-modal-overlay"
        bodyClassName="followups-modal-body"
      >
        <div className="space-y-3">
          <input className="followups-modal-input" value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)} placeholder="شناسه مشتری" />
          <textarea className="followups-modal-input min-h-[96px]" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="متن پیگیری" />
          <ShamsiDatePicker selectedDate={newNextDate} onDateChange={setNewNextDate} inputClassName="followups-modal-input" />
        </div>
        <ModalActions
          onCancel={() => setShowCreate(false)}
          cancelText="انصراف"
          submitText="ثبت پیگیری"
          submitType="button"
          isSubmitting={isCreating}
          submitDisabled={isCreating}
          submitIconClass="fa-solid fa-check"
          onSubmitClick={async () => {
            const cid = Number(newCustomerId);
            if (!cid || !newNote.trim()) { setNotification({ message: 'شناسه مشتری و متن پیگیری الزامی است.', type: 'error' }); return; }
            setIsCreating(true);
            await createFollowup(cid, newNote.trim(), newNextDate ? isoEndOfDay(newNextDate) : null);
            setIsCreating(false);
            setShowCreate(false);
          }}
        />
      </Modal>

      <Modal
        isOpen={Boolean(editingRow)}
        onClose={() => setEditingRow(null)}
        title="ویرایش پیگیری"
        variant="operational"
        size="md"
        layout="vertical"
        tone="info"
        iconClass="fa-solid fa-pen-to-square"
        kicker="مرکز پیگیری وصول"
        ariaDescription="ویرایش متن و موعد پیگیری مشتری."
        wrapperClassName="followups-modal-overlay"
        bodyClassName="followups-modal-body"
      >
        <div className="space-y-3">
          <textarea className="followups-modal-input min-h-[120px]" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          <ShamsiDatePicker selectedDate={editNextDate} onDateChange={setEditNextDate} inputClassName="followups-modal-input" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="followups-modal-secondary" onClick={() => editingRow && quickSetDue(editingRow, 0)}>امروز</button>
            <button type="button" className="followups-modal-secondary" onClick={() => editingRow && quickReschedule(editingRow, 1)}>فردا</button>
            <button type="button" className="followups-modal-secondary" onClick={() => editingRow && quickReschedule(editingRow, 7)}>یک هفته بعد</button>
          </div>
        </div>
        <ModalActions
          onCancel={() => setEditingRow(null)}
          cancelText="انصراف"
          submitText="ذخیره تغییرات"
          submitType="button"
          isSubmitting={isSavingEdit}
          submitDisabled={isSavingEdit}
          submitIconClass="fa-solid fa-check"
          onSubmitClick={saveEdit}
        />
      </Modal>
    </div>
  );
}
