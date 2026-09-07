import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import type { SqliteBindValue } from "../../query";

export type MlWorkbenchImportAnnotationScope = 'metadata_result' | 'trend_signal' | 'offline_metrics_comparison' | 'dashboard';
export type MlWorkbenchImportAnnotationKind = 'operator_note' | 'review_note' | 'risk_note' | 'follow_up' | 'dismissed_signal';
export type MlWorkbenchImportAnnotationSeverity = 'info' | 'watch' | 'warning' | 'resolved';

type AnnotationRow = Record<string, unknown> | undefined | null;

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return { parseError: true };
  }
};

const boolFromDb = (value: unknown): boolean => Number(value) === 1 || value === true;

const normalizeScope = (value: unknown): MlWorkbenchImportAnnotationScope => {
  const text = String(value || '').trim();
  if (text === 'trend_signal' || text === 'offline_metrics_comparison' || text === 'dashboard') return text;
  return 'metadata_result';
};

const normalizeKind = (value: unknown): MlWorkbenchImportAnnotationKind => {
  const text = String(value || '').trim();
  if (text === 'review_note' || text === 'risk_note' || text === 'follow_up' || text === 'dismissed_signal') return text;
  return 'operator_note';
};

const normalizeSeverity = (value: unknown): MlWorkbenchImportAnnotationSeverity => {
  const text = String(value || '').trim();
  if (text === 'watch' || text === 'warning' || text === 'resolved') return text;
  return 'info';
};

const normalizeAnnotationRow = (row: AnnotationRow) => {
  if (!row) return null;
  return {
    id: Number(row.id),
    importResultId: row.importResultId ?? row.import_result_id ?? null,
    candidatePackageId: String(row.candidatePackageId ?? row.candidate_package_id ?? ''),
    annotationScope: normalizeScope(row.annotationScope ?? row.annotation_scope),
    annotationKind: normalizeKind(row.annotationKind ?? row.annotation_kind),
    severity: normalizeSeverity(row.severity),
    signalKey: String(row.signalKey ?? row.signal_key ?? '') || null,
    noteText: String(row.noteText ?? row.note_text ?? ''),
    metadataSnapshot: parseJson(row.metadataSnapshotJson ?? row.metadata_snapshot_json),
    metadataOnly: boolFromDb(row.metadataOnly ?? row.metadata_only),
    modelExecutionAllowed: boolFromDb(row.modelExecutionAllowed ?? row.model_execution_allowed),
    runtimeInvocationAllowed: boolFromDb(row.runtimeInvocationAllowed ?? row.runtime_invocation_allowed),
    inferenceEndpointExposed: boolFromDb(row.inferenceEndpointExposed ?? row.inference_endpoint_exposed),
    artifactActivationAllowed: boolFromDb(row.artifactActivationAllowed ?? row.artifact_activation_allowed),
    artifactBytesLoadingAllowed: boolFromDb(row.artifactBytesLoadingAllowed ?? row.artifact_bytes_loading_allowed),
    rawCsvLoadingAllowed: boolFromDb(row.rawCsvLoadingAllowed ?? row.raw_csv_loading_allowed),
    businessMutationAllowed: boolFromDb(row.businessMutationAllowed ?? row.business_mutation_allowed),
    governanceWorkflowAdded: boolFromDb(row.governanceWorkflowAdded ?? row.governance_workflow_added),
    createdAt: String(row.createdAt ?? row.created_at ?? '') || null,
    createdByUserId: row.createdByUserId ?? row.created_by_user_id ?? null,
  };
};

const selectBase = `
  SELECT id,
         import_result_id AS importResultId,
         candidate_package_id AS candidatePackageId,
         annotation_scope AS annotationScope,
         annotation_kind AS annotationKind,
         severity,
         signal_key AS signalKey,
         note_text AS noteText,
         metadata_snapshot_json AS metadataSnapshotJson,
         metadata_only AS metadataOnly,
         model_execution_allowed AS modelExecutionAllowed,
         runtime_invocation_allowed AS runtimeInvocationAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         artifact_activation_allowed AS artifactActivationAllowed,
         artifact_bytes_loading_allowed AS artifactBytesLoadingAllowed,
         raw_csv_loading_allowed AS rawCsvLoadingAllowed,
         business_mutation_allowed AS businessMutationAllowed,
         governance_workflow_added AS governanceWorkflowAdded,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM ml_workbench_import_result_annotations
`;

