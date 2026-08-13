import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import {
  buildMetadataOnlyReceiptExportPackage,
  validateMetadataOnlyReceiptExportPackage,
  type BuildMetadataOnlyReceiptExportPackageRequest,
  type MetadataOnlyReceiptExportPackage,
} from "../../intelligence/shadowScores/importApply/receiptExports/packageBuilder";
import type { IntelligenceRouteDeps } from "./types";

export const INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE =
  "/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-export-packages/internal/read-model" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_RESPONSE_CONTRACT_VERSION =
  "import_apply_receipt_export_package_route_response_v1" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX_PHASE =
  "Phase 24D" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_VERSION =
  "import_apply_receipt_export_package_route_error_contract_matrix_v1" as const;

const ALLOWED_QUERY_KEYS = new Set([
  "importPayloadHash",
  "candidatePackageId",
  "status",
  "source",
  "dryRun",
  "requestedByUserId",
  "createdAtFrom",
  "createdAtTo",
  "sort",
  "limit",
  "offset",
]);

const ALLOWED_STATUS_VALUES = new Set([
  "applied",
  "dry_run",
  "rejected",
  "partial",
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
const ISO_DATE_TIME_FILTER_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const SAFE_STRING_FILTER_KEYS = [
  "importPayloadHash",
  "candidatePackageId",
  "source",
  "requestedByUserId",
] as const;

const CORRELATION_ID_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const CORRELATION_ID_FORBIDDEN_PATTERN =
  /(?:model\.jo(?:b)lib|train\.csv|test\.csv|\.csv\b|\.jo(?:b)lib\b|\.pkl\b|\.onnx\b|(?:^|[\\/])ml-workbench[\\/]|\.\.\/|\.\.\\|\/tmp|server\\|server\/|bearer|token|cookie|session|password|authorization|run_inference|activate_artifact|drop\s+table|;|\$ne|\$gt|\$lt|\$or|\$and)/i;
const CORRELATION_ID_HEADER_KEYS = [
  "x-kourosh-correlation-id",
  "x-request-id",
  "x-correlation-id",
] as const;
const FALLBACK_CORRELATION_ID =
  "kourosh-receipt-export-package-route-correlation-redacted" as const;

type ReceiptExportPackageRouteErrorCode =
  | "metadata_only_import_apply_receipt_export_package_route_failed"
  | "metadata_only_import_apply_receipt_export_package_route_unsafe_query_key"
  | "metadata_only_import_apply_receipt_export_package_route_unsafe_query_value"
  | "metadata_only_import_apply_receipt_export_package_route_invalid_limit"
  | "metadata_only_import_apply_receipt_export_package_route_invalid_offset"
  | "metadata_only_import_apply_receipt_export_package_route_invalid_sort"
  | "metadata_only_import_apply_receipt_export_package_route_invalid_dry_run"
  | "metadata_only_import_apply_receipt_export_package_route_invalid_status"
  | "metadata_only_import_apply_receipt_export_package_route_invalid_filter_value"
  | "metadata_only_import_apply_receipt_export_package_route_repeated_query_value"
  | "metadata_only_import_apply_receipt_export_package_route_invalid_date_range"
  | "metadata_only_import_apply_receipt_export_package_route_validation_failed"
  | "metadata_only_import_apply_receipt_export_package_route_repository_failed"
  | "metadata_only_import_apply_receipt_export_package_route_runtime_boundary_failed";

const safeMessages: Record<ReceiptExportPackageRouteErrorCode, string> = {
  metadata_only_import_apply_receipt_export_package_route_failed:
    "Invalid metadata-only receipt export package request.",
  metadata_only_import_apply_receipt_export_package_route_unsafe_query_key:
    "Unsupported metadata-only receipt export package query parameter.",
  metadata_only_import_apply_receipt_export_package_route_unsafe_query_value:
    "Unsupported metadata-only receipt export package query value.",
  metadata_only_import_apply_receipt_export_package_route_invalid_limit:
    "Invalid metadata-only receipt export package pagination limit.",
  metadata_only_import_apply_receipt_export_package_route_invalid_offset:
    "Invalid metadata-only receipt export package pagination offset.",
  metadata_only_import_apply_receipt_export_package_route_invalid_sort:
    "Invalid metadata-only receipt export package sort option.",
  metadata_only_import_apply_receipt_export_package_route_invalid_dry_run:
    "Invalid metadata-only receipt export package dry-run filter.",
  metadata_only_import_apply_receipt_export_package_route_invalid_status:
    "Invalid metadata-only receipt export package status filter.",
  metadata_only_import_apply_receipt_export_package_route_invalid_filter_value:
    "Invalid metadata-only receipt export package filter value.",
  metadata_only_import_apply_receipt_export_package_route_repeated_query_value:
    "Repeated metadata-only receipt export package query values are not supported.",
  metadata_only_import_apply_receipt_export_package_route_invalid_date_range:
    "Invalid metadata-only receipt export package date range.",
  metadata_only_import_apply_receipt_export_package_route_validation_failed:
    "Metadata-only receipt export package validation failed.",
  metadata_only_import_apply_receipt_export_package_route_repository_failed:
    "Metadata-only receipt export package repository read failed safely.",
  metadata_only_import_apply_receipt_export_package_route_runtime_boundary_failed:
    "Metadata-only receipt export package runtime boundary handled the failure safely.",
};

const ERROR_CONTRACT_CATEGORIES = [
  "request_validation",
  "package_validation",
  "repository_read",
  "runtime_boundary",
] as const;

type ReceiptExportPackageRouteErrorContractCategory =
  (typeof ERROR_CONTRACT_CATEGORIES)[number];

type ReceiptExportPackageRouteErrorContract = {
  statusCode: 400 | 500;
  category: ReceiptExportPackageRouteErrorContractCategory;
  retryable: boolean;
  safeMessage: string;
  rawErrorExposed: false;
  stackTraceExposed: false;
  filesystemPathExposed: false;
  sqlExposed: false;
};

const buildRouteErrorContract = (
  statusCode: 400 | 500,
  category: ReceiptExportPackageRouteErrorContractCategory,
  retryable: boolean,
  safeMessage: string,
): ReceiptExportPackageRouteErrorContract => ({
  statusCode,
  category,
  retryable,
  safeMessage,
  rawErrorExposed: false,
  stackTraceExposed: false,
  filesystemPathExposed: false,
  sqlExposed: false,
});

const RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX: Record<
  ReceiptExportPackageRouteErrorCode,
  ReceiptExportPackageRouteErrorContract
> = {
  metadata_only_import_apply_receipt_export_package_route_failed:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_failed,
    ),
  metadata_only_import_apply_receipt_export_package_route_unsafe_query_key:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_unsafe_query_key,
    ),
  metadata_only_import_apply_receipt_export_package_route_unsafe_query_value:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_unsafe_query_value,
    ),
  metadata_only_import_apply_receipt_export_package_route_invalid_limit:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_invalid_limit,
    ),
  metadata_only_import_apply_receipt_export_package_route_invalid_offset:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_invalid_offset,
    ),
  metadata_only_import_apply_receipt_export_package_route_invalid_sort:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_invalid_sort,
    ),
  metadata_only_import_apply_receipt_export_package_route_invalid_dry_run:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_invalid_dry_run,
    ),
  metadata_only_import_apply_receipt_export_package_route_invalid_status:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_invalid_status,
    ),
  metadata_only_import_apply_receipt_export_package_route_invalid_filter_value:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_invalid_filter_value,
    ),
  metadata_only_import_apply_receipt_export_package_route_repeated_query_value:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_repeated_query_value,
    ),
  metadata_only_import_apply_receipt_export_package_route_invalid_date_range:
    buildRouteErrorContract(
      400,
      "request_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_invalid_date_range,
    ),
  metadata_only_import_apply_receipt_export_package_route_validation_failed:
    buildRouteErrorContract(
      400,
      "package_validation",
      false,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_validation_failed,
    ),
  metadata_only_import_apply_receipt_export_package_route_repository_failed:
    buildRouteErrorContract(
      500,
      "repository_read",
      true,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_repository_failed,
    ),
  metadata_only_import_apply_receipt_export_package_route_runtime_boundary_failed:
    buildRouteErrorContract(
      500,
      "runtime_boundary",
      true,
      safeMessages.metadata_only_import_apply_receipt_export_package_route_runtime_boundary_failed,
    ),
};

