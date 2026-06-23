import type React from 'react';
import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import type {
  BusinessInformationSettings,
  EditUserFormData,
  NewUserFormData,
  NotificationMessage,
  Role,
  UserForDisplay,
} from '../../types';
import type { SmsPatternDef } from '../../components/SmsBulkTestModal';
import type { BackupScheduleMode } from '../../utils/backupSchedule';
import type { CommercialPlanKey } from '../../utils/featureFlags';

export type AccountProfileLike = {
  avatarUrl?: string | null;
  username?: string | null;
  roleName?: string | null;
} | null;

export type AccountMetaItem = {
  label: string;
  value: React.ReactNode;
  icon: string;
};

export type AccountSecurityItem = {
  label: string;
  ok: boolean;
  hint: React.ReactNode;
};

export type AccountPasswordVisual = {
  panel: string;
  badge: string;
  icon: string;
  label: string;
  text: string;
  tone: string;
  width: string;
};

export type SettingsAccountPanelProps = {
  meAvatarInputRef: React.RefObject<HTMLInputElement>;
  handleMeAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  meAvatarPreview: string | null;
  accountProfile: AccountProfileLike;
  accountDisplayName: string;
  accountInitial: string;
  isAdmin: boolean;
  getRoleLabelFa: (roleName?: string | null) => string;
  setTab: (tab: 'users') => void;
  meAvatarFile: File | null;
  isUploadingAvatar: boolean;
  handleMeAvatarUpload: () => void;
  accountMetaItems: AccountMetaItem[];
  settingsSectionCard: string;
  labelClass: string;
  inputClass: string;
  showAccountPasswordFields: boolean;
  setShowAccountPasswordFields: React.Dispatch<React.SetStateAction<boolean>>;
  oldPassword: string;
  setOldPassword: React.Dispatch<React.SetStateAction<string>>;
  newPassword: string;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  newPassword2: string;
  setNewPassword2: React.Dispatch<React.SetStateAction<string>>;
  accountPasswordVisual: AccountPasswordVisual;
  accountPasswordScore: number;
  accountPasswordMismatch: boolean;
  handleChangeMyPassword: () => void;
  accountPasswordReady: boolean;
  isChangingPassword: boolean;
  accountSecurityItems: AccountSecurityItem[];
};

export type BusinessSummaryItem = { label: string; value: string; icon: string };
export type PartnerShareStatusLite = { hint: string; label: string };
export type BusinessCurrencyUnit = NonNullable<BusinessInformationSettings['currency_unit']>;
export type SettingsBusinessInfo = BusinessInformationSettings & { currency_unit?: BusinessCurrencyUnit };

export type SettingsBusinessPanelProps = {
  businessInfo: SettingsBusinessInfo;
  businessSummaryItems: BusinessSummaryItem[];
  businessAddressSummary: string;
  labelClass: string;
  inputClass: string;
  settingsSectionCard: string;
  logoInputRef: RefObject<HTMLInputElement>;
  logoPreview: string | null;
  logoFile: File | null;
  isUploadingLogo: boolean;
  infoChanged: boolean;
  isSaving: boolean;
  canManageStoreOwnership: boolean;
  partnerSetupNeedsAttention: boolean;
  partnerShareChipClass: string;
  partnerShareChipIcon: string;
  partnerShareStatus: PartnerShareStatusLite;
  handleBusinessInfoSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleBusinessInfoChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleLogoFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleLogoUpload: () => void;
  logoInputRefClick: () => void;
};

export type BackupItem = { fileName: string; size: number; mtime: string };
export type BackupScheduleTimezone = string;

