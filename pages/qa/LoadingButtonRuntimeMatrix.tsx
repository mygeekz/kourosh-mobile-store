import React from 'react';
import { useSearchParams } from 'react-router-dom';

import AuthPageShell from '../../components/auth/AuthPageShell';
import { Button } from '@/components/ui';
import {
  BackupImmediateAction,
  InitialSetupSubmitAction,
  LoginSubmitAction,
  PhoneRegisterSubmitAction,
} from '../../components/actions/OperationalLoadingButtons';
import SettingsRestoreModal from '../settings/SettingsRestoreModal';
import { STANDARD_STYLE_PALETTE_KEYS, type StandardStylePalette } from '../../config/stylePalettes';
import { useStyle } from '../../hooks/useStyle';
import { DATABASE_RESTORE_STAGE_META, DATABASE_RESTORE_TOTAL_STEPS, type DatabaseRestoreProgressSnapshot } from '../../shared/databaseRestoreProgress';

type RuntimeScenario = 'backup' | 'restore' | 'login' | 'setup' | 'phone';
type RuntimeTheme = 'light' | 'dark';

const SCENARIOS: RuntimeScenario[] = ['backup', 'restore', 'login', 'setup', 'phone'];

const qaRestoreProgress: DatabaseRestoreProgressSnapshot = {
  operationId: 'restore-qa-runtime-0001',
  status: 'running',
  stage: 'safety-backup',
  step: DATABASE_RESTORE_STAGE_META['safety-backup'].step,
  total: DATABASE_RESTORE_TOTAL_STEPS,
  label: DATABASE_RESTORE_STAGE_META['safety-backup'].label,
  detail: DATABASE_RESTORE_STAGE_META['safety-backup'].detail,
  startedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:01.000Z',
  history: [
    { stage: 'validating', step: 1, label: DATABASE_RESTORE_STAGE_META.validating.label, detail: DATABASE_RESTORE_STAGE_META.validating.detail, at: '2026-01-01T00:00:00.500Z' },
    { stage: 'safety-backup', step: 2, label: DATABASE_RESTORE_STAGE_META['safety-backup'].label, detail: DATABASE_RESTORE_STAGE_META['safety-backup'].detail, at: '2026-01-01T00:00:01.000Z' },
  ],
};

const isScenario = (value: string | null): value is RuntimeScenario => Boolean(value && SCENARIOS.includes(value as RuntimeScenario));
const isPalette = (value: string | null): value is StandardStylePalette => Boolean(value && STANDARD_STYLE_PALETTE_KEYS.includes(value as StandardStylePalette));
const isTheme = (value: string | null): value is RuntimeTheme => value === 'light' || value === 'dark';

const RuntimeLoadingScenario: React.FC<{ scenario: RuntimeScenario }> = ({ scenario }) => {
  if (scenario === 'restore') {
    return (
      <SettingsRestoreModal
        isOpen
        dbFileName="kourosh_inventory_verified_backup.db"
        onClose={() => undefined}
        onRestore={() => undefined}
        isRestoringDb
        restoreProgress={qaRestoreProgress}
      />
    );
  }

  if (scenario === 'login') {
    return (
      <AuthPageShell
        variant="liquid"
        storeName="فروشگاه کوروش"
        title="ورود به داشبورد"
        description="بررسی دکمه واقعی ورود در وضعیت پردازش"
        eyebrow={<><i className="fa-solid fa-lock" aria-hidden="true" /> ورود امن</>}
      >
        <form className="space-y-5" data-qa-runtime-wrapper="login-form">
          <div className="h-14 rounded-[18px] border border-white/15 bg-white/[0.06]" />
          <div className="h-14 rounded-[18px] border border-white/15 bg-white/[0.06]" />
          <LoginSubmitAction loading />
        </form>
      </AuthPageShell>
    );
  }

  if (scenario === 'setup') {
    return (
      <AuthPageShell
        variant="liquid"
        storeName="فروشگاه کوروش"
        title="راه‌اندازی فروشگاه کوروش"
        description="بررسی دکمه واقعی ساخت مدیر اولیه"
        eyebrow={<><i className="fa-solid fa-user-shield" aria-hidden="true" /> مدیر اولیه</>}
      >
        <form className="mt-7 space-y-5" data-qa-runtime-wrapper="initial-setup-form">
          <div className="h-14 rounded-[18px] border border-white/15 bg-white/[0.06]" />
          <div className="h-14 rounded-[18px] border border-white/15 bg-white/[0.06]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <Button type="button" variant="secondary" size="lg" disabled>بازگشت</Button>
            <InitialSetupSubmitAction loading />
          </div>
        </form>
      </AuthPageShell>
    );
  }

  if (scenario === 'backup') {
    return (
      <main className="min-h-screen bg-[var(--ds-page-bg)] p-4 sm:p-8" data-qa-runtime-wrapper="settings-backup-hero">
        <div className="settings-data-panel settings-data-phase3 settings-data-redesign-v2 settings-panel-root mx-auto max-w-5xl" data-ui-settings-panel="data" data-ui-settings-data-redesign="v2">
          <section className="settings-data-v2-hero" data-ui-settings-data-hero="true">
            <div className="settings-data-v2-hero__main">
              <span className="settings-data-v2-hero__icon" aria-hidden="true"><i className="fa-solid fa-database" /></span>
              <div className="min-w-0">
                <div className="settings-data-v2-hero__eyebrow">مرکز نگهداری اطلاعات</div>
                <h3>مدیریت داده‌ها و نسخه‌های پشتیبان</h3>
                <p>ساخت snapshot سازگار و دانلود نسخه پشتیبان از همین بخش انجام می‌شود.</p>
              </div>
            </div>
            <div className="settings-data-v2-hero__actions">
              <Button variant="secondary" size="xs" disabled leftIcon={<i className="fa-solid fa-rotate" />}>تازه‌سازی</Button>
              <BackupImmediateAction loading />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--ds-page-bg)] p-4 sm:p-8" data-qa-runtime-wrapper="phone-register-submitbar">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-card)] p-4 sm:p-6">
        <div className="phone-register-submitbar flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">ثبت در موجودی فروش</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">اطلاعات دستگاه را ثبت و به موجودی فروش اضافه کنید.</div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PhoneRegisterSubmitAction loading disabled />
            <Button type="button" variant="secondary" size="md" autoIcon={false} className="phone-register-submitbar__reset w-full sm:w-auto" disabled>
              <span className="inline-flex items-center gap-2"><i className="fa-solid fa-rotate-left text-[13px]" />پاک‌سازی فرم</span>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

const LoadingButtonRuntimeMatrix: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { style, setMany } = useStyle();
  const scenario = isScenario(searchParams.get('scenario')) ? searchParams.get('scenario') as RuntimeScenario : 'backup';
  const palette = isPalette(searchParams.get('palette')) ? searchParams.get('palette') as StandardStylePalette : 'classic';
  const theme = isTheme(searchParams.get('theme')) ? searchParams.get('theme') as RuntimeTheme : 'light';

  React.useEffect(() => {
    setMany({ palette, theme, reducedMotion: false });
  }, [palette, setMany, theme]);

  const ready = style.palette === palette && style.theme === theme;

  return (
    <div
      data-qa-loading-scenario={scenario}
      data-qa-palette={palette}
      data-qa-theme={theme}
      data-qa-ready={ready ? 'true' : 'false'}
    >
      <RuntimeLoadingScenario scenario={scenario} />
    </div>
  );
};

export default LoadingButtonRuntimeMatrix;
