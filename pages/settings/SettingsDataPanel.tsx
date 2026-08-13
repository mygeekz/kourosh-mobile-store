import type { SettingsDataPanelProps } from './settingsPanelTypes';
import type { BackupScheduleMode } from '../../utils/backupSchedule';
import Button from '../../components/Button';
import { BackupImmediateAction, BackupRestoreAction } from '../../components/actions/OperationalLoadingButtons';
import ToggleSwitch from '../../components/ToggleSwitch';
import { SelectField, TextField } from '@/components/ui';
import { BACKUP_WEEKDAYS, sanitizeTime } from '../../utils/backupSchedule';
import { formatIranDateTime } from '../../utils/iranDateTime';
import SettingsRestoreHistoryCard from './SettingsRestoreHistoryCard';

const formatFileSize = (bytes: number) => {
  const value = Math.max(0, Number(bytes || 0));
  if (value < 1024) return `${value.toLocaleString('fa-IR')} بایت`;
  if (value < 1024 * 1024) return `${(value / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلوبایت`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 2 })} مگابایت`;
  return `${(value / 1024 / 1024 / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 2 })} گیگابایت`;
};

export default function SettingsDataPanel(props: SettingsDataPanelProps) {
  const {
    tab,
    backupModeLabel,
    backupScheduleTime,
    backupFeedbackTone,
    backupFeedbackIcon,
    backupFeedbackLabel,
    backupEnabled,
    backupStatusLabel,
    backupNextRunLabel,
    backupList,
    backupSettingsDirty,
    backupScheduleMode,
    backupScheduleWeekdays,
    backupScheduleIntervalHours,
    backupTimezone,
    backupRetention,
    isSavingBackupSchedule,
    isLoadingBackups,
    isRestoringDb,
    backupOperationKey,
    restoreProgress,
    restoreHistory,
    dbFileInputRef,
    handleBackup,
    handleSaveBackupSchedule,
    setBackupEnabled,
    setBackupScheduleMode,
    handleBackupTimeInputChange,
    handleBackupTimeInputBlur,
    setBackupScheduleWeekdays,
    setBackupScheduleIntervalHours,
    setBackupTimezone,
    setBackupRetention,
    handleCreateBackupNow,
    fetchBackups,
    handleDownloadBackupFile,
    handleCheckRestore,
    handleRestoreFromBackup,
    handleDeleteBackupFile,
    handleDbFileChange,
  } = props;

  if (tab !== 'data') return null;

  const totalBackupSize = backupList.reduce((sum, item) => sum + Number(item.size || 0), 0);
  const newestBackup = backupList[0] || null;
  const anyBackupOperation = Boolean(backupOperationKey || isRestoringDb || isSavingBackupSchedule);
  const openRestorePicker = () => {
    if (!dbFileInputRef.current) return;
    dbFileInputRef.current.value = '';
    dbFileInputRef.current.click();
  };

  return (
    <div className="settings-data-panel settings-data-phase3 settings-data-redesign-v2 settings-panel-root" data-ui-settings-panel="data" data-ui-settings-data-redesign="v2">
      <section className="settings-data-v2-hero" data-ui-settings-data-hero="true">
        <div className="settings-data-v2-hero__main">
          <span className="settings-data-v2-hero__icon" aria-hidden="true"><i className="fa-solid fa-database" /></span>
          <div className="min-w-0">
            <div className="settings-data-v2-hero__eyebrow">مرکز نگهداری اطلاعات</div>
            <h3>مدیریت داده‌ها و نسخه‌های پشتیبان</h3>
            <p>ساخت snapshot سازگار، زمان‌بندی سرور، اعتبارسنجی فایل و بازیابی کنترل‌شده از همین بخش انجام می‌شود.</p>
          </div>
        </div>
        <div className="settings-data-v2-hero__actions">
          <Button
            onClick={fetchBackups}
            variant="secondary"
            size="xs"
            loading={isLoadingBackups}
            loadingText="تازه‌سازی…"
            disabled={anyBackupOperation && !isLoadingBackups}
            leftIcon={<i className="fa-solid fa-rotate" />}
          >
            تازه‌سازی
          </Button>
          <BackupImmediateAction
            onClick={handleBackup}
            loading={backupOperationKey === 'instant-download'}
            disabled={anyBackupOperation && backupOperationKey !== 'instant-download'}
          />
        </div>
      </section>

      <section className="settings-data-v2-stats" aria-label="خلاصه وضعیت بکاپ" data-ui-settings-grid="cards">
        <div className="settings-data-v2-stat">
          <span><i className={`fa-solid ${backupEnabled ? 'fa-circle-check' : 'fa-circle-pause'}`} /></span>
          <div><small>بکاپ خودکار</small><strong>{backupStatusLabel}</strong></div>
        </div>
        <div className="settings-data-v2-stat">
          <span><i className="fa-regular fa-clock" /></span>
          <div><small>اجرای بعدی</small><strong>{backupEnabled ? backupNextRunLabel : 'غیرفعال'}</strong></div>
        </div>
        <div className="settings-data-v2-stat">
          <span><i className="fa-solid fa-box-archive" /></span>
          <div><small>نسخه‌های سرور</small><strong>{backupList.length.toLocaleString('fa-IR')} فایل</strong></div>
        </div>
        <div className="settings-data-v2-stat">
          <span><i className="fa-solid fa-hard-drive" /></span>
          <div><small>حجم کل</small><strong>{formatFileSize(totalBackupSize)}</strong></div>
        </div>
      </section>

      <SettingsRestoreHistoryCard records={restoreHistory} />

      <section className="settings-data-v2-schedule" data-ui-settings-data-schedule="true">
        <div className="settings-data-v2-section-head">
          <div>
            <h4><i className="fa-solid fa-calendar-check" /> زمان‌بندی خودکار</h4>
            <p>تنظیمات پس از ذخیره همان لحظه روی پردازش بکاپ سرور اعمال می‌شوند.</p>
          </div>
          <div className="settings-data-v2-section-head__actions">
            <span className={`settings-data-v2-save-state ${backupSettingsDirty ? 'is-dirty' : 'is-saved'}`}>
              <i className={`fa-solid ${backupSettingsDirty ? 'fa-circle-exclamation' : 'fa-circle-check'}`} />
              {backupSettingsDirty ? 'تغییرات ذخیره نشده' : 'ذخیره‌شده'}
            </span>
            <Button
              onClick={handleSaveBackupSchedule}
              variant={backupSettingsDirty ? 'primary' : 'secondary'}
              size="xs"
              loading={isSavingBackupSchedule}
              loadingText="اعمال روی سرور…"
              disabled={isRestoringDb || Boolean(backupOperationKey)}
              leftIcon={<i className="fa-solid fa-floppy-disk" />}
            >
              ذخیره زمان‌بندی
            </Button>
          </div>
        </div>

        <div className="settings-data-v2-schedule-grid" data-ui-settings-grid="form">
          <div className="settings-data-v2-config-card">
            <div className="settings-data-v2-toggle-row">
              <div>
                <strong>اجرای خودکار بکاپ</strong>
                <small>در حالت خاموش، ساخت دستی و دانلود فوری همچنان قابل استفاده است.</small>
              </div>
              <div className="settings-data-v2-toggle-control">
                <span>{backupEnabled ? 'فعال' : 'خاموش'}</span>
                <ToggleSwitch checked={backupEnabled} onCheckedChange={setBackupEnabled} ariaLabel="اجرای خودکار بکاپ" size="sm" />
              </div>
            </div>

            <div className={`settings-data-v2-fields ${backupEnabled ? '' : 'is-disabled'}`} data-ui-settings-grid="form">
              <SelectField
                label="نوع زمان‌بندی"
                wrapperClassName="settings-data-v2-field"
                value={backupScheduleMode}
                onChange={(event) => setBackupScheduleMode(event.target.value as BackupScheduleMode)}
              >
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="interval">هر چند ساعت</option>
              </SelectField>

              <TextField
                label="ساعت پایه"
                wrapperClassName="settings-data-v2-field"
                type="text"
                inputMode="numeric"
                dir="ltr"
                maxLength={5}
                value={backupScheduleTime}
                onChange={(event) => handleBackupTimeInputChange(event.target.value)}
                onBlur={handleBackupTimeInputBlur}
                preview="02:00"
                className="settings-data-v2-time-input"
              />

              {backupScheduleMode === 'interval' ? (
                <SelectField
                  label="فاصله اجرا"
                  wrapperClassName="settings-data-v2-field"
                  value={String(backupScheduleIntervalHours)}
                  onValueChange={(value) => setBackupScheduleIntervalHours(Number(value))}
                >
                  {[1, 2, 3, 4, 6, 8, 12, 24].map((hour) => <option key={hour} value={hour}>هر {hour.toLocaleString('fa-IR')} ساعت</option>)}
                </SelectField>
              ) : null}

              <TextField
                label="نگهداری نسخه‌ها"
                hint="بین ۱ تا ۳۶۵ فایل"
                wrapperClassName="settings-data-v2-field"
                type="number"
                min={1}
                max={365}
                value={backupRetention}
                onChange={(event) => setBackupRetention(Number(event.target.value))}
                aria-label="تعداد نسخه‌های قابل نگهداری"
              />

              <TextField
                label="منطقه زمانی"
                wrapperClassName="settings-data-v2-field settings-data-v2-field--wide"
                value={backupTimezone}
                onChange={(event) => setBackupTimezone(event.target.value)}
                preview="Asia/Tehran"
                dir="ltr"
              />
            </div>

            {backupScheduleMode === 'weekly' ? (
              <div className={`settings-data-v2-weekdays ${backupEnabled ? '' : 'is-disabled'}`}>
                <span>روزهای اجرا</span>
                <div>
                  {BACKUP_WEEKDAYS.map((day) => {
                    const active = backupScheduleWeekdays.includes(day.cron);
                    return (
                      <button
                        key={day.cron}
                        type="button"
                        className={active ? 'is-active' : ''}
                        aria-pressed={active}
                        onClick={() => setBackupScheduleWeekdays((previous) => active ? previous.filter((value) => value !== day.cron) : [...previous, day.cron].sort((a, b) => a - b))}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="settings-data-v2-preview">
            <div className="settings-data-v2-preview__head">
              <span><i className={`fa-solid ${backupFeedbackIcon}`} /></span>
              <div><small>وضعیت برنامه اجرا</small><strong>{backupFeedbackLabel}</strong></div>
            </div>
            <dl>
              <div><dt>حالت</dt><dd>{backupModeLabel}</dd></div>
              <div><dt>ساعت پایه</dt><dd dir="ltr">{sanitizeTime(backupScheduleTime)}</dd></div>
              <div><dt>اجرای بعدی</dt><dd>{backupEnabled ? backupNextRunLabel : 'غیرفعال'}</dd></div>
              <div><dt>منطقه زمانی</dt><dd dir="ltr">{backupTimezone}</dd></div>
              <div><dt>نگهداری</dt><dd>{backupRetention.toLocaleString('fa-IR')} فایل</dd></div>
            </dl>
            <div className={`settings-data-v2-preview__note ${backupFeedbackTone}`}>
              <i className="fa-solid fa-shield-halved" />
              snapshot با SQLite ساخته می‌شود تا داده‌های WAL نیز داخل نسخه پشتیبان قرار بگیرند.
            </div>
          </aside>
        </div>
      </section>

      <section className="settings-data-v2-list" data-ui-settings-data-list="true">
        <div className="settings-data-v2-section-head">
          <div>
            <h4><i className="fa-solid fa-box-archive" /> نسخه‌های ذخیره‌شده</h4>
            <p>{newestBackup ? `آخرین نسخه: ${formatIranDateTime(newestBackup.mtime)}` : 'هنوز نسخه‌ای روی سرور ذخیره نشده است.'}</p>
          </div>
          <Button
            onClick={handleCreateBackupNow}
            variant="primary"
            size="xs"
            loading={backupOperationKey === 'create'}
            loadingText="در حال ساخت…"
            disabled={anyBackupOperation && backupOperationKey !== 'create'}
            leftIcon={<i className="fa-solid fa-file-circle-plus" />}
          >
            ایجاد نسخه
          </Button>
        </div>

        {isLoadingBackups ? (
          <div className="settings-data-v2-skeleton-list" aria-label="در حال بارگذاری نسخه‌های پشتیبان">
            {[1, 2, 3].map((item) => <span key={item} />)}
          </div>
        ) : backupList.length === 0 ? (
          <div className="settings-data-v2-empty">
            <span><i className="fa-solid fa-database" /></span>
            <div><strong>نسخه پشتیبانی ثبت نشده است</strong><small>اولین snapshot سازگار را بساز تا دانلود و بازیابی در دسترس قرار گیرد.</small></div>
            <Button onClick={handleCreateBackupNow} variant="primary" size="xs" leftIcon={<i className="fa-solid fa-plus" />}>ساخت اولین نسخه</Button>
          </div>
        ) : (
          <div className="settings-data-v2-backup-list">
            {backupList.map((backup, index) => {
              const isSafetyBackup = backup.fileName.startsWith('pre-restore-safety_');
              const rowBusy = backupOperationKey?.endsWith(`:${backup.fileName}`) || false;
              return (
                <article key={backup.fileName} className="settings-data-v2-backup-row">
                  <div className="settings-data-v2-backup-row__identity">
                    <span><i className={`fa-solid ${isSafetyBackup ? 'fa-shield-halved' : 'fa-database'}`} /></span>
                    <div className="min-w-0">
                      <div><strong title={backup.fileName}>{backup.fileName}</strong>{index === 0 ? <em>جدیدترین</em> : null}{isSafetyBackup ? <em>نسخه ایمنی</em> : null}</div>
                      <small><i className="fa-regular fa-clock" /> {formatIranDateTime(backup.mtime)} <i className="fa-solid fa-hard-drive" /> {formatFileSize(backup.size)}</small>
                    </div>
                  </div>
                  <div className="settings-data-v2-backup-row__actions">
                    <Button onClick={() => handleDownloadBackupFile(backup.fileName)} variant="ghost" size="xs" loading={backupOperationKey === `download:${backup.fileName}`} loadingText="در حال آماده‌سازی دانلود…" disabled={anyBackupOperation && !rowBusy} leftIcon={<i className="fa-solid fa-download" />}>دانلود</Button>
                    <Button onClick={() => handleCheckRestore(backup.fileName)} variant="secondary" size="xs" loading={backupOperationKey === `check:${backup.fileName}`} loadingText="در حال بررسی نسخه پشتیبان…" disabled={anyBackupOperation && !rowBusy} leftIcon={<i className="fa-solid fa-circle-check" />}>بررسی</Button>
                    <BackupRestoreAction onClick={() => handleRestoreFromBackup(backup.fileName)} loading={backupOperationKey === `restore:${backup.fileName}`} progress={rowBusy ? restoreProgress : null} disabled={anyBackupOperation && !rowBusy} />
                    <Button onClick={() => handleDeleteBackupFile(backup.fileName)} variant="danger" size="xs" loading={backupOperationKey === `delete:${backup.fileName}`} loadingText="در حال حذف نسخه پشتیبان…" disabled={anyBackupOperation && !rowBusy} leftIcon={<i className="fa-solid fa-trash-can" />} requiredRoles={['Admin']}>حذف</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="settings-data-v2-restore" data-ui-settings-data-restore="true">
        <div className="settings-data-v2-restore__copy">
          <span><i className="fa-solid fa-triangle-exclamation" /></span>
          <div>
            <h4>بازیابی از فایل خارجی</h4>
            <p>فقط فایل SQLite با پسوند DB پذیرفته می‌شود. سرور پیش از جایگزینی، سلامت فایل را بررسی و از وضعیت فعلی نسخه ایمنی می‌سازد.</p>
          </div>
        </div>
        <TextField controlOnly type="file" ref={dbFileInputRef} onChange={handleDbFileChange} accept=".db,application/x-sqlite3,application/vnd.sqlite3" className="hidden" />
        <Button
          onClick={openRestorePicker}
          disabled={anyBackupOperation}
          variant="danger"
          size="xs"
          leftIcon={<i className="fa-solid fa-file-arrow-up" />}
        >
          انتخاب فایل DB
        </Button>
      </section>
    </div>
  );
}
