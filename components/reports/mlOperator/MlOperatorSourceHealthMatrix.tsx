import { formatExactNumberText } from '../../../utils/exactNumber';
import { IconGlyph } from '@/components/ui';
import { useMemo } from 'react';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';
import { MlOperatorStatusChip } from './MlOperatorCards';
import { MlOperatorCopyButton } from './MlOperatorCopyButton';

const toFaNumber = (value: number): string => formatExactNumberText(value);

const formatDateTime = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const routeLabels: Record<MlOperatorOverviewRouteKey, string> = {
  comparisonSummaries: 'خلاصه مقایسه‌ها',
  importReceipts: 'رسیدهای ورود امن',
  receiptExports: 'خروجی رسیدها',
  exportPackages: 'بسته‌های خروجی',
  packageSnapshots: 'اسنپ‌شات‌های بسته',
};

const calculateFreshnessMinutes = (value: string): number | null => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  const diff = Date.now() - time;
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return (diff / 60000);
};

const formatFreshness = (minutes: number | null): string => {
  if (minutes === null) return 'نامشخص';
  if (minutes < 1) return 'کمتر از یک دقیقه';
  if (minutes < 60) return `${toFaNumber(minutes)} دقیقه`;
  const hours = (minutes / 60);
  if (hours < 24) return `${toFaNumber(hours)} ساعت`;
  return `${toFaNumber((hours / 24))} روز`;
};

const calculateHealthScore = (source: MlOperatorRouteResult): number => {
  if (source.state === 'ready') return Math.min(100, 84 + Math.min(source.count, 8) * 2 + (source.latestChecksum ? 2 : 0));
  if (source.state === 'empty') return 68;
  if (source.state === 'unauthorized') return 42;
  if (source.state === 'unavailable') return 34;
  return 24;
};

const healthLabel = (score: number): string => {
  if (score >= 85) return 'سالم';
  if (score >= 65) return 'قابل قبول';
  if (score >= 40) return 'نیازمند بررسی';
  return 'پرریسک';
};

type MatrixRow = {
  source: MlOperatorRouteResult;
  label: string;
  score: number;
  freshnessMinutes: number | null;
  freshnessLabel: string;
  issueSummary: string;
};

const buildMatrixRows = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): MatrixRow[] => {
  const visibleKeys = new Set(visibleSourceKeys);
  return sources
    .filter((source) => visibleKeys.has(source.key))
    .map((source) => {
      const score = calculateHealthScore(source);
      const freshnessMinutes = calculateFreshnessMinutes(source.fetchedAt);
      const issueSummary =
        source.state === 'ready'
          ? `${toFaNumber(source.count)} رکورد خواندنی با فراداده قابل بررسی`
          : source.state === 'empty'
            ? 'پاسخ معتبر است اما رکوردی برنگشته است'
            : source.message || 'این منبع نیازمند بررسی دسترسی یا پاسخ سرویس است';

      return {
        source,
        label: routeLabels[source.key] || source.label,
        score,
        freshnessMinutes,
        freshnessLabel: formatFreshness(freshnessMinutes),
        issueSummary,
      };
    })
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, 'fa'));
};

