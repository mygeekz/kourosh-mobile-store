import { useConfirm } from '../contexts/ConfirmContext';
// pages/Settings.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BusinessInformationSettings,
  NotificationMessage,
  Role,
  UserForDisplay,
  NewUserFormData,
  EditUserFormData,
  PhoneEntry,
} from '../types';
import Notification from '../components/Notification';
import { useMountedRef } from '../utils/asyncGuards';

import SmsPatternTestModal from '../components/SmsPatternTestModal';
import SmsPatternPreviewModal from '../components/SmsPatternPreviewModal';
import TelegramTemplateTestModal from '../components/TelegramTemplateTestModal';
import SmsBulkTestModal, { SmsPatternDef } from '../components/SmsBulkTestModal';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { useStyle } from '../contexts/StyleContext';
import { applyDocumentBranding, normalizeStoreName } from '../utils/branding';
import { normalizeCurrencyUnit, writeStoredCurrencyUnit } from '../utils/currency';
import { loadAuthedAssetUrl, revokeObjectUrlSafe } from '../utils/loadAuthedAssetUrl';
import PageShell from '../components/ui/PageShell';
import {
  SettingsAccountPanel,
  SettingsBusinessPanel,
  SettingsDataPanel,
  SettingsLocalPanel,
  SettingsModulesPanel,
  SettingsPricingPanel,
  SettingsRemindersPanel,
  SettingsSmartPanel,
  SettingsSmsPanel,
  SettingsStylePanel,
  SettingsTelegramPanel,
  SettingsUsersModals,
  SettingsUsersPanel,
  type BackupItem,
  type PricingDecisionLogItem,
  type PricingLearningItem,
  type PricingToneMeta,
  type SmsBusinessInfo,
  type TelegramBusinessInfo,
  type TelegramControlCenterState,
  type TelegramDiagnosticsState,
  type TelegramHealthState,
  type TelegramMessageFormat,
  type TelegramRecentChat,
  type TelegramTemplateDef,
  type TelegramTemplateVariable,
} from './settings/index';
import SettingsHeaderBar from './settings/SettingsHeaderBar';
import SettingsNavigation from './settings/SettingsNavigation';
import SettingsRestoreModal from './settings/SettingsRestoreModal';
import SettingsSaveFooter from './settings/SettingsSaveFooter';
import SettingsSidebar from './settings/SettingsSidebar';
import { buildBackupCronExpr, DEFAULT_BACKUP_SCHEDULE, parseBackupScheduleFromSettings, formatNextBackupRunLabel, sanitizeTime, normalizeWeekdays } from '../utils/backupSchedule';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { formatIranDateTime } from '../utils/iranDateTime';
import { ALL_FEATURE_FLAGS, COMMERCIAL_PLANS, FEATURE_FLAGS, type CommercialPlanKey } from '../utils/featureFlags';
import { getSettingsFeatureRuntimeBadges, isSettingsTabEnabledByFeaturePolicy, settingsTabFeatureRequirements } from '../utils/settingsFeaturePolicy';
import { APP_MESSAGES } from '../shared/messages';

import { STYLE_PROFILES_KEY, type AppStyleTemplate, type SavedStyleProfile } from './settings/styleTemplates';
import {
  DEFAULT_PRICING_INTELLIGENCE_SETTINGS,
  PRICING_BEHAVIOR_STORAGE_KEY,
  buildPricingLearningFromPhones,
  clampPricingSettings,
  extractPricingLearningItems,
  loadPricingIntelligenceSettings,
  loadPricingLearningItems,
  mergePricingLearningItems,
  parsePricingDateTime,
  pricingStrategyLabels,
  savePricingIntelligenceSettings,
  type PricingDateInput,
  type PricingDecisionExportColumn,
  type PricingDecisionExportRow,
  type PricingIntelligenceSettings,
  type PricingLearningApiResult,
  type PricingStrategyMode,
} from './settings/pricingRuntime';
import { normalizeTelegramMessageFormat, normalizeTelegramRecentChat } from './settings/telegramRuntime';
import {
  getErrorMessage,
  isRecord,
  readApiJsonObject,
  toBusinessInfoDynamic,
  type AvatarUploadApiResult,
  type BackupCheckRestoreApiResult,
  type BackupListApiResult,
  type BackupRestoreApiResult,
  type BackupScheduleSettingsPayload,
  type BusinessInfoDynamic,
  type ChangePasswordApiResult,
  type LogoUploadApiResult,
  type RolesApiResult,
  type SettingsApiResult,
  type SettingsRestoreApiResult,
  type UsersApiResult,
} from './settings/settingsRuntime';

import {
  buildLocalDomain,
  buildPartnerShareStatus,
  canManageStoreOwnershipByRole,
  formatPricingDatePreview,
  getRoleLabelFa,
  normalizeLocalHostname,
  normalizeLocalSuffix,
  normalizePricingDateInput,
  parsePricingDecisionDateFilter,
  type PartnerShareProfileLike,
  type PartnerShareStatus,
  type TabKey,
} from './settings/settingsHelpers';

