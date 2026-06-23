import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';
import { humanizeSmsError } from '../utils/smsErrorMessage';

export type SmsPatternDef = {
  key: string; // settings key
  label: string;
  category: string;
  accent?: 'emerald' | 'blue' | 'amber' | 'gray';
  iconClass?: string;
  tokens: string[];
  previewTemplate?: string;
  bodyId?: string | number | null; // filled by settings
  configured?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  patterns: SmsPatternDef[];
  defaultSelectedKeys?: string[];
  // map from settings key => bodyId (string)
  getBodyId: (key: string) => string;
};

const SmsBulkCheckModal: React.FC<Props> = ({ isOpen, onClose, patterns, defaultSelectedKeys, getBodyId }) => {
  const { token } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultSelectedKeys || []);
  const [recipient, setRecipient] = useState<string>('');
  const [tokensByKey, setTokensByKey] = useState<Record<string, string[]>>({});
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const selected = useMemo(() => {
    const set = new Set(selectedKeys);
    return patterns.filter((p) => set.has(p.key));
  }, [patterns, selectedKeys]);

  const toggleKey = (k: string) => {
    setResult(null);
    setSelectedKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const reset = () => {
    setStep(1);
    setSelectedKeys(defaultSelectedKeys || []);
    setRecipient('');
    setTokensByKey({});
    setIsSending(false);
    setResult(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const ensureTokens = (key: string, len: number) => {
    setTokensByKey((prev) => {
      const cur = Array.isArray(prev[key]) ? prev[key] : [];
      if (cur.length === len) return prev;
      const next = [...cur];
      while (next.length < len) next.push('');
      return { ...prev, [key]: next.slice(0, len) };
    });
  };

  const goNext = () => {
    if (selectedKeys.length === 0) return;
    // pre-create token arrays
    selected.forEach((p) => ensureTokens(p.key, p.tokens.length));
    setStep(2);
  };

  const submit = async () => {
    if (!token) return;
    setIsSending(true);
    setResult(null);
    try {
      const checks = selected.map((p) => {
        const bodyId = Number(getBodyId(p.key));
        return {
          key: p.key,
          label: p.label,
          bodyId,
          tokens: (tokensByKey[p.key] || []).map((x) => String(x ?? '')),
        };
      });

      const res = await fetch('/api/sms/bulk-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: recipient.trim(), checks }),
      });
      const data = await res.json().catch(() => ({}));
      setResult({ ok: res.ok && data?.success, data });
    } catch (e: any) {
      setResult({ ok: false, data: { message: e?.message || 'ارتباط با سرور برای ارسال تست گروهی برقرار نشد.' } });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="ارسال تست گروهی پیامک‌ها" widthClass="max-w-6xl" iconClass="fa-solid fa-vials">
      <div className="sms-bulk-test-modal">
        <div className="sms-bulk-test-modal__intro rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-200 border border-violet-200/60 dark:border-violet-900/30">
              <i className="fa-solid fa-vials" />
            </span>
            مرحله {step} از 2
          </div>
          <div className="app-subtle mt-1 text-xs">
            ابتدا پترن‌های پیامک را انتخاب کن؛ سپس شماره گیرنده و متغیرها را برای ارسال تست وارد کن.
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="sms-bulk-test-modal__patternGrid grid grid-cols-1 md:grid-cols-2 gap-3">
              {patterns.map((p) => {
                const checked = selectedKeys.includes(p.key);
                return (
                  <Button
                    key={p.key}
                    type="button"
                    onClick={() => toggleKey(p.key)}
                    variant={checked ? 'success' : 'secondary'}
                    className={`w-full text-right rounded-2xl border p-3 bg-white/60 dark:bg-gray-800/40 hover:brightness-105 transition justify-start ${checked ? 'border-emerald-400 dark:border-emerald-600' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {p.label}
                        </div>
                        <div className="app-subtle text-xs mt-1">{p.category} • متغیرها: {p.tokens.join('، ')}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${checked ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
                      >
                        <i className={`fa-solid ${checked ? 'fa-check' : 'fa-plus'}`} />
                        {checked ? 'انتخاب شد' : 'انتخاب'}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="sms-bulk-test-modal__footer flex items-center justify-between gap-2">
              <Button type="button" onClick={close} variant="secondary">
                بستن
              </Button>
              <Button
                type="button"
                disabled={selectedKeys.length === 0}
                onClick={goNext}
                variant="success"
                rightIcon={<i className="fa-solid fa-arrow-left" />}
              >
                ادامه
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="sms-bulk-test-modal__recipient">
              <label className="app-label">شماره گیرنده برای ارسال تست</label>
              <input className="app-input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0912..." dir="ltr" />
            </div>

            <div className="sms-bulk-test-modal__checks space-y-3 max-h-[50vh] overflow-auto pr-1">
              {selected.map((p) => {
                const bodyId = getBodyId(p.key);
                const vals = tokensByKey[p.key] || [];
                ensureTokens(p.key, p.tokens.length);
                return (
                  <div key={p.key} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {p.label}
                      </div>
                      <div className="text-xs app-subtle" dir="ltr">BodyId: {bodyId || '—'}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {p.tokens.map((t, idx) => (
                        <div key={idx}>
                          <label className="app-label">{idx + 1}) {t}</label>
                          <input
                            className="app-input"
                            value={vals[idx] || ''}
                            onChange={(e) =>
                              setTokensByKey((prev) => {
                                const next = [...(prev[p.key] || [])];
                                while (next.length < p.tokens.length) next.push('');
                                next[idx] = e.target.value;
                                return { ...prev, [p.key]: next };
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {result ? (
              <div className={`sms-bulk-test-modal__result rounded-xl border p-3 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200'}`}>
                <div className="font-semibold">{result.ok ? 'نتیجه ارسال تست گروهی' : 'خطا در ارسال تست گروهی'}</div>
                <div className="mt-1">{result.data?.message || (result.ok ? 'ارسال تست گروهی انجام شد.' : humanizeSmsError(result.data?.message || result.data).message)}</div>
                {Array.isArray(result.data?.results) ? (
                  <div className="mt-2 space-y-2">
                    {result.data.results.map((r: any, i: number) => {
                      const humanError = r?.success ? null : humanizeSmsError(r?.message || r?.error || r);
                      return (
                        <div key={i} className="rounded-xl border border-current/15 bg-white/55 px-3 py-2 dark:bg-slate-950/20">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-bold">{r.label}</span>
                            <span className={`shrink-0 text-xs px-2 py-1 rounded-lg ${r.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                              {r.success ? 'موفق' : 'ناموفق'}
                            </span>
                          </div>
                          {humanError ? (
                            <div className="mt-2 text-xs leading-6">
                              <div className="font-black">{humanError.title}</div>
                              <div>{humanError.message}</div>
                              <div className="mt-1"><span className="font-black">راهکار: </span>{humanError.action}</div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="sms-bulk-test-modal__footer flex items-center justify-between gap-2">
              <Button type="button" onClick={() => setStep(1)} variant="secondary" leftIcon={<i className="fa-solid fa-arrow-right" />}>
                بازگشت
              </Button>
              <Button
                type="button"
                disabled={!recipient.trim() || selected.length === 0}
                onClick={submit}
                variant="primary"
                loading={isSending}
                loadingText="در حال ارسال..."
                leftIcon={!isSending ? <i className="fa-solid fa-paper-plane" /> : undefined}
              >
                ارسال تست‌ها
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SmsBulkCheckModal;
