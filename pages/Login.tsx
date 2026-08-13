import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthPageShell, { AuthStatusScreen } from '../components/auth/AuthPageShell';
import Notification from '../components/Notification';
import { Button, PasswordVisibilityButton, TextField } from '../components/ui';
import {
  authGoldControlWrapClasses,
  authGoldFieldShellClasses,
  authGoldInputClasses,
  authGoldInstallDividerClasses,
  authGoldLabelClasses,
  authGoldLeadingIconClasses,
  authGoldPasswordToggleClasses,
  authGoldPrimaryActionClasses,
  authGoldSecondaryActionClasses,
} from '../components/auth/authGoldControlTheme';
import { useAuth } from '../contexts/AuthContext';
import type { NotificationMessage } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { applyDocumentBranding, readStoredBranding } from '../utils/branding';
import { cn } from '../utils/cn';
import usePwaInstall from '../hooks/usePwaInstall';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '';

const LoginPage = () => {
  const location = useLocation();
  const setupUsername =
    typeof (location.state as { setupUsername?: unknown } | null)?.setupUsername === 'string'
      ? String((location.state as { setupUsername: string }).setupUsername)
      : '';
  const [username, setUsername] = useState(setupUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [setupCheckPending, setSetupCheckPending] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [storeName, setStoreName] = useState(readStoredBranding()?.storeName || 'فروشگاه کوروش');
  const { login, isLoading: authLoading } = useAuth();
  const { installed: pwaInstalled, installationChecked, platform } = usePwaInstall();
  const navigate = useNavigate();

  useEffect(() => {
    const snapshot = readStoredBranding();
    const name = snapshot?.storeName || 'فروشگاه کوروش';
    setStoreName(name);
    applyDocumentBranding(name);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkInitialSetup = async () => {
      try {
        const response = await apiFetch('/api/setup/status', { cache: 'no-store' });
        const payload = (await response.json()) as { setupRequired?: unknown };
        if (!cancelled && response.ok && payload.setupRequired === true) {
          navigate('/setup', { replace: true });
          return;
        }
      } catch (error) {
        console.warn('[login] initial setup status check failed:', error);
      }
      if (!cancelled) setSetupCheckPending(false);
    };
    void checkInitialSetup();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNotification(null);
    if (!username.trim() || !password) {
      setNotification({ type: 'error', text: 'نام کاربری و کلمه عبور الزامی است.' });
      return;
    }
    try {
      const result = await login({ username: username.trim(), password });
      if (result.success) {
        setNotification({ type: 'success', text: 'ورود با موفقیت انجام شد. در حال انتقال...' });
        window.setTimeout(() => navigate('/'), 900);
        return;
      }
      setNotification({ type: 'error', text: result.message || 'خطا در ورود. لطفاً دوباره تلاش کنید.' });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const normalizedMessage = errorMessage.toLowerCase();
      let message = 'خطا در ورود. لطفاً دوباره تلاش کنید.';
      if (normalizedMessage.includes('failed to fetch')) {
        message = 'ارتباط با سرور برقرار نشد. وضعیت سرویس را بررسی کنید.';
      } else if (normalizedMessage.includes('invalid credentials') || normalizedMessage.includes('نام کاربری یا کلمه عبور نامعتبر است')) {
        message = 'نام کاربری یا کلمه عبور نامعتبر است.';
      } else if (normalizedMessage.includes('راه‌اندازی اولیه')) {
        navigate('/setup', { replace: true });
        return;
      } else if (errorMessage) {
        message = errorMessage;
      }
      setNotification({ type: 'error', text: message });
    }
  };

  if (setupCheckPending) {
    return <AuthStatusScreen title="در حال بررسی وضعیت راه‌اندازی" message="چند لحظه صبر کنید..." />;
  }

  return (
    <>
      <Notification position="top-center" message={notification} onClose={() => setNotification(null)} />
      <AuthPageShell
        variant="liquid"
        storeName={storeName}
        title="ورود به داشبورد"
        description="برای ادامه، اطلاعات حساب کاربری خود را وارد کنید."
        eyebrow={<><i className="fa-solid fa-lock" aria-hidden="true" /> ورود امن</>}
        footer={<>© {new Date().getFullYear()} {storeName}. تمامی حقوق محفوظ است.</>}
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5 [@media(max-height:820px)]:space-y-4 [@media(max-height:700px)]:space-y-3"
          noValidate
          data-ui-pwa-platform={platform.id}
          data-ui-pwa-install-state={!installationChecked ? 'checking' : pwaInstalled ? 'installed' : 'not-installed'}
        >
          <TextField
            surface="glass"
            id="username"
            name="username"
            label="نام کاربری"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            icon={<i className="fa-solid fa-user" aria-hidden="true" />}
            wrapperClassName={authGoldFieldShellClasses}
            labelClassName={authGoldLabelClasses}
            iconClassName={authGoldLeadingIconClasses}
            controlWrapClassName={cn(
              authGoldControlWrapClasses,
              username && '!border-[#c9aa72]/35',
            )}
            className={cn('h-12 text-left font-bold sm:h-14 [@media(max-height:820px)]:!h-12 [@media(max-height:700px)]:!h-11', authGoldInputClasses)}
            placeholder="نام کاربری"
            dir="ltr"
          />

          <TextField
            surface="glass"
            id="password"
            name="password"
            label="کلمه عبور"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            icon={<i className="fa-solid fa-key" aria-hidden="true" />}
            trailingAction={(
              <PasswordVisibilityButton
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                className={authGoldPasswordToggleClasses}
              />
            )}
            wrapperClassName={authGoldFieldShellClasses}
            labelClassName={authGoldLabelClasses}
            iconClassName={authGoldLeadingIconClasses}
            controlWrapClassName={cn(
              authGoldControlWrapClasses,
              password && '!border-[#c9aa72]/35',
            )}
            trailingActionClassName="text-[#c5a773]"
            className={cn('h-12 text-left font-bold sm:h-14 [@media(max-height:820px)]:!h-12 [@media(max-height:700px)]:!h-11', authGoldInputClasses)}
            placeholder="کلمه عبور"
            dir="ltr"
          />

          <Button
            type="submit"
            variant="ghost"
            size="lg"
            className={cn('w-full', authGoldPrimaryActionClasses)}
            data-ui-login-primary-action="gold"
            loading={authLoading}
            loadingText="در حال ورود..."
            ripple={false}
            rightIcon={<i className="fa-solid fa-arrow-left-long" aria-hidden="true" />}
          >
            ورود به سیستم
          </Button>

          {installationChecked && !pwaInstalled ? (
            <>
              <div className={authGoldInstallDividerClasses} aria-hidden="true" />
              <a
                href="#/install"
                data-ui-pwa-install-entry={platform.id}
                className={authGoldSecondaryActionClasses}
              >
                <i className={platform.iconClass} aria-hidden="true" />
                {platform.installLabel}
              </a>
            </>
          ) : installationChecked && pwaInstalled ? (
            <a
              href="#/install"
              data-ui-connection-health-entry
              className={authGoldSecondaryActionClasses}
            >
              <i className="fa-solid fa-wifi" aria-hidden="true" />
              سلامت اتصال و QR موبایل
            </a>
          ) : null}
        </form>
      </AuthPageShell>
    </>
  );
};

export default LoginPage;
