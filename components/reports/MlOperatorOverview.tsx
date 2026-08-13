import { formatExactNumberText } from '../../utils/exactNumber';
import { IconGlyph } from '@/components/ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchMlOperatorOverview,
  type MlOperatorOverviewResult,
  type MlOperatorRouteResult,
} from '../../services/mlOperatorOverviewApi';
import { MlOperatorStatusCards } from './mlOperator/MlOperatorCards';
import { MlOperatorDataPanel } from './mlOperator/MlOperatorPanels';
import { MlOperatorSafetyPanel } from './mlOperator/MlOperatorSafetyPanel';
import { MlOperatorTimelinePanel } from './mlOperator/MlOperatorTimelinePanel';
import { MlOperatorSourceHealthMatrix } from './mlOperator/MlOperatorSourceHealthMatrix';
import { MlOperatorSourceComparisonSnapshot } from './mlOperator/MlOperatorSourceComparisonSnapshot';
import { MlOperatorRiskAttentionQueue } from './mlOperator/MlOperatorRiskAttentionQueue';
import { MlOperatorManagerReviewChecklist } from './mlOperator/MlOperatorManagerReviewChecklist';
import { MlOperatorExecutiveSummarySnapshot } from './mlOperator/MlOperatorExecutiveSummarySnapshot';
import { MlOperatorExportReadinessBoard } from './mlOperator/MlOperatorExportReadinessBoard';
import { MlOperatorAccessVisibilityAssurance } from './mlOperator/MlOperatorAccessVisibilityAssurance';
import { MlOperatorFinalConsolidationLock } from './mlOperator/MlOperatorFinalConsolidationLock';
import { MlOperatorDetailDrawer, type MlOperatorDetailSelection } from './mlOperator/MlOperatorDetailDrawer';
import {
  MlOperatorFilterToolbar,
  type MlOperatorSourceFilter,
  type MlOperatorStatusFilter,
} from './mlOperator/MlOperatorFilterToolbar';
import {
  MlOperatorSavedViewsPanel,
  type MlOperatorSavedViewConfig,
  type MlOperatorSavedViewKey,
} from './mlOperator/MlOperatorSavedViewsPanel';

type MlOperatorOverviewProps = {
  token: string | null;
};

type LoadState = 'loading' | 'ready' | 'error';

const shamsiDateTime = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4" aria-label="در حال دریافت پایش هوشمند">
    <div className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="h-5 w-56 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-[24px] bg-slate-100 dark:bg-slate-900" />
      ))}
    </div>
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-right shadow-[0_18px_44px_-40px_rgba(190,18,60,0.42)] dark:border-rose-900/70 dark:bg-rose-950/25" dir="rtl">
    <div className="flex items-start gap-3">
      <IconGlyph tone="danger" className="h-11 w-11 shrink-0" aria-hidden="true"><i className="fa-solid fa-circle-exclamation" /></IconGlyph>
      <div className="min-w-0 flex-1">
        <div className="text-base font-black text-rose-900 dark:text-rose-100">دریافت نمای پایش کامل نشد</div>
        <p className="mt-2 text-sm leading-7 text-rose-700 dark:text-rose-200/80">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-rose-700 px-4 text-xs font-black text-white transition hover:-translate-y-0.5 dark:bg-rose-200 dark:text-rose-950"
        >
          <i className="fa-solid fa-rotate-right" />
          تلاش دوباره
        </button>
      </div>
    </div>
  </section>
);

