import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const MATRIX_ROOT = path.resolve(process.cwd(), '.kourosh-runtime', 'dashboard-visual-matrix');
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 16 * 1024 * 1024;

export type DashboardVisualTextMetric = {
  text: string;
  contrast: number | null;
  opacity: number;
  clipped: boolean;
  inside: boolean;
  visible: boolean;
  minimumContrast: number;
};

export type DashboardVisualIconMetric = {
  className: string;
  contrast: number | null;
  opacity: number;
  width: number;
  height: number;
  hasGlyph: boolean;
  visible: boolean;
  bareSurface: boolean;
};

export type DashboardVisualResult = {
  palette: string;
  paletteLabel: string;
  theme: string;
  themeLabel: string;
  viewport: string;
  viewportLabel: string;
  passed: boolean;
  checks: Record<string, boolean>;
  metrics: {
    viewport: { width: number; height: number };
    documentOverflow: boolean;
    rootOverflow: boolean;
    keyHeaders: { risk: boolean; executive: boolean };
    titles: DashboardVisualTextMetric[];
    subtitles: DashboardVisualTextMetric[];
    metricLabels: DashboardVisualTextMetric[];
    metricMeta: DashboardVisualTextMetric[];
    icons: DashboardVisualIconMetric[];
  };
  screenshotUrl: string | null;
};


export type DashboardVisualReportStatus = {
  status: 'missing' | 'passed' | 'failed';
  hasReport: boolean;
  runId: string | null;
  generatedAt: string | null;
  passed: number;
  failed: number;
  total: number;
};

export type DashboardVisualReport = {
  runId: string;
  generatedAt: string;
  matrix: { palettes: number; themes: number; viewports: number; total: number };
  summary: { passed: number; failed: number; total: number };
  results: DashboardVisualResult[];
};

const safeSegment = (value: unknown): string | null => {
  const normalized = String(value ?? '').trim();
  return normalized && SAFE_SEGMENT.test(normalized) ? normalized : null;
};

const finiteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeBooleanRecord = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => SAFE_SEGMENT.test(key))
      .map(([key, item]) => [key, Boolean(item)]),
  );
};

const screenshotFileName = (value: unknown): string | null => {
  const normalized = String(value ?? '').replace(/\\/g, '/');
  const match = normalized.match(/^screenshots\/([A-Za-z0-9._-]+\.png)$/i);
  return match?.[1] && safeSegment(match[1]) ? match[1] : null;
};

const normalizeTextMetrics = (value: unknown): DashboardVisualTextMetric[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).map((item: any) => ({
    text: String(item?.text ?? '').slice(0, 500),
    contrast: nullableNumber(item?.contrast),
    opacity: finiteNumber(item?.opacity, 1),
    clipped: Boolean(item?.clipped),
    inside: Boolean(item?.inside),
    visible: Boolean(item?.visible),
    minimumContrast: finiteNumber(item?.minimumContrast, 4.5),
  }));
};

const normalizeIconMetrics = (value: unknown): DashboardVisualIconMetric[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((item: any) => ({
    className: String(item?.className ?? '').slice(0, 300),
    contrast: nullableNumber(item?.contrast),
    opacity: finiteNumber(item?.opacity, 1),
    width: finiteNumber(item?.width),
    height: finiteNumber(item?.height),
    hasGlyph: Boolean(item?.hasGlyph),
    visible: Boolean(item?.visible),
    bareSurface: Boolean(item?.bareSurface),
  }));
};

