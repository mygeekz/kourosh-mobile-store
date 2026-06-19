import React, { useEffect, useMemo, useState } from 'react';
import Notification from './Notification';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import type { NotificationMessage } from '../types';
import Button from './Button';
import ToggleSwitch from './ToggleSwitch';

type AllowedType = { key: string; label: string };

type Props = {
  topic: 'sales' | 'installments' | 'reports' | 'notifications' | string;
  title: string;
  allowedTypes: AllowedType[];
};

const splitChatIds = (text: string) =>
  text
    .split(/[\n\r,\t ]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

const getDefaultTemplate = (topic: string, type: string) => {
  const card = (title: string, icon: string, lines: string[], footer: string) =>
    [`<b>${icon} ${title}</b>`, '────────────', ...lines, '', footer].filter(Boolean).join('\n');

  if (topic === 'sales') {
    if (type === 'SALES_ORDER_CREATED') return card('ثبت اطلاعات فاکتور', '🧾', [
      '👤 <b>مشتری:</b> {customerName}',
      '🔢 <b>شماره:</b> {invoiceNo}',
      '💰 <b>مبلغ:</b> {total}',
    ], '{link}');
    if (type === 'SALES_ORDER_RETURN_CREATED') return card('ثبت اطلاعات مرجوعی', '↩️', [
      '👤 <b>مشتری:</b> {customerName}',
      '🔢 <b>شماره:</b> {invoiceNo}',
      '💰 <b>مبلغ:</b> {total}',
    ], '{link}');
    if (type === 'SALES_ORDER_CANCELLED') return card('لغو فاکتور', '❌', [
      '👤 <b>مشتری:</b> {customerName}',
      '🔢 <b>شماره:</b> {invoiceNo}',
    ], '{link}');
  }
  if (topic === 'installments') {
    if (type === 'INSTALLMENT_DUE_7') return card('یادآوری قسط (۷ روز مانده)', '⏳', [
      '👤 <b>مشتری:</b> {customerName}',
      '💰 <b>مبلغ:</b> {amount}',
      '📅 <b>شروع اقساط:</b> {startDate}',
    ], '{link}');
    if (type === 'INSTALLMENT_DUE_3') return card('یادآوری قسط (۳ روز مانده)', '⏳', [
      '👤 <b>مشتری:</b> {customerName}',
      '💰 <b>مبلغ:</b> {amount}',
      '📅 <b>شروع اقساط:</b> {startDate}',
    ], '{link}');
    if (type === 'INSTALLMENT_DUE_TODAY') return card('سررسید قسط امروز', '🔔', [
      '👤 <b>مشتری:</b> {customerName}',
      '💰 <b>مبلغ:</b> {amount}',
      '📅 <b>شروع اقساط:</b> {startDate}',
    ], '{link}');
    if (type === 'INSTALLMENT_COMPLETED') return card('تسویه اقساط', '✅', [
      '👤 <b>مشتری:</b> {customerName}',
      '💰 <b>مبلغ هر قسط:</b> {amount}',
    ], '{link}');
  }
  if (topic === 'reports') {
    if (type === 'REPORT_FINANCIAL_OVERVIEW' || type === 'financial-overview') return card('گزارش مالی', '📊', [
      '📅 <b>از:</b> {fromDate}',
      '📅 <b>تا:</b> {toDate}',
      '💰 <b>جمع فروش:</b> {sumSales}',
      '🧾 <b>تعداد فاکتور:</b> {invoiceCount}',
    ], '{link}');
  }
  return card('پیام پیش‌نمایش', '💬', ['این یک قالب پیش‌نمایش است.'], '{link}');
};

const varsHelp = (topic: string) => {
  const common = ['{link}', '{now}'];
  if (topic === 'sales') return [...common, '{invoiceNo}', '{total}', '{subtotal}', '{discount}', '{customerName}', '{customerPhone}'];
  if (topic === 'installments') return [...common, '{customerName}', '{customerPhone}', '{amount}', '{installments}', '{startDate}', '{downPayment}', '{total}', '{saleType}'];
  if (topic === 'reports') return [...common, '{fromDate}', '{toDate}', '{sumSales}', '{invoiceCount}'];
  return common;
};

const TelegramTopicPanel: React.FC<Props> = ({ topic, title, allowedTypes }) => {
  const { token } = useAuth();

  const [chatIdsText, setChatIdsText] = useState('');
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [activeType, setActiveType] = useState<string>(allowedTypes?.[0]?.key || '');
  const [tplText, setTplText] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [sampleInfo, setSampleInfo] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingCheck, setSendingCheck] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const enabledSet = useMemo(() => new Set(enabledTypes), [enabledTypes]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}`, {
        headers: { ...(getAuthHeaders(token) as any) },
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'دریافت تنظیمات تلگرام انجام نشد.');
      setChatIdsText(String(json.data?.chatIdsText || ''));
      setEnabledTypes(Array.isArray(json.data?.enabledTypes) ? json.data.enabledTypes : []);

      const typeKeys = allowedTypes.map((t) => t.key).join(',');
      const res2 = await fetch(
        `/api/telegram/topic-config/${encodeURIComponent(topic)}/templates?types=${encodeURIComponent(typeKeys)}`,
        { headers: { ...(getAuthHeaders(token) as any) } }
      );
      const json2 = await res2.json();
      if (!json2?.success) throw new Error(json2?.message || 'دریافت قالب‌های تلگرام انجام نشد.');
      const tpls = (json2.data?.templates && typeof json2.data.templates === 'object') ? json2.data.templates : {};
      setTemplates(tpls);
      setSampleInfo(json2.data?.sample || null);

      const first = allowedTypes?.[0]?.key || '';
      const nextActive = activeType || first;
      setActiveType(nextActive);
      setTplText(String(tpls?.[nextActive] || getDefaultTemplate(topic, nextActive)));
      setPreviewText('');
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'دریافت تنظیمات تلگرام انجام نشد.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  useEffect(() => {
    if (!activeType) return;
    setTplText(String(templates?.[activeType] || getDefaultTemplate(topic, activeType)));
    setPreviewText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  const toggleType = (key: string) => {
    setEnabledTypes((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders(token) as any),
        },
        body: JSON.stringify({ chatIdsText, enabledTypes }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'ذخیره تنظیمات تلگرام انجام نشد.');

      const merged = { ...templates, [activeType]: tplText };
      setTemplates(merged);

      const res2 = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders(token) as any),
        },
        body: JSON.stringify({ templates: merged }),
      });
      const json2 = await res2.json();
      if (!json2?.success) throw new Error(json2?.message || 'ذخیره قالب‌های تلگرام انجام نشد.');

      setNotification({ type: 'success', message: 'تنظیمات و قالب‌ها ذخیره شد.' });
    } catch (e: any) {
      setNotification({ type: 'error', message: humanizeErrorMessage(e?.message || 'ذخیره تنظیمات تلگرام انجام نشد.', { endpoint: '/api/telegram/topic-config', action: 'ذخیره تغییرات تنظیمات تلگرام' }) });
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    try {
      const res = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders(token) as any),
        },
        body: JSON.stringify({ type: activeType, template: tplText }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'ساخت پیش‌نمایش انجام نشد.');
      setPreviewText(String(json.data?.text || ''));
      setSampleInfo(json.data?.sample || null);
    } catch (e: any) {
      setNotification({ type: 'error', message: humanizeErrorMessage(e?.message || 'ساخت پیش‌نمایش انجام نشد.', { endpoint: '/api/telegram/topic-config/preview', action: 'پیش‌نمایش تلگرام' }) });
    }
  };

  const sendCheck = async () => {
    setSendingCheck(true);
    try {
      const json: any = await runWithFeedback(
        fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthHeaders(token) as any),
          },
          body: JSON.stringify({ type: activeType, template: tplText }),
        }).then((response) => parseApiResult(response, { endpoint: '/api/telegram/topic-config/check', action: 'ارسال تست تلگرام' })),
        {
          kind: 'send',
          loading: 'در حال ارسال تست تلگرام…',
          success: 'ارسال تست تلگرام با موفقیت انجام شد.',
          endpoint: '/api/telegram/topic-config/check',
        }
      );
      const sent = json.data?.sent ?? 0;
      const total = json.data?.total ?? 0;
      setNotification({ type: 'success', message: `ارسال تست انجام شد. موفق: ${sent} از ${total}` });
    } catch (e: any) {
      setNotification({ type: 'error', message: humanizeErrorMessage(e?.message || 'ارسال تست انجام نشد', { endpoint: '/api/telegram/topic-config/check', action: 'ارسال تست تلگرام' }) });
    } finally {
      setSendingCheck(false);
    }
  };

  const previewChats = splitChatIds(chatIdsText);

  return (
    <div className="p-4">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type as any}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Premium panel */}
      <div className="tg-panel">
        <div className="tg-panel__bar" />
        <div className="tg-panel__header">
          <div className="min-w-0">
            <div className="tg-panel__title">{title}</div>
            <div className="tg-panel__subtitle">
              مقصدها را با Enter یا ویرگول جدا کنید. اگر خالی باشد، از مقصدهای پیش‌فرض تلگرام استفاده می‌شود.
            </div>
          </div>

          <div className="tg-panel__meta">
            <span className="tg-chip">📬 {previewChats.length.toLocaleString('fa-IR')} مقصد</span>
            <span className="tg-chip">✅ {enabledTypes.length.toLocaleString('fa-IR')} فعال</span>
          </div>

          <div className="tg-panel__actions">
            <Button className="tg-btn tg-btn--ghost" variant="ghost" size="sm" disabled={loading} onClick={load} loading={loading} loadingText="در حال بازخوانی…">
              بازخوانی
            </Button>
            <Button className="tg-btn tg-btn--primary" size="sm" disabled={saving || loading} onClick={save} loading={saving} loadingText="در حال ذخیره تغییرات…">
              ذخیره تغییرات
            </Button>
          </div>
        </div>

        <div className="tg-grid">
          <div className="tg-stack">
            <div className="tg-card">
              <div className="tg-card__head">
                <div className="tg-card__title">📍 مقصدها (Chat ID)</div>
                <div className="tg-card__hint">هر خط یک Chat ID</div>
              </div>
              <textarea
                className="tg-textarea"
                value={chatIdsText}
                onChange={(e) => setChatIdsText(e.target.value)}
                preview={`مثال:\n-1001234567890\n672412513`}
                disabled={loading}
              />
              <div className="tg-card__foot">
                <span className="tg-muted">تعداد مقصدها:</span>
                <span className="tg-strong">{previewChats.length.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            <div className="tg-card">
              <div className="tg-card__head">
                <div className="tg-card__title">⚡ نوع پیام‌های فعال</div>
                <div className="tg-card__hint">خاموش/روشن کردن ارسال‌ها</div>
              </div>

              {loading ? (
                <div className="tg-muted text-sm">در حال دریافت اطلاعات…</div>
              ) : (
                <div className="space-y-2">
                  {allowedTypes.map((t) => {
                    const on = enabledSet.has(t.key);
                    return (
                      <div
                        key={t.key}
                        className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-3 transition ${on ? 'border-sky-200 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/30' : 'border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/40'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-slate-900 dark:text-slate-50">{t.label}</div>
                          <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400" dir="ltr">{t.key}</div>
                        </div>
                        <ToggleSwitch
                          checked={on}
                          onCheckedChange={() => toggleType(t.key)}
                          ariaLabel={`${t.label} را ${on ? 'خاموش' : 'روشن'} کن`}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="tg-card tg-card--wide">
            <div className="tg-card__head tg-card__head--split">
              <div>
                <div className="tg-card__title">🧩 قالب پیام</div>
                <div className="tg-card__hint">متغیرها را در متن استفاده کنید</div>
              </div>
              <select
                className="tg-select"
                value={activeType}
                onChange={(e) => setActiveType(e.target.value)}
                disabled={loading}
              >
                {allowedTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="tg-vars">
              {varsHelp(topic).map((v) => (
                <span key={v} className="tg-var">
                  {v}
                </span>
              ))}
            </div>

            <textarea
              className="tg-textarea tg-textarea--mono"
              value={tplText}
              onChange={(e) => setTplText(e.target.value)}
              disabled={loading}
            />

            <div className="tg-actions-row">
              <Button className="tg-btn" variant="secondary" size="sm" onClick={preview} disabled={loading} leftIcon={<i className="fa-solid fa-eye" />}>
                پیش‌نمایش
              </Button>
              <Button className="tg-btn tg-btn--indigo" size="sm" onClick={sendCheck} disabled={loading || sendingCheck} loading={sendingCheck} loadingText="در حال ارسال…" leftIcon={!sendingCheck ? <i className="fa-solid fa-paper-plane" /> : undefined}>
                ارسال تست
              </Button>
              <Button
                className="tg-btn tg-btn--ghost"
                variant="ghost"
                size="sm"
                onClick={() => setTplText(getDefaultTemplate(topic, activeType))}
                disabled={loading}
                title="بازگشت به پیش‌فرض"
              >
                پیش‌فرض
              </Button>
            </div>

            {previewText ? (
              <div className="tg-preview">
                <div className="tg-preview__title">پیش‌نمایش پیام</div>
                <pre className="tg-preview__body">{previewText}</pre>
              </div>
            ) : (
              <div className="tg-preview tg-preview--empty">
                برای دیدن خروجی، «پیش‌نمایش» را بزنید.
              </div>
            )}

            {!!sampleInfo && (
              <details className="tg-sample">
                <summary>پیش‌نمایش‌داده (برای Preview)</summary>
                <pre>{JSON.stringify(sampleInfo, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramTopicPanel;