const Header: React.FC<{ fetchedAt: string | null; onRefresh: () => void; refreshing: boolean }> = ({ fetchedAt, onRefresh, refreshing }) => (
  <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_54px_-46px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900/85">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
            <i className="fa-solid fa-eye" />
            فقط خواندنی
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-primary/20">
            <i className="fa-solid fa-user-shield" />
            ویژه مدیر و سرپرست
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">پایش هوشمند داده‌ها</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          نمای داخلی برای بررسی وضعیت فراداده‌های ذخیره‌شده، رسیدهای امن، بسته‌های خروجی و اسنپ‌شات‌ها بدون اجرای مدل یا تغییر اطلاعات فروشگاه.
        </p>
        {fetchedAt ? (
          <div className="mt-3 text-xs font-bold text-slate-400 dark:text-slate-500">آخرین بروزرسانی: {shamsiDateTime(fetchedAt)}</div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-5 text-sm font-black text-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
      >
        <i className={`fa-solid fa-rotate-right ${refreshing ? 'fa-spin' : ''}`} />
        بروزرسانی
      </button>
    </div>
  </section>
);

export default function MlOperatorOverview({ token }: MlOperatorOverviewProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [overview, setOverview] = useState<MlOperatorOverviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<MlOperatorDetailSelection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MlOperatorStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<MlOperatorSourceFilter>('all');
  const [pageSize, setPageSize] = useState(3);
  const [activeSavedViewKey, setActiveSavedViewKey] = useState<MlOperatorSavedViewKey | null>('allReadable');

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await fetchMlOperatorOverview(token);
      setOverview(result);
      setState('ready');
    } catch (loadError) {
      setState('error');
      setError(loadError instanceof Error ? loadError.message : 'خطای نامشخص در دریافت اطلاعات.');
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const sources = useMemo<MlOperatorRouteResult[]>(() => (overview ? Object.values(overview.sources) : []), [overview]);
  const sourceByKey = overview?.sources;

  const dataPanelConfigs = useMemo(
    () => [
      {
        key: 'comparisonSummaries' as const,
        title: 'خلاصه مقایسه کاندید و مبنا',
        description: 'آخرین فراداده مقایسه ذخیره‌شده را نشان می‌دهد؛ خروجی خام مدل یا کنترل اجرایی نمایش داده نمی‌شود.',
      },
      {
        key: 'importReceipts' as const,
        title: 'رسیدهای ورود امن',
        description: 'آخرین رسیدهای ثبت‌شده برای ورود فراداده را با وضعیت، هش و شمارش خطا/هشدار قابل مشاهده می‌کند.',
      },
      {
        key: 'exportPackages' as const,
        title: 'خروجی‌ها و بسته‌های انتشار داخلی',
        description: 'فراداده خروجی‌ها و بسته‌های ساخته‌شده برای ممیزی داخلی را بدون امکان دانلود اجرایی یا تغییر نمایش می‌دهد.',
      },
      {
        key: 'packageSnapshots' as const,
        title: 'اسنپ‌شات‌های بسته خروجی',
        description: 'آخرین اسنپ‌شات‌های ذخیره‌شده و هش‌های قابل تطبیق را برای کنترل سلامت زنجیره فراداده نشان می‌دهد.',
      },
      {
        key: 'receiptExports' as const,
        title: 'خروجی رسیدهای ثبت‌شده',
        description: 'نمای خواندنی خروجی رسیدها برای کنترل سازگاری فراداده و وضعیت تولید بسته‌های داخلی.',
      },
    ],
    [],
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredDataPanelConfigs = useMemo(() => {
    if (!sourceByKey) return [];
    return dataPanelConfigs.filter((config) => {
      const source = sourceByKey[config.key];
      if (!source) return false;
      if (sourceFilter !== 'all' && source.key !== sourceFilter) return false;
      if (statusFilter !== 'all' && source.state !== statusFilter) return false;
      if (!normalizedSearchQuery) return true;

      const searchableText = [
        config.title,
        config.description,
        source.label,
        source.latestId,
        source.latestChecksum,
        source.state,
        source.message,
        JSON.stringify(source.summary ?? {}),
        JSON.stringify(source.items ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [dataPanelConfigs, normalizedSearchQuery, sourceByKey, sourceFilter, statusFilter]);

  const updateSearchQuery = useCallback((value: string) => {
    setSearchQuery(value);
    setActiveSavedViewKey(null);
  }, []);

  const updateStatusFilter = useCallback((value: MlOperatorStatusFilter) => {
    setStatusFilter(value);
    setActiveSavedViewKey(null);
  }, []);

  const updateSourceFilter = useCallback((value: MlOperatorSourceFilter) => {
    setSourceFilter(value);
    setActiveSavedViewKey(null);
  }, []);

  const updatePageSize = useCallback((value: number) => {
    setPageSize(value);
    setActiveSavedViewKey(null);
  }, []);

  const showSavedView = useCallback((view: MlOperatorSavedViewConfig) => {
    setSearchQuery(view.query);
    setStatusFilter(view.statusFilter);
    setSourceFilter(view.sourceFilter);
    setPageSize(view.pageSize);
    setActiveSavedViewKey(view.key);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSourceFilter('all');
    setPageSize(3);
    setActiveSavedViewKey('allReadable');
  }, []);

  const openDetail = useCallback((source: MlOperatorRouteResult, item: unknown, index: number) => {
    setSelectedDetail({ source, item, index });
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedDetail(null);
  }, []);

  if (state === 'loading') return <LoadingSkeleton />;
  if (state === 'error') return <ErrorState message={error || 'امکان دریافت داده وجود ندارد.'} onRetry={load} />;
  if (!overview || !sourceByKey) return null;

  return (
    <div className="space-y-4" dir="rtl" data-ml-operator-overview-anchor="metadata-only-read-only">
      <Header fetchedAt={overview.fetchedAt} onRefresh={load} refreshing={refreshing} />

      <MlOperatorStatusCards sources={sources} />
      <MlOperatorSafetyPanel safety={overview.safety} />

      <MlOperatorFilterToolbar
        query={searchQuery}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        pageSize={pageSize}
        filteredSectionCount={filteredDataPanelConfigs.length}
        totalSectionCount={dataPanelConfigs.length}
        onQueryChange={updateSearchQuery}
        onStatusFilterChange={updateStatusFilter}
        onSourceFilterChange={updateSourceFilter}
        onPageSizeChange={updatePageSize}
        onReset={resetFilters}
      />

      <MlOperatorSavedViewsPanel
        activeViewKey={activeSavedViewKey}
        query={searchQuery}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        pageSize={pageSize}
        totalSectionCount={dataPanelConfigs.length}
        filteredSectionCount={filteredDataPanelConfigs.length}
        returnedItems={overview.totals.returnedItems}
        onSelectView={showSavedView}
      />

      <MlOperatorExecutiveSummarySnapshot
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        fetchedAt={overview.fetchedAt}
      />

      <MlOperatorSourceHealthMatrix
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        fetchedAt={overview.fetchedAt}
      />

      <MlOperatorSourceComparisonSnapshot
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        fetchedAt={overview.fetchedAt}
      />

      <MlOperatorExportReadinessBoard
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        onOpenDetail={openDetail}
      />

      <MlOperatorAccessVisibilityAssurance
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
      />

      <MlOperatorFinalConsolidationLock
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        fetchedAt={overview.fetchedAt}
      />

      <MlOperatorRiskAttentionQueue
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        onOpenDetail={openDetail}
      />

      <MlOperatorManagerReviewChecklist
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        onOpenDetail={openDetail}
      />

      <MlOperatorTimelinePanel
        sources={sources}
        visibleSourceKeys={filteredDataPanelConfigs.map((config) => config.key)}
        fetchedAt={overview.fetchedAt}
        totalReturnedItems={overview.totals.returnedItems}
        onOpenDetail={openDetail}
      />

      <section className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-2xl font-black text-slate-950 dark:text-white">{formatExactNumberText(overview.totals.readySources)}</div>
          <div className="mt-1 text-xs font-black text-slate-500 dark:text-slate-400">منبع دارای داده</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-2xl font-black text-slate-950 dark:text-white">{formatExactNumberText(overview.totals.emptySources)}</div>
          <div className="mt-1 text-xs font-black text-slate-500 dark:text-slate-400">منبع خالی</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-2xl font-black text-slate-950 dark:text-white">{formatExactNumberText(overview.totals.warningSources)}</div>
          <div className="mt-1 text-xs font-black text-slate-500 dark:text-slate-400">نیازمند بررسی دسترسی</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-2xl font-black text-slate-950 dark:text-white">{formatExactNumberText(overview.totals.returnedItems)}</div>
          <div className="mt-1 text-xs font-black text-slate-500 dark:text-slate-400">رکورد قابل مشاهده</div>
        </div>
      </section>

      {filteredDataPanelConfigs.length > 0 ? (
        filteredDataPanelConfigs.map((config) => (
          <MlOperatorDataPanel
            key={config.key}
            title={config.title}
            description={config.description}
            source={sourceByKey[config.key]}
            searchQuery={searchQuery}
            pageSize={pageSize}
            onOpenDetail={openDetail}
          />
        ))
      ) : (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/80">
          <IconGlyph tone="neutral" className="mx-auto h-12 w-12" aria-hidden="true"><i className="fa-solid fa-filter-circle-xmark" /></IconGlyph>
          <div className="mt-3 text-sm font-black text-slate-900 dark:text-white">هیچ بخشی با فیلتر فعلی پیدا نشد</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">عبارت جستجو، نوع بخش یا وضعیت را تغییر دهید تا داده‌های خواندنی دوباره نمایش داده شوند.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-xs font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
          >
            <i className="fa-solid fa-eraser" />
            پاکسازی فیلترها
          </button>
        </section>
      )}

      <MlOperatorDetailDrawer selection={selectedDetail} open={Boolean(selectedDetail)} onClose={closeDetail} />
    </div>
  );
}