export const recordWorkbenchImportResultAnnotation = async (payload: {
  importResultId?: number | null;
  candidatePackageId: string;
  annotationScope?: MlWorkbenchImportAnnotationScope | null;
  annotationKind?: MlWorkbenchImportAnnotationKind | null;
  severity?: MlWorkbenchImportAnnotationSeverity | null;
  signalKey?: string | null;
  noteText: string;
  metadataSnapshot?: unknown;
  createdByUserId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_workbench_import_result_annotations (
        import_result_id, candidate_package_id, annotation_scope, annotation_kind,
        severity, signal_key, note_text, metadata_snapshot_json,
        metadata_only, model_execution_allowed, runtime_invocation_allowed,
        inference_endpoint_exposed, artifact_activation_allowed, artifact_bytes_loading_allowed,
        raw_csv_loading_allowed, business_mutation_allowed, governance_workflow_added,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, 0, 0, 0, 0, ?)
    `,
    [
      payload.importResultId ?? null,
      payload.candidatePackageId,
      normalizeScope(payload.annotationScope),
      normalizeKind(payload.annotationKind),
      normalizeSeverity(payload.severity),
      payload.signalKey || null,
      payload.noteText,
      safeJson(payload.metadataSnapshot ?? {}),
      payload.createdByUserId ?? null,
    ],
  );
  return getWorkbenchImportResultAnnotationById(result.lastID);
};

export const listWorkbenchImportResultAnnotations = async (input: {
  limit?: unknown;
  candidatePackageId?: string | null;
  importResultId?: number | null;
  annotationScope?: MlWorkbenchImportAnnotationScope | null;
  severity?: MlWorkbenchImportAnnotationSeverity | null;
} = {}) => {
  const limit = clampLimit(input.limit, 50, 200);
  const clauses: string[] = [];
  const params: SqliteBindValue[] = [];

  if (input.candidatePackageId) {
    clauses.push('candidate_package_id = ?');
    params.push(input.candidatePackageId);
  }
  if (Number.isFinite(Number(input.importResultId)) && Number(input.importResultId) > 0) {
    clauses.push('import_result_id = ?');
    params.push(Number(input.importResultId));
  }
  if (input.annotationScope) {
    clauses.push('annotation_scope = ?');
    params.push(normalizeScope(input.annotationScope));
  }
  if (input.severity) {
    clauses.push('severity = ?');
    params.push(normalizeSeverity(input.severity));
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await allAsync(
    `${selectBase} ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [...params, limit],
  );
  return rows.map(normalizeAnnotationRow).filter(Boolean);
};


export type MlWorkbenchImportAnnotationSearchFilters = {
  limit?: unknown;
  query?: string | null;
  candidatePackageId?: string | null;
  importResultId?: number | null;
  annotationScope?: MlWorkbenchImportAnnotationScope | null;
  annotationKind?: MlWorkbenchImportAnnotationKind | null;
  severity?: MlWorkbenchImportAnnotationSeverity | null;
  signalKey?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
};

const normalizeSearchTerm = (value: unknown, maxLength = 160): string | null => {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, maxLength) : null;
};

const normalizeDateBound = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (match) => `\\${match}`);

