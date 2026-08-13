import { formatExactNumberText } from '../../../utils/exactNumber';
import { IconGlyph } from '@/components/ui';
import { useMemo } from 'react';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';
import { MlOperatorCopyButton } from './MlOperatorCopyButton';

const sourceLabels: Record<MlOperatorOverviewRouteKey, string> = {
  comparisonSummaries: 'مقایسه‌ها',
  importReceipts: 'رسیدهای ورود',
  receiptExports: 'خروجی رسیدها',
  exportPackages: 'بسته‌های خروجی',
  packageSnapshots: 'اسنپ‌شات‌ها',
};

const stateLabels: Record<MlOperatorRouteResult['state'], string> = {
  ready: 'دارای داده',
  empty: 'خالی',
  unauthorized: 'محدود دسترسی',
  unavailable: 'در دسترس نیست',
  error: 'دارای خطا',
};

const toFaNumber = (value: number): string => formatExactNumberText(value);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const firstText = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

const safeDateValue = (value: unknown): string | null => {
  const candidate = firstText(value);
  if (!candidate) return null;
  const time = new Date(candidate).getTime();
  return Number.isFinite(time) ? candidate : null;
};

const formatDateTime = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const extractId = (item: unknown, source: MlOperatorRouteResult): string | null => {
  if (!isRecord(item)) return source.latestId;
  return firstText(
    item.id,
    item.summaryId,
    item.summaryKey,
    item.receiptId,
    item.exportId,
    item.packageId,
    item.snapshotId,
    item.candidatePackageId,
    source.latestId,
  );
};

const extractChecksum = (item: unknown, source: MlOperatorRouteResult): string | null => {
  if (!isRecord(item)) return source.latestChecksum;
  return firstText(
    item.checksum,
    item.contentHash,
    item.receiptHash,
    item.importPayloadHash,
    item.exportPayloadHash,
    item.packageHash,
    item.snapshotHash,
    source.latestChecksum,
  );
};

const extractStatus = (item: unknown, source: MlOperatorRouteResult): string => {
  if (!isRecord(item)) return stateLabels[source.state];
  return firstText(item.status, item.comparisonStatus, item.exportStatus, item.snapshotStatus, stateLabels[source.state]) || stateLabels[source.state];
};

const extractTimestamp = (item: unknown, source: MlOperatorRouteResult): string => {
  if (isRecord(item)) {
    return (
      safeDateValue(item.createdAt) ||
      safeDateValue(item.updatedAt) ||
      safeDateValue(item.exportedAt) ||
      safeDateValue(item.generatedAt) ||
      safeDateValue(item.timestamp) ||
      source.fetchedAt
    );
  }
  return source.fetchedAt;
};

type MlOperatorTimelineItem = {
  key: string;
  source: MlOperatorRouteResult;
  item: unknown;
  index: number;
  sourceLabel: string;
  id: string | null;
  checksum: string | null;
  status: string;
  timestamp: string;
  sortTime: number;
  description: string;
};

const buildTimelineItems = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): MlOperatorTimelineItem[] => {
  const visibleKeys = new Set(visibleSourceKeys);
  return sources
    .filter((source) => visibleKeys.has(source.key))
    .flatMap((source) => {
      const baseItems = source.items.length > 0 ? source.items : [source.summary ?? { state: source.state, message: source.message, statusCode: source.statusCode, fetchedAt: source.fetchedAt }];
      return baseItems.map((item, index) => {
        const id = extractId(item, source);
        const checksum = extractChecksum(item, source);
        const timestamp = extractTimestamp(item, source);
        const sourceLabel = sourceLabels[source.key] || source.label;
        const description = source.items.length > 0 ? `رکورد ${toFaNumber(index + 1)} از ${sourceLabel}` : `آخرین وضعیت خواندنی ${sourceLabel}`;
        return {
          key: `${source.key}-${index}-${id || checksum || timestamp}`,
          source,
          item,
          index,
          sourceLabel,
          id,
          checksum,
          status: extractStatus(item, source),
          timestamp,
          sortTime: new Date(timestamp).getTime() || 0,
          description,
        };
      });
    })
    .sort((left, right) => right.sortTime - left.sortTime);
};

