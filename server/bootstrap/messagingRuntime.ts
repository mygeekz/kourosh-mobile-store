import type { Express, RequestHandler } from "express";
import { createTelegramUpdateHandler } from "./telegramUpdateHandler";
import { createTelegramUpdateIngress } from "../telegram/telegramUpdateSource";
import {
  registerNotificationQueueRoutes,
  registerSmsDiagnosticsAppRoutes,
  registerTelegramOperationalRoutes,
} from "../routes/messagingRouteRegistry";
import { createTelegramPollingRuntime } from "../utils/telegramPollingRuntime";
import { createTelegramAudienceLookupHelpers } from "../utils/telegramAudienceHelpers";
import { createCustomerTelegramValidityHelpers } from "../utils/telegramRuntimeHelpers";
import { createNotificationOutboxRuntime } from "../utils/notificationOutboxRuntime";
import { createCustomerTelegramNotificationsRuntime } from "../utils/customerTelegramNotifications";
import { createTelegramEventNotificationRuntime } from "../utils/telegramEventNotificationRuntime";
import { redeemPartnerTelegramLink, redeemStaffTelegramLink } from "../services/telegramIdentitySecurity.service";

type JsonRecord = Record<string, unknown>;
type AnyAsyncFn = (...args: any[]) => Promise<any>;
type AnySyncOrAsyncFn = (...args: any[]) => any;

type AuthorizeRole = (allowedRoles: string[]) => RequestHandler;

export type TelegramNotificationTopic =
  | "reports"
  | "installments"
  | "sales"
  | "notifications";

export type TelegramTopicNotificationMeta = {
  entityType?: string;
  entityId?: number;
};

export type CustomerNotificationMode = "sms" | "telegram" | "both";

export type CustomerNotificationEventType =
  | "INSTALLMENT_SALE_CREATED"
  | "INSTALLMENT_DUE_NOTICE"
  | "INSTALLMENT_PAYMENT_RECEIVED"
  | "INSTALLMENT_SETTLED"
  | "INSTALLMENT_OVERDUE_NOTICE"
  | "REPAIR_RECEIVED_CONFIRMATION"
  | "REPAIR_COST_ESTIMATED"
  | "REPAIR_DELIVERED"
  | "REPAIR_STATUS_UPDATED"
  | "ACCOUNT_BALANCE_STATUS"
  | "CHECK_FAILED"
  | "INVOICE_CREATED"
  | "INVOICE_PAYMENT_RECEIVED";

export type NotifyCustomer = (
  eventType: CustomerNotificationEventType,
  targetId: number,
  mode?: CustomerNotificationMode,
  extra?: JsonRecord,
) => Promise<unknown>;

export type EnqueueTelegramToTopicTargets = (
  topic: TelegramNotificationTopic,
  typeKey: string,
  text: string,
  meta?: TelegramTopicNotificationMeta,
) => Promise<void> | void;

export type GetTelegramTargetsForTopic = (
  topic: TelegramNotificationTopic,
) => Promise<{ botToken: string; chatIds: string[] }>;

export type IsTopicTypeEnabled = (
  topic: TelegramNotificationTopic,
  typeKey: string,
) => Promise<boolean>;

