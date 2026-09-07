import { Table } from '@/components/ui';
// Repairs.tsx — نسخه لیستی با آیکون و تم برند

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Repair, NotificationMessage, RepairStatus } from '../types';
import Notification from '../components/Notification';
import { parseApiResult, humanizeErrorMessage } from '../utils/feedback';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { REPAIR_STATUSES } from '../constants';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { printArea } from '../utils/printArea';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/Button';
import { MANAGEMENT_DIRECTORY_ROW_CLASS, ManagementDirectoryTable, ManagementDirectoryToolbar, PageShell, PanelCard, SelectField, TableActionGroup } from '@/components/ui';
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

class RepairBoardRenderBoundary extends React.Component<
  { children: React.ReactNode; resetKey: string; onFallback: () => void },
  { failed: boolean; message?: string }
> {
  state: { failed: boolean; message?: string } = { failed: false };

  static getDerivedStateFromError(error: unknown) {
    return {
      failed: true,
      message: error instanceof Error ? error.message : 'خطای ناشناخته در نمایش کانبان تعمیرات',
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('[repair-board] kanban render failed', error, errorInfo);
  }

  componentDidUpdate(prevProps: Readonly<{ children: React.ReactNode; resetKey: string; onFallback: () => void }>) {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false, message: undefined });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <PanelCard tone="danger" className="mx-5 mb-5" bodyClassName="space-y-3 p-4">
        <div className="flex items-start gap-3 text-right">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300" aria-hidden="true">
            <i className="fa-solid fa-triangle-exclamation" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">نمای کانبان با خطا متوقف شد</div>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">
              خود صفحه تعمیرات سالم است. برای ادامه، به نمای لیست برگردید؛ جزئیات خطا با برچسب [repair-board] در Console ثبت شده است.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={this.props.onFallback} leftIcon={<i className="fa-solid fa-table-list" aria-hidden="true" />}>
            بازگشت به نمای لیست
          </Button>
        </div>
      </PanelCard>
    );
  }
}

