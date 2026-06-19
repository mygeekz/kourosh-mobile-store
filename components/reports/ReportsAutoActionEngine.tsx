import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import moment from 'jalali-moment';
import { apiFetch } from '../../utils/apiFetch';

type Tone = 'critical' | 'warning' | 'info' | 'positive';

type AutoAction = {
  id: string;
  title: string;
  summary: string;
  tone: Tone;
  confidence: number;
  primaryLabel: string;
  kind: 'send-now' | 'schedule' | 'export' | 'audit' | 'open';
  to?: string;
};


type SmartInsightsAutoActionPayload = {
  executiveBrain?: {
    score?: number;
  };
};

type FinancialAuditAutoActionPayload = {
  score?: number;
  counts?: {
    total?: number;
  };
  issues?: unknown[];
};

type Props = {
  reportKey: string;
  reportTitle: string;
  isHub?: boolean;
  onSendNow?: () => void | Promise<void>;
  onOpenSchedule?: () => void;
  onExportExcel?: () => void | Promise<void>;
};

const todayJ = () => moment().locale('fa').format('jYYYY/jMM/jDD');
const monthStartJ = () => moment().locale('fa').startOf('jMonth').format('jYYYY/jMM/jDD');

function pickRange(search: string) {
  const sp = new URLSearchParams(search || '');
  return {
    from: sp.get('fromDate') || sp.get('from') || sp.get('fromJ') || monthStartJ(),
    to: sp.get('toDate') || sp.get('to') || sp.get('toJ') || todayJ(),
  };
}

function jalaliToIso(value: string) {
  const parsed = moment(value, 'jYYYY/jMM/jDD').locale('en');
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
}

function toneClass(tone: Tone) {
  switch (tone) {
    case 'critical': return 'border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100';
    case 'warning': return 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100';
    case 'positive': return 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100';
    default: return 'border-indigo-200 bg-indigo-50/80 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100';
  }
}

function iconFor(kind: AutoAction['kind']) {
  switch (kind) {
    case 'send-now': return 'fa-paper-plane';
    case 'schedule': return 'fa-clock';
    case 'export': return 'fa-file-excel';
    case 'audit': return 'fa-shield-halved';
    default: return 'fa-arrow-left';
  }
}