export interface MessagingRuntimeDeps {
  getAllSettingsAsObject: () => Promise<JsonRecord>;
  setTelegramProxy: (proxy?: string | null) => void;
  callTelegramBotApi: (
    botToken: string,
    method: string,
    payload?: JsonRecord,
    transportOptions?: { timeoutMs?: number },
  ) => Promise<unknown>;
  resetTelegramCommandMenu: (botToken: string) => Promise<unknown>;
  updateSetting: (key: string, value: string) => Promise<unknown>;
  telegramLog: (message: string, meta?: JsonRecord) => void;
  getTelegramProxyAgentFromSettings: (settings: JsonRecord) => unknown;
  authorizeRole: AuthorizeRole;
  insertSmsLog: AnyAsyncFn;
  makeCorrId: AnySyncOrAsyncFn;
  ensureCustomerTelegramColumns: AnyAsyncFn;
  getAsync: AnyAsyncFn;
  allAsync: AnyAsyncFn;
  runAsync: AnyAsyncFn;
  ensureNotificationOutboxTables: AnyAsyncFn;
  ensureReminderRulesTables: AnyAsyncFn;
  hasCustomerDailyCap: AnyAsyncFn;
  hasPendingCustomerCapInOutbox: AnyAsyncFn;
  computeNextAllowedTelegramSendISOFromHours: AnySyncOrAsyncFn;
  computeNextAllowedTelegramSendISO: AnySyncOrAsyncFn;
  classifyTelegramError: AnySyncOrAsyncFn;
  computeNextAttemptISO: AnySyncOrAsyncFn;
  ensureTelegramInboxTable: AnyAsyncFn;
  getOverdueInstallmentsFromDb: AnyAsyncFn;
  getReminderConfig: AnyAsyncFn;
  getEnabledReminderRules: AnyAsyncFn;
  reminderTargetsInstallments: (rule: any) => boolean;
  reminderTargetsChecks: (rule: any) => boolean;
  getPendingInstallmentChecksWithCustomer: AnyAsyncFn;
  buildTelegramDeepLinkKeyboard: AnySyncOrAsyncFn;
  parseChatIdList: AnySyncOrAsyncFn;
  getInstallmentPaymentDetailsForSms: AnyAsyncFn;
  getInstallmentCheckDetailsForSms: AnyAsyncFn;
  getPendingInstallmentPaymentsWithCustomer: AnyAsyncFn;
  getRepairsReadyForPickupFromDb: AnyAsyncFn;
  getRepairDetailsForSms: AnyAsyncFn;
  formatPriceForSms: AnySyncOrAsyncFn;
  buildAppLink: AnySyncOrAsyncFn;
  safeReplaceTemplate: AnySyncOrAsyncFn;
  getTelegramTemplateForAudience: AnySyncOrAsyncFn;
  normalizeTelegramParseMode: AnySyncOrAsyncFn;
  sendTelegramMessages: AnyAsyncFn;
  normalizeAutoSendMode: AnySyncOrAsyncFn;
  inferEntityTypeFromEvent: AnySyncOrAsyncFn;
  sanitizeTelegramHtml: AnySyncOrAsyncFn;
  renderTplHtml: AnySyncOrAsyncFn;
  markdownishToHtml: AnySyncOrAsyncFn;
  getExistingCustomerColumns: AnyAsyncFn;
  buildCustomerTelegramLinkedWhereSql: AnySyncOrAsyncFn;
  telegramCard: AnySyncOrAsyncFn;
  stripTags: AnySyncOrAsyncFn;
  ensureTelegramPersistentMenu: AnyAsyncFn;
  sendBotMessage: AnyAsyncFn;
  buildContactKeyboard: AnySyncOrAsyncFn;
  addAuditLog: AnyAsyncFn;
}

export interface MessagingRuntime {
  autoConfigureTelegramUpdateMode: () => Promise<unknown>;
  enqueueEventNotifications: AnyAsyncFn;
  enqueueTelegramToTopicTargets: EnqueueTelegramToTopicTargets;
  getTelegramTargetsForTopic: GetTelegramTargetsForTopic;
  isTopicTypeEnabled: IsTopicTypeEnabled;
  sendCustomCustomerNotification: NotifyCustomer;
  startAutoSendScheduler: AnySyncOrAsyncFn;
  startCustomerTelegramNotifyScheduler: AnySyncOrAsyncFn;
  startOutboxWorker: AnySyncOrAsyncFn;
  startTelegramPolling: AnyAsyncFn;
}

