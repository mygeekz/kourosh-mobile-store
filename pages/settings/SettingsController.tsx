import { useConfirm } from '../../contexts/ConfirmContext';
// pages/Settings.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BusinessInformationSettings,
  Role,
  UserForDisplay,
  NewUserFormData,
  PhoneEntry,
} from '../../types';
import Notification from '../../components/Notification';
import { useMountedRef } from '../../utils/asyncGuards';

import TelegramTemplateTestModal from '../../components/TelegramTemplateTestModal';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';
import { clearPersistedAuthSession } from '../../utils/authSession';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../../utils/feedback';
import { useStyle } from '../../contexts/StyleContext';
import { applyDocumentBranding, normalizeStoreName } from '../../utils/branding';
import { writeStoredCurrencyUnit } from '../../utils/currency';
import { loadAuthedAssetUrl, revokeObjectUrlSafe } from '../../utils/loadAuthedAssetUrl';
import { notifyBusinessBrandingUpdated } from '../../utils/businessBrandingEvents';
import PageShell from '../../components/ui/PageShell';
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
  type SmsBusinessInfo,
  type TelegramBusinessInfo,
  type TelegramControlCenterState,
  type TelegramDiagnosticsState,
  type TelegramAudience,
  type TelegramMessageFormat,
  type TelegramRecentChat,
  type TelegramTemplateVariable,
  type PricingDataRuntimeStatus,
} from './index';
import SettingsHeaderBar from './SettingsHeaderBar';
import SettingsRestoreModal from './SettingsRestoreModal';
import SettingsSaveFooter from './SettingsSaveFooter';
import { DEFAULT_BACKUP_SCHEDULE, parseBackupScheduleFromSettings, formatNextBackupRunLabel, sanitizeTime, normalizeWeekdays } from '../../utils/backupSchedule';
import { exportToExcel, exportToPdfTable } from '../../utils/exporters';
import { ALL_FEATURE_FLAGS, COMMERCIAL_PLANS, type CommercialPlanKey } from '../../utils/featureFlags';
import { getSettingsFeatureRuntimeBadges, isSettingsTabEnabledByFeaturePolicy } from '../../utils/settingsFeaturePolicy';

import {
  DEFAULT_PRICING_INTELLIGENCE_SETTINGS,
  PRICING_BEHAVIOR_STORAGE_KEY,
  buildPricingLearningFromPhones,
  clampPricingSettings,
  extractPricingLearningItems,
  loadPricingLearningItems,
  mergePricingLearningItems,
  pricingStrategyLabels,
  savePricingIntelligenceSettings,
  type PricingIntelligenceSettings,
  type PricingLearningApiResult,
} from './pricingRuntime';
import { normalizeTelegramMessageFormat, normalizeTelegramRecentChat } from './telegramRuntime';
import {
  fetchUsersAndRolesSnapshot,
  getErrorMessage,
  isRecord,
  readApiJsonObject,
  toBusinessInfoDynamic,
  type AvatarUploadApiResult,
  type BackupCheckRestoreApiResult,
  type BackupListApiResult,
  type BackupRestoreApiResult,
    type BusinessInfoDynamic,
  type ChangePasswordApiResult,
  type LogoUploadApiResult,
  type ProfileUpdateApiResult,
  type RolesApiResult,
  type SettingsApiResult,
  type SettingsRestoreApiResult,
  type RestoreHistoryApiResult,
  type RestoreProgressApiResult,
  type UsersApiResult,
} from './settingsRuntime';
import {
  DATABASE_RESTORE_STAGE_META,
  DATABASE_RESTORE_TOTAL_STEPS,
  type DatabaseRestoreProgressSnapshot,
  type DatabaseRestoreStage,
} from '../../shared/databaseRestoreProgress';

import {
  buildLocalDomain,
  buildPartnerShareStatus,
  canManageStoreOwnershipByRole,
  formatPricingDatePreview,
  getRoleLabelFa,
  normalizeLocalHostname,
  normalizeLocalSuffix,
  normalizePricingDateInput,
  type PartnerShareProfileLike,
  type TabKey,
} from './settingsHelpers';
import { commercialPlanUiCopy } from './settingsControllerSupport';
import SettingsRender from './SettingsRender';
import { useSettingsMessagingState } from './useSettingsMessagingState';
import { useSettingsAccountBackupUserState } from './useSettingsAccountBackupUserState';
import { useSettingsUiActionHandlers } from './useSettingsUiActionHandlers';
import { useSettingsPricingState } from './useSettingsPricingState';
import { useSettingsMediaUploadState } from './useSettingsMediaUploadState';
import { buildModuleRuntimeSummary, buildTelegramSetupViewModel } from './settingsViewModels';
import {
  buildSettingsAccountPanelViewModel,
  buildSettingsBackupPanelViewModel,
  buildSettingsPartnerShareNavigationViewModel,
  buildSettingsUsersPanelViewModel,
} from './settingsDerivedPanels';
import { buildSettingsBusinessPanelViewModel } from './settingsLocalBusinessViewModels';
import {
  buildPricingDecisionLogViewModel,
  buildPricingLearningStatsViewModel,
  buildPricingStrategyAdvisorViewModel,
} from './settingsPricingAdvisorViewModels';
import {
  buildTelegramAudiencePresetValue,
  buildTelegramStudioViewModel,
  getTelegramAudienceFormatKey,
  getTelegramAudienceKey,
  tgAudienceMeta,
  tgCategoryMeta,
} from './settingsTelegramViewModels';
import { buildSettingsSmsViewModel } from './settingsSmsViewModels';
import { useSettingsSmsOperationActions } from './useSettingsSmsOperationActions';
import { useSettingsTelegramOperationActions } from './useSettingsTelegramOperationActions';
import { isSettingsTabKey } from '../../config/ui/settings-navigation';
import { buildSettingsTelegramConnectionViewModel } from './settingsTelegramConnectionViewModels';
import { buildSettingsTelegramDiagnosticsViewModel } from './settingsTelegramDiagnosticsViewModels';
import { buildSettingsTelegramRecentChatsViewModel } from './settingsTelegramRecentChatsViewModels';
import { buildSettingsSmsModalViewModel } from './settingsSmsModalViewModels';
import {
  buildPricingDecisionExportFilename,
  buildPricingDecisionExportRows,
  buildPricingDecisionPdfBody,
  pricingDecisionExportColumns,
} from './settingsImportExportUtils';

type TelegramQuickFixEventDetail = {
  templateKey?: unknown;
  targetId?: unknown;
};

const RESTORE_PROGRESS_POLL_INTERVAL_MS = 240;

const createRestoreOperationId = () => {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `restore-${Date.now()}-${randomPart}`;
};

const buildLocalRestoreProgress = (
  operationId: string,
  stage: DatabaseRestoreStage,
  previous?: DatabaseRestoreProgressSnapshot | null,
  detail?: string,
): DatabaseRestoreProgressSnapshot => {
  const meta = DATABASE_RESTORE_STAGE_META[stage];
  const now = new Date().toISOString();
  const entry = {
    stage,
    step: meta.step,
    label: meta.label,
    detail: detail || meta.detail,
    at: now,
  };
  const history = previous?.operationId === operationId ? [...previous.history] : [];
  if (history.at(-1)?.stage === stage) history[history.length - 1] = entry;
  else history.push(entry);
  return {
    operationId,
    status: meta.status,
    stage,
    step: meta.step,
    total: DATABASE_RESTORE_TOTAL_STEPS,
    label: meta.label,
    detail: detail || meta.detail,
    startedAt: previous?.operationId === operationId ? previous.startedAt : now,
    updatedAt: now,
    history,
  };
};

const waitForRestoreProgressPoll = (signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) {
    resolve();
    return;
  }
  const onAbort = () => {
    window.clearTimeout(timer);
    resolve();
  };
  const timer = window.setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, RESTORE_PROGRESS_POLL_INTERVAL_MS);
  signal.addEventListener('abort', onAbort, { once: true });
});

