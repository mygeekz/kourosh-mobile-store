import React from 'react';
import Button from '../../components/Button';
import SmsHealthCheckPanel from '../../components/SmsHealthCheckPanel';
import SmsLogsPanel from '../../components/SmsLogsPanel';
import { IconGlyph, SelectField, Surface, TextField } from '@/components/ui';
import type {
  SettingsSmsPanelProps,
  SmsPatternAccent,
  SmsPatternKey,
} from './settingsPanelTypes';
import {
  smsProviderDefinitions,
  type SmsProviderFieldDef,
  type SmsProviderFieldGroup,
} from './settingsSmsViewModels';

const automationOptions = [
  { value: 'off', label: 'خاموش' },
  { value: 'sms', label: 'فقط پیامک' },
  { value: 'telegram', label: 'فقط تلگرام' },
  { value: 'both', label: 'پیامک و تلگرام' },
];

const automationFields = [
  {
    key: 'auto_send_installment_due',
    title: 'یادآوری سررسید اقساط',
    hint: 'هفت روز قبل، سه روز قبل و روز سررسید',
    icon: 'fa-calendar-check',
  },
  {
    key: 'auto_send_check_due',
    title: 'یادآوری سررسید چک‌ها',
    hint: 'هفت روز قبل، سه روز قبل و روز سررسید',
    icon: 'fa-money-check-dollar',
  },
  {
    key: 'auto_send_repair_ready',
    title: 'تعمیر آماده تحویل',
    hint: 'پس از تغییر وضعیت تعمیر به آماده تحویل',
    icon: 'fa-screwdriver-wrench',
  },
] as const;

const groupMeta: Record<SmsProviderFieldGroup, { title: string; hint: string; icon: string }> = {
  credentials: { title: 'اتصال سرویس‌دهنده', hint: 'اطلاعات احراز هویت و مسیر ارسال', icon: 'fa-key' },
  installments: { title: 'اقساط', hint: 'قالب‌های مربوط به سررسید، پرداخت و تسویه', icon: 'fa-wallet' },
  checks: { title: 'چک‌ها', hint: 'قالب‌های یادآوری و وضعیت چک', icon: 'fa-money-check-dollar' },
  repairs: { title: 'تعمیرات', hint: 'قالب‌های چرخه پذیرش تا آماده تحویل', icon: 'fa-screwdriver-wrench' },
};

const statusTone = (ready: boolean) => ready
  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300'
  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300';

