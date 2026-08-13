import { formatExactNumberText } from '../../../utils/exactNumber';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';
import { MlOperatorMetadataField } from './MlOperatorMetadataField';

export type MlOperatorDetailSelection = {
  source: MlOperatorRouteResult;
  item: unknown;
  index: number;
};

type DetailField = {
  label: string;
  value: string;
  copyValue?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const faNumber = (value: number): string => formatExactNumberText(value);

const shamsiDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  } catch {
    return value;
  }
};

const preferredString = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

const arrayLength = (record: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
};

const objectSummary = (value: unknown): string | null => {
  if (Array.isArray(value)) return `${faNumber(value.length)} مورد`;
  if (isRecord(value)) return `${faNumber(Object.keys(value).length)} کلید فراداده`;
  return null;
};

const readableValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'ثبت نشده';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'number') return formatExactNumberText(value);
  if (typeof value === 'string') return Boolean(value.match(/\d{4}-\d{2}-\d{2}T/)) ? shamsiDateTime(value) : value;
  return objectSummary(value) || 'فراداده ساختاری';
};

const safeCopy = (value: string | null): string | null => (value && value.length <= 220 ? value : null);

const fieldFromKeys = (
  record: Record<string, unknown>,
  label: string,
  keys: string[],
  copyAllowed = false,
): DetailField | null => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = readableValue(record[key]);
    const copyCandidate = preferredString(record, [key]);
    return { label, value, copyValue: copyAllowed ? safeCopy(copyCandidate) : null };
  }
  return null;
};

const detailTitleByKey: Record<MlOperatorOverviewRouteKey, string> = {
  comparisonSummaries: 'جزئیات مقایسه',
  importReceipts: 'جزئیات رسید ورود',
  receiptExports: 'جزئیات خروجی رسید',
  exportPackages: 'جزئیات بسته خروجی',
  packageSnapshots: 'جزئیات اسنپ‌شات',
};

const primaryIdKeysByKey: Record<MlOperatorOverviewRouteKey, string[]> = {
  comparisonSummaries: ['summaryId', 'summaryKey', 'id', 'key'],
  importReceipts: ['receiptId', 'importId', 'id', 'key'],
  receiptExports: ['exportId', 'receiptId', 'id', 'key'],
  exportPackages: ['packageId', 'exportId', 'receiptId', 'id', 'key'],
  packageSnapshots: ['snapshotId', 'packageId', 'id', 'key'],
};

const commonFields = (source: MlOperatorRouteResult, record: Record<string, unknown>): DetailField[] => {
  const fields = [
    fieldFromKeys(record, 'شناسه', primaryIdKeysByKey[source.key], true),
    fieldFromKeys(record, 'شناسه کاندید', ['candidateMetadataId', 'candidateId', 'candidatePackageId', 'candidateSummaryId'], true),
    fieldFromKeys(record, 'شناسه مبنا', ['baselineMetadataId', 'baselineId', 'baselinePackageId', 'baselineSummaryId'], true),
    fieldFromKeys(record, 'وضعیت', ['comparisonStatus', 'status', 'exportStatus', 'packageStatus', 'snapshotStatus']),
    fieldFromKeys(record, 'زمان ثبت', ['createdAt', 'created_at', 'created']),
    fieldFromKeys(record, 'زمان بروزرسانی', ['updatedAt', 'updated_at', 'updated']),
    fieldFromKeys(record, 'هش محتوا', ['contentHash', 'checksum', 'hash', 'receiptHash', 'importPayloadHash', 'exportPayloadHash', 'packageHash', 'snapshotHash'], true),
    fieldFromKeys(record, 'نسخه طرح داده', ['schemaVersion', 'schema_version', 'version'], true),
    fieldFromKeys(record, 'شناسه همبستگی', ['correlationId', 'correlation_id'], true),
    fieldFromKeys(record, 'شناسه درخواست', ['requestId', 'request_id'], true),
    fieldFromKeys(record, 'شناسه ورود', ['importId', 'metadataImportId'], true),
    fieldFromKeys(record, 'شناسه رسید', ['receiptId'], true),
    fieldFromKeys(record, 'شناسه خروجی', ['exportId'], true),
    fieldFromKeys(record, 'شناسه بسته', ['packageId'], true),
    fieldFromKeys(record, 'خلاصه شاخص‌ها', ['metricSummary', 'metrics', 'scores', 'counts']),
    fieldFromKeys(record, 'خلاصه فراداده امن', ['appliedMetadataSummary', 'safePayloadMetadataSummary', 'safeAuditMetadata', 'payloadSummary', 'summary']),
  ].filter(Boolean) as DetailField[];

  if (!fields.some((field) => field.label === 'شناسه') && source.latestId) {
    fields.unshift({ label: 'شناسه', value: source.latestId, copyValue: safeCopy(source.latestId) });
  }
  if (!fields.some((field) => field.label === 'هش محتوا') && source.latestChecksum) {
    fields.push({ label: 'هش محتوا', value: source.latestChecksum, copyValue: safeCopy(source.latestChecksum) });
  }

  return fields;
};

