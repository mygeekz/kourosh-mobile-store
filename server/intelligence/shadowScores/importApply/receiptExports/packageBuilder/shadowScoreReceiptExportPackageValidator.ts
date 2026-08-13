import type { MetadataOnlyReceiptExportItem, MetadataOnlyReceiptExportPackage, MetadataOnlyReceiptExportPackageValidationResult } from './shadowScoreReceiptExportPackageTypes';
import { METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_TYPE, METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_VERSION } from './shadowScoreReceiptExportPackageTypes';

const FORBIDDEN_FIELD_PATTERNS = [
  /model\.joblib/i,
  /rawCsv/i,
  /trainCsv/i,
  /testCsv/i,
  /filePath/i,
  /workbenchOutputPath/i,
  /modelPath/i,
  /csvPath/i,
  /runInference/i,
  /executeModel/i,
  /activateArtifact/i,
  /activate_artifact/i,
  /deploy_model/i,
  /write_inventory/i,
  /write_accounting/i,
  /write_ledger/i,
  /write_report/i,
  /mutate_ledger/i,
  /create_invoice/i,
  /change_price/i,
  /set_stock/i,
  /auto_order/i,
  /production_action/i,
  /auto_decision/i,
  /raw unsafe payload/i,
  /stack trace/i,
  /SQLITE_/i,
];

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const SAFE_NEGATED_CONTRACT_FIELDS = new Set(['containsRawCsv']);

export const containsForbiddenReceiptExportPackageFieldOrValue = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some(containsForbiddenReceiptExportPackageFieldOrValue);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nestedValue]) => {
    if (SAFE_NEGATED_CONTRACT_FIELDS.has(key) && nestedValue === false) return false;
    if (FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key))) return true;
    return containsForbiddenReceiptExportPackageFieldOrValue(nestedValue);
  });
};

const receiptIsMetadataOnly = (receipt: MetadataOnlyReceiptExportItem): boolean => receipt.metadataOnly === true
  && receipt.modelExecutionAllowed === false
  && receipt.inferenceEndpointExposed === false
  && receipt.artifactActivationAllowed === false
  && receipt.businessMutationAllowed === false;

export const validateMetadataOnlyReceiptExportPackage = (value: unknown): MetadataOnlyReceiptExportPackageValidationResult => {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['package_must_be_object'] };
  const candidate = value as MetadataOnlyReceiptExportPackage;
  if (candidate.packageType !== METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_TYPE) errors.push('package_type_invalid');
  if (candidate.packageVersion !== METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_VERSION) errors.push('package_version_invalid');
  if (!isRecord(candidate.safety)) errors.push('safety_missing');
  if (candidate.safety?.metadataOnly !== true) errors.push('metadata_only_required');
  if (candidate.safety?.modelExecutionAllowed !== false) errors.push('model_execution_must_remain_false');
  if (candidate.safety?.inferenceEndpointExposed !== false) errors.push('inference_endpoint_must_remain_false');
  if (candidate.safety?.artifactActivationAllowed !== false) errors.push('artifact_activation_must_remain_false');
  if (candidate.safety?.businessMutationAllowed !== false) errors.push('business_mutation_must_remain_false');
  if (candidate.safety?.containsModelBytes !== false) errors.push('model_bytes_must_be_absent');
  if (candidate.safety?.containsRawCsv !== false) errors.push('raw_csv_must_be_absent');
  if (candidate.safety?.containsFilesystemPaths !== false) errors.push('filesystem_paths_must_be_absent');
  if (!Array.isArray(candidate.receipts)) errors.push('receipts_must_be_array');
  if (!isRecord(candidate.checksums) || typeof candidate.checksums.contentHash !== 'string' || typeof candidate.checksums.receiptHash !== 'string') errors.push('checksums_required');
  if (containsForbiddenReceiptExportPackageFieldOrValue(candidate)) errors.push('forbidden_field_or_payload_detected');
  if (Array.isArray(candidate.receipts)) {
    candidate.receipts.forEach((receipt, index) => {
      if (!isRecord(receipt)) {
        errors.push(`receipt_${index}_must_be_object`);
        return;
      }
      if (!receiptIsMetadataOnly(receipt as MetadataOnlyReceiptExportItem)) errors.push(`receipt_${index}_safety_flags_invalid`);
      if (containsForbiddenReceiptExportPackageFieldOrValue(receipt)) errors.push(`receipt_${index}_contains_forbidden_field`);
    });
  }
  return { valid: errors.length === 0, errors };
};
