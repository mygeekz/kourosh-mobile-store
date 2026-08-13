import {
  ActionBar,
  AppSearchField,
  Button,
  DataTableShell,
  ResponsiveFilterBar,
  SelectField,
} from '@/components/ui';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import FilterChipsBar from '../../components/FilterChipsBar';
import FinancialStatusBadge from '../../components/FinancialStatusBadge';
import Notification from '../../components/Notification';
import ModernReportShell from '../../components/reports/ModernReportShell';
import PremiumStatCard from '../../components/reports/PremiumStatCard';
import ReportFilterField from '../../components/reports/ReportFilterField';
import { useAuth } from '../../contexts/AuthContext';
import { InventoryVelocityAnalysis, NotificationMessage, VelocityItem } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { formatExactNumberText } from '../../utils/exactNumber';
import { formatReportRatioText } from '../../utils/reportPresentation';

const fmt = (num: number, digits: number = 2) => formatReportRatioText(num ?? 0, digits);

const columnHelper = createColumnHelper<VelocityItem>();

type TabKey = 'hot' | 'normal' | 'stale';

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const InventoryAnalysisReport: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<InventoryVelocityAnalysis | null>(null);
  const [tab, setTab] = useState<TabKey>('hot');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'phone' | 'inventory'>('all');
  const didAutoTab = useRef(false);

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/reports/analysis');
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const response = await apiFetch('/api/analysis/inventory-velocity');
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش انبار');
        setData(json.data || null);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'خطا در عملیاتی نامشخص';
        setNotification({ type: 'error', text: message });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchReport();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!data || didAutoTab.current) return;
    didAutoTab.current = true;
    const hot = data.hotItems?.length ?? 0;
    const normal = data.normalItems?.length ?? 0;
    const stale = data.staleItems?.length ?? 0;
    if (tab === 'hot' && hot === 0) {
      if (normal > 0) setTab('normal');
      else if (stale > 0) setTab('stale');
    }
  }, [data, tab]);

  const rows: VelocityItem[] = useMemo(() => {
    if (!data) return [];
    if (tab === 'hot') return data.hotItems || [];
    if (tab === 'stale') return data.staleItems || [];
    return data.normalItems || [];
  }, [data, tab]);

  const filteredRows = useMemo(
    () => rows.filter((row) => (itemTypeFilter === 'all' ? true : row.itemType === itemTypeFilter)),
    [rows, itemTypeFilter],
  );

  const totals = useMemo(() => {
    const hot = data?.hotItems?.length ?? 0;
    const normal = data?.normalItems?.length ?? 0;
    const stale = data?.staleItems?.length ?? 0;
    const all = (data?.hotItems ?? []).concat(data?.normalItems ?? [], data?.staleItems ?? []);
    const avg = all.length ? all.reduce((sum, row) => sum + (row.salesPerDay ?? 0), 0) / all.length : 0;
    const max = all.reduce((currentMax, row) => Math.max(currentMax, row.salesPerDay ?? 0), 0);
    return { hot, normal, stale, avg, max, allCount: all.length };
  }, [data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('itemName', {
        header: 'کالا/محصول',
        cell: (info) => <span className="font-semibold text-text">{info.getValue()}</span>,
      }),
      columnHelper.accessor('salesPerDay', {
        header: 'سرعت فروش روزانه',
        cell: (info) => <span dir="ltr">{fmt(info.getValue(), 2)}</span>,
      }),
      columnHelper.accessor('classification', {
        header: 'وضعیت',
        cell: (info) => {
          const value = info.getValue();
          return (
            <FinancialStatusBadge
              label={value}
              tone={value === 'پرفروش (داغ)' ? 'success' : value === 'کم‌فروش (راکد)' ? 'danger' : 'neutral'}
              icon={value === 'پرفروش (داغ)' ? 'fa-solid fa-fire' : value === 'کم‌فروش (راکد)' ? 'fa-solid fa-box-archive' : 'fa-solid fa-gauge'}
              size="xs"
            />
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue ?? '').trim();
      if (!query) return true;
      return String(row.original.itemName ?? '').includes(query);
    },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [itemTypeFilter, search, tab, table]);

  const handleExport = () => {
    const exportRows = table.getFilteredRowModel().rows.map((row) => row.original);
    if (!exportRows.length) return;
    downloadCsv(
      'inventory_velocity.csv',
      exportRows.map((item) => ({
        itemName: item.itemName,
        salesPerDay: item.salesPerDay,
        classification: item.classification,
        itemType: item.itemType,
      })),
    );
  };

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(table.getPageCount(), 1);

  if (currentUser && currentUser.roleName === 'Salesperson') return null;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ModernReportShell
        title="سلامت موجودی"
        subtitle="بر اساس سرعت فروش، کالاها به داغ، عادی و راکد تقسیم می‌شوند تا خرید و چیدمان انبار دقیق‌تر باشد."
        icon="fa-solid fa-boxes-stacked"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleExport}
              variant="secondary"
              size="sm"
              leftIcon={<i className="fa-solid fa-file-csv" />}
              disabled={filteredCount === 0}
            >
              خروجی CSV
            </Button>
            <Button
              type="button"
              onClick={() => window.print()}
              variant="secondary"
              size="sm"
              leftIcon={<i className="fa-solid fa-print" />}
            >
              چاپ
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/reports/analysis')}
              variant="secondary"
              size="sm"
              leftIcon={<i className="fa-solid fa-arrow-right" />}
            >
              بازگشت
            </Button>
          </div>
        )}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PremiumStatCard
            label="کل کالاهای تحلیل‌شده"
            value={formatExactNumberText(totals.allCount ?? 0)}
            icon={<i className="fa-solid fa-layer-group" />}
            tone="info"
          />
          <PremiumStatCard
            label="میانگین سرعت فروش"
            value={fmt(totals.avg, 2)}
            icon={<i className="fa-solid fa-gauge-high" />}
            hint="واحد: عدد در روز"
            tone="neutral"
          />
          <PremiumStatCard
            label="بیشترین سرعت فروش"
            value={fmt(totals.max, 2)}
            icon={<i className="fa-solid fa-fire" />}
            hint="واحد: عدد در روز"
            tone="good"
          />
          <PremiumStatCard
            label="تمرکز خرید پیشنهادی"
            value={tab === 'hot' ? 'کالاهای داغ' : tab === 'stale' ? 'کالاهای راکد' : 'کالاهای عادی'}
            icon={<i className="fa-solid fa-bullseye" />}
            tone={tab === 'hot' ? 'good' : tab === 'stale' ? 'warn' : 'neutral'}
          />
        </div>

        <ResponsiveFilterBar
          search={(
            <ReportFilterField
              label="جستجو"
              icon={<i className="fa-solid fa-magnifying-glass" />}
              grow
              minWidthClassName="basis-full min-w-0"
            >
              <AppSearchField
                value={search}
                onChange={setSearch}
                placeholder="جستجو در نام کالا..."
                ariaLabel="جستجو در گزارش سلامت موجودی"
                size="md"
              />
            </ReportFilterField>
          )}
          filters={(
            <ReportFilterField
              label="نوع موجودی"
              icon={<i className="fa-solid fa-box" />}
              minWidthClassName="basis-full sm:basis-[13rem] sm:min-w-[13rem]"
            >
              <SelectField
                controlOnly
                value={itemTypeFilter}
                onChange={(event) => setItemTypeFilter(event.target.value as 'all' | 'phone' | 'inventory')}
                aria-label="فیلتر نوع موجودی"
              >
                <option value="all">همه نوع‌ها</option>
                <option value="phone">گوشی</option>
                <option value="inventory">کالا</option>
              </SelectField>
            </ReportFilterField>
          )}
          secondaryRow={(
            <FilterChipsBar
              value={tab}
              onChange={(key) => setTab(key as TabKey)}
              chips={[
                { key: 'hot', label: 'پرفروش (داغ)', count: totals.hot, icon: 'fa-solid fa-fire' },
                { key: 'normal', label: 'عادی', count: totals.normal, icon: 'fa-solid fa-gauge' },
                { key: 'stale', label: 'کم‌فروش (راکد)', count: totals.stale, icon: 'fa-solid fa-box-archive' },
              ]}
            />
          )}
        />

        <DataTableShell
          title="ریز سرعت فروش"
          subtitle={`نمایش ${formatExactNumberText(filteredCount)} ردیف پس از اعمال فیلترها`}
          headerLayout="compact"
          data-ui-inventory-analysis-table="true"
        >
          {isLoading ? (
            <div className="p-6 text-sm text-muted">در حال دریافت اطلاعات…</div>
          ) : filteredCount === 0 ? (
            <div className="p-6 text-sm text-muted">داده‌ای برای نمایش وجود ندارد.</div>
          ) : (
            <table
              className="report-table ux-data-table w-full"
              data-ui-table="true"
              data-ui-table-layout="managed"
              data-ui-table-density="comfortable"
            >
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="text-right">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody data-ui-table-body="true">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} data-ui-table-row="true">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} data-ui-table-cell="true">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTableShell>

        {filteredCount > 0 ? (
          <ActionBar
            ariaLabel="صفحه‌بندی گزارش سلامت موجودی"
            left={(
              <span className="text-xs text-muted">
                صفحه {formatExactNumberText(table.getState().pagination.pageIndex + 1)} از {formatExactNumberText(pageCount)}
              </span>
            )}
            right={(
              <>
                <Button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  variant="secondary"
                  size="sm"
                  leftIcon={<i className="fa-solid fa-chevron-right" />}
                >
                  قبلی
                </Button>
                <Button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  variant="secondary"
                  size="sm"
                  rightIcon={<i className="fa-solid fa-chevron-left" />}
                >
                  بعدی
                </Button>
              </>
            )}
          />
        ) : null}
      </ModernReportShell>
    </div>
  );
};

export default InventoryAnalysisReport;