const warningRows = (record: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.slice(0, 8).map((item) => (typeof item === 'string' ? item : readableValue(item)));
    }
  }
  return [];
};

function MlOperatorNoticeList({ title, icon, rows, emptyText }: { title: string; icon: string; rows: string[]; emptyText: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
      <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
        <i className={`fa-solid ${icon}`} />
        {title}
      </div>
      {rows.length > 0 ? (
        <div className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <div key={`${title}-${index}`} className="rounded-xl bg-white px-3 py-2 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-800">
              {row}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export function getMlOperatorDetailTitle(selection: MlOperatorDetailSelection | null): string {
  if (!selection) return 'جزئیات پایش';
  return detailTitleByKey[selection.source.key];
}

export function MlOperatorDetailSections({ selection }: { selection: MlOperatorDetailSelection | null }) {
  if (!selection) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
        <div className="text-sm font-black text-slate-800 dark:text-slate-100">رکوردی انتخاب نشده است</div>
        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">برای دیدن جزئیات، از کارت یا ردیف خواندنی گزینه مشاهده را بزنید.</p>
      </div>
    );
  }

  if (!isRecord(selection.item)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-right dark:border-amber-900/70 dark:bg-amber-950/25">
        <div className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-100">
          <i className="fa-solid fa-triangle-exclamation" />
          فراداده ساختار کامل ندارد
        </div>
        <p className="mt-2 text-xs leading-6 text-amber-800/80 dark:text-amber-100/75">این مورد بدون توقف صفحه، فقط به شکل خلاصه خواندنی نمایش داده می‌شود.</p>
      </div>
    );
  }

  const fields = commonFields(selection.source, selection.item);
  const warningCount = arrayLength(selection.item, ['warnings', 'warningList', 'warningItems', 'warningCount']) ?? 0;
  const errorCount = arrayLength(selection.item, ['errors', 'errorList', 'errorItems', 'errorCount']) ?? 0;
  const warnings = warningRows(selection.item, ['warnings', 'warningList', 'warningItems']);
  const errors = warningRows(selection.item, ['errors', 'errorList', 'errorItems']);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <MlOperatorMetadataField label="نوع مورد" value={detailTitleByKey[selection.source.key]} />
        <MlOperatorMetadataField label="شماره ردیف" value={faNumber(selection.index + 1)} />
        <MlOperatorMetadataField label="تعداد هشدار" value={faNumber(warningCount)} />
        <MlOperatorMetadataField label="تعداد خطا" value={faNumber(errorCount)} />
      </div>

      {fields.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <MlOperatorMetadataField key={`${field.label}-${field.value}`} label={field.label} value={field.value} copyValue={field.copyValue} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/35">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">فراداده قابل نمایش محدود است</div>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">رکورد انتخاب‌شده کلیدهای استاندارد جزئیات را برنگردانده است.</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <MlOperatorNoticeList title="هشدارها" icon="fa-bell" rows={warnings} emptyText="هشداری ثبت نشده است." />
        <MlOperatorNoticeList title="خطاها" icon="fa-circle-exclamation" rows={errors} emptyText="خطایی ثبت نشده است." />
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-sm font-black text-emerald-950 dark:text-emerald-100">
          <i className="fa-solid fa-shield-halved" />
          خلاصه ایمنی
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {['فراداده محدود', 'فقط خواندنی', 'بدون اجرای مدل', 'بدون تغییر اطلاعات عملیاتی'].map((label) => (
            <span key={label} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-slate-950/60 dark:text-emerald-200 dark:ring-emerald-800">
              <i className="fa-solid fa-circle-check" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
