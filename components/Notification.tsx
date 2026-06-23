import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NotificationMessage } from '../types';
import { getRecoveryHint } from '../utils/feedback';
import { APP_MESSAGES, cleanAppMessage } from '../shared/messages';

type NotificationPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-center';

interface NotificationProps {
  message?: NotificationMessage | string | null;
  onClose?: () => void;
  position?: NotificationPosition;
  className?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | string;
  text?: string;
}

type ToneKey = 'success' | 'error' | 'warning' | 'info';

type NormalizedNotificationMessage = {
  type: ToneKey;
  title?: string;
  detail?: string;
  text?: string;
  message?: string;
  persistent: boolean;
  countdownSeconds?: number;
  countdownLabel?: string;
  badges: string[];
  actionLabel?: string;
  actionIcon?: string;
  actionVariant?: 'primary' | 'secondary' | 'ghost';
  onAction?: (() => void | Promise<void>) | null;
  feedActionLabel?: string;
  onFeedAction?: (() => void | Promise<void>) | null;
  nextStep?: string;
};

const toneMap: Record<ToneKey, { title: string; wrap: string; iconWrap: string; icon: string; progress: string; kicker: string; actionHint: string }> = {
  success: {
    title: APP_MESSAGES.notification.successTitle,
    wrap: 'border-emerald-200/90 bg-white/95 text-slate-900 dark:border-emerald-900/40 dark:bg-slate-950/95 dark:text-slate-100',
    iconWrap: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40',
    icon: 'fa-circle-check',
    progress: 'from-emerald-400 via-cyan-400 to-sky-500 dark:from-emerald-300 dark:via-cyan-300 dark:to-sky-300',
    kicker: APP_MESSAGES.notification.successKicker,
    actionHint: APP_MESSAGES.notification.successActionHint,
  },
  error: {
    title: APP_MESSAGES.notification.errorTitle,
    wrap: 'border-rose-200/90 bg-white/95 text-slate-900 dark:border-rose-900/40 dark:bg-slate-950/95 dark:text-slate-100',
    iconWrap: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/40',
    icon: 'fa-circle-exclamation',
    progress: 'from-rose-400 via-orange-400 to-amber-400 dark:from-rose-300 dark:via-orange-300 dark:to-amber-300',
    kicker: APP_MESSAGES.notification.errorKicker,
    actionHint: APP_MESSAGES.notification.errorActionHint,
  },
  warning: {
    title: APP_MESSAGES.notification.warningTitle,
    wrap: 'border-amber-200/90 bg-white/95 text-slate-900 dark:border-amber-900/40 dark:bg-slate-950/95 dark:text-slate-100',
    iconWrap: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40',
    icon: 'fa-triangle-exclamation',
    progress: 'from-amber-400 via-orange-400 to-yellow-400 dark:from-amber-300 dark:via-orange-300 dark:to-yellow-300',
    kicker: APP_MESSAGES.notification.warningKicker,
    actionHint: APP_MESSAGES.notification.warningActionHint,
  },
  info: {
    title: APP_MESSAGES.notification.infoTitle,
    wrap: 'border-slate-200/90 bg-white/95 text-slate-900 dark:border-slate-800/60 dark:bg-slate-950/95 dark:text-slate-100',
    iconWrap: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800',
    icon: 'fa-bell',
    progress: 'from-slate-400 via-sky-400 to-cyan-400 dark:from-slate-300 dark:via-sky-300 dark:to-cyan-300',
    kicker: APP_MESSAGES.notification.infoKicker,
    actionHint: APP_MESSAGES.notification.infoActionHint,
  },
};

const sentence = (value: string) => {
  const text = (value || '').trim();
  if (!text) return '';
  return /[.!؟…]$/.test(text) ? text : `${text}.`;
};

const normalizeTone = (raw?: string): ToneKey => {
  if (raw === 'success' || raw === 'error' || raw === 'warning' || raw === 'info') return raw;
  return 'info';
};

