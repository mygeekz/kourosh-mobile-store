import React from 'react';
import { Button } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';

type BrowserRuntimeStatus = {
  available: boolean;
  browserName: string;
  executablePath: string | null;
  source: string | null;
  platform: string;
  nodeVersion: string;
};

type BrowserRuntimeResponse = {
  success: boolean;
  data?: BrowserRuntimeStatus;
  message?: string;
};

const sourceLabel = (source: string | null) => source === 'system-browser'
  ? 'مرورگر نصب‌شده سیستم'
  : source || 'نامشخص';

const QualityBrowserRuntimeStatus: React.FC = () => {
  const [status, setStatus] = React.useState<BrowserRuntimeStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadStatus = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/settings/quality/browser-runtime/status', { cache: 'no-store' });
      const payload = await response.json() as BrowserRuntimeResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || 'وضعیت مرورگر قابل دریافت نیست.');
      }
      setStatus(payload.data);
    } catch (runtimeError) {
      setStatus(null);
      setError(runtimeError instanceof Error ? runtimeError.message : 'بررسی مرورگر ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <div
      className="mt-3 rounded-[18px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-card-muted)] p-3"
      data-ui-quality-browser-runtime="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-sm text-[var(--ds-primary)]" aria-hidden="true">
            <i className="fa-solid fa-globe" />
          </span>
          <div className="min-w-0">
            <strong className="block text-[12px] font-black text-[var(--ds-text-primary)]">مرورگر اجرای ماتریس‌ها</strong>
            {status?.available ? (
              <>
                <span className="mt-1 block text-[11px] font-extrabold text-[var(--ds-text-secondary)]">
                  {status.browserName} · {sourceLabel(status.source)} · Node {status.nodeVersion.replace(/^v/, '')}
                </span>
                <code
                  dir="ltr"
                  title={status.executablePath || undefined}
                  className="mt-1.5 block max-w-full break-all text-left text-[10px] font-bold leading-5 text-[var(--ds-text-muted)]"
                >
                  {status.executablePath}
                </code>
              </>
            ) : !loading ? (
              <span className="mt-1 block text-[11px] font-bold leading-6 text-[var(--ds-danger)]">
                Chrome، Edge یا Chromium قابل اجرا پیدا نشد. متغیر KOUROSH_BROWSER_PATH را تنظیم کن.
              </span>
            ) : null}
            {error ? <span className="mt-1 block text-[11px] font-bold text-[var(--ds-danger)]">{error}</span> : null}
          </div>
        </div>
        <Button
          type="button"
          size="xs"
          variant="secondary"
          onClick={() => void loadStatus()}
          loading={loading}
          loadingText="در حال بررسی مرورگر…"
          leftIcon={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
        >
          بررسی مسیر
        </Button>
      </div>
    </div>
  );
};

export default QualityBrowserRuntimeStatus;
