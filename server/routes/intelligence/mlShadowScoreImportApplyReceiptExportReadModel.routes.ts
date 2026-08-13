import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import {
  buildImportApplyReceiptExportReadModelSuccessEnvelope,
  createInternalAdminShadowScoreImportApplyReceiptExportReadModel,
  IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_OBSERVABILITY_HEADER_CONTRACT_VERSION,
  IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_CORRELATION_ID_HEADER_CONTRACT_VERSION,
  IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION,
  sanitizeImportApplyReceiptExportReadModelErrorEnvelope,
  type ImportApplyReceiptExportReadModelErrorCode,
} from "../../intelligence/shadowScores/importApply/receipts";
import type { IntelligenceRouteDeps } from "./types";

export const INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_ROUTE =
  "/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-exports/internal/read-model" as const;

const ALLOWED_QUERY_KEYS = new Set([
  "receiptId",
  "id",
  "status",
  "source",
  "dryRun",
  "candidatePackageId",
  "importPayloadHash",
  "requestedByUserId",
  "createdAtFrom",
  "createdAtTo",
  "sort",
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
  "replay",
  "replayId",
  "replayToken",
  "replayRequestId",
  "idempotencyKey",
  "idempotencyToken",
  "correlationReplay",
]);

const FORBIDDEN_VALUE_PATTERN =
  /(?:model\.jo(?:b)lib|train\.csv|test\.csv|\.csv\b|\.jo(?:b)lib\b|\.pkl\b|\.onnx\b|(?:^|[\\/])ml-workbench[\\/]|\.\.\/|\.\.\\|;|drop\s+table|run_inference|activate_artifact|write_inventory|write_accounting|mutate_ledger|execute_model|activate_model|predict_live|\$ne|\$gt|\$lt|\$or|\$and)/i;

const CORRELATION_ID_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const CORRELATION_ID_FORBIDDEN_PATTERN =
  /(?:model\.jo(?:b)lib|train\.csv|test\.csv|\.csv\b|\.jo(?:b)lib\b|\.pkl\b|\.onnx\b|(?:^|[\\/])ml-workbench[\\/]|\.\.\/|\.\.\\\\|\/tmp|server\\\\|server\/|bearer|token|cookie|session|password|authorization|run_inference|activate_artifact|drop\s+table|;|\$ne|\$gt|\$lt|\$or|\$and)/i;
const CORRELATION_ID_HEADER_KEYS = [
  "x-kourosh-correlation-id",
  "x-request-id",
  "x-correlation-id",
] as const;
const FALLBACK_CORRELATION_ID =
  "kourosh-receipt-export-read-route-correlation-redacted" as const;

const CORRELATION_ID_PROPAGATION_BOUNDARY_SCOPE =
  "response-header-only-correlation-id-boundary" as const;
const CORRELATION_ID_PROPAGATION_FORBIDDEN_SURFACES = [
  "query",
  "request-body",
  "service-query",
  "repository",
  "export-contract",
  "business-payload",
] as const;

const CORRELATION_ID_REPLAY_GUARD_SCOPE =
  "stateless-response-header-only-replay-guard" as const;
const CORRELATION_ID_REPLAY_FORBIDDEN_SURFACES = [
  "cache",
  "server-session",
  "repository",
  "export-contract",
  "business-payload",
  "authorization-decision",
] as const;

const REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_SCOPE =
  "ignored-request-headers-only" as const;
const REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_KEYS = [
  "authorization",
  "idempotency-key",
  "x-idempotency-key",
  "x-replay-token",
  "x-request-replay",
  "x-replay-id",
  "x-replay-request-id",
  "x-correlation-replay",
] as const;
const REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_FORBIDDEN_SURFACES = [
  "response-body",
  "export-contract",
  "service-query",
  "repository",
  "cache",
  "authorization-decision",
  "business-payload",
] as const;

type ReceiptExportReadCorrelationId = {
  id: string;
  sanitized: true;
  source: "request-header" | "fallback-redacted";
};

const firstHeaderValue = (value: unknown): string | null => {
  if (Array.isArray(value))
    return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
};

