import type { AuthUser, BusinessInformationSettings, Role, UserForDisplay } from '../../types';
import type { BackupItem } from './settingsPanelTypes';
import type { DatabaseRestoreAuditRecord, DatabaseRestoreProgressSnapshot } from '../../shared/databaseRestoreProgress';

export type BusinessInfoDynamic = BusinessInformationSettings & Record<string, string | number | boolean | null | undefined>;
export type SettingsApiResult = { success: boolean; message?: string; data: BusinessInformationSettings };
export type UsersApiItem = Omit<UserForDisplay, 'roleName'> & { roleName?: string | null };
export type UsersApiResult = { success: boolean; message?: string; data: UsersApiItem[] };
export type RolesApiResult = { success: boolean; message?: string; data: Role[] };
export type LogoUploadApiResult = { data: { filePath: string; revision?: number } };
export type BackupListApiResult = { success: boolean; message?: string; data?: BackupItem[] };
export type RestoreHistoryApiResult = { success: boolean; message?: string; data?: DatabaseRestoreAuditRecord[] };
export type BackupRestoreApiResult = { success?: boolean; message?: string; data?: { restoreProgress?: DatabaseRestoreProgressSnapshot; restoreAudit?: DatabaseRestoreAuditRecord } };
export type BackupCheckRestoreApiResult = { success: boolean; message?: string; data?: { stats?: Record<string, number | string | null | undefined> } };
export type SettingsRestoreApiResult = { success: boolean; message?: string; data?: { restoreProgress?: DatabaseRestoreProgressSnapshot; restoreAudit?: DatabaseRestoreAuditRecord } };
export type RestoreProgressApiResult = { success: boolean; message?: string; data?: DatabaseRestoreProgressSnapshot };
export type AvatarUploadApiResult = { data?: { avatarUrl?: string | null }; message?: string };
export type ProfileUpdateApiResult = { success?: boolean; message?: string; user?: AuthUser };
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

export type SettingsApiFetch = (input: string, init?: RequestInit) => Promise<Response>;

export const fetchUsersAndRolesSnapshot = async (apiFetch: SettingsApiFetch) => {
  const [usersRes, rolesRes] = await Promise.all([
    apiFetch('/api/users', { cache: 'no-store' }),
    apiFetch('/api/roles', { cache: 'no-store' }),
  ]);
  const [usersJson, rolesJson] = await Promise.all([
    usersRes.json() as Promise<UsersApiResult>,
    rolesRes.json() as Promise<RolesApiResult>,
  ]);
  if (!usersRes.ok || !usersJson.success) throw new Error(usersJson.message || 'خطا در دریافت کاربران');
  if (!rolesRes.ok || !rolesJson.success) throw new Error(rolesJson.message || 'خطا در دریافت نقش‌ها');

  const roles = [...rolesJson.data].sort((a, b) =>
    a.name === 'Admin' ? -1 : b.name === 'Admin' ? 1 : a.name.localeCompare(b.name, 'fa')
  );
  const users: UserForDisplay[] = usersJson.data.map((user) => ({
    ...user,
    roleName: roles.find((role) => role.id === user.roleId)?.name ?? user.roleName ?? '---',
  }));
  return { roles, users };
};
