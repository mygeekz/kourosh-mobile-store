import React, { useMemo, useState } from 'react';
import type { NotificationMessage } from '../types';
import { apiFetch } from '../utils/apiFetch';
import Button from './Button';
import { SelectField, TextField } from './ui';


type DiagnosticKind = 'customer' | 'partner';
type DiagnosticState = 'ok' | 'warning' | 'error' | 'info';

type DiagnosticSubjectOption = {
  id: number;
  displayName: string;
  phoneNumber: string | null;
  telegramLinked: boolean;
};

type DiagnosticStep = {
  key: string;
  label: string;
  state: DiagnosticState;
  code: string;
  message: string;
  at?: string | null;
  meta?: Record<string, string | number | boolean | null>;
};

type DiagnosticReport = {
  correlationId: string;
  generatedAt: string;
  subject: {
    kind: DiagnosticKind;
    id: number;
    displayName: string;
    phoneNumber: string | null;
    telegramLinked: boolean;
    telegramUserId: string | null;
  };
  overall: DiagnosticState;
  overallCode: string;
  summary: string;
  recommendedAction: string | null;
  steps: DiagnosticStep[];
};

type Props = {
  setNotification: React.Dispatch<React.SetStateAction<NotificationMessage | null>>;
};

const statePresentation: Record<DiagnosticState, { label: string; icon: string; badge: string; iconBox: string }> = {
  ok: {
    label: 'سالم',
    icon: 'fa-circle-check',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
    iconBox: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  warning: {
    label: 'نیازمند بررسی',
    icon: 'fa-triangle-exclamation',
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
    iconBox: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  error: {
    label: 'خطا',
    icon: 'fa-circle-xmark',
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300',
    iconBox: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  },
  info: {
    label: 'در حال انجام',
    icon: 'fa-arrows-rotate',
    badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300',
    iconBox: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  },
};

const formatTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('fa-IR');
};

const safeMetaEntries = (meta?: DiagnosticStep['meta']) => Object.entries(meta || {}).filter(([, value]) => value !== null && value !== '' && value !== undefined);

const metaLabel = (key: string) => ({
  httpStatus: 'HTTP',
  edgeVersion: 'نسخه Edge',
  snapshotVersion: 'نسخه Snapshot',
  snapshotState: 'وضعیت Snapshot',
  authorizationValidUntil: 'اعتبار تا',
  requestId: 'Request ID',
  state: 'Runtime',
  syncedSubjects: 'موفق',
  failedSubjects: 'ناموفق',
  syncState: 'Sync',
  attempts: 'تلاش',
  release: 'نسخه Live',
}[key] || key);

export default function MiniAppDiagnosticCenter({ setNotification }: Props) {
  const [kind, setKind] = useState<DiagnosticKind>('partner');
  const [query, setQuery] = useState('');
  const [subjects, setSubjects] = useState<DiagnosticSubjectOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [searching, setSearching] = useState(false);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  const selected = useMemo(() => subjects.find((item) => String(item.id) === selectedId) || null, [subjects, selectedId]);

  const searchSubjects = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setNotification({ type: 'warning', text: 'نام، شماره تماس یا شناسه پرونده را وارد کنید.' });
      return;
    }
    setSearching(true);
    setReport(null);
    try {
      const response = await apiFetch(`/api/settings/miniapp-diagnostics/subjects?kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(trimmed)}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(String(body?.message || 'جستجوی پرونده انجام نشد.'));
      const items = Array.isArray(body?.data?.items) ? body.data.items : [];
      setSubjects(items);
      setSelectedId(items.length === 1 ? String(items[0].id) : '');
      if (!items.length) setNotification({ type: 'info', text: 'پرونده‌ای با این عبارت پیدا نشد.' });
    } catch (error) {
      setSubjects([]);
      setSelectedId('');
      setNotification({ type: 'error', text: error instanceof Error ? error.message : 'جستجوی پرونده انجام نشد.' });
    } finally {
      setSearching(false);
    }
  };

  const runDiagnostic = async () => {
    if (!selectedId) {
      setNotification({ type: 'warning', text: 'ابتدا یک پرونده را انتخاب کنید.' });
      return;
    }
    setRunning(true);
    try {
      const response = await apiFetch('/api/settings/miniapp-diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, subjectId: Number(selectedId) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(String(body?.message || 'عیب‌یابی MiniApp انجام نشد.'));
      setReport(body.data as DiagnosticReport);
    } catch (error) {
      setReport(null);
      setNotification({ type: 'error', text: error instanceof Error ? error.message : 'عیب‌یابی MiniApp انجام نشد.' });
    } finally {
      setRunning(false);
    }
  };

  const rebuildSnapshot = async () => {
    setRefreshing(true);
    try {
      const response = await apiFetch('/api/settings/miniapp-snapshot/refresh', { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(String(body?.message || body?.code || 'همگام‌سازی Snapshot انجام نشد.'));
      setNotification({ type: 'success', text: 'بازسازی و همگام‌سازی Snapshot انجام شد؛ گزارش دوباره بررسی می‌شود.' });
      await runDiagnostic();
    } catch (error) {
      setNotification({ type: 'error', text: error instanceof Error ? error.message : 'همگام‌سازی Snapshot انجام نشد.' });
    } finally {
      setRefreshing(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    const text = [
      `Kourosh MiniApp Diagnostic`,
      `Correlation: ${report.correlationId}`,
      `Generated: ${report.generatedAt}`,
      `Subject: ${report.subject.kind} #${report.subject.id} ${report.subject.displayName}`,
      `Telegram User ID: ${report.subject.telegramUserId || '-'}`,
      `Overall: ${report.overallCode}`,
      `Summary: ${report.summary}`,
      ...report.steps.map((step) => `${step.label}: ${step.state} | ${step.code} | ${step.message}`),
      report.recommendedAction ? `Recommended: ${report.recommendedAction}` : '',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setNotification({ type: 'success', text: 'گزارش تشخیصی کپی شد.' });
    } catch {
      setNotification({ type: 'error', text: 'کپی گزارش در این مرورگر انجام نشد.' });
    }
  };

  const overallView = report ? statePresentation[report.overall] : null;

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" aria-labelledby="miniapp-diagnostic-center-heading" data-ui-miniapp-diagnostics="v252">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"><i className="fa-solid fa-stethoscope" /></span>
          <div className="min-w-0">
            <h3 id="miniapp-diagnostic-center-heading" className="text-base font-black text-slate-950 dark:text-white">مرکز عیب‌یابی MiniApp</h3>
            <p className="mt-1 max-w-3xl text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">مسیر هویت تلگرام، Snapshot، Cloudflare Edge و Live Origin را برای یک مشتری یا همکار بررسی می‌کند. این ابزار فقط‌خواندنی است و مجوز دسترسی را دور نمی‌زند.</p>
          </div>
        </div>
        {report && overallView ? (
          <span className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${overallView.badge}`}>
            <i className={`fa-solid ${overallView.icon}`} />
            {overallView.label}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-end">
        <SelectField<DiagnosticKind>
          label="نوع پرونده"
          value={kind}
          onValueChange={(value) => { setKind(value); setSubjects([]); setSelectedId(''); setReport(null); }}
          options={[{ value: 'customer', label: 'مشتری' }, { value: 'partner', label: 'همکار' }]}
        />
        <TextField
          label="جستجوی پرونده"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchSubjects(); } }}
          placeholder="نام، شماره تماس یا شناسه پرونده"
          icon={<i className="fa-solid fa-magnifying-glass" />}
          autoComplete="off"
        />
        <Button type="button" variant="secondary" size="md" onClick={searchSubjects} loading={searching} loadingText="در حال جستجو…" leftIcon={!searching ? <i className="fa-solid fa-magnifying-glass" /> : undefined}>
          جستجو
        </Button>
      </div>

      {subjects.length ? (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <SelectField
            label="پرونده انتخاب‌شده"
            value={selectedId}
            onValueChange={(value) => { setSelectedId(value); setReport(null); }}
            options={[
              { value: '', label: 'یک پرونده را انتخاب کنید', disabled: true },
              ...subjects.map((item) => ({
                value: String(item.id),
                label: `${item.displayName} · #${item.id}${item.phoneNumber ? ` · ${item.phoneNumber}` : ''}${item.telegramLinked ? ' · تلگرام متصل' : ' · بدون اتصال تلگرام'}`,
              })),
            ]}
          />
          <Button type="button" variant="primary" size="md" onClick={runDiagnostic} disabled={!selectedId} loading={running} loadingText="در حال عیب‌یابی…" leftIcon={!running ? <i className="fa-solid fa-wave-square" /> : undefined}>
            بررسی MiniApp
          </Button>
        </div>
      ) : null}

      {selected ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">#{selected.id.toLocaleString('fa-IR')}</span>
          <span>{selected.displayName}</span>
          <span className={selected.telegramLinked ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>{selected.telegramLinked ? '● تلگرام متصل' : '● تلگرام متصل نیست'}</span>
        </div>
      ) : null}

      {report ? (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-white">{report.summary}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>پرونده: {report.subject.displayName} · #{report.subject.id.toLocaleString('fa-IR')}</span>
                <span dir="ltr" className="font-mono text-[11px]">{report.correlationId}</span>
                <span>{formatTime(report.generatedAt)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="xs" onClick={runDiagnostic} loading={running} loadingText="بررسی…" leftIcon={!running ? <i className="fa-solid fa-rotate" /> : undefined}>بررسی مجدد</Button>
              <Button type="button" variant="ghost" size="xs" onClick={rebuildSnapshot} loading={refreshing} loadingText="همگام‌سازی…" leftIcon={!refreshing ? <i className="fa-solid fa-cloud-arrow-up" /> : undefined}>بازسازی و همگام‌سازی Snapshot</Button>
              <Button type="button" variant="ghost" size="xs" onClick={copyReport} leftIcon={<i className="fa-regular fa-copy" />}>کپی گزارش</Button>
            </div>
          </div>

          {report.recommendedAction ? (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-6 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/20 dark:text-amber-200 dark:ring-amber-900/40">
              <i className="fa-solid fa-lightbulb ml-2" />
              {report.recommendedAction}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {report.steps.map((step) => {
              const view = statePresentation[step.state];
              const meta = safeMetaEntries(step.meta);
              return (
                <article key={step.key} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${view.iconBox}`}><i className={`fa-solid ${view.icon}`} /></span>
                      <div className="min-w-0">
                        <strong className="block text-sm font-black text-slate-900 dark:text-white">{step.label}</strong>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{step.message}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${view.badge}`}>{view.label}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <bdi dir="ltr" className="rounded-md bg-white px-2 py-1 font-mono dark:bg-slate-950">{step.code}</bdi>
                    {formatTime(step.at) ? <span>{formatTime(step.at)}</span> : null}
                    {meta.map(([key, value]) => (
                      <span key={key} className="rounded-md bg-white px-2 py-1 dark:bg-slate-950">
                        {metaLabel(key)}: <bdi dir="ltr" className="font-mono">{key === 'authorizationValidUntil' && typeof value === 'string' ? (formatTime(value) || value) : String(value)}</bdi>
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            این گزارش «آمادگی دسترسی» را بررسی می‌کند. صحت امضای Telegram initData فقط هنگام ورود واقعی همان کاربر قابل تأیید است و این ابزار آن را جعل یا دور نمی‌زند.
          </div>
        </div>
      ) : null}
    </section>
  );
}