export type SettingsDataPanelProps = {
  tab: string;
  settingsSectionCard: string;
  inputClass: string;
  backupModeLabel: string;
  backupScheduleTime: string;
  backupFeedbackTone: string;
  backupFeedbackIcon: string;
  backupFeedbackLabel: string;
  backupStatusClass: string;
  backupEnabled: boolean;
  backupStatusLabel: string;
  backupSummaryTone: string;
  backupNextRunLabel: string;
  backupList: BackupItem[];
  backupSettingsDirty: boolean;
  backupScheduleMode: BackupScheduleMode;
  backupScheduleWeekdays: number[];
  backupScheduleIntervalHours: number;
  backupTimezone: BackupScheduleTimezone;
  backupRetention: number;
  isSavingBackupSchedule: boolean;
  isLoadingBackups: boolean;
  isRestoringDb: boolean;
  dbFileInputRef: React.RefObject<HTMLInputElement>;
  handleBackup: () => void;
  handleSaveBackupSchedule: () => void;
  setBackupEnabled: (value: boolean) => void;
  setBackupScheduleMode: Dispatch<SetStateAction<BackupScheduleMode>>;
  handleBackupTimeInputChange: (value: string) => void;
  handleBackupTimeInputBlur: () => void;
  setBackupScheduleWeekdays: React.Dispatch<React.SetStateAction<number[]>>;
  setBackupScheduleIntervalHours: (value: number) => void;
  setBackupTimezone: (value: string) => void;
  setBackupRetention: (value: number) => void;
  handleCreateBackupNow: () => void;
  fetchBackups: () => void;
  handleDownloadBackupFile: (fileName: string) => void;
  handleCheckRestore: (fileName: string) => void;
  handleRestoreFromBackup: (fileName: string) => void;
  handleDeleteBackupFile: (fileName: string) => void;
  handleDbFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export type SettingsLocalBusinessInfo = BusinessInformationSettings & {
  local_hostname?: string | null;
  local_base_url?: string | null;
  local_domain_suffix?: string | null;
  local_hosts_ip?: string | null;
  local_hosts_line?: string | null;
};

export type SettingsLocalPanelProps = {
  tab: string;
  businessInfo: SettingsLocalBusinessInfo;
  labelClass: string;
  inputClass: string;
  localHostnameValue: string;
  localSuffixValue: string;
  localDomainValue: string;
  localHostsLineValue: string;
  localCertMessage: string | null;
  localCertError: string | null;
  isGeneratingLocalCert: boolean;
  infoChanged: boolean;
  isSaving: boolean;
  handleGenerateLocalCertificate: () => void;
  handleDownloadHostsScript: () => void;
  handleBusinessInfoChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  handleBusinessInfoSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export type ModuleRuntimeSummaryItem = {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: string;
  tone: string;
};

export type CommercialPlanUiCopy = Record<CommercialPlanKey, { titleFa: string; short: string; audience: string }>;

export type FeatureLike = {
  key: string;
  settingKey: string;
  optional?: boolean;
  defaultEnabled?: boolean;
  routes?: string[];
  navIds?: string[];
  icon?: string;
  title?: string;
  tier?: string;
  description?: string;
  groupTitle?: string;
  category?: string;
};

export type RuntimeBadge = {
  label: string;
  active: boolean;
  icon: string;
};

export type SettingsModulesPanelProps = {
  infoChanged: boolean;
  isSaving: boolean;
  handleBusinessInfoSubmit: () => void;
  moduleRuntimeSummary: ModuleRuntimeSummaryItem[];
  commercialPlanUiCopy: CommercialPlanUiCopy;
  isFeatureSettingEnabled: (feature: { settingKey: string; defaultEnabled?: boolean }) => boolean;
  applyCommercialPlan: (planKey: CommercialPlanKey) => void;
  getFeatureRuntimeBadges: (feature: { key: string; routes?: string[]; navIds?: string[] }) => RuntimeBadge[];
  setFeatureByKey: (feature: { settingKey: string; optional?: boolean; defaultEnabled?: boolean }, enabled: boolean) => void;
};

export type PricingStrategyMode = 'quick' | 'balanced' | 'profit';
export type PricingDecisionActionFilter = 'all' | 'accepted' | 'overridden' | 'manual';
export type PricingDecisionDeltaFilter = 'all' | 'higher' | 'lower' | 'same';
export type PricingLearningAction = Exclude<PricingDecisionActionFilter, 'all'>;

export type PricingStrategyLabel = {
  label: string;
  icon: string;
  hint: string;
};

export type PricingStrategyLabels = Record<PricingStrategyMode, PricingStrategyLabel>;

export type PricingIntelligenceSettingsLite = {
  strategy: PricingStrategyMode;
  targetMarkupPercent: number;
  riskTolerance: number;
  staleDaysThreshold: number;
  roundStep: number;
};

export type PricingLearningItem = {
  id?: string | number;
  source?: string;
  userKey?: string;
  model?: string | null;
  condition?: string | null;
  purchasePrice?: number | string | null;
  suggestedSale?: number | string | null;
  finalSale?: number | string | null;
  markupPercent?: number | string | null;
  suggestedMarkupPercent?: number | string | null;
  action?: PricingLearningAction | string | null;
  createdAt?: string | Date | null;
};

export type PricingLearningStats = {
  total: number;
  accepted: number;
  overridden: number;
  manual: number;
  modelCount: number;
  learningPercent: number;
  status: string;
};

export type PricingToneMeta = {
  label: string;
  icon: string;
  tone: string;
};

export type PricingDecisionLogItem = {
  id: string;
  model: string;
  condition: string;
  action: string;
  meta: PricingToneMeta;
  suggested: string;
  finalSale: string;
  purchase: string;
  markup: string;
  date: string;
  createdAt: number;
  delta: number;
  deltaLabel: string;
};

export type PricingAdvisorCard = {
  label: string;
  value: string;
  icon: string;
};

export type PricingStrategyAdvisor = {
  recommended: PricingStrategyMode;
  confidence: string;
  title: string;
  reason: string;
  icon: string;
  tone: string;
  cards: PricingAdvisorCard[];
  actions: string[];
  maturity: string;
};

export type SettingsPricingPanelProps = {
  pricingLearningStats: PricingLearningStats;
  resetPricingSettings: () => void;
  resetPricingLearning: () => void;
  pricingStrategyAdvisor: PricingStrategyAdvisor;
  pricingSettings: PricingIntelligenceSettingsLite;
  pricingStrategyLabels: PricingStrategyLabels;
  applyAdvisorStrategy: () => void;
  updatePricingSettings: (patch: Partial<PricingIntelligenceSettingsLite>) => void;
  pricingDecisionSearch: string;
  setPricingDecisionSearch: (value: string) => void;
  pricingDecisionActionFilter: PricingDecisionActionFilter;
  setPricingDecisionActionFilter: (value: PricingDecisionActionFilter) => void;
  pricingDecisionDeltaFilter: PricingDecisionDeltaFilter;
  setPricingDecisionDeltaFilter: (value: PricingDecisionDeltaFilter) => void;
  pricingDecisionDateFrom: string;
  setPricingDecisionDateFrom: (value: string) => void;
  pricingDecisionDateTo: string;
  setPricingDecisionDateTo: (value: string) => void;
  pricingDecisionLog: PricingDecisionLogItem[];
  exportPricingDecisionLogExcel: () => void;
  exportPricingDecisionLogPdf: () => void;
  normalizePricingDateInput: (value: string) => string;
  formatPricingDatePreview: (value: string, fallback: string) => string;
};

export type SettingsRemindersPanelProps = {
  tab: string;
};

export type SettingsSmartPanelProps = {
  tab: string;
  isFeatureSettingEnabled: (feature: { settingKey: string; defaultEnabled?: boolean }) => boolean;
  setNotification: React.Dispatch<React.SetStateAction<NotificationMessage | null>>;
};

export type SmsProviderMeta = {
  title: string;
  subtitle: string;
  icon: string;
};


export type SmsAutomationMode = 'off' | 'sms' | 'telegram' | 'both';
export type SmsProviderKey = 'meli_payamak' | 'kavenegar' | 'sms_ir' | 'ippanel' | 'telegram' | string;
export type SmsPatternAccent = 'emerald' | 'blue' | 'amber' | 'gray';
export type SmsBusinessInfoValue = string | number | boolean | null | undefined;
export type SmsBusinessInfo = BusinessInformationSettings & Partial<Record<string, SmsBusinessInfoValue>> & {
  sms_provider?: SmsProviderKey | null;
  auto_send_installment_due?: SmsAutomationMode | null;
  auto_send_check_due?: SmsAutomationMode | null;
  auto_send_repair_ready?: SmsAutomationMode | null;
};
export type SmsPatternKey = keyof SmsBusinessInfo & string;

export type SettingsSmsPanelProps = {
  tab: string;
  businessInfo: SmsBusinessInfo;
  inputClass: string;
  labelClass: string;
  fieldsetClass: string;
  fieldsetLegendClass: string;
  smsCoreReady: boolean;
  smsProviderMeta: SmsProviderMeta;
  smsConfiguredCount: number;
  smsTotalCount: number;
  smsAutomationCount: number;
  meliPatternDefs: SmsPatternDef[];
  handleBusinessInfoChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  handleBusinessInfoSubmit: (e?: React.FormEvent) => void | Promise<void>;
  scrollToSection: (id: string) => void;
  openSmsPatternPreview: (title: string, previewTemplate: string, tokenLabels: string[]) => void;
  openSmsPatternCheck: (title: string, bodyId: string, tokenLabels: string[]) => void;
  setSmsBulkDefaults: React.Dispatch<React.SetStateAction<string[]>>;
  setSmsBulkOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export type SettingsStylePanelProps = {
  tab: string;
};

export type TelegramAudience = 'customer' | 'partner' | 'manager';
export type TelegramTemplateFilter = 'all' | 'configured' | 'incomplete' | string;
export type TelegramStudioMode = 'simple' | 'advanced' | 'quick' | 'all' | 'todo' | 'incomplete' | string;
export type TelegramConnectionMode = 'Proxy Active' | 'VPN / Direct' | 'direct' | 'proxy' | 'unset' | string;
export type TelegramTone = 'emerald' | 'rose' | 'amber' | 'slate' | 'sky';

export type TelegramMessageFormat = 'text' | 'markdown' | 'html';
export type TelegramTemplatePolicy = 'formal' | 'friendly' | 'short' | string;
export type TelegramToggleValue = '0' | '1' | string;
export type TelegramBusinessInfoValue = string | number | boolean | null | undefined;

export type TelegramBusinessInfo = BusinessInformationSettings & Partial<Record<string, TelegramBusinessInfoValue>> & {
  telegram_bot_username?: string | null;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | number | null;
  telegram_proxy?: string | null;
  telegram_link_otp_enabled?: TelegramToggleValue | null;
  telegram_template_policy?: TelegramTemplatePolicy | null;
  telegram_quiet_start_hour?: string | number | null;
  telegram_quiet_end_hour?: string | number | null;
  telegram_max_per_day_per_customer?: string | number | null;
  telegram_notify_installments?: TelegramToggleValue | null;
  telegram_installment_remind_days?: string | null;
  telegram_installment_overdue_repeat_days?: string | number | null;
  telegram_notify_repairs?: TelegramToggleValue | null;
  sms_otp_meli_body_id?: string | null;
  sms_otp_exp_minutes?: string | number | null;
};

export type TelegramTemplateVariable = {
  key: string;
  label?: string;
  example?: string;
};

export type TelegramAudienceStatus = {
  aud: TelegramAudience;
  configured: boolean;
  label: string;
};

export type TelegramItemStatus = {
  audiences: TelegramAudienceStatus[];
  configuredCount: number;
  percent: number;
  allConfigured: boolean;
  anyConfigured: boolean;
};

export type TelegramCategoryStatus = {
  configuredAudiences: number;
  totalAudiences: number;
  percent: number;
};

export type TelegramPriorityMeta = {
  level: number;
  label: string;
  icon: string;
  chip: string;
};

export type TelegramProgressTone = {
  badge: string;
  bar: string;
  rail: string;
  icon: string;
  label: string;
};

export type TelegramFieldInsight = {
  ok: boolean;
  tone: TelegramTone;
  chip: string;
  message: React.ReactNode;
  cta?: string;
  target: string;
};

export type TelegramFieldInsights = {
  token: TelegramFieldInsight;
  username: TelegramFieldInsight;
  chatId: TelegramFieldInsight;
  baseUrl: TelegramFieldInsight;
  proxy: TelegramFieldInsight;
  rules: TelegramFieldInsight;
};

export type TelegramCheckItem = {
  key: string;
  label?: string;
  title?: string;
  ok?: boolean;
  done?: boolean;
  score?: number;
  status?: string;
  icon?: string;
  target?: string;
  targetId?: string;
  hint?: React.ReactNode;
};

export type TelegramAudienceMeta = {
  label: string;
  icon: string;
  chip: string;
};

export type TelegramCategoryMeta = {
  icon: string;
  tone: string;
  description: string;
  quickHint: string;
  heroChip: string;
  heroBar: string;
};

export type TelegramStatusMeta = {
  label?: string;
  icon?: string;
  tone?: TelegramTone;
  className?: string;
  chip?: string;
  message?: React.ReactNode;
};

export type TelegramTemplateDef = {
  key: string;
  label: string;
  category: string;
  preview: string;
  accent?: string;
  iconClass?: string;
  tokens?: string[];
  previewTemplate?: string;
  allowedVars: TelegramTemplateVariable[];
};

export type TelegramAudienceTemplateEntry = {
  aud: TelegramAudience;
  audienceKey: string;
  formatKey: string;
  value: string;
  format: TelegramMessageFormat;
  isConfigured: boolean;
};

export type TelegramTodoEntry = {
  item: TelegramTemplateDef;
  status: TelegramItemStatus;
  priority: TelegramPriorityMeta;
  missingAudiences: TelegramAudienceStatus[];
  missingCount: number;
  firstMissing?: TelegramAudienceStatus;
  suggestedPreset: string;
  aiConfidence: number;
  deferredUntil?: string | null;
  isDone: boolean;
};

export type TelegramTodoSummary = {
  open: number;
  urgent: number;
  later: number;
};

export type TelegramGlobalSummary = {
  complete: number;
  partial: number;
  empty: number;
  configuredAudiences: number;
};

export type TelegramSmartAction = {
  key: string;
  label: string;
  value: React.ReactNode;
  icon: string;
  ok: boolean;
  targetId: string;
};

export type TelegramRecentChat = {
  chatId: string | number;
  title?: string;
  username?: string;
  source?: string;
  type?: string;
  text?: string;
  at?: string | null;
};

export type TelegramHealthState = {
  ok: boolean;
  msg: string;
  bot?: {
    username?: string;
    first_name?: string;
    [key: string]: unknown;
  } | null;
};

export type TelegramDiagnosticsState = {
  webhook?: {
    result?: {
      url?: string;
      pending_update_count?: number;
      last_error_message?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  local?: {
    pollingStarted?: boolean;
    updateMode?: string;
    lastWebhookAt?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type TelegramControlCenterState = {
  health?: {
    botApi?: {
      ok?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type TelegramGroupedTemplateDefs = Array<readonly [string, TelegramTemplateDef[]]>;

export type SettingsTelegramPanelProps = {
  tab: string;
  settingsViewMode: string;
  businessInfo: TelegramBusinessInfo;
  inputClass: string;
  labelClass: string;
  showTelegramToken: boolean;
  telegramAudienceDestinationCount: number;
  telegramChatIdValue: string;
  telegramCoachMessage: React.ReactNode;
  telegramConfigChecks: TelegramCheckItem[];
  telegramConfigReadiness: number;
  telegramConfigReadyCount: number;
  telegramConnectionMode: TelegramConnectionMode;
  telegramDestinationCount: number;
  telegramEffectiveFilter: string;
  telegramFieldInsights: TelegramFieldInsights;
  telegramHasProxy: boolean;
  telegramMissingItems: TelegramCheckItem[];
  telegramPinnedQuickActions: Record<string, boolean>;
  telegramProxyValue: string;
  telegramQuickActionUsageMap: Record<string, number>;
  telegramReadinessLabel: string;
  telegramReadinessScore: number;
  telegramSetupCoachMessage: React.ReactNode;
  telegramSetupDone: number;
  telegramSetupItems: TelegramCheckItem[];
  telegramSetupPercent: number;
  telegramSmartActions: TelegramSmartAction[];
  telegramSpotlightTarget: string | null;
  telegramStudioMode: TelegramStudioMode;
  telegramTemplateDefs: TelegramTemplateDef[];
  telegramTemplateFilter: TelegramTemplateFilter;
  telegramTemplateSearch: string;
  telegramTodoDoneMap: Record<string, boolean>;
  telegramTodoSummary: TelegramTodoSummary;
  telegramTodoTopItems: TelegramTodoEntry[];
  telegramTokenValue: string;
  telegramUsernameValue: string;
  telegramسراسریCompletionPercent: number;
  telegramسراسریSummary: TelegramGlobalSummary;
  tgAudienceMeta: Record<TelegramAudience, TelegramAudienceMeta>;
  tgCategoryMeta: Record<string, TelegramCategoryMeta>;
  tgChatLookupHint: React.ReactNode;
  tgChatLookupLoading: boolean;
  tgDiagnostics: TelegramDiagnosticsState | null;
  tgDiagnosticsBusyAction: string | null;
  tgDiagnosticsLoading: boolean;
  tgHealth: TelegramHealthState | null;
  tgIsChecking: boolean;
  tgIsSendingQuick: boolean;
  tgQuickMsg: string;
  tgRecentChats: TelegramRecentChat[];
  visibleTelegramItemsCount: number;
  openTelegramAudiencePanels: Record<string, boolean>;
  openTelegramCategories: Record<string, boolean>;
  openTelegramItems: Record<string, boolean>;
  openUrgentTelegramTodos: () => void;
  filteredTelegramGroupedDefs: TelegramGroupedTemplateDefs;

  handleBusinessInfoSubmit: (event?: React.FormEvent) => void | Promise<void>;
  handleBusinessInfoChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  setBusinessInfo: React.Dispatch<React.SetStateAction<BusinessInformationSettings>>;
  setNotification: React.Dispatch<React.SetStateAction<NotificationMessage | null>>;
  applyTelegramAiSuggestion: (itemKey: string, audience: TelegramAudience, value?: string) => void;
  applyTelegramPreset: (itemKey: string, audience: TelegramAudience) => void;
  buildTelegramAudiencePreset: (itemKey: string, audience: TelegramAudience) => string;
  bumpTelegramQuickActionUsage: (actionKey: string) => void;
  checkTelegramHealth: () => void | Promise<void>;
  clearTelegramStudioFilters: () => void;
  deferTelegramTodo: (itemKey: string) => void;
  fetchTelegramRecentChats: () => void | Promise<void>;
  focusTelegramAudience: (itemKey: string, audience: TelegramAudience) => void;
  getTelegramAiAssistantCopy: (entry: TelegramTodoEntry | { item: TelegramTemplateDef; priority: { label: string; level: number }; firstMissing?: { aud: TelegramAudience } | null; suggestedPreset?: string; aiConfidence: number; deferredUntil?: string | null }) => React.ReactNode;
  getTelegramAudienceFormatKey: (itemKey: string, audience: TelegramAudience) => string;
  getTelegramAudienceKey: (itemKey: string, audience: TelegramAudience) => string;
  getTelegramCategoryStatus: (items: TelegramTemplateDef[]) => TelegramCategoryStatus;
  getTelegramItemStatus: (itemKey: string) => TelegramItemStatus;
  getTelegramMiniStatusClasses: (tone: 'emerald' | 'rose' | 'amber' | 'slate' | 'sky') => string;
  getTelegramPriorityMeta: (itemKey: string) => TelegramPriorityMeta;
  getTelegramProgressTone: (ratio: number) => TelegramProgressTone;
  getTelegramTodoNextStep: (entry: TelegramTodoEntry) => React.ReactNode;
  jumpToFirstIncompleteTelegramTemplate: () => void;
  jumpToTelegramConfigField: (targetId: string) => void;
  jumpToTelegramSection: (sectionId: string) => void;
  jumpToTelegramSetupField: (fieldId: string) => void;
  jumpToTelegramTemplate: (itemKey: string, audience?: TelegramAudience) => void;
  markTelegramTodoDone: (itemKey: string) => void;
  openSmsPatternCheck: (title: string, bodyId: string, tokenLabels: string[]) => void;
  openTelegramTemplateCheck: (title: string, template: string, format?: TelegramMessageFormat, allowedVars?: TelegramTemplateVariable[], audience?: TelegramAudience) => void;
  reactivateTelegramTodo: (itemKey: string) => void;
  renderTelegramFieldLabel: (label: string, insight: TelegramFieldInsight & { target: string; tone: 'emerald' | 'rose' | 'amber' | 'slate' | 'sky' }, icon?: string) => React.ReactNode;
  renderTelegramPlainFieldLabel: (label: string, icon: string) => React.ReactNode;
  resetTelegramQuickActionPersonalization: () => void;
  resetTelegramTodoAssistant: () => void;
  runTelegramAdminAction: (action: 'enable-polling' | 'reset-bot-menu' | 'send-guest-menu-test' | 'send-real-menu' | 'send-customer-menu' | 'send-partner-menu') => void | Promise<void>;
  runTelegramDiagnostics: () => void | Promise<void>;
  sendTelegramQuickCheck: () => void | Promise<void>;
  toggleTelegramAudiencePanel: (panelKey: string) => void;
  toggleTelegramCategory: (category: string) => void;
  toggleTelegramItem: (itemKey: string) => void;
  toggleTelegramQuickActionPin: (actionKey: string) => void;

  setAllTelegramCategories: (isOpen: boolean) => void;
  setAllTelegramItems: (isOpen: boolean) => void;
  setOpenTelegramItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowTelegramToken: React.Dispatch<React.SetStateAction<boolean>>;
  setTelegramStudioMode: React.Dispatch<React.SetStateAction<'quick' | 'all' | 'incomplete' | 'todo'>>;
  setTelegramTemplateFilter: React.Dispatch<React.SetStateAction<'all' | 'configured' | 'incomplete'>>;
  setTelegramTemplateSearch: React.Dispatch<React.SetStateAction<string>>;
  setTgQuickMsg: React.Dispatch<React.SetStateAction<string>>;
};

export type UserStatsCard = { label: string; value: string; icon: string; tone: string };
export type UserRoleSummary = { roleName: string; count: number };

export type SettingsUsersPanelProps = {
  tab: string;
  userStatsCards: UserStatsCard[];
  labelClass: string;
  inputClass: string;
  userSearchQuery: string;
  setUserSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  userRoleFilter: string;
  setUserRoleFilter: React.Dispatch<React.SetStateAction<string>>;
  roles: Role[];
  users: UserForDisplay[];
  filteredUsers: UserForDisplay[];
  userRoleSummaries: UserRoleSummary[];
  openAddUserModal: () => void;
  fetchData: () => void | Promise<void>;
  getRoleLabelFa: (roleName?: string | null) => string;
  openEditUserModal: (user: UserForDisplay) => void;
  openResetPasswordModal: (user: UserForDisplay) => void;
  openDeleteUserModal: (user: UserForDisplay) => void;
};

export type ResetPasswordData = {
  password: string;
  confirmPassword: string;
};

export type SettingsUsersModalsProps = {
  isAddUserModalOpen: boolean;
  setIsAddUserModalOpen: Dispatch<SetStateAction<boolean>>;
  newUser: NewUserFormData;
  addUserFormErrors: Partial<NewUserFormData>;
  handleNewUserChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleNewUserSubmit: (e: FormEvent) => void | Promise<void>;
  roles: Role[];
  getRoleLabelFa: (roleName?: string | null) => string;
  isSavingUser: boolean;

  isEditUserModalOpen: boolean;
  setIsEditUserModalOpen: Dispatch<SetStateAction<boolean>>;
  editingUser: EditUserFormData | null;
  handleEditUserChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleEditUserSubmit: (e: FormEvent) => void | Promise<void>;
  isUpdatingUser: boolean;

  isResetPasswordModalOpen: boolean;
  setIsResetPasswordModalOpen: Dispatch<SetStateAction<boolean>>;
  resettingUser: UserForDisplay | null;
  resetPasswordData: ResetPasswordData;
  resetPasswordErrors: Partial<ResetPasswordData>;
  setResetPasswordData: Dispatch<SetStateAction<ResetPasswordData>>;
  handleResetPasswordSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmittingReset: boolean;

  isDeleteUserModalOpen: boolean;
  setIsDeleteUserModalOpen: Dispatch<SetStateAction<boolean>>;
  deletingUser: UserForDisplay | null;
  handleDeleteUser: () => void | Promise<void>;
  isDeletingUser: boolean;
};