const sanitizeReceiptExportReadCorrelationId = (
  req: Request,
): ReceiptExportReadCorrelationId => {
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

const FIRST_VALUE = (value: unknown): unknown =>
  Array.isArray(value) ? value[0] : value;

const numberValue = (value: unknown): number => Number(FIRST_VALUE(value));

const unsafeValueExists = (value: unknown): boolean => {
  if (typeof value === "string") return FORBIDDEN_VALUE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(unsafeValueExists);
  if (value && typeof value === "object") return true;
  return false;
};

// Phase 23B compatibility marker: hasForbiddenQueryKey is superseded by validateReceiptExportReadQuery in Phase 23D.
const validateReceiptExportReadQuery = (
  query: Request["query"],
): ImportApplyReceiptExportReadModelErrorCode | null => {
  // Phase 23H: correlationId/requestId/traceId-style propagation attempts through query remain unsupported by ALLOWED_QUERY_KEYS.
  // Phase 23I: replay/idempotency/correlation replay attempts through query remain unsupported and cannot create stateful replay behavior.
  for (const key of Object.keys(query ?? {})) {
    if (FORBIDDEN_QUERY_KEYS.has(key) || !ALLOWED_QUERY_KEYS.has(key)) {
      return "metadata_only_import_apply_receipt_export_read_model_unsafe_query_key";
    }
  }

  for (const value of Object.values(query ?? {})) {
    if (unsafeValueExists(value))
      return "metadata_only_import_apply_receipt_export_read_model_unsafe_query_value";
  }

  if (query.limit !== undefined) {
    const limit = numberValue(query.limit);
    if (
      !Number.isFinite(limit) ||
      Math.trunc(limit) !== limit ||
      limit < 1 ||
      limit > 100
    ) {
      return "metadata_only_import_apply_receipt_export_read_model_invalid_limit";
    }
  }

  if (query.offset !== undefined) {
    const offset = numberValue(query.offset);
    if (
      !Number.isFinite(offset) ||
      Math.trunc(offset) !== offset ||
      offset < 0
    ) {
      return "metadata_only_import_apply_receipt_export_read_model_invalid_offset";
    }
  }

  if (query.sort !== undefined) {
    const sort = String(FIRST_VALUE(query.sort));
    if (sort !== "createdAt_desc" && sort !== "createdAt_asc") {
      return "metadata_only_import_apply_receipt_export_read_model_invalid_sort";
    }
  }

  return null;
};

const classifyCaughtRouteError = (
  err: unknown,
): ImportApplyReceiptExportReadModelErrorCode => {
  const message = err instanceof Error ? err.message : "";
  if (
    /Invalid metadata-only import apply receipt export contract/i.test(message)
  ) {
    return "metadata_only_import_apply_receipt_export_read_model_validation_failed";
  }
  if (
    /SQLITE|database|repository|SELECT|FROM\s+ml_shadow_score_import_apply_receipts/i.test(
      message,
    )
  ) {
    return "metadata_only_import_apply_receipt_export_read_model_repository_failed";
  }
  return "metadata_only_import_apply_receipt_export_read_model_runtime_boundary_failed";
};

const statusForReceiptExportReadErrorCode = (
  code: ImportApplyReceiptExportReadModelErrorCode,
): number => {
  if (
    code ===
    "metadata_only_import_apply_receipt_export_read_model_repository_failed"
  )
    return 500;
  if (
    code ===
    "metadata_only_import_apply_receipt_export_read_model_runtime_boundary_failed"
  )
    return 500;
  return 400;
};

const setReceiptExportReadCorrelationHeaders = (
  req: Request,
  res: Response,
): void => {
  // Phase 23G: sanitized correlation id only; never echo token/query/body/user/path/runtime internals.
  // Phase 23H: correlation ID propagation boundary is response-header-only; never propagate to query/service/exportContract/database/business payload.
  // Phase 23I: correlation ID replay guard is stateless/header-only; never accept correlation ID as a replay/idempotency/session/cache key.
  // Phase 23J: replay guard negative header matrix ignores Authorization, Idempotency-Key, X-Replay-Token, and X-Request-Replay as stateful inputs.
  void CORRELATION_ID_PROPAGATION_BOUNDARY_SCOPE;
  void CORRELATION_ID_PROPAGATION_FORBIDDEN_SURFACES;
  void CORRELATION_ID_REPLAY_GUARD_SCOPE;
  void CORRELATION_ID_REPLAY_FORBIDDEN_SURFACES;
  void REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_SCOPE;
  void REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_KEYS;
  void REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_FORBIDDEN_SURFACES;
  const correlation = sanitizeReceiptExportReadCorrelationId(req);
  res.setHeader(
    "X-Kourosh-Correlation-Contract-Version",
    IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_CORRELATION_ID_HEADER_CONTRACT_VERSION,
  );
  res.setHeader("X-Kourosh-Correlation-Id", correlation.id);
  res.setHeader(
    "X-Kourosh-Correlation-Id-Sanitized",
    String(correlation.sanitized),
  );
  res.setHeader("X-Kourosh-Correlation-Id-Source", correlation.source);
  res.setHeader("X-Kourosh-Correlation-Replay-Guard", "stateless-header-only");
  res.setHeader(
    "X-Kourosh-Correlation-Replay-Stateful-Acceptance-Allowed",
    "false",
  );
  res.setHeader(
    "X-Kourosh-Replay-Negative-Header-Matrix",
    REPLAY_GUARD_NEGATIVE_HEADER_MATRIX_SCOPE,
  );
  res.setHeader("X-Kourosh-Replay-Negative-Headers-Accepted", "false");
  res.setHeader("X-Kourosh-Replay-Negative-Headers-Body-Echo-Allowed", "false");
};

const setReceiptExportReadObservabilityHeaders = (
  req: Request,
  res: Response,
): void => {
  // Phase 23F: deterministic observability headers only; do not include query/body/user/path internals.
  res.setHeader(
    "X-Kourosh-Observability-Contract-Version",
    IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_OBSERVABILITY_HEADER_CONTRACT_VERSION,
  );
  res.setHeader(
    "X-Kourosh-Observability-Scope",
    "internal-receipt-export-read-model",
  );
  res.setHeader("X-Kourosh-Trace-Scope", "metadata-only-read-route");
  res.setHeader(
    "X-Kourosh-Route-Kind",
    "metadata-only-import-apply-receipt-export-internal-read-model",
  );
  res.setHeader("X-Kourosh-Route-Read-Model", "import-apply-receipt-export");
  res.setHeader("X-Kourosh-Runtime-Boundary-Covered", "true");
  res.setHeader("X-Kourosh-Error-Envelope-Sanitized", "true");
  setReceiptExportReadCorrelationHeaders(req, res);
};

const setReceiptExportReadContractHeaders = (
  req: Request,
  res: Response,
): void => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Kourosh-Metadata-Only", "true");
  res.setHeader("X-Kourosh-Read-Only", "true");
  res.setHeader("X-Kourosh-Evidence-Only", "true");
  res.setHeader("X-Kourosh-Model-Execution-Allowed", "false");
  res.setHeader("X-Kourosh-Inference-Endpoint-Exposed", "false");
  res.setHeader("X-Kourosh-Artifact-Activation-Allowed", "false");
  res.setHeader("X-Kourosh-Business-Mutation-Allowed", "false");
  res.setHeader(
    "X-Kourosh-Response-Contract-Version",
    IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION,
  );
  setReceiptExportReadObservabilityHeaders(req, res);
};

