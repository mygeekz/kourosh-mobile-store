// Repairs.tsx — نسخه لیستی با آیکون و تم برند

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Repair, NotificationMessage, RepairStatus } from '../types';
import Notification from '../components/Notification';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { REPAIR_STATUSES } from '../constants';
import { useStyle } from '../contexts/StyleContext';
import AppSearchField from '../components/ui/AppSearchField';
import FilterChipsBar from '../components/FilterChipsBar';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { printArea } from '../utils/printArea';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/Button';


const REPAIRS_PRINT_REPORT_CSS = `
  @page { size: A4 landscape; margin: 10mm; }
  html, body {
    direction: rtl;
    background: #fff !important;
    color: #0f172a;
    font-family: Vazirmatn, Vazir, Tahoma, Arial, sans-serif !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #__print_root {
    padding: 0 !important;
    text-align: initial !important;
  }
  .repair-print-report {
    width: 100%;
    box-sizing: border-box;
    direction: rtl;
  }
  .repair-print-report__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid #dbe4f0;
    border-radius: 18px;
    padding: 14px 16px;
    margin-bottom: 12px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  }
  .repair-print-report__title {
    margin: 0;
    font-size: 20px;
    line-height: 1.6;
    font-weight: 900;
    color: #0f172a;
  }
  .repair-print-report__subtitle {
    margin: 2px 0 0;
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
  }
  .repair-print-report__meta {
    min-width: 185px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 8px 10px;
    background: #ffffff;
    color: #475569;
    font-size: 11px;
    line-height: 1.9;
    text-align: right;
  }
  .repair-print-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    border: 1px solid #dbe4f0;
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
  }
  .repair-print-table th,
  .repair-print-table td {
    border-bottom: 1px solid #e2e8f0;
    border-left: 1px solid #e2e8f0;
    padding: 9px 10px;
    vertical-align: middle;
    text-align: right;
    font-size: 11px;
    line-height: 1.65;
    color: #0f172a;
    word-break: break-word;
  }
  .repair-print-table th:last-child,
  .repair-print-table td:last-child { border-left: 0; }
  .repair-print-table tbody tr:last-child td { border-bottom: 0; }
  .repair-print-table thead th {
    background: #f1f5f9;
    color: #334155;
    font-size: 11px;
    font-weight: 900;
  }
  .repair-print-table tbody tr:nth-child(even) td { background: #f8fafc; }
  .repair-print-table .is-id { width: 46px; text-align: center; }
  .repair-print-table .is-date { width: 132px; }
  .repair-print-table .is-cost { width: 92px; }
  .repair-print-table .is-status { width: 104px; }
  .repair-print-table .repair-print-status {
    display: inline-block;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 2px 8px;
    font-weight: 800;
    color: #334155;
    background: #f8fafc;
    white-space: nowrap;
  }
  @media print {
    .no-print, .repair-print-report .no-print { display: none !important; }
  }
`;

