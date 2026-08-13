import React from 'react';
import { Dialog as Modal } from '@/components/ui';
import Button from '../../components/Button';
import { RestoreDatabaseSubmitAction } from '../../components/actions/OperationalLoadingButtons';
import type { DatabaseRestoreProgressSnapshot, DatabaseRestoreStage } from '../../shared/databaseRestoreProgress';
import { cn } from '../../utils/cn';

type SettingsRestoreModalProps = {
  isOpen: boolean;
  dbFileName: string | null;
  onClose: () => void;
  onRestore: () => void;
  isRestoringDb: boolean;
  restoreProgress?: DatabaseRestoreProgressSnapshot | null;
};

const restoreSteps: Array<{ stage: DatabaseRestoreStage; label: string }> = [
  { stage: 'validating', label: 'بررسی integrity و جداول ضروری' },
  { stage: 'safety-backup', label: 'ساخت نسخه ایمنی از دیتابیس فعلی' },
  { stage: 'replacing', label: 'جایگزینی اتمیک و امن دیتابیس' },
  { stage: 'reopening', label: 'بازگشایی، مهاجرت و بررسی نهایی' },
];

const SettingsRestoreModal: React.FC<SettingsRestoreModalProps> = ({
  isOpen,
  dbFileName,
  onClose,
  onRestore,
  isRestoringDb,
  restoreProgress = null,
}) => {
  if (!isOpen) return null;

  const visitedStages = new Set(restoreProgress?.history.map((item) => item.stage) || []);
  const terminalSuccess = restoreProgress?.status === 'completed';
  const terminalFailure = restoreProgress?.status === 'failed';
  const statusIcon = terminalSuccess
    ? 'fa-circle-check'
    : terminalFailure
      ? 'fa-triangle-exclamation'
      : isRestoringDb
        ? 'fa-spinner fa-spin'
        : 'fa-clock-rotate-left';

  return (
    <Modal
      title="تأیید بازیابی اطلاعات"
      onClose={onClose}
      isOpen={isOpen}
      variant="compact"
      size="sm"
      layout="horizontal"
      tone="danger"
      iconClass="fa-solid fa-clock-rotate-left"
      kicker="فایل خارجی DB"
      ariaDescription="فایل پیش از جایگزینی اعتبارسنجی می‌شود و اطلاعات فعلی با محتوای آن جایگزین خواهد شد."
      closeOnBackdrop={!isRestoringDb}
      closeOnEscape={!isRestoringDb}
      panelClassName="!overflow-x-hidden"
      bodyClassName="!overflow-x-hidden"
    >
      <div className="settings-data-restore-modal-v2" data-ui-settings-data-restore-modal="v2">
        <div className="settings-data-restore-modal-v2__file">
          <span><i className="fa-solid fa-database" /></span>
          <div><small>فایل انتخاب‌شده</small><strong dir="ltr">{dbFileName || 'فایل انتخاب نشده'}</strong></div>
        </div>

        {restoreProgress ? (
          <div className="settings-data-restore-modal-v2__file" data-restore-progress-status={restoreProgress.status}>
            <span><i className={`fa-solid ${statusIcon}`} /></span>
            <div>
              <small>مرحله واقعی سرور · {Math.min(restoreProgress.step, restoreProgress.total).toLocaleString('fa-IR')} از {restoreProgress.total.toLocaleString('fa-IR')}</small>
              <strong>{restoreProgress.label}</strong>
              <small>{restoreProgress.detail}</small>
            </div>
          </div>
        ) : null}

        <div className="settings-data-restore-modal-v2__steps" aria-label="مراحل بازیابی دیتابیس">
          {restoreSteps.map((item) => {
            const active = isRestoringDb && restoreProgress?.stage === item.stage;
            const complete = terminalSuccess || visitedStages.has(item.stage) && !active;
            const icon = active ? 'fa-spinner fa-spin' : complete ? 'fa-circle-check' : 'fa-circle';
            return (
              <div key={item.stage} data-restore-stage={item.stage} data-restore-stage-state={active ? 'active' : complete ? 'complete' : 'pending'}>
                <i className={`fa-solid ${icon}`} />
                <span className={active ? 'font-black text-slate-950 dark:text-slate-50' : undefined}>{item.label}</span>
              </div>
            );
          })}
        </div>

        <p><i className="fa-solid fa-triangle-exclamation" /> پس از تکمیل بازیابی، نشست‌های فعال برای امنیت باطل می‌شوند و برنامه با اطلاعات نسخه بازیابی‌شده دوباره باز می‌شود.</p>

        <div className={cn('settings-data-restore-modal-v2__actions', isRestoringDb && '!grid-cols-1')}>
          <Button className="!w-full !min-w-0 !max-w-full" onClick={onClose} variant="secondary" size="sm" disabled={isRestoringDb}>انصراف</Button>
          <RestoreDatabaseSubmitAction
            onClick={onRestore}
            loading={isRestoringDb}
            progress={restoreProgress}
            className="!col-span-full !w-full !min-w-0 !max-w-full"
          />
        </div>
      </div>
    </Modal>
  );
};

export default SettingsRestoreModal;
