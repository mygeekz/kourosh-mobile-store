import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import moment from 'jalali-moment';
import { apiFetch } from '../../utils/apiFetch';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'positive' | string;

type Insight = {
  id?: string;
  title?: string;
  summary?: string;
  severity?: Severity;
  score?: number;
  confidence?: number;
  category?: string;
  actions?: { label?: string; to?: string; icon?: string }[];
};

type ExecutiveBrain = {
  score?: number;
  status?: string;
  statusLabel?: string;
  command?: string;
  narrative?: string;
  confidence?: number;
  nextBestActions?: { id?: string; title?: string; summary?: string; to?: string; actionLabel?: string; severity?: Severity }[];
  focusAreas?: { key?: string; label?: string; value?: string | number; tone?: string }[];
};

type Payload = {
  financialBrain?: { summary?: Record<string, unknown>; executiveBrain?: ExecutiveBrain; risks?: unknown[]; opportunities?: unknown[]; actions?: unknown[]; confidence?: number };
  summary?: Record<string, unknown>;
  dailyBrief?: string[];
  executiveBrain?: ExecutiveBrain;
  insights?: Insight[];
  suspiciousAudit?: unknown[];
  profitEngine?: { summary?: Record<string, unknown> };
};

type AuditPayload = {
  score?: number;
  counts?: { total?: number; critical?: number; warning?: number; info?: number; byArea?: Record<string, number> };
  issues?: { id?: string; severity?: string; area?: string; title?: string; difference?: number; actionHint?: string }[];
};

const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const money = (v: unknown) => `${Math.round(num(v)).toLocaleString('fa-IR')} تومان`;
const pct = (v: unknown) => `${Math.round(num(v)).toLocaleString('fa-IR')}٪`;

const todayJ = () => moment().locale('fa').format('jYYYY/jMM/jDD');
const monthStartJ = () => moment().locale('fa').startOf('jMonth').format('jYYYY/jMM/jDD');

function pickRange(search: string) {
  const sp = new URLSearchParams(search || '');
  const from = sp.get('fromDate') || sp.get('from') || sp.get('fromJ') || monthStartJ();
  const to = sp.get('toDate') || sp.get('to') || sp.get('toJ') || todayJ();
  return { from, to };
}

function jalaliToIso(value: string) {
  const parsed = moment(value, 'jYYYY/jMM/jDD').locale('en');
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
}

function severityClass(severity?: Severity) {
  switch (severity) {
    case 'critical': return 'border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100';
    case 'high': return 'border-orange-200 bg-orange-50/80 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100';
    case 'medium': return 'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100';
    case 'positive': return 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100';
    default: return 'border-sky-200 bg-sky-50/80 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100';
  }
}

function statusTone(score: number) {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-300';
  if (score >= 70) return 'text-indigo-600 dark:text-indigo-300';
  if (score >= 50) return 'text-amber-600 dark:text-amber-300';
  return 'text-rose-600 dark:text-rose-300';
}

function trustLabel(score: number, issues: number) {
  if (score >= 96 && issues === 0) return 'قابل اتکا';
  if (score >= 90) return 'نیازمند کنترل سبک';
  if (score >= 75) return 'نیازمند بررسی';
  return 'پرریسک';
}

function trustTone(score: number) {
  if (score >= 96) return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100';
  if (score >= 90) return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100';
  if (score >= 75) return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100';
  return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100';
}

