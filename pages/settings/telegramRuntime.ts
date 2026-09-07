import type { TelegramMessageFormat, TelegramRecentChat } from './settingsPanelTypes';
import { isRecord } from './settingsRuntime';

export const normalizeTelegramMessageFormat = (format: unknown): TelegramMessageFormat => {
  const normalized = String(format || 'text').toLowerCase();
  return normalized === 'markdown' || normalized === 'html' ? normalized : 'text';
};

export const normalizeTelegramRecentChat = (entry: unknown): TelegramRecentChat | null => {
  if (!isRecord(entry)) return null;
  const chatId = entry.chatId ?? entry.chat_id ?? entry.id;
  if (chatId == null || chatId === '') return null;
  return {
    chatId: String(chatId),
    title: entry.title == null ? undefined : String(entry.title),
    username: entry.username == null ? undefined : String(entry.username),
    type: entry.type == null ? undefined : String(entry.type),
    source: entry.source == null ? undefined : String(entry.source),
    text: entry.text == null ? undefined : String(entry.text),
    at: entry.at == null ? null : String(entry.at),
  };
};
