import React from 'react';
import Button from '../../components/Button';
import { TextField } from '@/components/ui';
import type { SettingsAccountPanelProps } from './settingsPanelTypes';

const SettingsAccountPanel: React.FC<SettingsAccountPanelProps> = ({
  meAvatarInputRef,
  handleMeAvatarChange,
  meAvatarPreview,
  accountProfile,
  accountDisplayName,
  accountInitial,
  isAdmin,
  getRoleLabelFa,
  setTab,
  meAvatarFile,
  isUploadingAvatar,
  handleMeAvatarUpload,
  accountMetaItems,
  labelClass,
  inputClass,
  showAccountPasswordFields,
  setShowAccountPasswordFields,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  newPassword2,
  setNewPassword2,
  accountPasswordVisual,
  accountPasswordScore,
  accountPasswordMismatch,
  handleChangeMyPassword,
  accountPasswordReady,
  isChangingPassword,
  accountSecurityItems,
  profileFirstName,
  setProfileFirstName,
  profileLastName,
  setProfileLastName,
  accountProfileDirty,
  isSavingProfile,
  handleSaveMyProfile,
}) => {
  const avatarSource = meAvatarPreview || accountProfile?.avatarUrl || null;
  const completionSignals = [
    accountProfile?.username,
    profileFirstName.trim(),
    profileLastName.trim(),
    accountProfile?.roleName,
    avatarSource,
  ];
  const profileCompletion = Math.round((completionSignals.filter(Boolean).length / completionSignals.length) * 100);
  const passwordWidthClass = !newPassword
    ? 'w-0'
    : accountPasswordMismatch || accountPasswordScore >= 3
      ? 'w-full'
      : newPassword.length >= 6
        ? 'w-2/3'
        : 'w-1/3';

  const openAvatarPicker = () => {
    if (!meAvatarInputRef.current) return;
    meAvatarInputRef.current.value = '';
    meAvatarInputRef.current.click();
  };

  return (
    <div
      className="settings-inner-panel-redesign-v1 settings-account-redesign-v1 settings-account-redesign-v2 settings-panel-root min-w-0 space-y-4"
      data-ui-settings-panel="account"
    >
      <TextField controlOnly
        ref={meAvatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleMeAvatarChange}
      />

      <div className="settings-account-identity-grid grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]" data-ui-settings-grid="cards">
        <section className="settings-account-card min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_20px_52px_-44px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 text-right">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-300">
                  <i className="fa-solid fa-circle-check" />
                  حساب فعال
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-user-shield" />
                  {getRoleLabelFa(accountProfile?.roleName)}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black ${accountProfileDirty ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/45 dark:bg-amber-950/25 dark:text-amber-300' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}>
                  <i className={`fa-solid ${accountProfileDirty ? 'fa-circle-exclamation' : 'fa-circle-check'}`} />
                  {accountProfileDirty ? 'تغییرات ذخیره نشده' : 'پروفایل به‌روز است'}
                </span>
              </div>

              <h2 className="mt-3 truncate text-[22px] font-black tracking-[-0.025em] text-slate-950 dark:text-white sm:text-[25px]">
                {accountDisplayName}
              </h2>
              <p className="mt-1.5 max-w-3xl text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                اطلاعات هویتی حساب، تصویر پروفایل و امنیت ورود را از یک فضای یکپارچه مدیریت کنید.
              </p>
            </div>

            <div className="w-full rounded-[18px] border border-slate-200 bg-slate-50/75 p-3 dark:border-slate-800 dark:bg-slate-900/50 lg:w-[210px]">
              <div className="flex items-center justify-between gap-3 text-[10px] font-black text-slate-500 dark:text-slate-400">
                <span>تکمیل پروفایل</span>
                <span>{profileCompletion.toLocaleString('fa-IR')}٪</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
                نام، نام خانوادگی و تصویر حساب، شناسایی کاربر در سیستم را کامل‌تر می‌کنند.
              </div>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2" data-ui-settings-grid="form">
            <label className="block min-w-0 text-right">
              <span className={labelClass}>نام</span>
              <TextField
                value={profileFirstName}
                onChange={(event) => setProfileFirstName(event.target.value)}
                maxLength={80}
                placeholder="نام کاربر"
                icon={<i className="fa-solid fa-user" />}
                className="text-right"
                autoComplete="given-name"
              />
            </label>

            <label className="block min-w-0 text-right">
              <span className={labelClass}>نام خانوادگی</span>
              <TextField
                value={profileLastName}
                onChange={(event) => setProfileLastName(event.target.value)}
                maxLength={80}
                placeholder="نام خانوادگی"
                icon={<i className="fa-solid fa-user-tag" />}
                className="text-right"
                autoComplete="family-name"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2" data-ui-settings-grid="cards">
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/45">
              <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-at" />
                نام کاربری
              </span>
              <strong dir="ltr" className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">
                {accountProfile?.username || '—'}
              </strong>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/45">
              <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-key" />
                سطح دسترسی
              </span>
              <strong className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">
                {getRoleLabelFa(accountProfile?.roleName)}
              </strong>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              نام کاربری و نقش از بخش مدیریت کاربران کنترل می‌شوند؛ در اینجا فقط مشخصات شخصی حساب فعلی ویرایش می‌شود.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setTab('users')}
                  leftIcon={<i className="fa-solid fa-users" />}
                >
                  کاربران و نقش‌ها
                </Button>
              ) : null}
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!accountProfileDirty || isSavingProfile}
                loading={isSavingProfile}
                loadingText="در حال ذخیره پروفایل…"
                onClick={handleSaveMyProfile}
                leftIcon={<i className="fa-solid fa-floppy-disk" />}
              >
                ذخیره مشخصات
              </Button>
            </div>
          </div>
        </section>

        <aside className="settings-account-card min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_20px_52px_-44px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-right">
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">تصویر حساب</h3>
              <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">نمایش در هدر و منوی کاربری</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-300">
              <i className="fa-solid fa-circle" />
              فعال
            </span>
          </div>

          <div className="mt-4 flex flex-col items-center rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-5 text-center dark:border-slate-800 dark:bg-slate-900/45">
            <div className="relative h-24 w-24 overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_18px_34px_-26px_rgba(15,23,42,0.34)] ring-1 ring-slate-200 dark:border-slate-950 dark:bg-slate-900 dark:ring-slate-700">
              {avatarSource ? (
                <img src={avatarSource} className="h-full w-full object-cover" alt={`تصویر ${accountDisplayName}`} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {accountInitial}
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[9px] text-white shadow-sm dark:border-slate-950">
                <i className="fa-solid fa-check" />
              </span>
            </div>

            <div className="mt-3 max-w-full text-[11px] font-black text-slate-800 dark:text-slate-100">
              {meAvatarFile ? 'تصویر جدید آماده ذخیره است' : avatarSource ? 'تصویر فعلی حساب' : 'هنوز تصویری ثبت نشده است'}
            </div>
            <div className="mt-1 max-w-full truncate text-[10px] text-slate-500 dark:text-slate-400">
              {meAvatarFile?.name || 'JPG، PNG، GIF یا WebP تا ۲ مگابایت'}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2" data-ui-settings-grid="actions" data-ui-settings-actions="stack">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openAvatarPicker}
              leftIcon={<i className="fa-solid fa-image" />}
            >
              انتخاب
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!meAvatarFile || isUploadingAvatar}
              loading={isUploadingAvatar}
              loadingText="در حال ذخیره…"
              onClick={handleMeAvatarUpload}
              leftIcon={<i className="fa-solid fa-cloud-arrow-up" />}
            >
              ذخیره تصویر
            </Button>
          </div>
        </aside>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]" data-ui-settings-grid="cards">
        <section className="settings-account-card min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_20px_52px_-44px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:p-5" data-ui-settings-card="account-security">
          <div className="flex items-start justify-between gap-3">
            <div className="text-right">
              <h3 className="text-[15px] font-black text-slate-950 dark:text-white">امنیت ورود</h3>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                رمز عبور فقط برای حساب فعلی تغییر می‌کند و پس از موفقیت، فیلدها به‌صورت خودکار پاک می‌شوند.
              </p>
            </div>
            <button
              type="button"
              aria-label={showAccountPasswordFields ? 'مخفی کردن رمزها' : 'نمایش رمزها'}
              onClick={() => setShowAccountPasswordFields((prev) => !prev)}
              className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <i className={`fa-solid ${showAccountPasswordFields ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3" data-ui-settings-grid="form">
            <label className="block min-w-0 text-right">
              <span className={labelClass}>رمز عبور فعلی</span>
              <TextField controlOnly
                type={showAccountPasswordFields ? 'text' : 'password'}
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                className={`${inputClass} text-left`}
                dir="ltr"
                autoComplete="current-password"
                placeholder="Current password"
              />
            </label>
            <label className="block min-w-0 text-right">
              <span className={labelClass}>رمز عبور جدید</span>
              <TextField controlOnly
                type={showAccountPasswordFields ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={`${inputClass} text-left`}
                dir="ltr"
                autoComplete="new-password"
                placeholder="New password"
              />
            </label>
            <label className="block min-w-0 text-right">
              <span className={labelClass}>تکرار رمز جدید</span>
              <TextField controlOnly
                type={showAccountPasswordFields ? 'text' : 'password'}
                value={newPassword2}
                onChange={(event) => setNewPassword2(event.target.value)}
                className={`${inputClass} text-left`}
                dir="ltr"
                autoComplete="new-password"
                placeholder="Repeat password"
              />
            </label>
          </div>

          <div className={`mt-4 rounded-[18px] border p-3.5 transition-colors ${accountPasswordVisual.panel}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black ${accountPasswordVisual.badge}`}>
                <i className={`fa-solid ${accountPasswordVisual.icon}`} />
                {accountPasswordVisual.label}
              </span>
              <span className="text-[11px] font-bold leading-5">{accountPasswordVisual.text}</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900">
              <div className={`h-full rounded-full transition-all duration-300 ${accountPasswordVisual.tone} ${passwordWidthClass}`} />
            </div>
            <div className="mt-3 grid gap-2 text-[10px] font-bold sm:grid-cols-3" data-ui-settings-grid="cards">
              <span className={`inline-flex items-center gap-2 ${newPassword.length >= 6 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                <i className={`fa-solid ${newPassword.length >= 6 ? 'fa-circle-check' : 'fa-circle'}`} />
                حداقل ۶ کاراکتر
              </span>
              <span className={`inline-flex items-center gap-2 ${accountPasswordScore >= 2 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                <i className={`fa-solid ${accountPasswordScore >= 2 ? 'fa-circle-check' : 'fa-circle'}`} />
                ترکیب حروف و عدد
              </span>
              <span className={`inline-flex items-center gap-2 ${!accountPasswordMismatch && newPassword2 ? 'text-emerald-700 dark:text-emerald-300' : accountPasswordMismatch ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>
                <i className={`fa-solid ${!accountPasswordMismatch && newPassword2 ? 'fa-circle-check' : accountPasswordMismatch ? 'fa-circle-xmark' : 'fa-circle'}`} />
                تکرار رمز هماهنگ
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              برای جلوگیری از درخواست ناقص، دکمه تا ورود رمز فعلی و هماهنگ‌بودن رمز جدید غیرفعال است.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleChangeMyPassword}
              disabled={!accountPasswordReady || isChangingPassword}
              loading={isChangingPassword}
              loadingText="در حال تغییر رمز…"
              leftIcon={<i className="fa-solid fa-key" />}
            >
              تغییر رمز عبور
            </Button>
          </div>
        </section>

        <aside className="settings-account-card min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_20px_52px_-44px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:p-5" data-ui-settings-card="account-status">
          <div className="flex items-center justify-between gap-3">
            <div className="text-right">
              <h3 className="text-[15px] font-black text-slate-950 dark:text-white">وضعیت حساب</h3>
              <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">دسترسی، نشست و سوابق پایه</p>
            </div>
            <span className="inline-grid h-9 w-9 place-items-center rounded-[13px] bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-id-card-clip" />
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {accountSecurityItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-slate-50/65 p-3 text-right dark:border-slate-800 dark:bg-slate-900/45">
                <span className={`inline-grid h-8 w-8 shrink-0 place-items-center rounded-[11px] ${item.ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                  <i className={`fa-solid ${item.ok ? 'fa-circle-check' : 'fa-circle-info'}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">{item.label}</div>
                  <div className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{item.hint}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2" data-ui-settings-grid="cards">
            {accountMetaItems.map((item) => (
              <div key={item.label} className="min-w-0 rounded-[15px] border border-slate-200 bg-white px-3 py-2.5 text-right dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 dark:text-slate-400">
                  <i className={`fa-solid ${item.icon}`} />
                  {item.label}
                </div>
                <div className="mt-1 truncate text-[10px] font-black text-slate-900 dark:text-slate-100">{item.value}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SettingsAccountPanel;