const normalizeReport = (runId: string, payload: unknown): DashboardVisualReport | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const raw = payload as Record<string, any>;
  const rawResults = Array.isArray(raw.results) ? raw.results : [];
  const results = rawResults.slice(0, 200).map((item: any): DashboardVisualResult => {
    const screenshot = screenshotFileName(item?.screenshot);
    return {
      palette: String(item?.palette ?? ''),
      paletteLabel: String(item?.paletteLabel ?? item?.palette ?? ''),
      theme: String(item?.theme ?? ''),
      themeLabel: String(item?.themeLabel ?? item?.theme ?? ''),
      viewport: String(item?.viewport ?? ''),
      viewportLabel: String(item?.viewportLabel ?? item?.viewport ?? ''),
      passed: Boolean(item?.passed),
      checks: safeBooleanRecord(item?.checks),
      metrics: {
        viewport: {
          width: finiteNumber(item?.metrics?.viewport?.width),
          height: finiteNumber(item?.metrics?.viewport?.height),
        },
        documentOverflow: Boolean(item?.metrics?.documentOverflow),
        rootOverflow: Boolean(item?.metrics?.rootOverflow),
        keyHeaders: {
          risk: Boolean(item?.metrics?.keyHeaders?.risk),
          executive: Boolean(item?.metrics?.keyHeaders?.executive),
        },
        titles: normalizeTextMetrics(item?.metrics?.titles),
        subtitles: normalizeTextMetrics(item?.metrics?.subtitles),
        metricLabels: normalizeTextMetrics(item?.metrics?.metricLabels),
        metricMeta: normalizeTextMetrics(item?.metrics?.metricMeta),
        icons: normalizeIconMetrics(item?.metrics?.icons),
      },
      screenshotUrl: screenshot
        ? `/api/settings/quality/dashboard-visual-report/${encodeURIComponent(runId)}/screenshots/${encodeURIComponent(screenshot)}`
        : null,
    };
  });

  const failed = results.filter((item) => !item.passed).length;
  const passed = results.length - failed;
  const matrix = raw.matrix && typeof raw.matrix === 'object' ? raw.matrix : {};
  return {
    runId,
    generatedAt: String(raw.generatedAt ?? ''),
    matrix: {
      palettes: finiteNumber(matrix.palettes),
      themes: finiteNumber(matrix.themes),
      viewports: finiteNumber(matrix.viewports),
      total: finiteNumber(matrix.total, results.length),
    },
    summary: { passed, failed, total: results.length },
    results,
  };
};

const readReportFile = async (runId: string): Promise<DashboardVisualReport | null> => {
  const reportPath = path.join(MATRIX_ROOT, runId, 'report.json');
  const stat = await fs.stat(reportPath);
  if (!stat.isFile() || stat.size > MAX_REPORT_BYTES) return null;
  const payload = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  return normalizeReport(runId, payload);
};

export const getLatestDashboardVisualReport = async (): Promise<DashboardVisualReport | null> => {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(MATRIX_ROOT, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }

  const candidates: Array<{ runId: string; modifiedAt: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runId = safeSegment(entry.name);
    if (!runId) continue;
    try {
      const stat = await fs.stat(path.join(MATRIX_ROOT, runId, 'report.json'));
      if (stat.isFile() && stat.size <= MAX_REPORT_BYTES) candidates.push({ runId, modifiedAt: stat.mtimeMs });
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  candidates.sort((a, b) => b.modifiedAt - a.modifiedAt);
  for (const candidate of candidates) {
    try {
      const report = await readReportFile(candidate.runId);
      if (report) return report;
    } catch {
      // Ignore partially written or malformed runs and continue to the previous valid report.
    }
  }
  return null;
};


export const getLatestDashboardVisualReportStatus = async (): Promise<DashboardVisualReportStatus> => {
  const report = await getLatestDashboardVisualReport();
  if (!report) {
    return {
      status: 'missing',
      hasReport: false,
      runId: null,
      generatedAt: null,
      passed: 0,
      failed: 0,
      total: 0,
    };
  }

  return {
    status: report.summary.failed > 0 ? 'failed' : 'passed',
    hasReport: true,
    runId: report.runId,
    generatedAt: report.generatedAt || null,
    passed: report.summary.passed,
    failed: report.summary.failed,
    total: report.summary.total,
  };
};

export const resolveDashboardVisualScreenshot = async (
  runIdInput: unknown,
  fileNameInput: unknown,
): Promise<string | null> => {
  const runId = safeSegment(runIdInput);
  const fileName = safeSegment(fileNameInput);
  if (!runId || !fileName || !fileName.toLowerCase().endsWith('.png')) return null;

  const runRoot = path.resolve(MATRIX_ROOT, runId);
  const screenshotRoot = path.resolve(runRoot, 'screenshots');
  const screenshotPath = path.resolve(screenshotRoot, fileName);
  if (!screenshotPath.startsWith(`${screenshotRoot}${path.sep}`)) return null;

  try {
    const stat = await fs.stat(screenshotPath);
    return stat.isFile() && stat.size <= MAX_SCREENSHOT_BYTES ? screenshotPath : null;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};
