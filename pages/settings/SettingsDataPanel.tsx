import React from 'react';
import type { SettingsDataPanelProps } from './settingsPanelTypes';
import type { BackupScheduleMode } from '../../utils/backupSchedule';
import Button from '../../components/Button';
import ToggleSwitch from '../../components/ToggleSwitch';
import TextField from '../../components/ui/TextField';
import SelectField from '../../components/ui/SelectField';
import { BACKUP_WEEKDAYS, sanitizeTime } from '../../utils/backupSchedule';
import { formatIranDateTime } from '../../utils/iranDateTime';


export default function SettingsDataPanel(props: SettingsDataPanelProps) {
  const {
    tab,
    settingsSectionCard,
    inputClass,
    backupModeLabel,
    backupScheduleTime,
    backupFeedbackTone,
    backupFeedbackIcon,
    backupFeedbackLabel,
    backupStatusClass,
    backupEnabled,
    backupStatusLabel,
    backupSummaryTone,
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

  return (
    <div className="settings-data-panel settings-data-phase3 settings-panel-root space-y-6" data-ui-settings-panel="data">
      <div className={`${settingsSectionCard} settings-data-root-card`} data-ui-settings-card="section">
        <h3 className="text-lg font-black text-slate-900 flex items-center mb-4 gap-3">
          <span className="settings-section-icon"><i className="fas fa-database" /></span>
          مدیریت داده‌ها
        </h3>
        <div className="space-y-6">
          <div className="settings-data-hero-action">
            <div className="settings-data-hero-action__copy">
              <span className="settings-data-hero-action__icon"><i className="fas fa-download" /></span>
              <div>
                <h4 className="settings-data-hero-action__title">پشتیبان‌گیری فوری</h4>
                <p className="settings-data-hero-action__text">از کل پایگاه داده یک فایل پشتیبان تهیه کنید تا در مواقع ضروری نسخه امن و قابل بازیابی داشته باشید.</p>
              </div>
            </div>
            <Button onClick={handleBackup} variant="primary" leftIcon={<i className="fas fa-download" />}>
              دانلود فایل پشتیبان
            </Button>
          </div>
          
              <div className="settings-data-card backup-scheduler-shell mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-none dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Backup scheduler</div>
                      <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">بکاپ‌های زمان‌بندی‌شده</div>
                      <div className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        این تنظیمات روی سرور اجرا می‌شود و بعد از هر ری‌استارت هم از همین صفحه خوانده می‌شود.
                      </div>
                      <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">حالت: {backupModeLabel}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">ساعت اجرا: {sanitizeTime(backupScheduleTime)}</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${backupFeedbackTone}`}>
                          <i className={`fa-solid ${backupFeedbackIcon}`} />
                          {backupFeedbackLabel}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black ${backupStatusClass}`}>
                      <i className={`fa-solid ${backupEnabled ? 'fa-circle-check' : 'fa-circle-minus'}`} />
                      {backupStatusLabel}
                    </span>
                  </div>
    
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className={`rounded-2xl border px-3 py-3 ${backupSummaryTone}`}>
                      <div className="text-[11px] opacity-70">وضعیت</div>
                      <div className="mt-1 text-base font-black">{backupStatusLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-200">اجرای بعدی</div>
                      <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-100">{backupEnabled ? backupNextRunLabel : 'غیرفعال'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">نسخه‌های ثبت‌شده</div>
                      <div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-100">{backupList.length.toLocaleString('fa-IR')} فایل</div>
                    </div>
                  </div>
                </div>
    
                <Button
                  onClick={handleSaveBackupSchedule}
                  disabled={isSavingBackupSchedule}
                  loading={isSavingBackupSchedule}
                  loadingText="در حال ذخیره تغییرات…"
                  variant="secondary"
                  leftIcon={<i className="fas fa-floppy-disk" />}
                >
                  {backupSettingsDirty ? 'ذخیره تغییرات' : 'ذخیره تنظیمات'}
                </Button>
              </div>
    
              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className={`settings-data-card backup-auto-card rounded-[22px] border p-4 md:p-5 transition ${backupEnabled ? 'border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">فعال بودن بکاپ خودکار</div>
                      <div className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">وقتی خاموش باشد، همه فیلدهای زمان‌بندی و اجرای خودکار غیرفعال می‌شوند.</div>
                    </div>
                    <div className="ms-auto flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <span className={`text-[11px] font-black ${backupEnabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{backupEnabled ? 'فعال' : 'غیرفعال'}</span>
                      <ToggleSwitch
                        checked={backupEnabled}
                        onCheckedChange={setBackupEnabled}
                        ariaLabel="فعال بودن بکاپ خودکار"
                        size="sm"
                      />
                    </div>
                  </div>
    
                  <div className={`mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 ${backupEnabled ? '' : 'pointer-events-none opacity-50'}`}>
                    <div>
                      <div className="mb-1 text-xs font-medium text-slate-500">نوع زمان‌بندی</div>
                      <SelectField
                        value={backupScheduleMode}
                        onChange={(e) => setBackupScheduleMode(e.target.value as BackupScheduleMode)}
                        className="h-12 rounded-2xl"
                      >
                        <option value="daily">روزانه</option>
                        <option value="weekly">هفتگی</option>
                        <option value="interval">هر چند ساعت</option>
                      </SelectField>
                    </div>
    
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
                        <span>ساعت اجرا</span>
                        <span className="text-[11px] text-slate-400">24h · HH:MM</span>
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                          <i className="fa-regular fa-clock" />
                        </span>
                        <TextField
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          maxLength={5}
                          value={backupScheduleTime}
                          onChange={(e) => handleBackupTimeInputChange(e.target.value)}
                          onBlur={handleBackupTimeInputBlur}
                          preview="20:00"
                          className="h-12 rounded-2xl font-mono text-[15px] pl-10 text-left tracking-[0.18em]"
                        />
                      </div>
                    </div>
                  </div>
    
                  <div className={`mt-4 ${backupEnabled ? '' : 'pointer-events-none opacity-50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">روزهای هفته</div>
                      <div className="text-[11px] font-medium text-slate-400">انتخاب چندگانه</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BACKUP_WEEKDAYS.map((d) => {
                        const active = backupScheduleWeekdays.includes(d.cron);
                        return (
                          <button
                            key={d.cron}
                            type="button"
                            onClick={() => setBackupScheduleWeekdays(prev => active ? prev.filter((x) => x !== d.cron) : [...prev, d.cron].sort((a, b) => a - b))}
                            className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition-all ${active ? 'border-slate-300 bg-slate-100 text-slate-950 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
    
                  {backupScheduleMode === 'interval' ? (
                    <div className={`mt-4 ${backupEnabled ? '' : 'pointer-events-none opacity-50'}`}>
                      <div className="mb-1 text-xs font-medium text-slate-500">بازه (ساعت)</div>
                      <SelectField
                        value={backupScheduleIntervalHours}
                        onChange={(e) => setBackupScheduleIntervalHours(Number(e.target.value))}
                        className="h-12 rounded-2xl"
                      >
                        {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                          <option key={h} value={h}>هر {h} ساعت</option>
                        ))}
                      </SelectField>
                    </div>
                  ) : null}
                </div>
    
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 md:p-5 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">جزئیات اجرای بکاپ</div>
                  <div className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">منطقه زمانی و نگهداری نسخه‌ها را یک‌جا تنظیم کن.</div>
    
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-1 text-xs font-medium text-slate-500">منطقه زمانی</div>
                      <TextField
                        value={backupTimezone}
                        onChange={(e) => setBackupTimezone(e.target.value)}
                        className="h-12 rounded-2xl"
                        preview="Asia/Tehran"
                      />
                    </div>
    
                    <div>
                      <div className="mb-1 text-xs font-medium text-slate-500">نگهداری نسخه‌ها (روز)</div>
                      <input
                        type="number"
                        min={1}
                        value={backupRetention}
                        onChange={(e) => setBackupRetention(Number(e.target.value))}
                        className={`${inputClass} h-12 rounded-2xl`}
                        preview="14"
                      />
                    </div>
                  </div>
    
                  <div className={`mt-4 rounded-2xl border p-4 text-xs leading-6 transition ${backupFeedbackTone}`}>
                    <div className="settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-base shadow-sm dark:bg-slate-950/60">
                        <i className={`fa-solid ${backupFeedbackIcon}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">پیش‌نمایش لحظه‌ای</div>
                        <div className="mt-1 text-[11px] opacity-80">
                          {backupSettingsDirty ? 'تغییرات هنوز ذخیره نشده‌اند و بعد از ذخیره به برنامه اجرای سرور تبدیل می‌شوند.' : 'تنظیمات فعلی ذخیره شده‌اند و پیش‌نمایش مطابق همان‌ها به‌روز است.'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                          <span className="rounded-full border border-white/60 bg-white/60 px-3 py-1 dark:border-slate-700 dark:bg-slate-950/40">بعدی: {backupEnabled ? backupNextRunLabel : 'بکاپ خودکار خاموش است'}</span>
                          <span className="rounded-full border border-white/60 bg-white/60 px-3 py-1 dark:border-slate-700 dark:bg-slate-950/40">منطقه زمانی: {backupTimezone}</span>
                          <span className="rounded-full border border-white/60 bg-white/60 px-3 py-1 dark:border-slate-700 dark:bg-slate-950/40">نگهداری: {backupRetention.toLocaleString('fa-IR')} روز</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    
            <div className="settings-data-card settings-backup-list-card mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 md:p-5 shadow-none dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">لیست بکاپ‌ها</div>
                  <div className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">نسخه‌ها، زمان ایجاد و ابزارهای بازیابی در یک نگاه</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleCreateBackupNow}
                    variant="primary"
                    size="sm"
                    className="unified-action-button unified-action-button--primary"
                    leftIcon={<i className="fa-solid fa-file-circle-plus" />}
                  >
                    ایجاد بکاپ
                  </Button>
                  <Button
                    onClick={fetchBackups}
                    variant="ghost"
                    size="sm"
                    className="unified-action-button unified-action-button--neutral"
                    leftIcon={<i className="fa-solid fa-rotate" />}
                  >
                    تازه‌سازی
                  </Button>
                </div>
              </div>
    
              <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-3 shadow-none dark:border-slate-800 dark:bg-slate-950">
                {isLoadingBackups ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-20 animate-pulse rounded-[22px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50" />
                    ))}
                  </div>
                ) : backupList.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                      <i className="fa-solid fa-box-archive" />
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">فعلاً بکاپی ثبت نشده است</div>
                    <div className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                      وقتی اولین بکاپ ساخته شود، فایل‌ها به‌صورت کارت‌های مرتب با عملیات دانلود، بررسی و بازیابی نمایش داده می‌شوند.
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        onClick={handleCreateBackupNow}
                        variant="primary"
                        size="sm"
                        className="unified-action-button unified-action-button--primary"
                        leftIcon={<i className="fa-solid fa-file-circle-plus" />}
                      >
                        ایجاد بکاپ
                      </Button>
                      <Button
                        onClick={fetchBackups}
                        variant="ghost"
                        size="sm"
                        className="unified-action-button unified-action-button--neutral"
                        leftIcon={<i className="fa-solid fa-rotate" />}
                      >
                        تازه‌سازی
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {backupList.map((b) => (
                      <div key={b.fileName} className="backup-file-card group rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-none transition dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="backup-file-card__icon grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              <i className="fa-solid fa-database" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 flex-wrap items-center gap-2"><div className="backup-file-card__name text-sm font-black text-slate-900 dark:text-slate-100" title={b.fileName}>{b.fileName}</div><span className="backup-file-card__badge inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-shield-halved text-[10px]" /> پشتیبان</span></div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                <span className="backup-file-card__meta-pill inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-950/70">
                                  <i className="fa-regular fa-clock" />
                                  {formatIranDateTime(b.mtime)}
                                </span>
                                <span className="backup-file-card__meta-pill inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-950/70">
                                  <i className="fa-solid fa-hard-drive" />
                                  {Math.round((b.size / 1024 / 1024) * 100) / 100} MB
                                </span>
                              </div>
                            </div>
                          </div>
    
                          <div className="backup-file-card__actions flex w-full flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
                            <Button onClick={() => handleDownloadBackupFile(b.fileName)} size="xs" variant="ghost" className="backup-file-action unified-action-button unified-action-button--neutral" leftIcon={<i className="fa-solid fa-download" />}>دانلود</Button>
                            <Button onClick={() => handleCheckRestore(b.fileName)} size="xs" variant="secondary" className="backup-file-action unified-action-button unified-action-button--info" leftIcon={<i className="fa-solid fa-vial" />}>بررسی و ادامه</Button>
                            <Button onClick={() => handleRestoreFromBackup(b.fileName)} size="xs" variant="warning" className="backup-file-action unified-action-button unified-action-button--warning" leftIcon={<i className="fa-solid fa-clock-rotate-left" />}>بازیابی</Button>
                            <Button onClick={() => handleDeleteBackupFile(b.fileName)} size="xs" variant="danger" className="backup-file-action unified-action-button unified-action-button--danger" leftIcon={<i className="fa-solid fa-trash-can" />} requiredRoles={['Admin']}>حذف</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
    
          <div className="settings-restore-zone">
            <div className="settings-restore-zone__header">
              <span className="settings-restore-zone__icon"><i className="fa-solid fa-triangle-exclamation" /></span>
              <div>
                <h4 className="settings-restore-zone__title">بازیابی اطلاعات</h4>
                <p className="settings-restore-zone__text">این عملیات اطلاعات فعلی را با محتوای فایل پشتیبان جایگزین می‌کند. قبل از ادامه، فایل و تاریخ بکاپ را دقیق بررسی کن.</p>
              </div>
            </div>
            <div className="settings-restore-zone__warning">
              <i className="fa-solid fa-lock" />
              <span>عملیات بازیابی غیرقابل بازگشت است و باید فقط با فایل معتبر دیتابیس انجام شود.</span>
            </div>
            <input type="file" ref={dbFileInputRef} onChange={handleDbFileChange} accept=".db" className="hidden" />
            <div className="settings-restore-zone__actions">
              <Button onClick={() => dbFileInputRef.current?.click()} disabled={isRestoringDb} loading={isRestoringDb} loadingText="در حال بازیابی..." variant="danger" leftIcon={<i className="fas fa-upload" />}>
                انتخاب فایل و بازیابی
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