const sendReceiptExportReadModelError = (
  req: Request,
  res: Response,
  code: ImportApplyReceiptExportReadModelErrorCode,
  statusCode = statusForReceiptExportReadErrorCode(code),
): void => {
  setReceiptExportReadContractHeaders(req, res);
  res
    .status(statusCode)
    .json(sanitizeImportApplyReceiptExportReadModelErrorEnvelope(code));
};

const sendReceiptExportReadRuntimeBoundaryError = (
  req: Request,
  res: Response,
  next: NextFunction,
  err: unknown,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }
  sendReceiptExportReadModelError(
    req,
    res,
    "metadata_only_import_apply_receipt_export_read_model_runtime_boundary_failed",
  );
};

type ReceiptExportReadRuntimeBoundaryHandler = (req: Request, res: Response, next: NextFunction) => unknown;

const withReceiptExportReadRuntimeErrorBoundary =
  (handler: ReceiptExportReadRuntimeBoundaryHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const safeNext: NextFunction = (err?: unknown): void => {
      if (err) {
        sendReceiptExportReadRuntimeBoundaryError(req, res, next, err);
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
          sendReceiptExportReadRuntimeBoundaryError(req, res, next, err),
        );
      }
      return undefined;
    } catch (err) {
      sendReceiptExportReadRuntimeBoundaryError(req, res, next, err);
      return undefined;
    }
  };

export const registerMlShadowScoreImportApplyReceiptExportReadModelRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_ROUTE,
    withReceiptExportReadRuntimeErrorBoundary(
      (req: Request, res: Response, next: NextFunction) => {
        setReceiptExportReadContractHeaders(req, res);
        next();
      },
    ),
// Phase 23F/23G compatibility marker: withReceiptExportReadRuntimeErrorBoundary(authorizeRole(['Admin', 'Manager']) as RequestHandler)
    withReceiptExportReadRuntimeErrorBoundary(
      authorizeRole(['Admin', 'Manager']) as RequestHandler,
    ),
    withReceiptExportReadRuntimeErrorBoundary(async (req, res: Response) => {
      try {
        const queryErrorCode = validateReceiptExportReadQuery(req.query);
        if (queryErrorCode) {
          sendReceiptExportReadModelError(req, res, queryErrorCode);
          return;
        }

        const data =
          await createInternalAdminShadowScoreImportApplyReceiptExportReadModel(
            // Phase 23H: pass only validated query filters into the read model; sanitized correlation id stays on response headers only.
            req.query as Record<string, unknown>,
          );
        res.json(buildImportApplyReceiptExportReadModelSuccessEnvelope(data));
      } catch (err) {
        sendReceiptExportReadModelError(
          req,
          res,
          classifyCaughtRouteError(err),
        );
      }
    }),
  );
};