export const searchWorkbenchImportResultAnnotations = async (input: MlWorkbenchImportAnnotationSearchFilters = {}) => {
  const limit = clampLimit(input.limit, 50, 200);
  const clauses: string[] = [];
  const params: SqliteBindValue[] = [];
  const appliedFilters: Record<string, string | number | null> = {};

  const query = normalizeSearchTerm(input.query, 180);
  if (query) {
    clauses.push('(LOWER(candidate_package_id) LIKE LOWER(?) ESCAPE \'\\\' OR LOWER(note_text) LIKE LOWER(?) ESCAPE \'\\\' OR LOWER(COALESCE(signal_key, \'\')) LIKE LOWER(?) ESCAPE \'\\\')');
    const like = `%${escapeLike(query)}%`;
    params.push(like, like, like);
    appliedFilters.query = query;
  }

  const candidatePackageId = normalizeSearchTerm(input.candidatePackageId, 160);
  if (candidatePackageId) {
    clauses.push('candidate_package_id = ?');
    params.push(candidatePackageId);
    appliedFilters.candidatePackageId = candidatePackageId;
  }

  if (Number.isFinite(Number(input.importResultId)) && Number(input.importResultId) > 0) {
    clauses.push('import_result_id = ?');
    params.push(Number(input.importResultId));
    appliedFilters.importResultId = Number(input.importResultId);
  }

  if (input.annotationScope) {
    const scope = normalizeScope(input.annotationScope);
    clauses.push('annotation_scope = ?');
    params.push(scope);
    appliedFilters.annotationScope = scope;
  }

  if (input.annotationKind) {
    const kind = normalizeKind(input.annotationKind);
    clauses.push('annotation_kind = ?');
    params.push(kind);
    appliedFilters.annotationKind = kind;
  }

  if (input.severity) {
    const normalizedSeverity = normalizeSeverity(input.severity);
    clauses.push('severity = ?');
    params.push(normalizedSeverity);
    appliedFilters.severity = normalizedSeverity;
  }

  const signalKey = normalizeSearchTerm(input.signalKey, 120);
  if (signalKey) {
    clauses.push('signal_key = ?');
    params.push(signalKey);
    appliedFilters.signalKey = signalKey;
  }

  const createdFrom = normalizeDateBound(input.createdFrom);
  if (createdFrom) {
    clauses.push('created_at >= ?');
    params.push(createdFrom);
    appliedFilters.createdFrom = createdFrom;
  }

  const createdTo = normalizeDateBound(input.createdTo);
  if (createdTo) {
    clauses.push('created_at <= ?');
    params.push(createdTo);
    appliedFilters.createdTo = createdTo;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await allAsync(
    `${selectBase} ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [...params, limit],
  );
  const annotations = rows.map(normalizeAnnotationRow).filter(Boolean);

  return {
    annotations,
    appliedFilters,
    filterCount: Object.keys(appliedFilters).length,
    resultCount: annotations.length,
    limit,
    metadataOnlySearch: true,
    readOnlySearch: true,
    modelExecutionAllowed: false,
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    artifactBytesLoadingAllowed: false,
    rawCsvLoadingAllowed: false,
    businessMutationAllowed: false,
    governanceWorkflowAdded: false,
  };
};

export const getWorkbenchImportResultAnnotationById = async (id: unknown) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const row = await getAsync(`${selectBase} WHERE id = ?`, [numericId]);
  return normalizeAnnotationRow(row);
};

export const getWorkbenchImportResultAnnotationsByCandidatePackageId = async (candidatePackageId: string, limit: unknown = 50) =>
  listWorkbenchImportResultAnnotations({ candidatePackageId, limit });

export const getLatestWorkbenchImportResultAnnotation = async () => {
  const row = await getAsync(`${selectBase} ORDER BY created_at DESC, id DESC LIMIT 1`);
  return normalizeAnnotationRow(row);
};

export const getWorkbenchImportResultAnnotationSummary = async () => {
  const summary = await getAsync(
    `
      SELECT COUNT(*) AS annotationCount,
             SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) AS infoCount,
             SUM(CASE WHEN severity = 'watch' THEN 1 ELSE 0 END) AS watchCount,
             SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) AS warningCount,
             SUM(CASE WHEN severity = 'resolved' THEN 1 ELSE 0 END) AS resolvedCount,
             SUM(CASE WHEN annotation_scope = 'metadata_result' THEN 1 ELSE 0 END) AS metadataResultCount,
             SUM(CASE WHEN annotation_scope = 'trend_signal' THEN 1 ELSE 0 END) AS trendSignalCount,
             SUM(CASE WHEN annotation_scope = 'offline_metrics_comparison' THEN 1 ELSE 0 END) AS offlineMetricsComparisonCount,
             SUM(CASE WHEN metadata_only = 1 AND model_execution_allowed = 0 AND runtime_invocation_allowed = 0 AND inference_endpoint_exposed = 0 AND artifact_activation_allowed = 0 AND artifact_bytes_loading_allowed = 0 AND raw_csv_loading_allowed = 0 AND business_mutation_allowed = 0 AND governance_workflow_added = 0 THEN 1 ELSE 0 END) AS safeAnnotationCount
      FROM ml_workbench_import_result_annotations
    `,
  );
  const latest = await getLatestWorkbenchImportResultAnnotation();

  return {
    annotationCount: Number(summary?.annotationCount ?? 0),
    infoCount: Number(summary?.infoCount ?? 0),
    watchCount: Number(summary?.watchCount ?? 0),
    warningCount: Number(summary?.warningCount ?? 0),
    resolvedCount: Number(summary?.resolvedCount ?? 0),
    metadataResultCount: Number(summary?.metadataResultCount ?? 0),
    trendSignalCount: Number(summary?.trendSignalCount ?? 0),
    offlineMetricsComparisonCount: Number(summary?.offlineMetricsComparisonCount ?? 0),
    safeAnnotationCount: Number(summary?.safeAnnotationCount ?? 0),
    latestCandidatePackageId: latest?.candidatePackageId ?? null,
    latestSeverity: latest?.severity ?? null,
    latestAnnotationKind: latest?.annotationKind ?? null,
    metadataOnlyAnnotations: true,
    modelExecutionAllowed: false,
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    artifactBytesLoadingAllowed: false,
    rawCsvLoadingAllowed: false,
    businessMutationAllowed: false,
    governanceWorkflowAdded: false,
  };
};

/* Phase 11G anchors: ml_workbench_import_result_annotations, recordWorkbenchImportResultAnnotation, listWorkbenchImportResultAnnotations, getWorkbenchImportResultAnnotationSummary, metadata-only operator annotations, no model execution, no runtime invocation, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
