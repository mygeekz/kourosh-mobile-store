import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import {
  getShadowScoreImportApplyReceiptExportPackageSnapshotBySnapshotId,
  getShadowScoreImportApplyReceiptExportPackageSnapshotSummary,
  listShadowScoreImportApplyReceiptExportPackageSnapshots,
  type ShadowScoreImportApplyReceiptExportPackageSnapshotListOptions,
  type StoredShadowScoreImportApplyReceiptExportPackageSnapshot,
} from "../../db/domains/ml/shadowScores/importApplyReceiptExportPackageSnapshots";
import type { IntelligenceRouteDeps } from "./types";

export const INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE =
  "/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-export-package-snapshots/internal/read-model" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_RESPONSE_CONTRACT_VERSION =
  "import_apply_receipt_export_package_snapshot_route_response_v1" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_PHASE =
  "Phase 25B" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_BOUNDARY_MATRIX_PHASE =
  "Phase 25C" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX_PHASE =
  "Phase 25D" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_MATRIX_PHASE =
  "Phase 25E" as const;

// Phase 25F — Snapshot Route Replay Guard Observability Headers
// Phase 25G — Snapshot Route Correlation ID Observability Boundary
// Phase 25H — Snapshot Route Correlation ID Negative Header Matrix
// Phase 25I — Snapshot Route Correlation Negative Header Error Envelope Coverage
// Phase 25J — Snapshot Route Correlation Error Envelope Replay Regression Guard
// Phase 25K — Snapshot Route Correlation Replay Regression Contract Consolidation
// Phase 25L — Snapshot Route Correlation Replay Contract Final Compatibility Guard
export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_HEADERS_PHASE =
  "Phase 25F" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_SCOPE =
  "deterministic-safe-route-headers" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_ROUTE_FINGERPRINT =
  "metadata-only-snapshot-read-model-v1" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE =
  "Phase 25G" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_SCOPE =
  "sanitized-correlation-id-boundary" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_ALLOWED_HEADER_KEYS =
  ["X-Kourosh-Correlation-Id", "X-Request-Id", "X-Correlation-Id"] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_FORBIDDEN_SURFACES =
  [
    "rawHeaderValue",
    "authorizationHeader",
    "cookieHeader",
    "rawCorrelationHeaderValue",
    "idempotencyKeyHeader",
    "replayTokenHeader",
    "requestBody",
    "rawQuery",
    "snapshotFilters",
    "repositoryLookup",
    "stateStore",
    "cacheKey",
    "idempotencyKey",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE =
  "Phase 25H" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_SCOPE =
  "ignored-sensitive-correlation-header-matrix" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_KEYS =
  [
    "Authorization",
    "Cookie",
    "Idempotency-Key",
    "X-Replay-Token",
    "X-Request-Replay",
    "X-Forwarded-For",
    "Forwarded",
    "X-Real-IP",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_FORBIDDEN_SURFACES =
  [
    "rawHeaderEcho",
    "rawValueEcho",
    "responseBody",
    "repositoryLookup",
    "snapshotFilter",
    "stateStore",
    "cacheKey",
    "idempotencyKey",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE =
  "Phase 25I" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_SCOPE =
  "sanitized-negative-header-error-envelope" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_FORBIDDEN_SURFACES =
  [
    "rawNegativeHeaderEcho",
    "rawCorrelationHeaderEcho",
    "authorizationHeader",
    "cookieHeader",
    "forwardedHeader",
    "replayHeader",
    "idempotencyHeader",
    "errorMessage",
    "errorDetails",
    "errorData",
    "repositoryLookup",
    "snapshotFilter",
    "stateStore",
    "cacheKey",
    "idempotencyKey",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE =
  "Phase 25J" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_SCOPE =
  "sanitized-replay-header-error-envelope-regression" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_FORBIDDEN_SURFACES =
  [
    "authorizationHeader",
    "cookieHeader",
    "idempotencyHeader",
    "replayHeader",
    "requestReplayHeader",
    "forwardedHeader",
    "realIpHeader",
    "rawHeaderEcho",
    "rawErrorEcho",
    "errorMessage",
    "errorDetails",
    "errorData",
    "repositoryLookup",
    "snapshotFilter",
    "stateStore",
    "cacheKey",
    "idempotencyKey",
    "replayStore",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE =
  "Phase 25K" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_SCOPE =
  "correlation-replay-regression-contract-consolidation" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATED_PHASES =
  ["Phase 25G", "Phase 25H", "Phase 25I", "Phase 25J"] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_FORBIDDEN_SURFACES =
  [
    "rawCorrelationHeaderValue",
    "rawNegativeHeaderValue",
    "rawReplayHeaderValue",
    "rawErrorEnvelopeEcho",
    "authorizationHeader",
    "cookieHeader",
    "idempotencyHeader",
    "replayHeader",
    "forwardedHeader",
    "repositoryLookup",
    "snapshotFilter",
    "stateStore",
    "cacheKey",
    "idempotencyKey",
    "replayStore",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE =
  "Phase 25L" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_SCOPE =
  "correlation-replay-contract-final-compatibility-guard" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_LOCKED_PHASES =
  ["Phase 25G", "Phase 25H", "Phase 25I", "Phase 25J", "Phase 25K"] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_FORBIDDEN_SURFACES =
  [
    "rawCorrelationHeaderValue",
    "rawNegativeHeaderValue",
    "rawReplayHeaderValue",
    "rawErrorEnvelopeEcho",
    "authorizationHeader",
    "cookieHeader",
    "idempotencyHeader",
    "replayHeader",
    "forwardedHeader",
    "repositoryLookup",
    "snapshotFilter",
    "stateStore",
    "cacheKey",
    "idempotencyKey",
    "replayStore",
    "compatibilityStore",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_ALLOWED_FIELDS =
  [
    "phase",
    "scope",
    "routeFingerprint",
    "metadataOnly",
    "readOnly",
    "safeCorrelationIdOnly",
    "correlationObservabilityBoundaryPhase",
    "correlationObservabilityScope",
    "correlationRawValueEchoAllowed",
    "correlationRepositoryLookupAllowed",
    "correlationStateStoreAllowed",
    "requestBodyCaptureAllowed",
    "rawQueryCaptureAllowed",
    "sensitiveHeadersLogged",
    "repositoryStateCaptureAllowed",
    "stateStoreAllowed",
    "mutationAllowed",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_FORBIDDEN_INPUTS =
  [
    "requestBody",
    "rawQuery",
    "authorizationHeader",
    "cookieHeader",
    "rawCorrelationHeaderValue",
    "idempotencyKeyHeader",
    "replayTokenHeader",
    "repositoryRows",
    "snapshotPayload",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_SCOPE =
  "stateless-header-only" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_SCOPE =
  "ignored-request-headers-only" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_KEYS =
  [
    "Authorization",
    "Idempotency-Key",
    "X-Replay-Token",
    "X-Request-Replay",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_FORBIDDEN_SURFACES =
  [
    "requestQuery",
    "repositoryLookup",
    "snapshotFilters",
    "responseBody",
    "responseContractPersistence",
    "cacheKey",
    "idempotencyKey",
    "businessMutation",
  ] as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_VERSION =
  "import_apply_receipt_export_package_snapshot_route_error_contract_matrix_v1" as const;

const ALLOWED_QUERY_KEYS = new Set([
  "snapshotId",
  "packageId",
  "contentHash",
  "receiptHash",
  "generatedByUserId",
  "traceId",
  "createdAtFrom",
  "createdAtTo",
  "limit",
  "offset",
]);

const FORBIDDEN_QUERY_KEYS = new Set([
  "filePath",
  "workbenchOutputPath",
  "modelPath",
  "csvPath",
  "execute",
  "activate",
  "runInference",
  "infer",
  "executeModel",
  "activateModel",
  "deployModel",
  "productionScore",
  "trainModel",
  "fit",
  "role",
  "roles",
  "userRole",
  "isAdmin",
  "admin",
  "manager",
  "bypassAuth",
  "authBypass",
  "debugAuth",
  "impersonateRole",
  "downloadPath",
  "outputPath",
]);

const FORBIDDEN_VALUE_PATTERN =
  /(?:model\.jo(?:b)lib|train\.csv|test\.csv|\.csv\b|\.jo(?:b)lib\b|\.pkl\b|\.onnx\b|(?:^|[\\/])ml-workbench[\\/]|\.\.\/|\.\.\\|;|drop\s+table|run_inference|activate_artifact|write_inventory|write_accounting|write_ledger|write_report|mutate_ledger|execute_model|activate_model|predict_live|\$ne|\$gt|\$lt|\$or|\$and)/i;

const SAFE_FILTER_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;
const SAFE_HASH_VALUE_PATTERN = /^[a-f0-9]{64}$/i;
const ISO_DATE_TIME_FILTER_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const SAFE_STRING_FILTER_KEYS = [
  "snapshotId",
  "packageId",
  "generatedByUserId",
  "traceId",
] as const;
const SAFE_HASH_FILTER_KEYS = ["contentHash", "receiptHash"] as const;

const CORRELATION_ID_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const CORRELATION_ID_FORBIDDEN_PATTERN =
  /(?:model\.jo(?:b)lib|train\.csv|test\.csv|\.csv\b|\.jo(?:b)lib\b|\.pkl\b|\.onnx\b|(?:^|[\\/])ml-workbench[\\/]|\.\.\/|\.\.\\|\/tmp|server\\|server\/|bearer|token|cookie|session|password|authorization|run_inference|activate_artifact|drop\s+table|;|\$ne|\$gt|\$lt|\$or|\$and)/i;
const CORRELATION_ID_HEADER_KEYS = [
  "x-kourosh-correlation-id",
  "x-request-id",
  "x-correlation-id",
] as const;
const FALLBACK_CORRELATION_ID =
  "kourosh-receipt-export-package-snapshot-route-correlation-redacted" as const;

type ReceiptExportPackageSnapshotRouteErrorCode =
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_failed"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_key"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_value"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_limit"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_offset"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_filter_value"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_repeated_query_value"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_date_range"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_repository_failed"
  | "metadata_only_import_apply_receipt_export_package_snapshot_route_runtime_boundary_failed";

const safeMessages: Record<ReceiptExportPackageSnapshotRouteErrorCode, string> =
  {
    metadata_only_import_apply_receipt_export_package_snapshot_route_failed:
      "Invalid metadata-only receipt export package snapshot request.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_key:
      "Unsupported metadata-only receipt export package snapshot query parameter.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_value:
      "Unsupported metadata-only receipt export package snapshot query value.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_limit:
      "Invalid metadata-only receipt export package snapshot pagination limit.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_offset:
      "Invalid metadata-only receipt export package snapshot pagination offset.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_filter_value:
      "Invalid metadata-only receipt export package snapshot filter value.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_repeated_query_value:
      "Repeated metadata-only receipt export package snapshot query values are not supported.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_date_range:
      "Invalid metadata-only receipt export package snapshot date range.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_repository_failed:
      "Metadata-only receipt export package snapshot repository read failed safely.",
    metadata_only_import_apply_receipt_export_package_snapshot_route_runtime_boundary_failed:
      "Metadata-only receipt export package snapshot runtime boundary handled the failure safely.",
  };

const ERROR_CONTRACT_CATEGORIES = [
  "request_validation",
  "repository_read",
  "runtime_boundary",
] as const;

type ReceiptExportPackageSnapshotRouteErrorContractCategory =
  (typeof ERROR_CONTRACT_CATEGORIES)[number];

type ReceiptExportPackageSnapshotRouteErrorContract = {
  statusCode: 400 | 500;
  category: ReceiptExportPackageSnapshotRouteErrorContractCategory;
  retryable: boolean;
  safeMessage: string;
  rawErrorExposed: false;
  stackTraceExposed: false;
  filesystemPathExposed: false;
  sqlExposed: false;
};

const buildRouteErrorContract = (
  statusCode: 400 | 500,
  category: ReceiptExportPackageSnapshotRouteErrorContractCategory,
  retryable: boolean,
  safeMessage: string,
): ReceiptExportPackageSnapshotRouteErrorContract => ({
  statusCode,
  category,
  retryable,
  safeMessage,
  rawErrorExposed: false,
  stackTraceExposed: false,
  filesystemPathExposed: false,
  sqlExposed: false,
});

const RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX: Record<
  ReceiptExportPackageSnapshotRouteErrorCode,
  ReceiptExportPackageSnapshotRouteErrorContract
> = {
  metadata_only_import_apply_receipt_export_package_snapshot_route_failed:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_failed,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_key:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_key,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_value:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_value,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_limit:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_limit,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_offset:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_offset,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_filter_value:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_filter_value,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_repeated_query_value:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_repeated_query_value,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_date_range:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_date_range,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_repository_failed:
    buildRouteErrorContract(
      500,
      "repository_read",
      true,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_repository_failed,
    ),
  metadata_only_import_apply_receipt_export_package_snapshot_route_runtime_boundary_failed:
    buildRouteErrorContract(
      500,
      "runtime_boundary",
      true,
      safeMessages.metadata_only_import_apply_receipt_export_package_snapshot_route_runtime_boundary_failed,
    ),
};

const errorContractForCode = (
  code: ReceiptExportPackageSnapshotRouteErrorCode,
): ReceiptExportPackageSnapshotRouteErrorContract =>
  RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX[code] ??
  RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX.metadata_only_import_apply_receipt_export_package_snapshot_route_failed;

const firstValue = (value: unknown): unknown =>
  Array.isArray(value) ? value[0] : value;

const firstHeaderValue = (value: unknown): string | null => {
  if (Array.isArray(value))
    return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
};

const numberValue = (value: unknown): number => Number(firstValue(value));

const stringValue = (value: unknown): string | undefined => {
  const selected = firstValue(value);
  if (typeof selected !== "string") return undefined;
  const trimmed = selected.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const unsafeValueExists = (value: unknown): boolean => {
  if (typeof value === "string") return FORBIDDEN_VALUE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(unsafeValueExists);
  if (value && typeof value === "object") return true;
  return false;
};

const repeatedQueryValueExists = (value: unknown): boolean =>
  Array.isArray(value);

const unsafeStringFilterValueExists = (query: Request["query"]): boolean => {
  for (const key of SAFE_STRING_FILTER_KEYS) {
    const value = stringValue(query[key]);
    if (value && !SAFE_FILTER_VALUE_PATTERN.test(value)) return true;
  }
  for (const key of SAFE_HASH_FILTER_KEYS) {
    const value = stringValue(query[key]);
    if (value && !SAFE_HASH_VALUE_PATTERN.test(value)) return true;
  }
  return false;
};

const invalidIsoDateFilterExists = (value: string | undefined): boolean => {
  if (!value) return false;
  if (!ISO_DATE_TIME_FILTER_PATTERN.test(value)) return true;
  return Number.isNaN(Date.parse(value));
};

const invalidDateRangeExists = (query: Request["query"]): boolean => {
  const createdAtFrom = stringValue(query.createdAtFrom);
  const createdAtTo = stringValue(query.createdAtTo);
  if (
    invalidIsoDateFilterExists(createdAtFrom) ||
    invalidIsoDateFilterExists(createdAtTo)
  ) {
    return true;
  }
  if (
    createdAtFrom &&
    createdAtTo &&
    Date.parse(createdAtFrom) > Date.parse(createdAtTo)
  ) {
    return true;
  }
  return false;
};

const validateQuery = (
  query: Request["query"],
): ReceiptExportPackageSnapshotRouteErrorCode | null => {
  for (const key of Object.keys(query ?? {})) {
    if (FORBIDDEN_QUERY_KEYS.has(key) || !ALLOWED_QUERY_KEYS.has(key)) {
      return "metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_key";
    }
  }

  for (const value of Object.values(query ?? {})) {
    if (unsafeValueExists(value)) {
      return "metadata_only_import_apply_receipt_export_package_snapshot_route_unsafe_query_value";
    }
    if (repeatedQueryValueExists(value)) {
      return "metadata_only_import_apply_receipt_export_package_snapshot_route_repeated_query_value";
    }
  }

  if (unsafeStringFilterValueExists(query)) {
    return "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_filter_value";
  }

  if (invalidDateRangeExists(query)) {
    return "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_date_range";
  }

  if (query.limit !== undefined) {
    const limit = numberValue(query.limit);
    if (
      !Number.isFinite(limit) ||
      Math.trunc(limit) !== limit ||
      limit < 1 ||
      limit > 500
    ) {
      return "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_limit";
    }
  }

  if (query.offset !== undefined) {
    const offset = numberValue(query.offset);
    if (
      !Number.isFinite(offset) ||
      Math.trunc(offset) !== offset ||
      offset < 0
    ) {
      return "metadata_only_import_apply_receipt_export_package_snapshot_route_invalid_offset";
    }
  }

  return null;
};

type ReceiptExportPackageSnapshotCorrelationId = {
  id: string;
  sanitized: true;
  source: "request-header" | "fallback-redacted";
};

const sanitizeCorrelationId = (
  req: Request,
): ReceiptExportPackageSnapshotCorrelationId => {
  for (const key of CORRELATION_ID_HEADER_KEYS) {
    const raw = firstHeaderValue(req.headers?.[key]);
    if (!raw) continue;
    const trimmed = raw.trim();
    if (
      CORRELATION_ID_SAFE_PATTERN.test(trimmed) &&
      !CORRELATION_ID_FORBIDDEN_PATTERN.test(trimmed)
    ) {
      return { id: trimmed, sanitized: true, source: "request-header" };
    }
    return {
      id: FALLBACK_CORRELATION_ID,
      sanitized: true,
      source: "fallback-redacted",
    };
  }
  return {
    id: FALLBACK_CORRELATION_ID,
    sanitized: true,
    source: "fallback-redacted",
  };
};

const toListOptions = (
  query: Request["query"],
): ShadowScoreImportApplyReceiptExportPackageSnapshotListOptions => ({
  packageId: stringValue(query.packageId),
  contentHash: stringValue(query.contentHash),
  receiptHash: stringValue(query.receiptHash),
  generatedByUserId: stringValue(query.generatedByUserId),
  traceId: stringValue(query.traceId),
  createdAtFrom: stringValue(query.createdAtFrom),
  createdAtTo: stringValue(query.createdAtTo),
  limit: query.limit === undefined ? 25 : numberValue(query.limit),
  offset: query.offset === undefined ? 0 : numberValue(query.offset),
});

const buildResponseContract = () => ({
  phase: IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_PHASE,
  boundaryMatrixPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_BOUNDARY_MATRIX_PHASE,
  errorContractMatrixPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
  replayGuardMatrixPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_MATRIX_PHASE,
  observabilityHeadersPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_HEADERS_PHASE,
  observabilityScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_SCOPE,
  observabilityRouteFingerprint:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_ROUTE_FINGERPRINT,
  correlationObservabilityBoundaryPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE,
  correlationObservabilityScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_SCOPE,
  correlationObservabilityAllowedHeaderKeys:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_ALLOWED_HEADER_KEYS,
  correlationObservabilityForbiddenSurfaces:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_FORBIDDEN_SURFACES,
  correlationNegativeHeaderMatrixPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE,
  correlationNegativeHeaderMatrixScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_SCOPE,
  correlationNegativeHeaderMatrixHeaderKeys:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_KEYS,
  correlationNegativeHeaderMatrixForbiddenSurfaces:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_FORBIDDEN_SURFACES,
  correlationNegativeHeaderErrorEnvelopePhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
  correlationNegativeHeaderErrorEnvelopeScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_SCOPE,
  correlationNegativeHeaderErrorEnvelopeForbiddenSurfaces:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_FORBIDDEN_SURFACES,
  correlationErrorEnvelopeReplayRegressionGuardPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
  correlationErrorEnvelopeReplayRegressionGuardScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_SCOPE,
  correlationErrorEnvelopeReplayRegressionGuardForbiddenSurfaces:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_FORBIDDEN_SURFACES,
  correlationReplayRegressionContractConsolidationPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
  correlationReplayRegressionContractConsolidationScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_SCOPE,
  correlationReplayRegressionContractConsolidatedPhases:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATED_PHASES,
  correlationReplayRegressionContractConsolidationForbiddenSurfaces:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_FORBIDDEN_SURFACES,
  correlationReplayContractFinalCompatibilityGuardPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
  correlationReplayContractFinalCompatibilityGuardScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_SCOPE,
  correlationReplayContractFinalCompatibilityGuardLockedPhases:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_LOCKED_PHASES,
  correlationReplayContractFinalCompatibilityGuardForbiddenSurfaces:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_FORBIDDEN_SURFACES,
  observabilityAllowedFields:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_ALLOWED_FIELDS,
  observabilityForbiddenInputs:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_FORBIDDEN_INPUTS,
  replayGuardScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_SCOPE,
  replayGuardNegativeHeaderMatrixScope:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_SCOPE,
  replayGuardNegativeHeaderMatrixHeaderKeys:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_KEYS,
  replayGuardForbiddenSurfaces:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_FORBIDDEN_SURFACES,
  contractVersion:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_RESPONSE_CONTRACT_VERSION,
  errorContractVersion:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_VERSION,
  route:
    `GET ${INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE}` as const,
  routeKind:
    "metadata_only_import_apply_receipt_export_package_snapshot_internal_read_model_response" as const,
  stableEnvelope: true,
  successEnvelopeKeys: [
    "success",
    "contractVersion",
    "responseContract",
    "data",
  ] as const,
  errorEnvelopeKeys: [
    "success",
    "contractVersion",
    "responseContract",
    "errorContractVersion",
    "errorContractMatrixPhase",
    "replayGuardMatrixPhase",
    "correlationNegativeHeaderErrorEnvelopePhase",
    "correlationErrorEnvelopeReplayRegressionGuardPhase",
    "correlationReplayRegressionContractConsolidationPhase",
    "correlationReplayContractFinalCompatibilityGuardPhase",
    "error",
    "data",
  ] as const,
  dataKeys: [
    "phase",
    "routeKind",
    "metadataOnly",
    "readOnly",
    "evidenceOnly",
    "replayGuardMatrixPhase",
    "observabilityHeadersPhase",
    "observability",
    "correlationObservability",
    "correlationNegativeHeaderMatrix",
    "correlationNegativeHeaderErrorEnvelope",
    "correlationErrorEnvelopeReplayRegressionGuard",
    "correlationReplayRegressionContractConsolidation",
    "correlationReplayContractFinalCompatibilityGuard",
    "replayGuard",
    "snapshots",
    "snapshot",
    "summary",
    "page",
    "filters",
    "safety",
    "source",
  ] as const,
  readsSnapshotTable: true,
  boundaryMatrixCoverage: {
    repeatedQueryValuesRejected: true,
    unsafeQueryKeysRejected: true,
    unsafeQueryValuesRejected: true,
    invalidHashFiltersRejected: true,
    invalidDateRangesRejected: true,
    invalidPaginationRejected: true,
    repositoryErrorsSanitized: true,
  } as const,
  errorEnvelopeSanitized: true,
  replayGuardMatrixCovered: true,
  observabilityHeadersCovered: true,
  observabilityHeadersDeterministic: true,
  observabilitySafeCorrelationIdOnly: true,
  correlationObservabilityBoundaryCovered: true,
  correlationNegativeHeaderMatrixCovered: true,
  correlationNegativeHeaderErrorEnvelopeCovered: true,
  correlationNegativeHeaderErrorEnvelopeSanitized: true,
  correlationNegativeHeaderErrorEnvelopeRawEchoAllowed: false,
  correlationNegativeHeaderErrorEnvelopeRepositoryLookupAllowed: false,
  correlationNegativeHeaderErrorEnvelopeStateStoreAllowed: false,
  correlationNegativeHeaderErrorEnvelopeMutationAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardCovered: true,
  correlationErrorEnvelopeReplayRegressionGuardSanitized: true,
  correlationErrorEnvelopeReplayRegressionGuardRawEchoAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardRepositoryLookupAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardSnapshotFilterAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardStateStoreAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardCacheKeyAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardIdempotencyKeyAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardReplayStoreAllowed: false,
  correlationErrorEnvelopeReplayRegressionGuardMutationAllowed: false,
  correlationReplayRegressionContractConsolidationCovered: true,
  correlationReplayRegressionContractConsolidatesCorrelationPhases: true,
  correlationReplayRegressionContractConsolidationRawEchoAllowed: false,
  correlationReplayRegressionContractConsolidationRepositoryLookupAllowed: false,
  correlationReplayRegressionContractConsolidationSnapshotFilterAllowed: false,
  correlationReplayRegressionContractConsolidationStateStoreAllowed: false,
  correlationReplayRegressionContractConsolidationCacheKeyAllowed: false,
  correlationReplayRegressionContractConsolidationIdempotencyKeyAllowed: false,
  correlationReplayRegressionContractConsolidationReplayStoreAllowed: false,
  correlationReplayRegressionContractConsolidationMutationAllowed: false,
  correlationReplayContractFinalCompatibilityGuardCovered: true,
  correlationReplayContractFinalCompatibilityGuardLocksPhase25GTo25K: true,
  correlationReplayContractFinalCompatibilityGuardRawEchoAllowed: false,
  correlationReplayContractFinalCompatibilityGuardRepositoryLookupAllowed: false,
  correlationReplayContractFinalCompatibilityGuardSnapshotFilterAllowed: false,
  correlationReplayContractFinalCompatibilityGuardStateStoreAllowed: false,
  correlationReplayContractFinalCompatibilityGuardCacheKeyAllowed: false,
  correlationReplayContractFinalCompatibilityGuardIdempotencyKeyAllowed: false,
  correlationReplayContractFinalCompatibilityGuardReplayStoreAllowed: false,
  correlationReplayContractFinalCompatibilityGuardCompatibilityStoreAllowed: false,
  correlationReplayContractFinalCompatibilityGuardMutationAllowed: false,
  correlationNegativeHeaderMatrixAccepted: false,
  correlationNegativeHeaderMatrixRawEchoAllowed: false,
  correlationNegativeHeaderMatrixRepositoryLookupAllowed: false,
  correlationNegativeHeaderMatrixSnapshotFilterAllowed: false,
  correlationNegativeHeaderMatrixStateStoreAllowed: false,
  correlationNegativeHeaderMatrixMutationAllowed: false,
  correlationObservabilitySanitized: true,
  correlationObservabilityAllowlistedHeadersOnly: true,
  correlationObservabilityRawValueEchoAllowed: false,
  correlationObservabilitySensitiveValueRedacted: true,
  correlationObservabilityRepositoryLookupAllowed: false,
  correlationObservabilitySnapshotFilterAllowed: false,
  correlationObservabilityStateStoreAllowed: false,
  correlationObservabilityMutationAllowed: false,
  observabilityRequestBodyCaptureAllowed: false,
  observabilityRawQueryCaptureAllowed: false,
  observabilitySensitiveHeadersLogged: false,
  observabilityRepositoryStateCaptureAllowed: false,
  observabilityStateStoreAllowed: false,
  observabilityMutationAllowed: false,
  observabilityDynamicIdentifierEchoAllowed: false,
  replayGuardStateless: true,
  replayGuardHeaderOnly: true,
  replayGuardNegativeHeadersAccepted: false,
  replayGuardNegativeHeadersBodyEchoAllowed: false,
  replayGuardNegativeHeadersRepositoryLookupAllowed: false,
  replayGuardNegativeHeadersSnapshotFilterAllowed: false,
  replayGuardNegativeHeadersCacheKeyAllowed: false,
  replayGuardNegativeHeadersIdempotencyKeyAllowed: false,
  replayGuardNegativeHeadersMutationAllowed: false,
  rawErrorsExposed: false,
  stackTracesExposed: false,
  filesystemPathsExposed: false,
  sqlExposed: false,
  errorCategories: ERROR_CONTRACT_CATEGORIES,
  errorStatusMatrix:
    RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX,
  writesSnapshots: false,
  writesBusinessRecords: false,
  metadataOnly: true,
  readOnly: true,
  evidenceOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
});

const snapshotSafety = {
  metadataOnly: true,
  readOnly: true,
  evidenceOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
  canChangeInventoryOrAccounting: false,
  containsModelBytes: false,
  containsRawCsv: false,
  containsFilesystemPaths: false,
} as const;

const buildSuccessEnvelope = (
  snapshots: StoredShadowScoreImportApplyReceiptExportPackageSnapshot[],
  summary: Awaited<
    ReturnType<
      typeof getShadowScoreImportApplyReceiptExportPackageSnapshotSummary
    >
  >,
  query: Request["query"],
) => {
  const snapshotId = stringValue(query.snapshotId);
  const limit = query.limit === undefined ? 25 : numberValue(query.limit);
  const offset = query.offset === undefined ? 0 : numberValue(query.offset);
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const safeOffset = Math.max(0, Math.trunc(offset));
  return {
    success: true,
    contractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_RESPONSE_CONTRACT_VERSION,
    responseContract: buildResponseContract(),
    data: {
      phase: IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_PHASE,
      boundaryMatrixPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_BOUNDARY_MATRIX_PHASE,
      errorContractMatrixPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
      replayGuardMatrixPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_MATRIX_PHASE,
      observabilityHeadersPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_HEADERS_PHASE,
      correlationObservabilityBoundaryPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE,
      correlationNegativeHeaderMatrixPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE,
      correlationNegativeHeaderErrorEnvelopePhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
      correlationErrorEnvelopeReplayRegressionGuardPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
      correlationReplayRegressionContractConsolidationPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
      correlationReplayContractFinalCompatibilityGuardPhase:
        IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
      observability: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_HEADERS_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_SCOPE,
        routeFingerprint:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_ROUTE_FINGERPRINT,
        deterministic: true,
        metadataOnly: true,
        readOnly: true,
        safeCorrelationIdOnly: true,
        correlationObservabilityBoundaryPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE,
        correlationNegativeHeaderMatrixPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE,
        correlationNegativeHeaderErrorEnvelopePhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
        correlationErrorEnvelopeReplayRegressionGuardPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
        correlationReplayRegressionContractConsolidationPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
        correlationReplayContractFinalCompatibilityGuardPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
        correlationObservabilityScope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_SCOPE,
        correlationRawValueEchoAllowed: false,
        correlationSensitiveValueRedacted: true,
        correlationRepositoryLookupAllowed: false,
        correlationStateStoreAllowed: false,
        requestBodyCaptureAllowed: false,
        rawQueryCaptureAllowed: false,
        sensitiveHeadersLogged: false,
        repositoryStateCaptureAllowed: false,
        stateStoreAllowed: false,
        mutationAllowed: false,
        dynamicIdentifierEchoAllowed: false,
      },
      correlationObservability: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_SCOPE,
        allowedHeaderKeys:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_ALLOWED_HEADER_KEYS,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_FORBIDDEN_SURFACES,
        sanitized: true,
        allowlistedHeadersOnly: true,
        rawValueEchoAllowed: false,
        sensitiveValueRedacted: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        mutationAllowed: false,
      },
      correlationNegativeHeaderMatrix: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_SCOPE,
        headerKeys:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_KEYS,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_FORBIDDEN_SURFACES,
        stateless: true,
        headerOnly: true,
        negativeHeadersAccepted: false,
        rawHeaderEchoAllowed: false,
        rawValueEchoAllowed: false,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        mutationAllowed: false,
      },
      correlationNegativeHeaderErrorEnvelope: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_SCOPE,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_FORBIDDEN_SURFACES,
        sanitized: true,
        errorEnvelopeOnly: true,
        negativeHeadersAccepted: false,
        rawNegativeHeaderEchoAllowed: false,
        rawCorrelationHeaderEchoAllowed: false,
        safeMessageOnly: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        mutationAllowed: false,
      },
      correlationErrorEnvelopeReplayRegressionGuard: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_SCOPE,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_FORBIDDEN_SURFACES,
        sanitized: true,
        replayRegressionGuardOnly: true,
        sensitiveReplayHeadersAccepted: false,
        rawHeaderEchoAllowed: false,
        rawErrorEchoAllowed: false,
        safeMessageOnly: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        replayStoreAllowed: false,
        mutationAllowed: false,
      },
      correlationReplayRegressionContractConsolidation: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_SCOPE,
        consolidatedPhases:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATED_PHASES,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_FORBIDDEN_SURFACES,
        deterministic: true,
        metadataOnly: true,
        readOnly: true,
        contractSummaryOnly: true,
        consolidatesCorrelationPhases: true,
        rawEchoAllowed: false,
        safeMessageOnly: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        replayStoreAllowed: false,
        mutationAllowed: false,
      },
      correlationReplayContractFinalCompatibilityGuard: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_SCOPE,
        lockedPhases:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_LOCKED_PHASES,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_FORBIDDEN_SURFACES,
        deterministic: true,
        metadataOnly: true,
        readOnly: true,
        finalCompatibilityGuardOnly: true,
        locksCorrelationReplayPhases: true,
        rawEchoAllowed: false,
        safeMessageOnly: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        replayStoreAllowed: false,
        compatibilityStoreAllowed: false,
        mutationAllowed: false,
      },
      replayGuard: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_MATRIX_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_SCOPE,
        stateless: true,
        headerOnly: true,
        negativeHeaderMatrixScope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_SCOPE,
        negativeHeaderMatrixHeaderKeys:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_KEYS,
        negativeHeadersAccepted: false,
        negativeHeadersBodyEchoAllowed: false,
        negativeHeadersRepositoryLookupAllowed: false,
        negativeHeadersSnapshotFilterAllowed: false,
        negativeHeadersCacheKeyAllowed: false,
        negativeHeadersIdempotencyKeyAllowed: false,
        negativeHeadersMutationAllowed: false,
      },
      routeKind:
        "metadata_only_import_apply_receipt_export_package_snapshot_internal_read_model" as const,
      metadataOnly: true,
      readOnly: true,
      evidenceOnly: true,
      snapshots,
      snapshot: snapshotId ? (snapshots[0] ?? null) : null,
      summary,
      page: {
        limit: safeLimit,
        offset: safeOffset,
        resultCount: snapshots.length,
        hasMore: snapshotId ? false : snapshots.length === safeLimit,
      },
      filters: {
        snapshotId: stringValue(query.snapshotId) ?? null,
        packageId: stringValue(query.packageId) ?? null,
        contentHash: stringValue(query.contentHash) ?? null,
        receiptHash: stringValue(query.receiptHash) ?? null,
        generatedByUserId: stringValue(query.generatedByUserId) ?? null,
        traceId: stringValue(query.traceId) ?? null,
        createdAtFrom: stringValue(query.createdAtFrom) ?? null,
        createdAtTo: stringValue(query.createdAtTo) ?? null,
      },
      safety: snapshotSafety,
      source: {
        snapshotPersistencePhase: "Phase 25A" as const,
        routePhase: IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_PHASE,
        boundaryMatrixPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_BOUNDARY_MATRIX_PHASE,
        errorContractMatrixPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
        replayGuardMatrixPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_MATRIX_PHASE,
        observabilityHeadersPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_HEADERS_PHASE,
        correlationObservabilityBoundaryPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE,
        correlationNegativeHeaderMatrixPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE,
        correlationNegativeHeaderErrorEnvelopePhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
        correlationErrorEnvelopeReplayRegressionGuardPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
        correlationReplayRegressionContractConsolidationPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
        correlationReplayContractFinalCompatibilityGuardPhase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
        route: INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE,
      },
    },
    snapshots,
    summary,
    safety: snapshotSafety,
  };
};

const statusForErrorCode = (
  code: ReceiptExportPackageSnapshotRouteErrorCode,
): 400 | 500 => errorContractForCode(code).statusCode;

const buildErrorEnvelope = (
  code: ReceiptExportPackageSnapshotRouteErrorCode = "metadata_only_import_apply_receipt_export_package_snapshot_route_failed",
  statusCode = statusForErrorCode(code),
) => {
  const contract = errorContractForCode(code);
  return {
    success: false,
    contractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_RESPONSE_CONTRACT_VERSION,
    responseContract: buildResponseContract(),
    errorContractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_VERSION,
    errorContractMatrixPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
    replayGuardMatrixPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_MATRIX_PHASE,
    observabilityHeadersPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_HEADERS_PHASE,
    correlationObservabilityBoundaryPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE,
    correlationNegativeHeaderMatrixPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE,
    correlationNegativeHeaderErrorEnvelopePhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
    correlationErrorEnvelopeReplayRegressionGuardPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
    correlationReplayRegressionContractConsolidationPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
    correlationReplayContractFinalCompatibilityGuardPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
    error: {
      code,
      message: contract.safeMessage,
      statusCode,
      category: contract.category,
      retryable: contract.retryable,
      safe: true,
      rawErrorExposed: false,
      stackTraceExposed: false,
      filesystemPathExposed: false,
      sqlExposed: false,
      correlationNegativeHeaderErrorEnvelope: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_SCOPE,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_FORBIDDEN_SURFACES,
        sanitized: true,
        safeMessageOnly: true,
        negativeHeadersAccepted: false,
        rawNegativeHeaderEchoAllowed: false,
        rawCorrelationHeaderEchoAllowed: false,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        mutationAllowed: false,
      },
      correlationErrorEnvelopeReplayRegressionGuard: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_SCOPE,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_FORBIDDEN_SURFACES,
        sanitized: true,
        replayRegressionGuardOnly: true,
        sensitiveReplayHeadersAccepted: false,
        rawHeaderEchoAllowed: false,
        rawErrorEchoAllowed: false,
        safeMessageOnly: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        replayStoreAllowed: false,
        mutationAllowed: false,
      },
      correlationReplayRegressionContractConsolidation: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_SCOPE,
        consolidatedPhases:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATED_PHASES,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_FORBIDDEN_SURFACES,
        sanitized: true,
        contractSummaryOnly: true,
        consolidatesCorrelationPhases: true,
        rawEchoAllowed: false,
        safeMessageOnly: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        replayStoreAllowed: false,
        mutationAllowed: false,
      },
      correlationReplayContractFinalCompatibilityGuard: {
        phase:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
        scope:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_SCOPE,
        lockedPhases:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_LOCKED_PHASES,
        forbiddenSurfaces:
          IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_FORBIDDEN_SURFACES,
        sanitized: true,
        finalCompatibilityGuardOnly: true,
        locksCorrelationReplayPhases: true,
        rawEchoAllowed: false,
        safeMessageOnly: true,
        repositoryLookupAllowed: false,
        snapshotFilterAllowed: false,
        stateStoreAllowed: false,
        cacheKeyAllowed: false,
        idempotencyKeyAllowed: false,
        replayStoreAllowed: false,
        compatibilityStoreAllowed: false,
        mutationAllowed: false,
      },
    },
    data: null,
  };
};

