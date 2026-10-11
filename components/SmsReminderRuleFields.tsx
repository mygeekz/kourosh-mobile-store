import React from 'react';
import { TextField, SelectField } from './ui';
import { describeSmsReminder, smsReminderOptions, type SmsReminderContract, type SmsRuleReadiness } from '../shared/notifications/smsReminderRule';

export type SmsReminderEditorValue = Partial<SmsReminderContract> & { name: string; enabled: number };
export const SmsReminderReadiness: React.FC<{ readiness?: SmsRuleReadiness | null }> = ({ readiness }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 dark:border-slate-800 dark:bg-slate-900" role="status" data-sms-rule-readiness={readiness?.status || 'LOADING'}>
    <strong>{!readiness ? 'در حال بررسی قالب…' : readiness.status === 'DISABLED' ? 'غیرفعال' : readiness.ready ? 'آماده' : 'آماده نیست'}</strong>
    {readiness && <>
      <p>{readiness.templateLabel} — {readiness.message}</p>
      <p>سرویس: {readiness.provider === 'meli_payamak' ? 'ملی‌پیامک' : readiness.provider === 'unsupported' ? 'پشتیبانی‌نشده' : readiness.provider}</p>
      <p>اتصال قالب: {readiness.bindingExists ? 'تنظیم شده' : 'تنظیم نشده'} · تعداد متغیرها: {readiness.expectedTokenCount.toLocaleString('fa-IR')}</p>
    </>}
    <p className="mt-2 text-xs text-slate-500">قوانین پیامک فعلاً فقط مقایسه می‌شوند؛ ارسال همچنان با زمان‌بندی فعلی انجام می‌شود.</p>
  </div>
);

export const SmsReminderRuleFields: React.FC<{
  value: SmsReminderEditorValue;
  onChange: (patch: Partial<SmsReminderEditorValue>) => void;
  readiness?: SmsRuleReadiness | null;
  schemaReady: boolean;
  checking: boolean;
}> = ({ value, onChange, readiness, schemaReady, checking }) => {
  const current = smsReminderOptions.find(option => option.eventType === value.eventType);
  const choose = (eventType: string) => {
    const option = smsReminderOptions.find(item => item.eventType === eventType)!;
    const timingType = option.timings[0];
    onChange({ eventType: option.eventType, targetType: option.targetType, timingType, templateKey: option.templateKey,
      daysOffset: timingType === 'IMMEDIATE' ? 0 : 3, enabled: 0 });
  };
  const timingLabels = { BEFORE_DUE_DATE: 'قبل از سررسید', DUE_DATE: 'روز سررسید', AFTER_DUE_DATE: 'بعد از سررسید', IMMEDIATE: 'هنگام ثبت رویداد' };
  return <section className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" data-sms-rule-editor="true">
    {!schemaReady && <p role="alert" className="mb-4 text-sm text-amber-700">ذخیرهٔ قانون پیامک پس از ارتقای بررسی‌شدهٔ ساختار داده فعال می‌شود. فعلاً می‌توانید مشخصات و آمادگی قالب را بررسی کنید.</p>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TextField label="نام قانون پیامک" value={value.name} onChange={event => onChange({ name: event.target.value })} maxLength={200} />
      <SelectField label="موضوع یادآوری" value={value.targetType || 'installment'} onChange={event => choose(event.target.value === 'check' ? 'CHECK_DUE' : 'INSTALLMENT_DUE')}>
        <option value="installment">قسط</option><option value="check">چک</option>
      </SelectField>
      <SelectField label="نوع اعلان" value={value.eventType || ''} onChange={event => choose(event.target.value)}>
        {!current && <option value="">انتخاب نوع اعلان</option>}
        {smsReminderOptions.filter(item => item.targetType === value.targetType).map(item => <option key={item.eventType} value={item.eventType}>{item.label}</option>)}
      </SelectField>
      <SelectField label="زمان یادآوری" value={value.timingType || ''} onChange={event => {
        const timingType = event.target.value as SmsReminderContract['timingType'];
        onChange({ timingType, daysOffset: ['DUE_DATE','IMMEDIATE'].includes(timingType) ? 0 : Math.max(1, value.daysOffset || 3), enabled: 0 });
      }}>
        {current?.timings.map(timing => <option key={timing} value={timing}>{timingLabels[timing]}</option>)}
      </SelectField>
      <TextField label="تعداد روز" type="number" min={0} step={1} dir="ltr" value={value.daysOffset ?? ''}
        disabled={['DUE_DATE','IMMEDIATE'].includes(value.timingType || '')}
        onChange={event => onChange({ daysOffset: event.target.value === '' ? undefined : Number(event.target.value), enabled: 0 })} />
      <SelectField label="قالب پیامک" value={value.templateKey || ''} onChange={event => onChange({ templateKey: event.target.value || null, enabled: 0 })}>
        <option value="">بدون قالب — پیش‌نویس</option>
        {current && <option value={current.templateKey}>{current.label}</option>}
      </SelectField>
      <SelectField label="وضعیت قانون پیامک" value={value.enabled ? '1' : '0'} onChange={event => onChange({ enabled: Number(event.target.value) })}>
        <option value="0">غیرفعال / پیش‌نویس</option>
        <option value="1" disabled={checking || !readiness?.ready || !schemaReady}>فعال برای مقایسه</option>
      </SelectField>
    </div>
    <p className="my-4 font-bold" data-sms-rule-description="true">{describeSmsReminder(value)}</p>
    <SmsReminderReadiness readiness={checking ? null : readiness} />
  </section>;
};
