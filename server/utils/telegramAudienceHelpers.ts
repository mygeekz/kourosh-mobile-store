import moment from "jalali-moment";
import { buildTelegramTemplatePreset, cleanAppMessage } from "../../shared/messages";

export type TelegramAudience = "customer" | "partner" | "manager";

export const computeNextAttemptISO = (attempts: number) => {
  // 30s, 60s, 120s, 240s, 480s, 600s (cap 10 min)
  const base = 30;
  const sec = Math.min(base * Math.pow(2, Math.max(0, attempts)), 600);
  return moment().add(sec, "seconds").toISOString();
};

export const getTelegramAudienceKey = (
  baseKey: string,
  audience: TelegramAudience,
) => (audience === "customer" ? baseKey : `${baseKey}_${audience}`);

export const getTelegramAudienceFormatKey = (
  baseKey: string,
  audience: TelegramAudience,
) =>
  audience === "customer"
    ? `${baseKey}_format`
    : `${baseKey}_${audience}_format`;


export const getTelegramTemplateForAudience = (
  settings: Record<string, any>,
  baseKey: string,
  audience: TelegramAudience,
  customerFallback: string,
) => {
  const audienceKey = getTelegramAudienceKey(baseKey, audience);
  const raw = cleanAppMessage((settings as any)?.[audienceKey]);
  if (raw) {
    return {
      template: raw,
      parseMode:
        String(
          (settings as any)?.[
            getTelegramAudienceFormatKey(baseKey, audience)
          ] ||
            (settings as any)?.[`${baseKey}_format`] ||
            (audience === "manager" ? "html" : "text"),
        ).trim() || (audience === "manager" ? "html" : "text"),
    };
  }
  if (audience === "customer") {
    return {
      template:
        cleanAppMessage((settings as any)?.[baseKey] || customerFallback) || customerFallback,
      parseMode:
        String((settings as any)?.[`${baseKey}_format`] || "text").trim() ||
        "text",
    };
  }
  return {
    template: buildTelegramTemplatePreset(baseKey, audience, "formal"),
    parseMode:
      String(
        (settings as any)?.[getTelegramAudienceFormatKey(baseKey, audience)] ||
          (audience === "manager" ? "html" : "text"),
      ).trim() || (audience === "manager" ? "html" : "text"),
  };
};

export const normalizeTelegramParseMode = (
  value: any,
): "HTML" | "Markdown" | "MarkdownV2" => {
  const v = String(value || "text")
    .trim()
    .toLowerCase();
  if (v === "html") return "HTML";
  if (v === "markdownv2") return "MarkdownV2";
  if (v === "markdown") return "Markdown";
  return "HTML";
};

export function createTelegramAudienceLookupHelpers(deps: {
  ensureCustomerTelegramColumns: () => Promise<any> | any;
  getAsync: (sql: string, params?: any[]) => Promise<any>;
  allAsync: (sql: string, params?: any[]) => Promise<any[]>;
}) {
  const lookupCustomerTelegramChatId = async (
    customerId: number,
  ): Promise<string> => {
    if (!customerId) return "";
    try {
      await deps.ensureCustomerTelegramColumns();
      const row: any = await deps.getAsync(
        `SELECT COALESCE(telegram_chat_id, telegramChatId) AS tg_chat_id FROM customers WHERE id=? LIMIT 1`,
        [customerId],
      );
      return String(row?.tg_chat_id || "").trim();
    } catch {
      return "";
    }
  };

  const lookupPartnerTelegramChatId = async (
    partnerId: number,
  ): Promise<string> => {
    if (!partnerId) return "";
    try {
      const cols: any[] = await deps.allAsync(`PRAGMA table_info(partners)`);
      const names = new Set(
        (cols || []).map((c: any) => String(c?.name || "").trim()),
      );
      const chatCol = names.has("telegram_chat_id")
        ? "telegram_chat_id"
        : names.has("telegramChatId")
          ? "telegramChatId"
          : "";
      if (!chatCol) return "";
      const row: any = await deps.getAsync(
        `SELECT ${chatCol} AS tg_chat_id FROM partners WHERE id=? LIMIT 1`,
        [partnerId],
      );
      return String(row?.tg_chat_id || "").trim();
    } catch {
      return "";
    }
  };

  return {
    lookupCustomerTelegramChatId,
    lookupPartnerTelegramChatId,
  };
}
