import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import ToggleSwitch from './ToggleSwitch';
import Button from './Button';
import { apiFetch } from '../utils/apiFetch';

type ReminderMatchType = 'days_until' | 'overdue_days';
type ReminderChannel = 'telegram' | 'sms';
type ReminderTargetType = 'both' | 'installment' | 'check';

type ReminderConfig = {
  sendStartHour: number;
  sendEndHour: number;
  maxPerDayPerCustomer: number;
  timezone?: string;
};

type ReminderRule = {
  id: number;
  name: string;
  enabled: number;
  channel: ReminderChannel;
  matchType: ReminderMatchType;
  value: number;
  template: string;
  installmentTemplate?: string;
  checkTemplate?: string;
  targetType?: ReminderTargetType;
  createdAt?: string;
  updatedAt?: string;
  matchedCount?: number;
};

type RulePreviewResponse = {
  totalMatched: number;
  totalInstallmentMatched?: number;
  totalCheckMatched?: number;
  previews: ReminderPreviewItem[];
  installmentPreviews?: ReminderPreviewItem[];
  checkPreviews?: ReminderPreviewItem[];
  fallback: {
    vars: Record<string, string>;
    text: string;
  };
  installmentFallback?: {
    vars: Record<string, string>;
    text: string;
  };
  checkFallback?: {
    vars: Record<string, string>;
    text: string;
  };
};

type ReminderPreviewItem = {
  type?: 'installment' | 'check';
  paymentId?: number | null;
  checkId?: number | null;
  saleId: number | null;
  customerId: number | null;
  customerName: string;
  phone?: string;
  chatId?: string;
  dueDate: string;
  amount: string;
  daysUntil: number;
  matched: boolean;
  text: string;
  title?: string;
  checkNumber?: string;
  bankName?: string;
};

const whenLabel = (r: Pick<ReminderRule, 'matchType' | 'value'>) => {
  if (r.matchType === 'days_until') {
    if (r.value === 0) return 'روز سررسید';
    if (r.value > 0) return `${r.value} روز مانده`;
    return `${Math.abs(r.value)} روز گذشته (نامعمول)`;
  }
  return `${r.value} روز معوق`;
};

const defaultInstallmentTemplate = (matchType: ReminderMatchType, value: number) => {
  if (matchType === 'overdue_days') {
    return '⚠️ <b>قسط معوق</b>\n{name} عزیز، قسط <b>{amount} تومان</b> با سررسید <b>{dueDate}</b> هنوز ثبت نشده است.';
  }
  if (value === 0) {
    return '⏰ <b>سررسید قسط امروز</b>\n{name} عزیز، قسط <b>{amount} تومان</b> امروز (<b>{dueDate}</b>) سررسید است.';
  }
  return '🔔 <b>یادآوری قسط</b>\nسلام {name} 👋\nقسط شما به مبلغ <b>{amount} تومان</b> در تاریخ <b>{dueDate}</b> سررسید می‌شود.';
};

const defaultCheckTemplate = (matchType: ReminderMatchType, value: number) => {
  if (matchType === 'overdue_days') {
    return '⚠️ <b>چک معوق</b>\n{name} عزیز، چک شماره <b>{checkNumber}</b> بانک <b>{bank}</b> به مبلغ <b>{amount} تومان</b> با سررسید <b>{dueDate}</b> هنوز وصول نشده است.';
  }
  if (value === 0) {
    return '⏰ <b>سررسید چک امروز</b>\n{name} عزیز، چک شماره <b>{checkNumber}</b> بانک <b>{bank}</b> به مبلغ <b>{amount} تومان</b> امروز (<b>{dueDate}</b>) سررسید است.';
  }
  return '🔔 <b>یادآوری چک</b>\n{name} عزیز، چک شماره <b>{checkNumber}</b> بانک <b>{bank}</b> به مبلغ <b>{amount} تومان</b> در تاریخ <b>{dueDate}</b> سررسید می‌شود.';
};

const defaultTemplate = defaultInstallmentTemplate;


const normalizeTargetType = (value?: string): ReminderTargetType => {
  const v = String(value || '').trim();
  if (v === 'installment' || v === 'check' || v === 'both') return v;
  return 'both';
};

const ruleCoverageMeta = (r: Pick<ReminderRule, 'template' | 'installmentTemplate' | 'checkTemplate' | 'targetType'>) => {
  const targetType = normalizeTargetType(r.targetType);

  if (targetType === 'both') {
    return {
      label: 'قسط و چک',
      icon: 'fa-layer-group',
      className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/45 dark:bg-violet-950/25 dark:text-violet-200',
    };
  }
  if (targetType === 'check') {
    return {
      label: 'چک',
      icon: 'fa-money-check',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/45 dark:bg-amber-950/25 dark:text-amber-200',
    };
  }
  return {
    label: 'قسط',
    icon: 'fa-calendar-days',
    className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/45 dark:bg-sky-950/25 dark:text-sky-200',
  };
};

