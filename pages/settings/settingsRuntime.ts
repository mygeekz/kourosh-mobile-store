import type { BusinessInformationSettings, Role, UserForDisplay } from '../../types';
import type { BackupItem } from './settingsPanelTypes';

export type BusinessInfoDynamic = BusinessInformationSettings & Record<string, string | number | boolean | null | undefined>;
export type SettingsApiResult = { success: boolean; message?: string; data: BusinessInformationSettings };
export type UsersApiItem = Omit<UserForDisplay, 'roleName'> & { roleName?: string | null };
export type UsersApiResult = { success: boolean; message?: string; data: UsersApiItem[] };
export type RolesApiResult = { success: boolean; message?: string; data: Role[] };
export type LogoUploadApiResult = { data: { filePath: string } };
export type BackupListApiResult = { success: boolean; message?: string; data?: BackupItem[] };
export type BackupRestoreApiResult = { message?: string };
export type BackupCheckRestoreApiResult = { success: boolean; message?: string; data?: { stats?: Record<string, number | string | null | undefined> } };
export type SettingsRestoreApiResult = { success: boolean; message?: string };
export type AvatarUploadApiResult = { data?: { avatarUrl?: string | null }; message?: string };
export type ChangePasswordApiResult = { message?: string };
export type BackupScheduleSettingsPayload = Pick<BusinessInformationSettings,
  'backup_enabled' |
  'backup_cron' |
  'backup_timezone' |
  'backup_retention' |
  'backup_schedule_mode' |
  'backup_schedule_time' |
  'backup_schedule_weekdays' |
  'backup_schedule_interval_hours'
>;

export type ApiJsonObject = Record<string, unknown> & { success?: boolean; message?: string; data?: unknown };

export const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

export const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const readApiJsonObject = async (response: Response): Promise<ApiJsonObject> => {
  const body = await response.json().catch(() => ({}));
  return isRecord(body) ? body as ApiJsonObject : {};
};

export const toBusinessInfoDynamic = (info: BusinessInformationSettings): BusinessInfoDynamic => info as BusinessInfoDynamic;
