import React, { useEffect, useMemo, useState } from 'react';
import { Dialog as Modal, SelectField, TextField } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import { apiFetch } from '../utils/apiFetch';
import { humanizeSmsError } from '../utils/smsErrorMessage';
import { fetchAllowedSmsTestRecipients } from '../utils/smsTestRecipientsClient';
import { normalizeSmsTestRecipientPhone, type SmsTestRecipient } from '../shared/smsTestRecipients';

type StudioTab = 'preview' | 'send';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bodyId: string;
  tokenLabels: string[];
  previewTemplate: string;
  initialTab?: StudioTab;
};

type SendResult = {
  ok: boolean;
  message: string;
  title?: string;
  action?: string;
  technical?: string;
};

const SmsPatternStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  bodyId,
  tokenLabels,
  previewTemplate,
  initialTab = 'preview',
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [to, setTo] = useState('');
  const [values, setValues] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [allowedRecipients, setAllowedRecipients] = useState<SmsTestRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState('');

  const patternIdentity = useMemo(
    () => `${title}\u0000${bodyId}\u0000${previewTemplate}\u0000${tokenLabels.join('\u0001')}`,
    [title, bodyId, previewTemplate, tokenLabels],
  );

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setTo('');
    setValues(tokenLabels.map(() => ''));
    setResult(null);
    setIsSending(false);
  }, [isOpen, initialTab, patternIdentity, tokenLabels]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let cancelled = false;
    setRecipientsLoading(true);
    setRecipientsError('');
    fetchAllowedSmsTestRecipients(token)
      .then(({ items }) => {
        if (cancelled) return;
        setAllowedRecipients(items);
        setTo((current) => items.some((item) => item.phone === current) ? current : (items[0]?.phone || ''));
      })
      .catch((error: any) => {
        if (cancelled) return;
        setAllowedRecipients([]);
        setTo('');
        setRecipientsError(String(error?.message || 'دریافت شماره‌های مجاز تست انجام نشد.'));
      })
      .finally(() => { if (!cancelled) setRecipientsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, token, patternIdentity]);

  const onChangeValue = (idx: number, value: string) => {
    setValues((prev) => {
      const next = tokenLabels.map((_, tokenIndex) => prev[tokenIndex] || '');
      next[idx] = value;
      return next;
    });
    setResult(null);
  };

  const previewText = useMemo(() => {
    let output = String(previewTemplate || '');
    tokenLabels.forEach((_label, idx) => {
      const replacement = String(values[idx] || '');
      output = output.replace(new RegExp(`\\{${idx + 1}\\}`, 'g'), replacement || `{${idx + 1}}`);
    });
    return output;
  }, [previewTemplate, tokenLabels, values]);

  const numericBodyId = Number(bodyId);
  const bodyIdReady = Number.isFinite(numericBodyId) && numericBodyId > 0;
  const normalizedPhone = normalizeSmsTestRecipientPhone(to);
  const selectedRecipient = allowedRecipients.find((item) => item.phone === normalizedPhone) || null;
  const phoneReady = Boolean(selectedRecipient);
  const allowlistReady = allowedRecipients.length > 0 && !recipientsLoading && !recipientsError;
  const missingTokenIndexes = tokenLabels
    .map((_label, idx) => (String(values[idx] || '').trim() ? -1 : idx))
    .filter((idx) => idx >= 0);
  const tokensReady = missingTokenIndexes.length === 0;
  const canSend = Boolean(token && bodyIdReady && phoneReady && allowlistReady && tokensReady && !isSending);

  const validationItems = [
    { ok: bodyIdReady, label: bodyIdReady ? `BodyId: ${bodyId}` : 'BodyId معتبر ثبت نشده است' },
    { ok: allowlistReady, label: allowlistReady ? 'فهرست مجاز تست از سرور دریافت شده است' : (recipientsLoading ? 'در حال دریافت فهرست مجاز تست…' : 'شماره فعالِ مجاز برای ارسال تست در تنظیمات ذخیره نشده است') },
    { ok: phoneReady, label: phoneReady ? `مقصد مجاز: ${selectedRecipient?.label || normalizedPhone}` : 'یک شماره از فهرست مجاز انتخاب کنید' },
    {
      ok: tokensReady,
      label: tokensReady
        ? 'همه متغیرهای پترن مقدار دارند'
        : `${missingTokenIndexes.length} متغیر هنوز بدون مقدار است`,
    },
  ];

  const sendCheck = async () => {
    if (!canSend) return;
    setIsSending(true);
    setResult(null);
    try {
      const response = await apiFetch('/api/sms/check-pattern', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bodyId: numericBodyId,
          to: normalizedPhone,
          tokens: values.map((value) => String(value || '')),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success) {
        setResult({ ok: true, message: data?.message || 'پیامک تست با موفقیت ارسال شد.' });
      } else {
        const humanError = humanizeSmsError(data?.message || data?.error || data);
        setResult({
          ok: false,
          title: humanError.title,
          message: humanError.message,
          action: humanError.action,
          technical: humanError.technical,
        });
      }
    } catch (error: any) {
      const humanError = humanizeSmsError(error?.message || 'ارتباط با سرور برای ارسال تست پیامک برقرار نشد.');
      setResult({
        ok: false,
        title: humanError.title,
        message: humanError.message,
        action: humanError.action,
        technical: humanError.technical,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} iconClass="fa-solid fa-message-check" widthClass="max-w-6xl">
      <div className="space-y-4" data-ui-sms-pattern-studio="v259">
        <div className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-4 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-200">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/80 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/30 dark:text-violet-200">
              <i className="fa-solid fa-wand-magic-sparkles" />
            </span>
            <div className="space-y-1 leading-7">
              <div className="font-bold">پیش‌نمایش و ارسال تست پترن</div>
              <div>متن اصلی پترن در پنل ملی‌پیامک تعریف می‌شود؛ این بخش برای بررسی ترتیب متغیرها، نتیجه نمونه و ارسال تست همان BodyId است.</div>
            </div>
          </div>
        </div>

        <div className="inline-flex w-full gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900/60" role="tablist" aria-label="مراحل بررسی پیامک">
          <Button
            type="button"
            variant={activeTab === 'preview' ? 'primary' : 'ghost'}
            size="sm"
            className="flex-1 justify-center rounded-xl"
            onClick={() => setActiveTab('preview')}
            aria-selected={activeTab === 'preview'}
            role="tab"
            aria-controls="sms-studio-preview-panel"
          >
            <i className="fa-regular fa-eye" />
            <span>پیش‌نمایش و متغیرها</span>
          </Button>
          <Button
            type="button"
            variant={activeTab === 'send' ? 'primary' : 'ghost'}
            size="sm"
            className="flex-1 justify-center rounded-xl"
            onClick={() => setActiveTab('send')}
            aria-selected={activeTab === 'send'}
            role="tab"
            aria-controls="sms-studio-send-panel"
          >
            <i className="fa-solid fa-paper-plane" />
            <span>اعتبارسنجی و ارسال تست</span>
          </Button>
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <i className="fa-solid fa-code text-violet-500" />
              <span>متغیرهای پترن</span>
            </div>
            <bdi dir="ltr" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
              BodyId: {bodyId || '—'}
            </bdi>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {tokenLabels.map((label, idx) => (
              <span key={`${label}-${idx}`} className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[11px] dark:bg-violet-950/40">{idx + 1}</span>
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tokenLabels.map((label, idx) => (
              <div key={`${label}-input-${idx}`}>
                <label className="app-label flex items-center gap-2">
                  <i className="fa-solid fa-tag text-violet-500" />
                  <span>{idx + 1}) {label}</span>
                </label>
                <TextField
                  controlOnly
                  className="app-input"
                  value={values[idx] || ''}
                  onChange={(event) => onChangeValue(idx, event.target.value)}
                  placeholder={`مقدار {${idx + 1}}`}
                  dir="auto"
                />
              </div>
            ))}
          </div>
        </section>

        {activeTab === 'preview' ? (
          <section id="sms-studio-preview-panel" className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40" role="tabpanel">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <i className="fa-solid fa-message-lines text-sky-500" />
              <span>پیش‌نمایش پیام</span>
            </div>
            <div className="whitespace-pre-wrap rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-800 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
              {previewText || 'برای این پترن متن پیش‌نمایش محلی تعریف نشده است.'}
            </div>
          </section>
        ) : (
          <div id="sms-studio-send-panel" className="space-y-4" role="tabpanel">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <label className="app-label flex items-center gap-2">
                  <i className="fa-solid fa-mobile-screen-button text-emerald-500" />
                  <span>شماره گیرنده تست</span>
                </label>
                <SelectField
                  controlOnly
                  className="app-input"
                  value={to}
                  onChange={(event) => { setTo(event.target.value); setResult(null); }}
                  disabled={recipientsLoading || allowedRecipients.length === 0}
                  aria-label="شماره مجاز مقصد تست پیامک"
                >
                  {allowedRecipients.length === 0 ? <option value="">شماره مجاز فعالی ثبت نشده است</option> : null}
                  {allowedRecipients.map((item) => <option key={item.phone} value={item.phone}>{item.label} — {item.phone}</option>)}
                </SelectField>
                <div className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">مقصد از Allowlist ذخیره‌شده روی سرور انتخاب می‌شود؛ ورود شماره دلخواه برای تست امکان‌پذیر نیست.</div>
                {recipientsError ? <div className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">{recipientsError}</div> : null}
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">اعتبارسنجی قبل از ارسال</div>
                <div className="space-y-2">
                  {validationItems.map((item) => (
                    <div key={item.label} className={`flex items-start gap-2 text-xs leading-6 ${item.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      <i className={`fa-solid ${item.ok ? 'fa-circle-check' : 'fa-circle-exclamation'} mt-1`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <i className="fa-regular fa-eye text-sky-500" />
                <span>متنی که با مقادیر فعلی بررسی می‌شود</span>
              </div>
              <div className="whitespace-pre-wrap rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-800 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                {previewText || 'متن پیش‌نمایش محلی برای این پترن در دسترس نیست؛ ارسال تست همچنان با BodyId انجام می‌شود.'}
              </div>
            </section>

            {result ? (
              <section aria-live="polite" className={`rounded-2xl border p-3 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200'}`}>
                <div className="flex items-start gap-2">
                  <i className={`fa-solid ${result.ok ? 'fa-circle-check text-green-600 dark:text-green-300' : 'fa-circle-exclamation text-red-600 dark:text-red-300'} mt-0.5`} />
                  <div className="min-w-0">
                    {result.title ? <div className="font-black">{result.title}</div> : null}
                    <div className={result.title ? 'mt-1 leading-7' : ''}>{result.message}</div>
                    {!result.ok && result.action ? (
                      <div className="mt-2 rounded-xl border border-current/15 bg-white/55 px-3 py-2 text-xs dark:bg-slate-950/20">
                        <span className="font-black">راهکار: </span>{result.action}
                      </div>
                    ) : null}
                    {!result.ok && result.technical ? (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer font-bold">جزئیات پاسخ</summary>
                        <pre dir="ltr" className="mt-2 max-h-32 overflow-auto rounded-xl bg-white/70 p-2 text-[11px] text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">{result.technical}</pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button onClick={onClose} variant="secondary" leftIcon={<i className="fa-solid fa-xmark" />}>
            بستن
          </Button>
          {activeTab === 'preview' ? (
            <Button onClick={() => setActiveTab('send')} variant="primary" leftIcon={<i className="fa-solid fa-arrow-left" />}>
              ادامه برای ارسال تست
            </Button>
          ) : (
            <Button
              onClick={sendCheck}
              disabled={!canSend}
              loading={isSending}
              loadingText="در حال ارسال…"
              variant="primary"
              leftIcon={!isSending ? <i className="fa-solid fa-paper-plane" /> : undefined}
            >
              ارسال تست پیامک
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SmsPatternStudioModal;
