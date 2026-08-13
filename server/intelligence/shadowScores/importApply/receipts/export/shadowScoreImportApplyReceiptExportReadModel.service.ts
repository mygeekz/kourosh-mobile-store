import {
  listInternalAdminShadowScoreImportApplyReceiptReadModel,
  type ShadowScoreImportApplyReceiptReadModelQuery,
  type ShadowScoreImportApplyReceiptReadModelPage,
  type ShadowScoreImportApplyReceiptReadModelSummary,
} from "../shadowScoreImportApplyReceiptReadModel.service";
import { createShadowScoreImportApplyReceiptExportContract } from "./shadowScoreImportApplyReceiptExportContract.service";
import type {
  ShadowScoreImportApplyReceiptExportContractEnvelope,
  ShadowScoreImportApplyReceiptExportSafetyAssertions,
} from "./shadowScoreImportApplyReceiptExportContractTypes";

export const IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION =
  "import_apply_receipt_export_read_model_response_v1" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_OBSERVABILITY_HEADER_CONTRACT_VERSION =
  "import_apply_receipt_export_read_model_observability_headers_v1" as const;

export const IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_CORRELATION_ID_HEADER_CONTRACT_VERSION =
  "import_apply_receipt_export_read_model_correlation_id_headers_v1" as const;

export type ShadowScoreImportApplyReceiptExportReadModelResponseContract = {
  phase: "Phase 23C";
  contractVersion: typeof IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION;
  route: "GET /api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-exports/internal/read-model";
  routeKind: "metadata_only_import_apply_receipt_export_internal_read_model_response";
  stableEnvelope: true;
  successEnvelopeKeys: readonly [
    "success",
    "contractVersion",
    "responseContract",
    "data",
  ];
  errorEnvelopeKeys: readonly [
    "success",
    "contractVersion",
    "responseContract",
    "error",
    "data",
  ];
  dataKeys: readonly [
    "exportContract",
    "items",
    "page",
    "summary",
    "filters",
    "safety",
    "source",
  ];
  compatibilityAliasKeys: readonly [
    "exportContract",
    "items",
    "page",
    "summary",
    "filters",
    "safety",
  ];
  itemSource: "data.exportContract.receipts";
  validatesExportContractBeforeReturn: true;
  errorEnvelopeSanitized: true;
  safeErrorCodes: true;
  safeUserFacingMessages: true;
  rawErrorsExposed: false;
  stackTracesExposed: false;
  filesystemPathsExposed: false;
  runtimeBoundaryCovered: true;
  middlewareErrorsSanitized: true;
  observabilityHeadersCovered: true;
  observabilityHeaderContractVersion: typeof IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_OBSERVABILITY_HEADER_CONTRACT_VERSION;
  observabilityHeaderKeys: readonly [
    "X-Kourosh-Observability-Contract-Version",
    "X-Kourosh-Observability-Scope",
    "X-Kourosh-Trace-Scope",
    "X-Kourosh-Route-Kind",
    "X-Kourosh-Route-Read-Model",
    "X-Kourosh-Runtime-Boundary-Covered",
    "X-Kourosh-Error-Envelope-Sanitized",
  ];
  observabilityHeadersSensitiveDataFree: true;
  correlationIdSanitizationCovered: true;
  correlationIdHeaderContractVersion: typeof IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_CORRELATION_ID_HEADER_CONTRACT_VERSION;
  correlationIdHeaderKeys: readonly [
    "X-Kourosh-Correlation-Contract-Version",
    "X-Kourosh-Correlation-Id",
    "X-Kourosh-Correlation-Id-Sanitized",
    "X-Kourosh-Correlation-Id-Source",
  ];
  correlationIdHeadersSensitiveDataFree: true;
  correlationIdPropagationBoundaryCovered: true;
  correlationIdPropagationBoundaryScope: "response-header-only";
  correlationIdResponseBodyExcluded: true;
  correlationIdExportContractExcluded: true;
  correlationIdRepositoryPropagationAllowed: false;
  correlationIdServiceQueryPropagationAllowed: false;
  correlationIdBusinessPayloadPropagationAllowed: false;
  correlationIdReplayGuardCovered: true;
  correlationIdReplayGuardScope: "stateless-header-only-read-route";
  correlationIdReplayHeaderKeys: readonly [
    "X-Kourosh-Correlation-Replay-Guard",
    "X-Kourosh-Correlation-Replay-Stateful-Acceptance-Allowed",
  ];
  correlationIdReplayStatefulAcceptanceAllowed: false;
  correlationIdReplayCacheAllowed: false;
  correlationIdReplayRepositoryLookupAllowed: false;
  correlationIdReplayPrivilegeElevationAllowed: false;
  correlationIdReplayMutationAllowed: false;
  replayGuardNegativeHeaderMatrixCovered: true;
  replayGuardNegativeHeaderMatrixScope: "ignored-request-headers-only";
  replayGuardNegativeHeaderMatrixHeaderKeys: readonly [
    "Authorization",
    "Idempotency-Key",
    "X-Idempotency-Key",
    "X-Replay-Token",
    "X-Request-Replay",
    "X-Replay-Id",
    "X-Replay-Request-Id",
    "X-Correlation-Replay",
  ];
  replayGuardNegativeHeaderMatrixStatefulAcceptanceAllowed: false;
  replayGuardNegativeHeaderMatrixBodyEchoAllowed: false;
  replayGuardNegativeHeaderMatrixRepositoryLookupAllowed: false;
  replayGuardNegativeHeaderMatrixExportContractPropagationAllowed: false;
  replayGuardNegativeHeaderMatrixAuthDecisionAllowed: false;
  replayGuardNegativeHeaderMatrixMutationAllowed: false;
  metadataOnly: true;
  readOnly: true;
  evidenceOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
};

