import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
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

const TelegramTemplateCheckModal: React.FC<Props> = ({ isOpen, onClose, title, template, format: formatProp, allowedVars: allowedVarsProp, audience = 'customer' }) => {
  const { token } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; title?: string; action?: string; technical?: string } | null>(null);

  const [format, setFormat] = useState<TemplateFormat>('text');
  const [allowedVars, setAllowedVars] = useState<TemplateVariable[]>([]);

  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientList, setRecipientList] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // keep props in sync
  useEffect(() => {
    if (!isOpen) return;
    setFormat((String(formatProp || 'text').toLowerCase() as TemplateFormat) || 'text');
    setAllowedVars(Array.isArray(allowedVarsProp) ? allowedVarsProp : []);
  }, [isOpen, formatProp, allowedVarsProp]);

  const previews = useMemo(() => uniq(extractPlaceholders(String(template || ''))), [template]);

  const previewText = useMemo(() => applyTemplate(String(template || ''), values), [template, values]);

  const previewHtml = useMemo(() => renderTemplatePreviewHtml(format, previewText), [format, previewText]);

  const validation = useMemo(() => validatePlaceholders(previews, allowedVars), [previews, allowedVars]);

  const canSend = useMemo(() => !!token && !!String(template || '').trim(), [token, template]);

  const onChange = (k: string, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
  };

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

  // load the right audience for real preview
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setRecipientQuery('');
    setSelectedRecipient(null);
    (async () => {
      try {
        const res = await apiFetch(audienceMeta[audience].endpoint);
        const js = await res.json().catch(() => ({}));
        let list = js?.data || js?.customers || js?.partners || js?.users || js?.items || [];
        if (audience === 'manager' && Array.isArray(list)) {
          list = list.filter((u: any) => /admin|manager|مدیر/i.test(String(u?.roleName || u?.role || u?.username || '')));
        }
        if (alive) setRecipientList(Array.isArray(list) ? list : []);
      } catch {
        if (alive) setRecipientList([]);
      }
    })();
    return () => { alive = false; };
  }, [isOpen, audience, audienceMeta]);

  // auto-fill sample values when selecting audience item
  useEffect(() => {
    if (!isOpen) return;
    const c = selectedRecipient;
    const sample: Record<string, string> = {
      name: getRecipientName(c),
      phone: c?.phoneNumber || c?.phone || c?.mobile || '',
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
      link: 'https://example.com/#/installments',
      now: '1404/12/10 12:00',
    };
    setValues((prev) => ({ ...sample, ...prev }));
  }, [selectedRecipient, isOpen]);

  const filteredRecipients = useMemo(() => {
    const q = recipientQuery.trim();
    if (!q) return recipientList.slice(0, 30);
    const qq = q.toLowerCase();
    return recipientList
      .filter((c) => {
        const name = getRecipientName(c).toLowerCase();
        const sub = getRecipientSub(c).toLowerCase();
        const id = String(c?.id || '').toLowerCase();
        return name.includes(qq) || sub.includes(qq) || id.includes(qq);
      })
      .slice(0, 30);
  }, [recipientList, recipientQuery]);

  const send = async () => {
    if (!canSend) return;
    setIsSending(true);
    setResult(null);
    try {
      const res = await apiFetch('/api/telegram/check-message', {
        method: 'POST',
        body: JSON.stringify({
          text: previewText,
          parseMode: format === 'html' ? 'HTML' : format === 'markdown' ? 'Markdown' : undefined,
        }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'ارسال تلگرام انجام نشد');
      setResult({ ok: true, message: js?.message || 'ارسال شد.' });
    } catch (e: any) {
      const humanError = humanizeTelegramError(e?.message || 'ارسال تلگرام ناموفق بود.');
      setResult({ ok: false, title: humanError.title, message: humanError.message, action: humanError.action, technical: humanError.technical });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      iconClass="fa-brands fa-telegram"
      widthClass="max-w-6xl"
    >
      <div className="tg-template-test-modal">
        <div className="tg-template-test-modal__layout">
          <div className="tg-template-test-modal__column">
            <section className="tg-template-test-modal__card">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-semibold text-slate-700">فرمت پیام</div>
            <div className="flex items-center gap-2">
              <select
                value={format}
                onChange={(e) => setFormat((e.target.value as TemplateFormat) || 'text')}
                className="rounded-xl border px-3 py-2 text-sm outline-none"
              >
                <option value="text">Text</option>
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
              <div className="inline-flex items-center gap-2 text-xs text-slate-600">
                <ToggleSwitch checked={showRaw} onCheckedChange={setShowRaw} ariaLabel="نمایش متن خام" size="sm" />
                <span>نمایش خام</span>
              </div>
            </div>
          </div>

          {allowedVars.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">متغیرهای قابل استفاده</div>
              <div className="flex flex-wrap gap-2">
                {allowedVars.map((v) => (
                  <Button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      setValues((prev) => ({ ...prev, [v.key]: prev?.[v.key] ?? (v.example ?? '') }));
                    }}
                    variant="ghost"
                    size="xs"
                    className="rounded-full"
                    title={v.label || v.key}
                  >
                    {'{'}{v.key}{'}'}
                  </Button>
                ))}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">روی چیپ کلیک کن تا برای Preview مقدار پیش‌نمایش پر شود.</div>
            </div>
          )}

          {validation.unknown.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              متغیرهای ناشناخته: {validation.unknown.map((x) => `{${x}}`).join(' , ')}
            </div>
          )}
            </section>

            <section className="tg-template-test-modal__card">
          <div className="text-xs font-semibold text-slate-700 mb-2">Preview واقعی ({audienceMeta[audience].selectLabel})</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none  "
              placeholder={audienceMeta[audience].searchPlaceholder}
            />
            <select
              value={selectedRecipient?.id ?? ''}
              onChange={(e) => {
                const id = String(e.target.value || '');
                const found = recipientList.find((c) => String(c?.id) === id) || null;
                setSelectedRecipient(found);
              }}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value="">— {audienceMeta[audience].selectLabel} —</option>
              {filteredRecipients.map((c) => (
                <option key={c?.id} value={c?.id}>
                  {getRecipientName(c)}{getRecipientSub(c) ? ` — ${getRecipientSub(c)}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">اگر {audienceMeta[audience].label} انتخاب نشود، فقط دادهٔ پیش‌نمایش استفاده می‌شود.</div>
            </section>
          </div>

          <div className="tg-template-test-modal__column">
            <section className="tg-template-test-modal__card tg-template-test-modal__card--preview">
          <div className="text-xs font-semibold text-slate-700 mb-2">پیش‌نمایش پیام</div>
          {showRaw ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-800">{previewText || '—'}</pre>
          ) : (
            <div
              className="text-sm text-slate-800 leading-7"
              dangerouslySetInnerHTML={{ __html: previewHtml || '—' }}
            />
          )}
            </section>

            {previews.length > 0 && (
              <section className="tg-template-test-modal__card">
                <div className="tg-template-test-modal__sectionTitle">مقادیر متغیرها</div>
                <div className="tg-template-test-modal__inputs">
            {previews.map((k) => (
                  <div key={k} className="tg-template-test-modal__inputItem">
                <div className="text-xs font-semibold text-slate-600">{k}</div>
                <input
                  value={values[k] || ''}
                  onChange={(e) => onChange(k, e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none  "
                  placeholder={`مقدار برای {${k}}`}
                />
              </div>
            ))}
                </div>
              </section>
            )}

            {result && (
              <section className={`tg-template-test-modal__result ${result.ok ? 'tg-template-test-modal__result--success' : 'tg-template-test-modal__result--error'}`}>
                {result.ok ? (
                <div>{result.message}</div>
              ) : (
                <div className="space-y-2">
                  <div className="font-bold">{result.title || 'ارسال تلگرام ناموفق بود'}</div>
                  <div className="leading-7">{result.message}</div>
                  {result.action ? <div className="rounded-lg border border-rose-200/80 bg-white/70 px-3 py-2 text-xs leading-6"><b>راهکار:</b> {result.action}</div> : null}
                  {result.technical ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-semibold">نمایش جزئیات فنی</summary>
                      <pre dir="ltr" className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-[11px] text-slate-700">{result.technical}</pre>
                    </details>
                  ) : null}
                </div>
              )}
              </section>
            )}
          </div>
        </div>

        <div className="tg-template-test-modal__footer">
          <Button onClick={onClose} variant="secondary" size="sm">
            بستن
          </Button>
          <Button
            disabled={!canSend || isSending}
            onClick={send}
            size="sm"
            loading={isSending}
            loadingText="در حال ارسال…"
            leftIcon={!isSending ? <i className="fa-solid fa-paper-plane" /> : undefined}
          >
            ارسال تست به تلگرام
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TelegramTemplateCheckModal;
