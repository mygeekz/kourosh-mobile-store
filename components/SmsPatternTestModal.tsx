import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import { humanizeSmsError } from '../utils/smsErrorMessage';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bodyId: string;
  tokenLabels: string[];
};

const SmsPatternCheckModal: React.FC<Props> = ({ isOpen, onClose, title, bodyId, tokenLabels }) => {
  const { token } = useAuth();
  const [to, setTo] = useState('');
  const [values, setValues] = useState<string[]>(() => tokenLabels.map(() => ''));
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; title?: string; action?: string; technical?: string } | null>(null);

  const canSend = useMemo(() => {
    const bid = Number(bodyId);
    return !!token && !!to.trim() && !isNaN(bid) && bid > 0;
  }, [token, to, bodyId]);

  const onChangeValue = (idx: number, v: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  const sendCheck = async () => {
    if (!canSend) return;
    setIsSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/sms/check-pattern', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bodyId: Number(bodyId),
          to: to.trim(),
          tokens: values.map((x) => String(x ?? '')),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setResult({ ok: true, message: data?.message || 'پیامک تست با موفقیت ارسال شد.' });
      } else {
        const humanError = humanizeSmsError(data?.message || data?.error || data);
        setResult({ ok: false, title: humanError.title, message: humanError.message, action: humanError.action, technical: humanError.technical });
      }
    } catch (e: any) {
      const humanError = humanizeSmsError(e?.message || 'ارتباط با سرور برای ارسال پیامک تست برقرار نشد.');
      setResult({ ok: false, title: humanError.title, message: humanError.message, action: humanError.action, technical: humanError.technical });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} iconClass="fa-solid fa-paper-plane" widthClass="max-w-6xl">
      <div className="sms-pattern-test-modal">
        <div className="sms-pattern-test-modal__intro rounded-2xl border border-sky-200/70 dark:border-sky-900/40 bg-sky-50/80 dark:bg-sky-950/20 p-4 text-sm text-sky-900 dark:text-sky-200">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-200/70 bg-white/80 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/30 dark:text-sky-200">
              <i className="fa-solid fa-paper-plane" />
            </span>
            <div className="space-y-1">
              <div className="font-semibold">ارسال تست پترن ملی‌پیامک</div>
              <div>شماره گیرنده و متغیرها را وارد کنید تا همان پترن با مقادیر پیش‌نمایش برای شما ارسال شود.</div>
            </div>
          </div>
        </div>

        <div className="sms-pattern-test-modal__setup grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <label className="app-label flex items-center gap-2">
              <i className="fa-solid fa-fingerprint text-sky-500" />
              <span>شناسه پترن (BodyId)</span>
            </label>
            <input className="app-input" value={bodyId || ''} readOnly dir="ltr" />
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <label className="app-label flex items-center gap-2">
              <i className="fa-solid fa-mobile-screen-button text-emerald-500" />
              <span>شماره گیرنده</span>
            </label>
            <input
              className="app-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="مثلاً 09121234567"
              dir="ltr"
            />
          </div>
        </div>

        <div className="sms-pattern-test-modal__tokens rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <i className="fa-solid fa-code text-violet-500" />
            <span>متغیرهای پترن</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {tokenLabels.map((lbl, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[11px] dark:bg-violet-950/40">{idx + 1}</span>
                {lbl}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tokenLabels.map((lbl, idx) => (
              <div key={idx}>
                <label className="app-label flex items-center gap-2">
                  <i className="fa-solid fa-tag text-violet-500" />
                  <span>{idx + 1}) {lbl}</span>
                </label>
                <input
                  className="app-input"
                  value={values[idx] || ''}
                  onChange={(e) => onChangeValue(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {result ? (
          <div className={`sms-pattern-test-modal__result rounded-2xl border p-3 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200'}`}>
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
                    <summary className="cursor-pointer font-bold">جزئیات فنی</summary>
                    <pre dir="ltr" className="mt-2 max-h-32 overflow-auto rounded-xl bg-white/70 p-2 text-[11px] text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">{result.technical}</pre>
                  </details>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="sms-pattern-test-modal__footer flex items-center justify-end gap-2">
          <Button onClick={onClose} variant="secondary" leftIcon={<i className="fa-solid fa-xmark" />}>
            بستن
          </Button>
          <Button
            onClick={sendCheck}
            disabled={!canSend || isSending}
            loading={isSending}
            loadingText="در حال ارسال..."
            variant="primary"
            leftIcon={<i className="fa-solid fa-paper-plane" />}
          >
            ارسال تست
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SmsPatternCheckModal;