export type ImportApplyReceiptExportReadModelErrorCode =
  | "metadata_only_import_apply_receipt_export_read_model_failed"
  | "metadata_only_import_apply_receipt_export_read_model_unsafe_query_key"
  | "metadata_only_import_apply_receipt_export_read_model_unsafe_query_value"
  | "metadata_only_import_apply_receipt_export_read_model_invalid_limit"
  | "metadata_only_import_apply_receipt_export_read_model_invalid_offset"
  | "metadata_only_import_apply_receipt_export_read_model_invalid_sort"
  | "metadata_only_import_apply_receipt_export_read_model_validation_failed"
  | "metadata_only_import_apply_receipt_export_read_model_repository_failed"
  | "metadata_only_import_apply_receipt_export_read_model_runtime_boundary_failed"
  | "metadata_only_import_apply_receipt_export_read_model_unauthorized"
  | "metadata_only_import_apply_receipt_export_read_model_forbidden";

const safeMessages: Record<ImportApplyReceiptExportReadModelErrorCode, string> =
  {
    metadata_only_import_apply_receipt_export_read_model_failed:
      "Invalid metadata-only import apply receipt export read-model request.",
    metadata_only_import_apply_receipt_export_read_model_unsafe_query_key:
      "Unsupported metadata-only receipt export query parameter.",
    metadata_only_import_apply_receipt_export_read_model_unsafe_query_value:
      "Unsupported metadata-only receipt export query value.",
    metadata_only_import_apply_receipt_export_read_model_invalid_limit:
      "Invalid metadata-only receipt export pagination limit.",
    metadata_only_import_apply_receipt_export_read_model_invalid_offset:
      "Invalid metadata-only receipt export pagination offset.",
    metadata_only_import_apply_receipt_export_read_model_invalid_sort:
      "Invalid metadata-only receipt export sort option.",
    metadata_only_import_apply_receipt_export_read_model_validation_failed:
      "Metadata-only receipt export contract validation failed.",
    metadata_only_import_apply_receipt_export_read_model_repository_failed:
      "Metadata-only receipt export read-model repository failed safely.",
    metadata_only_import_apply_receipt_export_read_model_runtime_boundary_failed:
      "Metadata-only receipt export read-model runtime boundary handled the failure safely.",
    metadata_only_import_apply_receipt_export_read_model_unauthorized:
      "Authentication is required for the metadata-only receipt export read model.",
    metadata_only_import_apply_receipt_export_read_model_forbidden:
      "This role cannot access the metadata-only receipt export read model.",
  };