const Repairs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, token } = useAuth();

  // state
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<number>>(() => new Set());
  const [draggedRepairId, setDraggedRepairId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<RepairStatus | null>(null);

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRepairs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filteredRepairs.length === 0 ? 0 : ((safePage - 1) * pageSize) + 1;
  const pageEnd = Math.min(safePage * pageSize, filteredRepairs.length);
  const pagedRepairs = useMemo(
    () => filteredRepairs.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRepairs, safePage, pageSize],
  );

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

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
    const currentRepair = repairs.find((repair) => Number(repair.id) === Number(repairId));
    if (!currentRepair || currentRepair.status === status || pendingStatusIds.has(Number(repairId))) return;

    setPendingStatusIds((current) => {
      const next = new Set(current);
      next.add(Number(repairId));
      return next;
    });

    try {
      const json = await parseApiResult<any>(
        await apiFetch(`/api/repairs/${repairId}`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        }),
        { endpoint: '/api/repairs/status', action: 'تغییر وضعیت تعمیر' },
      );

      // The update endpoint returns repair-details (`{ repair, parts }`). Never
      // spread that transport object into a list row: a malformed/nested payload
      // can make the board crash only after the server update has already committed.
      const serverRepair = json?.data?.repair && typeof json.data.repair === 'object'
        ? json.data.repair
        : json?.data && typeof json.data === 'object'
          ? json.data
          : null;
      const serverStatus = serverRepair && REPAIR_STATUSES.includes(serverRepair.status as RepairStatus)
        ? serverRepair.status as RepairStatus
        : status;

      setRepairs((current) => current.map((repair) => {
        if (Number(repair.id) !== Number(repairId)) return repair;
        const next: Repair = { ...repair, status: serverStatus };
        if (serverRepair) {
          if (typeof serverRepair.dateCompleted === 'string' || serverRepair.dateCompleted === null) next.dateCompleted = serverRepair.dateCompleted;
          if (serverRepair.finalCost === null || Number.isFinite(Number(serverRepair.finalCost))) next.finalCost = serverRepair.finalCost == null ? null : Number(serverRepair.finalCost);
          if (serverRepair.laborFee === null || Number.isFinite(Number(serverRepair.laborFee))) next.laborFee = serverRepair.laborFee == null ? null : Number(serverRepair.laborFee);
          if (serverRepair.technicianId === null || Number.isFinite(Number(serverRepair.technicianId))) next.technicianId = serverRepair.technicianId == null ? null : Number(serverRepair.technicianId);
          if (typeof serverRepair.technicianName === 'string' || serverRepair.technicianName === null) next.technicianName = serverRepair.technicianName;
        }
        return next;
      }));

      setNotification({ type: 'success', text: `وضعیت تعمیر #${Number(repairId).toLocaleString('fa-IR')} به "${serverStatus}" تغییر کرد.` });
    } catch (e: any) {
      console.error('[repair-status] status update failed', { repairId, status, error: e });
      setNotification({ type: 'error', text: humanizeErrorMessage(e?.message || 'خطا در تغییر وضعیت تعمیر', { endpoint: '/api/repairs/status', action: 'تغییر وضعیت تعمیر' }) });
    } finally {
      setPendingStatusIds((current) => {
        if (!current.has(Number(repairId))) return current;
        const next = new Set(current);
        next.delete(Number(repairId));
        return next;
      });
    }
  };

  const scheduleRepairStatusUpdateAfterDrop = (repairId: number, status: RepairStatus) => {
    // Chromium/PWA can leave the native drag preview layer visually stuck when
    // React moves/unmounts the dragged card inside the same drop lifecycle.
    // End the native drag first, then commit the async status transition.
    setDraggedRepairId(null);
    setDragOverStatus(null);
    window.setTimeout(() => {
      void updateRepairStatus(repairId, status);
    }, 0);
  };


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
  const getRepairStatusRailClass = (status: string): string => {
    if (status === 'آماده تحویل') return 'border-s-4 border-s-violet-500';
    if (status === 'تحویل داده شده') return 'border-s-4 border-s-emerald-500';
    if (status === 'منتظر قطعه') return 'border-s-4 border-s-amber-400';
    if (status === 'در حال تعمیر') return 'border-s-4 border-s-orange-500';
    if (status === 'تعمیر نشد' || status === 'مرجوع شد') return 'border-s-4 border-s-rose-500';
    if (status === 'در حال بررسی و ادامه') return 'border-s-4 border-s-cyan-500';
    return 'border-s-4 border-s-sky-500';
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
    <PageShell
      title="مرکز تعمیرات"
      description="پذیرش، پیگیری، تحویل و رسیدهای تعمیرات در یک نمای عملیاتی."
      icon={<i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
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
            leftIcon={<i className="fa-solid fa-clipboard-list" />}
          >
            خدمات
          </Button>
        </div>
      )}
    >
      <div className="mx-auto max-w-7xl space-y-3 px-2 text-right sm:px-3" dir="rtl">
        <Notification message={notification} onClose={() => setNotification(null)} />

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="وضعیت تعمیرات">
          {repairExecutiveCards.map((card) => {
            const active = card.key === 'active' ? statusFilter === '' : statusFilter === card.label;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setStatusFilter(card.key === 'active' ? '' : card.label)}
                className={`grid min-h-24 min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-3 text-right transition-colors ${
                  active
                    ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/35'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
                }`}
                aria-pressed={active}
               
              >
                <span data-ui-icon-surface="bare" className="inline-flex h-9 w-9 items-center justify-center border-0 bg-transparent text-slate-500 shadow-none dark:text-slate-300" aria-hidden="true">
                  <i className={`fa-solid ${card.icon}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">{card.label}</span>
                  <span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">{card.hint}</span>
                </span>
                <strong className="text-xl font-black tabular-nums text-slate-950 dark:text-white">{Number(card.value || 0).toLocaleString('fa-IR')}</strong>
              </button>
            );
          })}
        </section>

<div className="space-y-3">
  <ManagementDirectoryToolbar
    ariaLabel="فیلتر و جستجوی تعمیرات"
    searchValue={searchTerm}
    onSearchChange={setSearchTerm}
    searchPlaceholder="جستجو (شناسه، مشتری، مدل)…"
    searchAriaLabel="جستجوی تعمیرات"
    filters={[
      {
        key: 'status',
        value: statusFilter,
        ariaLabel: 'فیلتر وضعیت تعمیر',
        iconClassName: 'fa-solid fa-screwdriver-wrench',
        onValueChange: setStatusFilter,
        options: [
          { value: '', label: `همه وضعیت‌ها (${repairs.length.toLocaleString('fa-IR')})` },
          ...REPAIR_STATUSES.map((status) => ({ value: status, label: `${status} (${Number(statusCounts[status] || 0).toLocaleString('fa-IR')})` })),
        ],
      },
    ]}
    columns={2}
    resetDisabled={!searchTerm && !statusFilter}
    onReset={() => { setSearchTerm(''); setStatusFilter(''); }}
  />

  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950" role="group" aria-label="تغییر حالت نمایش تعمیرات">
      <Button
        onClick={() => setViewMode('list')}
        variant={viewMode === 'list' ? 'primary' : 'ghost'}
        size="sm"
        autoIcon={false}
        aria-pressed={viewMode === 'list'}
        leftIcon={<i className="fa-solid fa-table-list" aria-hidden="true" />}
      >
        لیست
      </Button>
      <Button
        onClick={() => setViewMode('board')}
        variant={viewMode === 'board' ? 'primary' : 'ghost'}
        size="sm"
        autoIcon={false}
        aria-pressed={viewMode === 'board'}
        leftIcon={<i className="fa-solid fa-table-cells-large" aria-hidden="true" />}
      >
        کانبان
      </Button>
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

        {/* Content */}
        {viewMode === 'list' ? (
          isLoading ? (
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} tone="info" className="h-12" rounded="lg" />)}
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <EmptyState
                title="هیچ تعمیراتی پیدا نشد"
                description={searchTerm || statusFilter ? 'نتیجه‌ای مطابق جستجو و فیلتر فعلی وجود ندارد؛ فیلترها را بازنشانی کنید.' : 'برای شروع، نخستین پذیرش تعمیر را ثبت کنید؛ وضعیت، هزینه و تحویل دستگاه از همین مرکز پیگیری می‌شود.'}
                actionLabel={(searchTerm || statusFilter) ? 'پاک کردن فیلترها' : undefined}
                onAction={(searchTerm || statusFilter) ? () => { setSearchTerm(''); setStatusFilter(''); } : undefined}
                icon="fa-solid fa-screwdriver-wrench"
              />
            </div>
          ) : (
            <>
              <ManagementDirectoryTable
                title="فهرست تعمیرات"
                rangeLabel={<>نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {filteredRepairs.length.toLocaleString('fa-IR')} پرونده</>}
                info="وضعیت، پذیرش و هزینه‌ها از پرونده‌های تعمیر ثبت‌شده نمایش داده می‌شوند."
                ariaLabel="جدول فهرست تعمیرات"
                caption="فهرست تعمیرات، مشتری، دستگاه، وضعیت و عملیات پرونده"
                dataUi="repairs"
                columns={[
                  { key: 'identity', label: 'پرونده و مشتری', widthClassName: 'w-[33%]' },
                  { key: 'device', label: 'دستگاه و پذیرش', widthClassName: 'w-[28%]' },
                  { key: 'status', label: 'وضعیت و پیگیری', widthClassName: 'w-[25%]' },
                  { key: 'actions', label: 'عملیات', widthClassName: 'w-[14%]', align: 'center', stickyEnd: true },
                ]}
                pagination={{
                  page: safePage,
                  totalPages,
                  pageSize,
                  pageSizeOptions: [25, 50, 100],
                  total: filteredRepairs.length,
                  pageStart,
                  pageEnd,
                  ariaLabel: 'صفحه‌بندی تعمیرات',
                  pageSizeAriaLabel: 'تعداد پرونده تعمیر در هر صفحه',
                  onPageChange: setPage,
                  onPageSizeChange: (value) => { setPage(1); setPageSize(value); },
                }}
              >
                {pagedRepairs.map((repair) => {
                  const meta = statusMeta(repair.status);
                  const cost = repair.finalCost ?? repair.estimatedCost;
                  return (
                    <tr key={repair.id} className={MANAGEMENT_DIRECTORY_ROW_CLASS}>
                      <td className={`px-3 py-2.5 align-top ${getRepairStatusRailClass(repair.status)}`}>
                        <div className="min-w-0 space-y-2">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              <i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <strong className="allow-truncate block truncate text-sm font-black text-slate-950 dark:text-slate-50">{repair.customerFullName || 'مشتری نامشخص'}</strong>
                              <small className="allow-truncate mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">پرونده تعمیر #{Number(repair.id).toLocaleString('fa-IR')}</small>
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ps-11 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-calendar shrink-0 text-sky-600" aria-hidden="true" />{formatIsoToShamsiDateTime(repair.dateReceived)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="min-w-0 space-y-1.5">
                          <strong className="allow-truncate block truncate text-sm font-black text-slate-950 dark:text-slate-50">{repair.deviceModel || 'مدل ثبت نشده'}</strong>
                          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                            {repair.deviceColor ? <span><i className="fa-solid fa-palette me-1 text-violet-600" aria-hidden="true" />{repair.deviceColor}</span> : null}
                            {repair.serialNumber ? <span><i className="fa-solid fa-barcode me-1 text-cyan-600" aria-hidden="true" /><bdi dir="ltr">{repair.serialNumber}</bdi></span> : null}
                          </div>
                          <p className="allow-line-clamp line-clamp-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{repair.problemDescription || 'شرح مشکل ثبت نشده'}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="min-w-0 space-y-2">
                          <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-black ${meta.cls}`}>
                            <i className={`fa-solid ${meta.icon} shrink-0`} aria-hidden="true" />
                            <span className="truncate">{repair.status || 'نامشخص'}</span>
                          </span>
                          <div className="text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-coins text-amber-600" aria-hidden="true" />{cost != null ? `${Number(cost).toLocaleString('fa-IR')} تومان` : 'هزینه ثبت نشده'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="sticky end-0 z-10 bg-inherit px-2 py-2.5 text-center align-middle">
                        <TableActionGroup
                          ariaLabel={`عملیات تعمیر شماره ${repair.id.toLocaleString('fa-IR')}`}
                          collapseBelow="lg"
                          align="end"
                          actions={[
                            {
                              key: 'view',
                              kind: 'link',
                              to: `/repairs/${repair.id}`,
                              label: 'مشاهده جزئیات',
                              tooltip: 'مشاهده پرونده تعمیر',
                              variant: 'secondary',
                              icon: <i className="fa-regular fa-eye" aria-hidden="true" />,
                            },
                            {
                              key: 'receipt',
                              kind: 'link',
                              to: `/repairs/${repair.id}/receipt?autoPrint=1`,
                              label: 'چاپ رسید',
                              tooltip: 'چاپ رسید تعمیر',
                              variant: 'success',
                              icon: <i className="fa-solid fa-receipt" aria-hidden="true" />,
                            },
                            {
                              key: 'ready',
                              kind: 'button',
                              onClick: () => updateRepairStatus(repair.id, 'آماده تحویل'),
                              label: 'آماده تحویل',
                              tooltip: 'تغییر وضعیت به آماده تحویل',
                              variant: 'warning',
                              hidden: repair.status === 'آماده تحویل' || repair.status === 'تحویل داده شده',
                              icon: <i className="fa-solid fa-bolt" aria-hidden="true" />,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </ManagementDirectoryTable>

              <div
                id="repairs-print-area"
                aria-hidden="true"
                className="repair-print-source pointer-events-none fixed top-0 -start-[20000px] h-px w-[1120px] overflow-hidden"
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

                  <Table className="repair-print-table">
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
                      {filteredRepairs.map((repair) => (
                        <tr key={`print-${repair.id}`}>
                          <td className="is-id">{Number(repair.id).toLocaleString('fa-IR')}</td>
                          <td>{repair.customerFullName || '—'}</td>
                          <td>{`${repair.deviceModel || '—'}${repair.deviceColor ? ` (${repair.deviceColor})` : ''}`}</td>
                          <td>{repair.problemDescription || '—'}</td>
                          <td className="is-status"><span className="repair-print-status">{repair.status || '—'}</span></td>
                          <td className="is-date">{formatIsoToShamsiDateTime(repair.dateReceived)}</td>
                          <td className="is-cost">{repair.estimatedCost != null ? Number(repair.estimatedCost).toLocaleString('fa-IR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </section>
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
              <RepairBoardRenderBoundary
                resetKey={`${filteredRepairs.length}:${filteredRepairs.map((repair) => `${repair.id}:${repair.status}`).join('|')}`}
                onFallback={() => setViewMode('list')}
              >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {statusOrderForBoard.map((status) => {
                  const meta = statusMeta(status);
                  const list = groupedForBoard[status] || [];
                  return (
                    <PanelCard
                      key={status}
                      padded={false}
                      headerDivider={false}
                      data-repair-status-column={status}
                      className={`overflow-hidden transition-colors ${dragOverStatus === status ? 'ring-2 ring-sky-300/70 dark:ring-sky-700/70' : ''}`}
                      bodyClassName="p-0"
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (draggedRepairId != null) setDragOverStatus(status);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDragLeave={(e) => {
                        const nextTarget = e.relatedTarget as Node | null;
                        if (!nextTarget || !e.currentTarget.contains(nextTarget)) {
                          setDragOverStatus((current) => current === status ? null : current);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const raw = e.dataTransfer.getData('text/plain');
                        const rid = Number(raw || draggedRepairId || 0);
                        if (rid) scheduleRepairStatusUpdateAfterDrop(rid, status);
                        else {
                          setDraggedRepairId(null);
                          setDragOverStatus(null);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ${meta.cls}`}>
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
                              draggable={!pendingStatusIds.has(Number(r.id))}
                              onDragStart={(e) => {
                                const repairId = Number(r.id);
                                setDraggedRepairId(repairId);
                                setDragOverStatus(null);
                                e.dataTransfer.setData('text/plain', String(repairId));
                                e.dataTransfer.effectAllowed = 'move';
                                // Suppress Chromium's full-card drag ghost. In installed PWA
                                // mode that native layer can remain white/stale if the card
                                // is re-rendered quickly after drop.
                                try {
                                  const transparentDragImage = document.createElement('canvas');
                                  transparentDragImage.width = 1;
                                  transparentDragImage.height = 1;
                                  e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
                                } catch {}
                              }}
                              onDragEnd={() => {
                                setDraggedRepairId(null);
                                setDragOverStatus(null);
                              }}
                              className={`group rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-all ${draggedRepairId === Number(r.id) ? 'opacity-70' : ''}`}
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
                                  data-ui-icon-surface="bare"
                                  className="ux-btn ux-btn-xs h-9 w-9 min-h-0 shrink-0 border-0 bg-transparent px-0 py-0 text-slate-600 shadow-none hover:text-slate-950 dark:text-slate-300 dark:hover:text-white [&&]:!bg-transparent [&&]:!shadow-none"
                                  title="مشاهده جزئیات"
                                >
                                  <i className="fa-regular fa-eye" />
                                </Link>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2">
                                <SelectField
                                  controlOnly
                                  size="sm"
                                  value={r.status}
                                  disabled={pendingStatusIds.has(Number(r.id))}
                                  onChange={(e) => void updateRepairStatus(r.id, e.target.value as RepairStatus)}
                                  className="min-w-36 text-xs"
                                >
                                  {REPAIR_STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </SelectField>

                                <span className="text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition">
                                  drag &amp; drop
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </PanelCard>
                  );
                })}
              </div>
              </RepairBoardRenderBoundary>
            )}
          </div>
        )}
      </div>
      </div>
    </PageShell>
  );
};

export default Repairs;
