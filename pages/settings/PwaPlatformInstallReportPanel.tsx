import React from 'react';
import { Button, SelectField } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';

type ReportStatusFilter = 'all' | 'failed' | 'passed';
type InstalledFilter = 'all' | 'installed' | 'not-installed';
type ScreenshotKind = 'login' | 'install';

type PageMetrics = {
  platform: string;
  installState: string;
  documentOverflow: boolean;
  bodyText: string;
  entryPresent?: boolean;
  entryPlatform?: string;
  entryText?: string;
  title?: string;
  primaryPresent?: boolean;
  primaryText?: string;
  statusBadge?: string;
};

type PwaPlatformInstallResult = {
  platform: string;
  platformLabel: string;
  family: string;
  installed: boolean;
  installedDetection: string;
  passed: boolean;
  checks: Record<string, boolean>;
  pageErrors: string[];
  error: string | null;
  login: PageMetrics | null;
  install: PageMetrics | null;
  screenshotUrls: { login: string | null; install: string | null };
};

type PwaPlatformInstallReport = {
  runId: string;
  generatedAt: string;
  matrix: {
    platforms: number;
    installedStates: number;
    routesPerScenario: number;
    total: number;
    totalScenarios: number;
    totalRouteChecks: number;
  };
  summary: { passed: number; failed: number; total: number };
  results: PwaPlatformInstallResult[];
};

type ReportResponse = { success: boolean; data: PwaPlatformInstallReport | null; message?: string };

const PLATFORM_ICONS: Record<string, string> = {
  windows: 'fa-brands fa-windows',
  macos: 'fa-brands fa-apple',
  android: 'fa-brands fa-android',
  ios: 'fa-solid fa-mobile-screen-button',
};

const CHECK_LABELS: Record<string, string> = {
  loginPlatformDetected: 'تشخیص پلتفرم در ورود',
  loginInstallState: 'وضعیت نصب در ورود',
  loginEntryVisibility: 'نمایش صحیح دکمه نصب در ورود',
  loginEntryPlatform: 'شناسه سیستم‌عامل در ورود',
  loginOperatingSystemLabel: 'عنوان سیستم‌عامل در ورود',
  desktopNeverUsesMobileLabel: 'عدم نمایش عنوان موبایل در دسکتاپ',
  loginNoHorizontalOverflow: 'نبود بیرون‌زدگی صفحه ورود',
  installPlatformDetected: 'تشخیص پلتفرم در صفحه نصب',
  installInstallState: 'وضعیت نصب در صفحه نصب',
  installPageTitle: 'عنوان صفحه نصب',
  installPrimaryVisibility: 'نمایش صحیح اقدام اصلی نصب',
  installPrimaryLabel: 'عنوان اقدام اصلی نصب',
  installedStatusVerified: 'صحت وضعیت نصب‌شده',
  installPageMentionsPlatform: 'نمایش نام پلتفرم',
  installNoHorizontalOverflow: 'نبود بیرون‌زدگی صفحه نصب',
  noBrowserPageErrors: 'نبود خطای Runtime مرورگر',
};

