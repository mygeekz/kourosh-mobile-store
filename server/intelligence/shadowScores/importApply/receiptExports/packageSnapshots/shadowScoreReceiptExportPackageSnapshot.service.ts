import { buildMetadataOnlyReceiptExportPackage } from '../packageBuilder/shadowScoreReceiptExportPackageBuilder';
import {
  containsForbiddenReceiptExportPackageFieldOrValue,
  validateMetadataOnlyReceiptExportPackage,
} from '../packageBuilder/shadowScoreReceiptExportPackageValidator';
import type { BuildMetadataOnlyReceiptExportPackageOptions, BuildMetadataOnlyReceiptExportPackageRequest, MetadataOnlyReceiptExportPackage } from '../packageBuilder/shadowScoreReceiptExportPackageTypes';
import { recordShadowScoreImportApplyReceiptExportPackageSnapshot } from '../../../../../db/domains/ml/shadowScores/importApplyReceiptExportPackageSnapshots';
import { mapMetadataOnlyReceiptExportPackageToSnapshotRecord, mapSnapshotRecordToRepositoryInput } from './shadowScoreReceiptExportPackageSnapshotMapper';
import type { MetadataOnlyReceiptExportPackageSnapshotPersistenceResult, PersistMetadataOnlyReceiptExportPackageSnapshotOptions } from './shadowScoreReceiptExportPackageSnapshotTypes';

const assertPackageCanBePersistedAsSnapshot = (packageDocument: MetadataOnlyReceiptExportPackage): void => {
  const validation = validateMetadataOnlyReceiptExportPackage(packageDocument);
  if (!validation.valid) throw new Error(`metadata_only_receipt_export_package_snapshot_invalid:${validation.errors.join('|')}`);
  if (packageDocument.safety.metadataOnly !== true) throw new Error('snapshot_package_metadata_only_required');
  if (
    packageDocument.safety.modelExecutionAllowed !== false
    || packageDocument.safety.inferenceEndpointExposed !== false
    || packageDocument.safety.artifactActivationAllowed !== false
    || packageDocument.safety.businessMutationAllowed !== false
    || packageDocument.safety.containsModelBytes !== false
    || packageDocument.safety.containsRawCsv !== false
    || packageDocument.safety.containsFilesystemPaths !== false
  ) {
    throw new Error('snapshot_package_safety_flags_must_remain_false');
  }
  if (containsForbiddenReceiptExportPackageFieldOrValue(packageDocument)) {
    throw new Error('snapshot_package_forbidden_payload_detected');
  }
};

export const persistMetadataOnlyReceiptExportPackageSnapshot = async (
  packageDocument: MetadataOnlyReceiptExportPackage,
  options: PersistMetadataOnlyReceiptExportPackageSnapshotOptions = {},
): Promise<MetadataOnlyReceiptExportPackageSnapshotPersistenceResult> => {
  assertPackageCanBePersistedAsSnapshot(packageDocument);
  const snapshotRecord = mapMetadataOnlyReceiptExportPackageToSnapshotRecord(packageDocument, options);
  const snapshot = await recordShadowScoreImportApplyReceiptExportPackageSnapshot(mapSnapshotRecordToRepositoryInput(snapshotRecord));
  return {
    persisted: true,
    idempotencyStrategy: 'one_snapshot_per_generated_package_attempt',
    snapshot,
  };
};

export const buildAndPersistMetadataOnlyReceiptExportPackageSnapshot = async (
  request: BuildMetadataOnlyReceiptExportPackageRequest,
  buildOptions: BuildMetadataOnlyReceiptExportPackageOptions,
  snapshotOptions: PersistMetadataOnlyReceiptExportPackageSnapshotOptions = {},
): Promise<{ packageDocument: MetadataOnlyReceiptExportPackage; snapshotResult: MetadataOnlyReceiptExportPackageSnapshotPersistenceResult }> => {
  const packageDocument = await buildMetadataOnlyReceiptExportPackage(request, buildOptions);
  const snapshotResult = await persistMetadataOnlyReceiptExportPackageSnapshot(packageDocument, snapshotOptions);
  return { packageDocument, snapshotResult };
};
