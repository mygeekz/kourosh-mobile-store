import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import path from 'path';

/**
 * telegramService.ts
 *
 * Thin wrapper around Telegram Bot API (server-side).
 * We keep the surface area small but make network errors debuggable.
 */

export interface TelegramResult {
  success: boolean;
  status?: number;
  message?: string;
  data?: any;
  rawText?: string;
  details?: { httpStatus?: number; rawResponseText?: string; durationMs?: number };
}

const TG_TIMEOUT_MS = 12_000;

// Runtime overrides (set from DB settings) – useful when the server is running
// inside filtered networks and needs to route via local proxies (e.g. v2rayN).
let TG_PROXY_OVERRIDE: string | undefined;

export function setTelegramProxy(proxyUrl?: string | null) {
  const v = String(proxyUrl || '').trim();
  TG_PROXY_OVERRIDE = v ? v : undefined;
}

/**
 * Optional proxy support (important for filtered networks).
 *
 * Set one of these env vars for the server process:
 *   - TG_PROXY=socks5://127.0.0.1:10808
 *   - TG_PROXY=http://127.0.0.1:10809
 *   - HTTPS_PROXY / HTTP_PROXY (fallback)
 */
function getProxyAgent(proxyOverride?: string | null) {
  const proxy = String(proxyOverride || TG_PROXY_OVERRIDE || process.env.TG_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '').trim();
  if (!proxy) return undefined;

  // socks5://..., socks://...
  if (proxy.startsWith('socks')) return new SocksProxyAgent(proxy);

  // http://... (CONNECT tunneling for https)
  return new HttpsProxyAgent(proxy);
}

function formatTelegramNetworkError(err: any) {
  const cause = err?.cause;
  const extra =
    cause?.code ? ` (cause: ${cause.code})` :
    cause?.message ? ` (cause: ${cause.message})` :
    '';

  return err?.name === 'AbortError'
    ? `Telegram request timeout after ${TG_TIMEOUT_MS}ms`
    : (err?.message || 'fetch failed') + extra;
}

function shouldRetryTelegramWithoutProxy(err: any) {
  const full = `${err?.message || ''} ${err?.cause?.message || ''} ${err?.cause?.code || ''}`.toLowerCase();
  return full.includes('econnrefused') || full.includes('proxy') || full.includes('socks') || full.includes('tunneling socket');
}

async function tgRequest(url: string, init: RequestInit): Promise<TelegramResult> {
  const startedAt = Date.now();
  const makeNetworkFailure = (message: string): TelegramResult => ({
    success: false,
    message,
    details: { rawResponseText: '', durationMs: Date.now() - startedAt },
  });

  const tryRequest = async (useProxy: boolean) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TG_TIMEOUT_MS);
    try {
      const agent = useProxy ? getProxyAgent() : undefined;
      const res = await fetch(url, { ...init, agent, signal: controller.signal } as any);
      const durationMs = Date.now() - startedAt;
      const status = res.status;
      const rawText = await res.text().catch(() => '');
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }
      const details = { httpStatus: status, rawResponseText: rawText, durationMs };
      if (res.ok && data?.ok) return { success: true, status, data, rawText, details } as TelegramResult;
      const msg = data?.description || `Telegram request failed (HTTP ${status})`;
      return { success: false, status, message: msg, data: data ?? rawText, rawText, details } as TelegramResult;
    } finally {
      clearTimeout(t);
    }
  };

  try {
    return await tryRequest(true);
  } catch (err: any) {
    const hasProxy = !!getProxyAgent();
    if (hasProxy && shouldRetryTelegramWithoutProxy(err)) {
      try {
        const retried = await tryRequest(false);
        return retried.success
          ? { ...retried, message: retried.message || 'Telegram request succeeded after bypassing unreachable proxy.' }
          : retried;
      } catch (retryErr: any) {
        return makeNetworkFailure(`${formatTelegramNetworkError(err)} | retry بدون پروکسی هم ناموفق بود: ${formatTelegramNetworkError(retryErr)}`);
      }
    }
    return makeNetworkFailure(formatTelegramNetworkError(err));
  }
}

