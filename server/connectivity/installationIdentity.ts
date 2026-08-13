import { randomBytes } from "node:crypto";

export const INSTALLATION_ID_SETTING_KEY = "installation_id";

export type InstallationIdentityStore = {
  get: (key: string) => Promise<string | null | undefined>;
  set: (key: string, value: string) => Promise<unknown>;
};

export const generateInstallationId = (): string =>
  `inst_${randomBytes(18).toString("base64url")}`;

export const isValidInstallationId = (value: unknown): value is string =>
  /^inst_[A-Za-z0-9_-]{24}$/.test(String(value || "").trim());

export const ensureInstallationId = async (
  store: InstallationIdentityStore,
): Promise<string> => {
  const existing = String(await store.get(INSTALLATION_ID_SETTING_KEY) || "").trim();
  if (isValidInstallationId(existing)) return existing;

  const generated = generateInstallationId();
  await store.set(INSTALLATION_ID_SETTING_KEY, generated);
  return generated;
};
