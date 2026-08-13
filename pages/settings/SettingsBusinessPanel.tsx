import React from 'react';
import { Link } from 'react-router-dom';
import type { SettingsBusinessPanelProps } from './settingsPanelTypes';
import Button from '../../components/Button';
import { SelectField, TextField } from '@/components/ui';
import { formatCurrencyText, normalizeCurrencyUnit } from '../../utils/currency';
import defaultGoldLogoUrl from '../../components/assets/kourosh-final-symbol-gold.svg';

type BusinessFieldProps = {
  label: string;
  icon: string;
  required?: boolean;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

const BusinessField: React.FC<BusinessFieldProps> = ({ label, icon, required, hint, className = '', children }) => (
  <label className={`block min-w-0 text-right ${className}`}>
    <span className="mb-2 flex items-center gap-2 text-[12px] font-black text-slate-700 dark:text-slate-200">
      <i className={`fa-solid ${icon} w-4 text-center text-slate-400 dark:text-slate-500`} aria-hidden="true" />
      {label}
      {required ? <span className="text-rose-500">*</span> : null}
    </span>
    {children}
    {hint ? <span className="mt-1.5 block text-[10.5px] leading-5 text-slate-500 dark:text-slate-400">{hint}</span> : null}
  </label>
);

const SettingsBusinessPanel: React.FC<SettingsBusinessPanelProps> = ({
  businessInfo,
  businessSummaryItems,
  businessAddressSummary,
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
  partnerShareChipIcon,
  partnerShareStatus,
  handleBusinessInfoSubmit,
  handleBusinessInfoChange,
  handleLogoFileChange,
  handleLogoUpload,
  handleLogoReset,
  logoInputRefClick,
}) => {
  const compactInputClass = `${inputClass} !min-h-[44px] !rounded-[15px] !px-3.5 !py-2.5 !text-[13px] !shadow-none`;
  const storeName = String(businessInfo.store_name || '').trim();
  const hasContact = Boolean(String(businessInfo.store_phone || '').trim() || String(businessInfo.store_email || '').trim());
  const hasAddress = Boolean(businessAddressSummary);
  const hasPublicQr = Boolean(String(businessInfo.qr_public_base_url || '').trim());
  const profileChecks = [Boolean(storeName), hasContact, hasAddress, true, hasPublicQr];
  const profileCompletion = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);
  const partnerStatusToneClass = partnerShareStatus.state === 'ready'
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
    : partnerShareStatus.state === 'warning'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200'
      : partnerShareStatus.state === 'error'
        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-200'
        : 'bg-slate-500/10 text-slate-600 dark:text-slate-300';
  const completionWidthClass: Record<number, string> = {
    0: 'w-0',
    20: 'w-1/5',
    40: 'w-2/5',
    60: 'w-3/5',
    80: 'w-4/5',
    100: 'w-full',
  };

  return (
    <form
      id="settings-form"
      onSubmit={handleBusinessInfoSubmit}
      className="settings-inner-panel-redesign-v1 settings-business-redesign-v1 settings-panel-root min-w-0 space-y-4"
      data-ui-settings-panel="business"
      data-ui-business-profile="redesigned"
    >
      <TextField controlOnly
        type="file"
        ref={logoInputRef}
        onChange={handleLogoFileChange}
        accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
        className="hidden"
      />

      <section className="settings-business-identity-grid grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]" data-ui-business-identity="true" data-ui-settings-grid="cards">
        <div className="min-w-0 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/90 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <i className="fa-solid fa-store" />
              </span>
              <div className="min-w-0 text-right">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">پروفایل کسب‌وکار</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${profileCompletion === 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                    تکمیل {profileCompletion.toLocaleString('fa-IR')}٪
                  </span>
                </div>
                <h2 className="mt-2 truncate text-[20px] font-black tracking-[-0.02em] text-slate-950 dark:text-white sm:text-[23px]">
                  {storeName || 'نام فروشگاه تنظیم نشده'}
                </h2>
                <p className="mt-1 max-w-3xl text-[11px] leading-6 text-slate-500 dark:text-slate-400 sm:text-[12px]">
                  اطلاعات رسمی فروشگاه در سایدبار، فاکتور، رسید، QR و خروجی‌های چاپی از همین صفحه تأمین می‌شود.
                </p>
              </div>
            </div>

            <div className="w-full shrink-0 sm:w-[190px]">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span>وضعیت پروفایل</span>
                <span>{profileCompletion.toLocaleString('fa-IR')}٪</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div className={`h-full rounded-full bg-primary transition-[width] duration-300 ${completionWidthClass[profileCompletion] || 'w-0'}`} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4" data-ui-settings-grid="cards">
            {businessSummaryItems.map((item) => {
              const isEmailSummary = item.label === 'ایمیل';
              const summaryValue = String(item.value ?? '');
              return (
                <div key={item.label} className="min-w-0 overflow-hidden rounded-[16px] bg-slate-50 px-3 py-2.5 text-right dark:bg-slate-900/65">
                  <div className="flex min-w-0 items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400">
                    <i className={`fa-solid ${item.icon} w-3.5 shrink-0 text-center`} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </div>
                  <div
                    className={`mt-1 min-w-0 text-[12px] font-black leading-5 text-slate-900 dark:text-slate-100 ${
                      isEmailSummary
                        ? 'whitespace-normal break-all text-left [overflow-wrap:anywhere] [unicode-bidi:plaintext]'
                        : 'truncate'
                    }`}
                    dir={isEmailSummary ? 'ltr' : 'rtl'}
                    title={summaryValue}
                  >
                    {summaryValue}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/90" data-ui-business-logo="true">
          <div className="flex items-start justify-between gap-3" data-ui-business-logo-header="true">
            <div className="min-w-0 text-right">
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">لوگوی فروشگاه</h3>
              <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">نمایش در سایدبار، فاکتور و خروجی چاپی</p>
            </div>
            <span
              className={`inline-flex min-h-7 shrink-0 items-center rounded-full px-2.5 py-1 text-[9.5px] font-black ${logoFile ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' : logoPreview ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}
              data-ui-business-logo-status="true"
            >
              {logoFile ? 'در انتظار ذخیره' : logoPreview ? 'سفارشی' : 'طلایی پیش‌فرض'}
            </span>
          </div>

          <div
            className="mt-3 rounded-[18px] border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/55"
            data-ui-business-logo-preview="true"
          >
            <div className="flex min-w-0 items-center gap-3" data-ui-business-logo-preview-row="true">
              <figure
                className="inline-grid h-[82px] w-[82px] shrink-0 place-items-center overflow-hidden rounded-[20px] border border-white/90 bg-white shadow-[0_14px_28px_-22px_rgba(15,23,42,0.34)] dark:border-slate-800 dark:bg-slate-950"
                data-ui-business-logo-figure="true"
              >
                <img
                  src={logoPreview || defaultGoldLogoUrl}
                  className="h-full w-full object-contain p-2.5"
                  alt={logoPreview ? 'پیش‌نمایش لوگوی سفارشی فروشگاه' : 'پیش‌نمایش لوگوی طلایی پیش‌فرض کوروش'}
                />
              </figure>
              <div className="min-w-0 flex-1 text-right" data-ui-business-logo-copy="true">
                <span className="block text-[11px] font-black leading-5 text-slate-800 dark:text-slate-100">{logoPreview ? 'لوگوی سفارشی فعال' : 'لوگوی طلایی پیش‌فرض'}</span>
                <span className="mt-1 block text-[10px] leading-5 text-slate-500 dark:text-slate-400">همین نشان در سایدبار، فاکتور و خروجی‌های چاپی نمایش داده می‌شود.</span>
                <span className="mt-1.5 block text-[9.5px] font-bold leading-5 text-slate-400 dark:text-slate-500">PNG، JPG، SVG یا WebP تا ۲ مگابایت</span>
                {logoFile ? <span className="mt-1 block text-[10px] font-bold leading-5 text-sky-600 dark:text-sky-300" data-ui-business-logo-file="true">{logoFile.name}</span> : null}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2" data-ui-settings-grid="actions" data-ui-settings-actions="logo">
            <Button type="button" variant="secondary" size="sm" onClick={logoInputRefClick} leftIcon={<i className="fa-solid fa-image" />} data-ui-business-logo-action="select">
              انتخاب
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleLogoUpload}
              disabled={!logoFile || isUploadingLogo}
              loading={isUploadingLogo}
              loadingText="در حال ذخیره…"
              leftIcon={<i className="fa-solid fa-cloud-arrow-up" />}
              data-ui-business-logo-action="save"
            >
              ذخیره لوگو
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLogoReset}
              disabled={(!businessInfo.store_logo_path && !logoFile) || isUploadingLogo}
              leftIcon={<i className="fa-solid fa-rotate-left" />}
              data-ui-business-logo-action="reset"
            >
              لوگوی طلایی
            </Button>
          </div>
        </aside>
      </section>

      {canManageStoreOwnership && partnerSetupNeedsAttention ? (
        <section className="rounded-[20px] border border-amber-200/80 bg-amber-50/60 p-3.5 shadow-none dark:border-amber-400/20 dark:bg-slate-900/80" data-ui-settings-card="ownership-alert" data-settings-mode="advanced">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 text-right">
              <span className="inline-grid h-9 w-9 shrink-0 place-items-center border-0 bg-transparent text-amber-700 shadow-none dark:text-amber-300">
                <i className="fa-solid fa-handshake" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-black text-slate-900 dark:text-white">ساختار مالکیت و تسهیم سود نیاز به تکمیل دارد</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border-0 px-2 py-0.5 text-[9.5px] font-black shadow-none ${partnerStatusToneClass}`} title={partnerShareStatus.hint}>
                    <i className={`fa-solid ${partnerShareChipIcon}`} />
                    {partnerShareStatus.label}
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] leading-5 text-slate-600 dark:text-slate-300">پس از رسیدن مجموع سهم شرکا به ۱۰۰٪، این هشدار خودکار حذف می‌شود.</p>
              </div>
            </div>
            <Link to="/settings/store-ownership" className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-[13px] border border-slate-300 bg-transparent px-3.5 py-2 text-[11px] font-black text-slate-800 shadow-none transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px hover:border-slate-400 hover:bg-white/70 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800">
              <i className="fa-solid fa-arrow-up-right-from-square" />
              تکمیل تنظیمات
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]" data-ui-settings-grid="form">
        <section className={`${settingsSectionCard} !rounded-[22px] !p-4 sm:!p-5`} data-ui-settings-card="business-main">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <div className="text-right">
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">مشخصات و ارتباطات</h3>
              <p className="mt-1 text-[10.5px] leading-5 text-slate-500 dark:text-slate-400">اطلاعاتی که روی فاکتور، رسید و پیام‌های فروشگاه نمایش داده می‌شود.</p>
            </div>
            <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-address-card" />
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2" data-ui-settings-grid="form">
            <BusinessField label="نام فروشگاه" icon="fa-store" required>
              <TextField controlOnly type="text" id="store_name" name="store_name" value={businessInfo.store_name || ''} onChange={handleBusinessInfoChange} className={compactInputClass} placeholder="مثلاً فروشگاه کوروش" autoComplete="organization" />
            </BusinessField>

            <BusinessField label="تلفن فروشگاه" icon="fa-phone">
              <TextField controlOnly type="tel" id="store_phone" name="store_phone" value={businessInfo.store_phone || ''} onChange={handleBusinessInfoChange} className={`${compactInputClass} text-left`} dir="ltr" inputMode="tel" placeholder="021..." autoComplete="tel" />
            </BusinessField>

            <BusinessField label="ایمیل فروشگاه" icon="fa-envelope">
              <TextField controlOnly type="email" id="store_email" name="store_email" value={businessInfo.store_email || ''} onChange={handleBusinessInfoChange} className={`${compactInputClass} text-left`} dir="ltr" placeholder="store@example.com" autoComplete="email" />
            </BusinessField>

            <BusinessField label="واحد پول نمایشی" icon="fa-coins" hint={`پیش‌نمایش: ${formatCurrencyText(1250000, businessInfo.currency_unit)}`}>
              <SelectField controlOnly unstyled showChevron={false} icon={false} id="currency_unit" name="currency_unit" value={normalizeCurrencyUnit(businessInfo.currency_unit)} onChange={handleBusinessInfoChange} className={`${compactInputClass} cursor-pointer`}>
                <option value="toman">تومان</option>
                <option value="rial">ریال</option>
              </SelectField>
            </BusinessField>

            <BusinessField
              label="آدرس پایه Web App عمومی (Legacy)"
              icon="fa-link"
              className="settings-grid-span-full"
              hint="فقط برای flowهای قدیمی لینک Web/PWA است؛ آدرس Mini App تلگرام، QR و دسترسی محلی از این مقدار مستقل هستند."
            >
              <TextField controlOnly type="url" id="app_base_url" name="app_base_url" value={businessInfo.app_base_url || ''} onChange={handleBusinessInfoChange} className={`${compactInputClass} text-left`} dir="ltr" placeholder="https://app.example.com" inputMode="url" />
            </BusinessField>

            <BusinessField
              label="آدرس عمومی QR فاکتور"
              icon="fa-qrcode"
              className="settings-grid-span-full"
              hint="این URL مستقل است و با Local URL، Mini App یا Cloud همگام‌سازی خودکار ندارد."
            >
              <TextField controlOnly type="url" id="qr_public_base_url" name="qr_public_base_url" value={businessInfo.qr_public_base_url || ''} onChange={handleBusinessInfoChange} className={`${compactInputClass} text-left`} dir="ltr" placeholder="https://your-public-site.com" inputMode="url" />
            </BusinessField>
          </div>
        </section>

        <section className={`${settingsSectionCard} !rounded-[22px] !p-4 sm:!p-5`} data-ui-settings-card="business-address" data-settings-mode="advanced">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <div className="text-right">
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">آدرس و موقعیت فروشگاه</h3>
              <p className="mt-1 text-[10.5px] leading-5 text-slate-500 dark:text-slate-400">آدرس چاپی و اطلاعات تماس حضوری فروشگاه.</p>
            </div>
            <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-location-dot" />
            </span>
          </div>

          <div className="space-y-3.5">
            <BusinessField label="آدرس - خط اول" icon="fa-location-crosshairs">
              <TextField controlOnly type="text" id="store_address_line1" name="store_address_line1" value={businessInfo.store_address_line1 || ''} onChange={handleBusinessInfoChange} className={compactInputClass} autoComplete="address-line1" placeholder="خیابان، کوچه و پلاک" />
            </BusinessField>
            <BusinessField label="آدرس - خط دوم" icon="fa-building">
              <TextField controlOnly type="text" id="store_address_line2" name="store_address_line2" value={businessInfo.store_address_line2 || ''} onChange={handleBusinessInfoChange} className={compactInputClass} autoComplete="address-line2" placeholder="طبقه، واحد یا توضیح تکمیلی" />
            </BusinessField>
            <BusinessField label="شهر، استان و کدپستی" icon="fa-map-location-dot">
              <TextField controlOnly type="text" id="store_city_state_zip" name="store_city_state_zip" value={businessInfo.store_city_state_zip || ''} onChange={handleBusinessInfoChange} className={compactInputClass} autoComplete="postal-code" placeholder="تهران، تهران، ۱۲۳۴۵۶۷۸۹۰" />
            </BusinessField>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-[15px] bg-slate-50 px-3 py-2.5 text-right text-[10.5px] leading-5 text-slate-500 dark:bg-slate-900/65 dark:text-slate-400">
            <i className="fa-solid fa-location-dot mt-1 shrink-0" />
            <span>{businessAddressSummary || 'هنوز آدرس کامل فروشگاه ثبت نشده است.'}</span>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/90 sm:flex-row sm:items-center sm:justify-between" data-ui-business-save-bar="true">
        <div className="flex items-center gap-2 text-right text-[10.5px] leading-5 text-slate-500 dark:text-slate-400">
          <span className={`inline-grid h-8 w-8 shrink-0 place-items-center rounded-[12px] ${infoChanged ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
            <i className={`fa-solid ${infoChanged ? 'fa-pen' : 'fa-check'}`} />
          </span>
          <span>{infoChanged ? 'تغییرات ذخیره‌نشده دارید. برای اعمال در فاکتور و برندینگ، ذخیره را بزنید.' : 'اطلاعات کسب‌وکار با آخرین نسخه ذخیره‌شده همگام است.'}</span>
        </div>
        <Button type="submit" disabled={!infoChanged || isSaving} loading={isSaving} loadingText="در حال ذخیره تغییرات..." variant="primary" size="sm" leftIcon={<i className="fa-solid fa-floppy-disk" />}>
          ذخیره اطلاعات کسب‌وکار
        </Button>
      </div>
    </form>
  );
};

export default SettingsBusinessPanel;
