import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const MATRIX_ROOT = path.resolve(process.cwd(), '.kourosh-runtime', 'loading-button-matrix');
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

export type LoadingButtonVisualResult = {
  palette: string;
  theme: string;
  viewport: string;
  scenario: string;
  scenarioLabel: string;
  passed: boolean;
  checks: Record<string, boolean>;
  metrics: {
    contract: string;
    layout: string;
    hostMode: string;
    mainText: string;
    hintText: string;
    button: { width: number; height: number } | null;
    trackWidth: number;
    trackHeight: number;
    documentOverflow: boolean;
    internalSignature: string;
  };
  contrast: number | null;
  screenshotUrl: string | null;
};

export type LoadingButtonVisualReport = {
  runId: string;
  generatedAt: string;
  matrix: {
    palettes: number;
    themes: number;
    viewports: number;
    scenarios: number;
    total: number;
  };
  summary: { passed: number; failed: number; total: number };
  results: LoadingButtonVisualResult[];
};

export type LoadingButtonVisualReportStatus = {
  status: 'missing' | 'passed' | 'failed';
  hasReport: boolean;
  runId: string | null;
  generatedAt: string | null;
  passed: number;
  failed: number;
  total: number;
};

const safeSegment = (value: unknown): string | null => {
  const normalized = String(value ?? '').trim();
  return normalized && SAFE_SEGMENT.test(normalized) ? normalized : null;
};

const finiteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const normalizeReport = (runId: string, payload: unknown): LoadingButtonVisualReport | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const raw = payload as Record<string, any>;
  const rawResults = Array.isArray(raw.results) ? raw.results : [];
  const results = rawResults.map((item: any): LoadingButtonVisualResult => {
    const screenshot = screenshotFileName(item?.screenshot);
    const button = item?.metrics?.button && typeof item.metrics.button === 'object'
      ? {
          width: finiteNumber(item.metrics.button.width),
          height: finiteNumber(item.metrics.button.height),
        }
      : null;
    return {
      palette: String(item?.palette ?? ''),
      theme: String(item?.theme ?? ''),
      viewport: String(item?.viewport ?? ''),
      scenario: String(item?.scenario ?? ''),
      scenarioLabel: String(item?.scenarioLabel ?? item?.scenario ?? ''),
      passed: Boolean(item?.passed),
      checks: safeBooleanRecord(item?.checks),
      metrics: {
        contract: String(item?.metrics?.contract ?? ''),
        layout: String(item?.metrics?.layout ?? ''),
        hostMode: String(item?.metrics?.hostMode ?? ''),
        mainText: String(item?.metrics?.mainText ?? ''),
        hintText: String(item?.metrics?.hintText ?? ''),
        button,
        trackWidth: finiteNumber(item?.metrics?.trackWidth),
        trackHeight: finiteNumber(item?.metrics?.trackHeight),
        documentOverflow: Boolean(item?.metrics?.documentOverflow),
        internalSignature: String(item?.metrics?.internalSignature ?? ''),
      },
      contrast: Number.isFinite(Number(item?.contrast)) ? Number(item.contrast) : null,
      screenshotUrl: screenshot
        ? `/api/settings/quality/loading-button-report/${encodeURIComponent(runId)}/screenshots/${encodeURIComponent(screenshot)}`
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
      scenarios: finiteNumber(matrix.scenarios),
      total: finiteNumber(matrix.total, results.length),
    },
    summary: { passed, failed, total: results.length },
    results,
  };
};

const readReportFile = async (runId: string): Promise<LoadingButtonVisualReport | null> => {
  const reportPath = path.join(MATRIX_ROOT, runId, 'report.json');
  const stat = await fs.stat(reportPath);
  if (!stat.isFile() || stat.size > MAX_REPORT_BYTES) return null;
  const payload = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  return normalizeReport(runId, payload);
};

export const getLatestLoadingButtonVisualReport = async (): Promise<LoadingButtonVisualReport | null> => {
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
      // Skip a partially written or malformed run and continue to the previous valid report.
    }
  }
  return null;
};

export const getLatestLoadingButtonVisualReportStatus = async (): Promise<LoadingButtonVisualReportStatus> => {
  const report = await getLatestLoadingButtonVisualReport();
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

export const resolveLoadingButtonVisualScreenshot = async (
  runIdInput: unknown,
  fileNameInput: unknown,
): Promise<string | null> => {
  const runId = safeSegment(runIdInput);
  const fileName = safeSegment(fileNameInput);
  if (!runId || !fileName || !fileName.toLowerCase().endsWith('.png')) return null;

  const runRoot = path.resolve(MATRIX_ROOT, runId);
  const screenshotPath = path.resolve(runRoot, 'screenshots', fileName);
  const allowedRoot = `${path.resolve(runRoot, 'screenshots')}${path.sep}`;
  if (!screenshotPath.startsWith(allowedRoot)) return null;

  try {
    const stat = await fs.stat(screenshotPath);
    return stat.isFile() && stat.size <= 12 * 1024 * 1024 ? screenshotPath : null;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};