const normalizeNotificationMessage = (input: NotificationMessage | string | null | undefined, fallbackType?: string, fallbackText?: string): NormalizedNotificationMessage | null => {
  const directText = cleanAppMessage(fallbackText || (typeof input === 'string' ? input : ''));
  if (!input && !directText) return null;

  if (typeof input === 'string' || !input) {
    return {
      type: normalizeTone(fallbackType),
      text: directText,
      message: directText,
      persistent: false,
      badges: [],
      actionVariant: 'secondary',
      onAction: null,
      onFeedAction: null,
    };
  }

  if (typeof input !== 'object') return null;

  const record = input as unknown as Record<string, unknown>;
  const rawType = typeof record.type === 'string' ? record.type : fallbackType || 'info';
  const text = cleanAppMessage(typeof record.text === 'string' ? record.text : typeof record.message === 'string' ? record.message : fallbackText);

  return {
    type: normalizeTone(rawType),
    title: typeof record.title === 'string' ? record.title : undefined,
    detail: typeof record.detail === 'string' ? record.detail : undefined,
    text,
    message: typeof record.message === 'string' ? record.message : text,
    persistent: Boolean(record.persistent),
    countdownSeconds: typeof record.countdownSeconds === 'number' && Number.isFinite(record.countdownSeconds) ? record.countdownSeconds : undefined,
    countdownLabel: typeof record.countdownLabel === 'string' ? record.countdownLabel : undefined,
    badges: Array.isArray(record.badges) ? record.badges.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [],
    actionLabel: typeof record.actionLabel === 'string' ? record.actionLabel : undefined,
    actionIcon: typeof record.actionIcon === 'string' ? record.actionIcon : undefined,
    actionVariant:
      record.actionVariant === 'primary' || record.actionVariant === 'secondary' || record.actionVariant === 'ghost'
        ? record.actionVariant
        : 'secondary',
    onAction: typeof record.onAction === 'function' ? (record.onAction as (() => void | Promise<void>)) : null,
    feedActionLabel: typeof record.feedActionLabel === 'string' ? record.feedActionLabel : undefined,
    onFeedAction: typeof record.onFeedAction === 'function' ? (record.onFeedAction as (() => void | Promise<void>)) : null,
    nextStep: typeof record.nextStep === 'string' ? record.nextStep : undefined,
  };
};

const humanizeText = (value: string, type: ToneKey) => {
  const text = cleanAppMessage(value);
  const lower = text.toLowerCase();

  if (!text) {
    return {
      title: toneMap[type].title,
      detail: '',
      nextStep: type === 'error' ? 'ورودی‌ها را بررسی کنید و دوباره تلاش کنید.' : '',
    };
  }

  if (/500|internal server error|http 500/.test(lower)) {
    return {
      title: APP_MESSAGES.notification.serverProcessingFailedTitle,
      detail: APP_MESSAGES.notification.serverProcessingFailedDetail,
      nextStep: getRecoveryHint(text),
    };
  }

  if (/401|403|unauthorized|forbidden|دسترسی|مجوز/.test(lower)) {
    return {
      title: APP_MESSAGES.notification.accessDeniedTitle,
      detail: APP_MESSAGES.notification.accessDeniedDetail,
      nextStep: APP_MESSAGES.notification.accessDeniedNextStep,
    };
  }

  if (/network|failed to fetch|connection|اتصال/.test(lower)) {
    return {
      title: APP_MESSAGES.notification.connectionFailedTitle,
      detail: APP_MESSAGES.notification.connectionFailedDetail,
      nextStep: APP_MESSAGES.notification.connectionFailedNextStep,
    };
  }

  if (/validation|invalid|نامعتبر|الزامی|required/.test(lower)) {
    return {
      title: APP_MESSAGES.notification.validationTitle,
      detail: sentence(text),
      nextStep: APP_MESSAGES.notification.validationNextStep,
    };
  }

  if (/unique constraint|تکراری|already exists|قبلا ثبت/.test(lower)) {
    return {
      title: APP_MESSAGES.notification.duplicateTitle,
      detail: APP_MESSAGES.notification.duplicateDetail,
      nextStep: APP_MESSAGES.notification.duplicateNextStep,
    };
  }

  return { title: sentence(text), detail: '', nextStep: type === 'error' ? getRecoveryHint(text) : '' };
};

