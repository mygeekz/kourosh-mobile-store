import React, { useEffect, useMemo, useState } from 'react';
import { Dialog as Modal, SearchableSelectField, SelectField, TextField } from '@/components/ui';
import Button from './Button';
import ToggleSwitch from './ToggleSwitch';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { humanizeTelegramError } from '../utils/telegramErrorMessage';
import {
  TemplateFormat,
  TemplateVariable,
  applyTemplate,
  extractPlaceholders,
  renderTemplatePreviewHtml,
  validatePlaceholders,
} from '../utils/templatePreview';

type TelegramAudience = 'customer' | 'partner' | 'manager';
type StudioTab = 'preview' | 'send';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  template: string;
  format?: TemplateFormat;
  allowedVars?: TemplateVariable[];
  audience?: TelegramAudience;
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

const TelegramTemplateCheckModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  template,
  format: formatProp,
  allowedVars: allowedVarsProp,
  audience = 'customer',
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('preview');
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; title?: string; action?: string; technical?: string } | null>(null);
  const [format, setFormat] = useState<TemplateFormat>('text');
  const [allowedVars, setAllowedVars] = useState<TemplateVariable[]>([]);
  const [recipientList, setRecipientList] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const templateIdentity = useMemo(
    () => `${title}\u0000${audience}\u0000${formatProp || 'text'}\u0000${template}\u0000${(allowedVarsProp || []).map((item) => item.key).join('\u0001')}`,
    [title, audience, formatProp, template, allowedVarsProp],
  );

  const previews = useMemo(() => uniq(extractPlaceholders(String(template || ''))), [template]);
  const previewText = useMemo(() => applyTemplate(String(template || ''), values), [template, values]);
  const previewHtml = useMemo(() => renderTemplatePreviewHtml(format, previewText), [format, previewText]);
  const validation = useMemo(() => validatePlaceholders(previews, allowedVars), [previews, allowedVars]);
  const missingValues = useMemo(
    () => previews.filter((key) => !String(values[key] || '').trim()),
    [previews, values],
  );
  const canSend = Boolean(token && String(template || '').trim() && validation.unknown.length === 0 && missingValues.length === 0 && !isSending);

  const audienceMeta = useMemo(() => ({
    customer: { label: 'مشتری', selectLabel: 'انتخاب مشتری', searchPlaceholder: 'جستجوی مشتری (نام/شماره/ID)…', endpoint: '/api/customers' },
    partner: { label: 'همکار', selectLabel: 'انتخاب همکار', searchPlaceholder: 'جستجوی همکار (نام/شماره/ID)…', endpoint: '/api/partners' },
    manager: { label: 'مدیر', selectLabel: 'انتخاب مدیر', searchPlaceholder: 'جستجوی مدیر (نام کاربری/نقش/ID)…', endpoint: '/api/users' },
  } as const), []);

  const getRecipientName = (item: any) => {
    if (!item) return '';
    const full = `${item?.firstName || ''} ${item?.lastName || ''}`.trim();
    return String(item?.fullName || item?.name || item?.customerFullName || item?.partnerName || full || item?.username || 'بدون نام');
  };

  const getRecipientSub = (item: any) => String(item?.phoneNumber || item?.phone || item?.mobile || item?.username || item?.roleName || '');

  const buildSampleValues = (recipient: any | null): Record<string, string> => ({
    name: getRecipientName(recipient),
    phone: recipient?.phoneNumber || recipient?.phone || recipient?.mobile || '',
    amount: '1,250,000',
    dueDate: '1404/12/15',
    days: '3',
    saleId: '1024',
    total: '12,500,000',
    checkNumber: 'A-55822',
    deviceModel: 'iPhone 13 Pro',
    repairId: 'R-2025',
    status: 'آماده تحویل',
    estimatedCost: '850,000',
    finalCost: '920,000',
    invoiceNo: 'INV-1024',
    link: 'https://example.com/#/installments',
    now: '1404/12/10 12:00',
  });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('preview');
    setFormat((String(formatProp || 'text').toLowerCase() as TemplateFormat) || 'text');
    setAllowedVars(Array.isArray(allowedVarsProp) ? allowedVarsProp : []);
    setSelectedRecipient(null);
    setValues(buildSampleValues(null));
    setShowRaw(false);
    setResult(null);
    setIsSending(false);
  }, [isOpen, templateIdentity, formatProp, allowedVarsProp]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      try {
        const response = await apiFetch(audienceMeta[audience].endpoint);
        const data = await response.json().catch(() => ({}));
        let list = data?.data || data?.customers || data?.partners || data?.users || data?.items || [];
        if (audience === 'manager' && Array.isArray(list)) {
          list = list.filter((item: any) => /admin|manager|مدیر/i.test(String(item?.roleName || item?.role || item?.username || '')));
        }
        if (alive) setRecipientList(Array.isArray(list) ? list : []);
      } catch {
        if (alive) setRecipientList([]);
      }
    })();
    return () => { alive = false; };
  }, [isOpen, audience, audienceMeta, templateIdentity]);

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildSampleValues(selectedRecipient));
    setResult(null);
  }, [selectedRecipient, isOpen]);

  const recipientOptions = useMemo(() => recipientList
    .filter((item) => item?.id != null)
    .map((item) => ({
      value: String(item.id),
      label: `${getRecipientName(item)}${getRecipientSub(item) ? ` — ${getRecipientSub(item)}` : ''}`,
      searchText: `${getRecipientName(item)} ${getRecipientSub(item)} ${item.id}`,
      recipient: item,
    })), [recipientList]);

  const onChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const send = async () => {
    if (!canSend) return;
    setIsSending(true);
    setResult(null);
    try {
      const response = await apiFetch('/api/telegram/check-message', {
        method: 'POST',
        body: JSON.stringify({
          text: previewText,
          parseMode: format === 'html' ? 'HTML' : format === 'markdown' ? 'Markdown' : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) throw new Error(data?.message || 'ارسال تلگرام انجام نشد');
      setResult({ ok: true, message: data?.message || 'پیام تست تلگرام با موفقیت ارسال شد.' });
    } catch (error: any) {
      const humanError = humanizeTelegramError(error?.message || 'ارسال تلگرام ناموفق بود.');
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

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} iconClass="fa-brands fa-telegram" widthClass="max-w-6xl">
      <div className="space-y-4" data-ui-telegram-template-studio="v258">
        <div className="rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4 text-sm leading-7 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-200/70 bg-white/80 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/30 dark:text-sky-200">
              <i className="fa-brands fa-telegram" />
            </span>
            <div>
              <div className="font-bold">پیش‌نمایش، اعتبارسنجی و ارسال تست</div>
              <div>انتخاب {audienceMeta[audience].label} فقط اطلاعات نمونه پیش‌نمایش را پر می‌کند؛ ارسال تست همیشه به Chat ID تست/مدیریت تنظیم‌شده برای تلگرام انجام می‌شود.</div>
            </div>
          </div>
        </div>

        <div className="inline-flex w-full gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900/60" role="tablist" aria-label="مراحل بررسی قالب تلگرام">
          <Button
            type="button"
            variant={activeTab === 'preview' ? 'primary' : 'ghost'}
            size="sm"
            className="flex-1 justify-center rounded-xl"
            onClick={() => setActiveTab('preview')}
            aria-selected={activeTab === 'preview'}
            role="tab"
            aria-controls="telegram-studio-preview-panel"
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
            aria-controls="telegram-studio-send-panel"
          >
            <i className="fa-solid fa-paper-plane" />
            <span>اعتبارسنجی و ارسال تست</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">فرمت پیام</div>
                <div className="flex items-center gap-2">
                  <SelectField
                    controlOnly
                    unstyled
                    showChevron={false}
                    value={format}
                    onChange={(event) => { setFormat((event.target.value as TemplateFormat) || 'text'); setResult(null); }}
                    className="rounded-xl border px-3 py-2 text-sm outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                  </SelectField>
                  <div className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <ToggleSwitch checked={showRaw} onCheckedChange={setShowRaw} ariaLabel="نمایش متن خام" size="sm" />
                    <span>نمایش خام</span>
                  </div>
                </div>
              </div>

              {allowedVars.length > 0 ? (
                <div className="mt-3">
                  <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">متغیرهای قابل استفاده</div>
                  <div className="flex flex-wrap gap-2">
                    {allowedVars.map((variable) => (
                      <Button
                        key={variable.key}
                        type="button"
                        onClick={() => onChange(variable.key, values[variable.key] || variable.example || '')}
                        variant="ghost"
                        size="xs"
                        className="rounded-full"
                        title={variable.label || variable.key}
                      >
                        {'{'}{variable.key}{'}'}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">چیپ‌ها فقط برای پرکردن مقدار نمونه هستند و متن اصلی Template را تغییر نمی‌دهند.</div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">داده واقعی برای پیش‌نمایش ({audienceMeta[audience].selectLabel})</div>
              <SearchableSelectField<string, { value: string; label: string; searchText: string; recipient: any }>
                value={selectedRecipient?.id != null ? String(selectedRecipient.id) : null}
                onValueChange={(_value, option) => setSelectedRecipient(option?.recipient || null)}
                options={recipientOptions}
                placeholder={audienceMeta[audience].searchPlaceholder}
                noOptionsMessage={`${audienceMeta[audience].label} مطابق جستجو پیدا نشد`}
                ariaLabel={`جستجو و ${audienceMeta[audience].selectLabel}`}
                clearable
              />
              <div className="mt-2 text-[11px] leading-6 text-slate-500">این انتخاب مقصد ارسال تست نیست؛ فقط داده‌های نمونه مثل نام و شماره را برای Preview پر می‌کند.</div>
            </section>

            {previews.length > 0 ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">مقادیر متغیرها</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {previews.map((key) => (
                    <div key={key}>
                      <label className="app-label">{'{'}{key}{'}'}</label>
                      <TextField
                        controlOnly
                        value={values[key] || ''}
                        onChange={(event) => onChange(key, event.target.value)}
                        className="app-input"
                        placeholder={`مقدار برای {${key}}`}
                        dir="auto"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div id="telegram-studio-preview-panel" className="space-y-4" role="tabpanel">
            <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">پیش‌نمایش پیام</div>
              <div className="min-h-32 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                {showRaw ? (
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-800 dark:text-slate-200">{previewText || '—'}</pre>
                ) : (
                  <div className="text-sm leading-7 text-slate-800 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: previewHtml || '—' }} />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">اعتبارسنجی Template</div>
              <div className="space-y-2 text-xs leading-6">
                <div className={`flex items-start gap-2 ${validation.unknown.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  <i className={`fa-solid ${validation.unknown.length === 0 ? 'fa-circle-check' : 'fa-circle-exclamation'} mt-1`} />
                  <span>{validation.unknown.length === 0 ? 'همه Placeholderها معتبر هستند.' : `متغیرهای ناشناخته: ${validation.unknown.map((key) => `{${key}}`).join('، ')}`}</span>
                </div>
                <div className={`flex items-start gap-2 ${missingValues.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  <i className={`fa-solid ${missingValues.length === 0 ? 'fa-circle-check' : 'fa-circle-exclamation'} mt-1`} />
                  <span>{missingValues.length === 0 ? 'همه متغیرهای استفاده‌شده مقدار دارند.' : `${missingValues.length} متغیر هنوز بدون مقدار است: ${missingValues.map((key) => `{${key}}`).join('، ')}`}</span>
                </div>
                <div className={`flex items-start gap-2 ${token ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  <i className={`fa-solid ${token ? 'fa-circle-check' : 'fa-circle-exclamation'} mt-1`} />
                  <span>{token ? 'نشست مدیریتی برای ارسال تست فعال است.' : 'برای ارسال تست باید با حساب مدیریتی وارد شده باشید.'}</span>
                </div>
              </div>
            </section>

            {activeTab === 'send' ? (
              <section id="telegram-studio-send-panel" role="tabpanel" className="rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4 text-sm leading-7 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-circle-info mt-1" />
                  <div>
                    <div className="font-bold">مقصد ارسال تست</div>
                    <div>پیام به مشتری/همکار انتخاب‌شده ارسال نمی‌شود. Endpoint تست، پیام را به Chat ID تست/مدیریت تنظیم‌شده در بخش تلگرام می‌فرستد.</div>
                  </div>
                </div>
              </section>
            ) : null}

            {result ? (
              <section aria-live="polite" className={`rounded-2xl border p-4 text-sm ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-200'}`}>
                {result.ok ? (
                  <div className="flex items-start gap-2"><i className="fa-solid fa-circle-check mt-1" /><span>{result.message}</span></div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-bold">{result.title || 'ارسال تلگرام ناموفق بود'}</div>
                    <div className="leading-7">{result.message}</div>
                    {result.action ? <div className="rounded-lg border border-rose-200/80 bg-white/70 px-3 py-2 text-xs leading-6"><b>راهکار:</b> {result.action}</div> : null}
                    {result.technical ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-bold">جزئیات پاسخ</summary>
                        <pre dir="ltr" className="mt-2 max-h-32 overflow-auto rounded-xl bg-white/70 p-2 text-[11px] text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">{result.technical}</pre>
                      </details>
                    ) : null}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button onClick={onClose} variant="secondary" size="sm">بستن</Button>
          {activeTab === 'preview' ? (
            <Button onClick={() => setActiveTab('send')} size="sm" leftIcon={<i className="fa-solid fa-arrow-left" />}>
              ادامه برای ارسال تست
            </Button>
          ) : (
            <Button
              disabled={!canSend}
              onClick={send}
              size="sm"
              loading={isSending}
              loadingText="در حال ارسال…"
              leftIcon={!isSending ? <i className="fa-solid fa-paper-plane" /> : undefined}
            >
              ارسال تست به تلگرام
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TelegramTemplateCheckModal;