const classifyCaughtRouteError = (
  err: unknown,
): ReceiptExportPackageSnapshotRouteErrorCode => {
  const message = err instanceof Error ? err.message : "";
  if (
    /SQLITE|database|repository|SELECT|FROM\s+ml_shadow_score_import_apply_receipt_export_package_snapshots/i.test(
      message,
    )
  ) {
    return "metadata_only_import_apply_receipt_export_package_snapshot_route_repository_failed";
  }
  return "metadata_only_import_apply_receipt_export_package_snapshot_route_runtime_boundary_failed";
};

type SnapshotRouteContractHeaderValue = string | readonly string[];
type SnapshotRouteContractHeaderEntry = readonly [
  name: string,
  value: SnapshotRouteContractHeaderValue,
];

const toContractHeaderValue = (
  value: SnapshotRouteContractHeaderValue,
): string => (typeof value === "string" ? value : value.join(","));

const setStaticSnapshotRouteContractHeaders = (
  res: Response,
  headers: readonly SnapshotRouteContractHeaderEntry[],
): void => {
  for (const [name, value] of headers) {
    res.setHeader(name, toContractHeaderValue(value));
  }
};

const SNAPSHOT_ROUTE_STATIC_CONTRACT_HEADERS: readonly SnapshotRouteContractHeaderEntry[] = [
  ["Cache-Control", "no-store"],
  ["X-Kourosh-Metadata-Only", "true"],
  ["X-Kourosh-Read-Only", "true"],
  ["X-Kourosh-Evidence-Only", "true"],
  [
    "X-Kourosh-Route-Kind",
    "metadata-only-import-apply-receipt-export-package-snapshot-internal-read-model",
  ],
  ["X-Kourosh-Snapshot-Persistence-Phase", "Phase 25A"],
  [
    "X-Kourosh-Route-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_PHASE,
  ],
  [
    "X-Kourosh-Route-Boundary-Matrix-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_BOUNDARY_MATRIX_PHASE,
  ],
  [
    "X-Kourosh-Error-Contract-Matrix-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
  ],
  // Phase 25E: replay guard markers remain stateless/header-only.
  [
    "X-Kourosh-Replay-Guard-Matrix-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_MATRIX_PHASE,
  ],
  [
    "X-Kourosh-Replay-Guard",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_SCOPE,
  ],
  [
    "X-Kourosh-Replay-Negative-Header-Matrix",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_SCOPE,
  ],
  ["X-Kourosh-Replay-Negative-Headers-Accepted", "false"],
  ["X-Kourosh-Replay-Negative-Headers-Body-Echo-Allowed", "false"],
  [
    "X-Kourosh-Replay-Negative-Headers-Repository-Lookup-Allowed",
    "false",
  ],
  ["X-Kourosh-Replay-Negative-Headers-Snapshot-Filter-Allowed", "false"],
  ["X-Kourosh-Replay-Negative-Headers-Cache-Key-Allowed", "false"],
  ["X-Kourosh-Replay-Negative-Headers-Idempotency-Key-Allowed", "false"],
  ["X-Kourosh-Replay-Negative-Headers-Mutation-Allowed", "false"],
  // Phase 25F: deterministic observability markers expose safe route contract only.
  [
    "X-Kourosh-Observability-Headers-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_HEADERS_PHASE,
  ],
  [
    "X-Kourosh-Observability-Scope",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_SCOPE,
  ],
  [
    "X-Kourosh-Observability-Route-Fingerprint",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_OBSERVABILITY_ROUTE_FINGERPRINT,
  ],
  ["X-Kourosh-Observability-Safe-Correlation-Id-Only", "true"],
  ["X-Kourosh-Observability-Request-Body-Capture-Allowed", "false"],
  ["X-Kourosh-Observability-Raw-Query-Capture-Allowed", "false"],
  ["X-Kourosh-Observability-Sensitive-Headers-Logged", "false"],
  ["X-Kourosh-Observability-Repository-State-Capture-Allowed", "false"],
  ["X-Kourosh-Observability-State-Store-Allowed", "false"],
  ["X-Kourosh-Observability-Mutation-Allowed", "false"],
  ["X-Kourosh-Observability-Dynamic-Identifier-Echo-Allowed", "false"],
  // Phase 25G: correlation values are sanitized and never stateful inputs.
  [
    "X-Kourosh-Correlation-Observability-Boundary-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_BOUNDARY_PHASE,
  ],
  [
    "X-Kourosh-Correlation-Observability-Scope",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_SCOPE,
  ],
  [
    "X-Kourosh-Correlation-Header-Allowlist",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_OBSERVABILITY_ALLOWED_HEADER_KEYS,
  ],
  ["X-Kourosh-Correlation-Raw-Value-Echo-Allowed", "false"],
  ["X-Kourosh-Correlation-Sensitive-Value-Redacted", "true"],
  ["X-Kourosh-Correlation-Repository-Lookup-Allowed", "false"],
  ["X-Kourosh-Correlation-Snapshot-Filter-Allowed", "false"],
  ["X-Kourosh-Correlation-State-Store-Allowed", "false"],
  ["X-Kourosh-Correlation-Cache-Key-Allowed", "false"],
  ["X-Kourosh-Correlation-Idempotency-Key-Allowed", "false"],
  ["X-Kourosh-Correlation-Mutation-Allowed", "false"],
  // Phase 25H: negative correlation headers are ignored and never echoed.
  [
    "X-Kourosh-Correlation-Negative-Header-Matrix-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_PHASE,
  ],
  [
    "X-Kourosh-Correlation-Negative-Header-Matrix",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_MATRIX_SCOPE,
  ],
  ["X-Kourosh-Correlation-Negative-Headers-Accepted", "false"],
  ["X-Kourosh-Correlation-Negative-Headers-Raw-Echo-Allowed", "false"],
  [
    "X-Kourosh-Correlation-Negative-Headers-Repository-Lookup-Allowed",
    "false",
  ],
  ["X-Kourosh-Correlation-Negative-Headers-Snapshot-Filter-Allowed", "false"],
  ["X-Kourosh-Correlation-Negative-Headers-State-Store-Allowed", "false"],
  ["X-Kourosh-Correlation-Negative-Headers-Cache-Key-Allowed", "false"],
  ["X-Kourosh-Correlation-Negative-Headers-Idempotency-Key-Allowed", "false"],
  ["X-Kourosh-Correlation-Negative-Headers-Mutation-Allowed", "false"],
  // Phase 25I: error envelope markers stay safe-message only.
  [
    "X-Kourosh-Correlation-Negative-Header-Error-Envelope-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_PHASE,
  ],
  [
    "X-Kourosh-Correlation-Negative-Header-Error-Envelope",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_NEGATIVE_HEADER_ERROR_ENVELOPE_SCOPE,
  ],
  ["X-Kourosh-Correlation-Negative-Header-Error-Raw-Echo-Allowed", "false"],
  ["X-Kourosh-Correlation-Negative-Header-Error-Safe-Message-Only", "true"],
  [
    "X-Kourosh-Correlation-Negative-Header-Error-Repository-Lookup-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Negative-Header-Error-Snapshot-Filter-Allowed",
    "false",
  ],
  ["X-Kourosh-Correlation-Negative-Header-Error-State-Store-Allowed", "false"],
  [
    "X-Kourosh-Correlation-Negative-Header-Error-Idempotency-Key-Allowed",
    "false",
  ],
  ["X-Kourosh-Correlation-Negative-Header-Error-Mutation-Allowed", "false"],
  // Phase 25J: replay regression error envelopes never use replay/sensitive headers statefully.
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Guard-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_PHASE,
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Guard",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_ERROR_ENVELOPE_REPLAY_REGRESSION_GUARD_SCOPE,
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Raw-Echo-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Safe-Message-Only",
    "true",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Repository-Lookup-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Snapshot-Filter-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-State-Store-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Cache-Key-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Idempotency-Key-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Replay-Store-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Error-Envelope-Replay-Regression-Mutation-Allowed",
    "false",
  ],
  // Phase 25K: consolidated correlation/replay contract summary.
  [
    "X-Kourosh-Correlation-Replay-Regression-Contract-Consolidation-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_PHASE,
  ],
  [
    "X-Kourosh-Correlation-Replay-Regression-Contract-Consolidation-Scope",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATION_SCOPE,
  ],
  [
    "X-Kourosh-Correlation-Replay-Regression-Contract-Consolidated-Phases",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_REGRESSION_CONTRACT_CONSOLIDATED_PHASES,
  ],
  ["X-Kourosh-Correlation-Replay-Regression-Contract-Raw-Echo-Allowed", "false"],
  ["X-Kourosh-Correlation-Replay-Regression-Contract-Safe-Message-Only", "true"],
  [
    "X-Kourosh-Correlation-Replay-Regression-Contract-Repository-Lookup-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Regression-Contract-Snapshot-Filter-Allowed",
    "false",
  ],
  ["X-Kourosh-Correlation-Replay-Regression-Contract-State-Store-Allowed", "false"],
  ["X-Kourosh-Correlation-Replay-Regression-Contract-Cache-Key-Allowed", "false"],
  [
    "X-Kourosh-Correlation-Replay-Regression-Contract-Idempotency-Key-Allowed",
    "false",
  ],
  ["X-Kourosh-Correlation-Replay-Regression-Contract-Replay-Store-Allowed", "false"],
  ["X-Kourosh-Correlation-Replay-Regression-Contract-Mutation-Allowed", "false"],
  // Phase 25L: final compatibility guard for Phase 25G-25K markers.
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Guard-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_PHASE,
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Guard-Scope",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_SCOPE,
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Guard-Locked-Phases",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_CORRELATION_REPLAY_CONTRACT_FINAL_COMPATIBILITY_GUARD_LOCKED_PHASES,
  ],
  ["X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Raw-Echo-Allowed", "false"],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Safe-Message-Only",
    "true",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Repository-Lookup-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Snapshot-Filter-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-State-Store-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Cache-Key-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Idempotency-Key-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Replay-Store-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Compatibility-Store-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Correlation-Replay-Contract-Final-Compatibility-Mutation-Allowed",
    "false",
  ],
  [
    "X-Kourosh-Error-Contract-Version",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_ERROR_CONTRACT_VERSION,
  ],
  ["X-Kourosh-Model-Execution-Allowed", "false"],
  ["X-Kourosh-Inference-Endpoint-Exposed", "false"],
  ["X-Kourosh-Artifact-Activation-Allowed", "false"],
  ["X-Kourosh-Business-Mutation-Allowed", "false"],
  [
    "X-Kourosh-Response-Contract-Version",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE_RESPONSE_CONTRACT_VERSION,
  ],
] as const;