export function registerMessagingRuntime(
  app: Express,
  deps: MessagingRuntimeDeps,
): MessagingRuntime {
  // =====================================================
  // Telegram Bot Webhook/Polling Update Handler
  // =====================================================
  const telegramBusinessUpdateHandler = createTelegramUpdateHandler({
    trySendSmsNow: (payload: unknown) => trySendSmsNow(payload),
    securityLinking: {
      redeemPartner: redeemPartnerTelegramLink,
      redeemStaff: redeemStaffTelegramLink,
    },
    sendSecurityMessage: (chatId, text) => deps.sendBotMessage(chatId, text),
  });
  const telegramUpdateIngress = createTelegramUpdateIngress(telegramBusinessUpdateHandler);
  // Webhook and polling remain operationally unchanged; only their ingress is normalized.
  // Future Cloud Relay can use fromCloudRelay without exposing source details to business logic.
  const handleTelegramUpdate = telegramUpdateIngress.fromWebhook;

  const telegramPollingRuntime = createTelegramPollingRuntime({
    getAllSettingsAsObject: deps.getAllSettingsAsObject,
    setTelegramProxy: deps.setTelegramProxy,
    callTelegramBotApi: deps.callTelegramBotApi,
    resetTelegramCommandMenu: deps.resetTelegramCommandMenu,
    updateSetting: deps.updateSetting,
    telegramLog: deps.telegramLog,
    getTelegramProxyAgentFromSettings: deps.getTelegramProxyAgentFromSettings,
    handleTelegramUpdate: telegramUpdateIngress.fromPolling,
    shouldLogExternalErrors:
      String(process.env.NODE_ENV || "").trim() === "production" &&
      String(process.env.EXTERNAL_SERVICE_LOGS || "").trim() === "1",
  });
  const autoConfigureTelegramUpdateMode =
    telegramPollingRuntime.autoConfigureTelegramUpdateMode;
  const startTelegramPolling = telegramPollingRuntime.startTelegramPolling;

  // =====================================================
  // 16) پیامک رویدادی
  // =====================================================
  registerSmsDiagnosticsAppRoutes(app, {
    authorizeRole: deps.authorizeRole,
    insertSmsLog: deps.insertSmsLog,
    makeCorrId: deps.makeCorrId,
  });

  // =====================================================
  // Notification Outbox (Queue/Retry) + Auto-Send Rules
  // =====================================================
  // =====================================================
  // Telegram Inbox (Webhook/Polling received messages)
  // =====================================================
  const { lookupCustomerTelegramChatId, lookupPartnerTelegramChatId } =
    createTelegramAudienceLookupHelpers({
      ensureCustomerTelegramColumns: deps.ensureCustomerTelegramColumns,
      getAsync: deps.getAsync,
      allAsync: deps.allAsync,
    });
  const { ensureCustomerIsNotInvalid, markCustomerTelegramInvalid } =
    createCustomerTelegramValidityHelpers({
      ensureCustomerTelegramColumns: deps.ensureCustomerTelegramColumns,
      getAsync: deps.getAsync,
      runAsync: deps.runAsync,
    });
  const notificationOutboxRuntime = createNotificationOutboxRuntime({
    ensureNotificationOutboxTables: deps.ensureNotificationOutboxTables,
    ensureReminderRulesTables: deps.ensureReminderRulesTables,
    getAllSettingsAsObject: deps.getAllSettingsAsObject,
    getAsync: deps.getAsync,
    runAsync: deps.runAsync,
    hasCustomerDailyCap: deps.hasCustomerDailyCap,
    hasPendingCustomerCapInOutbox: deps.hasPendingCustomerCapInOutbox,
    ensureCustomerIsNotInvalid,
    markCustomerTelegramInvalid,
    computeNextAllowedTelegramSendISOFromHours:
      deps.computeNextAllowedTelegramSendISOFromHours,
    computeNextAllowedTelegramSendISO: deps.computeNextAllowedTelegramSendISO,
    classifyTelegramError: deps.classifyTelegramError,
    computeNextAttemptISO: deps.computeNextAttemptISO,
    lookupCustomerTelegramChatId,
    lookupPartnerTelegramChatId,
  });
  const {
    enqueueOutbox,
    trySendTelegramNow,
    trySendTelegramMediaNow,
    trySendSmsNow,
    tryDeliverQueuedTelegramNow,
    processOneOutboxRow,
    startOutboxWorker,
  } = notificationOutboxRuntime;

  registerNotificationQueueRoutes(app, {
    authorizeRole: deps.authorizeRole,
    ensureNotificationOutboxTables: deps.ensureNotificationOutboxTables,
    ensureTelegramInboxTable: deps.ensureTelegramInboxTable,
    ensureCustomerTelegramColumns: deps.ensureCustomerTelegramColumns,
    processOneOutboxRow,
    lookupCustomerTelegramChatId,
    lookupPartnerTelegramChatId,
    trySendTelegramMediaNow,
    trySendTelegramNow,
    insertSmsLog: deps.insertSmsLog,
    enqueueOutbox,
    tryDeliverQueuedTelegramNow,
  });

  // -----------------------------------------------------
  // Auto-send rules (daily 09:00) - SMS / Telegram / Both
  // Keys in settings: auto_send_installment_due, auto_send_check_due, auto_send_repair_ready
  // Values: off | sms | telegram | both
  // -----------------------------------------------------
  /**
   * -----------------------------------------------------
   * Customer Telegram Notifications (Installments + Repairs)
   * - SMS is only used for OTP verification (linking).
   * - All ongoing reminders are sent via Telegram to the linked customer chat_id.
   * - Uses notification_outbox + daily dedupe to avoid spam.
   * -----------------------------------------------------
   */
  const {
    runCustomerTelegramNotificationsTick,
    startCustomerTelegramNotifyScheduler,
  } = createCustomerTelegramNotificationsRuntime({
    getAllSettingsAsObject: deps.getAllSettingsAsObject,
    runAsync: deps.runAsync,
    getOverdueInstallmentsFromDb: deps.getOverdueInstallmentsFromDb,
    ensureReminderRulesTables: deps.ensureReminderRulesTables,
    getReminderConfig: deps.getReminderConfig,
    getEnabledReminderRules: deps.getEnabledReminderRules,
    hasCustomerDailyCap: deps.hasCustomerDailyCap,
    hasPendingCustomerCapInOutbox: deps.hasPendingCustomerCapInOutbox,
    reminderTargetsInstallments: deps.reminderTargetsInstallments,
    reminderTargetsChecks: deps.reminderTargetsChecks,
    getPendingInstallmentChecksWithCustomer:
      deps.getPendingInstallmentChecksWithCustomer,
    allAsync: deps.allAsync,
    getAsync: deps.getAsync,
    enqueueOutbox,
    buildTelegramDeepLinkKeyboard: deps.buildTelegramDeepLinkKeyboard,
    processOneOutboxRow,
  });

  const telegramEventNotificationRuntime = createTelegramEventNotificationRuntime({
    getAllSettingsAsObject: deps.getAllSettingsAsObject,
    setTelegramProxy: deps.setTelegramProxy,
    parseChatIdList: deps.parseChatIdList,
    enqueueOutbox,
    getInstallmentPaymentDetailsForSms: deps.getInstallmentPaymentDetailsForSms,
    getInstallmentCheckDetailsForSms: deps.getInstallmentCheckDetailsForSms,
    getPendingInstallmentPaymentsWithCustomer:
      deps.getPendingInstallmentPaymentsWithCustomer,
    getPendingInstallmentChecksWithCustomer:
      deps.getPendingInstallmentChecksWithCustomer,
    getRepairsReadyForPickupFromDb: deps.getRepairsReadyForPickupFromDb,
    getRepairDetailsForSms: deps.getRepairDetailsForSms,
    getAsync: deps.getAsync,
    formatPriceForSms: deps.formatPriceForSms,
    buildAppLink: deps.buildAppLink,
    buildTelegramDeepLinkKeyboard: deps.buildTelegramDeepLinkKeyboard,
    safeReplaceTemplate: deps.safeReplaceTemplate,
    getTelegramTemplateForAudience: deps.getTelegramTemplateForAudience,
    normalizeTelegramParseMode: deps.normalizeTelegramParseMode,
    sendTelegramMessages: deps.sendTelegramMessages,
    normalizeAutoSendMode: deps.normalizeAutoSendMode,
    ensureReminderRulesTables: deps.ensureReminderRulesTables,
    getEnabledReminderRules: deps.getEnabledReminderRules,
    runCustomerTelegramNotificationsTick,
    processOneOutboxRow,
  });
  const {
    getTelegramTargetsForTopic,
    isTopicTypeEnabled,
    enqueueEventNotifications,
    enqueueTelegramToTopicTargets,
    sendCustomCustomerNotification,
    runAutoSendRulesOnce,
    startAutoSendScheduler,
  } = telegramEventNotificationRuntime;

  registerTelegramOperationalRoutes(app, {
    authorizeRole: deps.authorizeRole,
    runAutoSendRulesOnce,
    runCustomerTelegramNotificationsTick,
    processOneOutboxRow,
    insertSmsLog: deps.insertSmsLog,
    inferEntityTypeFromEvent: deps.inferEntityTypeFromEvent,
    formatPriceForSms: deps.formatPriceForSms,
    sanitizeTelegramHtml: deps.sanitizeTelegramHtml,
    renderTplHtml: deps.renderTplHtml,
    markdownishToHtml: deps.markdownishToHtml,
    makeCorrId: deps.makeCorrId,
    ensureTelegramInboxTable: deps.ensureTelegramInboxTable,
    ensureNotificationOutboxTables: deps.ensureNotificationOutboxTables,
    ensureCustomerTelegramColumns: deps.ensureCustomerTelegramColumns,
    getExistingCustomerColumns: deps.getExistingCustomerColumns,
    buildCustomerTelegramLinkedWhereSql: deps.buildCustomerTelegramLinkedWhereSql,
    getTelegramProxyAgentFromSettings: deps.getTelegramProxyAgentFromSettings,
    getTelegramTargetsForTopic,
    telegramCard: deps.telegramCard,
    stripTags: deps.stripTags,
    handleTelegramUpdate,
    getPollingState: telegramPollingRuntime.getPollingState,
    resetPollingStarted: telegramPollingRuntime.resetPollingStarted,
    startTelegramPolling,
    resetTelegramCommandMenu: deps.resetTelegramCommandMenu,
    ensureTelegramPersistentMenu: deps.ensureTelegramPersistentMenu,
    sendBotMessage: deps.sendBotMessage,
    buildContactKeyboard: deps.buildContactKeyboard,
    tryDeliverQueuedTelegramNow,
    enqueueOutbox,
    addAuditLog: deps.addAuditLog,
    notifyCustomer: sendCustomCustomerNotification,
  });

  return {
    autoConfigureTelegramUpdateMode,
    enqueueEventNotifications,
    enqueueTelegramToTopicTargets,
    getTelegramTargetsForTopic,
    isTopicTypeEnabled,
    sendCustomCustomerNotification,
    startAutoSendScheduler,
    startCustomerTelegramNotifyScheduler,
    startOutboxWorker,
    startTelegramPolling,
  };
}
