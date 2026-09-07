import type { AuthUser, Role, UserForDisplay } from '../../types';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { sanitizeTime } from '../../utils/backupSchedule';
import { buildSettingsBusinessPanelViewModel as buildSettingsBusinessPanelViewModelImpl } from './settingsLocalBusinessViewModels';

type RoleLabelFn = (roleName?: string | null) => string;

type UserPanelInput = {
  users: UserForDisplay[];
  roles: Role[];
  userSearchQuery: string;
  userRoleFilter: string;
};

export const buildSettingsUsersPanelViewModel = ({ users, roles, userSearchQuery, userRoleFilter }: UserPanelInput) => {
  const q = userSearchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesQuery = !q || [user.username, user.roleName, String(user.id)].some((value) => String(value || '').toLowerCase().includes(q));
    const matchesRole = userRoleFilter === 'all' || String(user.roleId) === userRoleFilter || user.roleName === userRoleFilter;
    return matchesQuery && matchesRole;
  });

  const roleCounts = new Map<string, number>();
  users.forEach((user) => {
    const key = user.roleName || '---';
    roleCounts.set(key, (roleCounts.get(key) || 0) + 1);
  });
  const userRoleSummaries = roles
    .map((role) => ({ roleName: role.name, count: roleCounts.get(role.name) || 0 }))
    .sort((a, b) => {
      if (a.roleName === 'Admin') return -1;
      if (b.roleName === 'Admin') return 1;
      return b.count - a.count || a.roleName.localeCompare(b.roleName, 'fa');
    });

  const adminCount = users.filter((u) => String(u.roleName || '').toLowerCase() === 'admin').length;
  const userStatsCards = [
    { label: 'کل کاربران', value: users.length.toLocaleString('fa-IR'), icon: 'fa-users', tone: 'text-slate-900 dark:text-white' },
    { label: 'نمایش فعلی', value: filteredUsers.length.toLocaleString('fa-IR'), icon: 'fa-filter', tone: 'text-slate-900 dark:text-white' },
    { label: 'نقش‌های تعریف‌شده', value: roles.length.toLocaleString('fa-IR'), icon: 'fa-user-gear', tone: 'text-slate-900 dark:text-white' },
    { label: 'کاربران ادمین', value: adminCount.toLocaleString('fa-IR'), icon: 'fa-shield-halved', tone: 'text-slate-900 dark:text-white' },
  ];

  return { filteredUsers, userRoleSummaries, userStatsCards };
};

export const buildSettingsPartnerShareNavigationViewModel = (partnerShareStatus: { state?: string }) => {
  const partnerShareChipClass = partnerShareStatus.state === 'ready'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200'
    : partnerShareStatus.state === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200'
      : partnerShareStatus.state === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200'
        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
  const partnerShareChipIcon = partnerShareStatus.state === 'ready'
    ? 'fa-circle-check'
    : partnerShareStatus.state === 'warning'
      ? 'fa-triangle-exclamation'
      : partnerShareStatus.state === 'error'
        ? 'fa-circle-question'
        : partnerShareStatus.state === 'empty'
          ? 'fa-circle-info'
          : 'fa-spinner fa-spin';
  const partnerSetupNeedsAttention = partnerShareStatus.state !== 'ready';

  return { partnerShareChipClass, partnerShareChipIcon, partnerSetupNeedsAttention };
};

type SettingsAccountUser = AuthUser & {
  lastLoginAt?: string | null;
  displayName?: string | null;
};

type AccountPanelInput = {
  currentUser: SettingsAccountUser | null;
  token: string | null | undefined;
  oldPassword: string;
  newPassword: string;
  newPassword2: string;
  getRoleLabelFa: RoleLabelFn;
};

