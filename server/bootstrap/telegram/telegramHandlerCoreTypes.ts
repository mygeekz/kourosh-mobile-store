export type TelegramUpdateHandler = (update: any) => Promise<void>;

export type TelegramUpdateHandlerDeps = {
  trySendSmsNow: (payload: any) => Promise<any>;
  securityLinking?: {
    redeemPartner: (token: string, telegramUserId: string, chatId: string, isPrivate: boolean) => Promise<{ ok: boolean; displayName?: string }>;
    redeemStaff: (token: string, telegramUserId: string, chatId: string, isPrivate: boolean) => Promise<{ ok: boolean; displayName?: string; roleName?: string }>;
  };
  sendBotMessage?: (chatId: string, text: string, extra?: any) => Promise<any>;
  sendSecurityMessage?: (chatId: string, text: string) => Promise<unknown>;
};
