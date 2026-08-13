import React from 'react';
import { Button, SelectField } from '@/components/ui';
import { STANDARD_STYLE_PALETTES } from '../../config/stylePalettes';
import { apiFetch } from '../../utils/apiFetch';

type ReportStatusFilter = 'all' | 'failed' | 'passed';

type VisualReportResult = {
  palette: string;
  theme: string;
  viewport: string;
  scenario: string;
  scenarioLabel: string;
  passed: boolean;
  checks: Record<string, boolean>;
  metrics: {
    mainText: string;
    hintText: string;
    button: { width: number; height: number } | null;
    trackWidth: number;
    trackHeight: number;
    documentOverflow: boolean;
  };
  contrast: number | null;
  screenshotUrl: string | null;
};

type VisualReport = {
  runId: string;
  generatedAt: string;
  matrix: { palettes: number; themes: number; viewports: number; scenarios: number; total: number };
  summary: { passed: number; failed: number; total: number };
  results: VisualReportResult[];
};

type ReportResponse = { success: boolean; data: VisualReport | null; message?: string };

const CHECK_LABELS: Record<string, string> = {
  canonicalContract: 'قرارداد مرجع',
  completeDom: 'ساختار داخلی',
  minimumHeight: 'ارتفاع استاندارد',
  viewportContained: 'قرارگیری داخل صفحه',
  noHorizontalOverflow: 'نبود اسکرول افقی',
  textInside: 'قرارگیری متن داخل دکمه',
  progressInside: 'قرارگیری نوار پیشرفت',
  visibleState: 'وضوح حالت Loading',
  readableContrast: 'کنتراست خوانا',
};