const platformIcon = (platform: string) => PLATFORM_ICONS[platform] ?? 'fa-solid fa-laptop';
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const PwaPlatformInstallReportPanel: React.FC = () => {
  const [report, setReport] = React.useState<PwaPlatformInstallReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<ReportStatusFilter>('failed');
  const [platformFilter, setPlatformFilter] = React.useState('all');
  const [installedFilter, setInstalledFilter] = React.useState<InstalledFilter>('all');
  const [imageLoadingKey, setImageLoadingKey] = React.useState('');
  const [imageErrors, setImageErrors] = React.useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = React.useState<Record<string, string>>({});
  const imageUrlsRef = React.useRef<Record<string, string>>({});
  const detailsRef = React.useRef<HTMLDetailsElement>(null);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/settings/quality/pwa-platform-install-report/latest', { cache: 'no-store' });
      const payload = await response.json() as ReportResponse;
      if (!response.ok || !payload.success) throw new Error(payload.message || 'دریافت گزارش نصب PWA ناموفق بود.');
      const nextReport = payload.data && !Array.isArray(payload.data) && Array.isArray(payload.data.results)
        ? payload.data
        : null;
      setReport(nextReport);
      setStatusFilter(nextReport?.summary.failed ? 'failed' : 'all');
      window.dispatchEvent(new CustomEvent('kourosh:pwa-platform-install-report-updated', {
        detail: { failed: nextReport?.summary.failed ?? 0, runId: nextReport?.runId ?? null },
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'گزارش نصب PWA قابل دریافت نیست.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  React.useEffect(() => () => {
    Object.values(imageUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  React.useEffect(() => {
    if (!report || window.location.hash !== '#pwa-platform-install-quality') return;
    if (detailsRef.current) detailsRef.current.open = true;
  }, [report]);

  const loadScreenshot = React.useCallback(async (result: PwaPlatformInstallResult, kind: ScreenshotKind) => {
    const key = `${result.platform}-${result.installed ? 'installed' : 'not-installed'}-${kind}`;
    const url = result.screenshotUrls[kind];
    if (!url || imageUrlsRef.current[key]) return;
    setImageLoadingKey(key);
    setImageErrors((current) => ({ ...current, [key]: '' }));
    try {
      const response = await apiFetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('تصویر این نتیجه قابل دریافت نیست.');
      const objectUrl = URL.createObjectURL(await response.blob());
      imageUrlsRef.current[key] = objectUrl;
      setImageUrls((current) => ({ ...current, [key]: objectUrl }));
    } catch (imageError) {
      setImageErrors((current) => ({
        ...current,
        [key]: imageError instanceof Error ? imageError.message : 'دریافت تصویر ناموفق بود.',
      }));
    } finally {
      setImageLoadingKey('');
    }
  }, []);

  const platforms = React.useMemo(() => unique(report?.results.map((item) => item.platform) ?? []), [report]);
  const filteredResults = React.useMemo(() => (report?.results ?? [])
    .filter((item) => statusFilter === 'all' || (statusFilter === 'passed' ? item.passed : !item.passed))
    .filter((item) => platformFilter === 'all' || item.platform === platformFilter)
    .filter((item) => installedFilter === 'all' || item.installed === (installedFilter === 'installed'))
    .sort((a, b) => Number(a.passed) - Number(b.passed)), [installedFilter, platformFilter, report, statusFilter]);

  const platformSummaries = React.useMemo(() => platforms.map((platform) => {
    const items = report?.results.filter((item) => item.platform === platform) ?? [];
    return {
      platform,
      label: items[0]?.platformLabel || platform,
      passed: items.filter((item) => item.passed).length,
      failed: items.filter((item) => !item.passed).length,
      total: items.length,
    };
  }), [platforms, report]);

  const generatedTimestamp = report?.generatedAt ? Date.parse(report.generatedAt) : Number.NaN;
  const generatedAt = Number.isFinite(generatedTimestamp)
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(generatedTimestamp))
    : '';

  return (
    <section id="pwa-platform-install-quality" className="style-button-report" data-ui-pwa-platform-install-report="true">
      <header className="style-button-report__header">
        <div>
          <strong><i className="fa-solid fa-display" aria-hidden="true" /> نتیجه آخرین ماتریس تشخیص سیستم‌عامل و نصب PWA</strong>
          <small>وضعیت واقعی صفحه ورود و صفحه نصب در Windows، macOS، Android و iOS برای حالت نصب‌شده و نصب‌نشده بررسی می‌شود.</small>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void loadReport()}
          loading={loading}
          loadingText="در حال بازخوانی PWA…"
          leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
        >
          بازخوانی نتیجه
        </Button>
      </header>

      {error ? (
        <div className="style-button-report__notice" data-tone="danger" role="alert">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {!loading && !error && !report ? (
        <div className="style-button-report__empty">
          <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
          <div>
            <strong>هنوز گزارش تشخیص پلتفرم و نصب PWA ساخته نشده است</strong>
            <span>در Terminal پروژه فرمان زیر را اجرا کن و سپس «بازخوانی نتیجه» را بزن.</span>
            <code dir="ltr">npm run test:pwa-platform-runtime-matrix</code>
          </div>
        </div>
      ) : null}

      {report ? (
        <>
          <div className="style-button-report__summary">
            <div data-tone={report.summary.failed ? 'danger' : 'success'}><small>وضعیت</small><strong>{report.summary.failed ? 'نیازمند بررسی' : 'کاملاً سالم'}</strong></div>
            <div><small>موفق</small><strong>{report.summary.passed.toLocaleString('fa-IR')}</strong></div>
            <div><small>خطا</small><strong>{report.summary.failed.toLocaleString('fa-IR')}</strong></div>
            <div><small>سناریوها</small><strong>{report.summary.total.toLocaleString('fa-IR')}</strong></div>
            <div><small>آخرین اجرا</small><strong>{generatedAt || 'نامشخص'}</strong></div>
          </div>

          <div className="style-button-report__summary" aria-label="خلاصه پلتفرم‌ها">
            {platformSummaries.map((item) => (
              <div key={item.platform} data-tone={item.failed ? 'danger' : 'success'}>
                <small><i className={platformIcon(item.platform)} aria-hidden="true" /> {item.label}</small>
                <strong>{item.failed ? `${item.failed.toLocaleString('fa-IR')} خطا` : `${item.passed.toLocaleString('fa-IR')} از ${item.total.toLocaleString('fa-IR')} سالم`}</strong>
              </div>
            ))}
          </div>

          <details ref={detailsRef} className="style-control-advanced" data-ui-style-report-details="true">
            <summary>
              <span><i className="fa-solid fa-list-check" aria-hidden="true" />جزئیات و تصاویر گزارش PWA</span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </summary>
            <div className="grid gap-3 px-3 pb-3">
              <div className="style-button-report__filters">
                <label><span>وضعیت</span><SelectField controlOnly unstyled showChevron={false} icon={false} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReportStatusFilter)} aria-label="فیلتر وضعیت گزارش PWA"><option value="failed">فقط خطاها</option><option value="passed">فقط موفق‌ها</option><option value="all">همه نتایج</option></SelectField></label>
                <label><span>سیستم‌عامل</span><SelectField controlOnly unstyled showChevron={false} icon={false} value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} aria-label="فیلتر سیستم‌عامل گزارش PWA"><option value="all">همه سیستم‌عامل‌ها</option>{platformSummaries.map((item) => <option key={item.platform} value={item.platform}>{item.label}</option>)}</SelectField></label>
                <label><span>وضعیت نصب</span><SelectField controlOnly unstyled showChevron={false} icon={false} value={installedFilter} onChange={(event) => setInstalledFilter(event.target.value as InstalledFilter)} aria-label="فیلتر وضعیت نصب گزارش PWA"><option value="all">نصب‌شده و نصب‌نشده</option><option value="installed">نصب‌شده</option><option value="not-installed">نصب‌نشده</option></SelectField></label>
              </div>

              <div className="style-button-report__result-count">
                {filteredResults.length.toLocaleString('fa-IR')} نتیجه مطابق فیلترها
              </div>

              {filteredResults.length ? (
                <div className="style-button-report__results">
                  {filteredResults.map((result) => {
                    const scenarioKey = `${result.platform}-${result.installed ? 'installed' : 'not-installed'}`;
                    const failedChecks = Object.entries(result.checks).filter(([, passed]) => !passed).map(([name]) => CHECK_LABELS[name] ?? name);
                    return (
                      <article key={scenarioKey} className="style-button-report__result" data-status={result.passed ? 'passed' : 'failed'}>
                        <div className="style-button-report__result-head">
                          <span className="style-button-report__status"><i className={result.passed ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} aria-hidden="true" />{result.passed ? 'موفق' : 'خطا'}</span>
                          <strong><i className={platformIcon(result.platform)} aria-hidden="true" /> {result.platformLabel} · {result.installed ? 'نصب‌شده' : 'نصب‌نشده'}</strong>
                        </div>
                        <div className="style-button-report__meta">
                          <span>تشخیص: <b dir="ltr">{result.installedDetection || 'نامشخص'}</b></span>
                          <span>ورود: {result.login?.installState || 'نامشخص'}</span>
                          <span>صفحه نصب: {result.install?.installState || 'نامشخص'}</span>
                          <span>{Object.keys(result.checks).length.toLocaleString('fa-IR')} کنترل</span>
                        </div>
                        {!result.passed ? (
                          <div className="style-button-report__failed-checks">
                            <span>موارد ناموفق:</span>
                            <strong>{failedChecks.length ? failedChecks.join('، ') : result.error || 'علت در گزارش فنی ثبت شده است.'}</strong>
                          </div>
                        ) : null}
                        {result.pageErrors.length ? <p className="style-button-report__image-error" role="alert">خطاهای مرورگر: {result.pageErrors.join(' | ')}</p> : null}
                        <div className="style-button-report__result-actions">
                          {(['login', 'install'] as const).map((kind) => {
                            const key = `${scenarioKey}-${kind}`;
                            const imageUrl = imageUrls[key];
                            const sourceUrl = result.screenshotUrls[kind];
                            return sourceUrl ? (
                              <Button
                                key={kind}
                                type="button"
                                size="xs"
                                variant="secondary"
                                loading={imageLoadingKey === key}
                                loadingText="در حال دریافت تصویر…"
                                onClick={() => void loadScreenshot(result, kind)}
                                leftIcon={<i className={kind === 'login' ? 'fa-solid fa-right-to-bracket' : 'fa-solid fa-download'} aria-hidden="true" />}
                              >
                                {imageUrl ? `تصویر ${kind === 'login' ? 'ورود' : 'نصب'} دریافت شد` : `نمایش تصویر ${kind === 'login' ? 'ورود' : 'نصب'}`}
                              </Button>
                            ) : null;
                          })}
                        </div>
                        {(['login', 'install'] as const).map((kind) => {
                          const key = `${scenarioKey}-${kind}`;
                          const imageUrl = imageUrls[key];
                          return (
                            <React.Fragment key={key}>
                              {imageErrors[key] ? <p className="style-button-report__image-error" role="alert">{imageErrors[key]}</p> : null}
                              {imageUrl ? (
                                <a className="style-button-report__screenshot" href={imageUrl} target="_blank" rel="noreferrer">
                                  <img src={imageUrl} alt={`Screenshot ${kind === 'login' ? 'ورود' : 'نصب'} ${result.platformLabel} ${result.installed ? 'نصب‌شده' : 'نصب‌نشده'}`} loading="lazy" />
                                  <span><i className="fa-solid fa-up-right-from-square" aria-hidden="true" /> بازکردن تصویر کامل</span>
                                </a>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="style-button-report__empty"><i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" /><div><strong>نتیجه‌ای مطابق فیلترها نیست</strong><span>فیلتر وضعیت، سیستم‌عامل یا نصب را تغییر بده.</span></div></div>
              )}
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
};

export default PwaPlatformInstallReportPanel;
