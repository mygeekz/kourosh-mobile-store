import type { Express } from "express";
import { registerSmsDiagnosticsRoutes } from "./smsDiagnostics.routes";
import { registerNotificationOutboxRoutes } from "./notificationOutbox.routes";
import { registerTelegramInboxRoutes } from "./telegramInbox.routes";
import { registerReminderRulesRoutes } from "./reminderRules.routes";
import { registerReminderRuntimeRoutes } from "./reminderRuntime.routes";
import { registerTelegramControlRoutes } from "./telegramControl.routes";
import { registerTelegramTopicConfigRoutes } from "./telegramTopicConfig.routes";
import { registerTelegramRuntimeRoutes } from "./telegramRuntime.routes";
import { registerTelegramWebhookRoutes } from "./telegramWebhook.routes";
import { registerTelegramAdminRoutes } from "./telegramAdmin.routes";
import { registerTelegramLinkingRoutes } from "./telegramLinking.routes";
import { registerTelegramCustomerActionsRoutes } from "./telegramCustomerActions.routes";
import { registerRepairsRoutes } from "./repairs.routes";
import { registerServicesRoutes } from "./services.routes";
import { registerUploadRoutes } from "./upload.routes";
import { registerModularRoutes } from "./index";
import { registerAdminBackupRoutes } from "./backup.routes";
import upload from "../upload";

type AnyFn = (...args: any[]) => any;

export function registerSmsDiagnosticsAppRoutes(
  app: Express,
  deps: {
    authorizeRole: AnyFn;
    insertSmsLog: AnyFn;
    makeCorrId: AnyFn;
  },
): void {
  registerSmsDiagnosticsRoutes(app, {
    authorizeRole: deps.authorizeRole,
    insertSmsLog: deps.insertSmsLog,
    makeCorrId: deps.makeCorrId,
  });
}

export function registerNotificationQueueRoutes(
  app: Express,
  deps: {
    authorizeRole: AnyFn;
    ensureNotificationOutboxTables: AnyFn;
    ensureTelegramInboxTable: AnyFn;
    ensureCustomerTelegramColumns: AnyFn;
    processOneOutboxRow: AnyFn;
    lookupCustomerTelegramChatId: AnyFn;
    lookupPartnerTelegramChatId: AnyFn;
    trySendTelegramMediaNow: AnyFn;
    trySendTelegramNow: AnyFn;
    insertSmsLog: AnyFn;
    enqueueOutbox: AnyFn;
    tryDeliverQueuedTelegramNow: AnyFn;
  },
): void {
  registerNotificationOutboxRoutes(app, {
    authorizeRole: deps.authorizeRole,
    ensureNotificationOutboxTables: deps.ensureNotificationOutboxTables,
    processOneOutboxRow: deps.processOneOutboxRow,
    lookupCustomerTelegramChatId: deps.lookupCustomerTelegramChatId,
    lookupPartnerTelegramChatId: deps.lookupPartnerTelegramChatId,
    trySendTelegramMediaNow: deps.trySendTelegramMediaNow,
    trySendTelegramNow: deps.trySendTelegramNow,
    insertSmsLog: deps.insertSmsLog,
    enqueueOutbox: deps.enqueueOutbox,
    tryDeliverQueuedTelegramNow: deps.tryDeliverQueuedTelegramNow,
  });

  registerTelegramInboxRoutes(app, {
    authorizeRole: deps.authorizeRole,
    ensureTelegramInboxTable: deps.ensureTelegramInboxTable,
    ensureNotificationOutboxTables: deps.ensureNotificationOutboxTables,
    ensureCustomerTelegramColumns: deps.ensureCustomerTelegramColumns,
  });

  registerReminderRulesRoutes(app, { authorizeRole: deps.authorizeRole });
}

