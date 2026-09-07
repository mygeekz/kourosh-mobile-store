import fs from 'fs';
import path from 'path';
import { BACKUP_DIR, ensureBackupDir } from '../backup';
import {
  DATABASE_RESTORE_AUDITED_STAGES,
  DATABASE_RESTORE_STAGE_META,
  type DatabaseRestoreAuditRecord,
  type DatabaseRestoreAuditStageResult,
  type DatabaseRestoreAuditedStage,
  type DatabaseRestoreRollbackStatus,
  type DatabaseRestoreSourceType,
} from '../../shared/databaseRestoreProgress';

const RESTORE_HISTORY_FILE = path.join(BACKUP_DIR, 'restore-history.json');
const RESTORE_HISTORY_LIMIT = 20;

export type DatabaseRestoreAuditDraft = Omit<DatabaseRestoreAuditRecord, 'status' | 'finishedAt' | 'durationMs'> & {
  status: 'running';
  finishedAt: null;
  durationMs: null;
};

const durationBetween = (startedAt: string | null, finishedAt: string | null) => {
  if (!startedAt || !finishedAt) return null;
  const duration = Date.parse(finishedAt) - Date.parse(startedAt);
  return Number.isFinite(duration) ? Math.max(0, duration) : null;
};

const safeFileName = (value: string) => path.basename(String(value || 'backup.db').trim() || 'backup.db').slice(0, 180);

const createStageResults = (): DatabaseRestoreAuditStageResult[] =>
  DATABASE_RESTORE_AUDITED_STAGES.map((stage) => ({
    stage,
    label: DATABASE_RESTORE_STAGE_META[stage].label,
    status: 'pending',
    detail: DATABASE_RESTORE_STAGE_META[stage].detail,
    startedAt: null,
    finishedAt: null,
    durationMs: null,
  }));

export const createDatabaseRestoreAuditDraft = (
  operationId: string,
  sourceType: DatabaseRestoreSourceType,
  sourceFileName: string,
): DatabaseRestoreAuditDraft => ({
  operationId,
  status: 'running',
  sourceType,
  sourceFileName: safeFileName(sourceFileName),
  startedAt: new Date().toISOString(),
  finishedAt: null,
  durationMs: null,
  safetyBackupFileName: null,
  rollbackStatus: 'not-required',
  failureMessage: null,
  stages: createStageResults(),
});

export const markDatabaseRestoreAuditStage = (
  draft: DatabaseRestoreAuditDraft,
  stage: DatabaseRestoreAuditedStage,
  detail: string,
  at = new Date().toISOString(),
) => {
  for (const item of draft.stages) {
    if (item.status === 'running' && item.stage !== stage) {
      item.status = 'completed';
      item.finishedAt = at;
      item.durationMs = durationBetween(item.startedAt, item.finishedAt);
    }
  }

  const current = draft.stages.find((item) => item.stage === stage);
  if (!current) return;
  if (current.status === 'pending') {
    current.status = 'running';
    current.startedAt = at;
  }
  current.detail = detail || current.detail;
};

export const setDatabaseRestoreSafetyBackup = (draft: DatabaseRestoreAuditDraft, fileName: string) => {
  draft.safetyBackupFileName = safeFileName(fileName);
};

export const setDatabaseRestoreRollbackStatus = (
  draft: DatabaseRestoreAuditDraft,
  status: Exclude<DatabaseRestoreRollbackStatus, 'not-required'>,
) => {
  draft.rollbackStatus = status;
};

const readRestoreHistory = (): DatabaseRestoreAuditRecord[] => {
  ensureBackupDir();
  if (!fs.existsSync(RESTORE_HISTORY_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(RESTORE_HISTORY_FILE, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DatabaseRestoreAuditRecord => Boolean(
      item &&
      typeof item === 'object' &&
      typeof item.operationId === 'string' &&
      (item.status === 'completed' || item.status === 'failed') &&
      Array.isArray(item.stages),
    ));
  } catch (error) {
    console.error('[database-restore-history] unable to read restore history:', error);
    return [];
  }
};

const persistRestoreRecord = (record: DatabaseRestoreAuditRecord) => {
  try {
    ensureBackupDir();
    const previous = readRestoreHistory().filter((item) => item.operationId !== record.operationId);
    const next = [record, ...previous]
      .sort((a, b) => String(b.finishedAt).localeCompare(String(a.finishedAt)))
      .slice(0, RESTORE_HISTORY_LIMIT);
    const tempPath = `${RESTORE_HISTORY_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    fs.copyFileSync(tempPath, RESTORE_HISTORY_FILE);
    fs.unlinkSync(tempPath);
  } catch (error) {
    console.error('[database-restore-history] unable to persist restore history:', error);
  }
};

export const listDatabaseRestoreHistory = (limit = 10): DatabaseRestoreAuditRecord[] => {
  const normalizedLimit = Math.max(1, Math.min(RESTORE_HISTORY_LIMIT, Number(limit || 10)));
  return readRestoreHistory().slice(0, normalizedLimit);
};

export const completeDatabaseRestoreAudit = (
  draft: DatabaseRestoreAuditDraft,
  finishedAt = new Date().toISOString(),
): DatabaseRestoreAuditRecord => {
  for (const item of draft.stages) {
    if (item.status === 'running') {
      item.status = 'completed';
      item.finishedAt = finishedAt;
      item.durationMs = durationBetween(item.startedAt, item.finishedAt);
    }
  }
  const record: DatabaseRestoreAuditRecord = {
    ...draft,
    status: 'completed',
    finishedAt,
    durationMs: durationBetween(draft.startedAt, finishedAt) || 0,
    failureMessage: null,
    stages: draft.stages.map((item) => ({ ...item })),
  };
  persistRestoreRecord(record);
  return record;
};

export const failDatabaseRestoreAudit = (
  draft: DatabaseRestoreAuditDraft,
  failureMessage: string,
  finishedAt = new Date().toISOString(),
): DatabaseRestoreAuditRecord => {
  for (const item of draft.stages) {
    if (item.status === 'running') {
      item.status = 'failed';
      item.finishedAt = finishedAt;
      item.durationMs = durationBetween(item.startedAt, item.finishedAt);
    }
  }
  const record: DatabaseRestoreAuditRecord = {
    ...draft,
    status: 'failed',
    finishedAt,
    durationMs: durationBetween(draft.startedAt, finishedAt) || 0,
    failureMessage: String(failureMessage || 'عملیات بازیابی کامل نشد.'),
    stages: draft.stages.map((item) => ({ ...item })),
  };
  persistRestoreRecord(record);
  return record;
};