/**
 * Health check: Telegram getMe
 */
export async function getTelegramBotInfo(botToken: string): Promise<TelegramResult> {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  return tgRequest(url, { method: 'GET' });
}

/**
 * Send message: Telegram sendMessage
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  opts?: {
    parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
    replyMarkup?: any;
    disableWebPreview?: boolean;
  }
): Promise<TelegramResult> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  // Telegram hard limit is 4096 chars; keep UI safe
  const raw = String(text ?? '');
  const safeText = raw.length > 4096 ? raw.slice(0, 4093) + '...' : raw;

  return tgRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: safeText,
      parse_mode: opts?.parseMode || undefined,
      reply_markup: opts?.replyMarkup || undefined,
      disable_web_page_preview: opts?.disableWebPreview || undefined,
    }),
  });
}

/**
 * Generic Telegram Bot API JSON call for bot-level operations like setMyCommands.
 */
export async function callTelegramBotApi(
  botToken: string,
  methodName: string,
  payload?: Record<string, any>
): Promise<TelegramResult> {
  const method = String(methodName || '').trim();
  if (!method) return { success: false, message: 'Telegram methodName is required.' };
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  return tgRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export async function setTelegramBotCommands(botToken: string): Promise<TelegramResult> {
  return callTelegramBotApi(botToken, 'setMyCommands', {
    commands: [
      { command: 'start', description: 'شروع و اتصال حساب' },
      { command: 'menu', description: 'نمایش منوی اصلی' },
      { command: 'help', description: 'راهنمای استفاده از ربات' },
      { command: 'restart', description: 'تازه‌سازی منوی ربات' },
      { command: 'stop', description: 'قطع دریافت اعلان‌ها' },
    ],
    scope: { type: 'default' },
    language_code: 'fa',
  });
}

export async function deleteTelegramBotCommands(botToken: string): Promise<TelegramResult> {
  return callTelegramBotApi(botToken, 'deleteMyCommands', {
    scope: { type: 'default' },
    language_code: 'fa',
  });
}

export async function setTelegramDefaultMenuButton(botToken: string): Promise<TelegramResult> {
  // The visual menu requested for Kourosh is a ReplyKeyboardMarkup sent with
  // /start, /menu and /restart. Keeping Telegram's commands menu as the bottom
  // Menu button makes Telegram show only /help and /unlink (the wrong UX).
  // Setting the menu button back to default lets the reply keyboard become the
  // user's persistent, full-width action menu.
  return callTelegramBotApi(botToken, 'setChatMenuButton', {
    menu_button: { type: 'default' },
  });
}

// Node 18+ provides global fetch/FormData/Blob via undici.
// We prefer global fetch for multipart (node-fetch v2 doesn't love native FormData).
const tgFetch: any = (globalThis as any).fetch || fetch;

function guessMimeFromExt(fp: string): string {
  const ext = path.extname(fp || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

async function tgRequestMultipart(url: string, form: any): Promise<TelegramResult> {
  const startedAt = Date.now();
  const makeNetworkFailure = (message: string): TelegramResult => ({
    success: false,
    message,
    details: { rawResponseText: '', durationMs: Date.now() - startedAt },
  });

  const tryMultipart = async (useProxy: boolean) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TG_TIMEOUT_MS);
    try {
      const agent = useProxy ? getProxyAgent() : undefined;
      const res = await tgFetch(url, { method: 'POST', body: form, agent, signal: controller.signal } as any);
      const durationMs = Date.now() - startedAt;
      const status = res.status;
      const rawText = await res.text().catch(() => '');
      let data: any = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch { data = null; }

      const details = { httpStatus: status, rawResponseText: rawText, durationMs };
      if (res.ok && data?.ok) return { success: true, status, data, rawText, details } as TelegramResult;
      const msg = data?.description || `Telegram request failed (HTTP ${status})`;
      return { success: false, status, message: msg, data: data ?? rawText, rawText, details } as TelegramResult;
    } finally {
      clearTimeout(t);
    }
  };

  try {
    return await tryMultipart(true);
  } catch (err: any) {
    const hasProxy = !!getProxyAgent();
    if (hasProxy && shouldRetryTelegramWithoutProxy(err)) {
      try {
        const retried = await tryMultipart(false);
        return retried.success
          ? { ...retried, message: retried.message || 'Telegram multipart request succeeded after bypassing unreachable proxy.' }
          : retried;
      } catch (retryErr: any) {
        return makeNetworkFailure(`${formatTelegramNetworkError(err)} | retry بدون پروکسی هم ناموفق بود: ${formatTelegramNetworkError(retryErr)}`);
      }
    }
    return makeNetworkFailure(formatTelegramNetworkError(err));
  }
}

/**
 * Send photo (local upload) via Telegram sendPhoto
 */
export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  filePath: string,
  caption?: string,
  opts?: {
    parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
    replyMarkup?: any;
    replyToMessageId?: number;
    mimeType?: string;
  }
): Promise<TelegramResult> {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const buf = fs.readFileSync(abs);
  const mime = opts?.mimeType || guessMimeFromExt(abs);

  const form = new (globalThis as any).FormData();
  form.append('chat_id', chatId);
  form.append('photo', new (globalThis as any).Blob([buf], { type: mime }), path.basename(abs));

  const cap = String(caption ?? '');
  const safeCaption = cap.length > 1024 ? cap.slice(0, 1021) + '...' : cap;
  if (safeCaption) form.append('caption', safeCaption);
  if (opts?.parseMode) form.append('parse_mode', opts.parseMode);
  if (opts?.replyMarkup) form.append('reply_markup', JSON.stringify(opts.replyMarkup));
  if (opts?.replyToMessageId) form.append('reply_to_message_id', String(opts.replyToMessageId));

  return tgRequestMultipart(url, form);
}

