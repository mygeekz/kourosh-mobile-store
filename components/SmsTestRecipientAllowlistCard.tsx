import React from 'react';
import { IconGlyph, Surface, TextField } from '@/components/ui';
import Button from './Button';
import {
  SMS_TEST_RECIPIENT_MAX_ITEMS,
  isValidSmsTestRecipientPhone,
  normalizeSmsTestRecipientPhone,
  parseSmsTestRecipientAllowlist,
  serializeSmsTestRecipientAllowlist,
  type SmsTestRecipient,
} from '../shared/smsTestRecipients';

type Props = {
  value: string;
  onChange: (serialized: string) => void;
  dirty?: boolean;
};

const SmsTestRecipientAllowlistCard: React.FC<Props> = ({ value, onChange, dirty = false }) => {
  const items = React.useMemo(() => parseSmsTestRecipientAllowlist(value), [value]);
  const [phoneDraft, setPhoneDraft] = React.useState('');
  const [labelDraft, setLabelDraft] = React.useState('');
  const [error, setError] = React.useState('');

  const commit = React.useCallback((next: SmsTestRecipient[]) => {
    onChange(serializeSmsTestRecipientAllowlist(next));
    setError('');
  }, [onChange]);

  const addRecipient = () => {
    const phone = normalizeSmsTestRecipientPhone(phoneDraft);
    if (!isValidSmsTestRecipientPhone(phone)) {
      setError('شماره موبایل باید با فرمت 09xxxxxxxxx وارد شود.');
      return;
    }
    if (items.some((item) => item.phone === phone)) {
      setError('این شماره از قبل در فهرست مجاز وجود دارد.');
      return;
    }
    if (items.length >= SMS_TEST_RECIPIENT_MAX_ITEMS) {
      setError(`حداکثر ${SMS_TEST_RECIPIENT_MAX_ITEMS.toLocaleString('fa-IR')} شماره تست قابل ثبت است.`);
      return;
    }
    commit([...items, { phone, label: labelDraft.trim() || `شماره تست ${phone.slice(-4)}`, enabled: true }]);
    setPhoneDraft('');
    setLabelDraft('');
  };

  const updateItem = (phone: string, patch: Partial<SmsTestRecipient>) => {
    commit(items.map((item) => item.phone === phone ? { ...item, ...patch } : item));
  };

  const removeItem = (phone: string) => {
    commit(items.filter((item) => item.phone !== phone));
  };

  const enabledCount = items.filter((item) => item.enabled).length;

  return (
    <Surface id="sms-test-allowlist-section" surface="glass" variant="panel" scheme="adaptive" className="rounded-[22px]" contentClassName="p-4 sm:p-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconGlyph size="md" tone="success"><i className="fa-solid fa-shield-check" /></IconGlyph>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">شماره‌های مجاز ارسال تست</h3>
              {dirty ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300">ذخیره نشده</span> : null}
            </div>
            <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400 sm:text-[11px]">
              ارسال تست تکی و گروهی فقط به شماره‌های فعال این فهرست مجاز است. این محدودیت سمت سرور نیز کنترل می‌شود؛ پس از تغییر فهرست، تنظیمات پیامک را ذخیره کنید.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300">
          <i className="fa-solid fa-mobile-screen-button" />
          {enabledCount.toLocaleString('fa-IR')} فعال
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" data-ui-settings-grid="form">
        <div>
          <label className="app-label">عنوان شماره</label>
          <TextField controlOnly className="app-input" value={labelDraft} onChange={(event) => { setLabelDraft(event.target.value); setError(''); }} placeholder="مثلاً مدیر فروشگاه" maxLength={60} />
        </div>
        <div>
          <label className="app-label">شماره موبایل</label>
          <TextField controlOnly className="app-input" value={phoneDraft} onChange={(event) => { setPhoneDraft(event.target.value); setError(''); }} placeholder="09123456789" inputMode="tel" dir="ltr" maxLength={18} />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="primary" className="w-full lg:w-auto" onClick={addRecipient} leftIcon={<i className="fa-solid fa-plus" />}>
            افزودن شماره
          </Button>
        </div>
      </div>

      {error ? <div aria-live="polite" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">{error}</div> : null}

      <div className="mt-4 space-y-2">
        {items.length ? items.map((item) => (
          <div key={item.phone} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/40 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-slate-900 dark:text-slate-100">{item.label}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${item.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                  {item.enabled ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <bdi dir="ltr" className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{item.phone}</bdi>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="xs" variant={item.enabled ? 'secondary' : 'primary'} onClick={() => updateItem(item.phone, { enabled: !item.enabled })} leftIcon={<i className={`fa-solid ${item.enabled ? 'fa-pause' : 'fa-play'}`} />}>
                {item.enabled ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
              </Button>
              <Button type="button" size="xs" variant="danger" onClick={() => removeItem(item.phone)} leftIcon={<i className="fa-solid fa-trash" />}>
                حذف
              </Button>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-xs leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
            هنوز شماره مجاز تست ثبت نشده است. تا زمانی که حداقل یک شماره فعال را اضافه و تنظیمات را ذخیره نکنید، API ارسال تست پیامک اجازه ارسال نخواهد داد.
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-[10px] leading-5 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300">
        <i className="fa-solid fa-circle-info ml-1" />
        متن Pattern در پنل ملی‌پیامک ثابت است؛ بنابراین سامانه نمی‌تواند بدون تغییر Pattern عبارت «پیام آزمایشی» را به متن واقعی اضافه کند. ایمنی ارسال تست با همین Allowlist اجباری تأمین می‌شود.
      </div>
    </Surface>
  );
};

export default SmsTestRecipientAllowlistCard;
