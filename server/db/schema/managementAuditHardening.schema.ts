import { runAsync } from "../query";

const addColumnIfMissing = async (sql: string): Promise<void> => {
  try {
    await runAsync(sql);
  } catch (error) {
    const message = String((error as any)?.message || error || "");
    if (!/duplicate column name/i.test(message)) throw error;
  }
};

export const createManagementAuditHardeningSchema = async (): Promise<void> => {
  await addColumnIfMissing(`ALTER TABLE audit_logs ADD COLUMN tenantId TEXT`);
  await addColumnIfMissing(`ALTER TABLE audit_logs ADD COLUMN source TEXT`);
  await addColumnIfMissing(`ALTER TABLE audit_logs ADD COLUMN requestId TEXT`);
  await addColumnIfMissing(`ALTER TABLE audit_logs ADD COLUMN beforeJson TEXT`);
  await addColumnIfMissing(`ALTER TABLE audit_logs ADD COLUMN afterJson TEXT`);
  await addColumnIfMissing(`ALTER TABLE audit_logs ADD COLUMN metadataJson TEXT`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenantId, createdAt DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, createdAt DESC)`);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_management_audit_no_update
    BEFORE UPDATE ON audit_logs
    WHEN OLD.tenantId IS NOT NULL AND OLD.source IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'structured management audit is append-only');
    END;
  `);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_management_audit_no_delete
    BEFORE DELETE ON audit_logs
    WHEN OLD.tenantId IS NOT NULL AND OLD.source IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'structured management audit is append-only');
    END;
  `);
};