const Repairs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, token } = useAuth();
  const { style } = useStyle();

  // رنگ برند از ستینگ/استایل
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  // state
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // نقش‌ها
  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/');
      return;
    }
    fetchRepairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, token]);

  const fetchRepairs = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/repairs');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست تعمیرات');
      setRepairs(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'خطا در ارتباط با سرور' });
    } finally {
      setIsLoading(false);
    }
  };

  // فیلتر/جستجو
  const filteredRepairs = useMemo(() => {
    let data = [...repairs];
    if (statusFilter) data = data.filter(r => r.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      data = data.filter(r =>
        String(r.id).includes(q) ||
        r.customerFullName?.toLowerCase().includes(q) ||
        r.deviceModel?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [repairs, statusFilter, searchTerm]);

  const exportFilenameBase = `repairs-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filteredRepairs.map((r) => ({
    id: r.id,
    customer: r.customerFullName ?? '—',
    device: `${r.deviceModel || '—'}${r.deviceColor ? ` (${r.deviceColor})` : ''}`,
    serial: r.serialNumber || '—',
    issue: r.problemDescription || '—',
    status: r.status || '—',
    received: formatIsoToShamsiDateTime(r.dateReceived),
    est: r.estimatedCost != null ? Number(r.estimatedCost).toLocaleString('fa-IR') : '—',
    final: r.finalCost != null ? Number(r.finalCost).toLocaleString('fa-IR') : '—',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportFilenameBase}.xlsx`,
      exportRows,
      [
        { header: 'شناسه', key: 'id' },
        { header: 'مشتری', key: 'customer' },
        { header: 'دستگاه', key: 'device' },
        { header: 'وضعیت', key: 'status' },
        { header: 'تاریخ پذیرش', key: 'received' },
        { header: 'هزینه تخمینی', key: 'est' },
        { header: 'هزینه نهایی', key: 'final' },
      ],
      'Repairs',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportFilenameBase}.pdf`,
      title: 'لیست تعمیرات',
      subtitle: `${filteredRepairs.length.toLocaleString('fa-IR')} پرونده تعمیر در خروجی فعلی`,
      orientation: 'landscape',
      head: ['شناسه', 'مشتری', 'دستگاه', 'شرح مشکل', 'وضعیت', 'تاریخ پذیرش', 'هزینه تخمینی'],
      body: exportRows.map((x) => [
        Number(x.id).toLocaleString('fa-IR'),
        x.customer,
        x.device,
        x.issue,
        x.status,
        x.received,
        x.est,
      ]),
    });
  };


  const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const r of repairs) {
    const key = r.status || 'نامشخص';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
  }, [repairs]);

  const filterChips = useMemo(() => {
    return [
      { key: '', label: 'همه', icon: 'fa-solid fa-layer-group', count: repairs.length || 0 },
      ...REPAIR_STATUSES.map((s) => ({
        key: s,
        label: s,
        icon: 'fa-solid fa-tag',
        count: statusCounts[s] || 0,
      })),
    ];
  }, [repairs.length, statusCounts]);

  const repairExecutiveCards = useMemo(() => {
    const activeCount = repairs.filter((r) => !['تحویل داده شده', 'تعمیر نشد', 'مرجوع شد'].includes(String(r.status || ''))).length;
    const readyCount = statusCounts['آماده تحویل'] || 0;
    const waitingPartsCount = statusCounts['منتظر قطعه'] || 0;
    return [
      { key: 'active', label: 'فعال', value: activeCount, icon: 'fa-screwdriver-wrench', hint: 'پرونده‌های باز' },
      { key: 'ready', label: 'آماده تحویل', value: readyCount, icon: 'fa-circle-check', hint: 'قابل تحویل' },
      { key: 'waiting', label: 'منتظر قطعه', value: waitingPartsCount, icon: 'fa-box-open', hint: 'نیازمند پیگیری' },
    ];
  }, [repairs, statusCounts]);


  const updateRepairStatus = async (repairId: number, status: RepairStatus) => {
  try {
    const json = await runWithFeedback(
      parseApiResult<any>(
        await apiFetch(`/api/repairs/${repairId}`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        }),
        { endpoint: '/api/repairs/status', action: 'تغییر وضعیت تعمیر' }
      ),
      {
        kind: 'update',
        endpoint: '/api/repairs/status',
        loading: 'در حال به‌روزرسانی وضعیت تعمیر…',
        success: `وضعیت تعمیر #${repairId.toLocaleString('fa-IR')} با موفقیت تغییر کرد.`,
        error: 'تغییر وضعیت تعمیر انجام نشد؛ وضعیت انتخابی و دسترسی کاربر را بررسی و ادامه کنید.',
      }
    );
    const updated = json.data?.repair || json.data;
    setRepairs(prev => prev.map(r => (r.id === repairId ? { ...r, ...updated } : r)));
    setNotification({ type: 'success', text: `وضعیت تعمیر #${repairId.toLocaleString('fa-IR')} به "${status}" تغییر کرد.` });
  } catch (e: any) {
    setNotification({ type: 'error', text: humanizeErrorMessage(e?.message || 'خطا در تغییر وضعیت تعمیر', { endpoint: '/api/repairs/status', action: 'تغییر وضعیت تعمیر' }) });
  }
  };

  const renderStatusChips = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Button
      onClick={() => setStatusFilter('')}
      variant={statusFilter === '' ? 'primary' : 'secondary'}
      size="xs"
      className="rounded-full"
    >
      همه ({(repairs.length || 0).toLocaleString('fa-IR')})
    </Button>
    {REPAIR_STATUSES.map((s) => (
      <Button
        key={s}
        onClick={() => setStatusFilter(s)}
        variant={statusFilter === s ? 'primary' : 'secondary'}
        size="xs"
        className="rounded-full"
        tooltip={`فیلتر: ${s}`}
      >
        {s} ({(statusCounts[s] || 0).toLocaleString('fa-IR')})
      </Button>
    ))}
  </div>
  );

  const statusOrderForBoard: RepairStatus[] = [
  'پذیرش شده',
  'در حال بررسی و ادامه',
  'منتظر قطعه',
  'در حال تعمیر',
  'آماده تحویل',
  'تحویل داده شده',
  'تعمیر نشد',
  'مرجوع شد',
  ];

  const groupedForBoard = useMemo(() => {
  const g: Record<string, Repair[]> = {};
  for (const s of statusOrderForBoard) g[s] = [];
  for (const r of filteredRepairs) {
    const key = (r.status as string) || 'نامشخص';
    if (!g[key]) g[key] = [];
    g[key].push(r);
  }
  return g;
  }, [filteredRepairs]);
  // استایل یکدست ورودی‌ها
  const inputCls =
    'w-full p-2.5 rounded-lg text-sm text-right border outline-none transition ' +
    'bg-white border-gray-300 text-gray-900 ' +
    'dark:bg-gray-900/50 dark:border-gray-600 dark:text-gray-100 preview-gray-400 dark:preview-gray-400 ' +
    '  ';

    const getRepairRowStateClass = (status: string): string => {
    switch (status) {
      case 'آماده تحویل':
        return 'table-row-state--ready';
      case 'تحویل داده شده':
        return 'table-row-state--settled';
      case 'منتظر قطعه':
        return 'table-row-state--critical';
      default:
        return '';
    }
  };

