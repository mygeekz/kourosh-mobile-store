export const DATABASE_RESTORE_TOTAL_STEPS = 4;

export type DatabaseRestoreStage =
  | 'uploading'
  | 'queued'
  | 'validating'
  | 'safety-backup'
  | 'replacing'
  | 'reopening'
  | 'completed'
  | 'rolling-back'
  | 'failed';

export type DatabaseRestoreProgressStatus = 'pending' | 'running' | 'completed' | 'failed';

export type DatabaseRestoreProgressEntry = {
  stage: DatabaseRestoreStage;
  step: number;
  label: string;
  detail: string;
  at: string;
};

export type DatabaseRestoreProgressSnapshot = {
  operationId: string;
  status: DatabaseRestoreProgressStatus;
  stage: DatabaseRestoreStage;
  step: number;
  total: number;
  label: string;
  detail: string;
  startedAt: string;
  updatedAt: string;
  history: DatabaseRestoreProgressEntry[];
};

export const DATABASE_RESTORE_AUDITED_STAGES = [
  'validating',
  'safety-backup',
  'replacing',
  'reopening',
] as const;

export type DatabaseRestoreAuditedStage = typeof DATABASE_RESTORE_AUDITED_STAGES[number];
export type DatabaseRestoreSourceType = 'server-backup' | 'external-file';
export type DatabaseRestoreAuditStatus = 'completed' | 'failed';
export type DatabaseRestoreAuditStageStatus = 'pending' | 'running' | 'completed' | 'failed';
export type DatabaseRestoreRollbackStatus = 'not-required' | 'completed' | 'failed';

export type DatabaseRestoreAuditStageResult = {
  stage: DatabaseRestoreAuditedStage;
  label: string;
  status: DatabaseRestoreAuditStageStatus;
  detail: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
};

export type DatabaseRestoreAuditRecord = {
  operationId: string;
  status: DatabaseRestoreAuditStatus;
  sourceType: DatabaseRestoreSourceType;
  sourceFileName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  safetyBackupFileName: string | null;
  rollbackStatus: DatabaseRestoreRollbackStatus;
  failureMessage: string | null;
  stages: DatabaseRestoreAuditStageResult[];
};

export const DATABASE_RESTORE_STAGE_META: Record<DatabaseRestoreStage, {
  step: number;
  status: DatabaseRestoreProgressStatus;
  label: string;
  detail: string;
}> = {
  uploading: {
    step: 0,
    status: 'pending',
    label: 'در حال ارسال فایل به سرور',
    detail: 'پس از تکمیل ارسال، مراحل واقعی بازیابی مستقیماً از سرور نمایش داده می‌شوند.',
  },
  queued: {
    step: 0,
    status: 'pending',
    label: 'آماده‌سازی عملیات بازیابی',
    detail: 'درخواست بازیابی به سرور رسیده و برای شروع پردازش آماده می‌شود.',
  },
  validating: {
    step: 1,
    status: 'running',
    label: 'اعتبارسنجی فایل پشتیبان',
    detail: 'سلامت SQLite، ساختار جداول و سازگاری فایل در حال بررسی است.',
  },
  'safety-backup': {
    step: 2,
    status: 'running',
    label: 'ساخت نسخه ایمنی',
    detail: 'پیش از هر جایگزینی، از دیتابیس فعال یک نسخه ایمنی ساخته می‌شود.',
  },
  replacing: {
    step: 3,
    status: 'running',
    label: 'جایگزینی امن دیتابیس',
    detail: 'اتصال فعلی کنترل و فایل بازیابی‌شده به‌صورت اتمیک فعال می‌شود.',
  },
  reopening: {
    step: 4,
    status: 'running',
    label: 'بازگشایی و بررسی نهایی',
    detail: 'اتصال دیتابیس، مهاجرت‌ها، جداول ضروری و زمان‌بندی بکاپ بررسی می‌شوند.',
  },
  completed: {
    step: 4,
    status: 'completed',
    label: 'بازیابی کامل شد',
    detail: 'دیتابیس با موفقیت فعال و نشست‌ها برای ورود مجدد ایمن بازنشانی شدند.',
  },
  'rolling-back': {
    step: 4,
    status: 'running',
    label: 'بازگردانی ایمن وضعیت قبلی',
    detail: 'در مرحله بازیابی خطا رخ داد و سرور در حال برگرداندن دیتابیس قبلی است.',
  },
  failed: {
    step: 4,
    status: 'failed',
    label: 'بازیابی کامل نشد',
    detail: 'عملیات متوقف شد و وضعیت ایمن دیتابیس حفظ یا بازیابی شد.',
  },
};
