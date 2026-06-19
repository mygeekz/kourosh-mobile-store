import { useConfirm } from '../contexts/ConfirmContext';
// src/pages/InstallmentSalesPage.tsx
import React, { useState, useEffect, ChangeEvent, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { InstallmentSale, NotificationMessage, OverallInstallmentStatus } from '../types';
import Notification from '../components/Notification';
import { formatIsoToShamsi } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { useStyle } from '../contexts/StyleContext';
import FilterChipsBar from '../components/FilterChipsBar';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { printArea } from '../utils/printArea';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import PageKit from '../components/ui/PageKit';
import TelegramTopicPanel from '../components/TelegramTopicPanel';
import Button from '../components/Button';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

const STATUS_OPTIONS: OverallInstallmentStatus[] = ['در حال پرداخت', 'معوق', 'تکمیل شده'];

const StatusPill: React.FC<{ status: OverallInstallmentStatus }> = ({ status }) => {
  const base =
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap';
  if (status === 'تکمیل شده') {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300`}>
        <i className="fa-solid fa-check-circle" /> تکمیل شده
      </span>
    );
  }
  if (status === 'معوق') {
    return (
      <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300`}>
        <i className="fa-solid fa-triangle-exclamation" /> معوق
      </span>
    );
  }
  return (
    <span className={`${base} bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300`}>
      <i className="fa-solid fa-hourglass-half" /> در حال پرداخت
    </span>
  );
};

const InstallmentSalesPage: React.FC = () => {
  const confirmAction = useConfirm();
  const { token } = useAuth();
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const [installmentSales, setInstallmentSales] = useState<InstallmentSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | OverallInstallmentStatus>('');
  const [tab, setTab] = useState<'main' | 'telegram'>('main');
  const navigate = useNavigate();

  const fetchInstallmentSales = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/installment-sales', { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست فروش‌های اقساطی');
      setInstallmentSales(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (token) fetchInstallmentSales(); }, [token]);

  const filteredSales = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return installmentSales.filter(sale => {
      const matchesSearch =
        !q ||
        String(sale.id ?? '').includes(q) ||
        (sale.customerFullName && sale.customerFullName.toLowerCase().includes(q)) ||
        (sale.itemsSummary && sale.itemsSummary.toLowerCase().includes(q)) ||
        (sale.phoneModel && sale.phoneModel.toLowerCase().includes(q)) ||
        (sale.phoneImei && sale.phoneImei.includes(q));
      const matchesStatus = !statusFilter || sale.overallStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [installmentSales, searchTerm, statusFilter]);

  const statusChips = useMemo(() => {
    const counts: Record<string, number> = { '': installmentSales.length };
    for (const s of STATUS_OPTIONS) counts[s] = installmentSales.filter((x) => x.overallStatus === s).length;
    return [
      { key: '', label: 'همه', icon: 'fa-solid fa-layer-group', count: counts[''] },
      ...STATUS_OPTIONS.map((s) => ({
        key: s,
        label: s,
        icon: s === 'معوق' ? 'fa-solid fa-triangle-exclamation' : s === 'تکمیل شده' ? 'fa-solid fa-check-circle' : 'fa-solid fa-hourglass-half',
        count: counts[s],
      })),
    ];
  }, [installmentSales]);

  const summary = useMemo(() => {
    const all = installmentSales || [];
    const filtered = filteredSales || [];

    const sum = (arr: any[], key: string) =>
      arr.reduce((s, x) => s + (Number((x as any)?.[key] ?? 0) || 0), 0);

    const totalAmountAll = sum(all, 'totalInstallmentPrice');
    const totalAmountFiltered = sum(filtered, 'totalInstallmentPrice');

    const overdueAll = all.filter((s: any) => s.overallStatus === 'معوق').length;
    const activeAll = all.filter((s: any) => s.overallStatus === 'در حال پرداخت').length;
    const doneAll = all.filter((s: any) => s.overallStatus === 'تکمیل شده').length;

    const nextDueSoon = all.filter((s: any) => {
      if (!s?.nextDueDate) return false;
      const d = new Date(s.nextDueDate);
      const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && s.overallStatus !== 'تکمیل شده';
    }).length;

    return {
      totalAmountAll,
      totalAmountFiltered,
      overdueAll,
      activeAll,
      doneAll,
      nextDueSoon,
    };
  }, [installmentSales, filteredSales]);



  
  const exportFilenameBase = `installments-${new Date().toISOString().slice(0, 10)}`;

  const exportRows = filteredSales.map((s) => ({
    id: s.id,
    customer: s.customerFullName ?? '—',
    items: s.itemsSummary ?? s.phoneModel ?? '—',
    total: s.totalAmount ?? s.grandTotal ?? s.totalPrice ?? '',
    status: s.overallStatus ?? '',
    nextDue: s.nextDueDate ? formatIsoToShamsi(s.nextDueDate) : '',
    nextAmount: s.nextInstallmentAmount ?? '',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportFilenameBase}.xlsx`,
      exportRows,
      [
        { header: 'شناسه', key: 'id' },
        { header: 'مشتری', key: 'customer' },
        { header: 'اقلام', key: 'items' },
        { header: 'مبلغ کل', key: 'total' },
        { header: 'وضعیت کلی', key: 'status' },
        { header: 'قسط بعدی', key: 'nextDue' },
        { header: 'مبلغ قسط بعدی', key: 'nextAmount' },
      ],
      'Installments',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportFilenameBase}.pdf`,
      title: 'فروش‌های اقساطی',
      head: ['شناسه', 'مشتری', 'اقلام', 'مبلغ', 'وضعیت'],
      body: exportRows.map((x) => [
        Number(x.id ?? 0).toLocaleString('fa-IR'),
        x.customer,
        x.items,
        x.total ? Number(x.total).toLocaleString('fa-IR') : '—',
        x.status,
      ]),
    });
  };
