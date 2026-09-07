import { allTypedAsync, execAsync, runAsync } from "../db/query";
import { cleanAppMessage } from "../../shared/messages";

export interface SettingItem {
  key: string;
  value: string;
}

const normalizeMessageSettingValue = (key: string, value: string): string => {
  const k = String(key || "").trim();
  const raw = String(value ?? "");
  return k.startsWith("telegram_") && k.endsWith("_message") ? cleanAppMessage(raw) : raw;
};

export const getAllSettingsAsObject = async (): Promise<Record<string, string>> => {
  const settingsArray = await allTypedAsync<SettingItem>(
    "SELECT key, value FROM settings",
  );
  return settingsArray.reduce<Record<string, string>>((obj, item) => {
    obj[item.key] = normalizeMessageSettingValue(item.key, item.value);
    return obj;
  }, {});
};

export const updateMultipleSettings = async (
  settings: SettingItem[],
): Promise<void> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    for (const setting of settings) {
      await runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [setting.key, normalizeMessageSettingValue(setting.key, setting.value)],
      );
    }
    await execAsync("COMMIT;");
  } catch (error: unknown) {
    await execAsync("ROLLBACK;");
    const message = error instanceof Error ? error.message : String(error ?? "");
    throw new Error(
      `خطا در عملیات پایگاه داده در به‌روزرسانی تنظیمات: ${message}`,
      { cause: error },
    );
  }
};

export const updateSetting = async (
  key: string,
  value: string,
): Promise<void> => {
  await runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
    key,
    normalizeMessageSettingValue(key, value),
  ]);
};