export const buildSettingsAccountPanelViewModel = ({ currentUser, token, oldPassword, newPassword, newPassword2, getRoleLabelFa }: AccountPanelInput) => {
  const accountProfile = currentUser;
  const accountDisplayName = accountProfile?.displayName || [accountProfile?.firstName, accountProfile?.lastName].filter(Boolean).join(' ').trim() || accountProfile?.username || 'کاربر سیستم';
  const accountInitial = (accountDisplayName || accountProfile?.username || 'K').trim().slice(0, 1).toUpperCase();
  const accountJoinedAt = accountProfile?.dateAdded ? formatIsoToShamsiDateTime(accountProfile.dateAdded) : 'ثبت نشده';
  const accountLastLogin = (accountProfile?.lastLoginAt || accountProfile?.lastLogin) ? formatIsoToShamsiDateTime(accountProfile?.lastLoginAt || accountProfile?.lastLogin) : 'ثبت نشده';
  const accountPasswordScore = [
    newPassword.length >= 8,
    /[A-Za-z؀-ۿ]/.test(newPassword),
    /[0-9۰-۹]/.test(newPassword),
    /[^A-Za-z0-9۰-۹؀-ۿ]/.test(newPassword),
  ].filter(Boolean).length;
  const accountPasswordStrength = !newPassword
    ? {
        label: 'آماده تغییر',
        width: '0%',
        tone: 'bg-slate-300 dark:bg-slate-700',
        text: 'کلمه عبور جدید را وارد کنید.',
        icon: 'fa-circle-info',
        panel: 'border-slate-200 bg-slate-50/70 text-slate-600 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-300',
        badge: 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300',
      }
    : accountPasswordScore >= 3
      ? {
          label: 'قوی',
          width: '100%',
          tone: 'bg-emerald-500',
          text: 'رمز انتخابی امن و قابل قبول است.',
          icon: 'fa-shield-check',
          panel: 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-200',
          badge: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/45 dark:bg-emerald-950/35 dark:text-emerald-200',
        }
      : newPassword.length >= 6
        ? {
            label: 'متوسط',
            width: '66%',
            tone: 'bg-amber-500',
            text: 'قابل قبول است؛ برای امنیت بهتر عدد، حرف بزرگ یا نماد اضافه کن.',
            icon: 'fa-triangle-exclamation',
            panel: 'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900/45 dark:bg-amber-950/25 dark:text-amber-200',
            badge: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/45 dark:bg-amber-950/35 dark:text-amber-200',
          }
        : {
            label: 'ضعیف',
            width: '33%',
            tone: 'bg-rose-500',
            text: 'رمز کوتاه است؛ حداقل ۶ کاراکتر لازم است.',
            icon: 'fa-circle-exclamation',
            panel: 'border-rose-200 bg-rose-50/85 text-rose-800 dark:border-rose-900/45 dark:bg-rose-950/25 dark:text-rose-200',
            badge: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/45 dark:bg-rose-950/35 dark:text-rose-200',
          };
  const accountPasswordMismatch = Boolean(newPassword && newPassword2 && newPassword !== newPassword2);
  const accountPasswordVisual = accountPasswordMismatch
    ? {
        ...accountPasswordStrength,
        label: 'عدم تطابق',
        width: '100%',
        tone: 'bg-rose-500',
        text: 'تکرار رمز با رمز جدید هماهنگ نیست.',
        icon: 'fa-circle-exclamation',
        panel: 'border-rose-200 bg-rose-50/85 text-rose-800 dark:border-rose-900/45 dark:bg-rose-950/25 dark:text-rose-200',
        badge: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/45 dark:bg-rose-950/35 dark:text-rose-200',
      }
    : accountPasswordStrength;
  const accountPasswordReady = Boolean(oldPassword && newPassword && newPassword2 && newPassword.length >= 6 && newPassword === newPassword2);
  const accountSecurityItems = [
    { label: 'نشست ورود', ok: Boolean(token), hint: token ? 'نشست فعلی معتبر و فعال است.' : 'توکن ورود پیدا نشد.' },
    { label: 'نقش دسترسی', ok: Boolean(accountProfile?.roleName), hint: accountProfile?.roleName ? getRoleLabelFa(accountProfile.roleName) : 'نقش مشخص نیست.' },
    { label: 'هویت شخصی', ok: Boolean(accountProfile?.firstName || accountProfile?.lastName), hint: accountProfile?.firstName || accountProfile?.lastName ? 'نام شخصی حساب ثبت شده است.' : 'نام و نام خانوادگی هنوز تکمیل نشده است.' },
  ];
  const accountMetaItems = [
    { label: 'شناسه', value: accountProfile?.id ? accountProfile.id.toLocaleString('fa-IR') : '—', icon: 'fa-fingerprint' },
    { label: 'نقش', value: getRoleLabelFa(accountProfile?.roleName), icon: 'fa-user-shield' },
    { label: 'عضویت', value: accountJoinedAt, icon: 'fa-calendar-check' },
    { label: 'آخرین ورود', value: accountLastLogin, icon: 'fa-clock-rotate-left' },
  ];
  const accountQuickFacts = [
    { label: 'نام کاربری', value: accountProfile?.username || '—', icon: 'fa-at' },
    { label: 'سطح دسترسی', value: getRoleLabelFa(accountProfile?.roleName), icon: 'fa-user-lock' },
  ];

  return {
    accountProfile,
    accountDisplayName,
    accountInitial,
    accountPasswordScore,
    accountPasswordVisual,
    accountPasswordMismatch,
    accountPasswordReady,
    accountSecurityItems,
    accountMetaItems,
    accountQuickFacts,
  };
};