const formatPrice = (price: number | undefined | null) =>
    price == null ? '-' : formatCurrencyText(price, readStoredCurrencyUnit());

  const handleDeleteSale = async (saleId: number) => {
    if (!token) return;
    const ok = await confirmAction({ title: 'حذف مورد فروش اقساطی', description: 'این فروش حذف مورد می‌شود و اقساط، چک‌ها و وضعیت اقلام مرتبط به حالت قبل برمی‌گردد.', confirmText: 'بله، حذف مورد شود', tone: 'danger', iconClass: 'fa-solid fa-trash-can' });
    if (!ok) return;
    setNotification(null);
    try {
      const res = await fetch(`/api/installment-sales/${saleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در حذف مورد فروش اقساطی');
      setInstallmentSales(prev => prev.filter(s => s.id !== saleId));
      setNotification({ type: 'success', text: json.message || 'فروش اقساطی حذف مورد شد.' });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطا در حذف مورد فروش اقساطی' });
    }
  };

  return (
    <PageKit
      title="فروش اقساطی"
      subtitle="مدیریت قراردادها، پیگیری سررسیدها، ثبت اطلاعات پرداخت‌ها و دسترسی سریع به پرونده‌های اقساطی"
      icon={<i className="fa-solid fa-file-invoice-dollar" />}
      query={searchTerm}
      onQueryChange={setSearchTerm}
      searchPlaceholder="جستجو (مشتری، اقلام، سریال، شناسه)…"
      toolbarRight={
        <>
          <ExportMenu
            items={[
              { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredSales.length === 0 },
              { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredSales.length === 0 },
              { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#installments-print-area', { title: 'فروش‌های اقساطی' }), disabled: filteredSales.length === 0 },
            ]}
          />
          <Button
            onClick={() => navigate('/installment-sales/new')}
            variant="primary"
            className="h-11 px-4 rounded-2xl shrink-0 whitespace-nowrap"
            leftIcon={<i className="fa-solid fa-plus" />}
          >
            ثبت اطلاعات جدید
          </Button>
        </>
      }
      secondaryRow={
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Notification message={notification} onClose={() => setNotification(null)} />
          <div className="flex-1">
            <FilterChipsBar chips={statusChips} value={statusFilter} onChange={(k) => setStatusFilter(k as any)} />
          </div>
        </div>
      }
    >

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <div className="text-xs text-muted">
            {filteredSales.length.toLocaleString('fa-IR')} نتیجه • {installmentSales.length.toLocaleString('fa-IR')} کل
          </div>
          <Button
            type="button"
            onClick={() => { setSearchTerm(''); setStatusFilter('معوق' as any); }}
            variant="secondary"
            size="sm"
            className="h-10 px-3 rounded-2xl text-xs"
            leftIcon={<i className="fa-solid fa-triangle-exclamation" />}
          >
            نمایش معوق‌ها
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="app-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text">مبلغ کل</div>
                <div className="text-[11px] text-muted">جمع کل قراردادها</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary-700 dark:text-primary-200 flex items-center justify-center">
                <i className="fa-solid fa-sack-dollar" />
              </div>
            </div>
            <div className="mt-2 text-lg font-black text-text">{formatPrice(summary.totalAmountAll)}</div>
            {searchTerm || statusFilter ? (
              <div className="mt-1 text-xs text-muted">
                فیلترشده: <span className="font-semibold text-text">{formatPrice(summary.totalAmountFiltered)}</span>
              </div>
            ) : null}
          </div>

          <div className="app-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text">در حال پرداخت</div>
                <div className="text-[11px] text-muted">فروش‌های فعال</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-200 flex items-center justify-center">
                <i className="fa-solid fa-rotate" />
              </div>
            </div>
            <div className="mt-2 text-lg font-black text-text">{summary.activeAll.toLocaleString('fa-IR')}</div>
            <div className="mt-1 text-xs text-muted">تکمیل‌شده: {summary.doneAll.toLocaleString('fa-IR')}</div>
          </div>

          <div className="app-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text">معوق</div>
                <div className="text-[11px] text-muted">نیازمند پیگیری</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-200 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
            </div>
            <div className="mt-2 text-lg font-black text-text">{summary.overdueAll.toLocaleString('fa-IR')}</div>
            <div className="mt-1 text-xs text-muted">۷ روز آینده: {summary.nextDueSoon.toLocaleString('fa-IR')}</div>
          </div>

          <div className="app-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text">سررسید نزدیک</div>
                <div className="text-[11px] text-muted">یادآوری اقساط</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 flex items-center justify-center">
                <i className="fa-solid fa-bell" />
              </div>
            </div>
            <div className="mt-2 text-lg font-black text-text">{summary.nextDueSoon.toLocaleString('fa-IR')}</div>
            <div className="mt-1 text-xs text-muted">برای ۷ روز آینده</div>
          </div>
        </div>
      </div>
      <div className="bg-surface text-text dark:shadow-none border border-primary/10 rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Button
            type="button"
            onClick={() => setTab('main')}
            variant={tab === 'main' ? 'primary' : 'secondary'}
            size="sm"
            className="rounded-xl text-sm"
            leftIcon={<i className="fa-solid fa-file-invoice-dollar" />}
          >
            لیست اقساط
          </Button>
          <Button
            type="button"
            onClick={() => setTab('telegram')}
            variant={tab === 'telegram' ? 'primary' : 'secondary'}
            size="sm"
            className="rounded-xl text-sm"
            leftIcon={<i className="fa-brands fa-telegram" />}
          >
            ارسال‌های تلگرام
          </Button>
        </div>

        {tab === 'telegram' ? (
          <TelegramTopicPanel
            topic="installments"
            title="ارسال‌های تلگرام (اقساط)"
            allowedTypes={[
              { key: 'INSTALLMENT_DUE_7', label: 'یادآوری ۷ روز مانده' },
              { key: 'INSTALLMENT_DUE_3', label: 'یادآوری ۳ روز مانده' },
              { key: 'INSTALLMENT_DUE_TODAY', label: 'سررسید امروز' },
              { key: 'INSTALLMENT_REMINDER', label: 'یادآوری دستی/عمومی' },
              { key: 'INSTALLMENT_COMPLETED', label: 'تسویه کامل اقساط' },
            ]}
          />
        ) : (
          <>
            {!isLoading && (
              <div className="mt-3 text-xs text-muted">
                {filteredSales.length.toLocaleString('fa-IR')} نتیجه از {installmentSales.length.toLocaleString('fa-IR')}
              </div>
            )}

            {isLoading ? (
              <div className="mt-4">
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-black/10 text-sm dark:divide-white/10">
                    <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                      <tr className="text-right">
                        {['شناسه','مشتری','اقلام','مبلغ کل','قسط بعدی / وضعیت','وضعیت کلی','عملیات'].map((h) => (
                          <th key={h} className="px-4 py-3 font-semibold text-text">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 dark:divide-white/10">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3"><Skeleton tone="warning" className="h-5 w-16" rounded="lg" /></td>
                          <td className="px-4 py-3"><Skeleton tone="warning" className="h-5 w-32" rounded="lg" /></td>
                          <td className="px-4 py-3"><Skeleton tone="warning" className="h-5 w-56" rounded="lg" /></td>
                          <td className="px-4 py-3"><Skeleton tone="warning" className="h-5 w-28" rounded="lg" /></td>
                          <td className="px-4 py-3"><Skeleton tone="warning" className="h-5 w-32" rounded="lg" /></td>
                          <td className="px-4 py-3"><Skeleton tone="warning" className="h-6 w-24" rounded="xl" /></td>
                          <td className="px-4 py-3"><Skeleton tone="warning" className="h-9 w-40" rounded="xl" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 md:hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="app-card space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        <Skeleton tone="warning" className="h-5 w-28" rounded="lg" />
                        <Skeleton tone="warning" className="h-6 w-24" rounded="xl" />
                      </div>
                      <Skeleton tone="warning" className="h-5 w-56" rounded="lg" />
                      <Skeleton tone="warning" className="h-5 w-40" rounded="lg" />
                      <div className="pt-2">
                        <Skeleton tone="warning" className="h-9 w-36" rounded="xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredSales.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="موردی پیدا نشد"
              description={(searchTerm || statusFilter) ? 'برای نمایش نتایج، معیار جستجو یا فیلترها را بازبینی کنید.' : 'هنوز قراردادی ثبت اطلاعات نشده است؛ از دکمه ثبت اطلاعات جدید برای شروع استفاده کنید.'}
              actionLabel={(searchTerm || statusFilter) ? 'پاک کردن فیلترها' : undefined}
              onAction={(searchTerm || statusFilter) ? () => { setSearchTerm(''); setStatusFilter(''); } : undefined}
              iconClass="fa-solid fa-file-invoice-dollar"
            />
          </div>
        ) : (
          <div id="installments-print-area">
            {/* Desktop/tablet: جدول کامل */}
            <div className="ux-table-shell mt-3 hidden md:block">
              <div className="ux-table-shell__body">
              <table className="min-w-full divide-y divide-primary/10 text-sm">
                <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90">
                  <tr className="text-right">
                    <th className="px-4 py-3 font-semibold">شناسه</th>
                    <th className="px-4 py-3 font-semibold">مشتری</th>
                    <th className="px-4 py-3 font-semibold">اقلام</th>
                    <th className="px-4 py-3 font-semibold">مبلغ کل</th>
                    <th className="px-4 py-3 font-semibold">قسط بعدی / وضعیت</th>
                    <th className="px-4 py-3 font-semibold">وضعیت کلی</th>
                    <th className="px-4 py-3 font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-primary/10">
                  {filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap font-medium">
                        {sale.id ? sale.id.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{sale.customerFullName}</td>
                      <td className="px-4 py-2">
                        {sale.itemsSummary ? (
                          <span className="text-sm">{sale.itemsSummary}</span>
                        ) : sale.phoneModel ? (
                          <>
                            {sale.phoneModel}{' '}
                            {sale.phoneImei ? <span className="text-xs text-muted">({sale.phoneImei})</span> : null}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-primary-600 font-semibold">
                        {formatPrice(sale.totalInstallmentPrice)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {sale.overallStatus === 'تکمیل شده'
                          ? <StatusPill status="تکمیل شده" />
                          : sale.nextDueDate
                            ? formatIsoToShamsi(sale.nextDueDate)
                            : '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <StatusPill status={sale.overallStatus} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="installment-table-actions flex flex-wrap items-center gap-2">
                          <Link
                            to={`/installment-sales/${sale.id}`}
                            className="finance-table-action finance-table-action--view"
                            data-no-tooltip="true"
                          >
                            <span className="ux-btn__content">
                              <span className="ux-btn__icon"><i className="fa-solid fa-eye" /></span>
                              <span>مشاهده</span>
                            </span>
                          </Link>
                          <Link
                            to={`/installment-sales/${sale.id}?pay=next`}
                            className="finance-table-action finance-table-action--payment"
                            data-no-tooltip="true"
                          >
                            <span className="ux-btn__content">
                              <span className="ux-btn__icon"><i className="fa-solid fa-hand-holding-dollar" /></span>
                              <span>قسط بعدی</span>
                            </span>
                          </Link>
                          <Button
                            onClick={() => handleDeleteSale(sale.id!)}
                            variant="danger"
                            size="xs"
                            className="finance-table-action finance-table-action--danger"
                            data-no-tooltip="true"
                            leftIcon={<i className="fa-solid fa-trash" />}
                          >
                            حذف مورد
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Mobile: کارت‌ها */}
            <div className="md:hidden mt-3 space-y-3">
              {filteredSales.map(sale => (
                <div
                  key={sale.id}
                  className="rounded-xl border border-primary/15 bg-white/70 dark:bg-black/30 backdrop-blur-sm p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">
                      #{sale.id?.toLocaleString('fa-IR')}{' '}
                      <span className="text-muted font-normal">— {sale.customerFullName}</span>
                    </div>
                    <StatusPill status={sale.overallStatus} />
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">اقلام:</span>
                      <span className="font-medium text-right">
                        {sale.itemsSummary ? (
                          sale.itemsSummary
                        ) : sale.phoneModel ? (
                          <>
                            {sale.phoneModel}
                            {sale.phoneImei ? <span className="text-xs text-muted"> ({sale.phoneImei})</span> : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">مبلغ کل:</span>
                      <span className="font-semibold text-primary-700">{formatPrice(sale.totalInstallmentPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">قسط بعدی/وضعیت:</span>
                      <span className="font-medium">
                        {sale.overallStatus === 'تکمیل شده'
                          ? 'تکمیل'
                          : sale.nextDueDate
                            ? formatIsoToShamsi(sale.nextDueDate)
                            : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="installment-card-actions mt-3 flex items-center justify-end gap-2">
                    <Link
                      to={`/installment-sales/${sale.id}`}
                      className="finance-table-action finance-table-action--view"
                      data-no-tooltip="true"
                    >
                      <span className="ux-btn__content">
                        <span className="ux-btn__icon"><i className="fa-solid fa-eye" /></span>
                        <span>مشاهده</span>
                      </span>
                    </Link>
                    <Link
                      to={`/installment-sales/${sale.id}?pay=next`}
                      className="finance-table-action finance-table-action--payment"
                      data-no-tooltip="true"
                    >
                      <span className="ux-btn__content">
                        <span className="ux-btn__icon"><i className="fa-solid fa-hand-holding-dollar" /></span>
                        <span>قسط بعدی</span>
                      </span>
                    </Link>
                    <Button
                      onClick={() => handleDeleteSale(sale.id!)}
                      variant="danger"
                      size="sm"
                      className="finance-table-action finance-table-action--danger"
                      data-no-tooltip="true"
                      leftIcon={<i className="fa-solid fa-trash" />}
                    >
                      حذف مورد
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

          </>
        )}
      </div>
    </PageKit>
  );
};

export default InstallmentSalesPage;