export function MlOperatorTimelinePanel({
  sources,
  visibleSourceKeys,
  fetchedAt,
  totalReturnedItems,
  onOpenDetail,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  fetchedAt: string;
  totalReturnedItems: number;
  onOpenDetail: (source: MlOperatorRouteResult, item: unknown, index: number) => void;
}) {
  const timelineItems = useMemo(() => buildTimelineItems(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const visibleItems = timelineItems.slice(0, 8);
  const warningCount = sources.filter((source) => !['ready', 'empty'].includes(source.state)).length;
  const readyCount = sources.filter((source) => source.state === 'ready').length;

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-timeline-anchor="read-only-inspection-history"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-timeline" />
              رهگیری زمانی خواندنی
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-primary/20">
              <i className="fa-solid fa-clock-rotate-left" />
              تاریخچه بررسی فراداده
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">نمای زمانی آخرین بررسی‌ها</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این بخش از پاسخ خواندنی فعلی ساخته می‌شود و هیچ سابقه، یادداشت یا نتیجه‌ای را در سرور یا مرورگر ذخیره نمی‌کند.
          </p>
        </div>

        <div className="grid min-w-full gap-2 sm:grid-cols-3 xl:min-w-[520px]">
          <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
            <div className="text-lg font-black text-slate-950 dark:text-white">{toFaNumber(visibleItems.length)}</div>
            <div className="mt-1 text-[11px] font-black text-slate-400">رویداد قابل نمایش</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
            <div className="text-lg font-black text-slate-950 dark:text-white">{toFaNumber(readyCount)}</div>
            <div className="mt-1 text-[11px] font-black text-slate-400">منبع آماده</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
            <div className="text-lg font-black text-slate-950 dark:text-white">{toFaNumber(warningCount)}</div>
            <div className="mt-1 text-[11px] font-black text-slate-400">نیازمند توجه</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-black text-slate-900 dark:text-white">
            <i className="fa-solid fa-shield-halved ml-2 text-slate-400" />
            خلاصه ایمنی مشاهده
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">آخرین دریافت: {formatDateTime(fetchedAt)}</div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-lock ml-2 text-slate-400" />
            تاریخچه از داده‌های موجود ساخته شده و مسیر جدیدی فراخوانی نمی‌کند.
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-eye ml-2 text-slate-400" />
            {toFaNumber(totalReturnedItems)} رکورد خوانده‌شده مبنای این نمای زمانی است.
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-ban ml-2 text-slate-400" />
            کنترل اجرایی، ذخیره‌سازی یا تغییر اطلاعات عملیاتی در این بخش وجود ندارد.
          </div>
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <div className="mt-4 space-y-3">
          {visibleItems.map((event) => (
            <article key={event.key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <IconGlyph tone="neutral" className="mt-1 h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-circle-dot" /></IconGlyph>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">{event.sourceLabel}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                        {event.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{event.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-400">
                      <span>
                        <i className="fa-solid fa-calendar-day ml-1" />
                        {formatDateTime(event.timestamp)}
                      </span>
                      {event.id ? <span className="max-w-[240px] truncate">شناسه: {event.id}</span> : null}
                      {event.checksum ? <span className="max-w-[240px] truncate">هش: {event.checksum}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <MlOperatorCopyButton value={event.id} label="کپی شناسه" />
                  <MlOperatorCopyButton value={event.checksum} label="کپی هش" />
                  <button
                    type="button"
                    onClick={() => onOpenDetail(event.source, event.item, event.index)}
                    className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                  >
                    <i className="fa-solid fa-eye" />
                    مشاهده جزئیات
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">رویداد خواندنی برای نمایش وجود ندارد</div>
          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">فیلترهای فعلی هیچ منبعی برای ساخت نمای زمانی باقی نگذاشته‌اند.</div>
        </div>
      )}
    </section>
  );
}
