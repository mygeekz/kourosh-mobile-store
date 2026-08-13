// Domain database API extracted from legacyRuntime in Phase 1E.

import { getDbInstance } from "../core/runtimeBindings";
import {
  getAllSettingsAsObject as getAllSettingsAsObjectFromRepo,
  updateMultipleSettings as updateMultipleSettingsInRepo,
  updateSetting as updateSettingInRepo,
  type SettingItem,
} from "../../repositories/settings.repo";

export const getAllSettingsAsObject = async (): Promise<Record<string, string>> => {
  await getDbInstance();
  return getAllSettingsAsObjectFromRepo();
};

export const updateMultipleSettings = async (
  settings: SettingItem[],
): Promise<void> => {
  await getDbInstance();
  return updateMultipleSettingsInRepo(settings);
};

export const updateSetting = async (
  key: string,
  value: string,
): Promise<void> => {
  await getDbInstance();
  return updateSettingInRepo(key, value);
};