export const buildImportApplyReceiptExportReadModelResponseContract =
  (): ShadowScoreImportApplyReceiptExportReadModelResponseContract => ({
    phase: "Phase 23C",
    contractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION,
    route:
      "GET /api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-exports/internal/read-model",
    routeKind:
      "metadata_only_import_apply_receipt_export_internal_read_model_response",
    stableEnvelope: true,
    successEnvelopeKeys: [
      "success",
      "contractVersion",
      "responseContract",
      "data",
    ],
    errorEnvelopeKeys: [
      "success",
      "contractVersion",
      "responseContract",
      "error",
      "data",
    ],
    dataKeys: [
      "exportContract",
      "items",
      "page",
      "summary",
      "filters",
      "safety",
      "source",
    ],
    compatibilityAliasKeys: [
      "exportContract",
      "items",
      "page",
      "summary",
      "filters",
      "safety",
    ],
    itemSource: "data.exportContract.receipts",
    validatesExportContractBeforeReturn: true,
    errorEnvelopeSanitized: true,
    safeErrorCodes: true,
    safeUserFacingMessages: true,
    rawErrorsExposed: false,
    stackTracesExposed: false,
    filesystemPathsExposed: false,
    runtimeBoundaryCovered: true,
    middlewareErrorsSanitized: true,
    observabilityHeadersCovered: true,
    observabilityHeaderContractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_OBSERVABILITY_HEADER_CONTRACT_VERSION,
    observabilityHeaderKeys: [
      "X-Kourosh-Observability-Contract-Version",
      "X-Kourosh-Observability-Scope",
      "X-Kourosh-Trace-Scope",
      "X-Kourosh-Route-Kind",
      "X-Kourosh-Route-Read-Model",
      "X-Kourosh-Runtime-Boundary-Covered",
      "X-Kourosh-Error-Envelope-Sanitized",
    ],
    observabilityHeadersSensitiveDataFree: true,
    correlationIdSanitizationCovered: true,
    correlationIdHeaderContractVersion:
      IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_CORRELATION_ID_HEADER_CONTRACT_VERSION,
    correlationIdHeaderKeys: [
      "X-Kourosh-Correlation-Contract-Version",
      "X-Kourosh-Correlation-Id",
      "X-Kourosh-Correlation-Id-Sanitized",
      "X-Kourosh-Correlation-Id-Source",
    ],
    correlationIdHeadersSensitiveDataFree: true,
    correlationIdPropagationBoundaryCovered: true,
    correlationIdPropagationBoundaryScope: "response-header-only",
    correlationIdResponseBodyExcluded: true,
    correlationIdExportContractExcluded: true,
    correlationIdRepositoryPropagationAllowed: false,
    correlationIdServiceQueryPropagationAllowed: false,
    correlationIdBusinessPayloadPropagationAllowed: false,
    correlationIdReplayGuardCovered: true,
    correlationIdReplayGuardScope: "stateless-header-only-read-route",
    correlationIdReplayHeaderKeys: [
      "X-Kourosh-Correlation-Replay-Guard",
      "X-Kourosh-Correlation-Replay-Stateful-Acceptance-Allowed",
    ],
    correlationIdReplayStatefulAcceptanceAllowed: false,
    correlationIdReplayCacheAllowed: false,
    correlationIdReplayRepositoryLookupAllowed: false,
    correlationIdReplayPrivilegeElevationAllowed: false,
    correlationIdReplayMutationAllowed: false,
    replayGuardNegativeHeaderMatrixCovered: true,
    replayGuardNegativeHeaderMatrixScope: "ignored-request-headers-only",
    replayGuardNegativeHeaderMatrixHeaderKeys: [
      "Authorization",
      "Idempotency-Key",
      "X-Idempotency-Key",
      "X-Replay-Token",
      "X-Request-Replay",
      "X-Replay-Id",
      "X-Replay-Request-Id",
      "X-Correlation-Replay",
    ],
    replayGuardNegativeHeaderMatrixStatefulAcceptanceAllowed: false,
    replayGuardNegativeHeaderMatrixBodyEchoAllowed: false,
    replayGuardNegativeHeaderMatrixRepositoryLookupAllowed: false,
    replayGuardNegativeHeaderMatrixExportContractPropagationAllowed: false,
    replayGuardNegativeHeaderMatrixAuthDecisionAllowed: false,
    replayGuardNegativeHeaderMatrixMutationAllowed: false,
    metadataOnly: true,
    readOnly: true,
    evidenceOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
  });

export type ShadowScoreImportApplyReceiptExportReadModelSummary =
  ShadowScoreImportApplyReceiptReadModelSummary & {
    evidenceOnly: true;
    modelExecutionAllowed: false;
    inferenceEndpointExposed: false;
    artifactActivationAllowed: false;
    businessMutationAllowed: false;
  };

