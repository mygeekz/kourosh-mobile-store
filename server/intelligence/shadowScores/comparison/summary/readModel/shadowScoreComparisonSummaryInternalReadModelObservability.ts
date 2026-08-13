import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { ShadowScoreComparisonSummaryInternalReadModelRouteResult } from './shadowScoreComparisonSummaryReadModelTypes';

const OBSERVABILITY_PHASE = 'Phase 17B' as const;
const routePath = '/api/brain/ml-shadow-scores/metadata-only/comparison-summaries/internal/read-model' as const;
const allowedQueryKeys = new Set([
  'candidatePackageId',
  'modelKey',
  'modelVersion',
  'predictionType',
  'baselineKey',
  'comparisonStatus',
  'limit',
  'offset',
  'sort',
]);

export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_OBSERVABILITY_HEADERS = Object.freeze({
  auditId: 'X-ML-Audit-Trace-Id',
  auditTraceId: 'X-ML-Audit-Trace-Id',
  metadataOnly: 'X-ML-Metadata-Only',
  readOnly: 'X-ML-Read-Only',
  modelExecutionAllowed: 'X-ML-Model-Execution-Allowed',
  inferenceEndpointExposed: 'X-ML-Inference-Endpoint-Exposed',
  artifactActivationAllowed: 'X-ML-Artifact-Activation-Allowed',
  businessMutationAllowed: 'X-ML-Business-Mutation-Allowed',
});

export interface InternalComparisonSummaryReadonlyRouteObservation {
  phase: typeof OBSERVABILITY_PHASE;
  eventName: 'ml_comparison_summary_internal_read_model_request';
  auditTraceId: string;
  occurredAt: string;
  route: typeof routePath;
  method: 'GET';
  statusCode: number;
  durationMs: number;
  actor: {
    userId: number | null;
    roleName: string | null;
    authorizedRole: boolean;
  };
  query: {
    receivedAllowedKeys: string[];
    ignoredKeyCount: number;
    appliedFilterKeys: string[];
    limit: number | null;
    offset: number | null;
    sort: 'createdAt_desc' | 'createdAt_asc';
  };
  readModel: {
    returnedCount: number;
    total: number | null;
    hasMore: boolean | null;
  };
  safety: {
    metadataOnly: true;
    readOnly: true;
    modelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    inferenceEndpointExposed: false;
    artifactActivationAllowed: false;
    businessMutationAllowed: false;
    tracePersistenceAllowed: false;
  };
  errorKind: 'none' | 'contract_safe_read_model_error';
}

export type InternalComparisonSummaryReadonlyRouteObservationSink = (
  event: InternalComparisonSummaryReadonlyRouteObservation,
) => void;

let observationSink: InternalComparisonSummaryReadonlyRouteObservationSink | null = null;

export const setInternalComparisonSummaryReadonlyRouteObservationSink = (
  sink: InternalComparisonSummaryReadonlyRouteObservationSink | null,
): void => {
  observationSink = sink;
};

export const createInternalComparisonSummaryReadonlyRouteAuditId = (): string => `ml-readonly-${randomUUID()}`;
export const createInternalComparisonSummaryReadonlyRouteAuditTraceId = createInternalComparisonSummaryReadonlyRouteAuditId;

const normalizeDurationMs = (durationMs: number): number => (Number.isFinite(durationMs) && durationMs >= 0 ? Math.trunc(durationMs) : 0);

const normalizeRole = (roleName: unknown): string | null => {
  if (typeof roleName !== 'string') return null;
  const normalized = roleName.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeUserId = (userId: unknown): number | null => {
  const numeric = Number(userId);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : null;
};

const observedAllowedQueryKeys = (query: Request['query']): string[] =>
  Object.keys(query ?? {})
    .filter((key) => allowedQueryKeys.has(key))
    .sort();

const ignoredQueryKeyCount = (query: Request['query']): number =>
  Object.keys(query ?? {}).filter((key) => !allowedQueryKeys.has(key)).length;

const observedSort = (query: Request['query']): 'createdAt_desc' | 'createdAt_asc' =>
  query?.sort === 'createdAt_asc' ? 'createdAt_asc' : 'createdAt_desc';

const buildSafetyObservation = (): InternalComparisonSummaryReadonlyRouteObservation['safety'] => ({
  metadataOnly: true,
  readOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
  tracePersistenceAllowed: false,
});

export const buildInternalComparisonSummaryReadonlyRouteObservation = ({
  auditId,
  req,
  data,
  statusCode,
  durationMs,
  errorKind = 'none',
}: {
  auditId: string;
  req: Request;
  data: ShadowScoreComparisonSummaryInternalReadModelRouteResult | null;
  statusCode: number;
  durationMs: number;
  errorKind?: InternalComparisonSummaryReadonlyRouteObservation['errorKind'];
}): InternalComparisonSummaryReadonlyRouteObservation => {
  const roleName = normalizeRole(req.user?.roleName);
  const appliedFilterKeys = data ? Object.keys(data.filters ?? {}).sort() : [];
  return {
    phase: OBSERVABILITY_PHASE,
    eventName: 'ml_comparison_summary_internal_read_model_request',
    auditTraceId: auditId,
    occurredAt: new Date().toISOString(),
    route: routePath,
    method: 'GET',
    statusCode,
    durationMs: normalizeDurationMs(durationMs),
    actor: {
      userId: normalizeUserId(req.user?.id),
      roleName,
      authorizedRole: roleName === 'Admin' || roleName === 'Manager',
    },
    query: {
      receivedAllowedKeys: observedAllowedQueryKeys(req.query),
      ignoredKeyCount: ignoredQueryKeyCount(req.query),
      appliedFilterKeys,
      limit: data?.page.limit ?? null,
      offset: data?.page.offset ?? null,
      sort: observedSort(req.query),
    },
    readModel: {
      returnedCount: data?.summary.returnedCount ?? 0,
      total: data?.page.total ?? null,
      hasMore: data?.page.hasMore ?? null,
    },
    safety: buildSafetyObservation(),
    errorKind,
  };
};

export const emitInternalComparisonSummaryReadonlyRouteObservation = (
  event: InternalComparisonSummaryReadonlyRouteObservation,
): void => {
  try {
    if (observationSink) {
      observationSink(event);
      return;
    }
    if (process.env.ML_INTERNAL_READMODEL_OBSERVABILITY_STDOUT === '1') {
      console.info(
        JSON.stringify({
          phase: event.phase,
          eventName: event.eventName,
          auditTraceId: event.auditTraceId,
          route: event.route,
          method: event.method,
          statusCode: event.statusCode,
          durationMs: event.durationMs,
          actorRole: event.actor.roleName,
          returnedCount: event.readModel.returnedCount,
          metadataOnly: event.safety.metadataOnly,
          readOnly: event.safety.readOnly,
          errorKind: event.errorKind,
        }),
      );
    }
  } catch (_err) {
    // Observability is best-effort and must never alter the read-only response contract.
  }
};
