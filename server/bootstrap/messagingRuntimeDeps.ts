import { formatPriceForSms } from "./coreBusinessRuntime";
import {
  ensureReminderRulesTables,
  getReminderConfig,
  getEnabledReminderRules,
  reminderTargetsInstallments,
  reminderTargetsChecks,
  hasCustomerDailyCap,
  hasPendingCustomerCapInOutbox,
} from "../utils/reminderRuntimeHelpers";
import { insertSmsLog, inferEntityTypeFromEvent } from "../utils/smsLogHelpers";
import {
  buildAppLink,
  buildTelegramDeepLinkKeyboard,
  safeReplaceTemplate,
} from "../utils/telegramDeepLinkHelpers";
import {
  makeCorrId,
  sanitizeTelegramHtml,
  stripTags,
  renderTplHtml,
  markdownishToHtml,
  telegramCard,
} from "../utils/messagingFormatters";
import {
  buildContactKeyboard,
  getTelegramProxyAgentFromSettings,
  sendBotMessage,
  telegramLog,
  resetTelegramCommandMenu,
  ensureTelegramPersistentMenu,
} from "../utils/telegramBotHelpers";
import {
  normalizeAutoSendMode,
  computeNextAllowedTelegramSendISO,
  computeNextAllowedTelegramSendISOFromHours,
  classifyTelegramError,
} from "../utils/telegramRuntimeHelpers";
import {
  ensureNotificationOutboxTables,
  ensureTelegramInboxTable,
  ensureCustomerTelegramColumns,
  getExistingCustomerColumns,
  buildCustomerTelegramLinkedWhereSql,
} from "../utils/notificationSchemaHelpers";
import {
  computeNextAttemptISO,
  getTelegramTemplateForAudience,
  normalizeTelegramParseMode,
} from "../utils/telegramAudienceHelpers";
import {
  addAuditLog,
  allAsync,
  getAllSettingsAsObject,
  getAsync,
  getInstallmentCheckDetailsForSms,
  getInstallmentPaymentDetailsForSms,
  getOverdueInstallmentsFromDb,
  getPendingInstallmentChecksWithCustomer,
  getPendingInstallmentPaymentsWithCustomer,
  getRepairsReadyForPickupFromDb,
  getRepairDetailsForSms,
  runAsync,
  updateSetting,
} from "../database";
import {
  sendTelegramMessages,
  parseChatIdList,
  setTelegramProxy,
  callTelegramBotApi,
} from "../telegramService";
import { authorizeRole } from "../utils/sessionAuth";
import type { MessagingRuntimeDeps } from "./messagingRuntime";

export function buildMessagingRuntimeDeps(): MessagingRuntimeDeps {
  return {
    getAllSettingsAsObject,
    setTelegramProxy,
    callTelegramBotApi,
    resetTelegramCommandMenu,
    updateSetting,
    telegramLog,
    getTelegramProxyAgentFromSettings,
    authorizeRole,
    insertSmsLog,
    makeCorrId,
    ensureCustomerTelegramColumns,
    getAsync,
    allAsync,
    runAsync,
    ensureNotificationOutboxTables,
    ensureReminderRulesTables,
    hasCustomerDailyCap,
    hasPendingCustomerCapInOutbox,
    computeNextAllowedTelegramSendISOFromHours,
    computeNextAllowedTelegramSendISO,
    classifyTelegramError,
    computeNextAttemptISO,
    ensureTelegramInboxTable,
    getOverdueInstallmentsFromDb,
    getReminderConfig,
    getEnabledReminderRules,
    reminderTargetsInstallments,
    reminderTargetsChecks,
    getPendingInstallmentChecksWithCustomer,
    buildTelegramDeepLinkKeyboard,
    parseChatIdList,
    getInstallmentPaymentDetailsForSms,
    getInstallmentCheckDetailsForSms,
    getPendingInstallmentPaymentsWithCustomer,
    getRepairsReadyForPickupFromDb,
    getRepairDetailsForSms,
    formatPriceForSms,
    buildAppLink,
    safeReplaceTemplate,
    getTelegramTemplateForAudience,
    normalizeTelegramParseMode,
    sendTelegramMessages,
    normalizeAutoSendMode,
    inferEntityTypeFromEvent,
    sanitizeTelegramHtml,
    renderTplHtml,
    markdownishToHtml,
    getExistingCustomerColumns,
    buildCustomerTelegramLinkedWhereSql,
    telegramCard,
    stripTags,
    ensureTelegramPersistentMenu,
    sendBotMessage,
    buildContactKeyboard,
    addAuditLog,
  };
}