export type ShadowScoreImportApplyReceiptExportReadModelResult = {
  phase: "Phase 23A";
  routeKind: "metadata_only_import_apply_receipt_export_internal_read_model";
  metadataOnly: true;
  readOnly: true;
  evidenceOnly: true;
  responseContractVersion: typeof IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION;
  responseContractPhase: "Phase 23C";
  exportContract: ShadowScoreImportApplyReceiptExportContractEnvelope;
  items: ShadowScoreImportApplyReceiptExportContractEnvelope["receipts"];
  page: ShadowScoreImportApplyReceiptReadModelPage;
  summary: ShadowScoreImportApplyReceiptExportReadModelSummary;
  filters: ShadowScoreImportApplyReceiptExportContractEnvelope["source"]["filterSummary"];
  safety: ShadowScoreImportApplyReceiptExportSafetyAssertions;
  source: {
    readModelPhase: "Phase 20B";
    exportContractPhase: "Phase 21A";
    routePhase: "Phase 23A";
    readModelRoute: "/api/brain/ml-shadow-scores/metadata-only/import-apply-receipts/internal/read-model";
    exportRoute: "/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-exports/internal/read-model";
  };
  generatedAt: string;
};

export const buildImportApplyReceiptExportReadModelSafetySummary =
  (): ShadowScoreImportApplyReceiptExportSafetyAssertions => ({
    metadataOnly: true,
    readOnly: true,
    evidenceOnly: true,
    modelExecutionAllowed: false,
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    productionIntegrationAllowed: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    canChangePricing: false,
    canChangeReports: false,
    canChangeLedger: false,
    canMutateBusinessRecords: false,
    artifactExecutionAllowed: false,
    artifactActivationAllowed: false,
    artifactBytesLoadingAllowed: false,
    rawTrainingCsvLoadingAllowed: false,
    automaticDeletionAllowed: false,
    purgeJobAllowed: false,
    containsModelBinary: false,
    containsRawCsv: false,
    containsFilesystemPath: false,
    containsInferenceDirective: false,
    containsActivationDirective: false,
    containsBusinessMutationDirective: false,
    containsProductionDecision: false,
  });

export const createInternalAdminShadowScoreImportApplyReceiptExportReadModel =
  async (
    query: ShadowScoreImportApplyReceiptReadModelQuery = {},
  ): Promise<ShadowScoreImportApplyReceiptExportReadModelResult> => {
    const readModel =
      await listInternalAdminShadowScoreImportApplyReceiptReadModel(query);
    // validation-before-return is enforced inside createShadowScoreImportApplyReceiptExportContract.
    const exportContract =
      createShadowScoreImportApplyReceiptExportContract(readModel);
    const safety = buildImportApplyReceiptExportReadModelSafetySummary();

    return {
      phase: "Phase 23A",
      routeKind:
        "metadata_only_import_apply_receipt_export_internal_read_model",
      metadataOnly: true,
      readOnly: true,
      evidenceOnly: true,
      responseContractVersion:
        IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION,
      responseContractPhase: "Phase 23C",
      exportContract,
      items: exportContract.receipts,
      page: readModel.page,
      summary: {
        ...readModel.summary,
        evidenceOnly: true,
        modelExecutionAllowed: false,
        inferenceEndpointExposed: false,
        artifactActivationAllowed: false,
        businessMutationAllowed: false,
      },
      filters: readModel.filters,
      safety,
      source: {
        readModelPhase: "Phase 20B",
        exportContractPhase: "Phase 21A",
        routePhase: "Phase 23A",
        readModelRoute:
          "/api/brain/ml-shadow-scores/metadata-only/import-apply-receipts/internal/read-model",
        exportRoute:
          "/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-exports/internal/read-model",
      },
      generatedAt: new Date().toISOString(),
    };
  };

export const buildImportApplyReceiptExportReadModelSuccessEnvelope = (
  data: ShadowScoreImportApplyReceiptExportReadModelResult,
) => ({
  success: true,
  contractVersion:
    IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION,
  responseContract: buildImportApplyReceiptExportReadModelResponseContract(),
  data,
  exportContract: data.exportContract,
  items: data.items,
  page: data.page,
  summary: data.summary,
  filters: data.filters,
  safety: data.safety,
});

export const buildImportApplyReceiptExportReadModelErrorEnvelope = (
  code: ImportApplyReceiptExportReadModelErrorCode = "metadata_only_import_apply_receipt_export_read_model_failed",
) => ({
  success: false,
  contractVersion:
    IMPORT_APPLY_RECEIPT_EXPORT_READ_MODEL_RESPONSE_CONTRACT_VERSION,
  responseContract: buildImportApplyReceiptExportReadModelResponseContract(),
  error: {
    code,
    message:
      safeMessages[code] ??
      safeMessages.metadata_only_import_apply_receipt_export_read_model_failed,
    safe: true,
  },
  data: null,
});

export const sanitizeImportApplyReceiptExportReadModelErrorEnvelope = (
  code: ImportApplyReceiptExportReadModelErrorCode = "metadata_only_import_apply_receipt_export_read_model_failed",
) => buildImportApplyReceiptExportReadModelErrorEnvelope(code);