const apiJson = async (url: string, options?: RequestInit): Promise<any> => {
  const response = await apiFetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'ارتباط با سرور ناموفق بود.');
  }
  return payload;
};

const ReminderRulesBuilder: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [runningNow, setRunningNow] = useState(false);

  const [cfg, setCfg] = useState<ReminderConfig>({ sendStartHour: 10, sendEndHour: 21, maxPerDayPerCustomer: 1, timezone: 'Asia/Tehran' });
  const [rules, setRules] = useState<ReminderRule[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editRule, setEditRule] = useState<ReminderRule | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RulePreviewResponse | null>(null);
  const [ruleMatchCounts, setRuleMatchCounts] = useState<Record<number, { total: number; installments: number; checks: number; loading?: boolean }>>({});
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const editorTargetType = normalizeTargetType(editRule?.targetType);
  const editorInstallmentTemplateActive = editorTargetType === 'both' || editorTargetType === 'installment';
  const editorCheckTemplateActive = editorTargetType === 'both' || editorTargetType === 'check';
  const editorInstallmentMatchCount = Number(previewData?.totalInstallmentMatched || 0);
  const editorCheckMatchCount = Number(previewData?.totalCheckMatched || 0);
  const templateMatchBadgeText = (count: number, active: boolean) => {
    if (!active) return 'فعلاً ارسال نمی‌شود';
    if (previewLoading) return 'در حال بررسی…';
    return `${count.toLocaleString('fa-IR')} گیرنده واقعی`;
  };
  const activateTemplateTarget = (target: 'installment' | 'check') => {
    setEditRule((rule) => {
      if (!rule) return rule;
      const current = normalizeTargetType(rule.targetType);
      if (current === 'both' || current === target) return rule;
      return { ...rule, targetType: 'both' };
    });
  };

  const stats = useMemo(() => {
    const enabled = rules.filter(r => r.enabled).length;
    return { total: rules.length, enabled };
  }, [rules]);

  const loadAll = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const [cfgRes, rulesRes] = await Promise.all([
        apiJson('/api/reminders/config'),
        apiJson('/api/reminders/rules'),
      ]);
      setCfg(cfgRes.data || { sendStartHour: 10, sendEndHour: 21, maxPerDayPerCustomer: 1, timezone: 'Asia/Tehran' });
      setRules(rulesRes.data || []);
    } catch (error: any) {
      setErrorText(error?.message || 'بارگذاری قوانین با خطا انجام شد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rules.length) {
      setRuleMatchCounts({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      const next: Record<number, { total: number; installments: number; checks: number; loading?: boolean }> = {};
      for (const rule of rules) {
        if (!rule?.id || !rule.enabled) {
          next[rule.id] = { total: 0, installments: 0, checks: 0 };
          continue;
        }
        try {
          const res = await apiJson('/api/reminders/rules/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchType: rule.matchType,
              value: Number(rule.value),
              template: rule.installmentTemplate || rule.template,
              installmentTemplate: rule.installmentTemplate || rule.template,
              checkTemplate: rule.checkTemplate || defaultCheckTemplate(rule.matchType, Number(rule.value)),
              targetType: normalizeTargetType(rule.targetType),
            }),
          });
          const data = res.data || {};
          next[rule.id] = {
            total: Number(data.totalMatched || 0),
            installments: Number(data.totalInstallmentMatched || 0),
            checks: Number(data.totalCheckMatched || 0),
          };
        } catch {
          next[rule.id] = { total: Number(rule.matchedCount || 0), installments: 0, checks: 0 };
        }
      }
      if (!cancelled) setRuleMatchCounts(next);
    };
    run();
    return () => { cancelled = true; };
  }, [rules]);

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await apiJson('/api/reminders/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendStartHour: Number(cfg.sendStartHour),
          sendEndHour: Number(cfg.sendEndHour),
          maxPerDayPerCustomer: Number(cfg.maxPerDayPerCustomer),
          timezone: cfg.timezone || 'Asia/Tehran',
        }),
      });
      setSuccessText('تنظیمات قوانین ذخیره شد.');
      await loadAll();
    } catch (error: any) {
      setErrorText(error?.message || 'ذخیره تنظیمات با خطا مواجه شد.');
    } finally {
      setSavingCfg(false);
    }
  };

  const openNewRule = () => {
    setErrorText('');
    setSuccessText('');
    setEditRule({
      id: 0,
      name: 'قانون جدید',
      enabled: 1,
      channel: 'telegram',
      matchType: 'days_until',
      value: 3,
      template: defaultInstallmentTemplate('days_until', 3),
      installmentTemplate: defaultInstallmentTemplate('days_until', 3),
      checkTemplate: defaultCheckTemplate('days_until', 3),
      targetType: 'both',
    });
    setEditorOpen(true);
  };

  const openEditRule = (r: ReminderRule) => {
    setErrorText('');
    setSuccessText('');
    setEditRule({
      ...r,
      installmentTemplate: r.installmentTemplate || r.template || defaultInstallmentTemplate(r.matchType, r.value),
      checkTemplate: r.checkTemplate || r.template || defaultCheckTemplate(r.matchType, r.value),
      targetType: normalizeTargetType(r.targetType),
    });
    setEditorOpen(true);
  };

  const upsertRule = async () => {
    if (!editRule) return;
    setSavingRule(true);
    setErrorText('');
    setSuccessText('');
    try {
      const payload = {
        name: editRule.name,
        enabled: !!editRule.enabled,
        channel: editRule.channel,
        matchType: editRule.matchType,
        value: Number(editRule.value),
        template: editRule.installmentTemplate || editRule.template,
        installmentTemplate: editRule.installmentTemplate || editRule.template,
        checkTemplate: editRule.checkTemplate || defaultCheckTemplate(editRule.matchType, Number(editRule.value)),
        targetType: normalizeTargetType(editRule.targetType),
      };
      if (editRule.id) {
        await apiJson(`/api/reminders/rules/${editRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await apiJson('/api/reminders/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setEditorOpen(false);
      setEditRule(null);
      setSuccessText(editRule.id ? 'قانون با موفقیت به‌روزرسانی شد.' : 'قانون جدید با موفقیت اضافه شد.');
      await loadAll();
    } catch (error: any) {
      setErrorText(error?.message || 'ذخیره قانون با خطا مواجه شد.');
    } finally {
      setSavingRule(false);
    }
  };

  const toggleEnabled = async (r: ReminderRule) => {
    try {
      setErrorText('');
      await apiJson(`/api/reminders/rules/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, enabled: !r.enabled }),
      });
      await loadAll();
    } catch (error: any) {
      setErrorText(error?.message || 'تغییر وضعیت قانون با خطا مواجه شد.');
    }
  };

  const removeRule = async (id: number) => {
    try {
      setErrorText('');
      await apiJson(`/api/reminders/rules/${id}`, { method: 'DELETE' });
      setSuccessText('قانون حذف شد.');
      await loadAll();
    } catch (error: any) {
      setErrorText(error?.message || 'حذف قانون با خطا مواجه شد.');
    }
  };

  const seedDefaults = async () => {
    try {
      setErrorText('');
      await apiJson('/api/reminders/rules/seed-defaults', { method: 'POST' });
      setSuccessText('الگوهای پیشنهادی اضافه شدند.');
      await loadAll();
    } catch (error: any) {
      setErrorText(error?.message || 'افزودن الگوهای پیشنهادی با خطا مواجه شد.');
    }
  };

  const runNow = async () => {
    setRunningNow(true);
    try {
      setErrorText('');
      await apiJson('/api/reminders/run-now', { method: 'POST' });
      setSuccessText('اجرای فوری قوانین انجام شد. خروجی را در لاگ‌ها یا صندوق خروجی بررسی کن.');
      await loadAll();
    } catch (error: any) {
      setErrorText(error?.message || 'اجرای فوری با خطا مواجه شد.');
    } finally {
      setRunningNow(false);
    }
  };

  useEffect(() => {
    if (!editorOpen || !editRule || !String((editRule.installmentTemplate || editRule.checkTemplate || editRule.template || '')).trim()) {
      setPreviewData(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await apiJson('/api/reminders/rules/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchType: editRule.matchType,
            value: Number(editRule.value),
            template: editRule.installmentTemplate || editRule.template,
            installmentTemplate: editRule.installmentTemplate || editRule.template,
            checkTemplate: editRule.checkTemplate || defaultCheckTemplate(editRule.matchType, Number(editRule.value)),
            targetType: normalizeTargetType(editRule.targetType),
          }),
        });
        setPreviewData(res.data || null);
      } catch {
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [editorOpen, editRule]);

  if (loading) {
    return (
      <div className="reminder-rules-builder rounded-2xl border border-primary/10 bg-surface shadow-sm p-6" data-ui-reminders-builder="true" data-reminders-loading="true">
        <div className="text-sm text-gray-500">در حال دریافت اطلاعات قوانین…</div>
      </div>
    );
  }

  return (
    <div className="reminder-rules-builder space-y-6" data-ui-reminders-builder="true" data-reminders-rules-count={rules.length}>
      {errorText ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50/90 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-start gap-3 text-right">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              <i className="fa-solid fa-triangle-exclamation" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-rose-800 dark:text-rose-200">خطا در قوانین اعلان</div>
              <div className="mt-1 text-xs leading-6 text-rose-700/90 dark:text-rose-200/80">{errorText}</div>
            </div>
          </div>
        </div>
      ) : null}
      {successText ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3 text-right">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <i className="fa-solid fa-circle-check" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-emerald-800 dark:text-emerald-200">تغییرات ذخیره شد</div>
              <div className="mt-1 text-xs leading-6 text-emerald-700/90 dark:text-emerald-200/80">{successText}</div>
            </div>
          </div>
        </div>
      ) : null}
      {/* Config */}
      <div className="reminder-config-card rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/90" data-ui-reminders-config="true">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300">
              <i className="fa-solid fa-sliders" />
              کنترل اعلان‌ها
            </div>
            <div className="mt-3 text-base font-black text-slate-900 dark:text-white">ساعت ارسال و سقف روزانه</div>
            <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">قوانین یادآوری اقساط و CRM را در اینجا به‌صورت محدود و قابل‌درک تنظیم کن.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={runNow}
              disabled={runningNow}
              variant="secondary"
              size="sm"
              className="app-command-button"
              leftIcon={<i className="fa-solid fa-bolt text-amber-500" />}
              data-ui-reminder-action="run-now"
            >
              {runningNow ? 'در حال اجرا…' : 'اجرای الان'}
            </Button>
            <Button
              type="button"
              onClick={saveConfig}
              disabled={savingCfg}
              variant="primary"
              size="sm"
              className="app-command-button"
              leftIcon={<i className="fa-solid fa-floppy-disk" />}
              data-ui-reminder-action="save-config"
            >
              {savingCfg ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2">ساعت ارسال از</label>
            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-regular fa-clock" /></span>
              <input
                type="number"
                min={0}
                max={23}
                value={cfg.sendStartHour}
                onChange={(e) => setCfg((c) => ({ ...c, sendStartHour: Number(e.target.value) }))}
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white pr-10 pl-3 text-left font-mono text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                dir="ltr"
              />
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2">ساعت ارسال تا</label>
            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-regular fa-clock" /></span>
              <input
                type="number"
                min={0}
                max={23}
                value={cfg.sendEndHour}
                onChange={(e) => setCfg((c) => ({ ...c, sendEndHour: Number(e.target.value) }))}
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white pr-10 pl-3 text-left font-mono text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                dir="ltr"
              />
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2">حداکثر پیام روزانه برای هر مشتری</label>
            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-user-clock" /></span>
              <input
                type="number"
                min={1}
                max={10}
                value={cfg.maxPerDayPerCustomer}
                onChange={(e) => setCfg((c) => ({ ...c, maxPerDayPerCustomer: Number(e.target.value) }))}
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white pr-10 pl-3 text-left font-mono text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 text-xs leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <i className="fa-solid fa-code" />
              متغیرها
            </span>
            <span dir="ltr">{'{name} {amount} {dueDate} {days} {saleId} {checkNumber} {bank} {type}'}</span>
          </div>
          <div className="mt-2">این Rule Builder روی یادآوری اقساط و CRM اثر می‌گذارد. برای دیدن نتیجه فوری، «اجرای الان» را بزن.</div>
        </div>
      </div>

      {/* Rules */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-list-check" />
              قوانین فعال
            </div>
            <div className="mt-3 text-base font-black text-slate-900 dark:text-white">{stats.enabled} فعال از {stats.total} قانون</div>
            <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">الگوهای آماده، قانون جدید، و وضعیت هر قانون در یک نگاه.</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={seedDefaults} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
              <i className="fa-solid fa-wand-magic-sparkles ml-2 text-emerald-500" />
              پیش‌نمایش آماده
            </button>
            <button type="button" onClick={openNewRule} className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:brightness-110 dark:bg-slate-100 dark:text-slate-900">
              <i className="fa-solid fa-plus ml-2" />
              افزودن قانون
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {rules.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
              هنوز قانونی ندارید. «پیش‌نمایش آماده» را بزنید یا یک قانون جدید بسازید.
            </div>
          )}

          {rules.map((r) => {
            const coverage = ruleCoverageMeta(r);
            const targetType = normalizeTargetType(r.targetType);
            const installmentTemplateActive = targetType === 'both' || targetType === 'installment';
            const checkTemplateActive = targetType === 'both' || targetType === 'check';
            const liveCounts = ruleMatchCounts[r.id] || { total: Number(r.matchedCount || 0), installments: 0, checks: 0 };
            return (
            <div key={r.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-base font-black text-slate-900 dark:text-white">{r.name}</div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${r.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-700'}`}>
                      {r.enabled ? 'فعال' : 'خاموش'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${coverage.className}`} title="نوع پوشش این قانون">
                      <i className={`fa-solid ${coverage.icon} text-[10px]`} />
                      {coverage.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {whenLabel(r)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                      <i className="fa-solid fa-users text-[10px]" />
                      {Number(liveCounts.total || 0).toLocaleString('fa-IR')} گیرنده
                    </span>
                    {installmentTemplateActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200">
                        <i className="fa-solid fa-calendar-days text-[10px]" />
                        {Number(liveCounts.installments || 0).toLocaleString('fa-IR')} قسط
                      </span>
                    ) : null}
                    {checkTemplateActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-black text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200">
                        <i className="fa-solid fa-money-check text-[10px]" />
                        {Number(liveCounts.checks || 0).toLocaleString('fa-IR')} چک
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className={`rounded-[20px] border p-3 text-xs leading-6 transition ${installmentTemplateActive ? 'border-sky-300 bg-sky-50 text-slate-800 shadow-sm ring-1 ring-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-slate-100 dark:ring-sky-900/35' : 'border-slate-200 bg-slate-50/55 text-slate-400 opacity-55 grayscale dark:border-slate-800 dark:bg-slate-900/35 dark:text-slate-500'}`}>
                      <div className={`mb-2 inline-flex items-center gap-2 text-[11px] font-black ${installmentTemplateActive ? 'text-sky-700 dark:text-sky-200' : 'text-slate-400 dark:text-slate-500'}`}><i className="fa-solid fa-calendar-days" />قالب قسط</div>
                      <span className={`mb-2 mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${installmentTemplateActive ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>{installmentTemplateActive ? 'فعال' : 'غیرفعال'}</span>
                      <div className={`line-clamp-3 whitespace-pre-wrap break-words ${installmentTemplateActive ? 'font-bold' : 'font-medium'}`}>{r.installmentTemplate || r.template || '—'}</div>
                    </div>
                    <div className={`rounded-[20px] border p-3 text-xs leading-6 transition ${checkTemplateActive ? 'border-amber-300 bg-amber-50 text-slate-800 shadow-sm ring-1 ring-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-slate-100 dark:ring-amber-900/35' : 'border-slate-200 bg-slate-50/55 text-slate-400 opacity-55 grayscale dark:border-slate-800 dark:bg-slate-900/35 dark:text-slate-500'}`}>
                      <div className={`mb-2 inline-flex items-center gap-2 text-[11px] font-black ${checkTemplateActive ? 'text-amber-700 dark:text-amber-200' : 'text-slate-400 dark:text-slate-500'}`}><i className="fa-solid fa-money-check" />قالب چک</div>
                      <span className={`mb-2 mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${checkTemplateActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>{checkTemplateActive ? 'فعال' : 'غیرفعال'}</span>
                      <div className={`line-clamp-3 whitespace-pre-wrap break-words ${checkTemplateActive ? 'font-bold' : 'font-medium'}`}>{r.checkTemplate || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                    <span className={`text-[11px] font-black ${r.enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{r.enabled ? 'فعال' : 'خاموش'}</span>
                    <ToggleSwitch
                      checked={Boolean(r.enabled)}
                      onCheckedChange={() => toggleEnabled(r)}
                      ariaLabel={r.enabled ? 'خاموش‌سازی قانون' : 'روشن‌سازی قانون'}
                      size="sm"
                    />
                  </div>
                  <button type="button" onClick={() => openEditRule(r)} className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:brightness-110 dark:bg-slate-100 dark:text-slate-900">
                    <i className="fa-solid fa-pen-to-square ml-2" />
                    ویرایش
                  </button>
                  <button type="button" onClick={() => removeRule(r.id)} className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/20">
                    <i className="fa-solid fa-trash ml-2" />
                    حذف
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
      <Modal isOpen={editorOpen} onClose={() => { setEditorOpen(false); setEditRule(null); }} title={editRule?.id ? 'ویرایش قانون اعلان' : 'افزودن قانون اعلان'} widthClass="max-w-[96vw]" variant="expansive">
        <div className="flex max-h-[78vh] flex-col overflow-hidden" dir="rtl" data-ui-reminders-editor="true">
          <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(260px,0.78fr)_minmax(360px,1.08fr)_minmax(420px,1.22fr)]">
            <section className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <i className="fa-solid fa-sliders" />
                </span>
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">تنظیمات قانون</div>
                  <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">نام، وضعیت، شرط و تعداد روز را اینجا تنظیم کن.</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300">نام قانون</label>
                  <input
                    value={editRule?.name || ''}
                    onChange={(e) => setEditRule((r) => r ? ({ ...r, name: e.target.value }) : r)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition    dark:border-slate-800 dark:bg-slate-950 " data-ui-control="true" data-ui-control-kind="reminder-rule-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300">وضعیت</label>
                    <select
                      value={String(editRule?.enabled ? 1 : 0)}
                      onChange={(e) => setEditRule((r) => r ? ({ ...r, enabled: Number(e.target.value) }) : r)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value="1">فعال</option>
                      <option value="0">خاموش</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300">عدد روز</label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={editRule?.value ?? 0}
                      onChange={(e) => setEditRule((r) => r ? ({ ...r, value: Number(e.target.value) }) : r)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-center text-sm font-black outline-none dark:border-slate-800 dark:bg-slate-950"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300">شرط اجرا</label>
                  <select
                    value={editRule?.matchType || 'days_until'}
                    onChange={(e) => {
                      const mt = e.target.value as ReminderMatchType;
                      setEditRule((r) => {
                        if (!r) return r;
                        const nextVal = mt === 'overdue_days' ? 7 : (r.value || 3);
                        return { ...r, matchType: mt, value: nextVal, template: r.template || defaultInstallmentTemplate(mt, nextVal), installmentTemplate: r.installmentTemplate || defaultInstallmentTemplate(mt, nextVal), checkTemplate: r.checkTemplate || defaultCheckTemplate(mt, nextVal) };
                      });
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="days_until">روز مانده تا سررسید</option>
                    <option value="overdue_days">روز معوق</option>
                  </select>
                  <div className="mt-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">{editRule ? whenLabel(editRule) : ''}</div>
                </div>
              </div>
            </section>

            <section className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    <i className="fa-solid fa-message" />
                  </span>
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">قالب پیام‌ها</div>
                    <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">هر قالب را فقط هنگام نیاز باز کن.</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 xl:max-h-[60vh]">
                <details open className={`rounded-[22px] border transition ${editorInstallmentTemplateActive ? 'border-sky-300 bg-sky-50/70 shadow-sm ring-1 ring-sky-100 dark:border-sky-800 dark:bg-sky-950/25 dark:ring-sky-900/35' : 'border-slate-200 bg-slate-50/50 opacity-70 dark:border-slate-800 dark:bg-slate-900/30'}`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 marker:hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <i className={`fa-solid fa-calendar-days ${editorInstallmentTemplateActive ? 'text-sky-700 dark:text-sky-200' : 'text-slate-400 dark:text-slate-500'}`} />
                      <div className="min-w-0">
                        <div className={`text-sm font-black ${editorInstallmentTemplateActive ? 'text-sky-800 dark:text-sky-200' : 'text-slate-500 dark:text-slate-400'}`}>متن پیام قسط</div>
                        <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">قالب اختصاصی یادآوری اقساط</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${editorInstallmentTemplateActive ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>{editorInstallmentTemplateActive ? 'فعال' : 'غیرفعال'}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${editorInstallmentTemplateActive ? 'border-sky-200 bg-white text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200' : 'border-slate-200 bg-white/70 text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500'}`}>
                        <i className="fa-solid fa-users text-[9px]" />
                        {templateMatchBadgeText(editorInstallmentMatchCount, editorInstallmentTemplateActive)}
                      </span>
                      <i className="fa-solid fa-chevron-down text-[11px] text-slate-400" />
                    </div>
                  </summary>
                  <div
                    role={!editorInstallmentTemplateActive ? 'button' : undefined}
                    tabIndex={!editorInstallmentTemplateActive ? 0 : undefined}
                    onClick={() => { if (!editorInstallmentTemplateActive) activateTemplateTarget('installment'); }}
                    onKeyDown={(event) => {
                      if (!editorInstallmentTemplateActive && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        activateTemplateTarget('installment');
                      }
                    }}
                    className={`border-t p-3 ${editorInstallmentTemplateActive ? 'border-sky-200/80 dark:border-sky-900/40' : 'cursor-pointer border-slate-200/80 dark:border-slate-800/80'}`}
                  >
                    <textarea
                      value={editRule?.installmentTemplate || editRule?.template || ''}
                      onChange={(e) => setEditRule((r) => r ? ({ ...r, installmentTemplate: e.target.value, template: e.target.value }) : r)}
                      className={`h-40 w-full resize-none rounded-2xl border bg-white p-3 text-sm leading-7 outline-none transition  dark:bg-black/30 ${editorInstallmentTemplateActive ? 'border-sky-200 font-bold  dark:border-sky-900/40 ' : 'border-slate-200 text-slate-500  dark:border-slate-800 dark:text-slate-500 '}`}
                      dir="rtl"
                      placeholder="مثلاً: قسط شما به مبلغ {amount} تومان در تاریخ {dueDate} سررسید می‌شود…"
                    />
                    {!editorInstallmentTemplateActive ? <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700 dark:bg-sky-950/30 dark:text-sky-200"><i className="fa-solid fa-plus text-[10px]" />برای افزودن قسط به این قانون کلیک کن</div> : null}
                  </div>
                </details>

                <details open className={`rounded-[22px] border transition ${editorCheckTemplateActive ? 'border-amber-300 bg-amber-50/70 shadow-sm ring-1 ring-amber-100 dark:border-amber-800 dark:bg-amber-950/25 dark:ring-amber-900/35' : 'border-slate-200 bg-slate-50/50 opacity-70 dark:border-slate-800 dark:bg-slate-900/30'}`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 marker:hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <i className={`fa-solid fa-money-check ${editorCheckTemplateActive ? 'text-amber-700 dark:text-amber-200' : 'text-slate-400 dark:text-slate-500'}`} />
                      <div className="min-w-0">
                        <div className={`text-sm font-black ${editorCheckTemplateActive ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'}`}>متن پیام چک</div>
                        <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">قالب اختصاصی یادآوری چک</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${editorCheckTemplateActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>{editorCheckTemplateActive ? 'فعال' : 'غیرفعال'}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${editorCheckTemplateActive ? 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200' : 'border-slate-200 bg-white/70 text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500'}`}>
                        <i className="fa-solid fa-users text-[9px]" />
                        {templateMatchBadgeText(editorCheckMatchCount, editorCheckTemplateActive)}
                      </span>
                      <i className="fa-solid fa-chevron-down text-[11px] text-slate-400" />
                    </div>
                  </summary>
                  <div
                    role={!editorCheckTemplateActive ? 'button' : undefined}
                    tabIndex={!editorCheckTemplateActive ? 0 : undefined}
                    onClick={() => { if (!editorCheckTemplateActive) activateTemplateTarget('check'); }}
                    onKeyDown={(event) => {
                      if (!editorCheckTemplateActive && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        activateTemplateTarget('check');
                      }
                    }}
                    className={`border-t p-3 ${editorCheckTemplateActive ? 'border-amber-200/80 dark:border-amber-900/40' : 'cursor-pointer border-slate-200/80 dark:border-slate-800/80'}`}
                  >
                    <textarea
                      value={editRule?.checkTemplate || ''}
                      onChange={(e) => setEditRule((r) => r ? ({ ...r, checkTemplate: e.target.value }) : r)}
                      className={`h-40 w-full resize-none rounded-2xl border bg-white p-3 text-sm leading-7 outline-none transition  dark:bg-black/30 ${editorCheckTemplateActive ? 'border-amber-200 font-bold  dark:border-amber-900/40 ' : 'border-slate-200 text-slate-500  dark:border-slate-800 dark:text-slate-500 '}`}
                      dir="rtl"
                      placeholder="مثلاً: چک شماره {checkNumber} بانک {bank} به مبلغ {amount} تومان سررسید می‌شود…"
                    />
                    {!editorCheckTemplateActive ? <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-200"><i className="fa-solid fa-plus text-[10px]" />برای افزودن چک به این قانون کلیک کن</div> : null}
                  </div>
                </details>

                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-bold leading-6 text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                  نکته: برای تلگرام می‌توانید HTML ساده مثل <span dir="ltr">&lt;b&gt;...&lt;/b&gt;</span> استفاده کنید. متغیرهای چک: <span dir="ltr">{`{checkNumber} {bank}`}</span>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <i className="fa-solid fa-eye" />
                  </span>
                  <div>
                    <div className="text-sm font-extrabold text-text">پیش‌نمایش زنده</div>
                    <div className="mt-0.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">پوشش قانون و نمونه پیام‌ها را اینجا ببین.</div>
                  </div>
                </div>
                {previewLoading ? (
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">در حال بررسی…</div>
                ) : (
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">{previewData?.totalMatched ?? 0} مورد منطبق</div>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 xl:max-h-[60vh]">
                <div className="rounded-[22px] border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="mb-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                      <i className="fa-solid fa-toggle-on text-slate-400" />
                      پوشش قانون
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/70 dark:text-slate-400 dark:ring-slate-800">
                      <i className="fa-solid fa-hand-pointer text-[10px] text-sky-500" />
                      برای فعال‌سازی سریع، روی کارت کم‌رنگ کلیک کن.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { key: 'both', label: 'قسط و چک', icon: 'fa-layer-group', desc: 'هر دو مسیر' },
                      { key: 'installment', label: 'فقط قسط', icon: 'fa-calendar-days', desc: 'اقساط پرداخت‌نشده' },
                      { key: 'check', label: 'فقط چک', icon: 'fa-money-check', desc: 'چک‌های سررسیددار' },
                    ].map((option) => {
                      const active = normalizeTargetType(editRule?.targetType) === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setEditRule((r) => r ? ({ ...r, targetType: option.key as ReminderTargetType }) : r)}
                          className={`rounded-2xl border px-3 py-2.5 text-right transition ${active ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm dark:border-sky-800 dark:bg-sky-950/25 dark:text-sky-200' : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300'}`}
                        >
                          <span className="flex items-center gap-2 text-xs font-black">
                            <i className={`fa-solid ${option.icon}`} />
                            {option.label}
                          </span>
                          <span className="mt-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">{option.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <details open className="rounded-[22px] border border-sky-200 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-950/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 marker:hidden">
                    <div className="inline-flex items-center gap-2 text-sm font-black text-sky-800 dark:text-sky-200">
                      <i className="fa-solid fa-calendar-days" />
                      پیش‌نمایش قسط
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-black text-sky-700 dark:border-sky-900/50 dark:bg-sky-950 dark:text-sky-200">
                        {(previewData?.totalInstallmentMatched ?? 0).toLocaleString('fa-IR')} مورد
                      </span>
                      <i className="fa-solid fa-chevron-down text-[11px] text-slate-400" />
                    </div>
                  </summary>
                  <div className="border-t border-sky-200/70 p-3 dark:border-sky-900/40">
                    {(previewData?.installmentPreviews || []).length ? (
                      <div className="space-y-2">
                        {(previewData?.installmentPreviews || []).map((item, idx) => (
                          <div key={`installment-${item.paymentId || item.saleId || idx}`} className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 truncate font-black text-slate-900 dark:text-white">{item.customerName}</div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900">{item.amount} تومان</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900">سررسید {item.dueDate}</span>
                              </div>
                            </div>
                            <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50/80 p-3 text-sm leading-7 text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100 whitespace-pre-wrap break-words">{item.text}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">برای قسط، مورد منطبق پیدا نشد؛ پیش‌نمایش فرضی نمایش داده می‌شود.</div>
                        <div className="rounded-[18px] border border-dashed border-sky-200 bg-white p-3 text-sm leading-7 text-slate-800 dark:border-sky-900/40 dark:bg-slate-950 dark:text-slate-100 whitespace-pre-wrap break-words">{previewData?.installmentFallback?.text || previewData?.fallback?.text || ''}</div>
                      </div>
                    )}
                  </div>
                </details>

                <details open className="rounded-[22px] border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 marker:hidden">
                    <div className="inline-flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-200">
                      <i className="fa-solid fa-money-check" />
                      پیش‌نمایش چک
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-black text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-200">
                        {(previewData?.totalCheckMatched ?? 0).toLocaleString('fa-IR')} مورد
                      </span>
                      <i className="fa-solid fa-chevron-down text-[11px] text-slate-400" />
                    </div>
                  </summary>
                  <div className="border-t border-amber-200/70 p-3 dark:border-amber-900/40">
                    {(previewData?.checkPreviews || []).length ? (
                      <div className="space-y-2">
                        {(previewData?.checkPreviews || []).map((item, idx) => (
                          <div key={`check-${item.checkId || item.saleId || idx}`} className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 truncate font-black text-slate-900 dark:text-white">{item.customerName}</div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900">{item.amount} تومان</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900">سررسید {item.dueDate}</span>
                                {item.checkNumber ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900">چک {item.checkNumber}</span> : null}
                              </div>
                            </div>
                            <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50/80 p-3 text-sm leading-7 text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100 whitespace-pre-wrap break-words">{item.text}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">برای چک، مورد منطبق پیدا نشد؛ پیش‌نمایش فرضی نمایش داده می‌شود.</div>
                        <div className="rounded-[18px] border border-dashed border-amber-200 bg-white p-3 text-sm leading-7 text-slate-800 dark:border-amber-900/40 dark:bg-slate-950 dark:text-slate-100 whitespace-pre-wrap break-words">{previewData?.checkFallback?.text || ''}</div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </section>
          </div>

          <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button type="button" onClick={() => { setEditorOpen(false); setEditRule(null); }} className="rounded-xl border border-primary/15 px-4 py-2 text-sm font-bold hover:bg-primary/5">
              انصراف
            </button>
            <button type="button" onClick={upsertRule} disabled={savingRule} className="rounded-xl bg-primary px-5 py-2 text-sm font-black text-white hover:brightness-110 disabled:opacity-60">
              {savingRule ? 'ذخیره تغییرات…' : 'ذخیره تغییرات'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ReminderRulesBuilder;
