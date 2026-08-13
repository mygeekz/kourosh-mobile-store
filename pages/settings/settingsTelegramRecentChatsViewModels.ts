import type { TelegramBusinessInfo, TelegramRecentChat } from './settingsPanelTypes';

export type SettingsTelegramRecentChatItemViewModel = {
  key: string;
  chatId: string | number;
  title: string | number;
  meta: string;
  sourceLabel: string;
  isActive: boolean;
  source?: string;
};

export type SettingsTelegramRecentChatsViewModel = {
  botUsername: string;
  botUrl: string;
  hasBotUsername: boolean;
  canFetchRecentChats: boolean;
  selectedChatId: string;
  lookupHint: string;
  hasLookupHint: boolean;
  hasRecentChats: boolean;
  chats: SettingsTelegramRecentChatItemViewModel[];
};

export const buildSettingsTelegramRecentChatsViewModel = ({
  telegramInfo,
  tgRecentChats,
  tgChatLookupHint,
}: {
  telegramInfo: TelegramBusinessInfo;
  tgRecentChats: TelegramRecentChat[];
  tgChatLookupHint: string;
}): SettingsTelegramRecentChatsViewModel => {
  const botUsername = String(telegramInfo.telegram_bot_username || '').trim().replace(/^@+/, '');
  const selectedChatId = String(telegramInfo.telegram_chat_id || '');
  const lookupHint = String(tgChatLookupHint || '').trim();
  const chats = tgRecentChats.map((chat) => ({
    key: `${chat.chatId}-${chat.source || 'chat'}`,
    chatId: chat.chatId,
    title: chat.title || chat.username || chat.chatId,
    meta: String(chat.chatId),
    sourceLabel: chat.source === 'inbox' ? 'از پیام‌های دریافتی سیستم' : 'از مسیر getUpdates تلگرام',
    isActive: selectedChatId === String(chat.chatId),
    source: chat.source,
  }));

  return {
    botUsername,
    botUrl: botUsername ? `https://t.me/${botUsername}` : '',
    hasBotUsername: Boolean(botUsername),
    canFetchRecentChats: Boolean(String(telegramInfo.telegram_bot_token || '').trim()),
    selectedChatId,
    lookupHint,
    hasLookupHint: Boolean(lookupHint),
    hasRecentChats: chats.length > 0,
    chats,
  };
};