export default function ReportsDecisionEngine({ compact = false }: { compact?: boolean }) {
  const { pathname, search } = useLocation();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const range = useMemo(() => pickRange(search), [search]);
  const hidden = pathname.includes('/smart-insights') || pathname.includes('/financial-audit');

  useEffect(() => {
    if (hidden) return;
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const qs = new URLSearchParams({ fromDate: range.from, toDate: range.to });
        const auditQs = new URLSearchParams({ fromISO: jalaliToIso(range.from), toISO: jalaliToIso(range.to) });
        const [res, auditRes, financialRes] = await Promise.all([
          apiFetch(`/api/reports/smart-insights?${qs.toString()}`),
          apiFetch(`/api/reports/financial-audit?${auditQs.toString()}`),
          apiFetch(`/api/brain/financial?${qs.toString()}`).catch(() => null),
        ]);
        const json = await res.json();
        const auditJson = await auditRes.json().catch(() => null);
        const financialJson = financialRes ? await financialRes.json().catch(() => null) : null;
        if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت تحلیل مدیریتی');
        if (mounted) {
          setPayload({ ...(json.data || {}), financialBrain: financialJson?.success ? (financialJson.data || null) : null });
          setAudit(auditRes.ok && auditJson?.success ? (auditJson.data || null) : null);
        }
      } catch {
        if (mounted) {
          setFailed(true);
          setPayload(null);
          setAudit(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [hidden, range.from, range.to]);

  const brain = payload?.financialBrain?.executiveBrain || payload?.executiveBrain || {};
  const score = Math.max(0, Math.min(100, Math.round(num(brain.score))));
  const insights = (payload?.insights || []).slice().sort((a, b) => num(b.score) - num(a.score)).slice(0, 3);
  const actions = (brain.nextBestActions || []).slice(0, 3);
  const summary = payload?.financialBrain?.summary || payload?.summary || {};
  const profitSummary = payload?.profitEngine?.summary || {};
  const auditScore = Math.max(0, Math.min(100, Math.round(num(audit?.score ?? brain.confidence ?? 100))));
  const issueCount = Math.round(num(audit?.counts?.total));
  const criticalCount = Math.round(num(audit?.counts?.critical));
  const warningCount = Math.round(num(audit?.counts?.warning));
  const statusText = failed ? 'نامشخص' : loading ? 'در حال بررسی' : trustLabel(auditScore, issueCount);
  const statusDotTone = failed ? 'reports-ai-dot--warn' : (issueCount > 0 || auditScore < 90 ? 'reports-ai-dot--warn' : 'reports-ai-dot--good');
  const topAuditIssues = (audit?.issues || []).slice(0, 2);
  const auditHref = `/reports/financial-audit?fromISO=${encodeURIComponent(jalaliToIso(range.from))}&toISO=${encodeURIComponent(jalaliToIso(range.to))}`;

  if (hidden) return null;

  return (
    <section className="reports-ai-minibar reports-premium-panel print:hidden" dir="rtl" aria-label="هوش مالی گزارش" data-ui-report-ai-bar="trust" data-ui-report-surface="true">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="reports-ai-minibar__summary"
        data-ui-report-ai-summary="true"
        aria-expanded={expanded}
      >
        <span className={`reports-ai-dot ${statusDotTone}`} />
        <span className="reports-ai-minibar__title">وضعیت گزارش: {statusText}</span>
        <span className="reports-ai-minibar__meta">دقت گزارش {pct(auditScore)}</span>
        <span className="reports-ai-minibar__meta">{issueCount.toLocaleString('fa-IR')} هشدار</span>
        <span className="reports-ai-minibar__meta">{actions.length.toLocaleString('fa-IR')} اقدام</span>
        <span className="reports-ai-minibar__chevron">
          <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
        </span>
      </button>

      {expanded ? (
        <div className="reports-ai-minibar__details" data-ui-report-ai-details="true">
          <div className="reports-ai-minibar__grid">
            <div>
              <strong>Financial Brain</strong>
              <span>{score ? pct(score) : 'بدون امتیاز'}</span>
              <p>{brain.narrative || brain.command || 'تحلیل مالی در پس‌زمینه فعال است.'}</p>
            </div>
            <div>
              <strong className="reports-trust-layer">Financial Trust Layer</strong>
              <span>{criticalCount.toLocaleString('fa-IR')} بحرانی / {warningCount.toLocaleString('fa-IR')} هشدار</span>
              <Link to={auditHref}>ممیزی مالی</Link>
            </div>
            <div>
              <strong>Insight Strip</strong>
              <p>{insights[0]?.title || insights[0]?.summary || 'نکته فوری ثبت نشده است.'}</p>
            </div>
            <div>
              <strong>Next Best Actions</strong>
              <p>{actions[0]?.title || actions[0]?.actionLabel || 'اقدام فوری وجود ندارد.'}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