export function registerTelegramOperationalRoutes(
  app: Express,
  deps: {
    authorizeRole: AnyFn;
    runAutoSendRulesOnce: AnyFn;
    runCustomerTelegramNotificationsTick: AnyFn;
    processOneOutboxRow: AnyFn;
    insertSmsLog: AnyFn;
    inferEntityTypeFromEvent: AnyFn;
    formatPriceForSms: AnyFn;
    sanitizeTelegramHtml: AnyFn;
    renderTplHtml: AnyFn;
    markdownishToHtml: AnyFn;
    makeCorrId: AnyFn;
    ensureTelegramInboxTable: AnyFn;
    ensureNotificationOutboxTables: AnyFn;
    ensureCustomerTelegramColumns: AnyFn;
    getExistingCustomerColumns: AnyFn;
    buildCustomerTelegramLinkedWhereSql: AnyFn;
    getTelegramProxyAgentFromSettings: AnyFn;
    getTelegramTargetsForTopic: AnyFn;
    telegramCard: AnyFn;
    stripTags: AnyFn;
    handleTelegramUpdate: AnyFn;
    getPollingState: AnyFn;
    resetPollingStarted: AnyFn;
    startTelegramPolling: AnyFn;
    resetTelegramCommandMenu: AnyFn;
    ensureTelegramPersistentMenu: AnyFn;
    sendBotMessage: AnyFn;
    buildContactKeyboard: AnyFn;
    tryDeliverQueuedTelegramNow: AnyFn;
    enqueueOutbox: AnyFn;
    addAuditLog: AnyFn;
    notifyCustomer: AnyFn;
  },
): void {
  registerReminderRuntimeRoutes(app, {
    authorizeRole: deps.authorizeRole,
    runAutoSendRulesOnce: deps.runAutoSendRulesOnce,
    runCustomerTelegramNotificationsTick: deps.runCustomerTelegramNotificationsTick,
    processOneOutboxRow: deps.processOneOutboxRow,
    insertSmsLog: deps.insertSmsLog,
    inferEntityTypeFromEvent: deps.inferEntityTypeFromEvent,
    formatPriceForSms: deps.formatPriceForSms,
    sanitizeTelegramHtml: deps.sanitizeTelegramHtml,
    renderTplHtml: deps.renderTplHtml,
    markdownishToHtml: deps.markdownishToHtml,
    makeCorrId: deps.makeCorrId,
  });

  registerTelegramControlRoutes(app, {
    authorizeRole: deps.authorizeRole,
    ensureTelegramInboxTable: deps.ensureTelegramInboxTable,
    ensureNotificationOutboxTables: deps.ensureNotificationOutboxTables,
    ensureCustomerTelegramColumns: deps.ensureCustomerTelegramColumns,
    getExistingCustomerColumns: deps.getExistingCustomerColumns,
    buildCustomerTelegramLinkedWhereSql: deps.buildCustomerTelegramLinkedWhereSql,
    getTelegramProxyAgentFromSettings: deps.getTelegramProxyAgentFromSettings,
    insertSmsLog: deps.insertSmsLog,
  });

  registerTelegramTopicConfigRoutes(app, {
    authorizeRole: deps.authorizeRole,
    getTelegramTargetsForTopic: deps.getTelegramTargetsForTopic,
    sanitizeTelegramHtml: deps.sanitizeTelegramHtml,
    markdownishToHtml: deps.markdownishToHtml,
  });

  registerTelegramRuntimeRoutes(app, {
    authorizeRole: deps.authorizeRole,
    insertSmsLog: deps.insertSmsLog,
    inferEntityTypeFromEvent: deps.inferEntityTypeFromEvent,
    formatPriceForSms: deps.formatPriceForSms,
    sanitizeTelegramHtml: deps.sanitizeTelegramHtml,
    renderTplHtml: deps.renderTplHtml,
    markdownishToHtml: deps.markdownishToHtml,
    telegramCard: deps.telegramCard,
    stripTags: deps.stripTags,
    makeCorrId: deps.makeCorrId,
  });

  registerTelegramWebhookRoutes(app, {
    handleTelegramUpdate: deps.handleTelegramUpdate,
  });

  registerTelegramAdminRoutes(app, {
    authorizeRole: deps.authorizeRole,
    getPollingState: deps.getPollingState,
    resetPollingStarted: deps.resetPollingStarted,
    startTelegramPolling: deps.startTelegramPolling,
    resetTelegramCommandMenu: deps.resetTelegramCommandMenu,
    ensureTelegramPersistentMenu: deps.ensureTelegramPersistentMenu,
    sendBotMessage: deps.sendBotMessage,
    telegramCard: deps.telegramCard,
    buildContactKeyboard: deps.buildContactKeyboard,
    handleTelegramUpdate: deps.handleTelegramUpdate,
  });

  registerTelegramLinkingRoutes(app, {
    authorizeRole: deps.authorizeRole,
  });

  registerTelegramCustomerActionsRoutes(app, {
    authorizeRole: deps.authorizeRole,
    ensureNotificationOutboxTables: deps.ensureNotificationOutboxTables,
    ensureCustomerTelegramColumns: deps.ensureCustomerTelegramColumns,
    tryDeliverQueuedTelegramNow: deps.tryDeliverQueuedTelegramNow,
    enqueueOutbox: deps.enqueueOutbox,
    addAuditLog: deps.addAuditLog,
    sanitizeTelegramHtml: deps.sanitizeTelegramHtml,
    stripTags: deps.stripTags,
    telegramCard: deps.telegramCard,
    markdownishToHtml: deps.markdownishToHtml,
    upload,
  });

  registerRepairsRoutes(app, {
    authorizeRole: deps.authorizeRole,
    notifyCustomer: (...args: any[]) => deps.notifyCustomer(...args),
  });
  registerServicesRoutes(app, { authorizeRole: deps.authorizeRole });
  registerUploadRoutes(app);

  // These routes must remain before the terminal 404 handler.
  registerModularRoutes(app);
  registerAdminBackupRoutes(app, { authorizeRole: deps.authorizeRole });
}