const setContractHeaders = (req: Request, res: Response): void => {
  const correlation = sanitizeCorrelationId(req);
  setStaticSnapshotRouteContractHeaders(
    res,
    SNAPSHOT_ROUTE_STATIC_CONTRACT_HEADERS,
  );
  res.setHeader("X-Kourosh-Correlation-Id", correlation.id);
  res.setHeader(
    "X-Kourosh-Correlation-Id-Sanitized",
    String(correlation.sanitized),
  );
  res.setHeader("X-Kourosh-Correlation-Id-Source", correlation.source);
};

const sendError = (
  req: Request,
  res: Response,
  code: ReceiptExportPackageSnapshotRouteErrorCode,
  statusCode = statusForErrorCode(code),
): void => {
  setContractHeaders(req, res);
  res.status(statusCode).json(buildErrorEnvelope(code, statusCode));
};

const sendRuntimeBoundaryError = (
  req: Request,
  res: Response,
  next: NextFunction,
  err: unknown,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }
  sendError(req, res, classifyCaughtRouteError(err));
};

type RuntimeBoundaryHandler = (req: Request, res: Response, next: NextFunction) => unknown;

const withRuntimeErrorBoundary =
  (handler: RuntimeBoundaryHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const safeNext: NextFunction = (err?: unknown): void => {
      if (err) {
        sendRuntimeBoundaryError(req, res, next, err);
        return;
      }
      next();
    };

    try {
      const maybePromise = handler(req, res, safeNext);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<unknown>).then === "function"
      ) {
        return (maybePromise as Promise<unknown>).catch((err) =>
          sendRuntimeBoundaryError(req, res, next, err),
        );
      }
      return undefined;
    } catch (err) {
      sendRuntimeBoundaryError(req, res, next, err);
      return undefined;
    }
  };

