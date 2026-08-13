import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const connection = read('server/db/connection.ts');
const dbIndex = read('server/db/index.ts');
const legacyDatabase = read('server/db/legacyDatabase.ts');
const databaseCompatibilityBarrel = read('server/database.ts');
const initRuntime = read('server/db/core/initRuntime.ts');
const restoreRoutes = read('server/routes/backup.routes.ts');
const sessions = read('server/utils/sessionAuth.ts');
const settingsController = read('pages/settings/SettingsController.tsx');
const restoreModal = read('pages/settings/SettingsRestoreModal.tsx');
const restoreActions = read('components/actions/OperationalLoadingButtons.tsx');
const restoreProgressContract = read('shared/databaseRestoreProgress.ts');
const restoreHistoryService = read('server/services/databaseRestoreHistory.ts');
const restoreHistoryCard = read('pages/settings/SettingsRestoreHistoryCard.tsx');
const apiFetch = read('utils/apiFetch.ts');

assert.match(connection, /export const beginDatabaseMaintenance/);
assert.match(connection, /databaseMaintenancePromise/);
assert.match(
  dbIndex,
  /export\s*\{[^}]*beginDatabaseMaintenance[^}]*\}\s*from\s*["']\.\/core\/connection["']/s,
  'beginDatabaseMaintenance must be exposed by server/db/index.ts.',
);
assert.match(
  legacyDatabase,
  /export\s+\*\s+from\s*["']\.\/index["']/,
  'legacyDatabase compatibility barrel must re-export server/db/index.ts.',
);
assert.match(
  databaseCompatibilityBarrel,
  /export\s+\*\s+from\s*["']\.\/db\/legacyDatabase["']/,
  'server/database.ts must expose the compatibility database API used by routes.',
);
assert.match(initRuntime, /maintenancePromise\.then\(\(\) => getDbInstance\(false\)\)/);

assert.match(
  initRuntime,
  /setActiveDb\(null\);\s*setCachedDbInstance\(null\);\s*setDbInitializationPromise\(null\);[\s\S]{0,900}?activeDb\.close/,
  'SQLite handle must be detached before close so new work cannot queue on a closing connection.',
);
assert.match(initRuntime, /interruptPending\?: boolean/);
assert.match(initRuntime, /activeDb\.interrupt\(\)/);
assert.match(initRuntime, /setActiveDb\(activeDb\)[\s\S]{0,300}?setCachedDbInstance/);

assert.match(restoreRoutes, /let restoreInProgress = false/);
assert.match(restoreRoutes, /beginDatabaseMaintenance\(`database restore/);
assert.match(restoreRoutes, /releaseDatabaseMaintenance\?\.\(\)/);
assert.match(restoreRoutes, /runPendingMigrations\(database\)/);
assert.match(restoreRoutes, /ensureReminderRulesTables\(\)/);
assert.match(restoreRoutes, /validateBackupDatabasePath\(DB_PATH\)/);
assert.match(restoreRoutes, /fs\.renameSync\(DB_PATH, previousPath\)/);
assert.match(restoreRoutes, /fs\.renameSync\(stagedPath, DB_PATH\)/);
assert.match(restoreRoutes, /interruptPending: true/);
assert.match(restoreRoutes, /pre-restore-safety/);
assert.match(restoreRoutes, /revokeAllSessions\(\)/);
assert.match(restoreRoutes, /refreshBackupSchedulerFromRestoredSettings/);
assert.match(restoreRoutes, /restoreProgressRegistry/);
assert.match(restoreRoutes, /\/api\/backup\/restore-status\/:operationId/);
assert.match(restoreRoutes, /reportRestoreStage\(operationId, auditDraft, 'validating'\)/);
assert.match(restoreRoutes, /reportRestoreStage\(operationId, auditDraft, 'safety-backup'\)/);
assert.match(restoreRoutes, /reportRestoreStage\(operationId, auditDraft, 'replacing'/);
assert.match(restoreRoutes, /reportRestoreStage\(operationId, auditDraft, 'reopening'/);
assert.match(restoreRoutes, /publishRestoreProgress\(operationId, 'completed'\)/);
assert.match(restoreRoutes, /publishRestoreProgress\(operationId, 'rolling-back'\)/);
assert.match(restoreRoutes, /restoreOperationId/);
assert.match(restoreRoutes, /\/api\/backup\/restore-history/);
assert.match(restoreRoutes, /completeDatabaseRestoreAudit/);
assert.match(restoreRoutes, /failDatabaseRestoreAudit/);
assert.match(restoreHistoryService, /restore-history\.json/);
assert.match(restoreHistoryService, /safetyBackupFileName/);
assert.match(restoreHistoryCard, /سابقه بازیابی دیتابیس/);
assert.match(restoreHistoryCard, /نتیجه مراحل آخرین بازیابی/);
assert.match(restoreProgressContract, /DATABASE_RESTORE_TOTAL_STEPS = 4/);
for (const stage of ['validating', 'safety-backup', 'replacing', 'reopening', 'completed', 'rolling-back', 'failed']) {
  assert.ok(restoreProgressContract.includes(stage), `Restore progress contract must define ${stage}.`);
}
assert.match(settingsController, /startRestoreProgressPolling/);
assert.match(settingsController, /restore-status\/\$\{encodeURIComponent\(operationId\)\}/);
assert.match(settingsController, /restoreOperationId: operationId/);
assert.match(settingsController, /formData\.append\('restoreOperationId', operationId\)/);
assert.match(settingsController, /data\.data\?\.restoreProgress/);
assert.match(settingsController, /result\.data\?\.restoreProgress/);
assert.match(restoreModal, /مرحله واقعی سرور/);
assert.match(restoreModal, /data-restore-stage-state/);
assert.match(restoreActions, /loadingStageStep=\{progress\?\.step\}/);
assert.match(restoreActions, /loadingStageTotal=\{progress\?\.total\}/);
assert.match(apiFetch, /suppressAuthInvalidation/);
assert.doesNotMatch(
  restoreRoutes,
  /برای هماهنگ‌شدن تمام پردازش‌ها، برنامه را یک‌بار بازنشانی کنید/,
  'Restore must complete its runtime reinitialization instead of relying on a manual backend restart.',
);

assert.match(sessions, /export const revokeAllSessions/);
assert.match(settingsController, /clearPersistedAuthSession\(\)/);
assert.match(settingsController, /window\.location\.reload\(\)/);
assert.match(settingsController, /schedulePostRestoreReload/);

const backupRestoreHandler = settingsController.slice(
  settingsController.indexOf('const handleRestoreFromBackup'),
  settingsController.indexOf('const handleCheckRestore'),
);
assert.doesNotMatch(
  backupRestoreHandler,
  /await fetchBackups\(\)/,
  'The client must not issue another authenticated DB request after all restore sessions are revoked.',
);

console.log('Database restore lifecycle audit passed.');