const Notification: React.FC<NotificationProps> = ({ message, onClose, type, text, className }) => {
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const msg = useMemo(() => normalizeNotificationMessage(message, type, text), [message, type, text]);
  const messageKey = useMemo(() => {
    if (!msg) return '';
    return JSON.stringify({
      type: msg.type,
      title: msg.title,
      detail: msg.detail,
      text: msg.text,
      message: msg.message,
      badges: msg.badges,
      countdownSeconds: msg.countdownSeconds,
      persistent: msg.persistent,
    });
  }, [msg]);

  const closeMs = useMemo(() => {
    if (!msg || msg.persistent) return null;
    if (typeof msg.countdownSeconds === 'number' && Number(msg.countdownSeconds) > 0) return Math.round(Number(msg.countdownSeconds) * 1000);
    return msg.type === 'error' ? 5400 : msg.onAction ? 7000 : 4200;
  }, [msg]);

  const close = React.useCallback(() => {
    setVisible(false);
    if (onClose) {
      window.setTimeout(() => onClose(), 180);
      return;
    }
    window.setTimeout(() => setDismissed(true), 180);
  }, [onClose]);

  useEffect(() => {
    setDismissed(false);
  }, [messageKey]);

  useEffect(() => {
    if (!msg || dismissed) return;
    setVisible(false);
    const show = window.setTimeout(() => setVisible(true), 20);
    return () => window.clearTimeout(show);
  }, [msg, dismissed]);

  useEffect(() => {
    if (!msg || msg.persistent || !closeMs) return;
    setNow(Date.now());
    const timer = window.setTimeout(close, closeMs);
    return () => window.clearTimeout(timer);
  }, [msg, close, closeMs]);

  useEffect(() => {
    if (!msg || msg.persistent || !closeMs) return;
    setNow(Date.now());
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() - startedAt >= closeMs) window.clearInterval(interval);
    }, 100);
    return () => window.clearInterval(interval);
  }, [msg, closeMs]);

  if (!msg || dismissed) return null;

  const rawText = msg.text ?? msg.message ?? '';
  const tone = toneMap[msg.type] || toneMap.info;
  const humanized = humanizeText(rawText, msg.type);
  const title = msg.title || (msg.type === 'success' ? tone.title : humanized.title || tone.title);
  const detail = msg.detail ?? (msg.type === 'success' ? sentence(rawText) : humanized.detail || sentence(rawText));
  const nextStep = msg.nextStep ?? humanized.nextStep;
  const progress = closeMs ? Math.max(Math.min((closeMs - (Date.now() - now)) / closeMs, 1), 0) : 0;

  const notificationNode = (
    <div
      className={[
        'fixed bottom-3 right-3 z-[2147483000] pointer-events-auto w-[min(calc(100vw-24px),400px)] overflow-hidden rounded-[24px] border shadow-[0_25px_70px_-35px_rgba(15,23,42,0.42)] backdrop-blur-xl transition-all duration-300 sm:bottom-5 sm:right-5 sm:w-[min(92vw,400px)]',
        tone.wrap,
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className ?? '',
      ].join(' ')}
      style={{ isolation: 'isolate' }}
      role="alert"
      aria-live="polite"
      dir="rtl"
    >
      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className={`mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.iconWrap}`}>
          <i className={`fa-solid ${tone.icon} text-lg`} />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 break-words">
              <div className="text-[15px] font-black tracking-[-0.01em]">{title}</div>
              {detail ? <div className="mt-1 break-words text-[13px] leading-6 text-slate-600 dark:text-slate-300">{detail}</div> : null}
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
              aria-label="بستن اعلان"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {msg.badges.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {msg.badges.slice(0, 5).map((badge) => (
                <span key={badge} className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          {nextStep ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
              <span className="ml-1 inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
                اقدام پیشنهادی:
              </span>
              {nextStep}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-wand-magic-sparkles" /> اعلان هوشمند سیستم</span>
              <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock" /> بستن خودکار</span>
            </div>
          )}

          {msg.onAction && msg.actionLabel ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={actionBusy}
                onClick={async () => {
                  if (!msg.onAction || actionBusy) return;
                  setActionBusy(true);
                  try {
                    await Promise.resolve(msg.onAction());
                  } finally {
                    setActionBusy(false);
                    close();
                  }
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <i className={`fa-solid ${msg.actionIcon || 'fa-arrow-rotate-left'}`} />
                {actionBusy ? 'در حال انجام...' : msg.actionLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="h-1.5 w-full bg-slate-100/80 dark:bg-slate-800/80">
        <div className={`h-full bg-gradient-to-r ${tone.progress} transition-[width] duration-100 ease-linear`} style={{ width: `${Math.max(progress * 100, 0)}%` }} />
      </div>
    </div>
  );

  if (typeof document === 'undefined') return notificationNode;
  return createPortal(notificationNode, document.body);
};

export default Notification;