const errorContractForCode = (
  code: ReceiptExportPackageRouteErrorCode,
): ReceiptExportPackageRouteErrorContract =>
  RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX[code] ??
  RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX.metadata_only_import_apply_receipt_export_package_route_failed;

type ReceiptExportPackageCorrelationId = {
  id: string;
  sanitized: true;
  source: "request-header" | "fallback-redacted";
};

const firstValue = (value: unknown): unknown =>
  Array.isArray(value) ? value[0] : value;

const firstHeaderValue = (value: unknown): string | null => {
  if (Array.isArray(value))
    return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
};

const sanitizeCorrelationId = (
  req: Request,
): ReceiptExportPackageCorrelationId => {
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

const numberValue = (value: unknown): number => Number(firstValue(value));

const stringValue = (value: unknown): string | undefined => {
  const selected = firstValue(value);
  if (typeof selected !== "string") return undefined;
  const trimmed = selected.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const booleanFromQuery = (value: unknown): boolean | undefined => {
  const selected = firstValue(value);
  if (selected === true || selected === false) return selected;
  if (selected === "true" || selected === "1") return true;
  if (selected === "false" || selected === "0") return false;
  return undefined;
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
): ReceiptExportPackageRouteErrorCode | null => {
  for (const key of Object.keys(query ?? {})) {
    if (FORBIDDEN_QUERY_KEYS.has(key) || !ALLOWED_QUERY_KEYS.has(key)) {
      return "metadata_only_import_apply_receipt_export_package_route_unsafe_query_key";
    }
  }

  for (const value of Object.values(query ?? {})) {
    if (unsafeValueExists(value)) {
      return "metadata_only_import_apply_receipt_export_package_route_unsafe_query_value";
    }
    if (repeatedQueryValueExists(value)) {
      return "metadata_only_import_apply_receipt_export_package_route_repeated_query_value";
    }
  }

  if (unsafeStringFilterValueExists(query)) {
    return "metadata_only_import_apply_receipt_export_package_route_invalid_filter_value";
  }

  if (invalidDateRangeExists(query)) {
    return "metadata_only_import_apply_receipt_export_package_route_invalid_date_range";
  }

  if (query.limit !== undefined) {
    const limit = numberValue(query.limit);
    if (
      !Number.isFinite(limit) ||
      Math.trunc(limit) !== limit ||
      limit < 1 ||
      limit > 500
    ) {
      return "metadata_only_import_apply_receipt_export_package_route_invalid_limit";
    }
  }

  if (query.offset !== undefined) {
    const offset = numberValue(query.offset);
    if (
      !Number.isFinite(offset) ||
      Math.trunc(offset) !== offset ||
      offset < 0
    ) {
      return "metadata_only_import_apply_receipt_export_package_route_invalid_offset";
    }
  }

  if (query.sort !== undefined) {
    const sort = String(firstValue(query.sort));
    if (sort !== "createdAt_desc" && sort !== "createdAt_asc") {
      return "metadata_only_import_apply_receipt_export_package_route_invalid_sort";
    }
  }

  if (
    query.dryRun !== undefined &&
    booleanFromQuery(query.dryRun) === undefined
  ) {
    return "metadata_only_import_apply_receipt_export_package_route_invalid_dry_run";
  }

  if (query.status !== undefined) {
    const status = stringValue(query.status);
    if (status && !ALLOWED_STATUS_VALUES.has(status)) {
      return "metadata_only_import_apply_receipt_export_package_route_invalid_status";
    }
  }

  return null;
};

const toBuildRequest = (
  query: Request["query"],
): BuildMetadataOnlyReceiptExportPackageRequest => {
  const filters: NonNullable<
    BuildMetadataOnlyReceiptExportPackageRequest["filters"]
  > = {};
  const importPayloadHash = stringValue(query.importPayloadHash);
  const candidatePackageId = stringValue(query.candidatePackageId);
  const status = stringValue(query.status);
  const source = stringValue(query.source);
  const requestedByUserId = stringValue(query.requestedByUserId);
  const createdAtFrom = stringValue(query.createdAtFrom);
  const createdAtTo = stringValue(query.createdAtTo);
  const dryRun = booleanFromQuery(query.dryRun);

  if (importPayloadHash) filters.importPayloadHash = importPayloadHash;
  if (candidatePackageId) filters.candidatePackageId = candidatePackageId;
  if (status) filters.status = status;
  if (source) filters.source = source;
  if (dryRun !== undefined) filters.dryRun = dryRun;
  if (requestedByUserId) filters.requestedByUserId = requestedByUserId;
  if (createdAtFrom) filters.createdAtFrom = createdAtFrom;
  if (createdAtTo) filters.createdAtTo = createdAtTo;

  const request: BuildMetadataOnlyReceiptExportPackageRequest = {
    filters,
    limit: query.limit === undefined ? undefined : numberValue(query.limit),
    offset: query.offset === undefined ? undefined : numberValue(query.offset),
    sort: query.sort === "createdAt_asc" ? "createdAt_asc" : "createdAt_desc",
  };
  return request;
};

const requestedByUserIdFromRequest = (req: Request): string | null => {
  const user = (
    req as Request & {
      user?: { id?: string | number | null; userId?: string | number | null };
    }
  ).user;
  const value = user?.id ?? user?.userId ?? null;
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const buildResponseContract = () => ({
  phase: "Phase 24B" as const,
  contractVersion:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_RESPONSE_CONTRACT_VERSION,
  errorContractVersion:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_VERSION,
  errorContractMatrixPhase:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
  route: `GET ${INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE}` as const,
  routeKind:
    "metadata_only_import_apply_receipt_export_package_internal_read_model_response" as const,
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
    "error",
    "data",
  ] as const,
  dataKeys: [
    "phase",
    "routeKind",
    "metadataOnly",
    "readOnly",
    "evidenceOnly",
    "package",
    "safety",
    "source",
  ] as const,
  validatesPackageBeforeReturn: true,
  errorEnvelopeSanitized: true,
  rawErrorsExposed: false,
  stackTracesExposed: false,
  filesystemPathsExposed: false,
  sqlExposed: false,
  errorCategories: ERROR_CONTRACT_CATEGORIES,
  errorStatusMatrix: RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX,
  metadataOnly: true,
  readOnly: true,
  evidenceOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
});

const buildSuccessEnvelope = (
  packageDocument: MetadataOnlyReceiptExportPackage,
) => ({
  success: true,
  contractVersion:
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_RESPONSE_CONTRACT_VERSION,
  responseContract: buildResponseContract(),
  data: {
    phase: "Phase 24B" as const,
    routeKind:
      "metadata_only_import_apply_receipt_export_package_internal_read_model" as const,
    metadataOnly: true,
    readOnly: true,
    evidenceOnly: true,
    package: packageDocument,
    safety: packageDocument.safety,
    source: {
      packageBuilderPhase: "Phase 24A" as const,
      routePhase: "Phase 24B" as const,
      route: INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE,
    },
  },
  package: packageDocument,
  safety: packageDocument.safety,
});

const buildErrorEnvelope = (
  code: ReceiptExportPackageRouteErrorCode = "metadata_only_import_apply_receipt_export_package_route_failed",
  statusCode = statusForErrorCode(code),
) => {
  const contract = errorContractForCode(code);
  return {
    success: false,
    contractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_RESPONSE_CONTRACT_VERSION,
    responseContract: buildResponseContract(),
    errorContractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_VERSION,
    errorContractMatrixPhase:
      IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
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
    },
    data: null,
  };
};

const classifyCaughtRouteError = (
  err: unknown,
): ReceiptExportPackageRouteErrorCode => {
  const message = err instanceof Error ? err.message : "";
  if (/metadata_only_receipt_export_package_invalid/i.test(message)) {
    return "metadata_only_import_apply_receipt_export_package_route_validation_failed";
  }
  if (
    /SQLITE|database|repository|SELECT|FROM\s+ml_shadow_score_import_apply_receipts/i.test(
      message,
    )
  ) {
    return "metadata_only_import_apply_receipt_export_package_route_repository_failed";
  }
  return "metadata_only_import_apply_receipt_export_package_route_runtime_boundary_failed";
};

const statusForErrorCode = (code: ReceiptExportPackageRouteErrorCode): number =>
  errorContractForCode(code).statusCode;

const setContractHeaders = (req: Request, res: Response): void => {
  const correlation = sanitizeCorrelationId(req);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Kourosh-Metadata-Only", "true");
  res.setHeader("X-Kourosh-Read-Only", "true");
  res.setHeader("X-Kourosh-Evidence-Only", "true");
  res.setHeader(
    "X-Kourosh-Route-Kind",
    "metadata-only-import-apply-receipt-export-package-internal-read-model",
  );
  res.setHeader("X-Kourosh-Package-Builder-Phase", "Phase 24A");
  res.setHeader("X-Kourosh-Route-Phase", "Phase 24B");
  res.setHeader("X-Kourosh-Route-Boundary-Coverage-Phase", "Phase 24C");
  res.setHeader(
    "X-Kourosh-Error-Contract-Matrix-Phase",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_MATRIX_PHASE,
  );
  res.setHeader(
    "X-Kourosh-Error-Contract-Version",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_ERROR_CONTRACT_VERSION,
  );
  res.setHeader("X-Kourosh-Model-Execution-Allowed", "false");
  res.setHeader("X-Kourosh-Inference-Endpoint-Exposed", "false");
  res.setHeader("X-Kourosh-Artifact-Activation-Allowed", "false");
  res.setHeader("X-Kourosh-Business-Mutation-Allowed", "false");
  res.setHeader(
    "X-Kourosh-Response-Contract-Version",
    IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE_RESPONSE_CONTRACT_VERSION,
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
  code: ReceiptExportPackageRouteErrorCode,
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

export const registerMlShadowScoreImportApplyReceiptExportPackageRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    INTERNAL_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_ROUTE,
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

      const correlation = sanitizeCorrelationId(req);
      const packageDocument = await buildMetadataOnlyReceiptExportPackage(
        toBuildRequest(req.query),
        {
          source: "internal_admin",
          requestedByUserId: requestedByUserIdFromRequest(req),
          traceId: correlation.id,
        },
      );
      const validation =
        validateMetadataOnlyReceiptExportPackage(packageDocument);
      if (!validation.valid) {
        sendError(
          req,
          res,
          "metadata_only_import_apply_receipt_export_package_route_validation_failed",
        );
        return;
      }
      res.json(buildSuccessEnvelope(packageDocument));
    }),
  );
};
