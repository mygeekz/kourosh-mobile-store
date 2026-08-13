import React from 'react';
import type {
  DatabaseRestoreAuditRecord,
  DatabaseRestoreAuditStageResult,
} from '../../shared/databaseRestoreProgress';
import { formatIranDateTime } from '../../utils/iranDateTime';

const formatDuration = (durationMs: number | null) => {
  const value = Math.max(0, Number(durationMs || 0));
  if (value < 1000) return 'کمتر از ۱ ثانیه';
  const totalSeconds = Math.round(value / 1000);
  if (totalSeconds < 60) return `${totalSeconds.toLocaleString('fa-IR')} ثانیه`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds
    ? `${minutes.toLocaleString('fa-IR')} دقیقه و ${seconds.toLocaleString('fa-IR')} ثانیه`
    : `${minutes.toLocaleString('fa-IR')} دقیقه`;
};

const getStagePresentation = (stage: DatabaseRestoreAuditStageResult) => {
  if (stage.status === 'completed') return { icon: 'fa-circle-check', label: 'موفق', tone: 'border-success/30 bg-success/10 text-success' };
  if (stage.status === 'failed') return { icon: 'fa-triangle-exclamation', label: 'ناموفق', tone: 'border-danger/30 bg-danger/10 text-danger' };
  if (stage.status === 'running') return { icon: 'fa-spinner fa-spin', label: 'در حال اجرا', tone: 'border-info/30 bg-info/10 text-info' };
  return { icon: 'fa-circle', label: 'اجرا نشد', tone: 'border-border bg-muted text-muted-foreground' };
};

const RestoreStageResult: React.FC<{ stage: DatabaseRestoreAuditStageResult }> = ({ stage }) => {
  const presentation = getStagePresentation(stage);
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3" data-restore-audit-stage={stage.stage} data-restore-audit-stage-status={stage.status}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-xs font-black text-foreground">{stage.label}</strong>
          <small className="mt-1 block text-xs leading-6 text-muted-foreground" title={stage.detail}>{stage.detail}</small>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${presentation.tone}`}>
          <i className={`fa-solid ${presentation.icon}`} aria-hidden="true" />
          {presentation.label}
        </span>
      </div>
      <div className="mt-2 text-xs font-bold text-muted-foreground">
        مدت مرحله: {stage.durationMs === null ? '—' : formatDuration(stage.durationMs)}
      </div>
    </div>
  );
};

const RestoreHistoryRow: React.FC<{ record: DatabaseRestoreAuditRecord }> = ({ record }) => {
  const success = record.status === 'completed';
  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-muted/30 p-3 text-xs sm:grid-cols-4" data-restore-audit-record={record.operationId}>
      <div><span className="block text-muted-foreground">نتیجه</span><strong className={success ? 'text-success' : 'text-danger'}>{success ? 'موفق' : 'ناموفق'}</strong></div>
      <div><span className="block text-muted-foreground">زمان</span><strong className="text-foreground">{formatIranDateTime(record.finishedAt)}</strong></div>
      <div><span className="block text-muted-foreground">مدت</span><strong className="text-foreground">{formatDuration(record.durationMs)}</strong></div>
      <div className="min-w-0"><span className="block text-muted-foreground">فایل</span><strong className="block truncate text-foreground" dir="ltr" title={record.sourceFileName}>{record.sourceFileName}</strong></div>
    </div>
  );
};

type SettingsRestoreHistoryCardProps = {
  records: DatabaseRestoreAuditRecord[];
};

const SettingsRestoreHistoryCard: React.FC<SettingsRestoreHistoryCardProps> = ({ records }) => {
  const latest = records[0] || null;

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5" data-ui-settings-restore-history="true">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="flex items-center gap-2 text-base font-black text-foreground">
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
            سابقه بازیابی دیتابیس
          </h4>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">نتیجه عملیات، زمان اجرا، فایل مبدأ، نسخه ایمنی و وضعیت چهار مرحله واقعی سرور در این بخش ثبت می‌شود.</p>
        </div>
        {latest ? (
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${latest.status === 'completed' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'}`}>
            <i className={`fa-solid ${latest.status === 'completed' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />
            آخرین بازیابی: {latest.status === 'completed' ? 'موفق' : 'ناموفق'}
          </span>
        ) : null}
      </div>

      {!latest ? (
        <div className="py-6 text-center">
          <i className="fa-solid fa-clock-rotate-left text-xl text-muted-foreground" aria-hidden="true" />
          <strong className="mt-3 block text-sm font-black text-foreground">هنوز سابقه بازیابی ثبت نشده است</strong>
          <small className="mt-1 block text-xs leading-6 text-muted-foreground">پس از اولین Restore، گزارش کامل عملیات در همین قسمت باقی می‌ماند.</small>
        </div>
      ) : (
        <>
          <div className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-3"><small className="block text-muted-foreground">زمان شروع</small><strong className="mt-1 block text-sm text-foreground">{formatIranDateTime(latest.startedAt)}</strong></div>
            <div className="rounded-2xl border border-border bg-muted/40 p-3"><small className="block text-muted-foreground">مدت کل</small><strong className="mt-1 block text-sm text-foreground">{formatDuration(latest.durationMs)}</strong></div>
            <div className="min-w-0 rounded-2xl border border-border bg-muted/40 p-3"><small className="block text-muted-foreground">فایل مبدأ · {latest.sourceType === 'server-backup' ? 'نسخه سرور' : 'فایل خارجی'}</small><strong className="mt-1 block truncate text-sm text-foreground" dir="ltr" title={latest.sourceFileName}>{latest.sourceFileName}</strong></div>
            <div className="min-w-0 rounded-2xl border border-border bg-muted/40 p-3"><small className="block text-muted-foreground">نسخه ایمنی ایجادشده</small><strong className="mt-1 block truncate text-sm text-foreground" dir="ltr" title={latest.safetyBackupFileName || undefined}>{latest.safetyBackupFileName || 'ایجاد نشد'}</strong></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="نتیجه مراحل آخرین بازیابی">
            {latest.stages.map((stage) => <RestoreStageResult key={stage.stage} stage={stage} />)}
          </div>

          {latest.status === 'failed' ? (
            <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm leading-7 text-danger">
              <strong className="block font-black">علت توقف عملیات</strong>
              <span>{latest.failureMessage || 'جزئیات خطا ثبت نشده است.'}</span>
              <small className="mt-1 block font-bold">وضعیت بازگردانی ایمن: {latest.rollbackStatus === 'completed' ? 'با موفقیت انجام شد' : latest.rollbackStatus === 'failed' ? 'ناموفق' : 'نیاز نداشت'}</small>
            </div>
          ) : null}

          {records.length > 1 ? (
            <details className="mt-4 border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-black text-foreground">مشاهده {Math.min(records.length - 1, 9).toLocaleString('fa-IR')} عملیات قبلی</summary>
              <div className="mt-3 space-y-2">
                {records.slice(1).map((record) => <RestoreHistoryRow key={record.operationId} record={record} />)}
              </div>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
};

export default SettingsRestoreHistoryCard;
