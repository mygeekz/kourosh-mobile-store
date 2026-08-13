import type { Express, Request, Response } from 'express';
import { applyMetadataOnlyShadowScoreImport } from '../../intelligence/shadowScores/importApply';
import type {
  MetadataOnlyShadowScoreImportApplyOptions,
  MetadataOnlyShadowScoreImportApplySource,
} from '../../intelligence/shadowScores/importApply/shadowScoreImportApplyTypes';
import type { IntelligenceRouteDeps } from './types';

const INTERNAL_METADATA_ONLY_IMPORT_APPLY_ROUTE =
  '/api/brain/ml-shadow-scores/metadata-only/imports/internal/apply' as const;

const ALLOWED_SOURCES: readonly MetadataOnlyShadowScoreImportApplySource[] = [
  'internal_admin',
  'offline_workbench_export',
  'test_fixture',
] as const;

const FORBIDDEN_REQUEST_KEYS = new Set([
  'filePath',
  'workbenchOutputPath',
  'modelPath',
  'csvPath',
  'execute',
  'activate',
  'runInference',
]);

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasForbiddenRequestKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some((item) => hasForbiddenRequestKey(item));
  if (!isPlainRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => FORBIDDEN_REQUEST_KEYS.has(key) || hasForbiddenRequestKey(nested));
};

const normalizeDryRun = (value: unknown): boolean => value === true;

const normalizeSource = (value: unknown): MetadataOnlyShadowScoreImportApplySource => {
  if (typeof value === 'string' && ALLOWED_SOURCES.includes(value as MetadataOnlyShadowScoreImportApplySource)) {
    return value as MetadataOnlyShadowScoreImportApplySource;
  }
  return 'internal_admin';
};

const requestedByUserIdFromRequest = (req: Request): string | number | null => {
  const user = (req as Request & { user?: { id?: string | number | null; userId?: string | number | null } }).user;
  return user?.id ?? user?.userId ?? null;
};

const traceIdFromRequest = (req: Request): string | null => {
  const header = req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
  if (Array.isArray(header)) return header[0] ? String(header[0]).slice(0, 120) : null;
  return typeof header === 'string' && header.trim().length > 0 ? header.trim().slice(0, 120) : null;
};

const buildSafetySummary = () => ({
  route: 'internal_metadata_only_import_apply' as const,
  readOnly: false,
  metadataOnlyWrite: true,
  businessMutationAllowed: false,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
});

const sendBadRequest = (res: Response, message = 'Invalid metadata-only import apply request.'): void => {
  res.status(400).json({
    success: false,
    error: {
      code: 'invalid_metadata_only_import_apply_request',
      message,
    },
    data: null,
  });
};

export const registerMlShadowScoreImportApplyRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.post(
    INTERNAL_METADATA_ONLY_IMPORT_APPLY_ROUTE,
    authorizeRole(['Admin', 'Manager']),
    async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      try {
        const body = req.body;
        if (!isPlainRecord(body)) {
          sendBadRequest(res);
          return;
        }
        if (hasForbiddenRequestKey(body)) {
          sendBadRequest(res, 'File-path, execution, inference, and activation requests are not allowed.');
          return;
        }
        const payload = body.payload;
        if (!isPlainRecord(payload)) {
          sendBadRequest(res, 'A JSON metadata-only payload is required.');
          return;
        }

        const optionsPayload = isPlainRecord(body.options) ? body.options : {};
        const options: MetadataOnlyShadowScoreImportApplyOptions = {
          requestedByUserId: requestedByUserIdFromRequest(req),
          source: normalizeSource(optionsPayload.source),
          dryRun: normalizeDryRun(optionsPayload.dryRun),
          traceId: traceIdFromRequest(req),
        };

        const result = await applyMetadataOnlyShadowScoreImport(payload, options);
        res.json({
          success: true,
          data: {
            result,
            receipt: result.receipt ?? null,
            summary: buildSafetySummary(),
          },
        });
      } catch (_err) {
        res.status(500).json({
          success: false,
          error: {
            code: 'metadata_only_import_apply_failed',
            message: 'Metadata-only import apply request failed safely.',
          },
          data: null,
        });
      }
    },
  );
};

export { INTERNAL_METADATA_ONLY_IMPORT_APPLY_ROUTE };
