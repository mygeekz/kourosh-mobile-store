export type TelegramMappingFieldClass = "authentication" | "delivery" | "lifecycle";

export type TelegramIdentityWriterPolicy = {
  writer: string;
  entity: "customer" | "partner" | "staff";
  fields: readonly string[];
  fieldClass: TelegramMappingFieldClass;
  authorization: string;
  allowed: boolean;
};

/**
 * Phase 6.5 writer inventory. Authentication fields may only be written by a
 * verified linking flow or a central unlink. CRUD and messaging writers are
 * explicitly delivery-only.
 */
export const TELEGRAM_IDENTITY_WRITE_POLICY: readonly TelegramIdentityWriterPolicy[] = [
  { writer: "telegramIdentitySecurity.linkCustomerTelegramIdentityById", entity: "customer", fields: ["telegram_user_id", "telegram_chat_id", "telegramChatId", "telegram_linked_at"], fieldClass: "authentication", authorization: "self-owned Telegram contact or active customer one-time token", allowed: true },
  { writer: "telegramIdentitySecurity.redeemPartnerTelegramLink", entity: "partner", fields: ["telegram_user_id", "telegram_chat_id", "telegramChatId", "telegram_linked_at"], fieldClass: "authentication", authorization: "latest active opaque Partner token in a private chat", allowed: true },
  { writer: "telegramIdentitySecurity.redeemStaffTelegramLink", entity: "staff", fields: ["user_telegram_links.telegram_user_id", "user_telegram_links.chat_id"], fieldClass: "authentication", authorization: "latest active opaque Staff token, current Admin/Manager role, private chat", allowed: true },
  { writer: "telegramIdentitySecurity.unlinkCustomerTelegramIdentity", entity: "customer", fields: ["telegram_user_id", "telegram_chat_id", "telegramChatId", "telegram_linked_at"], fieldClass: "lifecycle", authorization: "central unlink; tokens and sessions revoked", allowed: true },
  { writer: "telegramIdentitySecurity.unlinkPartnerTelegramIdentity", entity: "partner", fields: ["telegram_user_id", "telegram_chat_id", "telegramChatId", "telegram_linked_at"], fieldClass: "lifecycle", authorization: "central unlink; tokens and sessions revoked", allowed: true },
  { writer: "telegramIdentitySecurity.unlinkStaffTelegram", entity: "staff", fields: ["user_telegram_links"], fieldClass: "lifecycle", authorization: "central unlink; tokens and sessions revoked", allowed: true },
  { writer: "telegramIdentitySecurity.updateCustomerTelegramDelivery", entity: "customer", fields: ["telegram_chat_id", "telegramChatId"], fieldClass: "delivery", authorization: "Admin/Manager messaging destination; never authenticates", allowed: true },
  { writer: "telegramIdentitySecurity.updatePartnerTelegramDelivery", entity: "partner", fields: ["telegram_chat_id", "telegramChatId"], fieldClass: "delivery", authorization: "Admin/Manager messaging destination; never authenticates", allowed: true },
  { writer: "customerMutations.create/update", entity: "customer", fields: ["telegramChatId"], fieldClass: "delivery", authorization: "customer CRUD; never authenticates", allowed: true },
  { writer: "partnerMutations.create/update", entity: "partner", fields: ["telegramChatId"], fieldClass: "delivery", authorization: "partner CRUD; never authenticates", allowed: true },
] as const;

export const AUTHENTICATION_FIELD_WRITERS = TELEGRAM_IDENTITY_WRITE_POLICY.filter(
  (entry) => entry.fieldClass === "authentication",
);