export default function ReportsAutoActionEngine({ reportKey, reportTitle, isHub, onSendNow, onOpenSchedule, onExportExcel }: Props) {
  const { search, pathname } = useLocation();
  const range = useMemo(() => pickRange(search), [search]);
  const [payload, setPayload] = useState<SmartInsightsAutoActionPayload | null>(null);
  const [audit, setAudit] = useState<FinancialAuditAutoActionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isHub) return;
    let alive = true;
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    const auditQs = new URLSearchParams({ fromISO: jalaliToIso(range.from), toISO: jalaliToIso(range.to) });
    setLoading(true);
    Promise.all([
      apiFetch(`/api/reports/smart-insights?${qs.toString()}`).then((res) => res.json().catch(() => null)).catch(() => null),
      apiFetch(`/api/reports/financial-audit?${auditQs.toString()}`).then((res) => res.json().catch(() => null)).catch(() => null),
    ])
      .then(([smartJson, auditJson]) => {
        if (!alive) return;
        setPayload(smartJson?.success ? (smartJson.data || {}) : {});
        setAudit(auditJson?.success ? (auditJson.data || {}) : {});
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [isHub, range.from, range.to]);

  const actions = useMemo<AutoAction[]>(() => {
    if (isHub) return [];
    const score = Number(payload?.executiveBrain?.score ?? 0);
    const auditScore = Number(audit?.score ?? 100);
    const issues = Number(audit?.counts?.total ?? audit?.issues?.length ?? 0);
    const isToday = range.from === todayJ() && range.to === todayJ();
    const list: AutoAction[] = [];

    if (issues > 0 || auditScore < 96) {
      list.push({
        id: 'audit-before-send',
        title: 'اول ممیزی اختلاف را کنترل کن',
        summary: `${issues.toLocaleString('fa-IR')} مورد اختلاف/ریسک روی همین بازه دیده شده؛ قبل از ارسال رسمی گزارش بهتر است Drill-down بررسی شود.`,
        tone: auditScore < 85 ? 'critical' : 'warning',
        confidence: Math.max(70, Math.min(99, 100 - Math.round((100 - auditScore) / 2))),
        primaryLabel: 'باز کردن ممیزی',
        kind: 'audit',
        to: `/reports/financial-audit?fromISO=${encodeURIComponent(jalaliToIso(range.from))}&toISO=${encodeURIComponent(jalaliToIso(range.to))}`,
      });
    }

    if (score >= 75 && auditScore >= 96) {
      list.push({
        id: 'send-clean-report',
        title: isToday ? 'ارسال گزارش امروز آماده است' : 'ارسال گزارش بازه انتخابی آماده است',
        summary: `دقت ممیزی قابل قبول است و گزارش «${reportTitle}» می‌تواند با همین فیلتر برای تلگرام ارسال شود.`,
        tone: 'positive',
        confidence: Math.min(99, Math.round((score + auditScore) / 2)),
        primaryLabel: 'ارسال فوری',
        kind: 'send-now',
      });
    } else {
      list.push({
        id: 'export-for-review',
        title: 'خروجی اکسل برای بازبینی مدیریتی',
        summary: 'به‌جای ارسال فوری، خروجی همین گزارش را برای کنترل عددها و مقایسه داخلی دریافت کن.',
        tone: 'info',
        confidence: 82,
        primaryLabel: 'دریافت Excel',
        kind: 'export',
      });
    }

    list.push({
      id: 'schedule-existing-flow',
      title: 'زمان‌بندی ارسال را روی همین گزارش تنظیم کن',
      summary: 'سیستم زمان‌بندی از قبل وجود دارد؛ این پیشنهاد فقط همان پنل فعلی را با همین گزارش و بازه باز می‌کند، نه یک زمان‌بندی تکراری جدید.',
      tone: 'info',
      confidence: 88,
      primaryLabel: 'باز کردن زمان‌بندی',
      kind: 'schedule',
    });

    const next = Array.isArray(payload?.executiveBrain?.nextBestActions) ? payload.executiveBrain.nextBestActions[0] : null;
    if (next?.to) {
      list.push({
        id: `brain-${next.id || 'next'}`,
        title: next.title || 'اقدام پیشنهادی مغز هوشمند',
        summary: next.summary || 'این اقدام بر اساس فروش، سود، وصول، موجودی و ممیزی پیشنهاد شده است.',
        tone: next.severity === 'critical' ? 'critical' : next.severity === 'high' ? 'warning' : 'info',
        confidence: 84,
        primaryLabel: next.actionLabel || 'انجام اقدام',
        kind: 'open',
        to: next.to,
      });
    }

    return list.slice(0, 4);
  }, [audit, isHub, payload, range.from, range.to, reportTitle]);

  const run = async (action: AutoAction) => {
    setMessage('');
    if (action.to) return;
    setRunningId(action.id);
    try {
      if (action.kind === 'send-now') {
        await onSendNow?.();
        setMessage('درخواست ارسال فوری با همین فیلتر اجرا شد.');
      } else if (action.kind === 'schedule') {
        onOpenSchedule?.();
      } else if (action.kind === 'export') {
        await onExportExcel?.();
        setMessage('خروجی اکسل همین گزارش آماده‌سازی شد.');
      }
    } finally {
      setRunningId(null);
    }
  };

  if (isHub) return null;

  return (
    <section className="reports-ai-minibar reports-ai-minibar--actions reports-premium-orbit reports-premium-panel print:hidden" dir="rtl" aria-label="اقدام‌های خودکار گزارش" data-ui-report-ai-bar="actions" data-ui-report-surface="true">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="reports-ai-minibar__summary"
        data-ui-report-ai-summary="true"
        aria-expanded={expanded}
      >
        <span className={`reports-ai-dot ${loading ? 'reports-ai-dot--warn' : 'reports-ai-dot--good'}`} />
        <span className="reports-ai-minibar__title">اقدام‌های پیشنهادی: {loading ? 'در حال تحلیل' : `${actions.length.toLocaleString('fa-IR')} مورد`}</span>
        <span className="reports-ai-minibar__meta">{reportTitle}</span>
        {message ? <span className="reports-ai-minibar__meta">{message}</span> : null}
        <span className="reports-ai-minibar__chevron">
          <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
        </span>
      </button>

      {expanded ? (
        <div className="reports-ai-minibar__details" data-ui-report-ai-details="true">
          <div className="reports-auto-action-compact">
            {actions.map((action) => {
              if (action.to) {
                return (
                  <Link key={action.id} to={action.to} className="reports-auto-action-compact__row">
                    <i className={`fa-solid ${iconFor(action.kind)}`} />
                    <span>{action.title}</span>
                    <small>{action.primaryLabel}</small>
                  </Link>
                );
              }
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={!!runningId}
                  onClick={() => run(action)}
                  className="reports-auto-action-compact__row disabled:opacity-60"
                >
                  {runningId === action.id ? <i className="fa-solid fa-spinner fa-spin" /> : <i className={`fa-solid ${iconFor(action.kind)}`} />}
                  <span>{action.title}</span>
                  <small>{action.primaryLabel}</small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
