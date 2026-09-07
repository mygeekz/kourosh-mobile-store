import { ensureInstallationId, isValidInstallationId } from "./installationIdentity";
import { getAsync, runAsync } from "../db/query";

export const deriveTenantIdFromInstallationId = (installationId: string): string => {
  const normalized = String(installationId || "").trim();
  if (!isValidInstallationId(normalized)) throw new Error("INVALID_INSTALLATION_ID_FOR_TENANT");
  return `tenant_${normalized.slice("inst_".length)}`;
};

export const getLocalTenantIdentity = async (): Promise<{
  tenantId: string;
  installationId: string;
}> => {
  const installationId = await ensureInstallationId({
    get: async (key) => {
      const row = await getAsync("SELECT value FROM settings WHERE key = ?", [key]) as { value?: string } | undefined;
      return row?.value;
    },
    set: async (key, value) => {
      await runAsync(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
      );
    },
  });
  return { installationId, tenantId: deriveTenantIdFromInstallationId(installationId) };
};
