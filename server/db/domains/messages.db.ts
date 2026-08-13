// Domain database API extracted from legacyRuntime in Phase 1C.

export type {
  TelegramLinkRequestStatus,
  TelegramLinkRequestRow,
} from "../../repositories/telegramLinkRequests.repo";

export {
  upsertTelegramLinkRequest,
  getPendingTelegramLinkRequestByChatId,
  bumpTelegramLinkRequestAttempt,
  markTelegramLinkRequestVerified,
  linkCustomerTelegramByPhone,
  getLinkedPartnerByChatId,
  linkPartnerTelegramByPhone,
  unlinkPartnerTelegram,
  createTelegramLinkToken,
  getTelegramLinkTokenByPlainToken,
  getPendingTelegramLinkTokenByChatId,
  markTelegramLinkTokenStatus,
  linkCustomerTelegramById,
} from "../../repositories/telegramLinkRequests.repo";