const THEME_LABELS: Record<string, string> = { light: 'روشن', dark: 'تاریک' };
const VIEWPORT_LABELS: Record<string, string> = { mobile: 'موبایل', tablet: 'تبلت', desktop: 'دسکتاپ' };
const paletteLabel = (palette: string) => STANDARD_STYLE_PALETTES[palette as keyof typeof STANDARD_STYLE_PALETTES]?.label ?? palette;
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const LoadingButtonVisualReportPanel: React.FC = () => {
  const [report, setReport] = React.useState<VisualReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<ReportStatusFilter>('failed');
  const [paletteFilter, setPaletteFilter] = React.useState('all');
  const [viewportFilter, setViewportFilter] = React.useState('all');
  const [scenarioFilter, setScenarioFilter] = React.useState('all');
  const [imageLoadingKey, setImageLoadingKey] = React.useState('');
  const [imageErrors, setImageErrors] = React.useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = React.useState<Record<string, string>>({});
  const imageUrlsRef = React.useRef<Record<string, string>>({});
  const detailsRef = React.useRef<HTMLDetailsElement>(null);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/settings/quality/loading-button-report/latest', { cache: 'no-store' });
      const payload = await response.json() as ReportResponse;
      if (!response.ok || !payload.success) throw new Error(payload.message || 'دریافت گزارش کنترل کیفیت ناموفق بود.');
      setReport(payload.data);
      setStatusFilter(payload.data?.summary.failed ? 'failed' : 'all');
      window.dispatchEvent(new CustomEvent('kourosh:loading-button-report-updated', {
        detail: payload.data?.summary ?? null,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'گزارش کنترل کیفیت قابل دریافت نیست.');
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
    if (!report || window.location.hash !== '#loading-button-quality') return;
    if (detailsRef.current) detailsRef.current.open = true;
  }, [report]);

  const loadScreenshot = React.useCallback(async (result: VisualReportResult) => {
    const key = `${result.scenario}-${result.palette}-${result.theme}-${result.viewport}`;
    if (!result.screenshotUrl || imageUrlsRef.current[key]) return;
    setImageLoadingKey(key);
    setImageErrors((current) => ({ ...current, [key]: '' }));
    try {
      const response = await apiFetch(result.screenshotUrl, { cache: 'no-store' });
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

  const palettes = React.useMemo(() => unique(report?.results.map((item) => item.palette) ?? []), [report]);
  const viewports = React.useMemo(() => unique(report?.results.map((item) => item.viewport) ?? []), [report]);
  const scenarios = React.useMemo(() => {
    const map = new Map<string, string>();
    report?.results.forEach((item) => map.set(item.scenario, item.scenarioLabel));
    return Array.from(map.entries());
  }, [report]);

  const filteredResults = React.useMemo(() => (report?.results ?? [])
    .filter((item) => statusFilter === 'all' || (statusFilter === 'passed' ? item.passed : !item.passed))
    .filter((item) => paletteFilter === 'all' || item.palette === paletteFilter)
    .filter((item) => viewportFilter === 'all' || item.viewport === viewportFilter)
    .filter((item) => scenarioFilter === 'all' || item.scenario === scenarioFilter)
    .sort((a, b) => Number(a.passed) - Number(b.passed)), [paletteFilter, report, scenarioFilter, statusFilter, viewportFilter]);

  const generatedTimestamp = report?.generatedAt ? Date.parse(report.generatedAt) : Number.NaN;
  const generatedAt = Number.isFinite(generatedTimestamp)
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(generatedTimestamp))
    : '';

  return (
    <section id="loading-button-quality" className="style-button-report" data-ui-loading-button-report="true">
      <header className="style-button-report__header">
        <div>
          <strong><i className="fa-solid fa-chart-simple" aria-hidden="true" /> نتیجه آخرین ماتریس واقعی</strong>
          <small>داده‌ها مستقیماً از آخرین اجرای Wrapperهای واقعی Login، Backup، Restore، Setup و ثبت گوشی خوانده می‌شوند.</small>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void loadReport()}
          loading={loading}
          loadingText="در حال بازخوانی نتیجه…"
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
          <i className="fa-solid fa-camera-retro" aria-hidden="true" />
          <div>
            <strong>هنوز گزارش واقعی ساخته نشده است</strong>
            <span>در Terminal پروژه فرمان زیر را اجرا کن و سپس «بازخوانی نتیجه» را بزن.</span>
            <code dir="ltr">npm run test:loading-button-runtime-visual</code>
          </div>
        </div>
      ) : null}

      {report ? (
        <>
          <div className="style-button-report__summary">
            <div data-tone={report.summary.failed ? 'danger' : 'success'}><small>وضعیت</small><strong>{report.summary.failed ? 'نیازمند بررسی' : 'کاملاً سالم'}</strong></div>
            <div><small>موفق</small><strong>{report.summary.passed.toLocaleString('fa-IR')}</strong></div>
            <div><small>خطا</small><strong>{report.summary.failed.toLocaleString('fa-IR')}</strong></div>
            <div><small>کل حالت‌ها</small><strong>{report.summary.total.toLocaleString('fa-IR')}</strong></div>
            <div><small>آخرین اجرا</small><strong>{generatedAt || 'نامشخص'}</strong></div>
          </div>

          <details ref={detailsRef} className="style-control-advanced" data-ui-style-report-details="true">
            <summary>
              <span><i className="fa-solid fa-list-check" aria-hidden="true" />جزئیات و تصاویر گزارش Loading</span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </summary>
            <div className="grid gap-3 px-3 pb-3">
              <div className="style-button-report__filters">
                <label><span>وضعیت</span><SelectField controlOnly unstyled showChevron={false} icon={false} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReportStatusFilter)} aria-label="فیلتر وضعیت گزارش"><option value="failed">فقط خطاها</option><option value="passed">فقط موفق‌ها</option><option value="all">همه نتایج</option></SelectField></label>
                <label><span>پالت</span><SelectField controlOnly unstyled showChevron={false} icon={false} value={paletteFilter} onChange={(event) => setPaletteFilter(event.target.value)} aria-label="فیلتر پالت گزارش"><option value="all">همه پالت‌ها</option>{palettes.map((item) => <option key={item} value={item}>{paletteLabel(item)}</option>)}</SelectField></label>
                <label><span>اندازه</span><SelectField controlOnly unstyled showChevron={false} icon={false} value={viewportFilter} onChange={(event) => setViewportFilter(event.target.value)} aria-label="فیلتر اندازه گزارش"><option value="all">همه اندازه‌ها</option>{viewports.map((item) => <option key={item} value={item}>{VIEWPORT_LABELS[item] ?? item}</option>)}</SelectField></label>
                <label><span>سناریو</span><SelectField controlOnly unstyled showChevron={false} icon={false} value={scenarioFilter} onChange={(event) => setScenarioFilter(event.target.value)} aria-label="فیلتر سناریوی گزارش"><option value="all">همه سناریوها</option>{scenarios.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectField></label>
              </div>

              <div className="style-button-report__result-count">
                {filteredResults.length.toLocaleString('fa-IR')} نتیجه مطابق فیلترها
              </div>

              {filteredResults.length ? (
                <div className="style-button-report__results">
                  {filteredResults.map((result) => {
                    const key = `${result.scenario}-${result.palette}-${result.theme}-${result.viewport}`;
                    const failedChecks = Object.entries(result.checks).filter(([, passed]) => !passed).map(([name]) => CHECK_LABELS[name] ?? name);
                    const imageUrl = imageUrls[key];
                    return (
                      <article key={key} className="style-button-report__result" data-status={result.passed ? 'passed' : 'failed'}>
                        <div className="style-button-report__result-head">
                          <span className="style-button-report__status"><i className={result.passed ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} aria-hidden="true" />{result.passed ? 'موفق' : 'خطا'}</span>
                          <strong>{result.scenarioLabel}</strong>
                        </div>
                        <div className="style-button-report__meta">
                          <span>{paletteLabel(result.palette)}</span>
                          <span>{THEME_LABELS[result.theme] ?? result.theme}</span>
                          <span>{VIEWPORT_LABELS[result.viewport] ?? result.viewport}</span>
                          {result.metrics.button ? <span dir="ltr">{Math.round(result.metrics.button.width)}×{Math.round(result.metrics.button.height)} px</span> : null}
                        </div>
                        {!result.passed ? (
                          <div className="style-button-report__failed-checks">
                            <span>موارد ناموفق:</span>
                            <strong>{failedChecks.length ? failedChecks.join('، ') : 'علت در گزارش فنی ثبت شده است.'}</strong>
                          </div>
                        ) : null}
                        <div className="style-button-report__result-actions">
                          {result.screenshotUrl ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="secondary"
                              loading={imageLoadingKey === key}
                              loadingText="در حال دریافت تصویر…"
                              onClick={() => void loadScreenshot(result)}
                              leftIcon={<i className="fa-solid fa-image" aria-hidden="true" />}
                            >
                              {imageUrl ? 'تصویر دریافت شد' : 'نمایش Screenshot'}
                            </Button>
                          ) : <span>Screenshot ذخیره نشده است.</span>}
                        </div>
                        {imageErrors[key] ? <p className="style-button-report__image-error" role="alert">{imageErrors[key]}</p> : null}
                        {imageUrl ? (
                          <a className="style-button-report__screenshot" href={imageUrl} target="_blank" rel="noreferrer">
                            <img src={imageUrl} alt={`Screenshot ${result.scenarioLabel}`} loading="lazy" />
                            <span><i className="fa-solid fa-up-right-from-square" aria-hidden="true" /> بازکردن تصویر کامل</span>
                          </a>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="style-button-report__notice" data-tone="success"><i className="fa-solid fa-circle-check" aria-hidden="true" /><span>در این فیلتر هیچ مورد ناموفقی وجود ندارد.</span></div>
              )}
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
};

export default LoadingButtonVisualReportPanel;