export function MlOperatorSourceHealthMatrix({
  sources,
  visibleSourceKeys,
  fetchedAt,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  fetchedAt: string;
}) {
  const matrixRows = useMemo(() => buildMatrixRows(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const readyRows = matrixRows.filter((row) => row.source.state === 'ready').length;
  const attentionRows = matrixRows.filter((row) => !['ready', 'empty'].includes(row.source.state)).length;
  const averageScore = matrixRows.length > 0 ? (matrixRows.reduce((sum, row) => sum + row.score, 0) / matrixRows.length) : 0;

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-source-health-anchor="read-only-source-health-matrix"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-table-cells-large" />
              ماتریس سلامت منابع
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-primary/20">
              <i className="fa-solid fa-shield-heart" />
              پایش فقط خواندنی
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">سلامت مسیرهای فراداده</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این ماتریس با همان داده‌های دریافت‌شده ساخته می‌شود و فقط وضعیت، تازگی، تعداد رکورد، شناسه و هش امن هر منبع را برای بررسی مدیریتی نشان می‌دهد.
          </p>
        </div>

        <div className="grid min-w-full gap-2 sm:grid-cols-3 xl:min-w-[520px]">
          <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
            <div className="text-lg font-black text-slate-950 dark:text-white">{toFaNumber(averageScore)}</div>
            <div className="mt-1 text-[11px] font-black text-slate-400">میانگین سلامت</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
            <div className="text-lg font-black text-slate-950 dark:text-white">{toFaNumber(readyRows)}</div>
            <div className="mt-1 text-[11px] font-black text-slate-400">منبع آماده</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
            <div className="text-lg font-black text-slate-950 dark:text-white">{toFaNumber(attentionRows)}</div>
            <div className="mt-1 text-[11px] font-black text-slate-400">نیازمند توجه</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-black text-slate-900 dark:text-white">
            <i className="fa-solid fa-lock ml-2 text-slate-400" />
            خلاصه ایمنی ماتریس
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">آخرین دریافت: {formatDateTime(fetchedAt)}</div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-eye ml-2 text-slate-400" />
            داده‌ها از پاسخ فعلی ساخته شده‌اند و فراخوانی تازه‌ای انجام نمی‌شود.
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-copy ml-2 text-slate-400" />
            کپی فقط برای شناسه و هش امن فعال است.
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <i className="fa-solid fa-ban ml-2 text-slate-400" />
            کنترل اجرایی، ذخیره‌سازی یا تغییر اطلاعات عملیاتی وجود ندارد.
          </div>
        </div>
      </div>

      {matrixRows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-12 gap-2 bg-slate-100 px-4 py-3 text-[11px] font-black text-slate-500 dark:bg-slate-950/55 dark:text-slate-400">
            <div className="col-span-12 md:col-span-3">منبع</div>
            <div className="col-span-6 md:col-span-2">وضعیت</div>
            <div className="col-span-6 md:col-span-2">سلامت</div>
            <div className="col-span-6 md:col-span-2">تازگی</div>
            <div className="col-span-6 md:col-span-1">رکورد</div>
            <div className="col-span-12 md:col-span-2">فراداده امن</div>
          </div>

          <div className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900/80">
            {matrixRows.map((row) => (
              <article key={row.source.key} className="grid grid-cols-12 gap-3 px-4 py-4 text-right">
                <div className="col-span-12 min-w-0 md:col-span-3">
                  <div className="text-sm font-black text-slate-950 dark:text-white">{row.label}</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{row.issueSummary}</p>
                </div>

                <div className="col-span-6 flex items-start md:col-span-2">
                  <MlOperatorStatusChip state={row.source.state} />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-slate-700 dark:bg-slate-200" style={{ width: `${row.score}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">{toFaNumber(row.score)}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-black text-slate-400">{healthLabel(row.score)}</div>
                </div>

                <div className="col-span-6 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400 md:col-span-2">
                  <div>{row.freshnessLabel}</div>
                  <div className="text-[11px] text-slate-400">{formatDateTime(row.source.fetchedAt)}</div>
                </div>

                <div className="col-span-6 text-sm font-black text-slate-950 dark:text-white md:col-span-1">
                  {toFaNumber(row.source.count)}
                </div>

                <div className="col-span-12 flex flex-wrap gap-2 md:col-span-2">
                  <MlOperatorCopyButton value={row.source.latestId} label="کپی شناسه" compact />
                  <MlOperatorCopyButton value={row.source.latestChecksum} label="کپی هش" compact />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
          <IconGlyph tone="neutral" className="mx-auto h-11 w-11" aria-hidden="true"><i className="fa-solid fa-table-cells" /></IconGlyph>
          <div className="mt-3 text-sm font-black text-slate-900 dark:text-white">منبعی برای نمایش سلامت پیدا نشد</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">با تغییر فیلترهای فعلی، ماتریس سلامت منابع خواندنی دوباره ساخته می‌شود.</p>
        </div>
      )}
    </section>
  );
}
