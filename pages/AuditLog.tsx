import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuditLogEntry, NotificationMessage } from '../types';
import { apiFetch } from '../utils/apiFetch';
import Notification from '../components/Notification';
import { useAuth } from '../contexts/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import { Button } from '../components/Button';
import TextField from '../components/ui/TextField';
import { DataTableShell, SelectField, TableActionGroup } from '@/components/ui';
import DialogShell from '../components/ui/DialogShell';

type AuditStats = {
  total: number;
  created: number;
  updated: number;
  deleted: number;
  actors: number;
  latestAt: string | null;
};

type AuditOption = { value: string; count: number };
type AuditMeta = {
  pagination: { limit: number; offset: number; total: number };
  stats: AuditStats;
  options: { actions: AuditOption[]; entities: AuditOption[]; roles: AuditOption[] };
  generatedAt: string;
};

const PAGE_SIZE = 25;
const EMPTY_STATS: AuditStats = { total: 0, created: 0, updated: 0, deleted: 0, actors: 0, latestAt: null };
const EMPTY_META: AuditMeta = {
  pagination: { limit: PAGE_SIZE, offset: 0, total: 0 },
  stats: EMPTY_STATS,
  options: { actions: [], entities: [], roles: [] },
  generatedAt: '',
};

const actionLabels: Record<string, string> = {
  create: 'ایجاد',
  update: 'ویرایش',
  delete: 'حذف',
  login: 'ورود',
  logout: 'خروج',
  approve: 'تأیید',
  reject: 'رد',
};

const entityLabels: Record<string, string> = {
  sales_order: 'فاکتور فروش',
  sales_return: 'مرجوعی فروش',
  product: 'کالا',
  phone: 'گوشی',
  installment_sale: 'فروش اقساطی',
  repair: 'تعمیر',
  customer: 'مشتری',
  partner: 'همکار',
  expense: 'هزینه',
  user: 'کاربر',
  settings: 'تنظیمات',
};

const actionMeta = (action?: string | null) => {
  const value = String(action || '').trim().toLowerCase();
  if (value === 'create') return { label: 'ایجاد', icon: 'fa-plus', tone: 'success' };
  if (value === 'update') return { label: 'ویرایش', icon: 'fa-pen', tone: 'info' };
  if (value === 'delete') return { label: 'حذف', icon: 'fa-trash-can', tone: 'danger' };
  if (value === 'login') return { label: 'ورود', icon: 'fa-right-to-bracket', tone: 'neutral' };
  return { label: actionLabels[value] || action || 'نامشخص', icon: 'fa-bolt', tone: 'neutral' };
};

const entityLabel = (value?: string | null) => entityLabels[String(value || '').trim()] || value || 'بدون موجودیت';

const parseServerDate = (value?: string | null) => {
  if (!value) return null;
  let normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) normalized = normalized.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) normalized += 'Z';
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value?: string | null) => {
  const date = parseServerDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDate = (value?: string | null) => {
  const date = parseServerDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
};

const toIsoDate = (value: Date | null, endOfDay = false) => {
  if (!value || Number.isNaN(value.getTime())) return '';
  const date = new Date(value);
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.toISOString();
};

const truncate = (value?: string | null, max = 95) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text || 'بدون توضیحات';
};

const parseDescription = (description?: string | null): Array<{ label: string; value: string }> => {
  const raw = String(description || '').trim();
  if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) return [];
  try {
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed) ? Object.fromEntries(parsed.map((item, index) => [String(index + 1), item])) : parsed;
    if (!source || typeof source !== 'object') return [];
    return Object.entries(source).slice(0, 30).map(([label, value]) => ({
      label,
      value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    }));
  } catch {
    return [];
  }
};

const AuditLogPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<AuditMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [action, setAction] = useState('ALL');
  const [entityType, setEntityType] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (currentUser && !['Admin', 'Manager'].includes(currentUser.roleName)) {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به گزارش لاگ عملیات را ندارید.' });
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, action, entityType, role, fromDate, toDate]);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        q: debouncedSearch,
        action,
        entityType,
        role,
      });
      const from = toIsoDate(fromDate);
      const to = toIsoDate(toDate, true);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const response = await apiFetch(`/api/audit-log?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'دریافت لاگ عملیات ناموفق بود.');
      setLogs(Array.isArray(payload.data) ? payload.data : []);
      setMeta(payload.meta || EMPTY_META);
    } catch (error: any) {
      setLogs([]);
      setNotification({ type: 'error', text: error?.message || 'خطا در دریافت گزارش لاگ عملیات.' });
    } finally {
      setIsLoading(false);
    }
  }, [action, debouncedSearch, entityType, fromDate, page, role, toDate]);

  useEffect(() => { void loadLogs(); }, [loadLogs]);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setAction('ALL');
    setEntityType('ALL');
    setRole('ALL');
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(meta.pagination.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = meta.pagination.total ? meta.pagination.offset + 1 : 0;
  const rangeEnd = Math.min(meta.pagination.offset + logs.length, meta.pagination.total);
  const pages = useMemo(() => {
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [safePage, totalPages]);

  const selectedDescriptionFields = useMemo(() => parseDescription(selectedLog?.description), [selectedLog]);
  const hasFilters = Boolean(debouncedSearch || action !== 'ALL' || entityType !== 'ALL' || role !== 'ALL' || fromDate || toDate);

  const statCards = [
    { key: 'total', label: 'کل رویدادها', value: meta.stats.total, icon: 'fa-list-check', tone: 'neutral' },
    { key: 'created', label: 'ایجاد', value: meta.stats.created, icon: 'fa-plus', tone: 'success' },
    { key: 'updated', label: 'ویرایش', value: meta.stats.updated, icon: 'fa-pen', tone: 'info' },
    { key: 'deleted', label: 'حذف', value: meta.stats.deleted, icon: 'fa-trash-can', tone: 'danger' },
    { key: 'actors', label: 'عامل ثبت‌کننده', value: meta.stats.actors, icon: 'fa-users', tone: 'neutral' },
  ];

  return (
    <main className="audit-operations-v2" dir="rtl" data-ui-audit-operations="true">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="audit-operations-v2__hero">
        <div className="audit-operations-v2__brand">
          <span><i className="fa-solid fa-shield-halved" /></span>
          <div>
            <small><i className="fa-solid fa-clock-rotate-left" /> گزارش نظارت عملیاتی</small>
            <h1>گزارش لاگ عملیات</h1>
            <p>تاریخچه واقعی ایجاد، ویرایش و حذف داده‌ها بر اساس ثبت‌های موجود در پایگاه داده فروشگاه.</p>
          </div>
        </div>

        <div className="audit-operations-v2__hero-actions">
          <div className="audit-operations-v2__source">
            <span><i className="fa-solid fa-database" /> منبع: audit_logs</span>
            <span><i className="fa-regular fa-clock" /> بروزرسانی: {formatDateTime(meta.generatedAt)}</span>
          </div>
          <Button size="xs" variant="secondary" onClick={() => void loadLogs()} disabled={isLoading} leftIcon={<i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} />}>
            بروزرسانی
          </Button>
        </div>
      </section>

      <section className="audit-operations-v2__stats" aria-label="خلاصه گزارش لاگ">
        {statCards.map((item) => (
          <article key={item.key} data-tone={item.tone}>
            <span><i className={`fa-solid ${item.icon}`} /></span>
            <strong>{item.value.toLocaleString('fa-IR')}</strong>
            <small>{item.label}</small>
          </article>
        ))}
      </section>

      <section className="audit-operations-v2__filters" aria-label="فیلترهای گزارش">
        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجو در کاربر، عملیات، موجودیت، شناسه یا توضیحات"
          icon={<i className="fa-solid fa-magnifying-glass" />}
          wrapperClassName="audit-operations-v2__search audit-search-field"
        />

        <SelectField value={action} onChange={(event) => setAction(event.target.value)} aria-label="نوع عملیات" wrapperClassName="audit-filter-field">
          <option value="ALL">همه عملیات‌ها</option>
          {meta.options.actions.map((item) => <option key={item.value} value={item.value}>{actionLabels[item.value] || item.value} ({item.count.toLocaleString('fa-IR')})</option>)}
        </SelectField>

        <SelectField value={entityType} onChange={(event) => setEntityType(event.target.value)} aria-label="نوع موجودیت" wrapperClassName="audit-filter-field">
          <option value="ALL">همه موجودیت‌ها</option>
          {meta.options.entities.map((item) => <option key={item.value} value={item.value}>{entityLabel(item.value)} ({item.count.toLocaleString('fa-IR')})</option>)}
        </SelectField>

        <SelectField value={role} onChange={(event) => setRole(event.target.value)} aria-label="نقش کاربر" wrapperClassName="audit-filter-field">
          <option value="ALL">همه نقش‌ها</option>
          {meta.options.roles.map((item) => <option key={item.value} value={item.value}>{item.value} ({item.count.toLocaleString('fa-IR')})</option>)}
        </SelectField>

        <div className="audit-operations-v2__date"><ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} preview="تاریخ شروع" size="dense" /></div>
        <div className="audit-operations-v2__date"><ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} preview="تاریخ پایان" size="dense" /></div>

        <Button size="xs" variant="secondary" onClick={clearFilters} disabled={!hasFilters} leftIcon={<i className="fa-solid fa-filter-circle-xmark" />}>
          پاکسازی
        </Button>
      </section>

      <section className="audit-operations-v2__table-card">
        <header>
          <div>
            <h2>رویدادهای ثبت‌شده</h2>
            <p>نمایش {rangeStart.toLocaleString('fa-IR')} تا {rangeEnd.toLocaleString('fa-IR')} از {meta.pagination.total.toLocaleString('fa-IR')} رکورد</p>
          </div>
          <span><i className="fa-solid fa-clock" /> آخرین رویداد: {formatDateTime(meta.stats.latestAt)}</span>
        </header>

        {isLoading ? (
          <div className="audit-operations-v2__skeleton">
            {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-11" rounded="lg" />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={hasFilters ? 'fa-solid fa-magnifying-glass' : 'fa-regular fa-folder-open'}
            title={hasFilters ? 'رکوردی مطابق فیلترها پیدا نشد' : 'لاگ عملیاتی ثبت نشده است'}
            description={hasFilters ? 'فیلترها را تغییر دهید یا پاک کنید.' : 'پس از انجام عملیات ثبت‌شونده، رویدادها در این بخش نمایش داده می‌شوند.'}
          />
        ) : (
          <DataTableShell className="audit-operations-v2__table-shell" data-ui-audit-log-table="true">
            <table className="audit-operations-v2__table">
              <colgroup><col className="audit-col-index" /><col className="audit-col-time" /><col className="audit-col-user" /><col className="audit-col-action" /><col className="audit-col-entity" /><col /><col className="audit-col-actions" /></colgroup>
              <thead><tr><th>ردیف</th><th>زمان</th><th>کاربر</th><th>عملیات</th><th>موجودیت</th><th>توضیحات</th><th>جزئیات</th></tr></thead>
              <tbody>
                {logs.map((entry, index) => {
                  const actionInfo = actionMeta(entry.action);
                  return (
                    <tr key={entry.id}>
                      <td data-label="ردیف" className="audit-cell-index">{(meta.pagination.offset + index + 1).toLocaleString('fa-IR')}</td>
                      <td data-label="زمان"><time>{formatDateTime(entry.createdAt)}</time></td>
                      <td data-label="کاربر"><div className="audit-user-cell"><strong>{entry.username || 'سیستم'}</strong><small>{entry.role || 'بدون نقش'}</small></div></td>
                      <td data-label="عملیات"><span className={`audit-action-chip is-${actionInfo.tone}`}><i className={`fa-solid ${actionInfo.icon}`} />{actionInfo.label}</span></td>
                      <td data-label="موجودیت"><div className="audit-entity-cell"><strong>{entityLabel(entry.entityType)}</strong><small>{entry.entityId != null ? `#${entry.entityId.toLocaleString('fa-IR')}` : 'بدون شناسه'}</small></div></td>
                      <td data-label="توضیحات"><p className="audit-description-cell">{truncate(entry.description)}</p></td>
                      <td data-label="جزئیات" className="audit-detail-cell">
                        <TableActionGroup
                          ariaLabel={`عملیات رویداد ${entry.id.toLocaleString('fa-IR')}`}
                          collapseBelow="sm"
                          actions={[
                            {
                              key: 'view',
                              kind: 'button',
                              label: 'مشاهده جزئیات',
                              tooltip: 'مشاهده جزئیات ثبت‌شده',
                              icon: <i className="fa-regular fa-eye" />,
                              variant: 'secondary',
                              onClick: () => setSelectedLog(entry),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
        )}

        <footer className="audit-operations-v2__pagination">
          <span>صفحه {safePage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
          <div>
            <Button type="button" size="xs" variant="secondary" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>قبلی</Button>
            {pages.map((item) => <Button key={item} type="button" size="xs" variant={item === safePage ? 'primary' : 'secondary'} data-active={item === safePage} onClick={() => setPage(item)}>{item.toLocaleString('fa-IR')}</Button>)}
            <Button type="button" size="xs" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>بعدی</Button>
          </div>
        </footer>
      </section>

      <DialogShell
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        overlayClassName="audit-detail-modal__backdrop"
        panelClassName="audit-detail-modal"
        ariaLabel={selectedLog ? `جزئیات رویداد ${selectedLog.id}` : 'جزئیات رویداد'}
        motion="fade"
      >
        {selectedLog ? (
          <>
            <header>
              <div><span><i className="fa-solid fa-clock-rotate-left" /></span><div><h2>جزئیات رویداد #{selectedLog.id.toLocaleString('fa-IR')}</h2><p>اطلاعات فقط‌خواندنی ثبت‌شده در audit log</p></div></div>
              <Button type="button" size="icon" variant="secondary" className="audit-modal-close" onClick={() => setSelectedLog(null)} aria-label="بستن" leftIcon={<i className="fa-solid fa-xmark" />} />
            </header>

            <div className="audit-detail-modal__summary">
              <div><small>زمان ثبت</small><strong>{formatDateTime(selectedLog.createdAt)}</strong></div>
              <div><small>کاربر</small><strong>{selectedLog.username || 'سیستم'}</strong></div>
              <div><small>نقش</small><strong>{selectedLog.role || 'بدون نقش'}</strong></div>
              <div><small>عملیات</small><strong>{actionMeta(selectedLog.action).label}</strong></div>
              <div><small>موجودیت</small><strong>{entityLabel(selectedLog.entityType)}</strong></div>
              <div><small>شناسه</small><strong>{selectedLog.entityId != null ? selectedLog.entityId.toLocaleString('fa-IR') : '—'}</strong></div>
            </div>

            <div className="audit-detail-modal__description">
              <span><i className="fa-regular fa-file-lines" /> توضیحات ثبت‌شده</span>
              <p>{selectedLog.description || 'توضیحی برای این رویداد ثبت نشده است.'}</p>
            </div>

            {selectedDescriptionFields.length ? (
              <div className="audit-detail-modal__json">
                <span><i className="fa-solid fa-code" /> داده ساختاریافته</span>
                <div>{selectedDescriptionFields.map((item) => <article key={item.label}><small>{item.label}</small><pre>{item.value}</pre></article>)}</div>
              </div>
            ) : null}
          </>
        ) : null}
      </DialogShell>
    </main>
  );
};

export default AuditLogPage;
