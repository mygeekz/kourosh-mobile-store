import fs from "fs";
import path from "path";
import { configureTelegramTransportRuntime, getActiveTelegramTransport, getTelegramTransportRuntimeMode, setTelegramProxyRuntime } from "./telegram/telegramTransportRuntime";
import type { TelegramMultipartPayload, TelegramTransportResult } from "./telegram/TelegramTransport";

/**
 * Stable application-facing Telegram API facade.
 * Runtime Bot API network access is delegated to TelegramTransport.
 */
export interface TelegramResult extends TelegramTransportResult {}

export function setTelegramProxy(proxyUrl?: string | null) {
  setTelegramProxyRuntime(proxyUrl);
}

export function configureTelegramTransport(settings: Record<string, unknown>) {
  return configureTelegramTransportRuntime(settings);
}

export function getTelegramTransportMode() {
  return getTelegramTransportRuntimeMode();
}


export async function getTelegramBotInfo(botToken: string): Promise<TelegramResult> {
  return getActiveTelegramTransport().request({ botToken, method: "getMe", httpMethod: "GET" });
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  opts?: {
    parseMode?: "HTML" | "MarkdownV2" | "Markdown";
    replyMarkup?: any;
    disableWebPreview?: boolean;
  },
): Promise<TelegramResult> {
  const raw = String(text ?? "");
  const safeText = raw.length > 4096 ? raw.slice(0, 4093) + "..." : raw;
  return getActiveTelegramTransport().request({
    botToken,
    method: "sendMessage",
    payload: {
      chat_id: chatId,
      text: safeText,
      parse_mode: opts?.parseMode || undefined,
      reply_markup: opts?.replyMarkup || undefined,
      disable_web_page_preview: opts?.disableWebPreview || undefined,
    },
  });
}

export async function callTelegramBotApi(
  botToken: string,
  methodName: string,
  payload?: Record<string, any>,
  transportOptions?: { timeoutMs?: number },
): Promise<TelegramResult> {
  const method = String(methodName || "").trim();
  if (!method) return { success: false, message: "Telegram methodName is required." };
  return getActiveTelegramTransport().request({ botToken, method, payload: payload || {}, timeoutMs: transportOptions?.timeoutMs });
}

export async function setTelegramBotCommands(botToken: string): Promise<TelegramResult> {
  return callTelegramBotApi(botToken, "setMyCommands", {
    commands: [
      { command: "start", description: "شروع و اتصال حساب" },
      { command: "menu", description: "نمایش منوی اصلی" },
      { command: "help", description: "راهنمای استفاده از ربات" },
      { command: "restart", description: "تازه‌سازی منوی ربات" },
      { command: "stop", description: "قطع دریافت اعلان‌ها" },
    ],
    scope: { type: "default" },
    language_code: "fa",
  });
}

export async function deleteTelegramBotCommands(botToken: string): Promise<TelegramResult> {
  return callTelegramBotApi(botToken, "deleteMyCommands", {
    scope: { type: "default" },
    language_code: "fa",
  });
}

export async function setTelegramDefaultMenuButton(botToken: string): Promise<TelegramResult> {
  return callTelegramBotApi(botToken, "setChatMenuButton", {
    menu_button: { type: "default" },
  });
}

export async function setTelegramWebAppMenuButton(
  botToken: string,
  webAppUrl: string,
  text = "پنل کوروش",
): Promise<TelegramResult> {
  return callTelegramBotApi(botToken, "setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text,
      web_app: { url: webAppUrl },
    },
  });
}

function guessMimeFromExt(filePath: string): string {
  const ext = path.extname(filePath || "").toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

const buildUploadPayload = (
  fieldName: "photo" | "document",
  chatId: string,
  filePath: string,
  caption?: string,
  opts?: {
    parseMode?: "HTML" | "MarkdownV2" | "Markdown";
    replyMarkup?: any;
    replyToMessageId?: number;
    mimeType?: string;
  },
): TelegramMultipartPayload => {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const buffer = fs.readFileSync(abs);
  const mime = opts?.mimeType || guessMimeFromExt(abs);
  const fields: Record<string, string> = { chat_id: chatId };
  const rawCaption = String(caption ?? "");
  const safeCaption = rawCaption.length > 1024 ? rawCaption.slice(0, 1021) + "..." : rawCaption;
  if (safeCaption) fields.caption = safeCaption;
  if (opts?.parseMode) fields.parse_mode = opts.parseMode;
  if (opts?.replyMarkup) fields.reply_markup = JSON.stringify(opts.replyMarkup);
  if (opts?.replyToMessageId) fields.reply_to_message_id = String(opts.replyToMessageId);
  return {
    fields,
    attachment: {
      fieldName,
      filename: path.basename(abs),
      mimeType: mime,
      data: buffer,
    },
  };
};

export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  filePath: string,
  caption?: string,
  opts?: {
    parseMode?: "HTML" | "MarkdownV2" | "Markdown";
    replyMarkup?: any;
    replyToMessageId?: number;
    mimeType?: string;
  },
): Promise<TelegramResult> {
  return getActiveTelegramTransport().request({
    botToken,
    method: "sendPhoto",
    multipart: buildUploadPayload("photo", chatId, filePath, caption, opts),
  });
}

export async function sendTelegramDocument(
  botToken: string,
  chatId: string,
  filePath: string,
  caption?: string,
  opts?: {
    parseMode?: "HTML" | "MarkdownV2" | "Markdown";
    replyMarkup?: any;
    replyToMessageId?: number;
    mimeType?: string;
  },
): Promise<TelegramResult> {
  return getActiveTelegramTransport().request({
    botToken,
    method: "sendDocument",
    multipart: buildUploadPayload("document", chatId, filePath, caption, opts),
  });
}

export function parseChatIdList(input: any): string[] {
  const raw = String(input ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((value) => String(value).trim()).filter(Boolean);
  } catch {}
  return raw.split(/[\n,؛;\s]+/g).map((value) => value.trim()).filter(Boolean);
}

export async function sendTelegramMessages(
  botToken: string,
  chatIds: string[],
  text: string,
): Promise<{ ok: boolean; results: Array<{ chatId: string; ok: boolean; error?: string }> }> {
  const ids = Array.from(new Set((chatIds || []).map((value) => String(value).trim()).filter(Boolean)));
  const results: Array<{ chatId: string; ok: boolean; error?: string }> = [];
  if (!ids.length) return { ok: false, results };

  let anyOk = false;
  for (const chatId of ids) {
    try {
      await sendTelegramMessage(botToken, chatId, text);
      anyOk = true;
      results.push({ chatId, ok: true });
    } catch (error: any) {
      results.push({ chatId, ok: false, error: String(error?.message || error) });
    }
  }
  return { ok: anyOk, results };
}
