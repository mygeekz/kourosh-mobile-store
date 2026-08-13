import type { Express, Request, Response } from 'express';
import {
  buildImportApplyReceiptReadModelErrorEnvelope,
  buildImportApplyReceiptReadModelSuccessEnvelope,
  listInternalAdminShadowScoreImportApplyReceiptReadModel,
} from '../../intelligence/shadowScores/importApply/receipts';
import type { IntelligenceRouteDeps } from './types';

export const INTERNAL_IMPORT_APPLY_RECEIPT_READ_MODEL_ROUTE =
  '/api/brain/ml-shadow-scores/metadata-only/import-apply-receipts/internal/read-model' as const;

const FORBIDDEN_QUERY_KEYS = new Set([
  'filePath',
  'workbenchOutputPath',
  'modelPath',
  'csvPath',
  'execute',
  'activate',
  'runInference',
]);

const hasForbiddenQueryKey = (query: Request['query']): boolean => Object.keys(query ?? {}).some((key) => FORBIDDEN_QUERY_KEYS.has(key));

export const registerMlShadowScoreImportApplyReceiptReadModelRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    INTERNAL_IMPORT_APPLY_RECEIPT_READ_MODEL_ROUTE,
    authorizeRole(['Admin', 'Manager']),
    async (req, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Kourosh-Metadata-Only', 'true');
      res.setHeader('X-Kourosh-Read-Only', 'true');
      res.setHeader('X-Kourosh-Model-Execution-Allowed', 'false');
      res.setHeader('X-Kourosh-Inference-Endpoint-Exposed', 'false');
      res.setHeader('X-Kourosh-Artifact-Activation-Allowed', 'false');
      res.setHeader('X-Kourosh-Business-Mutation-Allowed', 'false');

      try {
        if (hasForbiddenQueryKey(req.query)) {
          res.status(400).json(buildImportApplyReceiptReadModelErrorEnvelope());
          return;
        }

        const data = await listInternalAdminShadowScoreImportApplyReceiptReadModel(req.query as Record<string, unknown>);
        res.json(buildImportApplyReceiptReadModelSuccessEnvelope(data));
      } catch (_err) {
        res.status(400).json(buildImportApplyReceiptReadModelErrorEnvelope());
      }
    },
  );
};