const SettingsSmsPanel: React.FC<SettingsSmsPanelProps> = ({
  tab,
  businessInfo,
  inputClass,
  labelClass,
  smsCoreReady,
  smsProviderMeta,
  smsProviderKey,
  smsCredentialReady,
  smsCredentialConfiguredCount,
  smsCredentialTotalCount,
  smsConfiguredCount,
  smsTotalCount,
  smsAutomationCount,
  smsReadinessPercent,
  smsMissingRequirements,
  infoChanged,
  isSaving,
  meliPatternDefs,
  handleBusinessInfoChange,
  handleBusinessInfoSubmit,
  scrollToSection,
  openSmsPatternPreview,
  openSmsPatternCheck,
  openSmsBulkCheck,
  openSmsBulkPanel,
}) => {
  const [visibleSecrets, setVisibleSecrets] = React.useState<Record<string, boolean>>({});
  const providerDefinition = smsProviderDefinitions[smsProviderKey] || smsProviderDefinitions.meli_payamak;
  const isMeliPayamak = providerDefinition.key === 'meli_payamak';
  const completionTone = smsReadinessPercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' : smsReadinessPercent >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

  if (tab !== 'sms') return null;

  const renderProviderField = (field: SmsProviderFieldDef) => {
    const value = String(businessInfo[field.key] || '');
    const isSecret = field.kind === 'secret';
    const isVisible = Boolean(visibleSecrets[field.key]);
    return (
      <div key={field.key} className="settings-sms-field min-w-0">
        <label htmlFor={field.key} className={labelClass}>
          {field.label}
          {field.required ? <span className="mr-1 text-rose-500">*</span> : null}
        </label>
        <div className="relative min-w-0">
          <TextField controlOnly
            id={field.key}
            name={field.key}
            type={isSecret && !isVisible ? 'password' : 'text'}
            value={value}
            onChange={handleBusinessInfoChange}
            className={`${inputClass} settings-sms-control ${isSecret ? '!pl-11' : ''}`}
            placeholder={field.placeholder || field.label}
            dir="ltr"
            inputMode={field.kind === 'numeric' ? 'numeric' : 'text'}
            autoComplete={isSecret ? 'new-password' : 'off'}
          />
          {isSecret ? (
            <button
              type="button"
              className="settings-sms-secret-toggle absolute left-1.5 top-1/2 inline-grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[10px] text-slate-500 dark:text-slate-300"
              onClick={() => setVisibleSecrets((current) => ({ ...current, [field.key]: !current[field.key] }))}
              aria-label={isVisible ? `مخفی کردن ${field.label}` : `نمایش ${field.label}`}
              title={isVisible ? 'مخفی کردن' : 'نمایش'}
            >
              <i className={`fa-solid ${isVisible ? 'fa-eye-slash' : 'fa-eye'} text-[11px]`} />
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderMeliPattern = (pattern: (typeof meliPatternDefs)[number]) => {
    const key = String(pattern.key) as SmsPatternKey;
    const value = String(businessInfo[key] || '').trim();
    const ready = Boolean(value);
    const accent: SmsPatternAccent = (pattern.accent || 'gray') as SmsPatternAccent;
    const iconTone = accent === 'emerald'
      ? 'success'
      : accent === 'blue'
        ? 'info'
        : accent === 'amber'
          ? 'warning'
          : 'neutral';

    return (
      <Surface key={key} surface="glass" variant="subtle" scheme="adaptive" className="settings-sms-pattern-card rounded-[18px]" contentClassName="p-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <IconGlyph size="md" tone={iconTone}>
            <i className={pattern.iconClass || 'fa-solid fa-message'} />
          </IconGlyph>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-[12px] font-black leading-5 text-slate-900 dark:text-slate-50">{pattern.label}</h4>
                <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{pattern.tokens.length ? `متغیرها: ${pattern.tokens.join('، ')}` : 'بدون متغیر'}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black ${statusTone(ready)}`}>
                <i className={`fa-solid ${ready ? 'fa-circle-check' : 'fa-circle-minus'}`} />
                {ready ? 'تنظیم شده' : 'ناقص'}
              </span>
            </div>
            <TextField controlOnly
              id={key}
              name={key}
              value={value}
              onChange={handleBusinessInfoChange}
              className={`${inputClass} settings-sms-control mt-2 !h-10 !min-h-10 !rounded-[13px] !text-[12px]`}
              placeholder="BodyId"
              dir="ltr"
              inputMode="numeric"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="xs"
                className="settings-sms-action rounded-[11px]"
                onClick={() => openSmsPatternPreview(`پیش‌نمایش: ${pattern.label}`, pattern.previewTemplate || '', pattern.tokens)}
                leftIcon={<i className="fa-regular fa-eye" />}
              >
                پیش‌نمایش
              </Button>
              <Button
                type="button"
                variant="primary"
                size="xs"
                className="settings-sms-action rounded-[11px]"
                disabled={!ready || !smsCredentialReady}
                onClick={() => openSmsPatternCheck(`ارسال تست: ${pattern.label}`, value, pattern.tokens)}
                leftIcon={<i className="fa-solid fa-paper-plane" />}
              >
                ارسال تست
              </Button>
            </div>
          </div>
        </div>
      </Surface>
    );
  };

  const groupedMeliPatterns = ['اقساط', 'تعمیرات', 'چک‌ها', 'حساب', 'فاکتورها'].map((category) => ({
    category,
    patterns: meliPatternDefs.filter((pattern) => pattern.category === category),
  })).filter((group) => group.patterns.length > 0);

  const groupedProviderFields = (['installments', 'checks', 'repairs'] as SmsProviderFieldGroup[])
    .map((group) => ({ group, fields: providerDefinition.templates.filter((field) => field.group === group) }))
    .filter((item) => item.fields.length > 0);

  return (
    <div className="settings-panel-root settings-sms-panel settings-sms-redesign-v2 space-y-4" data-ui-settings-panel="sms" data-ui-sms-redesign="v2">
      <Surface surface="glass" variant="panel" scheme="adaptive" className="rounded-[24px]" contentClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconGlyph size="lg" tone="accent">
              <i className="fa-solid fa-message text-[15px]" />
            </IconGlyph>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-black text-slate-950 dark:text-white sm:text-[20px]">مرکز پیامک</h2>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusTone(smsCoreReady)}`}>
                  <i className={`fa-solid ${smsCoreReady ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
                  {smsCoreReady ? 'آماده ارسال' : 'نیازمند تکمیل'}
                </span>
                {infoChanged ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300">
                    <i className="fa-solid fa-pen" /> تغییرات ذخیره نشده
                  </span>
                ) : null}
              </div>
              <p className="mt-1 max-w-3xl text-[11px] leading-6 text-slate-500 dark:text-slate-400 sm:text-[12px]">
                اتصال سرویس‌دهنده، قالب‌های واقعی، ارسال خودکار، سلامت پیکربندی و لاگ‌های ثبت‌شده SQLite را از یک مسیر مدیریت کنید.
              </p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4" data-ui-settings-grid="cards">
            {[
              { label: 'سرویس فعال', value: smsProviderMeta.title, icon: smsProviderMeta.icon, tone: 'text-primary' },
              { label: 'اطلاعات اتصال', value: `${smsCredentialConfiguredCount.toLocaleString('fa-IR')}/${smsCredentialTotalCount.toLocaleString('fa-IR')}`, icon: 'fa-key', tone: smsCredentialReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'قالب‌های فعال', value: `${smsConfiguredCount.toLocaleString('fa-IR')}/${smsTotalCount.toLocaleString('fa-IR')}`, icon: 'fa-layer-group', tone: 'text-slate-900 dark:text-white' },
              { label: 'آمادگی', value: `${smsReadinessPercent.toLocaleString('fa-IR')}٪`, icon: 'fa-gauge-high', tone: completionTone },
            ].map((item) => (
              <Surface key={item.label} surface="glass" variant="subtle" scheme="adaptive" className="settings-sms-metric rounded-[16px]" contentClassName="px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-400"><IconGlyph size="sm"><i className={`fa-solid ${item.icon}`} /></IconGlyph>{item.label}</div>
                <div className={`mt-1 truncate text-[12px] font-black ${item.tone}`}>{item.value}</div>
              </Surface>
            ))}
          </div>
        </div>

        <progress className="settings-sms-progress mt-4 h-1.5 w-full overflow-hidden rounded-full" max={100} value={smsReadinessPercent} aria-label="درصد آمادگی تنظیمات پیامک" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="xs" className="settings-sms-action rounded-[11px]" onClick={() => scrollToSection('sms-provider-section')} leftIcon={<i className="fa-solid fa-plug" />}>اتصال پنل</Button>
          <Button type="button" variant="secondary" size="xs" className="settings-sms-action rounded-[11px]" onClick={() => scrollToSection('sms-templates-section')} leftIcon={<i className="fa-solid fa-layer-group" />}>قالب‌ها</Button>
          <Button type="button" variant="secondary" size="xs" className="settings-sms-action rounded-[11px]" onClick={() => scrollToSection('sms-health-section')} leftIcon={<i className="fa-solid fa-shield-heart" />}>سلامت تنظیمات</Button>
          <Button type="button" variant="secondary" size="xs" className="settings-sms-action rounded-[11px]" onClick={() => scrollToSection('sms-logs-section')} leftIcon={<i className="fa-solid fa-clock-rotate-left" />}>سوابق ارسال</Button>
          {isMeliPayamak ? (
            <Button type="button" variant="secondary" size="xs" className="settings-sms-action rounded-[11px]" onClick={openSmsBulkPanel} leftIcon={<i className="fa-solid fa-vials" />}>بررسی گروهی</Button>
          ) : null}
        </div>
      </Surface>

      {!smsCoreReady && smsMissingRequirements.length ? (
        <section className="rounded-[18px] border border-amber-200 bg-amber-50/75 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <IconGlyph size="md" tone="warning"><i className="fa-solid fa-triangle-exclamation" /></IconGlyph>
            <div>
              <div className="text-[12px] font-black text-amber-800 dark:text-amber-200">برای ارسال واقعی این موارد تکمیل شوند</div>
              <div className="mt-1 text-[11px] leading-5 text-amber-700 dark:text-amber-300">{smsMissingRequirements.join('، ')}</div>
            </div>
          </div>
        </section>
      ) : null}

      <Surface id="sms-provider-section" surface="glass" variant="panel" scheme="adaptive" className="rounded-[22px]" contentClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconGlyph size="md" tone="accent"><i className="fa-solid fa-plug" /></IconGlyph>
            <div>
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">اتصال سرویس‌دهنده</h3>
              <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400 sm:text-[11px]">سرویس فعال و اطلاعات احراز هویت مورد استفاده در ارسال‌های واقعی را تنظیم کنید.</p>
            </div>
          </div>
          <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusTone(smsCredentialReady)}`}>
            <i className={`fa-solid ${smsCredentialReady ? 'fa-lock-open' : 'fa-lock'}`} />
            {smsCredentialReady ? 'اتصال تکمیل' : 'اتصال ناقص'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]" data-ui-settings-grid="form">
          <div className="min-w-0">
            <label className={labelClass}>سرویس‌دهنده فعال</label>
            <SelectField controlOnly unstyled showChevron={false} icon={false} name="sms_provider" value={smsProviderKey} onChange={handleBusinessInfoChange} className={`${inputClass} settings-sms-control`}>
              {Object.values(smsProviderDefinitions).map((provider) => <option key={provider.key} value={provider.key}>{provider.title}</option>)}
            </SelectField>
            <Surface surface="glass" variant="subtle" scheme="adaptive" className="mt-2 rounded-[14px]" contentClassName="px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-black text-slate-800 dark:text-slate-100"><IconGlyph size="sm" tone="accent"><i className={`fa-solid ${providerDefinition.icon}`} /></IconGlyph>{providerDefinition.title}</div>
              <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{providerDefinition.subtitle}</p>
            </Surface>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2" data-ui-settings-grid="form">
            {providerDefinition.credentials.map(renderProviderField)}
          </div>
        </div>
      </Surface>

      <Surface surface="glass" variant="panel" scheme="adaptive" className="rounded-[22px]" contentClassName="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <IconGlyph size="md"><i className="fa-solid fa-robot" /></IconGlyph>
          <div>
            <h3 className="text-[14px] font-black text-slate-950 dark:text-white">ارسال خودکار</h3>
            <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400 sm:text-[11px]">حالت هر رویداد را تعیین کنید. فقط گزینه‌های «پیامک» و «هر دو» در شمارش خودکارسازی پیامکی محاسبه می‌شوند.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3" data-ui-settings-grid="cards">
          {automationFields.map((field) => (
            <Surface key={field.key} surface="glass" variant="subtle" scheme="adaptive" className="settings-sms-automation rounded-[17px]" contentClassName="p-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <IconGlyph size="md"><i className={`fa-solid ${field.icon} text-[11px]`} /></IconGlyph>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">{field.title}</div>
                  <div className="mt-0.5 text-[9px] leading-4 text-slate-500 dark:text-slate-400">{field.hint}</div>
                </div>
              </div>
              <SelectField controlOnly unstyled showChevron={false} icon={false} name={field.key} value={String(businessInfo[field.key] || 'off')} onChange={handleBusinessInfoChange} className={`${inputClass} settings-sms-control mt-2 !h-10 !min-h-10 !rounded-[12px] !text-[11px]`}>
                {automationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
            </Surface>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-circle-info" />تعداد مسیرهای خودکار پیامکی فعال: {smsAutomationCount.toLocaleString('fa-IR')} از ۳</div>
      </Surface>

      <Surface id="sms-templates-section" surface="glass" variant="panel" scheme="adaptive" className="rounded-[22px]" contentClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconGlyph size="md" tone="accent"><i className="fa-solid fa-layer-group" /></IconGlyph>
            <div>
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">قالب‌های {providerDefinition.title}</h3>
              <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400 sm:text-[11px]">تنها قالب‌های تکمیل‌شده در رویدادهای واقعی قابل استفاده‌اند.</p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-list-check" />{smsConfiguredCount.toLocaleString('fa-IR')} از {smsTotalCount.toLocaleString('fa-IR')}</span>
        </div>

        {isMeliPayamak ? (
          <div className="mt-4 space-y-4">
            {groupedMeliPatterns.map((group) => (
              <Surface key={group.category} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[18px]" contentClassName="p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">{group.category}</div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{group.patterns.length.toLocaleString('fa-IR')} قالب</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2" data-ui-settings-grid="cards">{group.patterns.map(renderMeliPattern)}</div>
              </Surface>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {groupedProviderFields.map(({ group, fields }) => (
              <Surface key={group} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[18px]" contentClassName="p-3.5">
                <div className="flex items-start gap-2.5">
                  <IconGlyph size="md"><i className={`fa-solid ${groupMeta[group].icon} text-[11px]`} /></IconGlyph>
                  <div>
                    <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">{groupMeta[group].title}</div>
                    <div className="mt-0.5 text-[9px] leading-4 text-slate-500 dark:text-slate-400">{groupMeta[group].hint}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-ui-settings-grid="form">{fields.map(renderProviderField)}</div>
              </Surface>
            ))}
            <div className="rounded-[16px] border border-sky-200 bg-sky-50/70 px-4 py-3 text-[10px] leading-5 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300">
              <i className="fa-solid fa-circle-info ml-1" />ارسال تست مستقیم و بررسی گروهی در نسخه فعلی فقط برای ملی‌پیامک پیاده‌سازی شده است. سلامت سایر سرویس‌ها بر پایه تنظیمات واقعی و قالب‌های ثبت‌شده گزارش می‌شود.
            </div>
          </div>
        )}
      </Surface>

      <div id="sms-health-section">
        <SmsHealthCheckPanel patterns={meliPatternDefs} provider={smsProviderKey} onOpenBulkCheck={openSmsBulkCheck} />
      </div>

      <div id="sms-logs-section">
        <SmsLogsPanel />
      </div>

      <Surface
        surface="glass"
        variant="bar"
        scheme="adaptive"
        className="settings-sms-savebar sticky bottom-3 z-10 rounded-[18px]"
        contentClassName="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
          {infoChanged ? 'تغییرات این صفحه هنوز در تنظیمات سرور ذخیره نشده‌اند.' : 'تنظیمات نمایش‌داده‌شده با آخرین داده دریافت‌شده از سرور همگام است.'}
        </div>
        <Button type="button" variant="primary" size="sm" className="settings-sms-action min-w-[180px] rounded-[12px]" onClick={() => handleBusinessInfoSubmit()} loading={isSaving} loadingText="در حال ذخیره..." disabled={!infoChanged || isSaving} leftIcon={!isSaving ? <i className="fa-solid fa-floppy-disk" /> : undefined}>
          ذخیره تنظیمات پیامک
        </Button>
      </Surface>
    </div>
  );
};

export default SettingsSmsPanel;
