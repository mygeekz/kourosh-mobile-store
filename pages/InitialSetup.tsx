import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AuthPageShell, { AuthInsetPanel, AuthStatusScreen } from '../components/auth/AuthPageShell';
import Notification from '../components/Notification';
import { Button, PasswordVisibilityButton, TextField } from '@/components/ui';
import {
  authGoldControlWrapClasses,
  authGoldFieldShellClasses,
  authGoldInputClasses,
  authGoldLabelClasses,
  authGoldLeadingIconClasses,
  authGoldPanelClasses,
  authGoldPasswordToggleClasses,
  authGoldPrimaryActionClasses,
  authGoldSecondaryButtonClasses,
} from '../components/auth/authGoldControlTheme';
import { InitialSetupSubmitAction } from '../components/actions/OperationalLoadingButtons';
import type { NotificationMessage } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { cn } from '../utils/cn';

type SetupStatus = {
  setupRequired: boolean;
  canInitialize: boolean;
  passwordPolicy: {
    minLength: number;
    maxBytes: number;
    requiresLetter: boolean;
    requiresNumber: boolean;
  };
};

type SetupResponse = {
  success?: boolean;
  code?: string;
  message?: string;
};

const defaultPolicy = {
  minLength: 12,
  maxBytes: 72,
  requiresLetter: true,
  requiresNumber: true,
};

const parseStatus = (value: unknown): SetupStatus | null => {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.setupRequired !== 'boolean' || typeof payload.canInitialize !== 'boolean') return null;
  const policy = payload.passwordPolicy as Partial<SetupStatus['passwordPolicy']> | undefined;
  return {
    setupRequired: payload.setupRequired,
    canInitialize: payload.canInitialize,
    passwordPolicy: {
      minLength: typeof policy?.minLength === 'number' ? policy.minLength : defaultPolicy.minLength,
      maxBytes: typeof policy?.maxBytes === 'number' ? policy.maxBytes : defaultPolicy.maxBytes,
      requiresLetter: policy?.requiresLetter !== false,
      requiresNumber: policy?.requiresNumber !== false,
    },
  };
};

const passwordByteLength = (value: string): number => new TextEncoder().encode(value).length;
const usernamePattern = /^[\p{L}\p{N}._-]+$/u;

const InitialSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusError('');
    try {
      const response = await apiFetch('/api/setup/status', { cache: 'no-store' });
      const parsed = parseStatus(await response.json());
      if (!response.ok || !parsed) throw new Error('پاسخ وضعیت راه‌اندازی معتبر نیست.');
      if (!parsed.setupRequired) {
        navigate('/login', { replace: true });
        return;
      }
      setStatus(parsed);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'ارتباط با سرور برقرار نشد.');
    }
  }, [navigate]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const policy = status?.passwordPolicy || defaultPolicy;
  const normalizedUsername = username.trim();
  const usernameValid =
    Array.from(normalizedUsername).length >= 3 &&
    Array.from(normalizedUsername).length <= 64 &&
    usernamePattern.test(normalizedUsername);
  const passwordChecks = useMemo(
    () => ({
      length: Array.from(password).length >= policy.minLength,
      bytes: passwordByteLength(password) <= policy.maxBytes,
      letter: /\p{L}/u.test(password),
      number: /\p{N}/u.test(password),
      differs:
        Boolean(normalizedUsername) &&
        !password.toLocaleLowerCase('en-US').includes(normalizedUsername.toLocaleLowerCase('en-US')),
      matches: Boolean(password) && password === confirmPassword,
    }),
    [confirmPassword, normalizedUsername, password, policy.maxBytes, policy.minLength],
  );
  const formValid = usernameValid && Object.values(passwordChecks).every(Boolean);

  const submitSetup = async (event: FormEvent) => {
    event.preventDefault();
    if (!formValid || submitting) return;
    setSubmitting(true);
    setNotification(null);
    try {
      const response = await apiFetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedUsername, password, confirmPassword }),
      });
      const payload = (await response.json()) as SetupResponse;
      if (!response.ok || payload.success !== true) {
        if (payload.code === 'SETUP_ALREADY_COMPLETED') {
          navigate('/login', { replace: true });
          return;
        }
        throw new Error(payload.message || 'ساخت حساب مدیر انجام نشد.');
      }
      setPassword('');
      setConfirmPassword('');
      setStep(2);
    } catch (error) {
      setNotification({
        type: 'error',
        text: error instanceof Error ? error.message : 'ساخت حساب مدیر انجام نشد.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () =>
    navigate('/login', { replace: true, state: { setupUsername: normalizedUsername } });

  if (!status) {
    return statusError ? (
      <AuthStatusScreen
        title="بررسی راه‌اندازی انجام نشد"
        message={statusError}
        icon="fa-triangle-exclamation"
        tone="warning"
        action={<Button type="button" onClick={() => void loadStatus()} size="lg" className={cn('w-full', authGoldPrimaryActionClasses)}>تلاش دوباره</Button>}
      />
    ) : (
      <AuthStatusScreen title="در حال آماده‌سازی ویزارد" message="وضعیت اولین اجرا در حال بررسی است..." />
    );
  }

  if (!status.canInitialize) {
    return (
      <AuthStatusScreen
        title="راه‌اندازی فقط روی دستگاه میزبان"
        message="برای جلوگیری از تصاحب حساب مدیر در شبکه، این صفحه را روی همان دستگاهی باز کنید که برنامه روی آن اجرا شده است."
        icon="fa-shield-halved"
        tone="warning"
      />
    );
  }

  const checkRows = [
    ['length', `حداقل ${policy.minLength} کاراکتر`],
    ['letter', 'شامل حداقل یک حرف'],
    ['number', 'شامل حداقل یک عدد'],
    ['bytes', `حداکثر ${policy.maxBytes} بایت`],
    ['differs', 'نام کاربری داخل رمز نباشد'],
    ['matches', 'تکرار رمز یکسان باشد'],
  ] as const;

  return (
    <>
      <Notification position="top-center" message={notification} onClose={() => setNotification(null)} />
      <AuthPageShell
        variant="liquid"
        panelSize="lg"
        liquidLayout="compact"
        liquidAppearance="setup"
        title="راه‌اندازی فروشگاه کوروش"
        description="در اولین اجرا، حساب مدیر اصلی را بدون استفاده از اطلاعات پیش‌فرض ایجاد کنید."
        eyebrow={<><i className="fa-solid fa-shield-halved" aria-hidden="true" /> اولین اجرای امن</>}
        footer="این مرحله فقط یک‌بار و روی دستگاه میزبان قابل انجام است."
      >
        <div
          data-ui-initial-setup-scroll="true"
          className="min-h-0 overflow-visible px-0.5 pb-1"
        >
          <div className="grid grid-cols-3 gap-2" aria-label="مراحل راه‌اندازی">
            {['شروع', 'حساب مدیر', 'پایان'].map((label, index) => (
              <div key={label} className={`rounded-2xl border px-1.5 py-2.5 text-center text-[11px] font-black sm:px-2 sm:py-3 sm:text-xs ${index <= step ? 'border-[#c7a86f]/28 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(169,138,100,0.05))] text-[#f0dfbb] shadow-[0_14px_34px_-22px_rgba(0,0,0,0.9)]' : 'border-[#c7a86f]/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(169,138,100,0.015))] text-[#a98a64]'}`}>
                <span className="ml-1 opacity-70">{index + 1}</span>{label}
              </div>
            ))}
          </div>

          {step === 0 && (
            <section className="mt-7">
              <AuthInsetPanel className={cn('p-4 sm:p-5', authGoldPanelClasses)}>
                <h2 className="text-lg font-black text-[#ddc08a]">حساب پیش‌فرض وجود ندارد</h2>
                <p className="mt-3 text-sm font-medium leading-8 text-[#c7b18b]/80">
                  برای محافظت از اطلاعات فروشگاه، مدیر اصلی را خودتان می‌سازید. این مرحله فقط یک‌بار و روی دیتابیس خالی قابل اجراست.
                </p>
                <ul className="mt-4 space-y-3 text-xs font-bold text-[#d8bd8b]">
                  <li className="flex items-center gap-3"><i className="fa-solid fa-check text-[#ddc08a]" />بدون نام کاربری یا رمز عبور از پیش تعیین‌شده</li>
                  <li className="flex items-center gap-3"><i className="fa-solid fa-check text-[#ddc08a]" />ساخت مدیر اصلی در یک تراکنش امن</li>
                  <li className="flex items-center gap-3"><i className="fa-solid fa-check text-[#ddc08a]" />غیرفعال‌شدن دائمی ویزارد پس از ثبت</li>
                </ul>
              </AuthInsetPanel>
              <Button type="button" variant="ghost" onClick={() => setStep(1)} size="lg" className={cn('mt-6 w-full', authGoldPrimaryActionClasses)}>
                شروع راه‌اندازی <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true" />
              </Button>
            </section>
          )}

          {step === 1 && (
            <form onSubmit={submitSetup} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-4">
              <TextField
                surface="glass"
                id="setup-username"
                label="نام کاربری مدیر"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                dir="ltr"
                icon={<i className="fa-solid fa-user" aria-hidden="true" />}
                wrapperClassName={authGoldFieldShellClasses}
                labelClassName={authGoldLabelClasses}
                iconClassName={authGoldLeadingIconClasses}
                controlWrapClassName={authGoldControlWrapClasses}
                className={cn('h-12 text-left font-bold sm:h-14', authGoldInputClasses)}
                placeholder="store-owner"
                error={username && !usernameValid ? '۳ تا ۶۴ کاراکتر؛ حروف، عدد، نقطه، خط تیره یا زیرخط.' : undefined}
              />
              <TextField
                surface="glass"
                id="setup-password"
                label="کلمه عبور جدید"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                dir="ltr"
                icon={<i className="fa-solid fa-key" aria-hidden="true" />}
                trailingAction={(
                  <PasswordVisibilityButton
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    showLabel="نمایش رمز"
                    hideLabel="پنهان‌کردن رمز"
                    className={authGoldPasswordToggleClasses}
                  />
                )}
                wrapperClassName={authGoldFieldShellClasses}
                labelClassName={authGoldLabelClasses}
                iconClassName={authGoldLeadingIconClasses}
                trailingActionClassName="text-[#c5a773]"
                controlWrapClassName={authGoldControlWrapClasses}
                className={cn('h-12 text-left font-bold sm:h-14', authGoldInputClasses)}
              />
              <TextField
                surface="glass"
                id="setup-confirm-password"
                label="تکرار کلمه عبور"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                dir="ltr"
                icon={<i className="fa-solid fa-key" aria-hidden="true" />}
                trailingAction={(
                  <PasswordVisibilityButton
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    showLabel="نمایش رمزها"
                    hideLabel="پنهان‌کردن رمزها"
                    className={authGoldPasswordToggleClasses}
                  />
                )}
                wrapperClassName={authGoldFieldShellClasses}
                labelClassName={authGoldLabelClasses}
                iconClassName={authGoldLeadingIconClasses}
                trailingActionClassName="text-[#c5a773]"
                controlWrapClassName={authGoldControlWrapClasses}
                className={cn('h-12 text-left font-bold sm:h-14', authGoldInputClasses)}
              />
              <AuthInsetPanel
                className={cn('rounded-[22px] p-3', authGoldPanelClasses)}
                contentClassName="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2"
              >
                {checkRows.map(([key, label]) => (
                  <div key={key} className={`flex items-center gap-2 text-[11px] font-bold ${passwordChecks[key] ? 'text-[#e3cfab]' : 'text-[#9f8459]'}`}>
                    <i className={`fa-solid ${passwordChecks[key] ? 'fa-circle-check' : 'fa-circle'} text-[10px]`} aria-hidden="true" />{label}
                  </div>
                ))}
              </AuthInsetPanel>
              <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-[auto_1fr]">
                <Button type="button" variant="secondary" size="lg" onClick={() => setStep(0)} disabled={submitting} className={authGoldSecondaryButtonClasses}>بازگشت</Button>
                <InitialSetupSubmitAction loading={submitting} disabled={!formValid} className={cn('w-full', authGoldPrimaryActionClasses)} />
              </div>
            </form>
          )}

          {step === 2 && (
            <section className="mt-8 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#d2b078]/30 bg-[#d2b078]/10 text-3xl text-[#e5c995] shadow-[0_20px_50px_-30px_rgba(196,164,107,0.55)] backdrop-blur-xl">
                <i className="fa-solid fa-check" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-[#ddc08a]">راه‌اندازی کامل شد</h2>
              <p className="mt-3 text-sm font-medium leading-8 text-[#c7b18b]/80">حساب مدیر «{normalizedUsername}» ساخته شد. اکنون با همین اطلاعات وارد شوید.</p>
              <Button type="button" variant="ghost" onClick={goToLogin} size="lg" className={cn('mt-7 w-full', authGoldPrimaryActionClasses)}>
                رفتن به صفحه ورود <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true" />
              </Button>
            </section>
          )}
        </div>
      </AuthPageShell>
    </>
  );
};

export default InitialSetupPage;
