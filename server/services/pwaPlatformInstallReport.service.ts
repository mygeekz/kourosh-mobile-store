import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const MATRIX_ROOT = path.resolve(process.cwd(), '.kourosh-runtime', 'pwa-platform-install-matrix');
const AGGREGATE_ROOT = path.resolve(process.cwd(), '.kourosh-runtime', 'visual-quality');
const AGGREGATE_RUN_PREFIX = 'visual-quality--';
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 16 * 1024 * 1024;

export type PwaPlatformInstallPageMetrics = {
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

export type PwaPlatformInstallResult = {
  platform: string;
  platformLabel: string;
  family: string;
  installed: boolean;
  installedDetection: string;
  passed: boolean;
  checks: Record<string, boolean>;
  pageErrors: string[];
  error: string | null;
  login: PwaPlatformInstallPageMetrics | null;
  install: PwaPlatformInstallPageMetrics | null;
  screenshotUrls: {
    login: string | null;
    install: string | null;
  };
};

export type PwaPlatformInstallReport = {
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

export type PwaPlatformInstallReportStatus = {
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

const safeStringArray = (value: unknown): string[] => Array.isArray(value)
  ? value.slice(0, 100).map((item) => String(item ?? '').slice(0, 1000)).filter(Boolean)
  : [];

const screenshotFileName = (value: unknown): string | null => {
  const normalized = String(value ?? '').replace(/\\/g, '/');
  const match = normalized.match(/^screenshots\/([A-Za-z0-9._-]+\.png)$/i);
  return match?.[1] && safeSegment(match[1]) ? match[1] : null;
};

const normalizePageMetrics = (value: unknown): PwaPlatformInstallPageMetrics | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  return {
    platform: String(raw.platform ?? '').slice(0, 100),
    installState: String(raw.installState ?? '').slice(0, 100),
    documentOverflow: Boolean(raw.documentOverflow),
    bodyText: String(raw.bodyText ?? '').slice(0, 6000),
    entryPresent: raw.entryPresent === undefined ? undefined : Boolean(raw.entryPresent),
    entryPlatform: raw.entryPlatform === undefined ? undefined : String(raw.entryPlatform ?? '').slice(0, 100),
    entryText: raw.entryText === undefined ? undefined : String(raw.entryText ?? '').slice(0, 500),
    title: raw.title === undefined ? undefined : String(raw.title ?? '').slice(0, 500),
    primaryPresent: raw.primaryPresent === undefined ? undefined : Boolean(raw.primaryPresent),
    primaryText: raw.primaryText === undefined ? undefined : String(raw.primaryText ?? '').slice(0, 500),
    statusBadge: raw.statusBadge === undefined ? undefined : String(raw.statusBadge ?? '').slice(0, 500),
  };
};

const screenshotUrl = (runId: string, value: unknown): string | null => {
  const fileName = screenshotFileName(value);
  return fileName
    ? `/api/settings/quality/pwa-platform-install-report/${encodeURIComponent(runId)}/screenshots/${encodeURIComponent(fileName)}`
    : null;
};

const normalizeReport = (runId: string, payload: unknown): PwaPlatformInstallReport | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const raw = payload as Record<string, any>;
  const rawResults = Array.isArray(raw.results) ? raw.results : [];
  const results = rawResults.slice(0, 100).map((item: any): PwaPlatformInstallResult => ({
    platform: String(item?.platform ?? '').slice(0, 100),
    platformLabel: String(item?.platformLabel ?? item?.platform ?? '').slice(0, 200),
    family: String(item?.family ?? '').slice(0, 100),
    installed: Boolean(item?.installed),
    installedDetection: String(item?.installedDetection ?? '').slice(0, 300),
    passed: Boolean(item?.passed),
    checks: safeBooleanRecord(item?.checks),
    pageErrors: safeStringArray(item?.pageErrors),
    error: item?.error ? String(item.error).slice(0, 5000) : null,
    login: normalizePageMetrics(item?.login),
    install: normalizePageMetrics(item?.install),
    screenshotUrls: {
      login: screenshotUrl(runId, item?.screenshots?.login),
      install: screenshotUrl(runId, item?.screenshots?.install),
    },
  }));

  const failed = results.filter((item) => !item.passed).length;
  const passed = results.length - failed;
  const matrix = raw.matrix && typeof raw.matrix === 'object' ? raw.matrix : {};
  return {
    runId,
    generatedAt: String(raw.generatedAt ?? ''),
    matrix: {
      platforms: finiteNumber(matrix.platforms),
      installedStates: finiteNumber(matrix.installedStates),
      routesPerScenario: finiteNumber(matrix.routesPerScenario),
      total: finiteNumber(matrix.total, results.length),
      totalScenarios: finiteNumber(matrix.totalScenarios, results.length),
      totalRouteChecks: finiteNumber(matrix.totalRouteChecks, results.length * 2),
    },
    summary: { passed, failed, total: results.length },
    results,
  };
};

type ReportCandidate = {
  runId: string;
  reportPath: string;
  modifiedAt: number;
};

const readReportFile = async (candidate: ReportCandidate): Promise<PwaPlatformInstallReport | null> => {
  const stat = await fs.stat(candidate.reportPath);
  if (!stat.isFile() || stat.size > MAX_REPORT_BYTES) return null;
  const payload = JSON.parse(await fs.readFile(candidate.reportPath, 'utf8'));
  return normalizeReport(candidate.runId, payload);
};

const collectStandaloneCandidates = async (): Promise<ReportCandidate[]> => {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(MATRIX_ROOT, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const candidates: ReportCandidate[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runId = safeSegment(entry.name);
    if (!runId) continue;
    const runRoot = path.join(MATRIX_ROOT, runId);
    const reportPath = path.join(runRoot, 'report.json');
    try {
      const stat = await fs.stat(reportPath);
      if (stat.isFile() && stat.size <= MAX_REPORT_BYTES) {
        candidates.push({ runId, reportPath, modifiedAt: stat.mtimeMs });
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return candidates;
};

const collectAggregateCandidates = async (): Promise<ReportCandidate[]> => {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(AGGREGATE_ROOT, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const candidates: ReportCandidate[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const aggregateRunId = safeSegment(entry.name);
    if (!aggregateRunId) continue;
    const runRoot = path.join(AGGREGATE_ROOT, aggregateRunId, 'pwa-platform-install');
    const reportPath = path.join(runRoot, 'report.json');
    try {
      const stat = await fs.stat(reportPath);
      if (stat.isFile() && stat.size <= MAX_REPORT_BYTES) {
        candidates.push({
          runId: `${AGGREGATE_RUN_PREFIX}${aggregateRunId}`,
          reportPath,
          modifiedAt: stat.mtimeMs,
        });
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return candidates;
};

const resolveRunScreenshotRoot = (runId: string): string | null => {
  if (runId.startsWith(AGGREGATE_RUN_PREFIX)) {
    const aggregateRunId = safeSegment(runId.slice(AGGREGATE_RUN_PREFIX.length));
    return aggregateRunId ? path.resolve(AGGREGATE_ROOT, aggregateRunId, 'pwa-platform-install', 'screenshots') : null;
  }
  return path.resolve(MATRIX_ROOT, runId, 'screenshots');
};

export const getLatestPwaPlatformInstallReport = async (): Promise<PwaPlatformInstallReport | null> => {
  const candidates = [
    ...await collectStandaloneCandidates(),
    ...await collectAggregateCandidates(),
  ].sort((a, b) => b.modifiedAt - a.modifiedAt);

  for (const candidate of candidates) {
    try {
      const report = await readReportFile(candidate);
      if (report) return report;
    } catch {
      // Ignore partially written or malformed runs and continue to the previous valid report.
    }
  }
  return null;
};

export const getLatestPwaPlatformInstallReportStatus = async (): Promise<PwaPlatformInstallReportStatus> => {
  const report = await getLatestPwaPlatformInstallReport();
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

export const resolvePwaPlatformInstallScreenshot = async (
  runIdInput: unknown,
  fileNameInput: unknown,
): Promise<string | null> => {
  const runId = safeSegment(runIdInput);
  const fileName = safeSegment(fileNameInput);
  if (!runId || !fileName || !fileName.toLowerCase().endsWith('.png')) return null;

  const screenshotRoot = resolveRunScreenshotRoot(runId);
  if (!screenshotRoot) return null;
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
