import type { Express } from 'express';
import {
  buildInternalComparisonSummaryReadModelErrorEnvelope,
  buildInternalComparisonSummaryReadModelSuccessEnvelope,
  listInternalAdminShadowScoreComparisonSummaryReadModelRoute,
} from '../../intelligence/shadowScores/comparison/summary/readModel';
import {
  INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS,
  buildInternalComparisonSummaryReadonlyRouteObservation,
  createInternalComparisonSummaryReadonlyRouteAuditId,
  emitInternalComparisonSummaryReadonlyRouteObservation,
} from '../../intelligence/shadowScores/comparison/summary/readModel/shadowScoreComparisonSummaryInternalReadModelObservability';
import type { IntelligenceRouteDeps } from './types';

const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_PATH =
  '/api/brain/ml-shadow-scores/metadata-only/comparison-summaries/internal/read-model' as const;

export const registerMlShadowScoreComparisonSummaryRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    INTERNAL_COMPARISON_SUMMARY_READ_MODEL_PATH,
    authorizeRole(['Admin', 'Manager']),
    async (req, res) => {
      const startedAt = Date.now();
      const auditId = createInternalComparisonSummaryReadonlyRouteAuditId();
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS.auditId, auditId);
      res.setHeader(INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS.metadataOnly, 'true');
      res.setHeader(INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS.readOnly, 'true');
      res.setHeader(INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS.modelExecutionAllowed, 'false');
      res.setHeader(INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS.inferenceEndpointExposed, 'false');
      res.setHeader(INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS.artifactActivationAllowed, 'false');
      res.setHeader(INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS.businessMutationAllowed, 'false');
      try {
        const data = await listInternalAdminShadowScoreComparisonSummaryReadModelRoute(req.query as Record<string, unknown>);
        emitInternalComparisonSummaryReadonlyRouteObservation(
          buildInternalComparisonSummaryReadonlyRouteObservation({
            auditId,
            req,
            data,
            statusCode: 200,
            durationMs: Date.now() - startedAt,
          }),
        );
        res.json(buildInternalComparisonSummaryReadModelSuccessEnvelope(data));
      } catch (_err) {
        emitInternalComparisonSummaryReadonlyRouteObservation(
          buildInternalComparisonSummaryReadonlyRouteObservation({
            auditId,
            req,
            data: null,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
            errorKind: 'contract_safe_read_model_error',
          }),
        );
        // Generic contract message: Invalid metadata-only comparison summary read-model request.
        res.status(400).json(buildInternalComparisonSummaryReadModelErrorEnvelope());
      }
    },
  );
};