export const useSettingsControllerContext = () => {
  const confirmAction = useConfirm();
  const { currentUser, token, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const { settingsTab } = useParams<{ settingsTab?: string }>();
  const mountedRef = useMountedRef();
  const { style, setMany, syncBrandFromStoreName } = useStyle();

  // ---- Tabs
  const [tab, setTabState] = useState<TabKey>(() => isSettingsTabKey(settingsTab) ? settingsTab : 'business');
  const setTab = useCallback((nextTab: TabKey) => {
    setTabState(nextTab);
    navigate(`/settings/${nextTab}`);
  }, [navigate]);

  useEffect(() => {
    if (isSettingsTabKey(settingsTab)) {
      setTabState(settingsTab);
      return;
    }
    navigate('/settings/business', { replace: true });
  }, [navigate, settingsTab]);
  const {
    pricingSettings,
    setPricingSettings,
    pricingLearningItems,
    setPricingLearningItems,
    pricingDecisionSearch,
    setPricingDecisionSearch,
    pricingDecisionActionFilter,
    setPricingDecisionActionFilter,
    pricingDecisionDeltaFilter,
    setPricingDecisionDeltaFilter,
    pricingDecisionDateFrom,
    setPricingDecisionDateFrom,
    pricingDecisionDateTo,
    setPricingDecisionDateTo,
  } = useSettingsPricingState();
  const pricingInitialLoadRef = React.useRef(false);
  const [pricingDataStatus, setPricingDataStatus] = useState<PricingDataRuntimeStatus>({
    state: 'loading',
    source: 'local-cache',
    sourceLabel: 'در حال بررسی منبع داده',
    message: 'در حال دریافت سوابق واقعی قیمت‌گذاری از سرور است.',
    serverCount: 0,
    localCount: 0,
    updatedAt: null,
  });

  // ---- Business & SMS (Server settings)
  const [businessInfo, setBusinessInfo] = useState<BusinessInformationSettings>({});
  const [initialBusinessInfo, setInitialBusinessInfo] = useState<BusinessInformationSettings>({});
  const telegramInfo = businessInfo as TelegramBusinessInfo;
  const initialTelegramInfo = initialBusinessInfo as TelegramBusinessInfo;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
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
  const moduleRuntimeSummary = useMemo(
    () => buildModuleRuntimeSummary(isFeatureSettingEnabled, isSettingsTabRuntimeEnabled),
    [businessInfo, featureDefinitionMap]
  );
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

  const { smsCheckOpen, setSmsCheckOpen, smsCheckTitle, setSmsCheckTitle, smsCheckBodyId, setSmsCheckBodyId, smsCheckTokenLabels, setSmsCheckTokenLabels, smsPrevOpen, setSmsPrevOpen, tgCheckOpen, setTgCheckOpen, tgCheckTitle, setTgCheckTitle, tgCheckTemplate, setTgCheckTemplate, tgCheckFormat, setTgCheckFormat, tgCheckAllowedVars, setTgCheckAllowedVars, smsPrevTitle, setSmsPrevTitle, smsPrevTemplate, setSmsPrevTemplate, smsPrevTokenLabels, setSmsPrevTokenLabels, smsBulkOpen, setSmsBulkOpen, smsBulkDefaults, setSmsBulkDefaults, tgHealth, setTgHealth, tgIsChecking, setTgIsChecking, tgDiagnostics, setTgDiagnostics, tgDiagnosticsLoading, setTgDiagnosticsLoading, tgDiagnosticsBusyAction, setTgDiagnosticsBusyAction, showTelegramToken, setShowTelegramToken, tgQuickMsg, setTgQuickMsg, tgIsSendingQuick, setTgIsSendingQuick, tgChatLookupLoading, setTgChatLookupLoading, tgRecentChats, setTgRecentChats, tgChatLookupHint, setTgChatLookupHint, tgCC, setTgCC, openTelegramCategories, setOpenTelegramCategories, openTelegramItems, setOpenTelegramItems, openTelegramAudiencePanels, setOpenTelegramAudiencePanels, telegramTemplateSearch, setTelegramTemplateSearch, telegramTemplateFilter, setTelegramTemplateFilter, telegramStudioMode, setTelegramStudioMode, telegramTodoDoneMap, setTelegramTodoDoneMap, telegramTodoLaterMap, setTelegramTodoLaterMap, telegramPinnedQuickActions, setTelegramPinnedQuickActions, telegramQuickActionUsageMap, setTelegramQuickActionUsageMap, settingsViewMode, setSettingsViewMode, tgCleanupDays, setTgCCLoading, setTgCCError, setTgBulkBusy } = useSettingsMessagingState();

  // Cleanup-20 compatibility anchors for older Cleanup-14 text guard:
  // const openSmsPatternCheck = useSettingsSmsOperationActions;
  // const openSmsPatternPreview = useSettingsSmsOperationActions;
  const {
    openSmsPatternCheck,
    openSmsPatternPreview,
    openSmsBulkPanel,
    openSmsBulkCheck,
  } = useSettingsSmsOperationActions({
    setSmsCheckTitle,
    setSmsCheckBodyId,
    setSmsCheckTokenLabels,
    setSmsCheckOpen,
    setSmsPrevTitle,
    setSmsPrevTemplate,
    setSmsPrevTokenLabels,
    setSmsPrevOpen,
    setSmsBulkDefaults,
    setSmsBulkOpen,
  });


  // ---- Logo / Profile media upload state
  const {
    logoFile,
    setLogoFile,
    logoPreview,
    setLogoPreview,
    isUploadingLogo,
    setIsUploadingLogo,
    logoInputRef,
    meAvatarFile,
    setMeAvatarFile,
    meAvatarPreview,
    setMeAvatarPreview,
    meAvatarInputRef,
    isUploadingAvatar,
    setIsUploadingAvatar,
  } = useSettingsMediaUploadState();

  // ---- Account (Profile / Security)
  const [oldPassword, setOldPassword] = useState('');
  const [profileFirstName, setProfileFirstName] = useState(() => String(currentUser?.firstName || ''));
  const [profileLastName, setProfileLastName] = useState(() => String(currentUser?.lastName || ''));
  const [initialProfileName, setInitialProfileName] = useState(() => ({
    firstName: String(currentUser?.firstName || ''),
    lastName: String(currentUser?.lastName || ''),
  }));
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('settings.view.mode', settingsViewMode);
    } catch {}
  }, [settingsViewMode]);
  const refreshPricingLearningData = useCallback(async () => {
    const localItems = loadPricingLearningItems();
    if (mountedRef.current) {
      setPricingDataStatus((current) => ({
        ...current,
        state: 'loading',
        localCount: localItems.length,
        message: 'در حال همگام‌سازی با لاگ واقعی فروش و تصمیم‌های ثبت‌شده است.',
      }));
    }

    try {
      const pricingResponse = await apiFetch('/api/ai/pricing/decision-log', { cache: 'no-store' });
      const pricingResult = await parseApiResult<PricingLearningApiResult>(pricingResponse, { endpoint: '/api/ai/pricing/decision-log', action: 'خواندن لاگ واقعی تصمیمات قیمت‌گذاری' });
      const serverItems = extractPricingLearningItems(pricingResult);
      const merged = mergePricingLearningItems([...serverItems, ...localItems]);
      const payload = pricingResult?.data && !Array.isArray(pricingResult.data) ? pricingResult.data : null;
      if (!mountedRef.current) return;
      setPricingLearningItems(merged);
      setPricingDataStatus({
        state: 'ready',
        source: 'server-decision-log',
        sourceLabel: 'سوابق واقعی فروشگاه',
        message: 'داده‌ها از فروش‌های قطعی گوشی و تصمیم‌های قیمت‌گذاری ثبت‌شده روی همین دستگاه ترکیب شده‌اند.',
        serverCount: serverItems.length,
        localCount: localItems.length,
        updatedAt: String(payload?.generatedAt || new Date().toISOString()),
      });
      return;
    } catch (serverError) {
      try {
        const response = await apiFetch('/api/phones', { cache: 'no-store' });
        const result = await parseApiResult<{ data?: PhoneEntry[] }>(response, { endpoint: '/api/phones', action: 'خواندن سابقه واقعی گوشی برای قیمت‌گذاری' });
        const phones = Array.isArray(result?.data) ? result.data : [];
        const historicalItems = buildPricingLearningFromPhones(phones, pricingSettings);
        const merged = mergePricingLearningItems([...historicalItems, ...localItems]);
        if (!mountedRef.current) return;
        setPricingLearningItems(merged);
        setPricingDataStatus({
          state: 'degraded',
          source: 'phone-history-fallback',
          sourceLabel: 'بازسازی از موجودی واقعی',
          message: 'لاگ اختصاصی در دسترس نبود؛ تحلیل از قیمت خرید و فروش واقعی گوشی‌های ثبت‌شده بازسازی شده است.',
          serverCount: historicalItems.length,
          localCount: localItems.length,
          updatedAt: new Date().toISOString(),
        });
        return;
      } catch (phoneHistoryError) {
        if (!mountedRef.current) return;
        setPricingLearningItems(localItems);
        setPricingDataStatus({
          state: localItems.length ? 'degraded' : 'error',
          source: 'local-cache',
          sourceLabel: 'حافظه محلی این دستگاه',
          message: localItems.length
            ? 'ارتباط با سرور برقرار نشد و فقط تصمیم‌های واقعی ذخیره‌شده روی همین دستگاه نمایش داده می‌شوند.'
            : 'هیچ داده قابل اتکایی دریافت نشد. اتصال سرور و دسترسی کاربر را بررسی کنید.',
          serverCount: 0,
          localCount: localItems.length,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [mountedRef, pricingSettings.roundStep, pricingSettings.targetMarkupPercent, setPricingLearningItems]);

  useEffect(() => {
    if (pricingInitialLoadRef.current) return;
    pricingInitialLoadRef.current = true;
    void refreshPricingLearningData();
  }, [refreshPricingLearningData]);



  const { newPassword, setNewPassword, newPassword2, setNewPassword2, showAccountPasswordFields, setShowAccountPasswordFields, isChangingPassword, setIsChangingPassword, notification, setNotification, dbFile, setDbFile, isRestoringDb, setIsRestoringDb, isRestoreModalOpen, setIsRestoreModalOpen, backupList, setBackupList, isLoadingBackups, setIsLoadingBackups, backupEnabled, setBackupEnabled, backupScheduleMode, setBackupScheduleMode, backupScheduleTime, setBackupScheduleTime, backupScheduleWeekdays, setBackupScheduleWeekdays, backupScheduleIntervalHours, setBackupScheduleIntervalHours, backupTimezone, setBackupTimezone, backupRetention, setBackupRetention, initialBackupSettings, setInitialBackupSettings, isSavingBackupSchedule, setIsSavingBackupSchedule, backupOperationKey, setBackupOperationKey, restoreProgress, setRestoreProgress, restoreHistory, setRestoreHistory, isGeneratingLocalCert, setIsGeneratingLocalCert, localCertMessage, setLocalCertMessage, localCertError, setLocalCertError, users, setUsers, roles, setRoles, isAddUserModalOpen, setIsAddUserModalOpen, newUser, setNewUser, isSavingUser, setIsSavingUser, addUserFormErrors, setAddUserFormErrors, isEditUserModalOpen, setIsEditUserModalOpen, editingUser, setEditingUser, isUpdatingUser, setIsUpdatingUser, isResetPasswordModalOpen, setIsResetPasswordModalOpen, resettingUser, setResettingUser, resetPasswordData, setResetPasswordData, resetPasswordErrors, setResetPasswordErrors, isSubmittingReset, setIsSubmittingReset, isDeleteUserModalOpen, setIsDeleteUserModalOpen, deletingUser, setDeletingUser, isDeletingUser, setIsDeletingUser, userSearchQuery, setUserSearchQuery, userRoleFilter, setUserRoleFilter, partnerShareStatus, setPartnerShareStatus, setEditUserFormErrors, dbFileInputRef, initialNewUserState } = useSettingsAccountBackupUserState();

  const startRestoreProgressPolling = (operationId: string) => {
    const abortController = new AbortController();
    const done = (async () => {
      while (!abortController.signal.aborted && mountedRef.current) {
        try {
          const response = await apiFetch(`/api/backup/restore-status/${encodeURIComponent(operationId)}`, {
            signal: abortController.signal,
            cache: 'no-store',
            suppressAuthInvalidation: true,
          });
          if (response.status === 401) return;
          if (response.ok) {
            const payload = await response.json() as RestoreProgressApiResult;
            const snapshot = payload.data;
            if (payload.success && snapshot?.operationId === operationId && mountedRef.current) {
              setRestoreProgress(snapshot);
              if (snapshot.status === 'completed' || snapshot.status === 'failed') return;
            }
          }
        } catch (error) {
          if (abortController.signal.aborted) return;
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
        await waitForRestoreProgressPoll(abortController.signal);
      }
    })();

    return {
      stop: () => abortController.abort(),
      done,
    };
  };





  const { filteredUsers, userRoleSummaries, userStatsCards } = useMemo(
    () => buildSettingsUsersPanelViewModel({ users, roles, userSearchQuery, userRoleFilter }),
    [users, roles, userSearchQuery, userRoleFilter]
  );


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

  useEffect(() => {
    const firstName = String(currentUser?.firstName || '');
    const lastName = String(currentUser?.lastName || '');
    setProfileFirstName(firstName);
    setProfileLastName(lastName);
    setInitialProfileName({ firstName, lastName });
  }, [currentUser?.id, currentUser?.firstName, currentUser?.lastName]);

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


  const refreshUsersData = async (showSuccess = true) => {
    if (!currentUser || currentUser.roleName !== 'Admin' || isRefreshingUsers) return;
    setIsRefreshingUsers(true);
    try {
      const snapshot = await fetchUsersAndRolesSnapshot(apiFetch);
      setRoles(snapshot.roles);
      setUsers(snapshot.users);
      if (snapshot.roles.length && !newUser.roleId) setNewUser((previous) => ({ ...previous, roleId: snapshot.roles[0].id }));
      if (showSuccess) setNotification({ type: 'success', text: 'فهرست کاربران و نقش‌ها با داده‌های سرور تازه‌سازی شد.' });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/users', action: 'تازه‌سازی کاربران و نقش‌ها' }) });
    } finally {
      setIsRefreshingUsers(false);
    }
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
    const normalizedValue = name === 'installment_contract_seller_national_code'
      ? value
        .replace(/[۰-۹]/g, (digit) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)] || digit)
        .replace(/[٠-٩]/g, (digit) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)] || digit)
        .replace(/\D/g, '')
      : value;
    setBusinessInfo(prev => ({ ...prev, [name]: normalizedValue }));
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



  const checkTelegramHealth = async () => {
    setTgIsChecking(true);
    setTgHealth(null);
    try {
      const res = await apiFetch('/api/telegram/health');
      const js = await readApiJsonObject(res);
      if (!res.ok || js.success === false) throw new Error(String(js.message || 'خطا در بررسی و ادامه اتصال تلگرام'));
      const data = isRecord(js.data) ? js.data : {};
      setTgHealth({ ok: true, msg: String(js.message || 'اتصال برقرار است.'), bot: isRecord(data.bot) ? data.bot : null });
      await fetchTelegramControlCenter();
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
      try { window.dispatchEvent(new CustomEvent('kourosh:telegram-log-updated')); } catch {}
      await fetchTelegramControlCenter();
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
        const payload = {
          telegram_bot_token: tokenValue,
          telegram_bot_username: usernameValue,
        } as BusinessInformationSettings;
        await runWithFeedback(
          apiFetch('/api/settings/telegram', {
            method: 'POST',
            body: JSON.stringify(payload),
          }).then((response) => parseApiResult(response, { endpoint: '/api/settings/telegram', action: 'ذخیره تنظیمات پایه تلگرام' })),
          {
            kind: 'save',
            loading: 'در حال ذخیره توکن و نام ربات…',
            success: 'توکن و نام ربات ذخیره شد. حالا Chat ID از آخرین گفت‌وگوهای ربات خوانده می‌شود.',
            endpoint: '/api/settings/telegram',
          }
        );
        setBusinessInfo((prev) => ({ ...prev, ...payload }));
        setInitialBusinessInfo((prev) => ({ ...prev, ...payload }));
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
  const handleTelegramSettingsSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    try {
      const errs: string[] = [];
      const botToken = String(telegramInfo.telegram_bot_token || '').trim();
      const botUsername = String(telegramInfo.telegram_bot_username || '').trim().replace(/^@+/, '');
      const chatId = String(telegramInfo.telegram_chat_id || '').trim();
      const proxy = String(telegramInfo.telegram_proxy || '').trim();
      const quietStartRaw = String(telegramInfo.telegram_quiet_start_hour ?? '').trim();
      const quietEndRaw = String(telegramInfo.telegram_quiet_end_hour ?? '').trim();
      const dailyLimitRaw = String(telegramInfo.telegram_max_per_day_per_customer ?? '1').trim();
      const transportRaw = String(telegramInfo.telegram_transport_mode || 'direct').trim();
      const transportMode = transportRaw === 'cloud_relay' ? 'relay' : ['disabled', 'direct', 'proxy', 'relay'].includes(transportRaw) ? transportRaw : 'direct';
      const legacyMiniAppMode = String(telegramInfo.telegram_public_access_mode || '').trim();
      const canonicalMiniAppMode = String(telegramInfo.miniapp_public_access_mode || '').trim();
      const miniAppMode = ['disabled', 'self_hosted', 'external_tunnel', 'stable_tunnel', 'relay'].includes(canonicalMiniAppMode)
        ? canonicalMiniAppMode
        : legacyMiniAppMode === 'cloud_managed' ? 'relay' : legacyMiniAppMode === 'self_hosted' ? 'self_hosted' : legacyMiniAppMode === 'disabled' ? 'disabled' : String(telegramInfo.telegram_miniapp_public_url || '').trim() ? 'self_hosted' : 'disabled';
      const relayProvider = String(telegramInfo.relay_provider || 'managed_kourosh').trim() === 'custom' ? 'custom' : 'managed_kourosh';

      const chatLists = {
        گزارشات: String(telegramInfo.telegram_chat_ids_reports || '').trim(),
        اقساط: String(telegramInfo.telegram_chat_ids_installments || '').trim(),
        فروش: String(telegramInfo.telegram_chat_ids_sales || '').trim(),
        اعلان‌ها: String(telegramInfo.telegram_chat_ids_notifications || '').trim(),
      };
      const hasAnyTopicChat = Object.values(chatLists).some(Boolean);

      if (transportMode !== 'disabled') {
        if (!botToken) errs.push('توکن ربات تلگرام را وارد کنید.');
        else if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken)) errs.push('فرمت توکن ربات تلگرام نامعتبر است.');
        if (botUsername && !/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(botUsername)) {
          errs.push('نام کاربری ربات تلگرام نامعتبر است. مقدار را بدون @ و فقط با حروف انگلیسی، عدد و _ وارد کنید.');
        }
        if (!chatId && !hasAnyTopicChat) errs.push('حداقل یک Chat ID مقصد عمومی یا تفکیکی وارد کنید.');
      }

      const isValidChatId = (value: string) => /^-?\d+$/.test(value.trim()) || /^@[A-Za-z0-9_]{5,}$/.test(value.trim());
      if (chatId && !isValidChatId(chatId)) errs.push('شناسه چت اصلی باید عددی یا نام کاربری کانال/گروه باشد.');
      const splitChatIds = (value: string) => value.split(/[\n,؛;\s]+/g).map((item) => item.trim()).filter(Boolean);
      for (const [label, value] of Object.entries(chatLists)) {
        const invalid = splitChatIds(value).filter((item) => !isValidChatId(item));
        if (invalid.length) errs.push(`Chat ID نامعتبر در بخش «${label}»: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''}`);
      }

      if (transportMode === 'proxy' && !proxy) errs.push('برای حالت پراکسی، آدرس پراکسی تلگرام را وارد کنید.');
      if (proxy && !/^(socks5|socks|http|https):\/\//i.test(proxy)) {
        errs.push('فرمت پراکسی نامعتبر است. نمونه معتبر: socks5://127.0.0.1:10808');
      }
      if ((miniAppMode === 'self_hosted' || miniAppMode === 'external_tunnel' || miniAppMode === 'stable_tunnel') && !String(telegramInfo.telegram_miniapp_public_url || '').trim()) {
        errs.push(miniAppMode === 'stable_tunnel' ? 'Public HTTPS URL ثابت Mini App را وارد کنید.' : miniAppMode === 'external_tunnel' ? 'Public HTTPS URL تانل را وارد کنید.' : 'Public HTTPS URL میزبانی شخصی Mini App را وارد کنید.');
      }
      if (miniAppMode === 'stable_tunnel') {
        const stablePublicUrl = String(telegramInfo.telegram_miniapp_public_url || '').trim();
        if (stablePublicUrl) {
          try {
            const parsedStableUrl = new URL(stablePublicUrl);
            const host = parsedStableUrl.hostname.toLowerCase();
            if (parsedStableUrl.protocol !== 'https:' || parsedStableUrl.username || parsedStableUrl.password || parsedStableUrl.hash || parsedStableUrl.search || !['/', '/miniapp.html'].includes(parsedStableUrl.pathname)) {
              errs.push('نشانی ثابت Mini App باید HTTPS و بدون Query/Hash و روی مسیر /miniapp.html باشد.');
            } else if (host === 'trycloudflare.com' || host.endsWith('.trycloudflare.com')) {
              errs.push('آدرس موقت trycloudflare برای حالت Production مجاز نیست.');
            }
          } catch {
            errs.push('نشانی ثابت Mini App معتبر نیست.');
          }
        }
        if (!String(telegramInfo.miniapp_live_origin_url || '').trim()) {
          errs.push('نشانی HTTPS مبدأ زنده فروشگاه را وارد کنید.');
        }
      }
      if ((transportMode === 'relay' || miniAppMode === 'relay') && relayProvider === 'custom') {
        if (!String(telegramInfo.custom_relay_control_url || '').trim()) errs.push('Control URL رله شخصی را وارد کنید.');
        if (!String(telegramInfo.custom_relay_connector_url || '').trim()) errs.push('Connector WSS URL رله شخصی را وارد کنید.');
      }

      const parseHour = (value: string, label: string) => {
        if (!value) return null;
        const number = Number(value);
        if (!Number.isInteger(number) || number < 0 || number > 23) {
          errs.push(`${label} باید عددی بین ۰ تا ۲۳ باشد.`);
          return null;
        }
        return number;
      };
      const quietStart = parseHour(quietStartRaw, 'ساعت شروع سکوت');
      const quietEnd = parseHour(quietEndRaw, 'ساعت پایان سکوت');
      if ((quietStart === null) !== (quietEnd === null)) errs.push('برای بازه سکوت، ساعت شروع و پایان را با هم وارد کنید.');

      const dailyLimit = Number(dailyLimitRaw);
      if (!Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 50) {
        errs.push('حداکثر پیام روزانه هر مشتری باید عددی بین ۰ تا ۵۰ باشد.');
      }

      if (errs.length) {
        setNotification({ type: 'error', text: errs[0] });
        return;
      }

      const normalizedUsername = botUsername;
      const legacySilentHours = quietStart !== null && quietEnd !== null
        ? `${String(quietStart).padStart(2, '0')}:00-${String(quietEnd).padStart(2, '0')}:00`
        : '';
      const telegramPayload = Object.fromEntries(
        Object.entries(telegramInfo).filter(([key]) => key.startsWith('telegram_')),
      );
      const payload = {
        ...telegramPayload,
        telegram_bot_token: botToken,
        telegram_bot_username: normalizedUsername,
        telegram_chat_id: chatId,
        telegram_proxy: proxy,
        telegram_transport_mode: transportMode,
        miniapp_public_access_mode: miniAppMode,
        miniapp_live_origin_url: String(telegramInfo.miniapp_live_origin_url || '').trim(),
        miniapp_stable_tunnel_provider: String(telegramInfo.miniapp_stable_tunnel_provider || 'cloudflare_named').trim(),
        relay_provider: relayProvider,
        custom_relay_control_url: String(telegramInfo.custom_relay_control_url || '').trim(),
        custom_relay_connector_url: String(telegramInfo.custom_relay_connector_url || '').trim(),
        telegram_miniapp_public_url: String(telegramInfo.telegram_miniapp_public_url || '').trim(),
        telegram_quiet_start_hour: quietStart ?? '',
        telegram_quiet_end_hour: quietEnd ?? '',
        telegram_silent_hours: legacySilentHours,
        telegram_max_per_day_per_customer: Number.isFinite(dailyLimit) ? dailyLimit : 1,
      };
      setIsSaving(true);
      const response = await apiFetch('/api/settings/telegram', { method: 'POST', body: JSON.stringify(payload) });
      await parseApiResult(response, { endpoint: '/api/settings/telegram', action: 'ذخیره تنظیمات تلگرام' });
      if (!mountedRef.current) return;
      setBusinessInfo((prev) => ({ ...prev, ...payload }));
      setInitialBusinessInfo((prev) => ({ ...prev, ...payload }));
      setNotification({ type: 'success', text: 'تنظیمات تلگرام با موفقیت ذخیره شد.', closeMs: 3600 });
      await fetchTelegramControlCenter();
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error) || 'خطا در ذخیره تنظیمات تلگرام' });
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };



  const buildTelegramAudiencePreset = (key: string, audience: TelegramAudience) => buildTelegramAudiencePresetValue(telegramInfo, key, audience);

  const {
    telegramTemplateDefs,
    telegramGroupedDefs,
    telegramEffectiveFilter,
    filteredTelegramGroupedDefs,
    visibleTelegramItemsCount,
    telegramTodoItems,
    telegramTodoSummary,
    telegramTodoTopItems,
    getTelegramAudienceStatus,
    getTelegramItemStatus,
    getTelegramCategoryStatus,
    getTelegramPriorityMeta,
    getTelegramProgressTone,
    telegramسراسریSummary,
    telegramسراسریCompletionPercent,
    telegramReadinessScore,
    telegramCoachMessage,
  } = buildTelegramStudioViewModel({
    telegramInfo,
    telegramTemplateSearch,
    telegramTemplateFilter,
    telegramStudioMode,
    telegramTodoDoneMap,
    telegramTodoLaterMap,
    buildTelegramAudiencePreset,
  });

  const telegramOperationActions = useSettingsTelegramOperationActions({
    buildTelegramAudiencePreset,
    setBusinessInfo,
    telegramGroupedDefs,
    telegramTemplateDefs,
    telegramTodoItems,
    openTelegramCategories,
    setOpenTelegramCategories,
    openTelegramItems,
    setOpenTelegramItems,
    openTelegramAudiencePanels,
    setOpenTelegramAudiencePanels,
    telegramTemplateSearch,
    setTelegramTemplateSearch,
    telegramTemplateFilter,
    setTelegramTemplateFilter,
    telegramStudioMode,
    setTelegramStudioMode,
    telegramTodoDoneMap,
    setTelegramTodoDoneMap,
    telegramTodoLaterMap,
    setTelegramTodoLaterMap,
    telegramPinnedQuickActions,
    setTelegramPinnedQuickActions,
    telegramQuickActionUsageMap,
    setTelegramQuickActionUsageMap,
    settingsViewMode,
  });

  const applyTelegramPreset = telegramOperationActions.applyTelegramPreset;
  const bumpTelegramQuickActionUsage = telegramOperationActions.bumpTelegramQuickActionUsage;
  const clearTelegramStudioFilters = telegramOperationActions.clearTelegramStudioFilters;
  const deferTelegramTodo = telegramOperationActions.deferTelegramTodo;
  const focusTelegramAudience = telegramOperationActions.focusTelegramAudience;
  const getTelegramAiAssistantCopy = telegramOperationActions.getTelegramAiAssistantCopy;
  const getTelegramTodoNextStep = telegramOperationActions.getTelegramTodoNextStep;
  const jumpToFirstIncompleteTelegramTemplate = telegramOperationActions.jumpToFirstIncompleteTelegramTemplate;
  const jumpToTelegramTemplate = telegramOperationActions.jumpToTelegramTemplate;
  const markTelegramTodoDone = telegramOperationActions.markTelegramTodoDone;
  const openUrgentTelegramTodos = telegramOperationActions.openUrgentTelegramTodos;
  const reactivateTelegramTodo = telegramOperationActions.reactivateTelegramTodo;
  const resetTelegramQuickActionPersonalization = telegramOperationActions.resetTelegramQuickActionPersonalization;
  const resetTelegramTodoAssistant = telegramOperationActions.resetTelegramTodoAssistant;
  const scrollToTelegramAnchor = telegramOperationActions.scrollToTelegramAnchor;
  const setAllTelegramCategories = telegramOperationActions.setAllTelegramCategories;
  const setAllTelegramItems = telegramOperationActions.setAllTelegramItems;
  const telegramSpotlightTarget = telegramOperationActions.telegramSpotlightTarget;
  const toggleTelegramAudiencePanel = telegramOperationActions.toggleTelegramAudiencePanel;
  const toggleTelegramCategory = telegramOperationActions.toggleTelegramCategory;
  const toggleTelegramItem = telegramOperationActions.toggleTelegramItem;
  const toggleTelegramQuickActionPin = telegramOperationActions.toggleTelegramQuickActionPin;
  // Cleanup-13 compatibility anchor: localStorage.setItem('settings.telegramStudio.ui' now lives in useSettingsTelegramOperationActions.

  const {
    telegramTopConnectionTone,
    telegramTopNextAction,
    getTelegramSmartCheckTone,
    telegramDestinationCount,
    telegramConfigChecks,
    telegramConfigReadyCount,
    telegramConfigReadiness,
    telegramConnectionMode,
    telegramHealthTone,
    telegramConfigCoachMessage,
    telegramSmartActions,
    telegramSetupItems,
    telegramSetupDone,
    telegramSetupPercent,
    telegramMissingItems,
    telegramHasProxy,
    telegramAudienceDestinationCount,
    telegramReadinessLabel,
    telegramSetupCoachMessage,
  } = useMemo(() => buildSettingsTelegramConnectionViewModel({
    businessInfo: businessInfo as TelegramBusinessInfo,
    telegramInfo,
    tgHealth,
    tgCC,
  }), [businessInfo, telegramInfo, tgHealth, tgCC]);

  // Cleanup-17 compatibility anchor: telegramConnectionChecks, telegramTopConnectionTone,
  // telegramTopNextAction and getTelegramSmartCheckTone are built in settingsTelegramConnectionViewModels.

  const telegramDiagnosticsViewModel = useMemo(() => buildSettingsTelegramDiagnosticsViewModel({
    tgDiagnostics,
    tgCC,
  }), [tgDiagnostics, tgCC]);

  // Cleanup-18 compatibility anchor: diagnostics cards, raw diagnostics JSON, control-center health
  // and Telegram diagnostic formatters live in settingsTelegramDiagnosticsViewModels.

  const telegramRecentChatsViewModel = useMemo(() => buildSettingsTelegramRecentChatsViewModel({
    telegramInfo,
    tgRecentChats,
    tgChatLookupHint,
  }), [telegramInfo, tgRecentChats, tgChatLookupHint]);

  // Cleanup-19 compatibility anchor: recent chat display rows, bot link and lookup hint
  // live in settingsTelegramRecentChatsViewModels; fetch/save behavior stays in SettingsController.

  const applyTelegramAiSuggestion = (itemKey: string, audience?: TelegramAudience) => {
    const target = telegramTodoItems.find((entry) => entry.item.key === itemKey);
    const targetAudience = audience || target?.firstMissing?.aud;
    if (!targetAudience) return;
    const preset = buildTelegramAudiencePreset(itemKey, targetAudience).trim();
    if (preset) applyTelegramPreset(itemKey, targetAudience);
    reactivateTelegramTodo(itemKey);
    jumpToTelegramTemplate(itemKey, targetAudience);
  };