const Settings: React.FC = () => {
  const confirmAction = useConfirm();
  const { currentUser, token, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const mountedRef = useMountedRef();
  const { style, setMany, syncBrandFromStoreName } = useStyle();

  // ---- Tabs
  const [tab, setTab] = useState<TabKey>('business');
  const [pricingSettings, setPricingSettings] = useState<PricingIntelligenceSettings>(() => loadPricingIntelligenceSettings());
  const [pricingLearningItems, setPricingLearningItems] = useState<PricingLearningItem[]>(() => loadPricingLearningItems());
  const [pricingDecisionSearch, setPricingDecisionSearch] = useState('');
  const [pricingDecisionActionFilter, setPricingDecisionActionFilter] = useState<'all' | 'accepted' | 'overridden' | 'manual'>('all');
  const [pricingDecisionDeltaFilter, setPricingDecisionDeltaFilter] = useState<'all' | 'higher' | 'lower' | 'same'>('all');
  const [pricingDecisionDateFrom, setPricingDecisionDateFrom] = useState('');
  const [pricingDecisionDateTo, setPricingDecisionDateTo] = useState('');
  const [styleProfileName, setStyleProfileName] = useState('');
  const [styleProfiles, setStyleProfiles] = useState<SavedStyleProfile[]>([]);

  // ---- Business & SMS (Server settings)
  const [businessInfo, setBusinessInfo] = useState<BusinessInformationSettings>({});
  const [initialBusinessInfo, setInitialBusinessInfo] = useState<BusinessInformationSettings>({});
  const telegramInfo = businessInfo as TelegramBusinessInfo;
  const initialTelegramInfo = initialBusinessInfo as TelegramBusinessInfo;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const setFeatureByKey = (feature: { settingKey: string; optional?: boolean; defaultEnabled?: boolean }, enabled: boolean) => {
    if (feature.optional === false) return;
    setBusinessInfo((prev) => ({ ...prev, [feature.settingKey]: enabled ? '1' : '0' } as BusinessInformationSettings));
  };

  const isFeatureSettingEnabled = (feature: { settingKey: string; defaultEnabled?: boolean }) =>
    String(toBusinessInfoDynamic(businessInfo)[feature.settingKey] ?? (feature.defaultEnabled ? '1' : '0')) !== '0';

  const featureDefinitionMap = useMemo(() => new Map(ALL_FEATURE_FLAGS.map((feature) => [feature.key, feature])), []);
  const isFeatureEnabledByKey = (key: string) => {
    const feature = featureDefinitionMap.get(key);
    return feature ? isFeatureSettingEnabled(feature) : true;
  };
  const isSettingsTabRuntimeEnabled = (tabKey: TabKey) => isSettingsTabEnabledByFeaturePolicy(tabKey, isFeatureEnabledByKey);
  const enabledRootModulesCount = FEATURE_FLAGS.filter((feature) => isFeatureSettingEnabled(feature)).length;
  const disabledOptionalModulesCount = FEATURE_FLAGS.filter((feature) => feature.optional !== false && !isFeatureSettingEnabled(feature)).length;
  const enabledMicroFeaturesCount = ALL_FEATURE_FLAGS.filter((feature) => feature.scope === 'feature' && isFeatureSettingEnabled(feature)).length;
  const totalMicroFeaturesCount = ALL_FEATURE_FLAGS.filter((feature) => feature.scope === 'feature').length;
  const disabledSettingsTabsCount = (Object.keys(settingsTabFeatureRequirements) as TabKey[]).filter((key) => !isSettingsTabRuntimeEnabled(key)).length;
  const moduleRuntimeSummary = [
    { label: 'ماژول‌های فعال', value: `${enabledRootModulesCount}/${FEATURE_FLAGS.length}`, hint: 'بخش‌های اصلی فروشگاه در دسترس هستند.', icon: 'fa-cubes-stacked', tone: 'from-emerald-50 to-white text-emerald-700 dark:from-emerald-950/20 dark:to-slate-950 dark:text-emerald-300' },
    { label: 'ماژول‌های خاموش', value: disabledOptionalModulesCount.toLocaleString('fa-IR'), hint: 'بخش‌های غیرضروری از منو و پردازش خارج شده‌اند.', icon: 'fa-power-off', tone: 'from-rose-50 to-white text-rose-700 dark:from-rose-950/20 dark:to-slate-950 dark:text-rose-300' },
    { label: 'قابلیت‌های جزئی فعال', value: `${enabledMicroFeaturesCount}/${totalMicroFeaturesCount}`, hint: 'تنظیمات ریزدانه داخل ماژول‌ها فعال مانده‌اند.', icon: 'fa-sliders', tone: 'from-sky-50 to-white text-sky-700 dark:from-sky-950/20 dark:to-slate-950 dark:text-sky-300' },
    { label: 'تب‌های پنهان‌شده', value: disabledSettingsTabsCount.toLocaleString('fa-IR'), hint: 'تب‌های وابسته به ماژول خاموش نمایش داده نمی‌شوند.', icon: 'fa-eye-slash', tone: 'from-amber-50 to-white text-amber-700 dark:from-amber-950/20 dark:to-slate-950 dark:text-amber-300' },
  ];
  const commercialPlanUiCopy: Record<CommercialPlanKey, { titleFa: string; short: string; audience: string }> = {
    lite: { titleFa: 'لایت', short: 'شروع سبک و ضروری', audience: 'فروشگاه‌های کوچک و شروع کار' },
    standard: { titleFa: 'استاندارد', short: 'فروش و گزارش متعادل', audience: 'مناسب فروش روزمره و CRM پایه' },
    pro: { titleFa: 'حرفه‌ای', short: 'کنترل کامل‌تر عملیات', audience: 'برای فروشگاه‌های فعال‌تر' },
    enterprise: { titleFa: 'سازمانی', short: 'بیشترین پوشش ماژول‌ها', audience: 'برای تیم‌های بزرگ و چندبخشی' },
  };
  const getFeatureRuntimeBadges = getSettingsFeatureRuntimeBadges;

  const applyCommercialPlan = (planKey: CommercialPlanKey) => {
    const plan = COMMERCIAL_PLANS[planKey];
    const featureMap = new Map(ALL_FEATURE_FLAGS.map((feature) => [feature.key, feature]));
    setBusinessInfo((prev) => {
      const next: BusinessInfoDynamic = { ...prev };
      const keysToEnable = planKey === 'enterprise' ? Array.from(featureMap.keys()) : plan.enable;
      keysToEnable.forEach((key) => {
        const feature = featureMap.get(key);
        if (feature && feature.optional !== false) next[feature.settingKey] = '1';
      });
      plan.disable.forEach((key) => {
        const feature = featureMap.get(key);
        if (feature && feature.optional !== false) next[feature.settingKey] = '0';
      });
      return next;
    });
    setNotification({ type: 'success', text: `پلن ${plan.title} روی تنظیمات اعمال شد. برای ثبت نهایی، ذخیره وضعیت ماژول‌ها را بزنید.` });
  };

  useEffect(() => {
    if (tab !== 'modules' && !isSettingsTabRuntimeEnabled(tab)) setTab('modules');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, businessInfo]);

	// ---- SMS delivery verification modal
	const [smsCheckOpen, setSmsCheckOpen] = useState(false);
	const [smsCheckTitle, setSmsCheckTitle] = useState('بررسی و ادامه ارسال پیامک');
	const [smsCheckBodyId, setSmsCheckBodyId] = useState('');
	const [smsCheckTokenLabels, setSmsCheckTokenLabels] = useState<string[]>([]);
	// ---- SMS preview modal
	const [smsPrevOpen, setSmsPrevOpen] = useState(false);

  const [tgCheckOpen, setTgCheckOpen] = useState(false);
  const [tgCheckTitle, setTgCheckTitle] = useState('');
  const [tgCheckTemplate, setTgCheckTemplate] = useState('');
  const [tgCheckFormat, setTgCheckFormat] = useState<'text'|'markdown'|'html'>('text');
  const [tgCheckAllowedVars, setTgCheckAllowedVars] = useState<TelegramTemplateVariable[]>([]);
	const [smsPrevTitle, setSmsPrevTitle] = useState('پیش‌نمایش پیامک');
	const [smsPrevTemplate, setSmsPrevTemplate] = useState('');
	const [smsPrevTokenLabels, setSmsPrevTokenLabels] = useState<string[]>([]);

	// ---- SMS Health / Bulk Check
	const [smsBulkOpen, setSmsBulkOpen] = useState(false);
	const [smsBulkDefaults, setSmsBulkDefaults] = useState<string[]>([]);

  // ---- Telegram Health / Quick Check
  const [tgHealth, setTgHealth] = useState<TelegramHealthState | null>(null);
  const [tgIsChecking, setTgIsChecking] = useState(false);
  const [tgDiagnostics, setTgDiagnostics] = useState<TelegramDiagnosticsState | null>(null);
  const [tgDiagnosticsLoading, setTgDiagnosticsLoading] = useState(false);
  const [tgDiagnosticsBusyAction, setTgDiagnosticsBusyAction] = useState<string | null>(null);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [tgQuickMsg, setTgQuickMsg] = useState('✅ بررسی و ادامه اتصال تلگرام کوروش');
  const [tgIsSendingQuick, setTgIsSendingQuick] = useState(false);
  const [tgChatLookupLoading, setTgChatLookupLoading] = useState(false);
  const [tgRecentChats, setTgRecentChats] = useState<TelegramRecentChat[]>([]);
  const [tgChatLookupHint, setTgChatLookupHint] = useState('');

  // ---- Telegram مرکز کنترل
  const [tgCC, setTgCC] = useState<TelegramControlCenterState | null>(null);
  const [, setTgCCLoading] = useState(false);
  const [, setTgCCError] = useState<string | null>(null);
  const [, setTgBulkBusy] = useState(false);
  const [tgCleanupDays] = useState(30);
  const [openTelegramCategories, setOpenTelegramCategories] = useState<Record<string, boolean>>({});
  const [openTelegramItems, setOpenTelegramItems] = useState<Record<string, boolean>>({});
  const [openTelegramAudiencePanels, setOpenTelegramAudiencePanels] = useState<Record<string, boolean>>({});
  const [telegramTemplateSearch, setTelegramTemplateSearch] = useState('');
  const [telegramTemplateFilter, setTelegramTemplateFilter] = useState<'all' | 'configured' | 'incomplete'>('all');
  const [telegramStudioMode, setTelegramStudioMode] = useState<'quick' | 'all' | 'incomplete' | 'todo'>('quick');
  const [telegramTodoDoneMap, setTelegramTodoDoneMap] = useState<Record<string, boolean>>({});
  const [telegramTodoLaterMap, setTelegramTodoLaterMap] = useState<Record<string, string>>({});
  const [telegramPinnedQuickActions, setTelegramPinnedQuickActions] = useState<Record<string, boolean>>({});
  const [telegramQuickActionUsageMap, setTelegramQuickActionUsageMap] = useState<Record<string, number>>({});
  const [settingsViewMode, setSettingsViewMode] = useState<'simple' | 'advanced'>(() => {
    try { return localStorage.getItem('settings.view.mode') === 'advanced' ? 'advanced' : 'simple'; } catch { return 'simple'; }
  });

  // ---- Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ---- Account (Profile / Security)
  const [meAvatarFile, setMeAvatarFile] = useState<File | null>(null);
  const [meAvatarPreview, setMeAvatarPreview] = useState<string | null>(null);
  const meAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [oldPassword, setOldPassword] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STYLE_PROFILES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setStyleProfiles(Array.isArray(parsed) ? parsed : []);
    } catch {
      setStyleProfiles([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STYLE_PROFILES_KEY, JSON.stringify(styleProfiles));
    } catch {}
  }, [styleProfiles]);
  useEffect(() => {
    try {
      localStorage.setItem('settings.view.mode', settingsViewMode);
    } catch {}
  }, [settingsViewMode]);
  useEffect(() => {
    let alive = true;
    const loadHistoricalPricingLearning = async () => {
      const localItems = loadPricingLearningItems();
      try {
        const pricingResponse = await apiFetch('/api/ai/pricing/decision-log');
        const pricingResult = await parseApiResult<PricingLearningApiResult>(pricingResponse, { endpoint: '/api/ai/pricing/decision-log', action: 'خواندن لاگ واقعی تصمیمات قیمت‌گذاری' });
        const serverItems = extractPricingLearningItems(pricingResult);
        const merged = mergePricingLearningItems([...localItems, ...serverItems]);
        if (!alive) return;
        setPricingLearningItems(merged);
        if (typeof window !== 'undefined') localStorage.setItem(PRICING_BEHAVIOR_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        try {
          const response = await apiFetch('/api/phones');
          const result = await parseApiResult<{ data?: PhoneEntry[] }>(response, { endpoint: '/api/phones', action: 'خواندن سابقه فروش گوشی برای هوش قیمت‌گذاری' });
          const phones = Array.isArray(result?.data) ? result.data : [];
          const historicalItems = buildPricingLearningFromPhones(phones, pricingSettings);
          const merged = mergePricingLearningItems([...localItems, ...historicalItems]);
          if (!alive) return;
          setPricingLearningItems(merged);
          if (typeof window !== 'undefined') localStorage.setItem(PRICING_BEHAVIOR_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          if (alive) setPricingLearningItems(localItems);
        }
      }
    };
    loadHistoricalPricingLearning();
    const settingsTelegramRetainedDerivedState = [telegramTopConnectionTone, telegramTopNextAction, getTelegramSmartCheckTone, accountQuickFacts, telegramHealthTone, telegramConfigCoachMessage, localBaseUrlValue];
  void settingsTelegramRetainedDerivedState;

  return () => { alive = false; };
  }, [pricingSettings.targetMarkupPercent, pricingSettings.roundStep]);


  const saveCurrentStyleProfile = () => {
    const normalizedName = styleProfileName.trim() || `استایل ${new Date().toLocaleDateString('fa-IR-u-ca-persian')}`;
    const profile: SavedStyleProfile = {
      id: `${Date.now()}`,
      name: normalizedName,
      snapshot: style,
      createdAt: new Date().toISOString(),
    };
    setStyleProfiles(prev => [profile, ...prev.filter(item => item.name !== normalizedName)].slice(0, 12));
    setStyleProfileName('');
  };

  const applyStyleProfile = (profile: SavedStyleProfile) => {
    setMany(profile.snapshot || {});
  };

  const deleteStyleProfile = (profileId: string) => {
    setStyleProfiles(prev => prev.filter(item => item.id !== profileId));
  };

  const applyAppStyleTemplate = (template: AppStyleTemplate) => {
    setMany(template.snapshot || {});
  };

  const saveTemplateAsProfile = (template: AppStyleTemplate) => {
    const profile: SavedStyleProfile = {
      id: `${Date.now()}-${template.key}`,
      name: template.label,
      snapshot: { ...style, ...(template.snapshot || {}) },
      createdAt: new Date().toISOString(),
    };
    setStyleProfiles(prev => [profile, ...prev.filter(item => item.name !== template.label)].slice(0, 12));
  };
  const settingsTypeDebtRetainedSymbols = [
    saveCurrentStyleProfile,
    applyStyleProfile,
    deleteStyleProfile,
    applyAppStyleTemplate,
    saveTemplateAsProfile,
  ];
  void settingsTypeDebtRetainedSymbols;
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [showAccountPasswordFields, setShowAccountPasswordFields] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ---- Notifications
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // ---- DB Backup/Restore
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

  const [backupList, setBackupList] = useState<BackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupScheduleMode, setBackupScheduleMode] = useState<'daily' | 'weekly' | 'interval'>(DEFAULT_BACKUP_SCHEDULE.mode);
  const [backupScheduleTime, setBackupScheduleTime] = useState(DEFAULT_BACKUP_SCHEDULE.time);
  const [backupScheduleWeekdays, setBackupScheduleWeekdays] = useState<number[]>(DEFAULT_BACKUP_SCHEDULE.weekdays);
  const [backupScheduleIntervalHours, setBackupScheduleIntervalHours] = useState(DEFAULT_BACKUP_SCHEDULE.intervalHours);
  const [backupTimezone, setBackupTimezone] = useState('Asia/Tehran');
  const [backupRetention, setBackupRetention] = useState(14);
  const [initialBackupSettings, setInitialBackupSettings] = useState({
    enabled: true,
    mode: DEFAULT_BACKUP_SCHEDULE.mode,
    time: DEFAULT_BACKUP_SCHEDULE.time,
    weekdays: [...DEFAULT_BACKUP_SCHEDULE.weekdays],
    intervalHours: DEFAULT_BACKUP_SCHEDULE.intervalHours,
    timezone: 'Asia/Tehran',
    retention: 14,
  });
  const [isSavingBackupSchedule, setIsSavingBackupSchedule] = useState(false);

  // ---- Local domain / TLS certificate
  const [isGeneratingLocalCert, setIsGeneratingLocalCert] = useState(false);
  const [localCertMessage, setLocalCertMessage] = useState<string | null>(null);
  const [localCertError, setLocalCertError] = useState<string | null>(null);

  // ---- Users
  const [users, setUsers] = useState<UserForDisplay[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const initialNewUserState: NewUserFormData = { username: '', password: '', confirmPassword: '', roleId: '' };
  const [newUser, setNewUser] = useState<NewUserFormData>(initialNewUserState);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [addUserFormErrors, setAddUserFormErrors] = useState<Partial<NewUserFormData>>({});
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserFormData | null>(null);
  const [, setEditUserFormErrors] = useState<Partial<EditUserFormData>>({});
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserForDisplay | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirmPassword: '' });
  const [resetPasswordErrors, setResetPasswordErrors] = useState<Partial<typeof resetPasswordData>>({});
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserForDisplay | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | string>('all');
  const [partnerShareStatus, setPartnerShareStatus] = useState<PartnerShareStatus>({ state: 'loading', totalShare: 0, partnerCount: 0, label: 'در حال بررسی', hint: 'در حال خواندن جمع سهم شرکا…' });



  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !q || [user.username, user.roleName, String(user.id)].some((value) => String(value || '').toLowerCase().includes(q));
      const matchesRole = userRoleFilter === 'all' || String(user.roleId) === userRoleFilter || user.roleName === userRoleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, userSearchQuery, userRoleFilter]);

  const userRoleSummaries = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((user) => {
      const key = user.roleName || '---';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([roleName, count]) => ({ roleName, count }))
      .sort((a, b) => b.count - a.count || a.roleName.localeCompare(b.roleName, 'fa'));
  }, [users]);

  const userStatsCards = useMemo(() => {
    const adminCount = users.filter((u) => String(u.roleName || '').toLowerCase() === 'admin').length;
    return [
      { label: 'کل کاربران', value: users.length.toLocaleString('fa-IR'), icon: 'fa-users', tone: 'text-slate-900 dark:text-white' },
      { label: 'نمایش فعلی', value: filteredUsers.length.toLocaleString('fa-IR'), icon: 'fa-filter', tone: 'text-slate-900 dark:text-white' },
      { label: 'نقش‌های تعریف‌شده', value: roles.length.toLocaleString('fa-IR'), icon: 'fa-user-gear', tone: 'text-slate-900 dark:text-white' },
      { label: 'کاربران ادمین', value: adminCount.toLocaleString('fa-IR'), icon: 'fa-shield-halved', tone: 'text-slate-900 dark:text-white' },
    ];
  }, [users, filteredUsers.length, roles.length]);


  useEffect(() => {
    if (!currentUser || !canManageStoreOwnershipByRole(currentUser.roleName)) return;
    let alive = true;
    const loadPartnerShareStatus = async () => {
      setPartnerShareStatus((prev) => ({ ...prev, state: 'loading', label: 'در حال بررسی', hint: 'در حال خواندن جمع سهم شرکا…' }));
      try {
        const response = await apiFetch('/api/store-ownership/profit-share-profiles');
        const result = await parseApiResult<{ success: boolean; data: PartnerShareProfileLike[] }>(response, { endpoint: '/api/store-ownership/profit-share-profiles', action: 'بررسی سلامت سهم شرکا' });
        if (!alive) return;
        setPartnerShareStatus(buildPartnerShareStatus(result?.data || []));
      } catch {
        if (!alive) return;
        setPartnerShareStatus({ state: 'error', totalShare: 0, partnerCount: 0, label: 'نامشخص', hint: 'وضعیت سهم شرکا فعلاً قابل خواندن نیست.' });
      }
    };
    loadPartnerShareStatus();
    const handleFocus = () => loadPartnerShareStatus();
    window.addEventListener('focus', handleFocus);
    return () => {
      alive = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.roleName]);

  // ---------- fetchData: بارگذاری همه‌چیز یکجا
  const fetchData = async () => {
    // فقط ادمین اجازه دارد
    if (!currentUser) return;
    if (currentUser.roleName !== 'Admin') {
      // کاربران غیرادمین فقط به تب «حساب کاربری» دسترسی دارند.
      setIsLoading(false);
      setTab('account');
      return;
    }

    let alive = true;
    setIsLoading(true);
    try {
      const [settingsRes, usersRes, rolesRes] = await Promise.all([
        apiFetch('/api/settings'),
        apiFetch('/api/users'),
        apiFetch('/api/roles'),
      ]);

      const [settingsJson, usersJson, rolesJson] = await Promise.all([
        settingsRes.json() as Promise<SettingsApiResult>,
        usersRes.json() as Promise<UsersApiResult>,
        rolesRes.json() as Promise<RolesApiResult>,
      ]);

      if (!settingsRes.ok || !settingsJson.success) throw new Error(settingsJson.message || 'خطا در دریافت تنظیمات');
      if (!usersRes.ok || !usersJson.success) throw new Error(usersJson.message || 'خطا در دریافت کاربران');
      if (!rolesRes.ok || !rolesJson.success) throw new Error(rolesJson.message || 'خطا در دریافت نقش‌ها');
      if (!alive) return;

      const sortedRoles: Role[] = rolesJson.data.sort((a: Role, b: Role) =>
        a.name === 'Admin' ? -1 : b.name === 'Admin' ? 1 : a.name.localeCompare(b.name, 'fa')
      );
      setRoles(sortedRoles);

      const enrichedUsers: UserForDisplay[] = usersJson.data.map((u) => {
        const role = sortedRoles.find(r => r.id === u.roleId);
        return { ...u, roleName: role?.name ?? u.roleName ?? '---' };
      });
      setUsers(enrichedUsers);

      const info: BusinessInformationSettings = settingsJson.data;
      setBusinessInfo(info);
      setInitialBusinessInfo(info);
      // Sync QR public base URL to localStorage for non-admin pages
      try {
        const v = info.qr_public_base_url;
        if (v) localStorage.setItem('qr_public_base_url', String(v));
        else localStorage.removeItem('qr_public_base_url');
      } catch {}
      writeStoredCurrencyUnit(info.currency_unit);

      if (info.store_logo_path) {
        const nextLogoPreview = await loadAuthedAssetUrl(`/uploads/${info.store_logo_path}?t=${Date.now()}`);
        setLogoPreview((prev) => {
          revokeObjectUrlSafe(prev);
          return nextLogoPreview;
        });
      } else {
        setLogoPreview((prev) => {
          revokeObjectUrlSafe(prev);
          return null;
        });
      }

      const loadedBackupSchedule = parseBackupScheduleFromSettings(toBusinessInfoDynamic(info));
      setBackupEnabled(String(info.backup_enabled ?? '1') !== '0');
      setBackupTimezone(String(info.backup_timezone || 'Asia/Tehran'));
      setBackupRetention(Number(info.backup_retention || 14));
      setBackupScheduleMode(loadedBackupSchedule.mode);
      setBackupScheduleTime(loadedBackupSchedule.time);
      setBackupScheduleWeekdays(loadedBackupSchedule.weekdays);
      setBackupScheduleIntervalHours(loadedBackupSchedule.intervalHours);
      setInitialBackupSettings({
        enabled: String(info.backup_enabled ?? '1') !== '0',
        mode: loadedBackupSchedule.mode,
        time: loadedBackupSchedule.time,
        weekdays: [...loadedBackupSchedule.weekdays],
        intervalHours: loadedBackupSchedule.intervalHours,
        timezone: String(info.backup_timezone || 'Asia/Tehran'),
        retention: Number(info.backup_retention || 14),
      });

      if (sortedRoles.length && !newUser.roleId) {
        setNewUser(prev => ({ ...prev, roleId: sortedRoles[0].id }));
      }
    } catch (err: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(err) || 'خطا در عملیاتی ناشناخته' });
    } finally {
      setIsLoading(false);
    }

    alive = false;
  };

  // بارگذاری اولیه
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  useEffect(() => {
    const storeName = normalizeStoreName(businessInfo.store_name || 'فروشگاه');
    applyDocumentBranding(storeName);
    if (style.brandMode === 'auto' && storeName) {
      syncBrandFromStoreName(storeName);
    }
  }, [businessInfo.store_name, style.brandMode]);

  // ------- Business form handlers
  const handleBusinessInfoChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBusinessInfo(prev => ({ ...prev, [name]: value }));
  };

  const openSmsPatternCheck = (title: string, bodyId: string, tokenLabels: string[]) => {
    setSmsCheckTitle(title);
    setSmsCheckBodyId(bodyId || '');
    setSmsCheckTokenLabels(tokenLabels);
    setSmsCheckOpen(true);
  };

  const openSmsPatternPreview = (title: string, previewTemplate: string, tokenLabels: string[]) => {
    setSmsPrevTitle(title);
    setSmsPrevTemplate(previewTemplate || '');
    setSmsPrevTokenLabels(tokenLabels);
    setSmsPrevOpen(true);
  };

  const [tgCheckAudience, setTgCheckAudience] = useState<TelegramAudience>('customer');

  const openTelegramTemplateCheck = (
    title: string,
    template: string,
    format: TelegramMessageFormat = 'text',
    allowedVars: TelegramTemplateVariable[] = [],
    audience: TelegramAudience = 'customer'
  ) => {
    setTgCheckTitle(title);
    setTgCheckTemplate(template || '');
    setTgCheckFormat(normalizeTelegramMessageFormat(format));
    setTgCheckAllowedVars(Array.isArray(allowedVars) ? allowedVars : []);
    setTgCheckAudience(audience);
    setTgCheckOpen(true);
  };

  const scrollToSection = (id: string) => {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const TG_VARS_COMMON = [
    { key: 'name', label: 'نام مشتری', example: 'بهزاد' },
    { key: 'phone', label: 'موبایل مشتری', example: '09xxxxxxxxx' },
    { key: 'link', label: 'لینک اپ', example: 'https://example.com/#/installments' },
    { key: 'now', label: 'زمان فعلی', example: '1404/12/10 12:00' },
  ];
  const TG_VARS_INSTALLMENTS = [
    ...TG_VARS_COMMON,
    { key: 'amount', label: 'مبلغ قسط', example: '1,250,000' },
    { key: 'dueDate', label: 'تاریخ سررسید', example: '1404/12/15' },
    { key: 'days', label: 'تعداد روز', example: '3' },
    { key: 'saleId', label: 'شماره فروش', example: '1024' },
    { key: 'total', label: 'مبلغ کل', example: '12,500,000' },
  ];
  const TG_VARS_CHECKS = [
    ...TG_VARS_COMMON,
    { key: 'checkNumber', label: 'شماره چک', example: 'A-55822' },
    { key: 'dueDate', label: 'تاریخ سررسید', example: '1404/12/15' },
    { key: 'amount', label: 'مبلغ', example: '3,000,000' },
    { key: 'days', label: 'تعداد روز', example: '7' },
  ];
  const TG_VARS_REPAIRS = [
    ...TG_VARS_COMMON,
    { key: 'deviceModel', label: 'مدل/نام دستگاه', example: 'iPhone 13 Pro' },
    { key: 'repairId', label: 'کد تعمیر', example: 'R-2025' },
    { key: 'status', label: 'وضعیت', example: 'آماده تحویل' },
    { key: 'estimatedCost', label: 'هزینه برآوردی', example: '850,000' },
    { key: 'finalCost', label: 'هزینه نهایی', example: '920,000' },
  ];
  const TG_VARS_ACCOUNT = [
    ...TG_VARS_COMMON,
    { key: 'status', label: 'وضعیت حساب', example: 'بدهکار' },
    { key: 'amount', label: 'مبلغ', example: '2,150,000' },
  ];

  const checkTelegramHealth = async () => {
    setTgIsChecking(true);
    setTgHealth(null);
    try {
      const res = await apiFetch('/api/telegram/health');
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خطا در بررسی و ادامه اتصال تلگرام'));
      const data = isRecord(js.data) ? js.data : {};
      setTgHealth({ ok: true, msg: String(js.message || 'اتصال برقرار است.'), bot: isRecord(data.bot) ? data.bot : null });
    } catch (error: unknown) {
      setTgHealth({ ok: false, msg: getErrorMessage(error) || 'عملیات ناموفق بود' });
    } finally {
      setTgIsChecking(false);
    }
  };

  const runTelegramDiagnostics = async () => {
    setTgDiagnosticsLoading(true);
    try {
      const res = await apiFetch('/api/telegram/debug/status');
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خطا در دریافت وضعیت Webhook/Polling'));
      const diagnosticsSource = isRecord(js.data) ? js.data : js;
      setTgDiagnostics(diagnosticsSource as TelegramDiagnosticsState);
      setNotification({ type: 'success', text: 'وضعیت فنی تلگرام دریافت شد.' });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'عملیات ناموفق بود' });
    } finally {
      setTgDiagnosticsLoading(false);
    }
  };

  const runTelegramAdminAction = async (action: 'enable-polling' | 'reset-bot-menu' | 'send-guest-menu-test' | 'send-real-menu' | 'send-customer-menu' | 'send-partner-menu') => {
    const labels: Record<typeof action, string> = {
      'enable-polling': 'فعال‌سازی دریافت لوکال',
      'reset-bot-menu': 'پاک‌سازی منوی تلگرام تلگرام',
      'send-guest-menu-test': 'ارسال منوی کنترل',
      'send-real-menu': 'ارسال پنل کاربر',
      'send-customer-menu': 'ارسال منوی مشتری',
      'send-partner-menu': 'ارسال منوی همکار',
    };
    let endpoint = `/api/telegram/admin/${action}`;
    if (action === 'send-guest-menu-test' || action === 'send-real-menu') {
      const chatId = window.prompt(action === 'send-real-menu' ? 'Chat ID کاربر را وارد کنید تا منوی واقعی بر اساس وضعیت اتصال فعلی ارسال شود.' : 'Chat ID مقصد را برای ارسال پیش‌نمایش پنل تلگرام وارد کنید. اگر نمی‌دانید، اول از بخش گفت‌وگوهای اخیر یا لاگ تلگرام Chat ID را پیدا کنید.');
      if (!chatId || !chatId.trim()) return;
      endpoint += `?chatId=${encodeURIComponent(chatId.trim())}`;
    }
    if (action === 'send-customer-menu') {
      const chatId = window.prompt('Chat ID تلگرام مشتری را وارد کنید.');
      if (!chatId || !chatId.trim()) return;
      const phone = window.prompt('شماره موبایل مشتری را وارد کنید. شماره باید دقیقاً در پرونده مشتری ثبت شده باشد.');
      if (!phone || !phone.trim()) return;
      endpoint += `?chatId=${encodeURIComponent(chatId.trim())}&phone=${encodeURIComponent(phone.trim())}`;
    }
    if (action === 'send-partner-menu') {
      const chatId = window.prompt('Chat ID تلگرام همکار را وارد کنید.');
      if (!chatId || !chatId.trim()) return;
      const phone = window.prompt('شماره موبایل همکار را وارد کنید. شماره باید دقیقاً در پرونده همکار ثبت شده باشد.');
      if (!phone || !phone.trim()) return;
      endpoint += `?chatId=${encodeURIComponent(chatId.trim())}&phone=${encodeURIComponent(phone.trim())}`;
    }
    setTgDiagnosticsBusyAction(action);
    try {
      const res = await apiFetch(endpoint, { method: 'POST' });
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || `${labels[action]} ناموفق بود`));
      setNotification({ type: 'success', text: String(js.message || `${labels[action]} انجام شد.`) });
      await runTelegramDiagnostics();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'عملیات ناموفق بود' });
    } finally {
      setTgDiagnosticsBusyAction(null);
    }
  };

  const sendTelegramQuickCheck = async () => {
    setTgIsSendingQuick(true);
    try {
      const res = await apiFetch('/api/telegram/check-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tgQuickMsg }),
      });
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خطا در بررسی و ادامه ارسال تلگرام'));
      setNotification({ type: 'success', text: String(js.message || 'ارسال شد.') });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'عملیات ناموفق بود' });
    } finally {
      setTgIsSendingQuick(false);
    }
  };

  const fetchTelegramRecentChats = async () => {
    const tokenValue = String(telegramInfo.telegram_bot_token || '').trim();
    const usernameValue = String(telegramInfo.telegram_bot_username || '').trim().replace(/^@+/, '');
    if (!tokenValue) {
      setNotification({ type: 'error', text: 'ابتدا توکن ربات تلگرام را وارد کنید.' });
      return;
    }
    if (!usernameValue) {
      setNotification({ type: 'error', text: 'نام کاربری ربات را هم بدون @ وارد کنید تا مدیر بتواند ربات را Start کند.' });
      return;
    }
    setTgChatLookupLoading(true);
    setTgRecentChats([]);
    setTgChatLookupHint('');
    try {
      const savedToken = String(initialTelegramInfo.telegram_bot_token || '').trim();
      const savedUsername = String(initialTelegramInfo.telegram_bot_username || '').trim().replace(/^@+/, '');
      const botConfigDirty = savedToken !== tokenValue || savedUsername !== usernameValue;
      if (botConfigDirty) {
        await runWithFeedback(
          apiFetch('/api/settings', {
            method: 'POST',
            body: JSON.stringify(businessInfo),
          }).then((response) => parseApiResult(response, { endpoint: '/api/settings', action: 'ذخیره تنظیمات پایه تلگرام' })),
          {
            kind: 'save',
            loading: 'در حال ذخیره توکن و نام ربات…',
            success: 'توکن و نام ربات ذخیره شد. حالا Chat ID از آخرین گفت‌وگوهای ربات خوانده می‌شود.',
            endpoint: '/api/settings',
          }
        );
        setInitialBusinessInfo(businessInfo);
      }
      const res = await apiFetch('/api/telegram/recent-chats');
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خواندن Chat ID انجام نشد.'));
      const data = isRecord(js.data) ? js.data : {};
      const chats = Array.isArray(data.chats) ? data.chats.map(normalizeTelegramRecentChat).filter((chat): chat is TelegramRecentChat => Boolean(chat)) : [];
      setTgRecentChats(chats);
      setTgChatLookupHint(String(data.hint || ''));
      if (chats.length === 1 && chats[0]?.chatId) {
        setBusinessInfo((prev) => ({ ...prev, telegram_chat_id: String(chats[0].chatId) }));
      }
      if (!chats.length) {
        setNotification({ type: 'info', text: data.updatesError ? `پیامی از ربات پیدا نشد. ${String(data.updatesError)}` : 'پیامی از ربات پیدا نشد. در تلگرام ربات را Start کنید و دوباره تلاش کنید.' });
      } else {
        setNotification({ type: 'success', text: `${chats.length.toLocaleString('fa-IR')} گفت‌وگوی اخیر از ربات دریافت شد.` });
      }
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'خواندن Chat ID انجام نشد.' });
    } finally {
      setTgChatLookupLoading(false);
    }
  };

  const fmtDateFa = (iso?: string | null) => {
    if (!iso) return '—';
    const formatted = formatIranDateTime(iso, '');
    return formatted || String(iso);
  };

  const fmtAgoFa = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    const s = Math.max(0, Math.floor(diffMs / 1000));
    if (s < 60) return `${s} ثانیه پیش`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} دقیقه پیش`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ساعت پیش`;
    const days = Math.floor(h / 24);
    return `${days} روز پیش`;
  };

  const fmtLag = (sec?: number | null) => {
    if (sec == null) return '—';
    const s = Math.max(0, Math.floor(sec));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h`;
  };

  const fetchTelegramControlCenter = async () => {
    setTgCCLoading(true);
    setTgCCError(null);
    try {
      const res = await apiFetch('/api/telegram/control-center');
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خطا در دریافت وضعیت تلگرام'));
      setTgCC(isRecord(js.data) ? js.data as TelegramControlCenterState : null);
    } catch (error: unknown) {
      setTgCCError(getErrorMessage(error) || 'عملیات ناموفق بود');
    } finally {
      setTgCCLoading(false);
    }
  };

  const tgRetryAllFailed = async () => {
    setTgBulkBusy(true);
    try {
      const res = await apiFetch('/api/telegram/outbox/retry-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خطا در Retry all'));
      setNotification({ type: 'success', text: String(js.message || 'انجام شد.') });
      await fetchTelegramControlCenter();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'عملیات ناموفق بود' });
    } finally {
      setTgBulkBusy(false);
    }
  };

  const tgCleanupFailed = async () => {
    setTgBulkBusy(true);
    try {
      const res = await apiFetch('/api/telegram/outbox/cleanup-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: tgCleanupDays }),
      });
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خطا در پاک‌سازی'));
      setNotification({ type: 'success', text: String(js.message || 'پاک‌سازی انجام شد.') });
      await fetchTelegramControlCenter();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'عملیات ناموفق بود' });
    } finally {
      setTgBulkBusy(false);
    }
  };

  useEffect(() => {
    if (tab === 'telegram') {
      fetchTelegramControlCenter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ------- Telegram settings validation (similar to SMS checks)
  const handleTelegramSettingsSubmit = async () => {
    try {
      const errs: string[] = [];
      const botToken = String(telegramInfo.telegram_bot_token || '').trim();
      const botUsername = String(telegramInfo.telegram_bot_username || '').trim().replace(/^@+/, '');
      const chatId = String(telegramInfo.telegram_chat_id || '').trim();
      const proxy = String(telegramInfo.telegram_proxy || '').trim();
      const silent = String(telegramInfo.telegram_silent_hours || '').trim();

      const chatLists = {
        reports: String(telegramInfo.telegram_chat_ids_reports || '').trim(),
        installments: String(telegramInfo.telegram_chat_ids_installments || '').trim(),
        sales: String(telegramInfo.telegram_chat_ids_sales || '').trim(),
        notifications: String(telegramInfo.telegram_chat_ids_notifications || '').trim(),
      };

      const hasAnyTopicChat = Object.values(chatLists).some((v) => !!v);

      // token format: <digits>:<secret>
      if (!botToken) errs.push('توکن ربات تلگرام را وارد کنید.');
      else if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken)) errs.push('فرمت توکن ربات تلگرام نامعتبر است.');

      if (botUsername && !/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(botUsername)) errs.push('نام کاربری ربات تلگرام نامعتبر است. بدون @ و فقط با حروف انگلیسی، عدد و _.');

      // At least one destination should exist
      if (!chatId && !hasAnyTopicChat) errs.push('حداقل یک Chat ID مقصد (عمومی یا برای یکی از Topicها) را وارد کنید.');

      const isValidChatId = (v: string) => /^-?\d+$/.test(v.trim()) || /^@[A-Za-z0-9_]{5,}$/.test(v.trim());
      if (chatId && !isValidChatId(chatId)) errs.push('شناسه چت (telegram_chat_id) باید عددی یا یوزرنیم کانال/گروه باشد (مثلاً -100123... یا @kourosh_channel).');

      const splitChatIds = (txt: string) => txt.split(/[\n,؛;\s]+/g).map(s => s.trim()).filter(Boolean);
      for (const [k, v] of Object.entries(chatLists)) {
        if (!v) continue;
        const bad = splitChatIds(v).filter((x) => !isValidChatId(x));
        if (bad.length) errs.push(`Chat IDهای بخش «${k}» نامعتبر است: ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? '…' : ''}`);
      }

      // proxy format (optional)
      if (proxy && !/^(socks5|socks|http|https):\/\//i.test(proxy)) errs.push('فرمت پراکسی تلگرام نامعتبر است. مثال: socks5://127.0.0.1:10808');

      // silent hours format (optional): HH:mm-HH:mm
      if (silent) {
        const m = silent.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
        if (!m) errs.push('فرمت ساعات سکوت تلگرام نامعتبر است. مثال: 22:00-08:00');
        else {
          const hh1 = Number(m[1]), mm1 = Number(m[2]), hh2 = Number(m[3]), mm2 = Number(m[4]);
          const ok = (hh1>=0 && hh1<=23 && hh2>=0 && hh2<=23 && mm1>=0 && mm1<=59 && mm2>=0 && mm2<=59);
          if (!ok) errs.push('ساعات سکوت تلگرام خارج از بازه است (00-23 و 00-59).');
        }
      }

      if (errs.length) {
        setNotification({ type: 'error', text: errs[0] });
        return;
      }

      await handleBusinessInfoSubmit();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'خطا در ذخیره تغییرات تنظیمات تلگرام' });
    }
  };

	// تعریف مرکزی پترن‌های ملی پیامک برای رابط کاربری و بررسی و ادامه سلامت
	const meliPatternDefs: SmsPatternDef[] = [
		{
			key: 'meli_payamak_installment_settlement_pattern_id',
			label: 'تسویه اقساط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-circle-check',
			tokens: ['نام مشتری'],
			previewTemplate: 'مشتری گرامی {1}، باعث افتخار است به اطلاع برسانیم تمام اقساط خرید شما با موفقیت تسویه گردید. از اعتماد شما به فروشگاه کوروش سپاسگزاریم.',
		},
		{
			key: 'meli_payamak_installment_overdue_pattern_id',
			label: 'اطلاع‌رسانی دیرکرد اقساط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-triangle-exclamation',
			tokens: ['نام مشتری', 'مبلغ', 'تاریخ سررسید'],
			previewTemplate: 'مشتری گرامی {1}، پرداخت قسط شما به مبلغ {2} تومان با سررسید {3} هنوز در سیستم ما ثبت اطلاعات نشده است. لطفاً جهت پیگیری اقدام فرمایید. فروشگاه کوروش',
		},
		{
			key: 'meli_payamak_installment_sale_created_pattern_id',
			label: 'ثبت فروش اقساطی',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-file-invoice-dollar',
			tokens: ['نام مشتری', 'شماره قرارداد', 'مبلغ کل'],
			previewTemplate: APP_MESSAGES.telegram.installmentSaleCreatedPatternPreview,
		},
		{
			key: 'meli_payamak_installment_due_notice_pattern_id',
			label: 'سررسید قسط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-calendar-day',
			tokens: ['نام مشتری', 'تاریخ سررسید', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، قسط شما با سررسید {2} آماده پرداخت است. مبلغ: {3} تومان. موبایل کوروش',
		},
		{
			key: 'meli_payamak_payment_confirmation_pattern_id',
			label: 'تأیید دریافت قسط',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-hand-holding-dollar',
			tokens: ['نام مشتری', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، پرداخت قسط شما به مبلغ {2} تومان با موفقیت ثبت شد. از پرداخت به موقع شما سپاسگزاریم. فروشگاه کوروش',
		},
		{
			key: 'meli_payamak_repair_received_pattern_id',
			label: 'تأیید پذیرش گوشی تعمیری',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-inbox',
			tokens: ['نام مشتری', 'مدل دستگاه', 'کد رهگیری'],
			previewTemplate: 'مشتری گرامی {1}، دستگاه {2} شما جهت تعمیرات در فروشگاه کوروش پذیرش و با کد رهگیری {3} ثبت اطلاعات گردید. وضعیت دستگاه از طریق تماس با فروشگاه قابل پیگیری است. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_cost_notice_pattern_id',
			label: 'اعلام هزینه',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-sack-dollar',
			tokens: ['نام مشتری', 'مدل دستگاه', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، هزینه تعمیرات دستگاه {2} شما مبلغ {3} تومان برآورد شده است. لطفاً جهت تأیید و ادامه فرآیند تعمیر با فروشگاه تماس حاصل فرمایید. فروشگاه کوروش. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_ready_pattern_id',
			label: 'گوشی تعمیری آماده تحویل',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-box-open',
			tokens: ['نام مشتری', 'مدل دستگاه', 'مبلغ قابل پرداخت'],
			previewTemplate: 'مشتری گرامی {1}، تعمیرات دستگاه {2} شما به اتمام رسید و آماده تحویل است. مبلغ قابل پرداخت: {3} تومان. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_delivered_pattern_id',
			label: 'تحویل گوشی تعمیری',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-mobile-screen-button',
			tokens: ['نام مشتری', 'مدل دستگاه', 'شماره رسید'],
			previewTemplate: 'مشتری گرامی {1}، دستگاه {2} با موفقیت تحویل شد. شماره رسید: {3}. سپاس از همراهی شما. موبایل کوروش',
		},
		{
			key: 'meli_payamak_repair_status_pattern_id',
			label: 'وضعیت تعمیرات',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-screwdriver-wrench',
			tokens: ['مدل دستگاه', 'وضعیت'],
			previewTemplate: 'تعمیرات کوروش: دستگاه شما {1} در وضعیت {2} است. موبایل کوروش',
		},
		{
			key: 'meli_payamak_account_balance_pattern_id',
			label: 'بدهی/طلب',
			category: 'حساب',
			accent: 'gray',
			iconClass: 'fa-solid fa-scale-balanced',
			tokens: ['وضعیت', 'مبلغ'],
			previewTemplate: 'وضعیت حساب کوروش: {1} {2} تومان. موبایل کوروش',
		},
		{
			key: 'meli_payamak_check_failed_pattern_id',
			label: 'چک برگشتی',
			category: 'چک‌ها',
			accent: 'amber',
			iconClass: 'fa-solid fa-file-circle-xmark',
			tokens: ['نام مشتری', 'تاریخ', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، چک شما در تاریخ {2} برگشتی ثبت شده است. مبلغ: {3} تومان. لطفاً برای پیگیری اقدام کنید. موبایل کوروش',
		},
		{
			key: 'meli_payamak_invoice_created_pattern_id',
			label: 'ثبت اطلاعات فاکتور',
			category: 'فاکتورها',
			accent: 'gray',
			iconClass: 'fa-solid fa-file-invoice',
			tokens: ['نام مشتری', 'شماره فاکتور', 'مبلغ قابل پرداخت'],
			previewTemplate: 'مشتری گرامی {1}، فاکتور شما با موفقیت ثبت شد. شماره فاکتور: {2}. مبلغ قابل پرداخت: {3} تومان. فروشگاه کوروش',
		},
		{
			key: 'meli_payamak_invoice_payment_received_pattern_id',
			label: 'پرداخت فاکتور',
			category: 'فاکتورها',
			accent: 'gray',
			iconClass: 'fa-solid fa-receipt',
			tokens: ['نام مشتری', 'شماره فاکتور', 'مبلغ'],
			previewTemplate: 'مشتری گرامی {1}، پرداخت فاکتور {2} به مبلغ {3} تومان با موفقیت ثبت شد. فروشگاه کوروش',
		},
	];


  
  // تعریف مرکزی قالب‌های تلگرام برای پیش‌نمایش و بررسی و ادامه ارسال
  type TelegramAudience = 'customer' | 'partner' | 'manager';
  const tgAudienceMeta: Record<TelegramAudience, { label: string; icon: string; chip: string }> = {
    customer: { label: 'مشتری', icon: 'fa-user', chip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200' },
    partner: { label: 'همکار', icon: 'fa-users-gear', chip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200' },
    manager: { label: 'مدیر', icon: 'fa-user-tie', chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200' },
  };

  const tgCategoryMeta: Record<string, { icon: string; tone: string; description: string; quickHint: string; heroChip: string; heroBar: string }> = {
    'اقساط': {
      icon: 'fa-receipt',
      tone: 'from-sky-500/10 via-cyan-500/10 to-transparent',
      description: 'قالب‌های فروش اقساطی، سررسید، دیرکرد، دریافت قسط و تسویه را از اینجا یکجا مدیریت کن.',
      quickHint: 'اول سررسید و دیرکرد را کامل کن تا پیگیری‌ها عقب نماند.',
      heroChip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
      heroBar: 'from-sky-500 via-cyan-500 to-teal-500',
    },
    'تعمیرات': {
      icon: 'fa-screwdriver-wrench',
      tone: 'from-violet-500/10 via-fuchsia-500/10 to-transparent',
      description: 'پذیرش، اعلام هزینه، آماده تحویل، تحویل نهایی و وضعیت تعمیرات را با پیام‌های هماهنگ نگه دار.',
      quickHint: 'اعلام هزینه و آماده تحویل بیشترین اثر را روی تجربه مشتری دارند.',
      heroChip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200',
      heroBar: 'from-violet-500 via-fuchsia-500 to-pink-500',
    },
    'حساب': {
      icon: 'fa-scale-balanced',
      tone: 'from-slate-500/10 via-zinc-500/10 to-transparent',
      description: 'پیام‌های بدهی و طلب مشتری را در این بخش برای مشتری، همکار و مدیر یکدست کن.',
      quickHint: 'این دسته کم‌رویداد است اما برای شفافیت مالی خیلی مهم است.',
      heroChip: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
      heroBar: 'from-slate-500 via-zinc-500 to-neutral-500',
    },
    'چک‌ها': {
      icon: 'fa-file-circle-xmark',
      tone: 'from-amber-500/10 via-orange-500/10 to-transparent',
      description: 'اعلان‌های چک برگشتی و موارد پیگیری مالی را متمرکز و سریع بررسی و ادامه کن.',
      quickHint: 'اگر ناقص ماند، حتماً اولویت بالا بده چون اثر مالی مستقیم دارد.',
      heroChip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
      heroBar: 'from-amber-500 via-orange-500 to-rose-500',
    },
    'فاکتورها': {
      icon: 'fa-file-invoice',
      tone: 'from-emerald-500/10 via-teal-500/10 to-transparent',
      description: 'ثبت اطلاعات فاکتور و پرداخت فاکتور را با پیام‌های استاندارد و قابل اتکا نگه دار.',
      quickHint: 'فاکتور و پرداخت آن را کنار هم کامل کن تا جریان مالی کامل شود.',
      heroChip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
      heroBar: 'from-emerald-500 via-teal-500 to-cyan-500',
    },
  };

  const getTelegramAllowedVars = (key: string) => {
    if (key.includes('repair')) return TG_VARS_REPAIRS;
    if (key.includes('account')) return TG_VARS_ACCOUNT;
    if (key.includes('check')) return TG_VARS_CHECKS;
    if (key.includes('invoice')) return [...TG_VARS_COMMON, { key: 'invoiceNo', label: 'شماره فاکتور', example: '1542' }, { key: key.includes('created') ? 'total' : 'amount', label: 'مبلغ', example: key.includes('created') ? '7,800,000' : '2,500,000' }];
    return TG_VARS_INSTALLMENTS;
  };

  const getTelegramFormatKey = (key: string) => `${key}_format`;
  const getTelegramAudienceKey = (key: string, audience: TelegramAudience) => (audience === 'customer' ? key : `${key}_${audience}`);
  const getTelegramAudienceFormatKey = (key: string, audience: TelegramAudience) => (audience === 'customer' ? `${key}_format` : `${key}_${audience}_format`);


  const buildTelegramAudiencePreset = (key: string, audience: TelegramAudience) => {
    const policy = String(telegramInfo.telegram_template_policy || 'formal').trim() as 'formal' | 'friendly' | 'short';
    const card = (title: string, icon: string, lines: string[], footer: string) => {
      const headline = policy === 'short' ? `<b>${title}</b>` : `<b>${icon} ${title}</b>`;
      const intro = policy === 'friendly' && audience === 'customer' ? ['سلام 🌿'] : [];
      const divider = policy === 'short' ? [] : ['────────────'];
      const tail = policy === 'short' ? [] : ['', footer];
      return [
        ...intro,
        headline,
        ...divider,
        ...lines,
        ...tail,
      ].filter(Boolean).join('\n');
    };

    const presets: Record<string, Record<TelegramAudience, string>> = {
      telegram_installment_settlement_message: {
        customer: card('تسویه کامل اقساط', '✅', [
          '👤 <b>{name}</b>',
          '🧾 <b>شماره قرارداد:</b> {saleId}',
          '💰 <b>جمع کل پرونده:</b> {total} تومان',
        ], '🙏 از اعتماد شما سپاسگزاریم.'),
        partner: card('تسویه پرونده اقساط', '✅', [
          '👤 <b>{name}</b>',
          '🧾 <b>شماره قرارداد:</b> {saleId}',
          '💰 <b>جمع کل پرونده:</b> {total} تومان',
        ], 'ℹ️ پرونده با موفقیت تسویه شده است.'),
        manager: card('گزارش مدیریتی تسویه', '📊', [
          '👤 <b>{name}</b>',
          '🧾 <b>شماره قرارداد:</b> {saleId}',
          '💰 <b>جمع کل پرونده:</b> {total} تومان',
        ], '📌 وضعیت: تسویه کامل'),
      },
      telegram_installment_overdue_message: {
        customer: card('یادآوری پرداخت معوق', '⚠️', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ قسط:</b> {amount} تومان',
          '📅 <b>سررسید:</b> {dueDate}',
        ], 'لطفاً در اولین فرصت جهت پیگیری اقدام فرمایید.'),
        partner: card('پیگیری قسط معوق', '⚠️', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ قسط:</b> {amount} تومان',
          '📅 <b>سررسید:</b> {dueDate}',
        ], '🔔 این پرونده نیاز به پیگیری دارد.'),
        manager: card('هشدار مدیریتی اقساط', '🚨', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ قسط:</b> {amount} تومان',
          '📅 <b>سررسید:</b> {dueDate}',
        ], '📌 وضعیت: پرداخت نشده'),
      },
      telegram_installment_sale_created_message: {
        customer: card('ثبت فروش اقساطی', '🧾', [
          '👤 <b>{name}</b>',
          '🧾 <b>شماره قرارداد:</b> {saleId}',
          '💰 <b>مبلغ کل:</b> {total} تومان',
        ], APP_MESSAGES.success.created),
        partner: card('فروش اقساطی جدید', '🧾', [
          '👤 <b>{name}</b>',
          '🧾 <b>شماره قرارداد:</b> {saleId}',
          '💰 <b>مبلغ کل:</b> {total} تومان',
        ], 'ℹ️ پرونده در سیستم ثبت شد.'),
        manager: card('گزارش ثبت اطلاعات فروش', '📈', [
          '👤 <b>{name}</b>',
          '🧾 <b>شماره قرارداد:</b> {saleId}',
          '💰 <b>مبلغ کل:</b> {total} تومان',
        ], '📌 فروش جدید با موفقیت ثبت شد.'),
      },
      telegram_installment_due_notice_message: {
        customer: card('سررسید قسط', '⏳', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ:</b> {amount} تومان',
          '📅 <b>سررسید:</b> {dueDate}',
        ], 'لطفاً پرداخت را در موعد مقرر انجام دهید.'),
        partner: card('سررسید پیش‌رو', '⏳', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ:</b> {amount} تومان',
          '📅 <b>سررسید:</b> {dueDate}',
        ], '🔔 برای پیگیری آماده باشید.'),
        manager: card('گزارش سررسید اقساط', '📅', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ:</b> {amount} تومان',
          '📅 <b>سررسید:</b> {dueDate}',
        ], '📌 این پیام جهت کنترل مدیریتی است.'),
      },
      telegram_installment_payment_received_message: {
        customer: card('تأیید پرداخت قسط', '✅', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ پرداختی:</b> {amount} تومان',
        ], 'از پرداخت به‌موقع شما سپاسگزاریم.'),
        partner: card('ثبت اطلاعات پرداخت قسط', '💳', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ پرداختی:</b> {amount} تومان',
        ], 'ℹ️ وضعیت پرونده را به‌روزرسانی کنید.'),
        manager: card('گزارش دریافت قسط', '💳', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ پرداختی:</b> {amount} تومان',
        ], '📌 پرداخت با موفقیت ثبت شد.'),
      },
      telegram_repair_received_message: {
        customer: card('پذیرش تعمیر', '📥', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '🧾 <b>کد تعمیر:</b> {repairId}',
        ], 'وضعیت از بخش تعمیرات قابل پیگیری است.'),
        partner: card('ثبت اطلاعات پذیرش تعمیر', '📥', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '🧾 <b>کد تعمیر:</b> {repairId}',
        ], 'ℹ️ سفارش در صف تعمیرات قرار گرفت.'),
        manager: card('گزارش پذیرش تعمیر', '🛠', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '🧾 <b>کد تعمیر:</b> {repairId}',
        ], '📌 پذیرش با موفقیت ثبت شد.'),
      },
      telegram_repair_cost_notice_message: {
        customer: card('اعلام هزینه تعمیر', '🧮', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان',
        ], 'لطفاً برای تأیید ادامه فرآیند با فروشگاه تماس بگیرید.'),
        partner: card('هزینه برآوردی تعمیر', '🧮', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان',
        ], '🔔 منتظر تأیید مشتری بمانید.'),
        manager: card('گزارش هزینه تعمیر', '🧮', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '💰 <b>هزینه برآوردی:</b> {estimatedCost} تومان',
        ], '📌 وضعیت: در انتظار تأیید'),
      },
      telegram_repair_ready_message: {
        customer: card('آماده تحویل', '📦', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '💰 <b>هزینه نهایی:</b> {finalCost} تومان',
        ], 'برای تحویل دستگاه هماهنگ کنید.'),
        partner: card('آماده تحویل تعمیر', '📦', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '💰 <b>هزینه نهایی:</b> {finalCost} تومان',
        ], 'ℹ️ دستگاه آماده تحویل است.'),
        manager: card('گزارش آماده تحویل', '📦', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '💰 <b>هزینه نهایی:</b> {finalCost} تومان',
        ], '📌 وضعیت: تکمیل شده'),
      },
      telegram_repair_delivered_message: {
        customer: card('تحویل دستگاه', '📦', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '🧾 <b>کد تعمیر:</b> {repairId}',
        ], 'از همراهی شما سپاسگزاریم.'),
        partner: card('تعمیر تحویل شد', '📦', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '🧾 <b>کد تعمیر:</b> {repairId}',
        ], 'ℹ️ پرونده بسته شد.'),
        manager: card('گزارش تحویل تعمیر', '📦', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          '🧾 <b>کد تعمیر:</b> {repairId}',
        ], '📌 تحویل با موفقیت انجام شد.'),
      },
      telegram_repair_status_message: {
        customer: card('به‌روزرسانی وضعیت تعمیر', '🛠', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          'ℹ️ <b>وضعیت:</b> {status}',
        ], 'وضعیت دستگاه شما به‌روز شد.'),
        partner: card('وضعیت تعمیر به‌روز شد', '🛠', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          'ℹ️ <b>وضعیت:</b> {status}',
        ], '📌 پرونده را بررسی و ادامه کنید.'),
        manager: card('گزارش وضعیت تعمیر', '🛠', [
          '👤 <b>{name}</b>',
          '📱 <b>دستگاه:</b> {deviceModel}',
          'ℹ️ <b>وضعیت:</b> {status}',
        ], '📌 تغییر وضعیت ثبت شد.'),
      },
      telegram_account_balance_message: {
        customer: card('وضعیت حساب', '📌', [
          '👤 <b>{name}</b>',
          '💳 <b>وضعیت:</b> {status}',
          '💰 <b>مبلغ:</b> {amount} تومان',
        ], 'از منوی تلگرام می‌توانید جزئیات بیشتری ببینید.'),
        partner: card('وضعیت حساب مشتری', '📌', [
          '👤 <b>{name}</b>',
          '💳 <b>وضعیت:</b> {status}',
          '💰 <b>مبلغ:</b> {amount} تومان',
        ], 'ℹ️ برای پیگیری مالی استفاده شود.'),
        manager: card('گزارش وضعیت حساب', '📊', [
          '👤 <b>{name}</b>',
          '💳 <b>وضعیت:</b> {status}',
          '💰 <b>مبلغ:</b> {amount} تومان',
        ], '📌 گزارش مدیریتی حساب مشتری'),
      },
      telegram_check_failed_message: {
        customer: card('وضعیت چک برگشتی', '🧾', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ:</b> {amount} تومان',
          '📅 <b>تاریخ:</b> {dueDate}',
        ], 'لطفاً برای پیگیری اقدام فرمایید.'),
        partner: card('هشدار چک برگشتی', '🧾', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ:</b> {amount} تومان',
          '📅 <b>تاریخ:</b> {dueDate}',
        ], '🔔 پیگیری لازم انجام شود.'),
        manager: card('گزارش چک برگشتی', '🧾', [
          '👤 <b>{name}</b>',
          '💰 <b>مبلغ:</b> {amount} تومان',
          '📅 <b>تاریخ:</b> {dueDate}',
        ], '📌 وضعیت: ناموفق'),
      },
      telegram_invoice_created_message: {
        customer: card('ثبت اطلاعات فاکتور', '🧾', [
          '👤 <b>{name}</b>',
          '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
          '💰 <b>مبلغ:</b> {total} تومان',
        ], 'فاکتور شما با موفقیت ثبت شد.'),
        partner: card('فاکتور جدید', '🧾', [
          '👤 <b>{name}</b>',
          '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
          '💰 <b>مبلغ:</b> {total} تومان',
        ], 'ℹ️ فاکتور در سیستم ثبت شد.'),
        manager: card('گزارش ثبت اطلاعات فاکتور', '🧾', [
          '👤 <b>{name}</b>',
          '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
          '💰 <b>مبلغ:</b> {total} تومان',
        ], '📌 ثبت اطلاعات فاکتور با موفقیت انجام شد.'),
      },
      telegram_invoice_payment_received_message: {
        customer: card('تأیید پرداخت فاکتور', '💳', [
          '👤 <b>{name}</b>',
          '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
          '💰 <b>مبلغ:</b> {amount} تومان',
        ], 'از پرداخت شما سپاسگزاریم.'),
        partner: card('پرداخت فاکتور', '💳', [
          '👤 <b>{name}</b>',
          '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
          '💰 <b>مبلغ:</b> {amount} تومان',
        ], 'ℹ️ وضعیت مالی به‌روز شد.'),
        manager: card('گزارش دریافت فاکتور', '💳', [
          '👤 <b>{name}</b>',
          '🔢 <b>شماره فاکتور:</b> {invoiceNo}',
          '💰 <b>مبلغ:</b> {amount} تومان',
        ], '📌 پرداخت با موفقیت ثبت شد.'),
      },
    };
    return presets[key]?.[audience] || '';
  };

  const applyTelegramPreset = (key: string, audience: TelegramAudience) => {
    const value = buildTelegramAudiencePreset(key, audience).trim();
    if (!value) return;
    const audienceKey = getTelegramAudienceKey(key, audience);
    const formatKey = getTelegramAudienceFormatKey(key, audience);
    setBusinessInfo((prev) => ({
      ...prev,
      [audienceKey]: value,
      [formatKey]: 'html',
    }));
  };

  const telegramTemplateDefs: TelegramTemplateDef[] = [
    {
      key: 'telegram_installment_settlement_message',
      label: 'تسویه اقساط',
      category: 'اقساط',
      iconClass: 'fa-solid fa-circle-check',
      preview: '✅ تسویه کامل اقساط\nمشتری: {name}\nشماره قرارداد: {saleId}\nجمع کل: {total} تومان',
    },
    {
      key: 'telegram_installment_overdue_message',
      label: 'اطلاع‌رسانی دیرکرد اقساط',
      category: 'اقساط',
      iconClass: 'fa-solid fa-triangle-exclamation',
      preview: '⚠️ یادآوری پرداخت معوق\nمشتری: {name}\nمبلغ قسط: {amount} تومان\nسررسید: {dueDate}',
    },
    {
      key: 'telegram_installment_sale_created_message',
      label: 'ثبت فروش اقساطی',
      category: 'اقساط',
      iconClass: 'fa-solid fa-file-invoice-dollar',
      preview: '🧾 ثبت فروش اقساطی\nمشتری: {name}\nشماره قرارداد: {saleId}\nمبلغ کل: {total} تومان',
    },
    {
      key: 'telegram_installment_due_notice_message',
      label: 'سررسید قسط',
      category: 'اقساط',
      iconClass: 'fa-solid fa-calendar-day',
      preview: '⏳ سررسید قسط\nمشتری: {name}\nمبلغ: {amount} تومان\nسررسید: {dueDate}',
    },
    {
      key: 'telegram_installment_payment_received_message',
      label: 'تأیید دریافت قسط',
      category: 'اقساط',
      iconClass: 'fa-solid fa-hand-holding-dollar',
      preview: '✅ تأیید دریافت قسط\nمشتری: {name}\nمبلغ پرداختی: {amount} تومان',
    },
    {
      key: 'telegram_repair_received_message',
      label: 'تأیید پذیرش گوشی تعمیری',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-inbox',
      preview: '📥 پذیرش تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}',
    },
    {
      key: 'telegram_repair_cost_notice_message',
      label: 'اعلام هزینه',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-sack-dollar',
      preview: '🧮 اعلام هزینه\nمشتری: {name}\nدستگاه: {deviceModel}\nهزینه برآوردی: {estimatedCost} تومان',
    },
    {
      key: 'telegram_repair_ready_message',
      label: 'گوشی تعمیری آماده تحویل',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-box-open',
      preview: '📦 آماده تحویل\nمشتری: {name}\nدستگاه: {deviceModel}\nهزینه نهایی: {finalCost} تومان',
    },
    {
      key: 'telegram_repair_delivered_message',
      label: 'تحویل گوشی تعمیری',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-mobile-screen-button',
      preview: '📦 تحویل تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}',
    },
    {
      key: 'telegram_repair_status_message',
      label: 'وضعیت تعمیرات',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-screwdriver-wrench',
      preview: '🛠 وضعیت تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nوضعیت: {status}',
    },
    {
      key: 'telegram_account_balance_message',
      label: 'بدهی/طلب',
      category: 'حساب',
      iconClass: 'fa-solid fa-scale-balanced',
      preview: '📌 وضعیت حساب\nمشتری: {name}\nوضعیت: {status}\nمبلغ: {amount} تومان',
    },
    {
      key: 'telegram_check_failed_message',
      label: 'چک برگشتی',
      category: 'چک‌ها',
      iconClass: 'fa-solid fa-file-circle-xmark',
      preview: '🧾 چک برگشتی\nمشتری: {name}\nتاریخ: {dueDate}\nمبلغ: {amount} تومان',
    },
    {
      key: 'telegram_invoice_created_message',
      label: 'ثبت اطلاعات فاکتور',
      category: 'فاکتورها',
      iconClass: 'fa-solid fa-file-invoice',
      preview: '🧾 ثبت اطلاعات فاکتور\nمشتری: {name}\nشماره فاکتور: {invoiceNo}\nمبلغ: {total} تومان',
    },
    {
      key: 'telegram_invoice_payment_received_message',
      label: 'پرداخت فاکتور',
      category: 'فاکتورها',
      iconClass: 'fa-solid fa-receipt',
      preview: '💳 پرداخت فاکتور\nمشتری: {name}\nشماره فاکتور: {invoiceNo}\nمبلغ: {amount} تومان',
    },
  ].map((item) => ({
    ...item,
    formatKey: getTelegramFormatKey(item.key),
    allowedVars: getTelegramAllowedVars(item.key),
  }));

  const telegramGroupedDefs = Object.entries(telegramTemplateDefs.reduce<Record<string, TelegramTemplateDef[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {}));

  const telegramQuickSetupKeys = new Set([
    'telegram_installment_sale_created_message',
    'telegram_installment_due_notice_message',
    'telegram_installment_overdue_message',
    'telegram_repair_received_message',
    'telegram_repair_cost_notice_message',
    'telegram_repair_ready_message',
    'telegram_account_balance_message',
    'telegram_invoice_created_message',
  ]);

  const telegramPriorityMap: Record<string, number> = {
    telegram_installment_due_notice_message: 1,
    telegram_installment_overdue_message: 1,
    telegram_account_balance_message: 1,
    telegram_repair_ready_message: 1,
    telegram_repair_cost_notice_message: 1,
    telegram_invoice_created_message: 2,
    telegram_installment_sale_created_message: 2,
    telegram_repair_received_message: 2,
    telegram_check_failed_message: 2,
    telegram_installment_payment_received_message: 3,
    telegram_installment_settlement_message: 3,
    telegram_invoice_payment_received_message: 3,
    telegram_repair_status_message: 3,
    telegram_repair_delivered_message: 3,
  };

  const getTelegramPriorityMeta = (itemKey: string) => {
    const level = telegramPriorityMap[itemKey] ?? 3;
    if (level === 1) {
      return {
        level,
        label: 'اولویت بالا',
        icon: 'fa-bolt',
        chip: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200',
      };
    }
    if (level === 2) {
      return {
        level,
        label: 'اولویت متوسط',
        icon: 'fa-layer-group',
        chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
      };
    }
    return {
      level,
      label: 'اولویت معمولی',
      icon: 'fa-list-check',
      chip: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
    };
  };

  const resolveTelegramFilterMode = (): 'all' | 'configured' | 'incomplete' => {
    if (telegramStudioMode === 'incomplete' || telegramStudioMode === 'todo') return 'incomplete';
    return telegramTemplateFilter;
  };

  const telegramEffectiveFilter = resolveTelegramFilterMode();

  const filteredTelegramGroupedDefs = telegramGroupedDefs
    .map(([category, items]) => {
      const nextItems = items
        .filter((item) => {
          const itemStatus = getTelegramItemStatus(item.key);
          const audienceConfigured = itemStatus.anyConfigured;
          const matchesMode =
            telegramStudioMode === 'quick'
              ? telegramQuickSetupKeys.has(item.key)
              : telegramStudioMode === 'todo'
                ? !itemStatus.allConfigured
                : true;
          const matchesFilter = telegramEffectiveFilter === 'all'
            ? true
            : telegramEffectiveFilter === 'configured'
              ? audienceConfigured
              : !itemStatus.allConfigured;
          const haystack = [category, item.label, item.preview, ...item.allowedVars.map((v) => v.key), ...item.allowedVars.map((v) => v.label || '')]
            .join(' ')
            .toLowerCase();
          const needle = telegramTemplateSearch.trim().toLowerCase();
          const matchesSearch = !needle || haystack.includes(needle);
          return matchesMode && matchesFilter && matchesSearch;
        })
        .sort((a, b) => {
          const statusA = getTelegramItemStatus(a.key);
          const statusB = getTelegramItemStatus(b.key);
          const priorityA = getTelegramPriorityMeta(a.key).level;
          const priorityB = getTelegramPriorityMeta(b.key).level;

          if (telegramStudioMode === 'todo') {
            if (statusA.configuredCount !== statusB.configuredCount) return statusA.configuredCount - statusB.configuredCount;
            if (priorityA !== priorityB) return priorityA - priorityB;
          } else if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          return a.label.localeCompare(b.label, 'fa');
        });
      return [category, nextItems] as const;
    })
    .filter(([, items]) => items.length > 0)
    .sort((a, b) => {
      if (telegramStudioMode !== 'todo') return 0;
      const [categoryA, itemsA] = a;
      const [categoryB, itemsB] = b;
      const topA = itemsA[0];
      const topB = itemsB[0];
      const incompleteA = itemsA.filter((item) => !getTelegramItemStatus(item.key).allConfigured).length;
      const incompleteB = itemsB.filter((item) => !getTelegramItemStatus(item.key).allConfigured).length;

      if (incompleteA !== incompleteB) return incompleteB - incompleteA;
      if (topA && topB) {
        const priorityA = getTelegramPriorityMeta(topA.key).level;
        const priorityB = getTelegramPriorityMeta(topB.key).level;
        if (priorityA !== priorityB) return priorityA - priorityB;
      }
      return categoryA.localeCompare(categoryB, 'fa');
    });

  const visibleTelegramItemsCount = filteredTelegramGroupedDefs.reduce((sum, [, items]) => sum + items.length, 0);

  const telegramTodoItems = telegramTemplateDefs
    .map((item) => {
      const status = getTelegramItemStatus(item.key);
      const priority = getTelegramPriorityMeta(item.key);
      const missingAudiences = status.audiences.filter((entry) => !entry.configured);
      const firstMissing = missingAudiences[0];
      const suggestedPreset = firstMissing ? buildTelegramAudiencePreset(item.key, firstMissing.aud).trim() : '';
      const confidenceBase = 58 + (priority.level === 1 ? 18 : priority.level === 2 ? 12 : 8) + (suggestedPreset ? 10 : 0) + ((3 - missingAudiences.length) * 5);
      const aiConfidence = Math.max(62, Math.min(96, confidenceBase));
      const deferredUntil = telegramTodoLaterMap[item.key];
      const isDone = !!telegramTodoDoneMap[item.key];
      return {
        item,
        status,
        priority,
        missingAudiences,
        missingCount: missingAudiences.length,
        firstMissing,
        suggestedPreset,
        aiConfidence,
        deferredUntil,
        isDone,
      };
    })
    .filter((entry) => entry.missingCount > 0 && !entry.isDone)
    .sort((a, b) => {
      const deferredA = a.deferredUntil ? 1 : 0;
      const deferredB = b.deferredUntil ? 1 : 0;
      if (deferredA !== deferredB) return deferredA - deferredB;
      if (a.priority.level !== b.priority.level) return a.priority.level - b.priority.level;
      if (a.missingCount !== b.missingCount) return b.missingCount - a.missingCount;
      return a.item.label.localeCompare(b.item.label, 'fa');
    });

  const telegramTodoSummary = telegramTodoItems.reduce((acc, entry) => {
    acc.open += 1;
    if (entry.priority.level === 1) acc.urgent += 1;
    if (entry.deferredUntil) acc.later += 1;
    return acc;
  }, { open: 0, urgent: 0, later: 0 });

  const telegramTodoTopItems = telegramTodoItems.filter((entry) => !entry.deferredUntil).slice(0, 5);

  function getTelegramAudienceStatus(itemKey: string, audience: TelegramAudience) {
    const audienceKey = getTelegramAudienceKey(itemKey, audience);
    const value = String(telegramInfo[audienceKey] || '').trim();
    return {
      configured: value.length > 0,
      label: value.length > 0 ? 'کامل' : 'ناقص',
    };
  }

  function getTelegramItemStatus(itemKey: string) {
    const audiences = (['customer','partner','manager'] as TelegramAudience[]).map((aud) => ({
      aud,
      ...getTelegramAudienceStatus(itemKey, aud),
    }));
    const configuredCount = audiences.filter((entry) => entry.configured).length;
    return {
      audiences,
      configuredCount,
      percent: Math.round((configuredCount / audiences.length) * 100),
      allConfigured: configuredCount === audiences.length,
      anyConfigured: configuredCount > 0,
    };
  }

  function getTelegramCategoryStatus(items: typeof telegramTemplateDefs) {
    const totalAudiences = items.length * 3;
    const configuredAudiences = items.reduce((sum, item) => sum + getTelegramItemStatus(item.key).configuredCount, 0);
    return {
      configuredAudiences,
      totalAudiences,
      percent: totalAudiences ? Math.round((configuredAudiences / totalAudiences) * 100) : 0,
    };
  }

  function getTelegramProgressTone(ratio: number) {
    if (ratio >= 100) {
      return {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
        bar: 'from-emerald-500 via-teal-500 to-green-500',
        rail: 'bg-emerald-100/80 dark:bg-emerald-950/20',
        icon: 'fa-circle-check',
        label: 'کامل',
      };
    }
    if (ratio > 0) {
      return {
        badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
        bar: 'from-amber-500 via-yellow-500 to-orange-500',
        rail: 'bg-amber-100/80 dark:bg-amber-950/20',
        icon: 'fa-hourglass-half',
        label: 'نیمه‌کامل',
      };
    }
    return {
      badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200',
      bar: 'from-rose-500 via-pink-500 to-red-500',
      rail: 'bg-rose-100/80 dark:bg-rose-950/20',
      icon: 'fa-circle-xmark',
      label: 'خالی',
    };
  }

  const telegramسراسریSummary = telegramTemplateDefs.reduce((acc, item) => {
    const status = getTelegramItemStatus(item.key);
    if (status.configuredCount === 3) acc.complete += 1;
    else if (status.configuredCount > 0) acc.partial += 1;
    else acc.empty += 1;
    acc.configuredAudiences += status.configuredCount;
    return acc;
  }, { complete: 0, partial: 0, empty: 0, configuredAudiences: 0 });

  const telegramسراسریCompletionPercent = telegramTemplateDefs.length
    ? Math.round((telegramسراسریSummary.configuredAudiences / (telegramTemplateDefs.length * 3)) * 100)
    : 0;

  const telegramReadinessScore = Math.round((telegramسراسریCompletionPercent * 0.7) + ((Math.max(0, 100 - (telegramTodoSummary.urgent * 8))) * 0.3));
  const telegramCoachMessage = telegramTodoSummary.urgent > 0
    ? `برای سریع‌ترین نتیجه، اول ${telegramTodoSummary.urgent.toLocaleString('fa-IR')} رویداد اولویت‌بالا را کامل کن تا پوشش اعلان‌ها پایدارتر شود.`
    : telegramسراسریSummary.empty > 0
      ? `پوشش کلی خوب است؛ حالا رویدادهای خالی را کامل کن تا تجربه تلگرام یکدست و حرفه‌ای شود.`
      : `مرکز قالب‌ها تقریباً آماده است؛ حالا روی بهینه‌سازی متن‌ها و بررسی و ادامه سناریوهای مهم تمرکز کن.`;

  const toggleTelegramQuickActionPin = (actionKey: string) => {
    setTelegramPinnedQuickActions((prev) => ({ ...prev, [actionKey]: !prev[actionKey] }));
  };

  const bumpTelegramQuickActionUsage = (actionKey: string) => {
    setTelegramQuickActionUsageMap((prev) => ({ ...prev, [actionKey]: (prev[actionKey] || 0) + 1 }));
  };

  const resetTelegramQuickActionPersonalization = () => {
    setTelegramPinnedQuickActions({});
    setTelegramQuickActionUsageMap({});
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('settings.telegramStudio.ui');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.categories && typeof parsed.categories === 'object') setOpenTelegramCategories(parsed.categories);
      if (parsed?.items && typeof parsed.items === 'object') setOpenTelegramItems(parsed.items);
      if (parsed?.audiences && typeof parsed.audiences === 'object') setOpenTelegramAudiencePanels(parsed.audiences);
      if (typeof parsed?.search === 'string') setTelegramTemplateSearch(parsed.search);
      if (parsed?.filter === 'all' || parsed?.filter === 'configured' || parsed?.filter === 'incomplete') setTelegramTemplateFilter(parsed.filter);
      if (parsed?.mode === 'quick' || parsed?.mode === 'all' || parsed?.mode === 'incomplete' || parsed?.mode === 'todo') setTelegramStudioMode(parsed.mode);
      if (parsed?.todoDone && typeof parsed.todoDone === 'object') setTelegramTodoDoneMap(parsed.todoDone);
      if (parsed?.todoLater && typeof parsed.todoLater === 'object') setTelegramTodoLaterMap(parsed.todoLater);
      if (parsed?.pinnedQuickActions && typeof parsed.pinnedQuickActions === 'object') setTelegramPinnedQuickActions(parsed.pinnedQuickActions);
      if (parsed?.quickActionUsage && typeof parsed.quickActionUsage === 'object') setTelegramQuickActionUsageMap(parsed.quickActionUsage);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('settings.telegramStudio.ui', JSON.stringify({
        categories: openTelegramCategories,
        items: openTelegramItems,
        audiences: openTelegramAudiencePanels,
        search: telegramTemplateSearch,
        filter: telegramTemplateFilter,
        mode: telegramStudioMode,
        todoDone: telegramTodoDoneMap,
        todoLater: telegramTodoLaterMap,
        pinnedQuickActions: telegramPinnedQuickActions,
        quickActionUsage: telegramQuickActionUsageMap,
      }));
    } catch {}
  }, [openTelegramCategories, openTelegramItems, openTelegramAudiencePanels, telegramTemplateSearch, telegramTemplateFilter, telegramStudioMode, telegramTodoDoneMap, telegramTodoLaterMap, telegramPinnedQuickActions, telegramQuickActionUsageMap]);


  useEffect(() => {
    try { localStorage.setItem('settings.view.mode', settingsViewMode); } catch {}
  }, [settingsViewMode]);

  useEffect(() => {
    if (!telegramGroupedDefs.length) return;
    setOpenTelegramCategories((prev) => {
      if (Object.keys(prev).length) return prev;
      const firstCategory = telegramGroupedDefs[0]?.[0];
      return firstCategory ? { [firstCategory]: true } : prev;
    });
  }, [telegramGroupedDefs.length]);

  const toggleTelegramCategory = (category: string) => {
    setOpenTelegramCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleTelegramItem = (itemKey: string) => {
    setOpenTelegramItems((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const setAllTelegramCategories = (isOpen: boolean) => {
    const next = Object.fromEntries(telegramGroupedDefs.map(([category]) => [category, isOpen]));
    setOpenTelegramCategories(next);
  };

  const setAllTelegramItems = (isOpen: boolean) => {
    const next = Object.fromEntries(telegramTemplateDefs.map((item) => [item.key, isOpen]));
    setOpenTelegramItems(next);
  };

  const clearTelegramStudioFilters = () => {
    setTelegramTemplateSearch('');
    setTelegramTemplateFilter('all');
    setTelegramStudioMode('quick');
  };

  const toggleTelegramAudiencePanel = (panelKey: string) => {
    setOpenTelegramAudiencePanels((prev) => ({ ...prev, [panelKey]: !prev[panelKey] }));
  };

  const [telegramSpotlightTarget, setTelegramSpotlightTarget] = useState<string | null>(null);

  const spotlightTelegramTarget = (targetId: string) => {
    setTelegramSpotlightTarget(targetId);
    window.setTimeout(() => {
      setTelegramSpotlightTarget((prev) => (prev === targetId ? null : prev));
    }, 2200);
  };

  const jumpToTelegramTemplate = (itemKey: string, audience?: TelegramAudience) => {
    const targetItem = telegramTemplateDefs.find((entry) => entry.key === itemKey);
    if (!targetItem) return;
    setTelegramStudioMode('todo');
    setOpenTelegramCategories((prev) => ({ ...prev, [targetItem.category]: true }));
    setOpenTelegramItems((prev) => ({ ...prev, [itemKey]: true }));
    if (audience) {
      const panelKey = `${itemKey}-${audience}`;
      setOpenTelegramAudiencePanels((prev) => ({ ...prev, [panelKey]: true }));
    }
    const targetId = audience ? `tg-audience-${itemKey}-${audience}` : `tg-item-${itemKey}`;
    setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      spotlightTelegramTarget(targetId);
    }, 80);
  };

  const focusTelegramAudience = (itemKey: string, audience: TelegramAudience) => {
    const targetItem = telegramTemplateDefs.find((entry) => entry.key === itemKey);
    if (!targetItem) return;
    setOpenTelegramCategories((prev) => ({ ...prev, [targetItem.category]: true }));
    setOpenTelegramItems((prev) => ({ ...prev, [itemKey]: true }));
    const panelKey = `${itemKey}-${audience}`;
    setOpenTelegramAudiencePanels((prev) => ({ ...prev, [panelKey]: true }));
    const targetId = `tg-audience-${itemKey}-${audience}`;
    setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      spotlightTelegramTarget(targetId);
    }, 90);
  };

  const jumpToFirstIncompleteTelegramTemplate = () => {
    const first = telegramTodoItems[0];
    if (!first) return;
    jumpToTelegramTemplate(first.item.key, first.missingAudiences[0]?.aud);
  };

  const openUrgentTelegramTodos = () => {
    const urgentItems = telegramTodoItems.filter((entry) => entry.priority.level === 1);
    const urgentCategories = Array.from(new Set(urgentItems.map((entry) => entry.item.category)));
    setTelegramStudioMode('todo');
    setOpenTelegramCategories((prev) => ({
      ...prev,
      ...Object.fromEntries(urgentCategories.map((category) => [category, true])),
    }));
    setOpenTelegramItems((prev) => ({
      ...prev,
      ...Object.fromEntries(urgentItems.map((entry) => [entry.item.key, true])),
    }));
    setOpenTelegramAudiencePanels((prev) => ({
      ...prev,
      ...Object.fromEntries(
        urgentItems.flatMap((entry) => entry.missingAudiences.map((aud) => [`${entry.item.key}-${aud.aud}`, true]))
      ),
    }));
    if (urgentItems[0]) {
      setTimeout(() => {
        const element = document.getElementById(`tg-item-${urgentItems[0].item.key}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  const getTelegramTodoNextStep = (entry: { item: (typeof telegramTemplateDefs)[number]; missingAudiences: Array<{ aud: TelegramAudience; configured: boolean; label: string }>; missingCount: number }) => {
    const firstMissing = entry.missingAudiences[0];
    if (!firstMissing) return 'فقط بازبینی نهایی باقی مانده';
    return `${tgAudienceMeta[firstMissing.aud].label} را کامل کن`;
  };

  const getTelegramAiAssistantCopy = (entry: { item: (typeof telegramTemplateDefs)[number]; priority: { label: string; level: number }; firstMissing?: { aud: TelegramAudience } | null; suggestedPreset?: string; aiConfidence: number; deferredUntil?: string | null }) => {
    if (entry.deferredUntil) return `این مورد فعلاً برای بعد نگه داشته شده و هر زمان خواستی می‌توانی دوباره فعالش کنی.`;
    if (!entry.firstMissing) return 'این مورد تقریباً کامل است و فقط یک بازبینی سریع لازم دارد.';
    if (entry.suggestedPreset) return `برای ${tgAudienceMeta[entry.firstMissing.aud].label} یک متن پیشنهادی آماده دارم و با اطمینان ${entry.aiConfidence.toLocaleString('fa-IR')}٪ می‌توانم همان را به‌عنوان نقطه شروع اعمال کنم.`;
    return `بهترین قدم بعدی این است که بخش ${tgAudienceMeta[entry.firstMissing.aud].label} را کامل کنی تا این رویداد از حالت ناقص خارج شود.`;
  };

  const markTelegramTodoDone = (itemKey: string) => {
    setTelegramTodoDoneMap((prev) => ({ ...prev, [itemKey]: true }));
    setTelegramTodoLaterMap((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  };

  const deferTelegramTodo = (itemKey: string) => {
    setTelegramTodoLaterMap((prev) => ({ ...prev, [itemKey]: new Date().toISOString() }));
  };

  const reactivateTelegramTodo = (itemKey: string) => {
    setTelegramTodoLaterMap((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
    setTelegramTodoDoneMap((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  };

  const resetTelegramTodoAssistant = () => {
    setTelegramTodoDoneMap({});
    setTelegramTodoLaterMap({});
  };


  const scrollToTelegramAnchor = (anchorId: string) => {
    setTimeout(() => {
      const el = document.getElementById(anchorId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      spotlightTelegramTarget(anchorId);
    }, 60);
  };

  const telegramConnectionChecks = [
    {
      key: 'bot-core',
      label: 'هویت ربات',
      description: 'توکن و نام کاربری ربات باید کامل باشند تا لینک‌سازی و ارسال بدون خطا در عملیات انجام شود.',
      icon: 'fa-robot',
      anchor: 'tg-anchor-bot-core',
      done: Boolean(String(telegramInfo.telegram_bot_token || '').trim() && String(telegramInfo.telegram_bot_username || '').trim()),
      score: [Boolean(String(telegramInfo.telegram_bot_token || '').trim()), Boolean(String(telegramInfo.telegram_bot_username || '').trim())].filter(Boolean).length,
      total: 2,
      cta: 'رفتن به هویت ربات',
    },
    {
      key: 'main-route',
      label: 'مسیر اصلی ارسال',
      description: 'chat_id اصلی و آدرس عمومی برنامه مسیر پایه‌ی پیام‌های ربات را می‌سازند.',
      icon: 'fa-paper-plane',
      anchor: 'tg-anchor-main-route',
      done: Boolean(String(telegramInfo.telegram_chat_id || '').trim() && String(businessInfo.app_base_url || '').trim()),
      score: [Boolean(String(telegramInfo.telegram_chat_id || '').trim()), Boolean(String(businessInfo.app_base_url || '').trim())].filter(Boolean).length,
      total: 2,
      cta: 'تنظیم مسیر اصلی',
    },
    {
      key: 'routing',
      label: 'سلامت مسیر ارتباط',
      description: 'پروکسی اختیاری است؛ ولی اگر تنظیم شده باید قابل اتکا باشد. در غیر این صورت همان VPN/Direct کافی است.',
      icon: 'fa-route',
      anchor: 'tg-anchor-proxy',
      done: Boolean(tgHealth?.ok || (!String(telegramInfo.telegram_proxy || '').trim() && String(telegramInfo.telegram_bot_token || '').trim())),
      score: tgHealth?.ok ? 2 : (String(telegramInfo.telegram_proxy || '').trim() || String(telegramInfo.telegram_bot_token || '').trim() ? 1 : 0),
      total: 2,
      cta: 'بررسی و ادامه مسیر ارتباط',
    },
    {
      key: 'rules',
      label: 'قوانین ارسال',
      description: 'Quiet Hours و سقف پیام روزانه باعث می‌شوند ربات رفتارش قابل کنترل بماند.',
      icon: 'fa-sliders',
      anchor: 'tg-anchor-rules',
      done: Boolean(telegramInfo.telegram_max_per_day_per_customer !== undefined && String(telegramInfo.telegram_silent_hours || '').trim()),
      score: [Boolean(String(telegramInfo.telegram_silent_hours || '').trim()), Boolean(String(telegramInfo.telegram_max_per_day_per_customer ?? '').trim())].filter(Boolean).length,
      total: 2,
      cta: 'باز کردن قوانین ارسال',
    },
    {
      key: 'destinations',
      label: 'مقصدهای تفکیکی',
      description: 'اگر گزارش‌ها و اعلان‌ها chat_id جدا داشته باشند، کنترل‌سنتر حرفه‌ای‌تر و تمیزتر می‌شود.',
      icon: 'fa-diagram-project',
      anchor: 'tg-anchor-destinations',
      done: [
        telegramInfo.telegram_chat_ids_reports,
        telegramInfo.telegram_chat_ids_installments,
        telegramInfo.telegram_chat_ids_sales,
        telegramInfo.telegram_chat_ids_notifications,
      ].filter((v) => String(v || '').trim()).length >= 2,
      score: [
        telegramInfo.telegram_chat_ids_reports,
        telegramInfo.telegram_chat_ids_installments,
        telegramInfo.telegram_chat_ids_sales,
        telegramInfo.telegram_chat_ids_notifications,
      ].filter((v) => String(v || '').trim()).length,
      total: 4,
      cta: 'رفتن به مقصدها',
    },
    {
      key: 'quick-check',
      label: 'بررسی و ادامه ارسال',
      description: 'بعد از ذخیره تغییرات، ارسال بررسی و ادامه را انجام بده تا مسیر ارسال و متن پیام کنترل شود.',
      icon: 'fa-vial-circle-check',
      anchor: 'tg-anchor-quick-check',
      done: Boolean(tgHealth?.ok || tgCC?.health?.botApi?.ok),
      score: tgHealth?.ok || tgCC?.health?.botApi?.ok ? 1 : 0,
      total: 1,
      cta: 'رفتن به بررسی و ادامه ارسال',
    },
  ];

  const telegramTopConnectionSummary = telegramConnectionChecks.reduce((acc, item) => {
    acc.done += item.done ? 1 : 0;
    acc.score += item.score;
    acc.total += item.total;
    return acc;
  }, { done: 0, score: 0, total: 0 });

  const telegramTopConnectionPercent = telegramTopConnectionSummary.total
    ? Math.round((telegramTopConnectionSummary.score / telegramTopConnectionSummary.total) * 100)
    : 0;

  const telegramTopConnectionTone = telegramTopConnectionPercent >= 85
    ? {
        shell: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        chip: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200',
        bar: 'from-emerald-500 via-teal-500 to-cyan-500',
        label: 'آماده و پایدار',
        icon: 'fa-star',
      }
    : telegramTopConnectionPercent >= 45
      ? {
          shell: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20',
          chip: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/40 dark:bg-slate-950 dark:text-amber-200',
          bar: 'from-amber-500 via-orange-500 to-yellow-500',
          label: 'نیمه‌تنظیم',
          icon: 'fa-wand-magic-sparkles',
        }
      : {
          shell: 'border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/20',
          chip: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-200',
          bar: 'from-rose-500 via-pink-500 to-red-500',
          label: 'نیازمند تکمیل',
          icon: 'fa-bolt',
        };

  const telegramTopNextAction = telegramConnectionChecks.find((item) => !item.done) || telegramConnectionChecks[telegramConnectionChecks.length - 1];

  const getTelegramSmartCheckTone = (score: number, total: number) => {
    if (score >= total) return {
      wrap: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20',
      chip: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200',
      bar: 'from-emerald-500 via-teal-500 to-green-500',
      label: 'کامل',
      icon: 'fa-circle-check',
    };
    if (score > 0) return {
      wrap: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20',
      chip: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/40 dark:bg-slate-950 dark:text-amber-200',
      bar: 'from-amber-500 via-orange-500 to-yellow-500',
      label: 'در حال تکمیل',
      icon: 'fa-hourglass-half',
    };
    return {
      wrap: 'border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/20',
      chip: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-200',
      bar: 'from-rose-500 via-pink-500 to-red-500',
      label: 'شروع نشده',
      icon: 'fa-circle-xmark',
    };
  };

  const applyTelegramAiSuggestion = (itemKey: string, audience?: TelegramAudience) => {
    const target = telegramTodoItems.find((entry) => entry.item.key === itemKey);
    const targetAudience = audience || target?.firstMissing?.aud;
    if (!targetAudience) return;
    const preset = buildTelegramAudiencePreset(itemKey, targetAudience).trim();
    if (preset) applyTelegramPreset(itemKey, targetAudience);
    reactivateTelegramTodo(itemKey);
    jumpToTelegramTemplate(itemKey, targetAudience);
  };

const handleBusinessInfoSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setNotification(null);
    try {
      await runWithFeedback(
        apiFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify(businessInfo),
        }).then((response) => parseApiResult(response, { endpoint: '/api/settings', action: 'ذخیره تغییرات تنظیمات کسب‌وکار' })),
        {
          kind: 'save',
          loading: 'در حال ذخیره تغییرات تنظیمات کسب‌وکار…',
          success: 'تنظیمات فروشگاه با موفقیت ذخیره شد.',
          endpoint: '/api/settings',
        }
      );
      if (!mountedRef.current) return;
      setInitialBusinessInfo(businessInfo);
      // Sync QR public base URL to localStorage
      try {
        const v = businessInfo.qr_public_base_url;
        if (v) localStorage.setItem('qr_public_base_url', String(v));
        else localStorage.removeItem('qr_public_base_url');
      } catch {}
      writeStoredCurrencyUnit(businessInfo.currency_unit);
      try { window.dispatchEvent(new CustomEvent('kourosh:feature-flags-updated')); } catch {}
      const normalizedStoreName = normalizeStoreName(businessInfo.store_name || 'فروشگاه');
      applyDocumentBranding(normalizedStoreName);
      if (style.brandMode === 'auto') syncBrandFromStoreName(normalizedStoreName);
      setNotification({ type: 'success', text: 'تنظیمات فروشگاه با موفقیت ذخیره شد.', closeMs: 3600 });

    } catch (error: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings', action: 'ذخیره تغییرات تنظیمات کسب‌وکار' }) });
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const handleSaveLocalDomainSettings = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      const hostname = normalizeLocalHostname(businessInfo.local_hostname || '');
      const suffix = normalizeLocalSuffix(businessInfo.local_domain_suffix || 'localhost');
      const domain = buildLocalDomain(hostname, suffix);
      const explicitBaseUrl = String(businessInfo.local_base_url || '').trim();
      const localBaseUrl = explicitBaseUrl || (domain ? `https://${domain}` : '');
      const payload = {
        ...businessInfo,
        local_hostname: hostname,
        local_domain_suffix: suffix,
        local_base_url: localBaseUrl,
      } satisfies BusinessInformationSettings;

      await runWithFeedback(
        apiFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify(payload),
        }).then((response) => parseApiResult(response, { endpoint: '/api/settings', action: 'ذخیره تغییرات تنظیمات محلی' })),
        {
          kind: 'save',
          loading: 'در حال ذخیره تغییرات تنظیمات محلی…',
          success: 'تنظیمات محلی با موفقیت ذخیره شد.',
          endpoint: '/api/settings',
        }
      );

      if (!mountedRef.current) return;
      setBusinessInfo((prev) => ({
        ...prev,
        local_hostname: hostname,
        local_domain_suffix: suffix,
        local_base_url: localBaseUrl,
      }));
      setInitialBusinessInfo((prev) => ({
        ...prev,
        local_hostname: hostname,
        local_domain_suffix: suffix,
        local_base_url: localBaseUrl,
      }));
      setLocalCertMessage(domain ? `تنظیمات محلی ذخیره شد: ${domain}` : 'تنظیمات محلی ذخیره شد.');
      setLocalCertError(null);
      setNotification({ type: 'success', text: 'تنظیمات دامنه محلی با موفقیت ذخیره شد.', closeMs: 3600 });
    } catch (error: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings', action: 'ذخیره تغییرات تنظیمات محلی' }) });
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

const handleGenerateLocalCertificate = async () => {
    const hostname = String(businessInfo.local_hostname || '').trim().toLowerCase();
    const suffix = String(businessInfo.local_domain_suffix || 'localhost').trim().toLowerCase();

    if (!hostname) {
      setLocalCertError('نام میزبان محلی را وارد کنید.');
      setLocalCertMessage(null);
      return;
    }

    setIsGeneratingLocalCert(true);
    setLocalCertError(null);
    setLocalCertMessage(null);
    try {
      const response = await apiFetch('/api/settings/local-domain/generate-cert', {
        method: 'POST',
        body: JSON.stringify({ hostname, suffix }),
      });
      const data = await parseApiResult(response, { endpoint: '/api/settings/local-domain/generate-cert', action: 'ساخت certificate محلی' });
      const generatedDomain = data?.data?.domain || `${hostname}.${suffix}`;
      const httpsUrl = data?.data?.httpsUrl || `https://${generatedDomain}`;
      const hostsLine = data?.data?.hostsLine || `127.0.0.1 ${generatedDomain}`;
      const serverIp = data?.data?.serverIp || '';
      setBusinessInfo((prev) => ({
        ...prev,
        local_hostname: hostname,
        local_domain_suffix: suffix,
        local_base_url: httpsUrl,
        local_hosts_ip: serverIp || prev?.local_hosts_ip || '',
        local_hosts_line: hostsLine,
      }));
      setInitialBusinessInfo((prev) => ({
        ...prev,
        local_hostname: hostname,
        local_domain_suffix: suffix,
        local_base_url: httpsUrl,
        local_hosts_ip: serverIp || prev?.local_hosts_ip || '',
        local_hosts_line: hostsLine,
      }));
      if (!mountedRef.current) return;
      setLocalCertMessage(`دامنه ${generatedDomain} ساخته شد. فایل‌های certificate در سرور ذخیره تغییرات شدند و فایل hosts با IP ${serverIp || 'سرور'} آماده است. خط پیشنهادی: ${hostsLine}`);
      try {
        navigator.clipboard?.writeText(hostsLine);
      } catch {}
    } catch (error: unknown) {
      if (mountedRef.current) setLocalCertError(humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/local-domain/generate-cert', action: 'ساخت certificate محلی' }));
    } finally {
      if (mountedRef.current) setIsGeneratingLocalCert(false);
    }
  };

  const handleDownloadHostsScript = async () => {
    const hostname = String(businessInfo.local_hostname || '').trim().toLowerCase();
    const suffix = String(businessInfo.local_domain_suffix || 'localhost').trim().toLowerCase();
    if (!hostname) {
      setLocalCertError('برای دانلود فایل hosts ابتدا hostname را وارد کنید.');
      return;
    }
    try {
      const browserNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
      const platformText = `${browserNavigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`;
      const isMacLike = /mac|iphone|ipad|ipod/i.test(platformText);
      const q = new URLSearchParams();
      q.set('hostname', hostname);
      q.set('suffix', suffix);
      const endpoint = isMacLike ? '/api/settings/local-domain/setup-hosts.command' : '/api/settings/local-domain/setup-hosts.bat';
      const response = await apiFetch(`${endpoint}?${q.toString()}`);
      const data = await parseApiResult(response, { endpoint, action: 'دانلود فایل hosts' });
      const scriptText = String(data?.data?.content || '');
      const blob = new Blob([scriptText], { type: isMacLike ? 'text/x-shellscript;charset=utf-8' : 'application/x-bat' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = data?.data?.fileName || `setup-${hostname}.${suffix}${isMacLike ? '.command' : '.bat'}`;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setLocalCertMessage(`فایل hosts برای ${hostname}.${suffix} آماده و دانلود شد${isMacLike ? '؛ روی مک پس از دانلود، فایل .command را اجرا کنید.' : '.'}`);
      setLocalCertError(null);
    } catch (error: unknown) {
      setLocalCertError(humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/local-domain/setup-hosts', action: 'دانلود فایل hosts' }));
    }
  };

  // ------- Logo
  const logoInputRefClick = () => logoInputRef.current?.click();
  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setNotification({ type: 'error', text: 'حجم فایل لوگو نباید بیشتر از 2 مگابایت باشد.' });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'].includes(file.type)) {
        setNotification({ type: 'error', text: 'فرمت فایل لوگو نامعتبر است. (مجاز: JPG, PNG, GIF, SVG, WebP)' });
        return;
      }
      setLogoFile(file);
      setLogoPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return URL.createObjectURL(file);
      });
    }
  };
  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile);
    try {
      const result = await runWithFeedback(
        apiFetch('/api/settings/upload-logo', { method: 'POST', body: formData }).then((response) =>
          parseApiResult<LogoUploadApiResult>(response, { endpoint: '/api/settings/upload-logo', action: 'آپلود لوگو' })
        ),
        {
          kind: 'send',
          loading: 'در حال آپلود لوگوی فروشگاه…',
          success: 'لوگوی فروشگاه با موفقیت آپلود شد.',
          endpoint: '/api/settings/upload-logo',
        }
      );
      if (!mountedRef.current) return;
      setBusinessInfo(prev => ({ ...prev, store_logo_path: result.data.filePath.replace('/uploads/', '') }));
      setLogoFile(null);
    } catch (error: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/upload-logo', action: 'آپلود لوگو' }) });
    } finally {
      if (mountedRef.current) setIsUploadingLogo(false);
    }
  };

  
  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await apiFetch('/api/backup/list');
      const data = await res.json() as BackupListApiResult;
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در دریافت لیست بکاپ‌ها');
      setBackupList(data.data || []);
    } catch (e: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(e) });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (tab === 'data') {
      void fetchBackups();
    }
  }, [tab]);

  useEffect(() => {
    if (currentUser?.roleName === 'Admin') {
      void fetchBackups();
    }
  }, [currentUser]);

  const handleCreateBackupNow = async () => {
    try {
      await runWithFeedback(
        apiFetch('/api/backup/create', { method: 'POST' }).then((response) =>
          parseApiResult(response, { endpoint: '/api/backup/create', action: 'ایجاد بکاپ' })
        ),
        {
          kind: 'create',
          loading: 'در حال ایجاد نسخه پشتیبان جدید…',
          success: 'نسخه پشتیبان با موفقیت ایجاد شد.',
          endpoint: '/api/backup/create',
        }
      );
      await fetchBackups();
    } catch (e: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/create', action: 'ایجاد بکاپ' }) });
    }
  };

  const handleDownloadBackupFile = async (fileName: string) => {
    try {
      const res = await apiFetch(`/api/backup/download/${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error('خطا در دانلود بکاپ');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(e) });
    }
  };

  const handleDeleteBackupFile = async (fileName: string) => {
    const ok = await confirmAction({ title: 'حذف مورد نسخه پشتیبان', description: 'این بکاپ از لیست حذف مورد شود؟', confirmText: 'بله، حذف مورد شود', tone: 'danger', iconClass: 'fa-solid fa-trash-can' });
    if (!ok) return;
    try {
      await runWithFeedback(
        apiFetch(`/api/backup/${encodeURIComponent(fileName)}`, { method: 'DELETE' }).then((response) =>
          parseApiResult(response, { endpoint: '/api/backup/delete', action: 'حذف مورد بکاپ' })
        ),
        {
          kind: 'delete',
          loading: 'در حال حذف مورد نسخه پشتیبان…',
          success: 'نسخه پشتیبان با موفقیت حذف شد.',
          endpoint: '/api/backup/delete',
        }
      );
      await fetchBackups();
    } catch (e: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/delete', action: 'حذف مورد بکاپ' }) });
    }
  };

  const handleRestoreFromBackup = async (fileName: string) => {
    const ok = await confirmAction({ title: 'بازیابی بکاپ', description: 'با بازیابی بکاپ، اطلاعات فعلی جایگزین می‌شود. ادامه می‌دهید؟', confirmText: 'بله، بازیابی شود', tone: 'warning', iconClass: 'fa-solid fa-clock-rotate-left' });
    if (!ok) return;
    setIsRestoringDb(true);
    try {
      const data = await runWithFeedback(
        apiFetch('/api/backup/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName }) }).then((response) =>
          parseApiResult<BackupRestoreApiResult>(response, { endpoint: '/api/backup/restore', action: 'بازیابی بکاپ' })
        ),
        {
          kind: 'action',
          loading: 'در حال بازیابی نسخه پشتیبان…',
          success: 'بازیابی نسخه پشتیبان با موفقیت انجام شد.',
          endpoint: '/api/backup/restore',
        }
      );
      if (!mountedRef.current) return;
      setNotification({ type: 'success', text: data.message || 'بازیابی نسخه پشتیبان با موفقیت انجام شد.' });
    } catch (e: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/restore', action: 'بازیابی بکاپ' }) });
    } finally {
      if (mountedRef.current) setIsRestoringDb(false);
    }
  };

  const handleCheckRestore = async (fileName: string) => {
    try {
      const res = await apiFetch('/api/backup/check-restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName }) });
      const data = await res.json() as BackupCheckRestoreApiResult;
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در بررسی و ادامه');
      const s = data.data?.stats;
      setNotification({ type: 'success', text: `بررسی و ادامه بکاپ با موفقیت انجام شد. invoices=${s?.invoices ?? '-'} products=${s?.products ?? '-'} customers=${s?.customers ?? '-'} items=${s?.invoice_items ?? '-'}` });
    } catch (e: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(e) });
    }
  };

  const handleSaveBackupSchedule = async () => {
    setIsSavingBackupSchedule(true);
    try {
      const normalizedBackupTime = sanitizeTime(backupScheduleTime);
      const normalizedWeekdays = normalizeWeekdays(backupScheduleWeekdays);
      const normalizedIntervalHours = Math.max(1, Math.min(24, Number(backupScheduleIntervalHours || DEFAULT_BACKUP_SCHEDULE.intervalHours)));
      const normalizedRetention = Math.max(1, Math.min(365, Number(backupRetention || 14)));
      const normalizedTimezone = String(backupTimezone || 'Asia/Tehran').trim() || 'Asia/Tehran';
      const cronExpr = buildBackupCronExpr({
        mode: backupScheduleMode,
        time: normalizedBackupTime,
        weekdays: normalizedWeekdays,
        intervalHours: normalizedIntervalHours,
      });
      const payload: BackupScheduleSettingsPayload = {
        backup_enabled: backupEnabled ? '1' : '0',
        backup_cron: cronExpr,
        backup_timezone: normalizedTimezone,
        backup_retention: String(normalizedRetention),
        backup_schedule_mode: backupScheduleMode,
        backup_schedule_time: normalizedBackupTime,
        backup_schedule_weekdays: JSON.stringify(normalizedWeekdays),
        backup_schedule_interval_hours: String(normalizedIntervalHours),
      };
      await runWithFeedback(
        apiFetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((response) =>
          parseApiResult(response, { endpoint: '/api/settings', action: 'ذخیره تغییرات زمان‌بندی بکاپ' })
        ),
        {
          kind: 'save',
          loading: 'در حال ذخیره تغییرات زمان‌بندی بکاپ…',
          success: 'تنظیمات بکاپ ذخیره تغییرات شد. پیش‌نمایش همین حالا به‌روزرسانی شد.',
          endpoint: '/api/settings',
        }
      );
      if (!mountedRef.current) return;
      setBackupScheduleTime(normalizedBackupTime);
      setBackupScheduleWeekdays(normalizedWeekdays);
      setBackupScheduleIntervalHours(normalizedIntervalHours);
      setBackupRetention(normalizedRetention);
      setBackupTimezone(normalizedTimezone);
      setInitialBackupSettings({
        enabled: backupEnabled,
        mode: backupScheduleMode,
        time: normalizedBackupTime,
        weekdays: [...normalizedWeekdays],
        intervalHours: normalizedIntervalHours,
        timezone: normalizedTimezone,
        retention: normalizedRetention,
      });
    } catch (e: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/settings', action: 'ذخیره تغییرات زمان‌بندی بکاپ' }) });
    } finally {
      if (mountedRef.current) setIsSavingBackupSchedule(false);
    }
  };
  const backupNextRunLabel = formatNextBackupRunLabel({
    mode: backupScheduleMode,
    time: backupScheduleTime,
    weekdays: backupScheduleWeekdays,
    intervalHours: backupScheduleIntervalHours,
  });

  // ------- Backup/Restore
  const handleBackup = async () => {
    setNotification({ type: 'info', text: 'در حال آماده‌سازی فایل پشتیبان...' });
    try {
      const response = await apiFetch('/api/settings/backup');
      if (!response.ok) throw new Error((await response.json()).message || 'خطا در دانلود');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kourosh_dashboard_backup_${new Date().toISOString().split('T')[0]}.db`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotification({ type: 'success', text: 'فایل پشتیبان با موفقیت دانلود شد.' });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/backup', action: 'دانلود بکاپ' }) });
    }
  };

  const handleDbFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.split('.').pop()?.toLowerCase() !== 'db') {
        setNotification({ type: 'error', text: 'فایل انتخاب شده باید با فرمت .db باشد.' });
        if (dbFileInputRef.current) dbFileInputRef.current.value = '';
        setDbFile(null);
        return;
      }
      setDbFile(file);
      setIsRestoreModalOpen(true);
    }
  };

  const handleRestore = async () => {
    if (!dbFile) return;
    setIsRestoreModalOpen(false);
    setIsRestoringDb(true);
    const formData = new FormData();
    formData.append('dbfile', dbFile);
    try {
      const response = await apiFetch('/api/settings/restore', { method: 'POST', body: formData });
      const result = await response.json() as SettingsRestoreApiResult;
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در بازیابی دیتابیس');
      if (!mountedRef.current) return;
      setNotification({
        type: 'success',
        text: result.message + ' لطفاً برای اعمال تغییرات، برنامه را ببندید و مجدداً باز کنید.',
      });
    } catch (error: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/restore', action: 'بازیابی دیتابیس' }) });
    } finally {
      if (mountedRef.current) {
        setIsRestoringDb(false);
        setDbFile(null);
      }
      if (dbFileInputRef.current) dbFileInputRef.current.value = '';
    }
  };

  // ------- Users
  const openAddUserModal = () => {
    setAddUserFormErrors({});
    setNewUser(initialNewUserState);
    setIsAddUserModalOpen(true);
  };
  const handleNewUserChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewUser(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleNewUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Partial<NewUserFormData> = {};
    if (!newUser.username.trim()) errors.username = 'نام کاربری الزامی است.';
    if (!newUser.password) errors.password = 'کلمه عبور الزامی است.';
    else if (newUser.password.length < 6) errors.password = 'کلمه عبور باید حداقل ۶ کاراکتر باشد.';
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'کلمه عبور و تکرار آن یکسان نیستند.';
    if (Object.keys(errors).length > 0) {
      setAddUserFormErrors(errors);
      return;
    }

    setIsSavingUser(true);
    try {
      await runWithFeedback(
        apiFetch('/api/users', { method: 'POST', body: JSON.stringify(newUser) }).then((response) =>
          parseApiResult(response, { endpoint: '/api/users', action: 'ایجاد کاربر' })
        ),
        {
          kind: 'create',
          loading: 'در حال ایجاد کاربر جدید…',
          success: 'کاربر جدید با موفقیت ایجاد شد.',
          endpoint: '/api/users',
        }
      );
      setIsAddUserModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/users', action: 'ایجاد کاربر' }) });
    } finally {
      setIsSavingUser(false);
    }
  };

  const openEditUserModal = (user: UserForDisplay) => {
    setEditingUser({ id: user.id, username: user.username, roleId: user.roleId });
    setEditUserFormErrors({});
    setIsEditUserModalOpen(true);
  };
  const handleEditUserChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingUser) setEditingUser(prev => (prev ? { ...prev, [e.target.name]: e.target.value } : null));
  };
  const handleEditUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      await runWithFeedback(
        apiFetch(`/api/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify({ roleId: Number(editingUser.roleId) }) }).then((response) =>
          parseApiResult(response, { endpoint: `/api/users/${editingUser.id}`, action: 'ویرایش اطلاعات نقش کاربر' })
        ),
        {
          kind: 'update',
          loading: 'در حال به‌روزرسانی نقش کاربر…',
          success: 'نقش کاربر با موفقیت ویرایش شد.',
          endpoint: `/api/users/${editingUser.id}`,
        }
      );
      setIsEditUserModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: `/api/users/${editingUser.id}`, action: 'ویرایش اطلاعات نقش کاربر' }) });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openResetPasswordModal = (user: UserForDisplay) => {
    setResettingUser(user);
    setResetPasswordData({ password: '', confirmPassword: '' });
    setResetPasswordErrors({});
    setIsResetPasswordModalOpen(true);
  };
  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (resetPasswordData.password.length < 6) {
      setResetPasswordErrors({ password: 'کلمه عبور باید حداقل ۶ کاراکتر باشد.' });
      return;
    }
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setResetPasswordErrors({ confirmPassword: 'کلمه‌های عبور یکسان نیستند.' });
      return;
    }

    setIsSubmittingReset(true);
    try {
      await runWithFeedback(
        apiFetch(`/api/users/${resettingUser.id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ password: resetPasswordData.password }),
        }).then((response) => parseApiResult(response, { endpoint: `/api/users/${resettingUser.id}/reset-password`, action: 'بازنشانی کلمه عبور' })),
        {
          kind: 'save',
          loading: 'در حال بازنشانی کلمه عبور کاربر…',
          success: `کلمه عبور کاربر ${resettingUser.username} با موفقیت بازنشانی شد.`,
          endpoint: `/api/users/${resettingUser.id}/reset-password`,
        }
      );
      setIsResetPasswordModalOpen(false);
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: `/api/users/${resettingUser.id}/reset-password`, action: 'بازنشانی کلمه عبور' }) });
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const openDeleteUserModal = (user: UserForDisplay) => {
    setDeletingUser(user);
    setIsDeleteUserModalOpen(true);
  };
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    try {
      await runWithFeedback(
        apiFetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' }).then((response) =>
          parseApiResult(response, { endpoint: `/api/users/${deletingUser.id}`, action: 'حذف مورد کاربر' })
        ),
        {
          kind: 'delete',
          loading: 'در حال حذف مورد کاربر…',
          success: `کاربر ${deletingUser.username} با موفقیت حذف شد.`,
          endpoint: `/api/users/${deletingUser.id}`,
        }
      );
      setIsDeleteUserModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: `/api/users/${deletingUser.id}`, action: 'حذف مورد کاربر' }) });
    } finally {
      setIsDeletingUser(false);
    }
  };


  // ---- Account handlers
  const handleMeAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setMeAvatarFile(null);
      setMeAvatarPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return null;
      });
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setMeAvatarFile(null);
      setMeAvatarPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return null;
      });
      if (meAvatarInputRef.current) meAvatarInputRef.current.value = '';
      setNotification({ type: 'error', text: 'حجم آواتار نباید بیشتر از ۲ مگابایت باشد.' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'].includes(f.type)) {
      setMeAvatarFile(null);
      setMeAvatarPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return null;
      });
      if (meAvatarInputRef.current) meAvatarInputRef.current.value = '';
      setNotification({ type: 'error', text: 'فرمت آواتار نامعتبر است. فرمت‌های مجاز: JPG، PNG، GIF، SVG و WebP.' });
      return;
    }
    setMeAvatarFile(f);
    setMeAvatarPreview((prev) => {
      revokeObjectUrlSafe(prev);
      return URL.createObjectURL(f);
    });
  };

  const handleMeAvatarUpload = async () => {
    if (!meAvatarFile) return;
    setIsUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', meAvatarFile);
      const res = await runWithFeedback(
        apiFetch('/api/me/upload-avatar', { method: 'POST', body: fd }).then((response) =>
          parseApiResult<AvatarUploadApiResult>(response, { endpoint: '/api/me/upload-avatar', action: 'آپلود آواتار' })
        ),
        {
          kind: 'send',
          loading: 'در حال آپلود آواتار…',
          success: 'آواتار حساب کاربری با موفقیت به‌روزرسانی شد.',
          endpoint: '/api/me/upload-avatar',
        }
      );
      const avatarUrl = res?.data?.avatarUrl;
      if (avatarUrl) updateCurrentUser({ avatarUrl });
      setMeAvatarFile(null);
      setMeAvatarPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return null;
      });
      if (meAvatarInputRef.current) meAvatarInputRef.current.value = '';
      setNotification({ type: 'success', text: 'آواتار حساب کاربری با موفقیت به‌روزرسانی شد.', closeMs: 3600 });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error) || 'خطا در آپلود آواتار.', { endpoint: '/api/me/upload-avatar', action: 'آپلود آواتار' }) });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangeMyPassword = async () => {
    if (!oldPassword || !newPassword || !newPassword2) {
      setNotification({ type: 'error', text: 'همه فیلدهای کلمه عبور را کامل کنید.' });
      return;
    }
    if (newPassword.length < 6) {
      setNotification({ type: 'error', text: 'کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.' });
      return;
    }
    if (newPassword !== newPassword2) {
      setNotification({ type: 'error', text: 'تکرار کلمه عبور جدید با هم برابر نیست.' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await runWithFeedback(
        apiFetch('/api/me/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword, newPassword }),
        }).then((response) => parseApiResult<ChangePasswordApiResult>(response, { endpoint: '/api/me/change-password', action: 'تغییر کلمه عبور' })),
        {
          kind: 'save',
          loading: 'در حال تغییر کلمه عبور…',
          success: 'کلمه عبور با موفقیت تغییر کرد.',
          endpoint: '/api/me/change-password',
        }
      );
      setNotification({ type: 'success', text: res?.message || 'کلمه عبور با موفقیت تغییر کرد.' });
      setOldPassword('');
      setNewPassword('');
      setNewPassword2('');
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error) || 'خطا در تغییر کلمه عبور.', { endpoint: '/api/me/change-password', action: 'تغییر کلمه عبور' }) });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ---- UI helpers
  const infoChanged = JSON.stringify(businessInfo) !== JSON.stringify(initialBusinessInfo);

  const pricingLearningStats = useMemo(() => {
    const total = pricingLearningItems.length;
    const accepted = pricingLearningItems.filter((item) => item?.action === 'accepted').length;
    const overridden = pricingLearningItems.filter((item) => item?.action === 'overridden').length;
    const manual = pricingLearningItems.filter((item) => item?.action === 'manual').length;
    const modelCount = new Set(pricingLearningItems.map((item) => String(item?.model || '').trim()).filter(Boolean)).size;
    const learningPercent = Math.min(100, Math.round((Math.min(total, 12) / 12) * 100));
    const status = total >= 12 ? 'یادگیری بالغ' : total >= 5 ? 'در حال یادگیری' : total > 0 ? 'شروع یادگیری' : 'بدون داده یادگیری';
    return { total, accepted, overridden, manual, modelCount, learningPercent, status };
  }, [pricingLearningItems]);


  const pricingDecisionLog = useMemo<PricingDecisionLogItem[]>(() => {
    const actionMeta: Record<string, PricingToneMeta> = {
      accepted: { label: 'قبول پیشنهاد', icon: 'fa-check-circle', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' },
      overridden: { label: 'اصلاح توسط کاربر', icon: 'fa-pen-to-square', tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' },
      manual: { label: 'قیمت دستی', icon: 'fa-hand-pointer', tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300' },
    };
    const formatMoney = (value: number | string | null | undefined) => {
      const num = Number(value || 0);
      return num > 0 ? `${Math.round(num).toLocaleString('fa-IR')} تومان` : '—';
    };
    const formatDate = (value: PricingDateInput) => {
      const time = parsePricingDateTime(value);
      return time ? new Date(time).toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
    };
    const query = pricingDecisionSearch.trim().toLowerCase();
    const fromTime = parsePricingDecisionDateFilter(pricingDecisionDateFrom);
    const toTime = parsePricingDecisionDateFilter(pricingDecisionDateTo, true);
    return pricingLearningItems
      .slice()
      .reverse()
      .map((item, index) => {
        const suggested = Number(item?.suggestedSale || 0);
        const finalSale = Number(item?.finalSale || 0);
        const delta = suggested > 0 && finalSale > 0 ? Math.round(((finalSale - suggested) / suggested) * 100) : 0;
        const action = String(item?.action || 'manual');
        const createdAt = parsePricingDateTime(item?.createdAt);
        return {
          id: String(item?.id || `${index}-${item?.createdAt || ''}`),
          model: String(item?.model || 'مدل نامشخص'),
          condition: String(item?.condition || 'وضعیت ثبت نشده'),
          action,
          meta: actionMeta[action] || actionMeta.manual,
          suggested: formatMoney(item?.suggestedSale),
          finalSale: formatMoney(item?.finalSale),
          purchase: formatMoney(item?.purchasePrice),
          markup: Number.isFinite(Number(item?.markupPercent)) ? `${Number(item.markupPercent).toFixed(1).replace('.0', '').toLocaleString()}٪` : '—',
          date: formatDate(item?.createdAt),
          createdAt,
          delta,
          deltaLabel: suggested > 0 && finalSale > 0 ? `${delta > 0 ? '+' : ''}${delta.toLocaleString('fa-IR')}٪ نسبت به پیشنهاد` : 'بدون اختلاف قابل محاسبه',
        };
      })
      .filter((item) => {
        const matchesSearch = !query || `${item.model} ${item.condition} ${item.meta.label}`.toLowerCase().includes(query);
        const matchesAction = pricingDecisionActionFilter === 'all' || item.action === pricingDecisionActionFilter;
        const matchesDelta = pricingDecisionDeltaFilter === 'all'
          || (pricingDecisionDeltaFilter === 'higher' && item.delta > 0)
          || (pricingDecisionDeltaFilter === 'lower' && item.delta < 0)
          || (pricingDecisionDeltaFilter === 'same' && Math.abs(item.delta) <= 1);
        const matchesDate = !item.createdAt || (item.createdAt >= fromTime && item.createdAt <= toTime);
        return matchesSearch && matchesAction && matchesDelta && matchesDate;
      });
  }, [pricingLearningItems, pricingDecisionSearch, pricingDecisionActionFilter, pricingDecisionDeltaFilter, pricingDecisionDateFrom, pricingDecisionDateTo]);

  const updatePricingSettings = (patch: Partial<PricingIntelligenceSettings>) => {
    setPricingSettings((prev) => {
      const next = clampPricingSettings({ ...prev, ...patch });
      savePricingIntelligenceSettings(next);
      return next;
    });
  };

  const resetPricingSettings = () => {
    setPricingSettings(DEFAULT_PRICING_INTELLIGENCE_SETTINGS);
    savePricingIntelligenceSettings(DEFAULT_PRICING_INTELLIGENCE_SETTINGS);
    setNotification({ type: 'success', text: 'سیاست هوش قیمت‌گذاری به مقدار پیش‌فرض برگشت.' });
  };

  const resetPricingLearning = () => {
    if (typeof window !== 'undefined') localStorage.setItem(PRICING_BEHAVIOR_STORAGE_KEY, JSON.stringify([]));
    setPricingLearningItems([]);
    setNotification({ type: 'success', text: 'حافظه یادگیری قیمت‌گذاری ریست شد؛ سیستم از تصمیم‌های بعدی دوباره یاد می‌گیرد.' });
  };

  const pricingStrategyAdvisor = useMemo(() => {
    const items = pricingLearningItems.map((item) => ({ ...item, suggestedSaleNum: Number(item?.suggestedSale || 0), finalSaleNum: Number(item?.finalSale || 0), markupNum: Number(item?.markupPercent || 0), createdAtNum: parsePricingDateTime(item?.createdAt), modelName: String(item?.model || '').trim() || 'مدل نامشخص' })).filter((item) => item.finalSaleNum > 0 || item.suggestedSaleNum > 0);
    const recent = items.filter((item) => item.createdAtNum && item.createdAtNum >= Date.now() - 30 * 24 * 60 * 60 * 1000);
    const source = recent.length >= 4 ? recent : items;
    const avgMarkup = source.length ? source.reduce((sum, item) => sum + Number(item.markupNum || 0), 0) / source.length : pricingSettings.targetMarkupPercent;
    const avgDelta = source.length ? source.reduce((sum, item) => item.suggestedSaleNum && item.finalSaleNum ? sum + (((item.finalSaleNum - item.suggestedSaleNum) / item.suggestedSaleNum) * 100) : sum, 0) / source.length : 0;
    const acceptedRate = source.length ? (source.filter((item) => item.action === 'accepted').length / source.length) * 100 : 0;
    const modelFrequency = source.reduce((acc: Record<string, number>, item) => { acc[item.modelName] = (acc[item.modelName] || 0) + 1; return acc; }, {});
    const hotModel = Object.entries(modelFrequency).sort((a, b) => b[1] - a[1])[0] || null;
    const maturity = pricingLearningStats.total >= 18 ? 'حرفه‌ای' : pricingLearningStats.total >= 10 ? 'پایدار' : pricingLearningStats.total >= 4 ? 'در حال یادگیری' : 'تازه‌کار';
    let recommended: PricingStrategyMode = pricingSettings.strategy;
    const confidence = pricingLearningStats.total >= 12 ? 'بالا' : pricingLearningStats.total >= 5 ? 'متوسط' : 'پایین';
    let title = 'استراتژی متعادل را نگه دار';
    let reason = 'داده یادگیری هنوز یا متعادل است یا برای تغییر جدی استراتژی کافی نیست.';
    let icon = 'fa-scale-balanced';
    let tone = 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200';
    if (pricingLearningStats.total < 4) {
      recommended = 'balanced'; title = 'فعلاً یادگیری را ادامه بده'; reason = 'برای پیشنهاد قطعی‌تر، سیستم باید چند تصمیم قیمت‌گذاری واقعی دیگر از ثبت گوشی دریافت کند.'; icon = 'fa-seedling'; tone = 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200';
    } else if (acceptedRate >= 70 && Math.abs(avgDelta) <= 3) {
      recommended = 'balanced'; title = 'AI با رفتار قیمت‌گذاری تو هماهنگ شده'; reason = 'نرخ قبول پیشنهاد بالاست و اختلاف قیمت نهایی با پیشنهاد سیستم پایین مانده؛ استراتژی متعادل امن‌ترین انتخاب است.'; icon = 'fa-bullseye'; tone = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200';
    } else if (avgDelta < -5 || avgMarkup < pricingSettings.targetMarkupPercent - 2) {
      recommended = 'quick'; title = 'بازار را سریع‌تر بچرخان'; reason = 'قیمت‌های نهایی اخیر معمولاً پایین‌تر از پیشنهاد AI بوده؛ یعنی رفتار واقعی به سمت فروش سریع‌تر و آزادسازی سرمایه رفته است.'; icon = 'fa-bolt'; tone = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200';
    } else if (avgDelta > 5 || avgMarkup > pricingSettings.targetMarkupPercent + 3) {
      recommended = 'profit'; title = 'فضا برای سود بالاتر وجود دارد'; reason = 'در تصمیم‌های اخیر، قیمت نهایی معمولاً بالاتر از پیشنهاد AI ثبت شده؛ سیستم می‌تواند حالت سودمحورتر پیشنهاد بدهد.'; icon = 'fa-gem'; tone = 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200';
    }
    const cards = [
      { label: 'پیشنهاد استراتژی', value: pricingStrategyLabels[recommended].label, icon },
      { label: 'سطح اطمینان', value: confidence, icon: 'fa-shield-check' },
      { label: 'میانگین سود رفتاری', value: `${Math.round(avgMarkup).toLocaleString('fa-IR')}٪`, icon: 'fa-percent' },
      { label: 'اختلاف با AI', value: `${avgDelta > 0 ? '+' : ''}${Math.round(avgDelta).toLocaleString('fa-IR')}٪`, icon: 'fa-code-compare' },
    ];
    const actions = [
      recommended !== pricingSettings.strategy ? `تغییر حالت پیش‌فرض به «${pricingStrategyLabels[recommended].label}»` : 'ادامه با همین استراتژی فعلی',
      acceptedRate < 35 && source.length >= 5 ? 'بازبینی درصد سود هدف، چون پیشنهادهای AI زیاد اصلاح شده‌اند' : 'ثبت چند تصمیم جدید برای دقیق‌تر شدن یادگیری',
      hotModel ? `تمرکز روی ${hotModel[0]}؛ بیشترین داده یادگیری اخیر مربوط به این مدل است` : 'شروع یادگیری با چند ثبت گوشی واقعی',
    ];
    return { recommended, confidence, title, reason, icon, tone, cards, actions, maturity };
  }, [pricingLearningItems, pricingLearningStats, pricingSettings]);

  const applyAdvisorStrategy = () => {
    updatePricingSettings({ strategy: pricingStrategyAdvisor.recommended });
    setNotification({ type: 'success', text: `استراتژی پیشنهادی «${pricingStrategyLabels[pricingStrategyAdvisor.recommended].label}» اعمال شد.` });
  };

  const pricingDecisionExportColumns: PricingDecisionExportColumn[] = [
    { header: 'مدل گوشی', key: 'model' },
    { header: 'وضعیت', key: 'condition' },
    { header: 'نوع تصمیم', key: 'actionLabel' },
    { header: 'تاریخ', key: 'date' },
    { header: 'قیمت خرید', key: 'purchase' },
    { header: 'پیشنهاد AI', key: 'suggested' },
    { header: 'قیمت نهایی', key: 'finalSale' },
    { header: 'سود رفتاری', key: 'markup' },
    { header: 'اختلاف با AI', key: 'deltaLabel' },
  ];

  const pricingDecisionExportRows = useMemo<PricingDecisionExportRow[]>(() => pricingDecisionLog.map((item) => ({
    model: item.model,
    condition: item.condition,
    actionLabel: item.meta.label,
    date: item.date,
    purchase: item.purchase,
    suggested: item.suggested,
    finalSale: item.finalSale,
    markup: item.markup,
    deltaLabel: item.deltaLabel,
  })), [pricingDecisionLog]);

  const exportPricingDecisionLogExcel = () => {
    if (pricingDecisionExportRows.length === 0) {
      setNotification({ type: 'error', text: 'برای خروجی اکسل، ابتدا باید حداقل یک تصمیم در لاگ وجود داشته باشد.' });
      return;
    }
    exportToExcel(`pricing-decision-log-${new Date().toISOString().slice(0, 10)}.xlsx`, pricingDecisionExportRows, pricingDecisionExportColumns, 'لاگ تصمیمات قیمت‌گذاری');
    setNotification({ type: 'success', text: 'خروجی اکسل لاگ تصمیمات قیمت‌گذاری آماده شد.' });
  };
  const exportPricingDecisionLogPdf = () => {
    if (pricingDecisionExportRows.length === 0) {
      setNotification({ type: 'error', text: 'برای خروجی PDF، ابتدا باید حداقل یک تصمیم در لاگ وجود داشته باشد.' });
      return;
    }
    exportToPdfTable({
      filename: `pricing-decision-log-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: 'لاگ تصمیمات هوش قیمت‌گذاری',
      head: pricingDecisionExportColumns.map((col) => col.header),
      body: pricingDecisionExportRows.map((row) => pricingDecisionExportColumns.map((col) => String(row[col.key] || '—'))),
    });
    setNotification({ type: 'success', text: 'خروجی PDF لاگ تصمیمات قیمت‌گذاری آماده شد.' });
  };

  const isAdmin = (currentUser?.roleName === 'Admin');
  const canManageStoreOwnership = canManageStoreOwnershipByRole(currentUser?.roleName);
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
  const accountProfile = currentUser as (typeof currentUser & { lastLoginAt?: string | null; displayName?: string | null }) | null;
  const accountDisplayName = accountProfile?.displayName || [accountProfile?.firstName, accountProfile?.lastName].filter(Boolean).join(' ').trim() || accountProfile?.username || 'کاربر سیستم';
  const accountInitial = (accountDisplayName || accountProfile?.username || 'K').trim().slice(0, 1).toUpperCase();
  const accountJoinedAt = accountProfile?.dateAdded ? formatIsoToShamsiDateTime(accountProfile.dateAdded) : 'ثبت نشده';
  const accountLastLogin = (accountProfile?.lastLoginAt || accountProfile?.lastLogin) ? formatIsoToShamsiDateTime(accountProfile?.lastLoginAt || accountProfile?.lastLogin) : 'ثبت نشده';
  const accountPasswordScore = [
    newPassword.length >= 8,
    /[A-Z]/.test(newPassword),
    /[0-9]/.test(newPassword),
    /[^A-Za-z0-9]/.test(newPassword),
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
    { label: 'ورود معتبر', ok: Boolean(token), hint: token ? 'نشست فعال است.' : 'توکن ورود پیدا نشد.' },
    { label: 'نقش دسترسی', ok: Boolean(accountProfile?.roleName), hint: accountProfile?.roleName ? getRoleLabelFa(accountProfile.roleName) : 'نقش مشخص نیست.' },
    { label: 'پروفایل شخصی', ok: Boolean(accountDisplayName && accountProfile?.username), hint: accountProfile?.username ? 'اطلاعات پایه حساب قابل شناسایی است.' : 'نام کاربری حساب مشخص نیست.' },
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
  const businessSummaryItems = [
    { label: 'تلفن', value: businessInfo.store_phone || 'ثبت نشده', icon: 'fa-phone' },
    { label: 'ایمیل', value: businessInfo.store_email || 'ثبت نشده', icon: 'fa-envelope' },
    { label: 'واحد پول', value: normalizeCurrencyUnit(businessInfo.currency_unit) === 'rial' ? 'ریال' : 'تومان', icon: 'fa-coins' },
    { label: 'QR عمومی', value: businessInfo.qr_public_base_url ? 'فعال' : 'تنظیم نشده', icon: 'fa-qrcode' },
  ];
  const businessAddressSummary = [businessInfo.store_address_line1, businessInfo.store_address_line2, businessInfo.store_city_state_zip]
    .filter(Boolean)
    .join('، ');

  // Use brand colors for labels, inputs and fieldsets
  const labelClass = 'block text-[13px] font-semibold text-slate-700 mb-2';
  const inputClass =
    'w-full min-h-[48px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 text-right shadow-sm transition placeholder:text-slate-400   ';
  const fieldsetLegendClass = 'px-3 text-sm font-black tracking-tight text-slate-900';
  const fieldsetClass = 'settings-fieldset mt-6';
  const settingsSectionCard = 'settings-section-card rounded-[28px] border border-slate-200/80 bg-white p-5 md:p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.18)] dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-[0_18px_44px_-34px_rgba(2,6,23,0.72)]';
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

  const handleBackupTimeInputChange = (value: string) => {
    const cleaned = value.replace(/[^\d:]/g, '').slice(0, 5);
    setBackupScheduleTime(cleaned);
  };

  const handleBackupTimeInputBlur = () => {
    setBackupScheduleTime(sanitizeTime(backupScheduleTime));
  };

  const telegramDestinationFields = [
    String(telegramInfo.telegram_chat_ids_reports || '').trim(),
    String(telegramInfo.telegram_chat_ids_installments || '').trim(),
    String(telegramInfo.telegram_chat_ids_sales || '').trim(),
    String(telegramInfo.telegram_chat_ids_notifications || '').trim(),
  ].filter(Boolean);
  const telegramDestinationCount = telegramDestinationFields.length;
  const telegramConfigChecks = [
    { key: 'token', label: 'توکن ربات', ok: Boolean(String(businessInfo.telegram_bot_token || '').trim()), targetId: 'telegram_bot_token' },
    { key: 'username', label: 'نام کاربری ربات', ok: Boolean(String(telegramInfo.telegram_bot_username || '').trim()), targetId: 'telegram_bot_username' },
    { key: 'chat', label: 'شناسه چت اصلی', ok: Boolean(String(businessInfo.telegram_chat_id || '').trim()), targetId: 'telegram_chat_id' },
    { key: 'base', label: 'آدرس عمومی برنامه', ok: Boolean(String(businessInfo.app_base_url || '').trim()), targetId: 'app_base_url' },
    { key: 'route', label: 'مسیر اتصال', ok: Boolean(String(telegramInfo.telegram_proxy || '').trim()) || Boolean(String(businessInfo.telegram_bot_token || '').trim()), targetId: 'telegram_proxy' },
    { key: 'quiet', label: 'قوانین سکوت', ok: telegramInfo.telegram_quiet_start_hour !== '' && telegramInfo.telegram_quiet_start_hour != null && telegramInfo.telegram_quiet_end_hour !== '' && telegramInfo.telegram_quiet_end_hour != null, targetId: 'telegram_quiet_start_hour' },
    { key: 'destinations', label: 'مقصدهای تفکیکی', ok: telegramDestinationCount > 0, targetId: 'telegram_chat_ids_reports' },
    { key: 'otp', label: 'OTP اتصال', ok: Boolean(String(telegramInfo.sms_otp_meli_body_id || '').trim()), targetId: 'sms_otp_meli_body_id' },
  ];
  const telegramConfigReadyCount = telegramConfigChecks.filter((item) => item.ok).length;
  const telegramConfigReadiness = Math.round((telegramConfigReadyCount / Math.max(telegramConfigChecks.length, 1)) * 100);
  const telegramConnectionMode = String(telegramInfo.telegram_proxy || '').trim() ? 'Proxy Active' : 'VPN / Direct';
  const telegramHealthTone = tgHealth?.ok ? 'emerald' : tgHealth ? 'rose' : telegramConfigReadiness >= 75 ? 'sky' : telegramConfigReadiness >= 45 ? 'amber' : 'rose';
  const telegramFirstMissingCheck = telegramConfigChecks.find((item) => !item.ok) || null;
  const telegramConfigCoachMessage = tgHealth?.ok
    ? 'اتصال ربات سالم است؛ حالا روی مسیرهای مقصد، OTP و بررسی و ادامه ارسال تمرکز کن تا تجربه ارسال یکدست شود.'
    : telegramFirstMissingCheck
      ? `برای کامل‌تر شدن این بخش، اول «${telegramFirstMissingCheck.label}» را تکمیل کن.`
      : 'تنظیمات اصلی کامل‌اند؛ یک بررسی و ادامه ارسال انجام بده و سپس کنترل‌سنتر را بررسی و ادامه کن.';

  const jumpToTelegramConfigField = (targetId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(targetId) as (HTMLElement | null);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      if (typeof el.focus === 'function') el.focus();
      el.classList.add('ring-4', 'ring-sky-200', 'ring-offset-2', 'ring-offset-white');
      window.setTimeout(() => el.classList.remove('ring-4', 'ring-sky-200', 'ring-offset-2', 'ring-offset-white'), 1600);
    }, 120);
  };

  const telegramSmartActions = [
    { key: 'token', label: 'توکن و هویت ربات', value: String(telegramInfo.telegram_bot_username || '').trim() ? `@${String(telegramInfo.telegram_bot_username || '').trim()}` : 'هنوز ثبت اطلاعات نشده', icon: 'fa-key', ok: Boolean(String(businessInfo.telegram_bot_token || '').trim() && String(telegramInfo.telegram_bot_username || '').trim()), targetId: !String(businessInfo.telegram_bot_token || '').trim() ? 'telegram_bot_token' : 'telegram_bot_username' },
    { key: 'chat', label: 'چت مقصد اصلی', value: String(businessInfo.telegram_chat_id || '').trim() ? 'متصل' : 'نیاز به ثبت اطلاعات chat_id', icon: 'fa-comments', ok: Boolean(String(businessInfo.telegram_chat_id || '').trim()), targetId: 'telegram_chat_id' },
    { key: 'route', label: 'مسیر ارتباط', value: telegramConnectionMode, icon: String(telegramInfo.telegram_proxy || '').trim() ? 'fa-shuffle' : 'fa-shield-halved', ok: true, targetId: 'telegram_proxy' },
    { key: 'routing', label: 'مقصدهای تفکیکی', value: telegramDestinationCount ? `${telegramDestinationCount.toLocaleString('fa-IR')} بخش آماده` : 'هنوز تنظیم نشده', icon: 'fa-route', ok: telegramDestinationCount > 0, targetId: 'telegram_chat_ids_reports' },
    { key: 'otp', label: 'OTP اتصال مشتری', value: String(telegramInfo.sms_otp_meli_body_id || '').trim() ? 'BodyId ثبت اطلاعات شده' : 'نیاز به BodyId', icon: 'fa-mobile-screen-button', ok: Boolean(String(telegramInfo.sms_otp_meli_body_id || '').trim()), targetId: 'sms_otp_meli_body_id' },
    { key: 'check', label: 'بررسی و ادامه ارسال', value: tgHealth?.ok ? 'ربات پاسخ می‌دهد' : 'برای اطمینان ارسال را بررسی و ادامه کن', icon: 'fa-paper-plane', ok: Boolean(tgHealth?.ok), targetId: 'telegram_quick_msg' },
  ];

  const telegramSetupItems = [
    {
      key: 'token',
      title: 'توکن ربات',
      done: Boolean(String(businessInfo.telegram_bot_token || '').trim()),
      hint: 'برای اتصال ربات به Bot API لازم است.',
      icon: 'fa-key',
      target: 'telegram_bot_token',
    },
    {
      key: 'username',
      title: 'یوزرنیم ربات',
      done: Boolean(String(telegramInfo.telegram_bot_username || '').trim()),
      hint: 'برای لینک مشتری و ساخت لینک t.me لازم است.',
      icon: 'fa-at',
      target: 'telegram_bot_username',
    },
    {
      key: 'chat',
      title: 'چت اصلی',
      done: Boolean(String(businessInfo.telegram_chat_id || '').trim()),
      hint: 'پیام‌ها در نبود مقصد تفکیکی، اینجا ارسال می‌شوند.',
      icon: 'fa-comments',
      target: 'telegram_chat_id',
    },
    {
      key: 'base',
      title: 'آدرس برنامه',
      done: Boolean(String(businessInfo.app_base_url || '').trim()),
      hint: 'برای لینک‌های پیام و اتصال مشتری لازم است.',
      icon: 'fa-link',
      target: 'app_base_url',
    },
    {
      key: 'routing',
      title: 'مقصدهای تفکیکی',
      done: [businessInfo.telegram_chat_ids_reports, businessInfo.telegram_chat_ids_installments, businessInfo.telegram_chat_ids_sales, businessInfo.telegram_chat_ids_notifications].some((v) => Boolean(String(v || '').trim())),
      hint: 'مسیر اعلان‌ها را برای هر بخش جدا می‌کند.',
      icon: 'fa-route',
      target: 'telegram_chat_ids_reports',
    },
    {
      key: 'policy',
      title: 'قوانین ارسال',
      done: Boolean(String(telegramInfo.telegram_quiet_start_hour ?? '').trim() || String(telegramInfo.telegram_quiet_end_hour ?? '').trim() || String(telegramInfo.telegram_max_per_day_per_customer ?? '').trim() || String(businessInfo.telegram_silent_hours || '').trim()),
      hint: 'ساعات سکوت و سقف ارسال را کنترل می‌کند.',
      icon: 'fa-sliders',
      target: 'telegram_quiet_start_hour',
    },
  ];
  const telegramSetupDone = telegramSetupItems.filter((item) => item.done).length;
  const telegramSetupPercent = Math.round((telegramSetupDone / Math.max(telegramSetupItems.length, 1)) * 100);
  const telegramMissingItems = telegramSetupItems.filter((item) => !item.done);
  const telegramHasProxy = Boolean(String(telegramInfo.telegram_proxy || '').trim());
  const telegramAudienceDestinationCount = [businessInfo.telegram_chat_ids_reports, businessInfo.telegram_chat_ids_installments, businessInfo.telegram_chat_ids_sales, businessInfo.telegram_chat_ids_notifications]
    .map((v) => String(v || '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean).length)
    .reduce((sum, n) => sum + n, 0);
  const telegramReadinessLabel = telegramSetupPercent >= 85 ? 'آماده عملیات' : telegramSetupPercent >= 50 ? 'نیمه‌پیکربندی' : 'نیاز به تکمیل';
  const telegramSetupCoachMessage = telegramMissingItems.length === 0
    ? 'تنظیمات پایه کامل شده‌اند. اکنون مسیر ارسال پیام و مرکز کنترل را بررسی و ادامه کن.'
    : `برای تکمیل سریع‌تر، اول «${telegramMissingItems[0]?.title || 'توکن ربات'}» را تنظیم کن؛ بعد یک بررسی و ادامه ارسال انجام بده.`;
  const jumpToTelegramSetupField = (fieldId: string) => {
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        try { el.select?.(); } catch {}
      });
    }
  };

  const settingsTelegramLegacyFormatters = [fmtDateFa, fmtAgoFa, fmtLag, tgRetryAllFailed, tgCleanupFailed, scrollToTelegramAnchor];
  void settingsTelegramLegacyFormatters;

  const jumpToTelegramSection = (sectionId: string) => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || {};
      if (detail?.templateKey) {
        setTelegramStudioMode('all');
        jumpToTelegramTemplate(String(detail.templateKey));
        return;
      }
      if (detail?.targetId) {
        jumpToTelegramSetupField(String(detail.targetId));
      }
    };
    window.addEventListener('kourosh:telegramQuickFix', handler as EventListener);
    return () => window.removeEventListener('kourosh:telegramQuickFix', handler as EventListener);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramTemplateDefs]);

  const telegramTokenValue = String(businessInfo.telegram_bot_token || '').trim();
  const telegramUsernameValue = String(businessInfo.telegram_bot_username || '').trim();
  const telegramChatIdValue = String(businessInfo.telegram_chat_id || '').trim();
  const telegramAppBaseUrlValue = String(businessInfo.app_base_url || '').trim();
  const telegramProxyValue = String(telegramInfo.telegram_proxy || '').trim();
  const localHostnameValue = String(businessInfo.local_hostname || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const localSuffixRawValue = String(businessInfo.local_domain_suffix || 'localhost').trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '');
  const localSuffixValue = ['localhost', 'home.arpa', 'internal', 'lan'].includes(localSuffixRawValue) ? localSuffixRawValue : 'localhost';
  const localDomainValue = localHostnameValue ? `${localHostnameValue}.${localSuffixValue}` : '';
  const localBaseUrlValue = localDomainValue ? `https://${localDomainValue}` : '';
  const localHostsIpValue = String(businessInfo.local_hosts_ip || '').trim();
  const localHostsSuggestedIp = localSuffixValue === 'localhost' ? '127.0.0.1' : (localHostsIpValue || '127.0.0.1');
  const localHostsLineValue = String(businessInfo.local_hosts_line || (localDomainValue ? `${localHostsSuggestedIp} ${localDomainValue}` : '')).trim();
  const telegramQuietStartValue = String(telegramInfo.telegram_quiet_start_hour ?? '').trim();
  const telegramQuietEndValue = String(telegramInfo.telegram_quiet_end_hour ?? '').trim();
  const telegramDailyLimitValue = String(telegramInfo.telegram_max_per_day_per_customer ?? '').trim();
  const telegramSilentHoursValue = String(businessInfo.telegram_silent_hours || '').trim();

  const telegramFieldInsights = {
    token: {
      ok: Boolean(telegramTokenValue),
      tone: Boolean(telegramTokenValue) ? 'emerald' : 'rose',
      chip: Boolean(telegramTokenValue) ? 'توکن ثبت اطلاعات شده' : 'نیاز به تنظیم',
      message: Boolean(telegramTokenValue)
        ? 'توکن ربات ذخیره تغییرات شده و هویت اصلی بات حاضر است.'
        : 'بدون توکن، هیچ مسیر تلگرامی فعال نمی‌شود. این اولین قدم ستاپ است.',
      cta: 'پر کردن توکن',
      target: 'telegram_bot_token',
    },
    username: {
      ok: Boolean(telegramUsernameValue),
      tone: telegramTokenValue && !telegramUsernameValue ? 'amber' : Boolean(telegramUsernameValue) ? 'emerald' : 'slate',
      chip: telegramTokenValue && !telegramUsernameValue ? 'نیاز به username' : Boolean(telegramUsernameValue) ? 'آماده لینک‌سازی' : 'اختیاری ولی مهم',
      message: telegramTokenValue && !telegramUsernameValue
        ? 'توکن ثبت اطلاعات شده اما username ربات هنوز خالی است؛ لینک t.me و QR مشتری ناقص می‌ماند.'
        : Boolean(telegramUsernameValue)
        ? 'username ربات ثبت اطلاعات شده و لینک‌سازی مشتری بدون اصطکاک انجام می‌شود.'
        : 'این فیلد برای onboarding حرفه‌ای مشتری و ساخت لینک ربات توصیه می‌شود.',
      cta: telegramTokenValue && !telegramUsernameValue ? 'ثبت اطلاعات username' : 'بررسی و ادامه username',
      target: 'telegram_bot_username',
    },
    chatId: {
      ok: Boolean(telegramChatIdValue),
      tone: Boolean(telegramChatIdValue) ? 'emerald' : 'rose',
      chip: Boolean(telegramChatIdValue) ? 'مقصد اصلی ثبت شد' : 'CTA: ثبت chat_id',
      message: Boolean(telegramChatIdValue)
        ? 'چت اصلی تعریف شده و ربات برای ارسال پایه مقصد دارد.'
        : 'chat_id اصلی خالی است؛ برای شروع ارسال و مسیر جایگزین، همین الان آن را ثبت اطلاعات کن.',
      cta: Boolean(telegramChatIdValue) ? 'باز کردن chat_id' : 'ثبت اطلاعات chat_id',
      target: 'telegram_chat_id',
    },
    baseUrl: {
      ok: Boolean(telegramAppBaseUrlValue),
      tone: Boolean(telegramAppBaseUrlValue) ? 'emerald' : 'amber',
      chip: Boolean(telegramAppBaseUrlValue) ? 'لینک‌دهی فعال' : 'بدون لینک داخلی',
      message: Boolean(telegramAppBaseUrlValue)
        ? 'لینک‌های داخل پیام‌ها می‌توانند به اپ یا سایت برگردند.'
        : 'بدون آدرس عمومی، لینک‌های داخل پیام و بعضی CTAها ساخته نمی‌شوند.',
      cta: Boolean(telegramAppBaseUrlValue) ? 'بررسی و ادامه آدرس' : 'ثبت اطلاعات آدرس عمومی',
      target: 'app_base_url',
    },
    proxy: {
      ok: telegramProxyValue ? Boolean(tgHealth?.ok) : true,
      tone: telegramProxyValue ? (tgHealth?.ok ? 'emerald' : tgHealth ? 'rose' : 'amber') : 'sky',
      chip: telegramProxyValue ? (tgHealth?.ok ? 'Proxy سالم' : tgHealth ? 'Proxy نیاز به بررسی و ادامه' : 'Proxy فعال') : 'VPN / Direct',
      message: telegramProxyValue
        ? (tgHealth?.ok ? 'پراکسی تنظیم شده و سلامت اتصال هم خوب است.' : tgHealth ? 'پراکسی فعال است ولی health خطا در عملیات داده؛ مسیر ارتباط را دوباره چک کن.' : 'پراکسی ثبت اطلاعات شده؛ یک health check بزن تا مطمئن شوی مسیر درست کار می‌کند.')
        : 'اگر VPN سیستم پایدار است، همین مسیر مستقیم ساده‌تر و کم‌اصطکاک‌تر است.',
      cta: telegramProxyValue ? 'بررسی و ادامه مسیر اتصال' : 'نیازی به اقدام فوری نیست',
      target: 'telegram_proxy',
    },
    rules: {
      ok: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue),
      tone: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue) ? 'emerald' : 'amber',
      chip: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue) ? 'قوانین ثبت‌شده' : 'بدون Guard Rail',
      message: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue)
        ? 'حداقل یکی از guard railهای ارسال تنظیم شده و ریسک اسپم کمتر است.'
        : 'برای تجربه حرفه‌ای‌تر، quiet hours یا سقف پیام روزانه را هم تنظیم کن.',
      cta: 'رفتن به قوانین ارسال',
      target: 'telegram_quiet_start_hour',
    },
  } as const;

  const getTelegramMiniStatusClasses = (tone: 'emerald' | 'rose' | 'amber' | 'slate' | 'sky') => {
    if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-200';
    if (tone === 'rose') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200';
    if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200';
    if (tone === 'sky') return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/30 dark:bg-sky-950/20 dark:text-sky-200';
    return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  };

  const renderTelegramFieldLabel = (
    title: string,
    insight: { chip: string; tone: 'emerald' | 'rose' | 'amber' | 'slate' | 'sky'; target: string; },
    iconClass = 'fa-circle-info'
  ) => (
    <span className="telegram-field-heading">
      <span className="telegram-field-heading__title">
        <span className="telegram-field-heading__icon" aria-hidden="true">
          <i className={`fa-solid ${iconClass}`} />
        </span>
        <span className="telegram-field-heading__text">{title}</span>
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          jumpToTelegramSetupField(insight.target);
        }}
        className={`telegram-field-heading__chip inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${getTelegramMiniStatusClasses(insight.tone)}`}
      >
        <i className={`fa-solid ${insight.tone === 'emerald' ? 'fa-circle-check' : insight.tone === 'rose' ? 'fa-triangle-exclamation' : insight.tone === 'amber' ? 'fa-bolt' : 'fa-circle-info'}`} />
        {insight.chip}
      </button>
    </span>
  );


  const renderTelegramPlainFieldLabel = (title: string, iconClass: string) => (
    <span className="telegram-plain-field-heading">
      <span className="telegram-plain-field-heading__icon" aria-hidden="true">
        <i className={`fa-solid ${iconClass}`} />
      </span>
      <span className="telegram-plain-field-heading__text">{title}</span>
    </span>
  );

  const smsInfo = businessInfo as SmsBusinessInfo;
  const getSmsInfoString = (key: string) => String(smsInfo[key] || '').trim();
  const smsConfiguredCount = meliPatternDefs.filter((p) => Boolean(getSmsInfoString(p.key))).length;
  const smsTotalCount = meliPatternDefs.length;
  const smsAutomationCount = [
    smsInfo.auto_send_installment_due,
    smsInfo.auto_send_check_due,
    smsInfo.auto_send_repair_ready,
  ].filter((v) => String(v || 'off') !== 'off').length;
  const smsProvider = String(smsInfo.sms_provider || 'meli_payamak');
  const smsProviderLabels: Record<string, { title: string; subtitle: string; icon: string }> = {
    meli_payamak: { title: 'ملی‌پیامک', subtitle: 'پترن‌محور و مناسب OTP', icon: 'fa-mobile-screen-button' },
    kavenegar: { title: 'کاوه‌نگار', subtitle: 'API key و قالب‌های اختصاصی', icon: 'fa-bolt' },
    sms_ir: { title: 'SMS.ir', subtitle: 'Template IDهای ساختاریافته', icon: 'fa-envelope-open-text' },
    ippanel: { title: 'IPPanel', subtitle: 'Pattern Codeهای سبک', icon: 'fa-satellite-dish' },
  };
  const smsProviderMeta = smsProviderLabels[smsProvider] || { title: 'نامشخص', subtitle: 'پیکربندی نشده', icon: 'fa-circle-question' };
  const smsProviderReady =
    smsProvider === 'meli_payamak'
      ? Boolean(getSmsInfoString('meli_payamak_username') && getSmsInfoString('meli_payamak_password'))
      : smsProvider === 'kavenegar'
        ? Boolean(getSmsInfoString('kavenegar_api_key'))
        : smsProvider === 'sms_ir'
          ? Boolean(getSmsInfoString('sms_ir_api_key'))
          : smsProvider === 'ippanel'
            ? Boolean(getSmsInfoString('ippanel_token'))
            : false;
  const smsCoreReady = smsProviderReady && (smsProvider !== 'meli_payamak' || smsConfiguredCount > 0);

  if (isLoading) {
    return (
      <PageShell title="تنظیمات" description="پیکربندی سیستم، کاربران و تنظیمات کسب‌وکار." icon={<i className="fa-solid fa-gear" />} className="settings-shell-page">
        <div className="p-10 text-center text-gray-500">
        <i className="fas fa-spinner fa-spin text-3xl mb-3" />
        <p>در حال دریافت اطلاعات تنظیمات...</p>
      </div>
      </PageShell>
    );
  }


  return (
    <PageShell title="تنظیمات" description="پیکربندی سیستم، کاربران و تنظیمات کسب‌وکار." icon={<i className="fa-solid fa-gear" />} className="settings-shell-page">
    <div className={`settings-shell settings-redesign-v1 space-y-8 text-right max-w-7xl mx-auto px-4 ${settingsViewMode === 'simple' ? 'settings-view-simple' : 'settings-view-advanced'}`} dir="rtl" data-ui-settings-shell="true" data-settings-view-mode={settingsViewMode}>
      <Notification message={notification} onClose={() => setNotification(null)} />

      <SettingsHeaderBar
        infoChanged={infoChanged}
        isSaving={isSaving}
        settingsViewMode={settingsViewMode}
        setSettingsViewMode={setSettingsViewMode}
        onRevert={() => {
          setBusinessInfo(initialBusinessInfo);
          setLogoFile(null);
        }}
        onSave={() => {
          const form = document.getElementById('settings-form') as HTMLFormElement | null;
          if (tab === 'business' && form) form.requestSubmit();
          if (tab === 'modules') handleBusinessInfoSubmit();
          if (tab === 'sms') handleBusinessInfoSubmit();
          if (tab === 'telegram') handleTelegramSettingsSubmit();
          if (tab === 'local') handleSaveLocalDomainSettings();
        }}
      />

      <SettingsNavigation
        tab={tab}
        setTab={setTab}
        isAdmin={isAdmin}
        isSettingsTabRuntimeEnabled={isSettingsTabRuntimeEnabled}
        canManageStoreOwnership={canManageStoreOwnership}
        partnerSetupNeedsAttention={partnerSetupNeedsAttention}
        partnerShareChipClass={partnerShareChipClass}
        partnerShareChipIcon={partnerShareChipIcon}
        partnerShareStatus={partnerShareStatus}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 mt-4">
        <SettingsSidebar
          tab={tab}
          setTab={setTab}
          isAdmin={isAdmin}
          isSettingsTabRuntimeEnabled={isSettingsTabRuntimeEnabled}
          canManageStoreOwnership={canManageStoreOwnership}
          partnerShareChipClass={partnerShareChipClass}
          partnerShareChipIcon={partnerShareChipIcon}
          partnerShareStatus={partnerShareStatus}
        />

        {/* Main */}
        <section className="settings-workspace overflow-hidden" data-ui-settings-workspace="true">
          <div className="settings-panel-frame p-5 lg:p-7" data-ui-settings-panel-frame="true">

          {!isAdmin && tab !== 'account' && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20 p-4">
              <div className="settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-200 flex items-center justify-center">
                  <i className="fa-solid fa-lock" />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="font-semibold text-amber-900 dark:text-amber-100">دسترسی محدود</div>
                  <div className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
                    برای امنیت سیستم، این بخش‌ها فقط برای مدیر (Admin) فعال است. شما می‌توانید از تب «حساب کاربری» پروفایل و امنیت حساب خود را مدیریت کنید.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('account')}
                  className="px-3 py-2 text-sm rounded-xl bg-amber-600 text-white hover:brightness-110 transition"
                >
                  رفتن به حساب
                </button>
              </div>
              </div>
          )}


          {tab === 'account' && (
            <SettingsAccountPanel
              meAvatarInputRef={meAvatarInputRef}
              handleMeAvatarChange={handleMeAvatarChange}
              meAvatarPreview={meAvatarPreview}
              accountProfile={accountProfile}
              accountDisplayName={accountDisplayName}
              accountInitial={accountInitial}
              isAdmin={isAdmin}
              getRoleLabelFa={getRoleLabelFa}
              setTab={setTab}
              meAvatarFile={meAvatarFile}
              isUploadingAvatar={isUploadingAvatar}
              handleMeAvatarUpload={handleMeAvatarUpload}
              accountMetaItems={accountMetaItems}
              settingsSectionCard={settingsSectionCard}
              labelClass={labelClass}
              inputClass={inputClass}
              showAccountPasswordFields={showAccountPasswordFields}
              setShowAccountPasswordFields={setShowAccountPasswordFields}
              oldPassword={oldPassword}
              setOldPassword={setOldPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              newPassword2={newPassword2}
              setNewPassword2={setNewPassword2}
              accountPasswordVisual={accountPasswordVisual}
              accountPasswordScore={accountPasswordScore}
              accountPasswordMismatch={accountPasswordMismatch}
              handleChangeMyPassword={handleChangeMyPassword}
              accountPasswordReady={accountPasswordReady}
              isChangingPassword={isChangingPassword}
              accountSecurityItems={accountSecurityItems}
            />
          )}


          {tab === 'business' && (
            <SettingsBusinessPanel
              businessInfo={businessInfo}
              businessSummaryItems={businessSummaryItems}
              businessAddressSummary={businessAddressSummary}
              labelClass={labelClass}
              inputClass={inputClass}
              settingsSectionCard={settingsSectionCard}
              logoInputRef={logoInputRef}
              logoPreview={logoPreview}
              logoFile={logoFile}
              isUploadingLogo={isUploadingLogo}
              infoChanged={infoChanged}
              isSaving={isSaving}
              canManageStoreOwnership={canManageStoreOwnership}
              partnerSetupNeedsAttention={partnerSetupNeedsAttention}
              partnerShareChipClass={partnerShareChipClass}
              partnerShareChipIcon={partnerShareChipIcon}
              partnerShareStatus={partnerShareStatus}
              handleBusinessInfoSubmit={handleBusinessInfoSubmit}
              handleBusinessInfoChange={handleBusinessInfoChange}
              handleLogoFileChange={handleLogoFileChange}
              handleLogoUpload={handleLogoUpload}
              logoInputRefClick={logoInputRefClick}
            />
          )}

          {tab === 'modules' && (
            <SettingsModulesPanel
              infoChanged={infoChanged}
              isSaving={isSaving}
              handleBusinessInfoSubmit={handleBusinessInfoSubmit}
              moduleRuntimeSummary={moduleRuntimeSummary}
              commercialPlanUiCopy={commercialPlanUiCopy}
              isFeatureSettingEnabled={isFeatureSettingEnabled}
              applyCommercialPlan={applyCommercialPlan}
              getFeatureRuntimeBadges={getFeatureRuntimeBadges}
              setFeatureByKey={setFeatureByKey}
            />
          )}

          <SettingsLocalPanel
            tab={tab}
            businessInfo={businessInfo}
            labelClass={labelClass}
            inputClass={inputClass}
            localHostnameValue={localHostnameValue}
            localSuffixValue={localSuffixValue}
            localDomainValue={localDomainValue}
            localHostsLineValue={localHostsLineValue}
            localCertMessage={localCertMessage}
            localCertError={localCertError}
            isGeneratingLocalCert={isGeneratingLocalCert}
            infoChanged={infoChanged}
            isSaving={isSaving}
            handleGenerateLocalCertificate={handleGenerateLocalCertificate}
            handleDownloadHostsScript={handleDownloadHostsScript}
            handleBusinessInfoChange={handleBusinessInfoChange}
            handleBusinessInfoSubmit={handleBusinessInfoSubmit}
          />

          <SettingsSmsPanel
            tab={tab}
            businessInfo={smsInfo}
            inputClass={inputClass}
            labelClass={labelClass}
            fieldsetClass={fieldsetClass}
            fieldsetLegendClass={fieldsetLegendClass}
            smsCoreReady={smsCoreReady}
            smsProviderMeta={smsProviderMeta}
            smsConfiguredCount={smsConfiguredCount}
            smsTotalCount={smsTotalCount}
            smsAutomationCount={smsAutomationCount}
            meliPatternDefs={meliPatternDefs}
            handleBusinessInfoChange={handleBusinessInfoChange}
            handleBusinessInfoSubmit={handleBusinessInfoSubmit}
            scrollToSection={scrollToSection}
            openSmsPatternPreview={openSmsPatternPreview}
            openSmsPatternCheck={openSmsPatternCheck}
            setSmsBulkDefaults={setSmsBulkDefaults}
            setSmsBulkOpen={setSmsBulkOpen}
          />

          {/* تب تنظیمات تلگرام */}
          <SettingsTelegramPanel
            tab={tab}
            settingsViewMode={settingsViewMode}
            businessInfo={telegramInfo}
            handleBusinessInfoSubmit={handleBusinessInfoSubmit}
            handleBusinessInfoChange={handleBusinessInfoChange}
            setBusinessInfo={setBusinessInfo}
            setNotification={setNotification}
            applyTelegramAiSuggestion={applyTelegramAiSuggestion}
            applyTelegramPreset={applyTelegramPreset}
            buildTelegramAudiencePreset={buildTelegramAudiencePreset}
            bumpTelegramQuickActionUsage={bumpTelegramQuickActionUsage}
            checkTelegramHealth={checkTelegramHealth}
            clearTelegramStudioFilters={clearTelegramStudioFilters}
            deferTelegramTodo={deferTelegramTodo}
            fetchTelegramRecentChats={fetchTelegramRecentChats}
            filteredTelegramGroupedDefs={filteredTelegramGroupedDefs}
            focusTelegramAudience={focusTelegramAudience}
            getTelegramAiAssistantCopy={getTelegramAiAssistantCopy}
            getTelegramAudienceFormatKey={getTelegramAudienceFormatKey}
            getTelegramAudienceKey={getTelegramAudienceKey}
            getTelegramCategoryStatus={getTelegramCategoryStatus}
            getTelegramItemStatus={getTelegramItemStatus}
            getTelegramMiniStatusClasses={getTelegramMiniStatusClasses}
            getTelegramPriorityMeta={getTelegramPriorityMeta}
            getTelegramProgressTone={getTelegramProgressTone}
            getTelegramTodoNextStep={getTelegramTodoNextStep}
            inputClass={inputClass}
            jumpToFirstIncompleteTelegramTemplate={jumpToFirstIncompleteTelegramTemplate}
            jumpToTelegramConfigField={jumpToTelegramConfigField}
            jumpToTelegramSection={jumpToTelegramSection}
            jumpToTelegramSetupField={jumpToTelegramSetupField}
            jumpToTelegramTemplate={jumpToTelegramTemplate}
            labelClass={labelClass}
            markTelegramTodoDone={markTelegramTodoDone}
            openSmsPatternCheck={openSmsPatternCheck}
            openTelegramAudiencePanels={openTelegramAudiencePanels}
            openTelegramCategories={openTelegramCategories}
            openTelegramItems={openTelegramItems}
            openTelegramTemplateCheck={openTelegramTemplateCheck}
            openUrgentTelegramTodos={openUrgentTelegramTodos}
            reactivateTelegramTodo={reactivateTelegramTodo}
            renderTelegramFieldLabel={renderTelegramFieldLabel}
            renderTelegramPlainFieldLabel={renderTelegramPlainFieldLabel}
            resetTelegramQuickActionPersonalization={resetTelegramQuickActionPersonalization}
            resetTelegramTodoAssistant={resetTelegramTodoAssistant}
            runTelegramAdminAction={runTelegramAdminAction}
            runTelegramDiagnostics={runTelegramDiagnostics}
            sendTelegramQuickCheck={sendTelegramQuickCheck}
            setAllTelegramCategories={setAllTelegramCategories}
            setAllTelegramItems={setAllTelegramItems}
            setOpenTelegramItems={setOpenTelegramItems}
            setShowTelegramToken={setShowTelegramToken}
            setTelegramStudioMode={setTelegramStudioMode}
            setTelegramTemplateFilter={setTelegramTemplateFilter}
            setTelegramTemplateSearch={setTelegramTemplateSearch}
            setTgQuickMsg={setTgQuickMsg}
            showTelegramToken={showTelegramToken}
            telegramAudienceDestinationCount={telegramAudienceDestinationCount}
            telegramChatIdValue={telegramChatIdValue}
            telegramCoachMessage={telegramCoachMessage}
            telegramConfigChecks={telegramConfigChecks}
            telegramConfigReadiness={telegramConfigReadiness}
            telegramConfigReadyCount={telegramConfigReadyCount}
            telegramConnectionMode={telegramConnectionMode}
            telegramDestinationCount={telegramDestinationCount}
            telegramEffectiveFilter={telegramEffectiveFilter}
            telegramFieldInsights={telegramFieldInsights}
            telegramHasProxy={telegramHasProxy}
            telegramMissingItems={telegramMissingItems}
            telegramPinnedQuickActions={telegramPinnedQuickActions}
            telegramProxyValue={telegramProxyValue}
            telegramQuickActionUsageMap={telegramQuickActionUsageMap}
            telegramReadinessLabel={telegramReadinessLabel}
            telegramReadinessScore={telegramReadinessScore}
            telegramSetupCoachMessage={telegramSetupCoachMessage}
            telegramSetupDone={telegramSetupDone}
            telegramSetupItems={telegramSetupItems}
            telegramSetupPercent={telegramSetupPercent}
            telegramSmartActions={telegramSmartActions}
            telegramSpotlightTarget={telegramSpotlightTarget}
            telegramStudioMode={telegramStudioMode}
            telegramTemplateDefs={telegramTemplateDefs}
            telegramTemplateFilter={telegramTemplateFilter}
            telegramTemplateSearch={telegramTemplateSearch}
            telegramTodoDoneMap={telegramTodoDoneMap}
            telegramTodoSummary={telegramTodoSummary}
            telegramTodoTopItems={telegramTodoTopItems}
            telegramTokenValue={telegramTokenValue}
            telegramUsernameValue={telegramUsernameValue}
            telegramسراسریCompletionPercent={telegramسراسریCompletionPercent}
            telegramسراسریSummary={telegramسراسریSummary}
            tgAudienceMeta={tgAudienceMeta}
            tgCategoryMeta={tgCategoryMeta}
            tgChatLookupHint={tgChatLookupHint}
            tgChatLookupLoading={tgChatLookupLoading}
            tgDiagnostics={tgDiagnostics}
            tgDiagnosticsBusyAction={tgDiagnosticsBusyAction}
            tgDiagnosticsLoading={tgDiagnosticsLoading}
            tgHealth={tgHealth}
            tgIsChecking={tgIsChecking}
            tgIsSendingQuick={tgIsSendingQuick}
            tgQuickMsg={tgQuickMsg}
            tgRecentChats={tgRecentChats}
            toggleTelegramAudiencePanel={toggleTelegramAudiencePanel}
            toggleTelegramCategory={toggleTelegramCategory}
            toggleTelegramItem={toggleTelegramItem}
            toggleTelegramQuickActionPin={toggleTelegramQuickActionPin}
            visibleTelegramItemsCount={visibleTelegramItemsCount}
          />

          {tab === 'pricing' && (
            <SettingsPricingPanel
              pricingLearningStats={pricingLearningStats}
              resetPricingSettings={resetPricingSettings}
              resetPricingLearning={resetPricingLearning}
              pricingStrategyAdvisor={pricingStrategyAdvisor}
              pricingSettings={pricingSettings}
              pricingStrategyLabels={pricingStrategyLabels}
              applyAdvisorStrategy={applyAdvisorStrategy}
              updatePricingSettings={updatePricingSettings}
              pricingDecisionSearch={pricingDecisionSearch}
              setPricingDecisionSearch={setPricingDecisionSearch}
              pricingDecisionActionFilter={pricingDecisionActionFilter}
              setPricingDecisionActionFilter={setPricingDecisionActionFilter}
              pricingDecisionDeltaFilter={pricingDecisionDeltaFilter}
              setPricingDecisionDeltaFilter={setPricingDecisionDeltaFilter}
              pricingDecisionDateFrom={pricingDecisionDateFrom}
              setPricingDecisionDateFrom={setPricingDecisionDateFrom}
              pricingDecisionDateTo={pricingDecisionDateTo}
              setPricingDecisionDateTo={setPricingDecisionDateTo}
              pricingDecisionLog={pricingDecisionLog}
              exportPricingDecisionLogExcel={exportPricingDecisionLogExcel}
              exportPricingDecisionLogPdf={exportPricingDecisionLogPdf}
              normalizePricingDateInput={normalizePricingDateInput}
              formatPricingDatePreview={formatPricingDatePreview}
            />
          )}

          <SettingsRemindersPanel tab={tab} />

          <SettingsSmartPanel
            tab={tab}
            isFeatureSettingEnabled={isFeatureSettingEnabled}
            setNotification={setNotification}
          />

          <SettingsStylePanel tab={tab} />

          <SettingsUsersPanel
            tab={tab}
            userStatsCards={userStatsCards}
            labelClass={labelClass}
            inputClass={inputClass}
            userSearchQuery={userSearchQuery}
            setUserSearchQuery={setUserSearchQuery}
            userRoleFilter={userRoleFilter}
            setUserRoleFilter={setUserRoleFilter}
            roles={roles}
            users={users}
            filteredUsers={filteredUsers}
            userRoleSummaries={userRoleSummaries}
            openAddUserModal={openAddUserModal}
            fetchData={fetchData}
            getRoleLabelFa={getRoleLabelFa}
            openEditUserModal={openEditUserModal}
            openResetPasswordModal={openResetPasswordModal}
            openDeleteUserModal={openDeleteUserModal}
          />

          <SettingsDataPanel
            tab={tab}
            settingsSectionCard={settingsSectionCard}
            inputClass={inputClass}
            backupModeLabel={backupModeLabel}
            backupScheduleTime={backupScheduleTime}
            backupFeedbackTone={backupFeedbackTone}
            backupFeedbackIcon={backupFeedbackIcon}
            backupFeedbackLabel={backupFeedbackLabel}
            backupStatusClass={backupStatusClass}
            backupEnabled={backupEnabled}
            backupStatusLabel={backupStatusLabel}
            backupSummaryTone={backupSummaryTone}
            backupNextRunLabel={backupNextRunLabel}
            backupList={backupList}
            backupSettingsDirty={backupSettingsDirty}
            backupScheduleMode={backupScheduleMode}
            backupScheduleWeekdays={backupScheduleWeekdays}
            backupScheduleIntervalHours={backupScheduleIntervalHours}
            backupTimezone={backupTimezone}
            backupRetention={backupRetention}
            isSavingBackupSchedule={isSavingBackupSchedule}
            isLoadingBackups={isLoadingBackups}
            isRestoringDb={isRestoringDb}
            dbFileInputRef={dbFileInputRef}
            handleBackup={handleBackup}
            handleSaveBackupSchedule={handleSaveBackupSchedule}
            setBackupEnabled={setBackupEnabled}
            setBackupScheduleMode={setBackupScheduleMode}
            handleBackupTimeInputChange={handleBackupTimeInputChange}
            handleBackupTimeInputBlur={handleBackupTimeInputBlur}
            setBackupScheduleWeekdays={setBackupScheduleWeekdays}
            setBackupScheduleIntervalHours={setBackupScheduleIntervalHours}
            setBackupTimezone={setBackupTimezone}
            setBackupRetention={setBackupRetention}
            handleCreateBackupNow={handleCreateBackupNow}
            fetchBackups={fetchBackups}
            handleDownloadBackupFile={handleDownloadBackupFile}
            handleCheckRestore={handleCheckRestore}
            handleRestoreFromBackup={handleRestoreFromBackup}
            handleDeleteBackupFile={handleDeleteBackupFile}
            handleDbFileChange={handleDbFileChange}
          />
        </div>

        <SettingsSaveFooter
          tab={tab}
          infoChanged={infoChanged}
          isSaving={isSaving}
          onSave={() => handleBusinessInfoSubmit()}
        />
	        </section>
      </div>

      <SettingsRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        dbFileName={dbFile?.name || null}
        onRestore={handleRestore}
      />

      <SettingsUsersModals
        isAddUserModalOpen={isAddUserModalOpen}
        setIsAddUserModalOpen={setIsAddUserModalOpen}
        newUser={newUser}
        addUserFormErrors={addUserFormErrors}
        handleNewUserChange={handleNewUserChange}
        handleNewUserSubmit={handleNewUserSubmit}
        roles={roles}
        getRoleLabelFa={getRoleLabelFa}
        isSavingUser={isSavingUser}
        isEditUserModalOpen={isEditUserModalOpen}
        setIsEditUserModalOpen={setIsEditUserModalOpen}
        editingUser={editingUser}
        handleEditUserChange={handleEditUserChange}
        handleEditUserSubmit={handleEditUserSubmit}
        isUpdatingUser={isUpdatingUser}
        isResetPasswordModalOpen={isResetPasswordModalOpen}
        setIsResetPasswordModalOpen={setIsResetPasswordModalOpen}
        resettingUser={resettingUser}
        resetPasswordData={resetPasswordData}
        resetPasswordErrors={resetPasswordErrors}
        setResetPasswordData={setResetPasswordData}
        handleResetPasswordSubmit={handleResetPasswordSubmit}
        isSubmittingReset={isSubmittingReset}
        isDeleteUserModalOpen={isDeleteUserModalOpen}
        setIsDeleteUserModalOpen={setIsDeleteUserModalOpen}
        deletingUser={deletingUser}
        handleDeleteUser={handleDeleteUser}
        isDeletingUser={isDeletingUser}
      />

		{/* SMS Pattern Check Modal */}
		<SmsPatternTestModal
			isOpen={smsCheckOpen}
			onClose={() => setSmsCheckOpen(false)}
			title={smsCheckTitle}
			bodyId={smsCheckBodyId}
			tokenLabels={smsCheckTokenLabels}
		/>

		{/* SMS Pattern Preview Modal */}
		<SmsPatternPreviewModal
			isOpen={smsPrevOpen}
			onClose={() => setSmsPrevOpen(false)}
			title={smsPrevTitle}
			tokenLabels={smsPrevTokenLabels}
			previewTemplate={smsPrevTemplate}
		/>

		{/* SMS Bulk Check Modal */}
		<SmsBulkTestModal
			isOpen={smsBulkOpen}
			onClose={() => setSmsBulkOpen(false)}
			patterns={meliPatternDefs}
			defaultSelectedKeys={smsBulkDefaults}
			getBodyId={(key) => getSmsInfoString(key)}
		/>

		{/* Telegram Template Check / Preview Modal */}
		<TelegramTemplateTestModal
			isOpen={tgCheckOpen}
			onClose={() => setTgCheckOpen(false)}
			title={tgCheckTitle}
			template={tgCheckTemplate}
			format={tgCheckFormat}
			allowedVars={tgCheckAllowedVars}
			audience={tgCheckAudience}
		/>
    </div>
  </PageShell>
  );
};

export default Settings;