export const registerMlShadowScoreImportApplyReceiptExportPackageSnapshotReadModelRoutes =
  (app: Express, { authorizeRole }: IntelligenceRouteDeps): void => {
    app.get(
      INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_ROUTE,
      withRuntimeErrorBoundary(
        (req: Request, res: Response, next: NextFunction) => {
          setContractHeaders(req, res);
          next();
        },
      ),
      withRuntimeErrorBoundary(
        authorizeRole(["Admin", "Manager"]) as RequestHandler,
      ),
      withRuntimeErrorBoundary(async (req, res: Response) => {
        const queryErrorCode = validateQuery(req.query);
        if (queryErrorCode) {
          sendError(req, res, queryErrorCode);
          return;
        }

        const snapshotId = stringValue(req.query.snapshotId);
        const snapshots = snapshotId
          ? [
              await getShadowScoreImportApplyReceiptExportPackageSnapshotBySnapshotId(
                snapshotId,
              ),
            ].filter(
              (
                snapshot,
              ): snapshot is StoredShadowScoreImportApplyReceiptExportPackageSnapshot =>
                Boolean(snapshot),
            )
          : await listShadowScoreImportApplyReceiptExportPackageSnapshots(
              toListOptions(req.query),
            );
        const summary =
          await getShadowScoreImportApplyReceiptExportPackageSnapshotSummary();
        res.json(buildSuccessEnvelope(snapshots, summary, req.query));
      }),
    );
  };