/**
 * Send document (pdf/...) via Telegram sendDocument
 */
export async function sendTelegramDocument(
  botToken: string,
  chatId: string,
  filePath: string,
  caption?: string,
  opts?: {
    parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
    replyMarkup?: any;
    replyToMessageId?: number;
    mimeType?: string;
  }
): Promise<TelegramResult> {
  const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const buf = fs.readFileSync(abs);
  const mime = opts?.mimeType || guessMimeFromExt(abs);

  const form = new (globalThis as any).FormData();
  form.append('chat_id', chatId);
  form.append('document', new (globalThis as any).Blob([buf], { type: mime }), path.basename(abs));

  const cap = String(caption ?? '');
  const safeCaption = cap.length > 1024 ? cap.slice(0, 1021) + '...' : cap;
  if (safeCaption) form.append('caption', safeCaption);
  if (opts?.parseMode) form.append('parse_mode', opts.parseMode);
  if (opts?.replyMarkup) form.append('reply_markup', JSON.stringify(opts.replyMarkup));
  if (opts?.replyToMessageId) form.append('reply_to_message_id', String(opts.replyToMessageId));

  return tgRequestMultipart(url, form);
}

export function parseChatIdList(input: any): string[] {
  const raw = String(input ?? '').trim();
  if (!raw) return [];
  // Accept JSON array, comma-separated, newline-separated, or space-separated
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j.map(x => String(x).trim()).filter(Boolean);
  } catch {}
  return raw
    .split(/[\n,؛;\s]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Send the same message to multiple chat targets (groups/channels/users).
 * Failures are collected but do not stop other deliveries.
 */
export async function sendTelegramMessages(
  botToken: string,
  chatIds: string[],
  text: string
): Promise<{ ok: boolean; results: Array<{ chatId: string; ok: boolean; error?: string }> }> {
  const ids = Array.from(new Set((chatIds || []).map(s => String(s).trim()).filter(Boolean)));
  const results: Array<{ chatId: string; ok: boolean; error?: string }> = [];
  if (!ids.length) return { ok: false, results: [] };

  let anyOk = false;
  for (const chatId of ids) {
    try {
      await sendTelegramMessage(botToken, chatId, text);
      anyOk = true;
      results.push({ chatId, ok: true });
    } catch (e: any) {
      results.push({ chatId, ok: false, error: String(e?.message || e) });
    }
  }
  return { ok: anyOk, results };
}