// آیکون و رنگ وضعیت
  const statusMeta = (status: RepairStatus) => {
    switch (status) {
      case 'پذیرش شده':
        return { icon: 'fa-circle-check', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'در حال بررسی و ادامه':
        return { icon: 'fa-magnifying-glass', cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300' };
      case 'منتظر قطعه':
        return { icon: 'fa-box-open', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
      case 'در حال تعمیر':
        return { icon: 'fa-screwdriver-wrench', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
      case 'آماده تحویل':
        return { icon: 'fa-truck-ramp-box', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' };
      case 'تحویل داده شده':
        return { icon: 'fa-handshake', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
      case 'مرجوع شد':
        return { icon: 'fa-rotate-left', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' };
      default:
        return { icon: 'fa-circle', cls: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
    }
  };

  return (
    // در اندازه‌های کوچک صفحات، از حداکثر عرض مناسب و حاشیه‌های افقی استفاده می‌کنیم تا محتوا منسجم‌تر نمایش داده شود
    <div className="repairs-page repairs-apple-page products-services-redesign-v1 repairs-redesign-v1 repair-workflow-foundation space-y-3 text-right max-w-7xl mx-auto px-2 sm:px-3" dir="rtl" data-ui-repair-page="repairs" data-ui-repair-scope="list">
      <Notification message={notification} onClose={() => setNotification(null)} />
      <section className="repairs-apple-hero" aria-label="خلاصه تعمیرات" data-ui-repair-surface="hero">
        <div className="repairs-apple-hero__title">
          <span className="repairs-apple-hero__icon"><i className="fa-solid fa-screwdriver-wrench" /></span>
          <div>
            <h1>مرکز تعمیرات</h1>
            <p>پذیرش، پیگیری، تحویل و رسیدهای تعمیرات در یک نمای عملیاتی.</p>
          </div>
        </div>
        <div className="repairs-apple-hero__actions">
          <Button
            onClick={() => navigate('/repairs/new')}
            variant="primary"
            size="sm"
            leftIcon={<i className="fa-solid fa-plus" />}
          >
            پذیرش جدید
          </Button>
          <Button
            onClick={() => navigate('/services')}
            variant="secondary"
            size="sm"
            className="repairs-hero-services-btn"
            leftIcon={<i className="fa-solid fa-clipboard-list" />}
          >
            خدمات
          </Button>
        </div>
      </section>

      <section className="repairs-apple-status-grid" aria-label="وضعیت تعمیرات" data-ui-repair-metrics="true">
        {repairExecutiveCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setStatusFilter(card.key === 'active' ? '' : card.label)}
            className="repairs-apple-status-card" data-ui-repair-card="status"
          >
            <span className="repairs-apple-status-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
            <span className="repairs-apple-status-card__body">
              <span className="repairs-apple-status-card__label">{card.label}</span>
              <span className="repairs-apple-status-card__hint">{card.hint}</span>
            </span>
            <span className="repairs-apple-status-card__value">{Number(card.value || 0).toLocaleString('fa-IR')}</span>
          </button>
        ))}
      </section>

<div className="repairs-apple-panel overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" data-ui-repair-surface="workspace" data-ui-repair-table-shell="true">
  <div className="repairs-table-toolbar" dir="rtl" data-ui-repair-toolbar="true">
    <div className="repairs-table-toolbar__title">
      <span className="repairs-table-toolbar__titleIcon" aria-hidden="true"><i className="fa-solid fa-list-check" /></span>
      <div className="repairs-table-toolbar__titleText">
        <strong>مرکز تعمیرات</strong>
      </div>
    </div>

    <div className="repairs-table-toolbar__controlRow">
      <div className="repairs-table-toolbar__searchRow">
        <AppSearchField
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="جستجو (شناسه، مشتری، مدل)…"
          ariaLabel="جستجوی تعمیرات"
          size="lg"
          clearable={Boolean(searchTerm)}
        />
      </div>

      <div className="repairs-table-toolbar__actionsRow">
        <div className="repairs-view-toggle" aria-label="تغییر حالت نمایش">
          <Button
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            size="sm"
            className="repairs-view-toggle__button"
            tooltip="نمایش لیستی"
            leftIcon={<i className="fa-solid fa-table-list" />}
          />
          <Button
            onClick={() => setViewMode('board')}
            variant={viewMode === 'board' ? 'primary' : 'secondary'}
            size="sm"
            className="repairs-view-toggle__button"
            tooltip="نمایش کانبان"
            leftIcon={<i className="fa-solid fa-table-cells-large" />}
          />
        </div>

        <ExportMenu
          className="shrink-0"
          items={[
            { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredRepairs.length === 0 },
            { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredRepairs.length === 0 },
            { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#repairs-print-area', { title: 'لیست تعمیرات', extraCss: REPAIRS_PRINT_REPORT_CSS }), disabled: filteredRepairs.length === 0 },
          ]}
        />


      </div>
    </div>

    <div className="repairs-table-toolbar__chipsRow">
      <FilterChipsBar
        chips={filterChips}
        value={statusFilter}
        onChange={(k) => setStatusFilter(k)}
      />
    </div>
  </div>

        {/* Content */}
        {viewMode === 'list' ? (
          isLoading ? (
            <div className="p-3 md:p-4">
              {/* Desktop skeleton table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="repairs-premium-table min-w-full text-sm" data-ui-repair-table="true">
                  <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                    <tr className="text-text">
                      {['شناسه','مشتری','دستگاه','تاریخ پذیرش','وضعیت','عملیات'].map((h) => (
                        <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 dark:divide-white/10">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton tone="violet" className="h-5 w-16" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton tone="violet" className="h-5 w-40" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton tone="violet" className="h-5 w-36" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton tone="violet" className="h-5 w-28" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton tone="violet" className="h-6 w-24" rounded="xl" /></td>
                        <td className="px-4 py-3"><Skeleton tone="violet" className="h-9 w-32" rounded="xl" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile skeleton cards */}
              <div className="md:hidden space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="app-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton tone="violet" className="h-5 w-28" rounded="lg" />
                      <Skeleton tone="violet" className="h-6 w-24" rounded="xl" />
                    </div>
                    <Skeleton tone="violet" className="h-5 w-56" rounded="lg" />
                    <Skeleton tone="violet" className="h-5 w-40" rounded="lg" />
                    <div className="pt-2">
                      <Skeleton tone="violet" className="h-9 w-36" rounded="xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="p-3 md:p-4">
              <EmptyState
                title="هیچ تعمیراتی پیدا نشد"
                description={searchTerm || statusFilter ? 'جستجو/فیلتر را تغییر بده یا پاک کن.' : 'اولین پذیرش دستگاه را ثبت اطلاعات کن تا اینجا پر شود.'}
                actionLabel={(searchTerm || statusFilter) ? 'پاک کردن فیلترها' : undefined}
                onAction={(searchTerm || statusFilter) ? () => { setSearchTerm(''); setStatusFilter(''); } : undefined}
                icon="fa-solid fa-screwdriver-wrench"
              />
            </div>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="repairs-premium-table min-w-full text-sm" data-ui-repair-table="true">
                  <thead className="bg-gray-50 dark:bg-gray-700/60">
                    <tr className="text-gray-600 dark:text-gray-200">
                      <th className="px-4 py-3 text-right font-semibold">شناسه</th>
                      <th className="px-4 py-3 text-right font-semibold">مشتری</th>
                      <th className="px-4 py-3 text-right font-semibold">دستگاه</th>
                      <th className="px-4 py-3 text-right font-semibold">تاریخ پذیرش</th>
                      <th className="px-4 py-3 text-right font-semibold">وضعیت</th>
                      <th className="px-4 py-3 text-center font-semibold">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {filteredRepairs.map((r, idx) => {
                      const meta = statusMeta(r.status);
                      return (
                        <tr
                          key={r.id}
                          className={`transition hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                            idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-900/30'
                          } ${getRepairRowStateClass(r.status)}`.trim()}
                        >
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{r.id}</td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{r.customerFullName || '—'}</td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{r.deviceModel}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {formatIsoToShamsiDateTime(r.dateReceived)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`repair-status-pill inline-flex items-center gap-1.5 rounded-full text-xs font-bold ${meta.cls}`}>
                              <i className={`fa-solid ${meta.icon}`} />
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
  <div className="flex items-center justify-center gap-2">
    <Link
      to={`/repairs/${r.id}`}
      className="repairs-link-btn"
      title="مشاهده جزئیات"
    >
      <i className="fa-regular fa-eye" />
      مشاهده
    </Link>

    <Link
      to={`/repairs/${r.id}/receipt?autoPrint=1`}
      className="repairs-link-btn-success"
      title="چاپ رسید"
    >
      <i className="fa-solid fa-receipt" />
      رسید
    </Link>

    {r.status !== 'آماده تحویل' && r.status !== 'تحویل داده شده' ? (
      <Button
        type="button"
        onClick={() => updateRepairStatus(r.id, 'آماده تحویل')}
        variant="warning"
        size="xs"
        tooltip="تغییر وضعیت به آماده تحویل"
        leftIcon={<i className="fa-solid fa-bolt" />}
      >
        آماده
      </Button>
    ) : null}
  </div>
</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                id="repairs-print-area"
                aria-hidden="true"
                className="repair-print-source"
                style={{ position: 'fixed', insetInlineStart: '-20000px', top: 0, width: '1120px', height: 1, overflow: 'hidden', pointerEvents: 'none' }}
              >
                <section className="repair-print-report">
                  <header className="repair-print-report__header">
                    <div>
                      <h1 className="repair-print-report__title">لیست تعمیرات</h1>
                      <p className="repair-print-report__subtitle">گزارش خروجی پرونده‌های تعمیرات فروشگاه کوروش</p>
                    </div>
                    <div className="repair-print-report__meta">
                      <div>تاریخ خروجی: {new Date().toLocaleString('fa-IR')}</div>
                      <div>تعداد پرونده‌ها: {filteredRepairs.length.toLocaleString('fa-IR')}</div>
                    </div>
                  </header>

                  <table className="repair-print-table">
                    <thead>
                      <tr>
                        <th className="is-id">شناسه</th>
                        <th>مشتری</th>
                        <th>دستگاه</th>
                        <th>شرح مشکل</th>
                        <th className="is-status">وضعیت</th>
                        <th className="is-date">تاریخ پذیرش</th>
                        <th className="is-cost">هزینه تخمینی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRepairs.map((r) => (
                        <tr key={`print-${r.id}`}>
                          <td className="is-id">{Number(r.id).toLocaleString('fa-IR')}</td>
                          <td>{r.customerFullName || '—'}</td>
                          <td>{`${r.deviceModel || '—'}${r.deviceColor ? ` (${r.deviceColor})` : ''}`}</td>
                          <td>{r.problemDescription || '—'}</td>
                          <td className="is-status"><span className="repair-print-status">{r.status || '—'}</span></td>
                          <td className="is-date">{formatIsoToShamsiDateTime(r.dateReceived)}</td>
                          <td className="is-cost">{r.estimatedCost != null ? Number(r.estimatedCost).toLocaleString('fa-IR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden space-y-4 p-4">
                {filteredRepairs.map((r) => {
                  const meta = statusMeta(r.status);
                  return (
                    <div key={r.id} className={`repair-mobile-card rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 dark:border-gray-700 dark:bg-gray-800 ${getRepairRowStateClass(r.status)}`.trim()}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            #{r.id.toLocaleString('fa-IR')} • {r.deviceModel}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {r.customerFullName || 'مشتری نامشخص'}
                          </div>
                        </div>
                        <span className={`repair-status-pill inline-flex items-center gap-1 rounded-full text-[10px] font-bold ${meta.cls}`}>
                          <i className={`fa-solid ${meta.icon}`} />
                          {r.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-y border-gray-100 dark:border-gray-700 text-xs">
                        <div className="text-gray-500 dark:text-gray-400">تاریخ پذیرش:</div>
                        <div className="text-gray-700 dark:text-gray-300">{formatIsoToShamsiDateTime(r.dateReceived)}</div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
  <Link
    to={`/repairs/${r.id}`}
    className="repairs-link-btn"
  >
    <i className="fa-regular fa-eye" />
    مشاهده
  </Link>

  <Link
    to={`/repairs/${r.id}/receipt?autoPrint=1`}
    className="repairs-link-btn-success"
    title="چاپ رسید"
  >
    <i className="fa-solid fa-receipt" />
    رسید
  </Link>

  {r.status !== 'آماده تحویل' && r.status !== 'تحویل داده شده' ? (
    <Button
      type="button"
      onClick={() => updateRepairStatus(r.id, 'آماده تحویل')}
      variant="warning"
      size="xs"
      tooltip="تغییر وضعیت به آماده تحویل"
      leftIcon={<i className="fa-solid fa-bolt" />}
    >
      آماده
    </Button>
  ) : null}
</div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        ) : (
          <div className="px-5 pb-5">
            {isLoading ? (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-spinner fa-spin text-3xl mb-3" />
                در حال دریافت اطلاعات تعمیرات...
              </div>
            ) : filteredRepairs.length === 0 ? (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-tools text-3xl mb-3" />
                هیچ تعمیراتی یافت نشد.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {statusOrderForBoard.map((status) => {
                  const meta = statusMeta(status);
                  const list = groupedForBoard[status] || [];
                  return (
                    <div
                      key={status}
                      className="repairs-apple-board-column rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/20 overflow-hidden"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const raw = e.dataTransfer.getData('text/plain');
                        const rid = Number(raw);
                        if (rid) updateRepairStatus(rid, status);
                      }}
                    >
                      <div className="repairs-apple-board-column__head px-3 py-2 flex items-center justify-between bg-white/70 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
                        <span className={`repair-status-pill inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${meta.cls}`}>
                          <i className={`fa-solid ${meta.icon}`} />
                          {status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {list.length.toLocaleString('fa-IR')}
                        </span>
                      </div>

                      <div className="p-3 space-y-3 max-h-[540px] overflow-y-auto">
                        {list.length === 0 ? (
                          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                            موردی ندارد
                          </div>
                        ) : (
                          list.map((r) => (
                            <div
                              key={r.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(r.id));
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              className="group rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-all"
                              title="برای تغییر وضعیت، کارت را بکشید و در ستون مقصد رها کنید"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                                    #{r.id.toLocaleString('fa-IR')} • {r.deviceModel}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                                    <i className="fa-solid fa-user ml-1 text-gray-400" />
                                    {r.customerFullName || '—'}
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                    <i className="fa-solid fa-calendar ml-1 text-gray-400" />
                                    {formatIsoToShamsiDateTime(r.dateReceived)}
                                  </div>
                                </div>

                                <Link
                                  to={`/repairs/${r.id}`}
                                  className="ux-btn ux-btn-primary ux-btn-xs shrink-0 min-h-0 h-9 w-9 px-0 py-0"
                                  title="مشاهده جزئیات"
                                >
                                  <i className="fa-regular fa-eye" />
                                </Link>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2">
                                <select
                                  value={r.status}
                                  onChange={(e) => updateRepairStatus(r.id, e.target.value as RepairStatus)}
                                  className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-2 py-1.5   outline-none"
                                >
                                  {REPAIR_STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>

                                <span className="text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition">
                                  drag &amp; drop
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Repairs;
