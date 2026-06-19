import React from 'react';
import { Link } from 'react-router-dom';
import type { SettingsBusinessPanelProps } from './settingsPanelTypes';
import Button from '../../components/Button';
import { formatCurrencyText, normalizeCurrencyUnit } from '../../utils/currency';


const SettingsBusinessPanel: React.FC<SettingsBusinessPanelProps> = ({
  businessInfo,
  businessSummaryItems,
  businessAddressSummary,
  labelClass,
  inputClass,
  settingsSectionCard,
  logoInputRef,
  logoPreview,
  logoFile,
  isUploadingLogo,
  infoChanged,
  isSaving,
  canManageStoreOwnership,
  partnerSetupNeedsAttention,
  partnerShareChipClass,
  partnerShareChipIcon,
  partnerShareStatus,
  handleBusinessInfoSubmit,
  handleBusinessInfoChange,
  handleLogoFileChange,
  handleLogoUpload,
  logoInputRefClick,
}) => (
<form id="settings-form" onSubmit={handleBusinessInfoSubmit} className="settings-inner-panel-redesign-v1 settings-business-redesign-v1 settings-panel-root min-w-0 space-y-5" data-ui-settings-panel="business">
  <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp" className="hidden" />

  <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_18px_46px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/90">
    <div className="p-5 md:p-6">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/35">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {logoPreview ? (
                <img src={logoPreview} className="h-full w-full object-contain p-2" alt="لوگوی فروشگاه" />
              ) : (
                <i className="fa-solid fa-store text-3xl text-slate-400" />
              )}
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <i className="fa-solid fa-badge-check" />
                  پروفایل فروشگاه
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black ${logoPreview ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'}`}>
                  <i className={`fa-solid ${logoPreview ? 'fa-circle-check' : 'fa-circle-info'}`} />
                  {logoPreview ? 'لوگو آماده است' : 'لوگو تنظیم نشده'}
                </span>
              </div>

              <h2 className="text-[26px] font-black tracking-tight text-slate-950 dark:text-white">{businessInfo.store_name || 'نام فروشگاه تنظیم نشده'}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                هویت رسمی فروشگاه، اطلاعات تماس، واحد پول و آدرس عمومی QR از اینجا کنترل می‌شود. این اطلاعات در هدر، سایدبار، فاکتور و خروجی‌های چاپی استفاده می‌شود.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {businessSummaryItems.map((item) => (
                  <span key={item.label} className="inline-flex min-w-[170px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400"><i className={`fa-solid ${item.icon}`} /> {item.label}</span>
                    <span className="max-w-[170px] truncate" dir={item.label === 'ایمیل' ? 'ltr' : 'rtl'}>{item.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={logoInputRefClick} leftIcon={<i className="fa-solid fa-image" />}>
              انتخاب لوگو
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleLogoUpload} disabled={!logoFile || isUploadingLogo} loading={isUploadingLogo} loadingText="در حال آپلود…" leftIcon={<i className="fa-solid fa-cloud-arrow-up" />}>
              ذخیره لوگو
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/80 pt-4 text-right dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">
            فقط همین بخش برای لوگوی فروشگاه استفاده می‌شود؛ اندازه پیشنهادی ۵۱۲×۵۱۲ و حداکثر حجم ۲ مگابایت است.
          </div>
          {logoFile && (
            <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200">
              <i className="fa-solid fa-file-image" />
              <span className="truncate">{logoFile.name}</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {businessSummaryItems.map((item) => (
          <div key={item.label} className="min-w-0 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 text-right dark:border-slate-800 dark:bg-slate-900/35">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <i className={`fa-solid ${item.icon}`} />
            </div>
            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="mt-1 truncate text-sm font-black leading-6 text-slate-900 dark:text-slate-100" dir={item.label === 'ایمیل' ? 'ltr' : 'rtl'}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  </section>

  {canManageStoreOwnership && partnerSetupNeedsAttention && (
    <section className={settingsSectionCard} data-ui-settings-card="section" data-settings-mode="advanced">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 text-right">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] dark:text-[var(--sidebar-hover-fg-dark)]">
            <i className="fa-solid fa-handshake" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-black text-slate-900 dark:text-white">تکمیل ساختار مالکیت و تسهیم سود</div>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${partnerShareChipClass}`} title={partnerShareStatus.hint}>
                <i className={`fa-solid ${partnerShareChipIcon}`} />
                {partnerShareStatus.label}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              این هشدار فقط تا زمان تکمیل ساختار شرکا نمایش داده می‌شود؛ پس از رسیدن جمع سهم‌ها به ۱۰۰٪، کارت از این صفحه حذف می‌شود و مسیر اصلی از منوی تنظیمات باقی می‌ماند.
            </p>
          </div>
        </div>
        <Link to="/settings/store-ownership" className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
          <i className="fa-solid fa-arrow-up-right-from-square" />
          تکمیل تنظیمات شرکا
        </Link>
      </div>
    </section>
  )}

  <section className={settingsSectionCard} data-ui-settings-card="section">
    <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
      <div className="text-right">
        <div className="text-base font-black text-slate-950 dark:text-white">اطلاعات اصلی فروشگاه</div>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">این فیلدها روی فاکتور، رسید، پیام‌ها و خروجی‌های چاپی اثر می‌گذارند.</p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <i className="fa-solid fa-store" />
      </span>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <label className="block text-right">
        <span className={labelClass}>نام فروشگاه</span>
        <input type="text" id="store_name" name="store_name" value={businessInfo.store_name || ''} onChange={handleBusinessInfoChange} className={inputClass} placeholder="مثلاً فروشگاه کوروش" />
      </label>
      <label className="block text-right">
        <span className={labelClass}>تلفن فروشگاه</span>
        <input type="text" id="store_phone" name="store_phone" value={businessInfo.store_phone || ''} onChange={handleBusinessInfoChange} className={`${inputClass} text-left`} dir="ltr" placeholder="021..." />
      </label>
      <label className="block text-right">
        <span className={labelClass}>ایمیل فروشگاه</span>
        <input type="email" id="store_email" name="store_email" value={businessInfo.store_email || ''} onChange={handleBusinessInfoChange} className={`${inputClass} text-left`} dir="ltr" placeholder="store@example.com" />
      </label>
      <label className="block text-right">
        <span className={labelClass}>واحد پول نمایشی</span>
        <select id="currency_unit" name="currency_unit" value={normalizeCurrencyUnit(businessInfo.currency_unit)} onChange={handleBusinessInfoChange} className={inputClass}>
          <option value="toman">تومان</option>
          <option value="rial">ریال</option>
        </select>
        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">پیش‌نمایش فعلی: {formatCurrencyText(1250000, businessInfo.currency_unit)}</p>
      </label>
      <label className="block text-right lg:col-span-2">
        <span className={labelClass}>آدرس سایت عمومی برای QR Code</span>
        <input type="url" id="qr_public_base_url" name="qr_public_base_url" value={businessInfo.qr_public_base_url || ''} onChange={handleBusinessInfoChange} className={`${inputClass} text-left`} dir="ltr" placeholder="https://your-public-site.com" />
        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">این آدرس در QR فاکتور/رسید استفاده می‌شود؛ مثلاً برای نمایش آنلاین فاکتور.</p>
      </label>
    </div>
  </section>

  <section className={settingsSectionCard} data-ui-settings-card="section" data-settings-mode="advanced">
    <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
      <div className="text-right">
        <div className="text-base font-black text-slate-950 dark:text-white">آدرس و موقعیت فروشگاه</div>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">آدرس در چاپ فاکتور و اطلاعات تماس فروشگاه استفاده می‌شود.</p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <i className="fa-solid fa-location-dot" />
      </span>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <label className="block text-right">
        <span className={labelClass}>آدرس - خط ۱</span>
        <input type="text" id="store_address_line1" name="store_address_line1" value={businessInfo.store_address_line1 || ''} onChange={handleBusinessInfoChange} className={inputClass} />
      </label>
      <label className="block text-right">
        <span className={labelClass}>آدرس - خط ۲</span>
        <input type="text" id="store_address_line2" name="store_address_line2" value={businessInfo.store_address_line2 || ''} onChange={handleBusinessInfoChange} className={inputClass} />
      </label>
      <label className="block text-right lg:col-span-2">
        <span className={labelClass}>شهر، استان، کدپستی</span>
        <input type="text" id="store_city_state_zip" name="store_city_state_zip" value={businessInfo.store_city_state_zip || ''} onChange={handleBusinessInfoChange} className={inputClass} />
      </label>
    </div>

    <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 text-right text-xs leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400">
      {businessAddressSummary || 'هنوز آدرس کامل فروشگاه ثبت نشده است.'}
    </div>
  </section>

  <div className="flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:flex-row sm:items-center sm:justify-between">
    <div className="text-right text-xs leading-6 text-slate-500 dark:text-slate-400">
      تغییرات اطلاعات کسب‌وکار بعد از ذخیره روی برندینگ، فاکتور و خروجی‌ها اعمال می‌شود.
    </div>
    <Button type="submit" disabled={!infoChanged || isSaving} loading={isSaving} loadingText="در حال ذخیره تغییرات..." variant="primary" leftIcon={<i className="fa-solid fa-floppy-disk" />}>
      ذخیره تغییرات اطلاعات کسب‌وکار
    </Button>
  </div>
</form>
);

export default SettingsBusinessPanel;
