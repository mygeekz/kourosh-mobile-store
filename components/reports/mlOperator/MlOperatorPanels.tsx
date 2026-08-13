import { formatExactNumberText } from '../../../utils/exactNumber';
import { useEffect, useMemo, useState } from 'react';
import type { MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';
import { MlOperatorStatusChip } from './MlOperatorCards';
import { MlOperatorCopyButton } from './MlOperatorCopyButton';

const faNumber = (value: number): string => formatExactNumberText(value);

const summarizeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'number') return formatExactNumberText(value);
  if (typeof value === 'string') return value.length > 72 ? `${value.slice(0, 72)}…` : value;
  return 'فراداده ساختاری';
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const safeSearchText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return '';
  }
};

const pickPreviewFields = (item: unknown): Array<[string, string]> => {
  if (!isRecord(item)) return [];
  const preferred = ['summaryKey', 'receiptId', 'packageId', 'snapshotId', 'candidatePackageId', 'status', 'comparisonStatus', 'createdAt', 'contentHash', 'checksum'];
  return preferred
    .filter((key) => key in item)
    .slice(0, 5)
    .map((key) => [key, summarizeValue(item[key])]);
};

export function MlOperatorDataPanel({
  title,
  description,
  source,
  searchQuery = '',
  pageSize = 3,
  onOpenDetail,
}: {
  title: string;
  description: string;
  source: MlOperatorRouteResult;
  searchQuery?: string;
  pageSize?: number;
  onOpenDetail?: (source: MlOperatorRouteResult, item: unknown, index: number) => void;
}) {
  const [page, setPage] = useState(1);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const safePageSize = Math.max(1, pageSize);

  const filteredItems = useMemo(
    () =>
      source.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !normalizedQuery || safeSearchText(item).includes(normalizedQuery)),
    [normalizedQuery, source.items],
  );

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / safePageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * safePageSize;
  const previewItems = filteredItems.slice(startIndex, startIndex + safePageSize);
  const copyValue = source.latestChecksum || source.latestId;
  const sourceDetailItem = previewItems[0]?.item ?? source.summary ?? source.raw;
  const canOpenSourceDetail = Boolean(sourceDetailItem);
  const hasSearchMiss = source.items.length > 0 && normalizedQuery.length > 0 && filteredItems.length === 0;

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery, safePageSize, source.key, source.items.length]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black text-slate-950 dark:text-white">{title}</h2>
            <MlOperatorStatusChip state={source.state} />
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => sourceDetailItem && onOpenDetail?.(source, sourceDetailItem, previewItems[0]?.index ?? 0)}
            disabled={!canOpenSourceDetail}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <i className="fa-solid fa-magnifying-glass-chart" />
            بررسی جزئیات
          </button>
          <MlOperatorCopyButton value={copyValue} label="کپی شناسه امن" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
          <div className="text-[11px] font-black text-slate-400">تعداد برگشتی</div>
          <div className="mt-1 text-lg font-black text-slate-950 dark:text-white">{faNumber(source.count)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
          <div className="text-[11px] font-black text-slate-400">نتیجه مطابق جستجو</div>
          <div className="mt-1 text-lg font-black text-slate-950 dark:text-white">{faNumber(filteredItems.length)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
          <div className="text-[11px] font-black text-slate-400">شناسه آخر</div>
          <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{source.latestId || 'ثبت نشده'}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
          <div className="text-[11px] font-black text-slate-400">هش یا چک‌سام</div>
          <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{source.latestChecksum || 'ثبت نشده'}</div>
        </div>
      </div>

      {source.state === 'empty' ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">داده‌ای برای نمایش وجود ندارد</div>
          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">مسیر خواندنی پاسخ سالم داده اما رکوردی برنگردانده است.</div>
        </div>
      ) : null}

      {hasSearchMiss ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">رکوردی با این جستجو پیدا نشد</div>
          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">فیلتر فقط روی فراداده‌های خوانده‌شده همین بخش اعمال شده است.</div>
        </div>
      ) : null}

      {source.state !== 'ready' && source.state !== 'empty' ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-200">
          <i className="fa-solid fa-circle-exclamation ml-2" />
          {source.message || 'این بخش در حال حاضر قابل دریافت نیست.'}
        </div>
      ) : null}

      {previewItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          {previewItems.map(({ item, index }) => (
            <div key={`${source.key}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/35">
              <div className="mb-2 text-[11px] font-black text-slate-400">رکورد {faNumber(index + 1)}</div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {pickPreviewFields(item).length > 0 ? (
                  pickPreviewFields(item).map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{key}</div>
                      <div className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{value}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">فراداده خلاصه برای این ردیف محدود است.</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenDetail?.(source, item, index)}
                className="mt-3 inline-flex min-h-[36px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
              >
                <i className="fa-solid fa-eye" />
                مشاهده جزئیات
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {filteredItems.length > safePageSize ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-black text-slate-500 dark:text-slate-400">
            نمایش {faNumber(startIndex + 1)} تا {faNumber(Math.min(startIndex + previewItems.length, filteredItems.length))} از {faNumber(filteredItems.length)} رکورد
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
              className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <i className="fa-solid fa-angle-right" />
              صفحه قبل
            </button>
            <span className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
              {faNumber(currentPage)} / {faNumber(pageCount)}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage >= pageCount}
              className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              صفحه بعد
              <i className="fa-solid fa-angle-left" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
