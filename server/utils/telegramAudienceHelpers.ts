import moment from "jalali-moment";

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

const TELEGRAM_AUDIENCE_FALLBACKS: Record<
  string,
  { partner?: string; manager?: string }
> = {
  telegram_installment_settlement_message: {
    partner:
      "همکار گرامی، پرونده اقساط مشتری {name} به‌صورت کامل تسویه شد. شماره قرارداد: {saleId}. مبلغ کل پرونده: {total} تومان.",
    manager:
      "گزارش مدیریتی اقساط: پرونده مشتری {name} با شماره قرارداد {saleId} به‌طور کامل تسویه شد. جمع کل: {total} تومان.",
  },
  telegram_installment_overdue_message: {
    partner:
      "یادآوری پیگیری: قسط مشتری {name} با مبلغ {amount} تومان و سررسید {dueDate} هنوز پرداخت نشده است. لطفاً پیگیری لازم انجام شود.",
    manager:
      "هشدار مدیریتی اقساط: قسط معوق برای مشتری {name} | سررسید: {dueDate} | مبلغ: {amount} تومان.",
  },
  telegram_installment_sale_created_message: {
    partner:
      "ثبت فروش اقساطی جدید برای مشتری {name}. قرارداد {saleId} با مبلغ کل {total} تومان در سیستم ثبت شد.",
    manager:
      "گزارش فروش اقساطی: قرارداد {saleId} برای مشتری {name} با مبلغ کل {total} تومان ثبت شد.",
  },
  telegram_installment_due_notice_message: {
    partner:
      "پیگیری اقساط: مشتری {name} در تاریخ {dueDate} سررسید پرداخت به مبلغ {amount} تومان دارد.",
    manager:
      "گزارش سررسید اقساط: مشتری {name} | سررسید {dueDate} | مبلغ {amount} تومان.",
  },
  telegram_installment_payment_received_message: {
    partner:
      "پرداخت قسط مشتری {name} به مبلغ {amount} تومان ثبت شد. لطفاً وضعیت پرونده را بررسی کنید.",
    manager: "گزارش دریافت قسط: مشتری {name} مبلغ {amount} تومان پرداخت کرد.",
  },
  telegram_repair_received_message: {
    partner:
      "پذیرش تعمیر ثبت شد: مشتری {name} | دستگاه {deviceModel} | کد رهگیری {repairId}.",
    manager:
      "گزارش پذیرش تعمیر: {deviceModel} برای مشتری {name} با کد {repairId} ثبت شد.",
  },
  telegram_repair_cost_notice_message: {
    partner:
      "هزینه تعمیر برای دستگاه {deviceModel} مشتری {name} مبلغ {estimatedCost} تومان برآورد شد. منتظر تأیید مشتری بمانید.",
    manager:
      "گزارش هزینه تعمیر: مشتری {name} | دستگاه {deviceModel} | برآورد {estimatedCost} تومان.",
  },
  telegram_repair_ready_message: {
    partner:
      "دستگاه {deviceModel} مشتری {name} آماده تحویل شد. مبلغ قابل پرداخت: {finalCost} تومان.",
    manager:
      "گزارش آماده تحویل: مشتری {name} | دستگاه {deviceModel} | مبلغ نهایی {finalCost} تومان.",
  },
  telegram_repair_delivered_message: {
    partner:
      "تحویل تعمیر انجام شد: دستگاه {deviceModel} مشتری {name} با کد {repairId} تحویل گردید.",
    manager:
      "گزارش تحویل تعمیر: مشتری {name} | دستگاه {deviceModel} | رسید {repairId}.",
  },
  telegram_repair_status_message: {
    partner:
      "وضعیت تعمیر به‌روزرسانی شد: مشتری {name} | دستگاه {deviceModel} | وضعیت {status}.",
    manager:
      "گزارش وضعیت تعمیر: {deviceModel} مشتری {name} اکنون در وضعیت {status} قرار دارد.",
  },
  telegram_account_balance_message: {
    partner:
      "وضعیت حساب مشتری {name}: {status} {amount} تومان. لطفاً در پیگیری‌های مالی لحاظ شود.",
    manager: "گزارش حساب مشتری: {name} | {status} | مبلغ {amount} تومان.",
  },
  telegram_check_failed_message: {
    partner:
      "پیگیری مالی: چک مشتری {name} در تاریخ {dueDate} عملیات ناعملیات با موفقیت انجام شد بود شد. مبلغ: {amount} تومان.",
    manager:
      "هشدار مدیریتی چک: مشتری {name} | تاریخ {dueDate} | مبلغ {amount} تومان | وضعیت عملیات ناعملیات با موفقیت انجام شد بود.",
  },
  telegram_invoice_created_message: {
    partner:
      "فاکتور جدید برای مشتری {name} ثبت شد. شماره فاکتور {invoiceNo} با مبلغ {total} تومان.",
    manager:
      "گزارش ثبت فاکتور: مشتری {name} | فاکتور {invoiceNo} | مبلغ {total} تومان.",
  },
  telegram_invoice_payment_received_message: {
    partner:
      "پرداخت فاکتور ثبت شد: مشتری {name} | فاکتور {invoiceNo} | مبلغ {amount} تومان.",
    manager:
      "گزارش دریافت وجه: مشتری {name} | فاکتور {invoiceNo} | مبلغ {amount} تومان.",
  },
};

export const getTelegramTemplateForAudience = (
  settings: Record<string, any>,
  baseKey: string,
  audience: TelegramAudience,
  customerFallback: string,
) => {
  const audienceKey = getTelegramAudienceKey(baseKey, audience);
  const raw = String((settings as any)?.[audienceKey] || "").trim();
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
        String((settings as any)?.[baseKey] || customerFallback || "").trim() ||
        customerFallback,
      parseMode:
        String((settings as any)?.[`${baseKey}_format`] || "text").trim() ||
        "text",
    };
  }
  return {
    template: TELEGRAM_AUDIENCE_FALLBACKS[baseKey]?.[audience] || "",
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