const mergeGenericSettingsBaseline = (
  previous: BusinessInformationSettings,
  payload: BusinessInformationSettings,
): BusinessInformationSettings => {
  const next = { ...previous } as BusinessInfoDynamic;
  for (const [key, value] of Object.entries(payload)) {
    if (
      key === 'installation_id'
      || key.startsWith('local_')
      || key.startsWith('telegram_')
      || key.startsWith('kourosh_cloud_')
    ) continue;
    next[key] = value;
  }
  return next as BusinessInformationSettings;
};

const handleBusinessInfoSubmit = async (
    e?: FormEvent,
    overridePayload?: BusinessInformationSettings,
    feedback?: { action: string; loading: string; success: string },
  ): Promise<boolean> => {
    if (e) e.preventDefault();
    const payload = overridePayload || businessInfo;
    setIsSaving(true);
    setNotification(null);
    try {
      await runWithFeedback(
        apiFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify(payload),
        }).then((response) => parseApiResult(response, { endpoint: '/api/settings', action: feedback?.action || 'ذخیره تغییرات تنظیمات کسب‌وکار' })),
        {
          kind: 'save',
          loading: feedback?.loading || 'در حال ذخیره تغییرات تنظیمات کسب‌وکار…',
          success: feedback?.success || 'تنظیمات فروشگاه با موفقیت ذخیره شد.',
          endpoint: '/api/settings',
        }
      );
      if (!mountedRef.current) return false;
      setInitialBusinessInfo((prev) => mergeGenericSettingsBaseline(prev, payload));
      // Sync QR public base URL to localStorage
      try {
        const v = payload.qr_public_base_url;
        if (v) localStorage.setItem('qr_public_base_url', String(v));
        else localStorage.removeItem('qr_public_base_url');
      } catch {}
      writeStoredCurrencyUnit(payload.currency_unit);
      try { window.dispatchEvent(new CustomEvent('kourosh:feature-flags-updated')); } catch {}
      const normalizedStoreName = normalizeStoreName(payload.store_name || 'فروشگاه');
      applyDocumentBranding(normalizedStoreName);
      if (style.brandMode === 'auto') syncBrandFromStoreName(normalizedStoreName);
      notifyBusinessBrandingUpdated({
        storeName: normalizedStoreName,
        logoPath: payload.store_logo_path || null,
        revision: Date.now(),
      });
      setNotification({ type: 'success', text: feedback?.success || 'تنظیمات فروشگاه با موفقیت ذخیره شد.', closeMs: 3600 });
      return true;

    } catch (error: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings', action: feedback?.action || 'ذخیره تغییرات تنظیمات کسب‌وکار' }) });
      return false;
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const handleSaveLocalDomainSettings = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      const hostname = normalizeLocalHostname(businessInfo.local_hostname || '');
      const suffix = normalizeLocalSuffix(businessInfo.local_domain_suffix || 'home.arpa');
      if (!hostname) throw new Error('نام میزبان محلی معتبر نیست.');
      if (!suffix) throw new Error('Suffix محلی معتبر نیست و به localhost تبدیل نمی‌شود.');
      const domain = buildLocalDomain(hostname, suffix);
      const explicitBaseUrl = String(businessInfo.local_base_url || '').trim();
      const localBaseUrl = explicitBaseUrl || (domain ? `https://${domain}:5173/#/` : '');
      const payload = {
        local_hostname: hostname,
        local_domain_suffix: suffix,
        local_base_url: localBaseUrl,
        local_hosts_ip: String(businessInfo.local_hosts_ip || '').trim(),
        local_hosts_line: String(businessInfo.local_hosts_line || '').trim(),
      };

      await runWithFeedback(
        apiFetch('/api/settings/local-access', {
          method: 'POST',
          body: JSON.stringify(payload),
        }).then((response) => parseApiResult(response, { endpoint: '/api/settings/local-access', action: 'ذخیره تغییرات تنظیمات محلی' })),
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
      setNotification({ type: 'success', text: 'تنظیمات دسترسی محلی و PWA با موفقیت ذخیره شد.', closeMs: 3600 });
    } catch (error: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/local-access', action: 'ذخیره تغییرات تنظیمات محلی' }) });
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

const handleGenerateLocalCertificate = async () => {
    const hostname = normalizeLocalHostname(businessInfo.local_hostname || '');
    const suffix = normalizeLocalSuffix(businessInfo.local_domain_suffix || 'home.arpa');

    if (!hostname) {
      setLocalCertError('نام میزبان محلی را وارد کنید.');
      setLocalCertMessage(null);
      return;
    }
    if (!suffix) {
      setLocalCertError('Suffix محلی معتبر نیست. مقدار نامعتبر به localhost تبدیل نمی‌شود.');
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
      const httpsUrl = data?.data?.httpsUrl || `https://${generatedDomain}:5173/#/`;
      const hostsLine = data?.data?.hostsLine || (data?.data?.serverIp ? `${data.data.serverIp} ${generatedDomain}` : generatedDomain);
      const shortcutDomain = String(data?.data?.shortcutDomain || '');
      const serverIp = data?.data?.serverIp || '';
      const certificateIpAddresses = Array.isArray(data?.data?.certificateIpAddresses)
        ? data.data.certificateIpAddresses.filter(Boolean)
        : [];
      const caFingerprintSha256 = String(data?.data?.caFingerprintSha256 || '').replace(/[^a-f0-9]/gi, '').toLowerCase();
      const caCommonName = String(data?.data?.caCommonName || 'Kourosh Local Root CA v3');
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
      const trusted = data?.data?.trusted === true;
      const trustMessage = trusted
        ? 'گواهی در Trust Store کاربر ویندوز نیز ثبت شد.'
        : 'فایل‌های گواهی ساخته شدند، اما Trust خودکار کامل نشد؛ فایل Root CA را باید دستی در Trusted Root نصب کنید.';
      const rootRotationMessage = data?.data?.rootCaRotated === true
        ? 'پروفایل Root CA به نسخه جدید ارتقا یافت؛ فایل Root CA جدید را روی گوشی دوباره نصب کنید و نسخه قدیمی را حذف کنید.'
        : 'Root CA قبلی معتبر باقی ماند و فقط گواهی سرور تمدید شد.';
      setLocalCertMessage(`دامنه ${generatedDomain} و زنجیره امن Root CA + Server Certificate ساخته شدند. ${trustMessage} ${rootRotationMessage} نام گواهی موبایل: ${caCommonName}. اثرانگشت SHA-256: ${caFingerprintSha256 ? caFingerprintSha256.match(/.{1,4}/g)?.join(' ') : '—'}. فایل Root CA موبایل را دوباره دانلود و نصب کنید، سپس Chrome و پنجره start_https.bat را کامل ببندید و دوباره اجرا کنید.${shortcutDomain ? ` میان‌بُر قدیمی حفظ‌شده: ${shortcutDomain} → ${httpsUrl}.` : ''} IPهای معتبر گواهی: ${certificateIpAddresses.join(', ') || serverIp || '—'} — خط hosts: ${hostsLine}`);
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
    const hostname = normalizeLocalHostname(businessInfo.local_hostname || '');
    const suffix = normalizeLocalSuffix(businessInfo.local_domain_suffix || 'home.arpa');
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

  const handleDownloadLocalCertificate = async () => {
    const endpoint = '/api/settings/local-domain/certificate.cer';
    try {
      const response = await apiFetch(endpoint, { method: 'GET' });
      if (!response.ok) {
        await parseApiResult(response, { endpoint, action: 'دانلود گواهی ریشه Root CA' });
      }
      const fingerprint = String(response.headers.get('x-kourosh-ca-fingerprint-sha256') || '').replace(/[^a-f0-9]/gi, '').toLowerCase();
      const profileVersion = String(response.headers.get('x-kourosh-ca-profile') || '3');
      const blob = await response.blob();
      if (!blob.size) throw new Error('فایل Root CA خالی است. ابتدا certificate محلی را دوباره ایجاد کنید.');
      const disposition = String(response.headers.get('content-disposition') || '');
      const encodedFileName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainFileName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const fileName = encodedFileName
        ? decodeURIComponent(encodedFileName)
        : (plainFileName || `${localHostnameValue || 'kourosh'}-local-root-ca.crt`);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setLocalCertMessage(`فایل Root CA موبایل نسخه ${profileVersion} دانلود شد${fingerprint ? `؛ اثرانگشت SHA-256: ${fingerprint.match(/.{1,4}/g)?.join(' ')}` : ''}. گواهی قدیمی Kourosh Local Root CA را از گوشی حذف و این فایل را فقط از مسیر CA certificate نصب کنید؛ سپس Chrome را از Recent Apps کامل ببندید و دوباره باز کنید.`);
      setLocalCertError(null);
    } catch (error: unknown) {
      setLocalCertError(humanizeErrorMessage(getErrorMessage(error), { endpoint, action: 'دانلود گواهی ریشه Root CA' }));
    }
  };


  // ------- Logo
  const logoInputRefClick = () => {
    if (!logoInputRef.current) return;
    // Clearing first allows selecting the same file again after a failed or completed upload.
    logoInputRef.current.value = '';
    logoInputRef.current.click();
  };

  const clearLogoFileInput = () => {
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoFile(null);
      clearLogoFileInput();
      setNotification({ type: 'error', text: 'حجم فایل لوگو نباید بیشتر از ۲ مگابایت باشد.' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setLogoFile(null);
      clearLogoFileInput();
      setNotification({ type: 'error', text: 'فرمت فایل لوگو نامعتبر است. فرمت‌های مجاز: JPG، PNG، GIF و WebP.' });
      return;
    }

    setLogoFile(file);
    setLogoPreview((prev) => {
      revokeObjectUrlSafe(prev);
      return URL.createObjectURL(file);
    });
    setNotification(null);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || isUploadingLogo) return;
    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const uploadResult = await runWithFeedback(
        apiFetch('/api/settings/upload-logo', { method: 'POST', body: formData })
          .then((response) => parseApiResult<LogoUploadApiResult>(response, { endpoint: '/api/settings/upload-logo', action: 'آپلود لوگو' }))
          .then(async (result) => {
            const normalizedPath = String(result.data.filePath || '').replace(/^\/?uploads\//, '');
            if (!normalizedPath) throw new Error('مسیر لوگوی ذخیره‌شده از سرور دریافت نشد.');
            const freshPreview = await loadAuthedAssetUrl(`/uploads/${normalizedPath}?v=${result.data.revision || Date.now()}`);
            return { result, normalizedPath, freshPreview };
          }),
        {
          kind: 'send',
          loading: 'در حال آپلود و اعمال لوگوی فروشگاه…',
          success: 'لوگوی فروشگاه با موفقیت به‌روزرسانی شد.',
          endpoint: '/api/settings/upload-logo',
        }
      );

      if (!mountedRef.current) {
        revokeObjectUrlSafe(uploadResult.freshPreview);
        return;
      }

      setLogoPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return uploadResult.freshPreview;
      });
      setBusinessInfo((prev) => ({ ...prev, store_logo_path: uploadResult.normalizedPath }));
      setInitialBusinessInfo((prev) => ({ ...prev, store_logo_path: uploadResult.normalizedPath }));
      setLogoFile(null);
      clearLogoFileInput();
      notifyBusinessBrandingUpdated({
        storeName: normalizeStoreName(businessInfo.store_name || 'فروشگاه'),
        logoPath: uploadResult.normalizedPath,
        revision: uploadResult.result.data.revision || Date.now(),
      });
      setNotification({ type: 'success', text: 'لوگوی فروشگاه در تمام بخش‌های برنامه به‌روزرسانی شد.', closeMs: 3600 });
    } catch (error: unknown) {
      if (mountedRef.current) {
        setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/upload-logo', action: 'آپلود لوگو' }) });
      }
    } finally {
      if (mountedRef.current) setIsUploadingLogo(false);
    }
  };

  const handleLogoReset = async () => {
    if (isUploadingLogo) return;
    const hasPersistedLogo = Boolean(String(businessInfo.store_logo_path || '').trim());
    if (!hasPersistedLogo && !logoFile) return;

    const confirmed = await confirmAction({
      title: 'بازگشت به لوگوی طلایی پیش‌فرض',
      description: 'لوگوی سفارشی حذف می‌شود و نشان طلایی پیش‌فرض کوروش در تمام بخش‌های برنامه نمایش داده خواهد شد.',
      confirmText: 'بازگشت به لوگوی طلایی',
      cancelText: 'انصراف',
      tone: 'warning',
    });
    if (!confirmed) return;

    setIsUploadingLogo(true);
    try {
      const result = await runWithFeedback(
        apiFetch('/api/settings/logo', { method: 'DELETE' })
          .then((response) => parseApiResult<{ data?: { revision?: number } }>(response, {
            endpoint: '/api/settings/logo',
            action: 'بازگشت به لوگوی طلایی پیش‌فرض',
          })),
        {
          kind: 'send',
          loading: 'در حال فعال‌سازی لوگوی طلایی پیش‌فرض…',
          success: 'لوگوی طلایی پیش‌فرض فعال شد.',
          endpoint: '/api/settings/logo',
        },
      );
      if (!mountedRef.current) return;

      setLogoPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return null;
      });
      setLogoFile(null);
      clearLogoFileInput();
      setBusinessInfo((prev) => ({ ...prev, store_logo_path: '' }));
      setInitialBusinessInfo((prev) => ({ ...prev, store_logo_path: '' }));
      notifyBusinessBrandingUpdated({
        storeName: normalizeStoreName(businessInfo.store_name || 'فروشگاه'),
        logoPath: null,
        revision: result.data?.revision || Date.now(),
      });
      setNotification({ type: 'success', text: 'لوگوی طلایی پیش‌فرض در تمام بخش‌های برنامه فعال شد.', closeMs: 3600 });
    } catch (error: unknown) {
      if (mountedRef.current) {
        setNotification({
          type: 'error',
          text: humanizeErrorMessage(getErrorMessage(error), {
            endpoint: '/api/settings/logo',
            action: 'بازگشت به لوگوی طلایی پیش‌فرض',
          }),
        });
      }
    } finally {
      if (mountedRef.current) setIsUploadingLogo(false);
    }
  };

  
  const fetchRestoreHistory = async () => {
    const response = await apiFetch('/api/backup/restore-history?limit=10', { cache: 'no-store' });
    const payload = await response.json() as RestoreHistoryApiResult;
    if (!response.ok || !payload.success) throw new Error(payload.message || 'خطا در دریافت سابقه بازیابی');
    if (mountedRef.current) setRestoreHistory(payload.data || []);
    return payload.data || [];
  };

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const [res, historyRes] = await Promise.all([
        apiFetch('/api/backup/list'),
        apiFetch('/api/backup/restore-history?limit=10', { cache: 'no-store' }),
      ]);
      const [data, historyData] = await Promise.all([
        res.json() as Promise<BackupListApiResult>,
        historyRes.json() as Promise<RestoreHistoryApiResult>,
      ]);
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در دریافت لیست بکاپ‌ها');
      if (!historyRes.ok || !historyData.success) throw new Error(historyData.message || 'خطا در دریافت سابقه بازیابی');
      setBackupList(data.data || []);
      setRestoreHistory(historyData.data || []);
    } catch (e: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(e) });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (tab === 'data' && currentUser?.roleName === 'Admin') {
      void fetchBackups();
    }
  }, [tab, currentUser?.roleName]);

  const handleCreateBackupNow = async () => {
    setBackupOperationKey('create');
    try {
      await runWithFeedback(
        apiFetch('/api/backup/create', { method: 'POST' }).then((response) =>
          parseApiResult(response, { endpoint: '/api/backup/create', action: 'ایجاد بکاپ' })
        ),
        {
          kind: 'create',
          loading: 'در حال ساخت نسخه پشتیبان سازگار…',
          success: 'نسخه پشتیبان معتبر با موفقیت ایجاد شد.',
          endpoint: '/api/backup/create',
        }
      );
      await fetchBackups();
    } catch (e: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/create', action: 'ایجاد بکاپ' }) });
    } finally {
      if (mountedRef.current) setBackupOperationKey(null);
    }
  };

  const handleDownloadBackupFile = async (fileName: string) => {
    setBackupOperationKey(`download:${fileName}`);
    try {
      const res = await apiFetch(`/api/backup/download/${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error('خطا در دانلود بکاپ');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(e) });
    } finally {
      if (mountedRef.current) setBackupOperationKey(null);
    }
  };

  const handleDeleteBackupFile = async (fileName: string) => {
    const ok = await confirmAction({
      title: 'حذف نسخه پشتیبان',
      description: `فایل «${fileName}» از فضای بکاپ سرور حذف می‌شود. این عملیات روی دیتابیس فعال اثر ندارد.`,
      confirmText: 'حذف نسخه',
      tone: 'danger',
      iconClass: 'fa-solid fa-trash-can',
    });
    if (!ok) return;
    setBackupOperationKey(`delete:${fileName}`);
    try {
      await runWithFeedback(
        apiFetch(`/api/backup/${encodeURIComponent(fileName)}`, { method: 'DELETE' }).then((response) =>
          parseApiResult(response, { endpoint: '/api/backup/delete', action: 'حذف بکاپ' })
        ),
        {
          kind: 'delete',
          loading: 'در حال حذف نسخه پشتیبان…',
          success: 'نسخه پشتیبان با موفقیت حذف شد.',
          endpoint: '/api/backup/delete',
        }
      );
      await fetchBackups();
    } catch (e: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/delete', action: 'حذف بکاپ' }) });
    } finally {
      if (mountedRef.current) setBackupOperationKey(null);
    }
  };

  const schedulePostRestoreReload = (message: string) => {
    if (!mountedRef.current) return;
    setNotification({
      type: 'success',
      text: `${message} صفحه تازه‌سازی می‌شود؛ سپس با اطلاعات کاربری موجود در نسخه بازیابی‌شده وارد شوید.`,
    });
    window.setTimeout(() => {
      clearPersistedAuthSession();
      window.location.reload();
    }, 1650);
  };

  const handleRestoreFromBackup = async (fileName: string) => {
    const ok = await confirmAction({
      title: 'بازیابی نسخه پشتیبان',
      description: 'فایل قبل از جایگزینی اعتبارسنجی می‌شود و سرور از وضعیت فعلی یک نسخه ایمنی می‌سازد. با این حال اطلاعات فعال با محتوای بکاپ جایگزین خواهند شد.',
      confirmText: 'اعتبارسنجی و بازیابی',
      tone: 'warning',
      iconClass: 'fa-solid fa-clock-rotate-left',
    });
    if (!ok) return;

    const operationId = createRestoreOperationId();
    setRestoreProgress((previous) => buildLocalRestoreProgress(operationId, 'queued', previous));
    setIsRestoringDb(true);
    setBackupOperationKey(`restore:${fileName}`);
    const progressPolling = startRestoreProgressPolling(operationId);
    try {
      const data = await runWithFeedback(
        apiFetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, restoreOperationId: operationId }),
        }).then((response) =>
          parseApiResult<BackupRestoreApiResult>(response, { endpoint: '/api/backup/restore', action: 'بازیابی بکاپ' })
        ),
        {
          kind: 'action',
          loading: 'مراحل واقعی بازیابی از سرور دریافت می‌شود…',
          success: 'بازیابی نسخه پشتیبان با موفقیت انجام شد.',
          endpoint: '/api/backup/restore',
        }
      );
      if (!mountedRef.current) return;
      setRestoreProgress((previous) => data.data?.restoreProgress || buildLocalRestoreProgress(operationId, 'completed', previous));
      const completedAudit = data.data?.restoreAudit;
      if (completedAudit) setRestoreHistory((previous) => [completedAudit, ...previous.filter((item) => item.operationId !== completedAudit.operationId)].slice(0, 10));
      schedulePostRestoreReload(data.message || 'بازیابی دیتابیس با موفقیت کامل شد.');
    } catch (e: unknown) {
      if (mountedRef.current) {
        const message = humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/restore', action: 'بازیابی بکاپ' });
        setRestoreProgress((previous) => previous?.operationId === operationId && previous.status === 'failed'
          ? previous
          : buildLocalRestoreProgress(operationId, 'failed', previous, message));
        setNotification({ type: 'error', text: message });
        void fetchRestoreHistory().catch(() => undefined);
      }
    } finally {
      progressPolling.stop();
      await progressPolling.done.catch(() => undefined);
      if (mountedRef.current) {
        setIsRestoringDb(false);
        setBackupOperationKey(null);
      }
    }
  };

  const handleCheckRestore = async (fileName: string) => {
    setBackupOperationKey(`check:${fileName}`);
    try {
      const res = await apiFetch('/api/backup/check-restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName }) });
      const data = await res.json() as BackupCheckRestoreApiResult;
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در بررسی نسخه پشتیبان');
      const stats = data.data?.stats || {};
      const parts = [
        stats.customers !== null && stats.customers !== undefined ? `مشتری: ${Number(stats.customers).toLocaleString('fa-IR')}` : null,
        stats.phones !== null && stats.phones !== undefined ? `گوشی: ${Number(stats.phones).toLocaleString('fa-IR')}` : null,
        stats.sales_orders !== null && stats.sales_orders !== undefined ? `فروش: ${Number(stats.sales_orders).toLocaleString('fa-IR')}` : null,
        stats.users !== null && stats.users !== undefined ? `کاربر: ${Number(stats.users).toLocaleString('fa-IR')}` : null,
      ].filter(Boolean);
      setNotification({ type: 'success', text: `سلامت و ساختار فایل تأیید شد${parts.length ? ` — ${parts.join('، ')}` : ''}.` });
    } catch (e: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/check-restore', action: 'بررسی بکاپ' }) });
    } finally {
      if (mountedRef.current) setBackupOperationKey(null);
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
      await runWithFeedback(
        apiFetch('/api/backup/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: backupEnabled,
            mode: backupScheduleMode,
            time: normalizedBackupTime,
            weekdays: normalizedWeekdays,
            intervalHours: normalizedIntervalHours,
            timezone: normalizedTimezone,
            retention: normalizedRetention,
          }),
        }).then((response) => parseApiResult(response, { endpoint: '/api/backup/schedule', action: 'ذخیره زمان‌بندی بکاپ' })),
        {
          kind: 'save',
          loading: 'در حال ذخیره و اعمال زمان‌بندی روی سرور…',
          success: backupEnabled ? 'زمان‌بندی ذخیره و همان لحظه روی سرور فعال شد.' : 'بکاپ خودکار خاموش شد.',
          endpoint: '/api/backup/schedule',
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
      await fetchBackups();
    } catch (e: unknown) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(e), { endpoint: '/api/backup/schedule', action: 'ذخیره زمان‌بندی بکاپ' }) });
    } finally {
      if (mountedRef.current) setIsSavingBackupSchedule(false);
    }
  };
  const backupNextRunLabel = formatNextBackupRunLabel({
    mode: backupScheduleMode,
    time: backupScheduleTime,
    weekdays: backupScheduleWeekdays,
    intervalHours: backupScheduleIntervalHours,
  }, new Date(), backupTimezone);

  // ------- Backup/Restore
  const handleBackup = async () => {
    setBackupOperationKey('instant-download');
    setNotification({ type: 'info', text: 'در حال ساخت snapshot سازگار برای دانلود…' });
    try {
      const response = await apiFetch('/api/settings/backup');
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || 'خطا در دانلود');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kourosh_dashboard_backup_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotification({ type: 'success', text: 'فایل پشتیبان سازگار با موفقیت دانلود شد.' });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/backup', action: 'دانلود بکاپ' }) });
    } finally {
      if (mountedRef.current) setBackupOperationKey(null);
    }
  };

  const handleDbFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const clearSelection = () => {
      e.target.value = '';
      if (dbFileInputRef.current) dbFileInputRef.current.value = '';
      setDbFile(null);
    };
    if (file.name.split('.').pop()?.toLowerCase() !== 'db') {
      setNotification({ type: 'error', text: 'فایل انتخاب‌شده باید با فرمت واقعی .db باشد.' });
      clearSelection();
      return;
    }
    if (file.size < 4096) {
      setNotification({ type: 'error', text: 'فایل انتخاب‌شده خالی یا ناقص است.' });
      clearSelection();
      return;
    }
    if (file.size > 512 * 1024 * 1024) {
      setNotification({ type: 'error', text: 'حجم فایل بکاپ نباید بیشتر از ۵۱۲ مگابایت باشد.' });
      clearSelection();
      return;
    }
    setRestoreProgress(null);
    setDbFile(file);
    setIsRestoreModalOpen(true);
  };

  const handleRestore = async () => {
    if (!dbFile) return;

    const operationId = createRestoreOperationId();
    setRestoreProgress((previous) => buildLocalRestoreProgress(operationId, 'uploading', previous));
    setIsRestoringDb(true);
    const formData = new FormData();
    formData.append('dbfile', dbFile);
    formData.append('restoreOperationId', operationId);
    const progressPolling = startRestoreProgressPolling(operationId);
    try {
      const response = await apiFetch('/api/settings/restore', { method: 'POST', body: formData });
      const result = await response.json() as SettingsRestoreApiResult;
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در بازیابی دیتابیس');
      if (!mountedRef.current) return;
      setRestoreProgress((previous) => result.data?.restoreProgress || buildLocalRestoreProgress(operationId, 'completed', previous));
      const completedAudit = result.data?.restoreAudit;
      if (completedAudit) setRestoreHistory((previous) => [completedAudit, ...previous.filter((item) => item.operationId !== completedAudit.operationId)].slice(0, 10));
      schedulePostRestoreReload(result.message || 'بازیابی دیتابیس با موفقیت کامل شد.');
    } catch (error: unknown) {
      if (mountedRef.current) {
        const message = humanizeErrorMessage(getErrorMessage(error), { endpoint: '/api/settings/restore', action: 'بازیابی دیتابیس' });
        setRestoreProgress((previous) => previous?.operationId === operationId && previous.status === 'failed'
          ? previous
          : buildLocalRestoreProgress(operationId, 'failed', previous, message));
        setNotification({ type: 'error', text: message });
        void fetchRestoreHistory().catch(() => undefined);
      }
    } finally {
      progressPolling.stop();
      await progressPolling.done.catch(() => undefined);
      if (mountedRef.current) setIsRestoringDb(false);
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
    const normalizedUsername = newUser.username.trim();
    const normalizedRoleId = Number(newUser.roleId);
    if (!normalizedUsername) errors.username = 'نام کاربری الزامی است.';
    else if (normalizedUsername.length < 3 || normalizedUsername.length > 64) errors.username = 'نام کاربری باید بین ۳ تا ۶۴ کاراکتر باشد.';
    else if (/\s/.test(normalizedUsername)) errors.username = 'نام کاربری نباید فاصله داشته باشد.';
    if (!newUser.password) errors.password = 'کلمه عبور الزامی است.';
    else if (newUser.password.length < 6) errors.password = 'کلمه عبور باید حداقل ۶ کاراکتر باشد.';
    else if (newUser.password.length > 128) errors.password = 'کلمه عبور حداکثر می‌تواند ۱۲۸ کاراکتر باشد.';
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'کلمه عبور و تکرار آن یکسان نیستند.';
    if (!Number.isInteger(normalizedRoleId) || !roles.some((role) => role.id === normalizedRoleId)) errors.roleId = 'یک نقش معتبر انتخاب کن.';
    if (Object.keys(errors).length > 0) {
      setAddUserFormErrors(errors);
      return;
    }

    setIsSavingUser(true);
    try {
      await runWithFeedback(
        apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ username: normalizedUsername, password: newUser.password, roleId: normalizedRoleId }) }).then((response) =>
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
      await refreshUsersData(false);
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
    const normalizedRoleId = Number(editingUser.roleId);
    if (!Number.isInteger(normalizedRoleId) || !roles.some((role) => role.id === normalizedRoleId)) {
      setEditUserFormErrors({ roleId: 'یک نقش معتبر انتخاب کن.' });
      return;
    }
    if (editingUser.username === 'admin') {
      setNotification({ type: 'error', text: 'نقش مدیر اصلی قابل تغییر نیست.' });
      return;
    }
    setIsUpdatingUser(true);
    try {
      await runWithFeedback(
        apiFetch(`/api/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify({ roleId: normalizedRoleId }) }).then((response) =>
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
      await refreshUsersData(false);
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
    if (resetPasswordData.password.length > 128) {
      setResetPasswordErrors({ password: 'کلمه عبور حداکثر می‌تواند ۱۲۸ کاراکتر باشد.' });
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
      await refreshUsersData(false);
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error), { endpoint: `/api/users/${deletingUser.id}`, action: 'حذف مورد کاربر' }) });
    } finally {
      setIsDeletingUser(false);
    }
  };


  // ---- Account handlers
  const accountProfileDirty =
    profileFirstName.trim() !== initialProfileName.firstName.trim() ||
    profileLastName.trim() !== initialProfileName.lastName.trim();

  const handleSaveMyProfile = async () => {
    const firstName = profileFirstName.trim();
    const lastName = profileLastName.trim();
    if (firstName.length > 80 || lastName.length > 80) {
      setNotification({ type: 'error', text: 'نام و نام خانوادگی هرکدام باید حداکثر ۸۰ کاراکتر باشند.' });
      return;
    }
    if (!accountProfileDirty || isSavingProfile) return;

    setIsSavingProfile(true);
    try {
      const result = await runWithFeedback(
        apiFetch('/api/me/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName }),
        }).then((response) =>
          parseApiResult<ProfileUpdateApiResult>(response, { endpoint: '/api/me/profile', action: 'ذخیره پروفایل شخصی' })
        ),
        {
          kind: 'save',
          loading: 'در حال ذخیره پروفایل…',
          success: 'مشخصات حساب با موفقیت ذخیره شد.',
          endpoint: '/api/me/profile',
          action: 'ذخیره پروفایل شخصی',
        },
      );
      if (result.user) updateCurrentUser(result.user);
      const nextFirstName = String(result.user?.firstName ?? firstName);
      const nextLastName = String(result.user?.lastName ?? lastName);
      setProfileFirstName(nextFirstName);
      setProfileLastName(nextLastName);
      setInitialProfileName({ firstName: nextFirstName, lastName: nextLastName });
      setNotification({ type: 'success', text: result.message || 'مشخصات حساب با موفقیت ذخیره شد.', closeMs: 3200 });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error) || 'خطا در ذخیره مشخصات حساب.', { endpoint: '/api/me/profile', action: 'ذخیره پروفایل شخصی' }) });
    } finally {
      setIsSavingProfile(false);
    }
  };

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
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)) {
      setMeAvatarFile(null);
      setMeAvatarPreview((prev) => {
        revokeObjectUrlSafe(prev);
        return null;
      });
      if (meAvatarInputRef.current) meAvatarInputRef.current.value = '';
      setNotification({ type: 'error', text: 'فرمت آواتار نامعتبر است. فرمت‌های مجاز: JPG، PNG، GIF و WebP.' });
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
      setShowAccountPasswordFields(false);
    } catch (error: unknown) {
      setNotification({ type: 'error', text: humanizeErrorMessage(getErrorMessage(error) || 'خطا در تغییر کلمه عبور.', { endpoint: '/api/me/change-password', action: 'تغییر کلمه عبور' }) });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ---- UI helpers
  const infoChanged = JSON.stringify(businessInfo) !== JSON.stringify(initialBusinessInfo);

  const pricingLearningStats = useMemo(
    () => buildPricingLearningStatsViewModel(pricingLearningItems),
    [pricingLearningItems]
  );

  const pricingDecisionLog = useMemo(
    () => buildPricingDecisionLogViewModel({
      pricingLearningItems,
      pricingDecisionSearch,
      pricingDecisionActionFilter,
      pricingDecisionDeltaFilter,
      pricingDecisionDateFrom,
      pricingDecisionDateTo,
    }),
    [pricingLearningItems, pricingDecisionSearch, pricingDecisionActionFilter, pricingDecisionDeltaFilter, pricingDecisionDateFrom, pricingDecisionDateTo]
  );

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
    setNotification({ type: 'success', text: 'حافظه محلی تصمیم‌های قیمت‌گذاری پاک شد؛ سوابق واقعی فروشگاه حذف نشده‌اند.' });
    void refreshPricingLearningData();
  };

  const pricingStrategyAdvisor = useMemo(
    () => buildPricingStrategyAdvisorViewModel({ pricingLearningItems, pricingLearningStats, pricingSettings }),
    [pricingLearningItems, pricingLearningStats, pricingSettings]
  );

  const applyAdvisorStrategy = () => {
    updatePricingSettings({ strategy: pricingStrategyAdvisor.recommended });
    setNotification({ type: 'success', text: `استراتژی پیشنهادی «${pricingStrategyLabels[pricingStrategyAdvisor.recommended].label}» اعمال شد.` });
  };

  const pricingDecisionExportRows = useMemo(() => buildPricingDecisionExportRows(pricingDecisionLog), [pricingDecisionLog]);

  const exportPricingDecisionLogExcel = () => {
    if (pricingDecisionExportRows.length === 0) {
      setNotification({ type: 'error', text: 'برای خروجی اکسل، ابتدا باید حداقل یک تصمیم در لاگ وجود داشته باشد.' });
      return;
    }
    exportToExcel(buildPricingDecisionExportFilename('xlsx'), pricingDecisionExportRows, pricingDecisionExportColumns, 'لاگ تصمیمات قیمت‌گذاری');
    setNotification({ type: 'success', text: 'خروجی اکسل لاگ تصمیمات قیمت‌گذاری آماده شد.' });
  };
  const exportPricingDecisionLogPdf = () => {
    if (pricingDecisionExportRows.length === 0) {
      setNotification({ type: 'error', text: 'برای خروجی PDF، ابتدا باید حداقل یک تصمیم در لاگ وجود داشته باشد.' });
      return;
    }
    exportToPdfTable({
      filename: buildPricingDecisionExportFilename('pdf'),
      title: 'لاگ تصمیمات هوش قیمت‌گذاری',
      head: pricingDecisionExportColumns.map((col) => col.header),
      body: buildPricingDecisionPdfBody(pricingDecisionExportRows, pricingDecisionExportColumns),
    });
    setNotification({ type: 'success', text: 'خروجی PDF لاگ تصمیمات قیمت‌گذاری آماده شد.' });
  };

  const isAdmin = (currentUser?.roleName === 'Admin');
  const canManageStoreOwnership = canManageStoreOwnershipByRole(currentUser?.roleName);
  const { partnerShareChipClass, partnerShareChipIcon, partnerSetupNeedsAttention } = useMemo(
    () => buildSettingsPartnerShareNavigationViewModel(partnerShareStatus),
    [partnerShareStatus]
  );
  const {
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
  } = useMemo(
    () => buildSettingsAccountPanelViewModel({ currentUser, token, oldPassword, newPassword, newPassword2, getRoleLabelFa }),
    [currentUser, token, oldPassword, newPassword, newPassword2]
  );
  const { businessSummaryItems, businessAddressSummary } = useMemo(
    () => buildSettingsBusinessPanelViewModel(businessInfo),
    [businessInfo]
  );

  // Use brand colors for labels, inputs and fieldsets
  const labelClass = 'block text-[13px] font-semibold text-slate-700 mb-2';
  const inputClass =
    'w-full min-h-[48px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 text-right shadow-sm transition placeholder:text-slate-400   ';
  const fieldsetLegendClass = 'px-3 text-sm font-black tracking-tight text-slate-900';
  const fieldsetClass = 'settings-fieldset mt-6';
  const settingsSectionCard = 'settings-section-card rounded-[28px] border border-slate-200/80 bg-white p-5 md:p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.18)] dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-[0_18px_44px_-34px_rgba(2,6,23,0.72)]';
  const {
    backupModeLabel,
    backupStatusLabel,
    backupStatusClass,
    backupSummaryTone,
    backupSettingsDirty,
    backupFeedbackTone,
    backupFeedbackIcon,
    backupFeedbackLabel,
  } = useMemo(
    () => buildSettingsBackupPanelViewModel({
      backupEnabled,
      backupScheduleMode,
      backupScheduleTime,
      backupScheduleWeekdays,
      backupScheduleIntervalHours,
      backupTimezone,
      backupRetention,
      initialBackupSettings,
    }),
    [
      backupEnabled,
      backupScheduleMode,
      backupScheduleTime,
      backupScheduleWeekdays,
      backupScheduleIntervalHours,
      backupTimezone,
      backupRetention,
      initialBackupSettings,
    ]
  );


  const {
    handleBackupTimeInputChange,
    handleBackupTimeInputBlur,
    jumpToTelegramConfigField,
    jumpToTelegramSetupField,
    jumpToTelegramSection,
  } = useSettingsUiActionHandlers({
    backupScheduleTime,
    sanitizeTime,
    setBackupScheduleTime,
  });

  const settingsTelegramLegacyActions = [tgRetryAllFailed, tgCleanupFailed, scrollToTelegramAnchor];
  void settingsTelegramLegacyActions;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TelegramQuickFixEventDetail>).detail ?? {};
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

  const {
    telegramTokenValue,
    telegramUsernameValue,
    telegramChatIdValue,
    telegramProxyValue,
    localHostnameValue,
    localSuffixValue,
    localDomainValue,
    localBaseUrlValue,
    localHostsLineValue,
    telegramFieldInsights,
  } = useMemo(() => buildTelegramSetupViewModel(businessInfo, telegramInfo, tgHealth), [businessInfo, telegramInfo, tgHealth]);

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

  const {
    smsInfo,
    getSmsInfoString,
    smsConfiguredCount,
    smsTotalCount,
    smsAutomationCount,
    smsProviderMeta,
    smsProviderKey,
    smsProviderDefinition,
    smsCredentialReady,
    smsCredentialConfiguredCount,
    smsCredentialTotalCount,
    smsReadinessPercent,
    smsMissingRequirements,
    smsCoreReady,
    meliPatternDefs,
  } = buildSettingsSmsViewModel(businessInfo as SmsBusinessInfo);

  const smsModalViewModel = useMemo(() => buildSettingsSmsModalViewModel({
    smsCheckOpen, setSmsCheckOpen, smsCheckTitle, smsCheckBodyId, smsCheckTokenLabels,
    smsPrevOpen, setSmsPrevOpen, smsPrevTitle, smsPrevTemplate, smsPrevTokenLabels,
    smsBulkOpen, setSmsBulkOpen, smsBulkDefaults, meliPatternDefs, getSmsInfoString,
  }), [getSmsInfoString, meliPatternDefs, setSmsBulkOpen, setSmsCheckOpen, setSmsPrevOpen, smsBulkDefaults, smsBulkOpen, smsCheckBodyId, smsCheckOpen, smsCheckTitle, smsCheckTokenLabels, smsPrevOpen, smsPrevTemplate, smsPrevTitle, smsPrevTokenLabels]);

  const renderCtx = {
    isLoading,
    Notification,
    PageShell,
    SettingsAccountPanel,
    SettingsBusinessPanel,
    SettingsDataPanel,
    SettingsHeaderBar,
    SettingsLocalPanel,
    SettingsModulesPanel,
    SettingsPricingPanel,
    SettingsRemindersPanel,
    SettingsRestoreModal,
    SettingsSaveFooter,
    SettingsSmartPanel,
    SettingsSmsPanel,
    SettingsStylePanel,
    SettingsTelegramPanel,
    SettingsUsersModals,
    SettingsUsersPanel,
    TelegramTemplateTestModal,
    addUserFormErrors,
    applyCommercialPlan,
    backupEnabled,
    backupList,
    backupOperationKey,
    restoreProgress,
    restoreHistory,
    backupRetention,
    backupScheduleIntervalHours,
    backupScheduleMode,
    backupScheduleTime,
    backupScheduleWeekdays,
    backupTimezone,
    businessInfo,
    commercialPlanUiCopy,
    dbFile,
    dbFileInputRef,
    deletingUser,
    editingUser,
    fetchData,
    refreshUsersData,
    filteredUsers,
    formatPricingDatePreview,
    getFeatureRuntimeBadges,
    getRoleLabelFa,
    handleBusinessInfoChange,
    handleBusinessInfoSubmit,
    handleGenerateLocalCertificate,
    initialBusinessInfo,
    isAddUserModalOpen,
    isChangingPassword,
    isDeleteUserModalOpen,
    isDeletingUser,
    isEditUserModalOpen,
    isFeatureSettingEnabled,
    isGeneratingLocalCert,
    isLoadingBackups,
    isRefreshingUsers,
    currentUserId: currentUser?.id ?? null,
    isResetPasswordModalOpen,
    isRestoreModalOpen,
    isRestoringDb,
    isSaving,
    isSavingBackupSchedule,
    isSavingUser,
    isSavingProfile,
    isSettingsTabRuntimeEnabled,
    isSubmittingReset,
    isUpdatingUser,
    isUploadingAvatar,
    isUploadingLogo,
    localCertError,
    localCertMessage,
    logoFile,
    logoInputRef,
    logoPreview,
    meAvatarFile,
    meAvatarInputRef,
    meAvatarPreview,
    meliPatternDefs,
    moduleRuntimeSummary,
    name,
    newPassword,
    newPassword2,
    newUser,
    normalizePricingDateInput,
    notification,
    oldPassword,
    profileFirstName,
    profileLastName,
    accountProfileDirty,
    openSmsPatternCheck,
    openSmsPatternPreview,
    openTelegramAudiencePanels,
    openTelegramCategories,
    openTelegramItems,
    openTelegramTemplateCheck,
    partnerShareStatus,
    pricingDecisionActionFilter,
    pricingDecisionDateFrom,
    pricingDecisionDateTo,
    pricingDecisionDeltaFilter,
    pricingDecisionSearch,
    pricingDataStatus,
    refreshPricingLearningData,
    pricingSettings,
    pricingStrategyLabels,
    resetPasswordData,
    resetPasswordErrors,
    resettingUser,
    roles,
    scrollToSection,
    setBackupEnabled,
    setBackupRetention,
    setBackupScheduleIntervalHours,
    setBackupScheduleMode,
    setBackupScheduleWeekdays,
    setBackupTimezone,
    setBusinessInfo,
    setFeatureByKey,
    setIsAddUserModalOpen,
    setIsDeleteUserModalOpen,
    setIsEditUserModalOpen,
    setIsResetPasswordModalOpen,
    setIsRestoreModalOpen,
    setLogoFile,
    setNewPassword,
    setNewPassword2,
    setNotification,
    setOldPassword,
    setProfileFirstName,
    setProfileLastName,
    setOpenTelegramItems,
    setPricingDecisionActionFilter,
    setPricingDecisionDateFrom,
    setPricingDecisionDateTo,
    setPricingDecisionDeltaFilter,
    setPricingDecisionSearch,
    setResetPasswordData,
    setSettingsViewMode,
    setShowAccountPasswordFields,
    setShowTelegramToken,
    openSmsBulkCheck,
    openSmsBulkPanel,
    setSmsCheckOpen,
    setSmsPrevOpen,
    setTab,
    setTelegramStudioMode,
    setTelegramTemplateFilter,
    setTelegramTemplateSearch,
    setTgCheckOpen,
    setTgQuickMsg,
    setUserRoleFilter,
    setUserSearchQuery,
    settingsViewMode,
    showAccountPasswordFields,
    showTelegramToken,
    smsBulkDefaults,
    smsBulkOpen,
    smsCheckBodyId,
    smsCheckOpen,
    smsCheckTitle,
    smsCheckTokenLabels,
    smsPrevOpen,
    smsPrevTemplate,
    smsPrevTitle,
    smsPrevTokenLabels,
    tab,
    telegramInfo,
    telegramPinnedQuickActions,
    telegramQuickActionUsageMap,
    telegramStudioMode,
    telegramTemplateFilter,
    telegramTemplateSearch,
    telegramTodoDoneMap,
    telegramسراسریCompletionPercent,
    telegramسراسریSummary,
    tgChatLookupHint,
    tgChatLookupLoading,
    tgCheckAllowedVars,
    tgCheckAudience,
    tgCheckFormat,
    tgCheckOpen,
    tgCheckTemplate,
    tgCheckTitle,
    tgDiagnostics,
    tgDiagnosticsBusyAction,
    tgDiagnosticsLoading,
    tgHealth,
    tgIsChecking,
    tgIsSendingQuick,
    tgQuickMsg,
    tgRecentChats,
    userRoleFilter,
    userRoleSummaries,
    userSearchQuery,
    userStatsCards,
    users,
    accountDisplayName,
    accountInitial,
    accountMetaItems,
    accountPasswordMismatch,
    accountPasswordReady,
    accountPasswordScore,
    accountPasswordVisual,
    accountProfile,
    accountSecurityItems,
    applyAdvisorStrategy,
    applyTelegramAiSuggestion,
    applyTelegramPreset,
    backupFeedbackIcon,
    backupFeedbackLabel,
    backupFeedbackTone,
    backupModeLabel,
    backupNextRunLabel,
    backupSettingsDirty,
    backupStatusClass,
    backupStatusLabel,
    backupSummaryTone,
    buildTelegramAudiencePreset,
    bumpTelegramQuickActionUsage,
    businessAddressSummary,
    businessSummaryItems,
    canManageStoreOwnership,
    checkTelegramHealth,
    clearTelegramStudioFilters,
    deferTelegramTodo,
    exportPricingDecisionLogExcel,
    exportPricingDecisionLogPdf,
    fetchBackups,
    fetchTelegramRecentChats,
    fieldsetClass,
    fieldsetLegendClass,
    filteredTelegramGroupedDefs,
    focusTelegramAudience,
    getSmsInfoString,
    getTelegramAiAssistantCopy,
    getTelegramAudienceFormatKey,
    getTelegramAudienceKey,
    getTelegramCategoryStatus,
    getTelegramItemStatus,
    getTelegramMiniStatusClasses,
    getTelegramPriorityMeta,
    getTelegramProgressTone,
    getTelegramTodoNextStep,
    handleBackup,
    handleBackupTimeInputBlur,
    handleBackupTimeInputChange,
    handleChangeMyPassword,
    handleSaveMyProfile,
    handleCheckRestore,
    handleCreateBackupNow,
    handleDbFileChange,
    handleDeleteBackupFile,
    handleDeleteUser,
    handleDownloadBackupFile,
    handleDownloadHostsScript,
    handleDownloadLocalCertificate,
    handleEditUserChange,
    handleEditUserSubmit,
    handleLogoFileChange,
    handleLogoReset,
    handleLogoUpload,
    handleMeAvatarChange,
    handleMeAvatarUpload,
    handleNewUserChange,
    handleNewUserSubmit,
    handleResetPasswordSubmit,
    handleRestore,
    handleRestoreFromBackup,
    handleSaveBackupSchedule,
    handleSaveLocalDomainSettings,
    handleTelegramSettingsSubmit,
    infoChanged,
    inputClass,
    isAdmin,
    jumpToFirstIncompleteTelegramTemplate,
    jumpToTelegramConfigField,
    jumpToTelegramSection,
    jumpToTelegramSetupField,
    jumpToTelegramTemplate,
    labelClass,
    localDomainValue,
    localHostnameValue,
    localHostsLineValue,
    localSuffixValue,
    logoInputRefClick,
    markTelegramTodoDone,
    openAddUserModal,
    openDeleteUserModal,
    openEditUserModal,
    openResetPasswordModal,
    openUrgentTelegramTodos,
    partnerSetupNeedsAttention,
    partnerShareChipClass,
    partnerShareChipIcon,
    pricingDecisionLog,
    pricingLearningStats,
    pricingStrategyAdvisor,
    reactivateTelegramTodo,
    renderTelegramFieldLabel,
    renderTelegramPlainFieldLabel,
    resetPricingLearning,
    resetPricingSettings,
    resetTelegramQuickActionPersonalization,
    resetTelegramTodoAssistant,
    runTelegramAdminAction,
    runTelegramDiagnostics,
    sendTelegramQuickCheck,
    setAllTelegramCategories,
    setAllTelegramItems,
    settingsSectionCard,
    smsAutomationCount,
    smsConfiguredCount,
    smsCoreReady,
    smsCredentialConfiguredCount,
    smsCredentialReady,
    smsCredentialTotalCount,
    smsInfo,
    smsMissingRequirements,
    smsModalViewModel,
    smsProviderDefinition,
    smsProviderKey,
    smsProviderMeta,
    smsReadinessPercent,
    smsTotalCount,
    telegramAudienceDestinationCount,
    telegramChatIdValue,
    telegramCoachMessage,
    telegramConfigChecks,
    telegramConfigReadiness,
    telegramConfigReadyCount,
    telegramConnectionMode,
    telegramDestinationCount,
    telegramDiagnosticsViewModel,
    telegramEffectiveFilter,
    telegramFieldInsights,
    telegramHasProxy,
    telegramMissingItems,
    telegramProxyValue,
    telegramReadinessLabel,
    telegramReadinessScore,
    telegramRecentChatsViewModel,
    telegramSetupCoachMessage,
    telegramSetupDone,
    telegramSetupItems,
    telegramSetupPercent,
    telegramSmartActions,
    telegramSpotlightTarget,
    telegramTemplateDefs,
    telegramTodoSummary,
    telegramTodoTopItems,
    telegramTokenValue,
    telegramUsernameValue,
    tgAudienceMeta,
    tgCategoryMeta,
    toggleTelegramAudiencePanel,
    toggleTelegramCategory,
    toggleTelegramItem,
    toggleTelegramQuickActionPin,
    updatePricingSettings,
    visibleTelegramItemsCount,
  };

  return renderCtx;
};

export type SettingsRenderContext = ReturnType<typeof useSettingsControllerContext>;

const SettingsController: React.FC = () => {
  const ctx = useSettingsControllerContext();

  if (ctx.isLoading) {
    return (
      <PageShell
        title="تنظیمات"
        description="پیکربندی سیستم، کاربران و تنظیمات کسب‌وکار."
        icon={<i className="fa-solid fa-gear" />}
        className="settings-shell-page"
      >
        <div className="p-10 text-center text-gray-500">
          <i className="fas fa-spinner fa-spin text-3xl mb-3" />
          <p>در حال دریافت اطلاعات تنظیمات...</p>
        </div>
      </PageShell>
    );
  }

  return <SettingsRender ctx={ctx} />;
};

export default SettingsController;