export const buildSettingsBusinessPanelViewModel = buildSettingsBusinessPanelViewModelImpl;

type BackupPanelInput = {
  backupEnabled: boolean;
  backupScheduleMode: string;
  backupScheduleTime: string;
  backupScheduleWeekdays: number[];
  backupScheduleIntervalHours: number;
  backupTimezone: string;
  backupRetention: number;
  initialBackupSettings: {
    enabled: boolean;
    mode: string;
    time: string;
    weekdays: number[];
    intervalHours: number;
    timezone: string;
    retention: number;
  };
};

export const buildSettingsBackupPanelViewModel = ({
  backupEnabled,
  backupScheduleMode,
  backupScheduleTime,
  backupScheduleWeekdays,
  backupScheduleIntervalHours,
  backupTimezone,
  backupRetention,
  initialBackupSettings,
}: BackupPanelInput) => {
  const backupModeLabel = backupScheduleMode === 'daily' ? 'روزانه' : backupScheduleMode === 'weekly' ? 'هفتگی' : 'هر چند ساعت';
  const backupStatusLabel = backupEnabled ? 'فعال' : 'غیرفعال';
  const backupStatusClass = backupEnabled
    ? 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
  const backupSummaryTone = backupEnabled
    ? 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
  const backupSettingsDirty =
    backupEnabled !== initialBackupSettings.enabled ||
    backupScheduleMode !== initialBackupSettings.mode ||
    sanitizeTime(backupScheduleTime) !== initialBackupSettings.time ||
    JSON.stringify([...backupScheduleWeekdays].sort((a, b) => a - b)) !== JSON.stringify([...initialBackupSettings.weekdays].sort((a, b) => a - b)) ||
    backupScheduleIntervalHours !== initialBackupSettings.intervalHours ||
    backupTimezone !== initialBackupSettings.timezone ||
    backupRetention !== initialBackupSettings.retention;
  const backupFeedbackTone = backupSettingsDirty
    ? 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
    : 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';
  const backupFeedbackIcon = backupSettingsDirty ? 'fa-circle-exclamation' : 'fa-circle-check';
  const backupFeedbackLabel = backupSettingsDirty ? 'تغییرات ذخیره نشده' : 'همه چیز به‌روز است';

  return {
    backupModeLabel,
    backupStatusLabel,
    backupStatusClass,
    backupSummaryTone,
    backupSettingsDirty,
    backupFeedbackTone,
    backupFeedbackIcon,
    backupFeedbackLabel,
  };
};
