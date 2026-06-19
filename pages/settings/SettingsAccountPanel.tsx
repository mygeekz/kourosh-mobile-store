import React from 'react';
import type { SettingsAccountPanelProps } from './settingsPanelTypes';
import Button from '../../components/Button';


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
  settingsSectionCard,
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
}) => (
<div className="settings-inner-panel-redesign-v1 settings-account-redesign-v1 settings-panel-root min-w-0 space-y-5" data-ui-settings-panel="account">
  <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_18px_46px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/90">
    <input
      ref={meAvatarInputRef}
      type="file"
      accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
      className="hidden"
      onChange={handleMeAvatarChange}
    />

    <div className="p-5 md:p-6">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/35">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {meAvatarPreview ? (
              <img src={meAvatarPreview} className="h-full w-full object-cover" alt="پیش‌نمایش آواتار" />
            ) : accountProfile?.avatarUrl ? (
              <img src={accountProfile.avatarUrl} className="h-full w-full object-cover" alt={accountDisplayName} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">{accountInitial}</div>
            )}
            <span className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-emerald-500 text-[10px] text-white shadow-sm dark:border-slate-950">
              <i className="fa-solid fa-check" />
            </span>
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                <i className="fa-solid fa-shield-halved" />
                حساب فعال
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <i className="fa-solid fa-user-gear" />
                  مدیر سیستم
                </span>
              )}
            </div>

            <h2 className="text-[26px] font-black tracking-tight text-slate-950 dark:text-white">{accountDisplayName}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              مدیریت پروفایل شخصی، تصویر حساب و امنیت ورود در همین بخش انجام می‌شود. تغییر کاربران دیگر فقط از بخش «کاربران و نقش‌ها» انجام می‌شود.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex min-w-[170px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400"><i className="fa-solid fa-at" /> نام کاربری</span>
                <span dir="ltr" className="text-slate-950 dark:text-white">{accountProfile?.username || '—'}</span>
              </span>
              <span className="inline-flex min-w-[170px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400"><i className="fa-solid fa-user-lock" /> سطح دسترسی</span>
                <span>{getRoleLabelFa(accountProfile?.roleName)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">
            تصویر حساب فقط از همین ناحیه مدیریت می‌شود؛ حداکثر ۲ مگابایت، JPG، PNG، GIF، SVG یا WebP.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setTab('users')}
                leftIcon={<i className="fa-solid fa-users" />}
              >
                مدیریت کاربران
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => meAvatarInputRef.current?.click()}
              leftIcon={<i className="fa-solid fa-image" />}
            >
              انتخاب تصویر
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
        </div>

        {meAvatarFile && (
          <div className="mt-4 rounded-[22px] border border-sky-200 bg-sky-50/80 p-4 text-right dark:border-sky-900/40 dark:bg-sky-950/20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black text-sky-700 dark:text-sky-300">تصویر آماده ذخیره است</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{meAvatarFile.name}</div>
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">بعد از ذخیره، تصویر در پروفایل حساب اعمال می‌شود.</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3 text-right">
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">نمای مالی</div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">اطلاعات پایه و وضعیت دسترسی</div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <i className="fa-solid fa-id-badge" />
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {accountMetaItems.map((item) => (
            <div key={item.label} className="min-w-0 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 text-right dark:border-slate-800 dark:bg-slate-900/35">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <i className={`fa-solid ${item.icon}`} />
              </div>
              <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
              <div className="mt-1 text-sm font-black leading-6 text-slate-900 dark:text-slate-100">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>

  <section className={settingsSectionCard} data-ui-settings-card="section" data-settings-mode="advanced">
    <div className="flex items-start justify-between gap-3">
      <div className="text-right">
        <div className="text-base font-black text-slate-950 dark:text-white">امنیت ورود</div>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">رمز فقط برای حساب فعلی تغییر می‌کند. برای حساب‌های دیگر از «کاربران و نقش‌ها» استفاده کن.</p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <i className="fa-solid fa-shield-halved" />
      </span>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-4">
      <label className="block text-right">
        <span className={labelClass}>کلمه عبور فعلی</span>
        <div className="relative">
          <input
            type={showAccountPasswordFields ? 'text' : 'password'}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className={`${inputClass} pl-12 text-left`}
            dir="ltr"
            autoComplete="current-password"
            placeholder="Current password"
          />
          <button
            type="button"
            aria-label={showAccountPasswordFields ? 'مخفی کردن رمزها' : 'نمایش رمزها'}
            onClick={() => setShowAccountPasswordFields((prev) => !prev)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <i className={`fa-solid ${showAccountPasswordFields ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        </div>
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-right">
          <span className={labelClass}>کلمه عبور جدید</span>
          <input
            type={showAccountPasswordFields ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`${inputClass} text-left`}
            dir="ltr"
            autoComplete="new-password"
            placeholder="New password"
          />
        </label>

        <label className="block text-right">
          <span className={labelClass}>تکرار کلمه عبور جدید</span>
          <input
            type={showAccountPasswordFields ? 'text' : 'password'}
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            className={`${inputClass} text-left`}
            dir="ltr"
            autoComplete="new-password"
            placeholder="Repeat password"
          />
        </label>
      </div>

      <div className={`rounded-[22px] border p-4 transition-colors ${accountPasswordVisual.panel}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${accountPasswordVisual.badge}`}>
            <i className={`fa-solid ${accountPasswordVisual.icon}`} />
            {accountPasswordVisual.label}
          </span>
          <span className="text-xs font-bold leading-6">{accountPasswordVisual.text}</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900">
          <div className={`h-full rounded-full transition-all duration-300 ${accountPasswordVisual.tone}`} style={{ width: accountPasswordVisual.width }} />
        </div>
        <div className="mt-3 grid gap-2 text-[11px] font-bold sm:grid-cols-3">
          <span className={`inline-flex items-center gap-2 ${newPassword.length >= 6 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}><i className={`fa-solid ${newPassword.length >= 6 ? 'fa-circle-check' : 'fa-circle'}`} />حداقل ۶ کاراکتر</span>
          <span className={`inline-flex items-center gap-2 ${accountPasswordScore >= 2 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}><i className={`fa-solid ${accountPasswordScore >= 2 ? 'fa-circle-check' : 'fa-circle'}`} />ترکیب عدد و حروف</span>
          <span className={`inline-flex items-center gap-2 ${!accountPasswordMismatch && newPassword2 ? 'text-emerald-700 dark:text-emerald-300' : accountPasswordMismatch ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}><i className={`fa-solid ${!accountPasswordMismatch && newPassword2 ? 'fa-circle-check' : accountPasswordMismatch ? 'fa-circle-xmark' : 'fa-circle'}`} />تکرار رمز هماهنگ</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">برای جلوگیری از خطا، تا کامل‌بودن فرم دکمه تغییر رمز غیرفعال می‌ماند.</div>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleChangeMyPassword}
          disabled={!accountPasswordReady || isChangingPassword}
          loading={isChangingPassword}
          loadingText="در حال تغییر کلمه عبور…"
          leftIcon={<i className="fa-solid fa-key" />}
        >
          تغییر کلمه عبور
        </Button>
      </div>
    </div>
  </section>

  <aside className={settingsSectionCard} data-ui-settings-card="section">
    <div className="flex items-start justify-between gap-3">
      <div className="text-right">
        <div className="text-base font-black text-slate-950 dark:text-white">وضعیت حساب</div>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">خلاصه وضعیت ورود و دسترسی؛ کنترل تصویر فقط در هدر همین صفحه قرار دارد.</p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <i className="fa-solid fa-id-card-clip" />
      </span>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      {accountSecurityItems.map((item) => (
        <div key={item.label} className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-slate-50/60 p-3 text-right dark:border-slate-800 dark:bg-slate-900/45">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${item.ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}>
            <i className={`fa-solid ${item.ok ? 'fa-circle-check' : 'fa-circle-info'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 dark:text-slate-100">{item.label}</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{item.hint}</div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 text-right text-xs leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
      برای تغییر نقش، ساخت کاربر جدید یا غیرفعال‌کردن حساب‌ها از بخش «کاربران و نقش‌ها» استفاده می‌شود تا کنترل دسترسی‌ها از پروفایل شخصی جدا بماند.
    </div>
  </aside>
</div>
);

export default SettingsAccountPanel;
