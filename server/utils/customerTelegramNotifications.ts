import moment from "jalali-moment";
import cron from "node-cron";
import { markdownishToHtml, renderTplHtml, telegramCard } from "./messagingFormatters";

export const getIntList = (raw: any, fallback: number[]) => {
  const s = String(raw ?? "").trim();
  if (!s) return fallback;
  const out = s
    .split(/[,،\s]+/)
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n));
  return out.length ? out : fallback;
};
export const parseAnyDate = (s: any) => {
  const raw = String(s ?? "").trim();
  if (!raw) return null;
  const j = moment(raw, "jYYYY/jMM/jDD", true);
  const m = j.isValid() ? j : moment(raw);
  return m.isValid() ? m : null;
};
export const formatMoneyFa = (v: any) => {
  const n = Number(v ?? 0);
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
};
export const buildNotifKeyboard = (
  primary: "installments" | "repairs" | "balance" | "invoices",
) => {
  const primaryBtn =
    primary === "installments"
      ? { text: "🧾 اقساط من", callback_data: "MENU_INSTALLMENTS" }
      : primary === "repairs"
        ? { text: "🛠 پیگیری تعمیرات من", callback_data: "MENU_REPAIRS" }
        : primary === "invoices"
          ? { text: "🧾 خریدهای اخیر من", callback_data: "MENU_INVOICES" }
          : { text: "📌 وضعیت حساب", callback_data: "MENU_BALANCE" };
  return {
    inline_keyboard: [
      [primaryBtn, { text: "🏠 منو", callback_data: "MENU_HOME" }],
      [{ text: "🔔 اعلان‌ها روشن/خاموش", callback_data: "MENU_NOTIFS" }],
    ],
  };
};
const buildInstallmentText = (
  kind: "due_7" | "due_3" | "due_today" | "overdue",
  item: any,
  settings: any,
  daysUntil: number,
) => {
  const name = item?.customerFullName || "مشتری";
  const amount = formatMoneyFa(item?.amountDue);
  const dueDate = String(item?.dueDate || "").trim();
  const baseVars = {
    name,
    amount,
    dueDate,
    days: String(daysUntil),
    saleId: String(item?.saleId ?? ""),
  };
  const defaults: Record<string, string> = {
    due_7: telegramCard(
      "یادآوری قسط",
      "🔔",
      [
        "⏳ <b>۷ روز مانده</b>",
        `👤 مشتری: <b>{name}</b>`,
        `💰 مبلغ قسط: <b>{amount} تومان</b>`,
        `📅 سررسید: <b>{dueDate}</b>`,
      ],
      "🧾 مشاهده اقساط: /installments",
    ),
    due_3: telegramCard(
      "یادآوری قسط",
      "🔔",
      [
        "⏳ <b>۳ روز مانده</b>",
        `👤 مشتری: <b>{name}</b>`,
        `💰 مبلغ قسط: <b>{amount} تومان</b>`,
        `📅 سررسید: <b>{dueDate}</b>`,
      ],
      "🧾 مشاهده اقساط: /installments",
    ),
    due_today: telegramCard(
      "سررسید امروز",
      "⏰",
      [
        `👤 مشتری: <b>{name}</b>`,
        `💰 مبلغ قسط: <b>{amount} تومان</b>`,
        `📅 سررسید امروز: <b>{dueDate}</b>`,
      ],
      "🧾 مشاهده اقساط: /installments",
    ),
    overdue: telegramCard(
      "قسط معوق",
      "⚠️",
      [
        `👤 مشتری: <b>{name}</b>`,
        `💰 مبلغ قسط: <b>{amount} تومان</b>`,
        `📅 سررسید: <b>{dueDate}</b>`,
        "لطفاً در اولین فرصت بررسی و پیگیری شود.",
      ],
      "🧾 مشاهده اقساط: /installments",
    ),
  };
  // Backward-compatible keys already present in Settings → Telegram
  const keyMap: any = {
    due_7: "telegram_installment_due_7_message",
    due_3: "telegram_installment_due_3_message",
    due_today: "telegram_installment_reminder_message",
    overdue: "telegram_installment_overdue_message",
  };
  const tplRaw =
    String(settings?.[keyMap[kind]] || "").trim() || defaults[kind];
  const tpl = markdownishToHtml(tplRaw);
  return renderTplHtml(tpl, baseVars);
};
const buildRepairReadyText = (item: any, settings: any) => {
  const name = item?.customerFullName || "مشتری";
  const device = item?.deviceModel || "دستگاه";
  const cost = formatMoneyFa(item?.finalCost);
  const defaults = telegramCard(
    "آماده تحویل",
    "✅",
    [
      `👤 مشتری: <b>{name}</b>`,
      `📱 دستگاه: <b>{device}</b>`,
      `💰 هزینه نهایی: <b>{cost} تومان</b>`,
    ],
    "🛠 جزئیات تعمیرات: /repairs",
  );
  const tplRaw =
    String((settings as any)?.telegram_repair_ready_message || "").trim() ||
    defaults;
  const tpl = markdownishToHtml(tplRaw);
  return renderTplHtml(tpl, {
    name,
    device,
    deviceModel: device,
    cost,
    finalCost: cost,
    repairId: String(item?.id ?? ""),
  });
};
const buildRepairStatusChangedText = (item: any, settings: any) => {
  const name = item?.customerFullName || "مشتری";
  const device = item?.deviceModel || "دستگاه";
  const statusRaw = String(item?.status || "").trim();
  const statusInfo = (() => {
    const s = statusRaw;
    if (!s) return { icon: "ℹ️", label: "نامشخص" };
    const lc = s.toLowerCase();
    if (lc.includes("ready") || s.includes("آماده"))
      return { icon: "✅", label: s.includes("آماده") ? s : "آماده تحویل" };
    if (lc.includes("wait") || s.includes("انتظار") || s.includes("قطعه"))
      return { icon: "⏳", label: s || "در انتظار قطعه" };
    if (lc.includes("progress") || s.includes("در حال") || s.includes("تعمیر"))
      return { icon: "🧰", label: s || "در حال تعمیر" };
    if (lc.includes("deliver") || lc.includes("done") || s.includes("تحویل"))
      return { icon: "📦", label: s || "تحویل شد" };
    if (s.includes("پذیرش") || s.includes("دریافت"))
      return { icon: "📥", label: s };
    return { icon: "ℹ️", label: s };
  })();
  const cost = item?.finalCost != null ? formatMoneyFa(item?.finalCost) : "";
  const defaults = telegramCard(
    "تازه‌سازی تعمیرات",
    "🛠",
    [
      `👤 مشتری: <b>{name}</b>`,
      `📱 دستگاه: <b>{device}</b>`,
      `${statusInfo.icon} وضعیت جدید: <b>{status}</b>`,
      cost ? `💰 هزینه: <b>{cost} تومان</b>` : "",
    ],
    "🛠 جزئیات: /repairs",
  );
  const tplRaw =
    String(
      (settings as any).telegram_repair_status_changed_message || "",
    ).trim() || defaults;
  const tpl = markdownishToHtml(tplRaw);
  return renderTplHtml(tpl, {
    name,
    device,
    deviceModel: device,
    status: statusInfo.label,
    finalCost: cost,
    cost,
    repairId: String(item?.id ?? ""),
  });
};

export type CustomerTelegramNotificationsRuntimeDeps = {
  getAllSettingsAsObject: () => Promise<any>;
  runAsync: (sql: string, params?: any[]) => Promise<any>;
  getOverdueInstallmentsFromDb: () => Promise<any[]>;
  ensureReminderRulesTables: () => Promise<any>;
  getReminderConfig: () => Promise<ReminderConfigRow>;
  getEnabledReminderRules: (channel?: any) => Promise<ReminderRuleRow[]>;
  hasCustomerDailyCap: (channel: string, customerId: number) => Promise<boolean>;
  hasPendingCustomerCapInOutbox: (channel: string, customerId: number) => Promise<boolean>;
  reminderTargetsInstallments: (rule: any) => boolean;
  reminderTargetsChecks: (rule: any) => boolean;
  getPendingInstallmentChecksWithCustomer: () => Promise<any[]>;
  allAsync: (sql: string, params?: any[]) => Promise<any[]>;
  getAsync: (sql: string, params?: any[]) => Promise<any>;
  enqueueOutbox: (opts: any) => Promise<any>;
  buildTelegramDeepLinkKeyboard: (opts: any) => any;
  processOneOutboxRow: () => Promise<any>;
};

type ReminderMatchType = "days_until" | "overdue_days";
type ReminderTargetType = "both" | "installment" | "check";
type ReminderRuleRow = {
  id?: any;
  matchType?: ReminderMatchType | any;
  value?: any;
  targetType?: ReminderTargetType | any;
  template?: any;
  checkTemplate?: any;
};
type ReminderConfigRow = {
  sendStartHour?: any;
  sendEndHour?: any;
  maxPerDayPerCustomer?: any;
};

export const createCustomerTelegramNotificationsRuntime = (
  deps: CustomerTelegramNotificationsRuntimeDeps,
) => {
  const {
    getAllSettingsAsObject,
    runAsync,
    getOverdueInstallmentsFromDb,
    ensureReminderRulesTables,
    getReminderConfig,
    getEnabledReminderRules,
    hasCustomerDailyCap,
    hasPendingCustomerCapInOutbox,
    reminderTargetsInstallments,
    reminderTargetsChecks,
    getPendingInstallmentChecksWithCustomer,
    allAsync,
    getAsync,
    enqueueOutbox,
    buildTelegramDeepLinkKeyboard,
    processOneOutboxRow,
  } = deps;
  const runCustomerTelegramNotificationsTick = async () => {
  try {
    const settings = await getAllSettingsAsObject();
    // Keeps track of last notified repair status to avoid duplicate notifications.
    try {
      await runAsync(`
        CREATE TABLE IF NOT EXISTS repair_notify_state (
          repairId INTEGER PRIMARY KEY,
          lastStatus TEXT,
          lastNotifiedAt TEXT
        );
      `);
      await runAsync(
        `CREATE INDEX IF NOT EXISTS idx_repair_notify_state_status ON repair_notify_state(lastStatus);`,
      );
    } catch {
      // ignore
    }
    const enabledInstallments =
      String((settings as any).telegram_notify_installments || "1").trim() !==
      "0";
    const enabledRepairs =
      String((settings as any).telegram_notify_repairs || "1").trim() !== "0";
    // Legacy knobs (kept for backward compatibility if no rules exist)
    const remindDays = getIntList(
      (settings as any).telegram_installment_remind_days,
      [7, 3, 0],
    );
    const overdueRepeatDays = Math.max(
      1,
      Number((settings as any).telegram_installment_overdue_repeat_days || 3),
    );
    const now = moment();
    const today = now.clone().startOf("day");
    if (enabledInstallments) {
      // CRM-style rule builder (preferred if at least one rule exists)
      let rulesCfg: ReminderConfigRow | null = null;
      let rules: ReminderRuleRow[] = [];
      try {
        await ensureReminderRulesTables();
        rulesCfg = await getReminderConfig();
        rules = await getEnabledReminderRules("telegram");
      } catch {
        rulesCfg = null;
        rules = [];
      }
      const useRuleBuilder = (rules || []).length > 0;
      const nowTehran = moment().utcOffset(210);
      const hourNow = nowTehran.hour();
      const inSendWindow = rulesCfg
        ? hourNow >= Number(rulesCfg.sendStartHour) &&
          hourNow <= Number(rulesCfg.sendEndHour)
        : true;
      const allUnpaid = await getOverdueInstallmentsFromDb();
      for (const item of allUnpaid || []) {
        const chatId = String(item?.telegramChatId || "").trim();
        const optedOut = String(item?.telegramOptedOut || "0").trim() === "1";
        if (
          !chatId ||
          optedOut ||
          String(
            (item as any)?.telegramInvalid ||
              (item as any)?.telegram_invalid ||
              "0",
          ) === "1"
        )
          continue;
        const due = parseAnyDate(item?.dueDate);
        if (!due) continue;
        const daysUntil = due.clone().startOf("day").diff(today, "days");
        if (useRuleBuilder) {
          if (!inSendWindow) continue;
          const customerId = Number(item?.customerId ?? item?.customer_id ?? 0);
          if (customerId && rulesCfg?.maxPerDayPerCustomer) {
            const sent = await hasCustomerDailyCap("telegram", customerId);
            const pending = await hasPendingCustomerCapInOutbox(
              "telegram",
              customerId,
            );
            if (sent || pending) continue;
          }
          // Match rules against daysUntil
          const matches = (rules || []).filter((r) => {
            if (!reminderTargetsInstallments(r as any)) return false;
            if (r.matchType === "days_until")
              return Number(r.value) === Number(daysUntil);
            if (r.matchType === "overdue_days")
              return Number(daysUntil) === -Math.abs(Number(r.value));
            return false;
          });
          if (matches.length) {
            // pick the best match
            matches.sort((a, b) => {
              const pa =
                a.matchType === "overdue_days"
                  ? 0
                  : Number(a.value) === 0
                    ? 1
                    : 2;
              const pb =
                b.matchType === "overdue_days"
                  ? 0
                  : Number(b.value) === 0
                    ? 1
                    : 2;
              if (pa !== pb) return pa - pb;
              // smaller days_until gets priority (0 before 3 before 7)
              return Math.abs(Number(a.value)) - Math.abs(Number(b.value));
            });
            const rule = matches[0];
            const name = item?.customerFullName || "مشتری";
            const amount = formatMoneyFa(item?.amountDue);
            const dueDate = String(item?.dueDate || "").trim();
            const vars = {
              name,
              amount,
              dueDate,
              days: String(daysUntil),
              saleId: String(item?.saleId ?? ""),
            };
            const tpl = markdownishToHtml(
              String((rule as any).installmentTemplate || rule.template || ""),
            );
            const text = renderTplHtml(tpl, vars);
            await enqueueOutbox({
              channel: "telegram",
              eventType: `installment_rule_${rule.id}`,
              entityType: "installment_payment",
              entityId: Number(item?.id ?? 0) || null,
              recipient: chatId,
              payload: {
                text,
                chatId,
                reply_markup: buildTelegramDeepLinkKeyboard({
                  primaryMenu: "installments",
                  installment: {
                    saleId: item?.saleId,
                    paymentId: item?.paymentId,
                    amount: item?.amountDue,
                    dueDate: item?.dueDate,
                    customerId: item?.customerId,
                  },
                  settings,
                }),
                parse_mode: "HTML",
                capCustomerId: customerId || undefined,
                meta: {
                  ruleId: rule.id,
                  capCustomerId: customerId || undefined,
                },
              },
              dedupeToday: true,
            });
          }
          continue;
        }
        // Legacy behavior (no rules)
        if (remindDays.includes(daysUntil)) {
          if (daysUntil === 7) {
            const text = buildInstallmentText(
              "due_7",
              item,
              settings,
              daysUntil,
            );
            await enqueueOutbox({
              channel: "telegram",
              eventType: "installment_due_7",
              entityType: "installment_payment",
              entityId: Number(item?.id ?? 0) || null,
              recipient: chatId,
              payload: {
                text,
                chatId,
                reply_markup: buildTelegramDeepLinkKeyboard({
                  primaryMenu: "installments",
                  installment: {
                    saleId: item?.saleId,
                    paymentId: item?.paymentId,
                    amount: item?.amountDue,
                    dueDate: item?.dueDate,
                    customerId: item?.customerId,
                  },
                  settings,
                }),
                parse_mode: "HTML",
              },
              dedupeToday: true,
            });
          } else if (daysUntil === 3) {
            const text = buildInstallmentText(
              "due_3",
              item,
              settings,
              daysUntil,
            );
            await enqueueOutbox({
              channel: "telegram",
              eventType: "installment_due_3",
              entityType: "installment_payment",
              entityId: Number(item?.id ?? 0) || null,
              recipient: chatId,
              payload: {
                text,
                chatId,
                reply_markup: buildTelegramDeepLinkKeyboard({
                  primaryMenu: "installments",
                  installment: {
                    saleId: item?.saleId,
                    paymentId: item?.paymentId,
                    amount: item?.amountDue,
                    dueDate: item?.dueDate,
                    customerId: item?.customerId,
                  },
                  settings,
                }),
                parse_mode: "HTML",
              },
              dedupeToday: true,
            });
          } else if (daysUntil === 0) {
            const text = buildInstallmentText(
              "due_today",
              item,
              settings,
              daysUntil,
            );
            await enqueueOutbox({
              channel: "telegram",
              eventType: "installment_due_today",
              entityType: "installment_payment",
              entityId: Number(item?.id ?? 0) || null,
              recipient: chatId,
              payload: {
                text,
                chatId,
                reply_markup: buildTelegramDeepLinkKeyboard({
                  primaryMenu: "installments",
                  installment: {
                    saleId: item?.saleId,
                    paymentId: item?.paymentId,
                    amount: item?.amountDue,
                    dueDate: item?.dueDate,
                    customerId: item?.customerId,
                  },
                  settings,
                }),
                parse_mode: "HTML",
              },
              dedupeToday: true,
            });
          } else {
            const text = buildInstallmentText(
              "due_today",
              item,
              settings,
              daysUntil,
            );
            await enqueueOutbox({
              channel: "telegram",
              eventType: "installment_reminder",
              entityType: "installment_payment",
              entityId: Number(item?.id ?? 0) || null,
              recipient: chatId,
              payload: {
                text,
                chatId,
                reply_markup: buildTelegramDeepLinkKeyboard({
                  primaryMenu: "installments",
                  installment: {
                    saleId: item?.saleId,
                    paymentId: item?.paymentId,
                    amount: item?.amountDue,
                    dueDate: item?.dueDate,
                    customerId: item?.customerId,
                  },
                  settings,
                }),
                parse_mode: "HTML",
              },
              dedupeToday: true,
            });
          }
        }
        if (daysUntil < 0) {
          const overdueDays = Math.abs(daysUntil);
          if (overdueDays % overdueRepeatDays === 0) {
            const text = buildInstallmentText(
              "overdue",
              item,
              settings,
              daysUntil,
            );
            await enqueueOutbox({
              channel: "telegram",
              eventType: "installment_overdue",
              entityType: "installment_payment",
              entityId: Number(item?.id ?? 0) || null,
              recipient: chatId,
              payload: {
                text,
                chatId,
                reply_markup: buildTelegramDeepLinkKeyboard({
                  primaryMenu: "installments",
                  installment: {
                    saleId: item?.saleId,
                    paymentId: item?.paymentId,
                    amount: item?.amountDue,
                    dueDate: item?.dueDate,
                    customerId: item?.customerId,
                  },
                  settings,
                }),
                parse_mode: "HTML",
              },
              dedupeToday: true,
            });
          }
        }
      }
      if (useRuleBuilder) {
        const checkRows = await getPendingInstallmentChecksWithCustomer().catch(
          () => [],
        );
        for (const item of checkRows || []) {
          const chatId = String(item?.telegramChatId || "").trim();
          const optedOut = String(item?.telegramOptedOut || "0").trim() === "1";
          if (
            !chatId ||
            optedOut ||
            String(
              (item as any)?.telegramInvalid ||
                (item as any)?.telegram_invalid ||
                "0",
            ) === "1"
          )
            continue;
          const due = parseAnyDate(item?.dueDate);
          if (!due) continue;
          const daysUntil = due.clone().startOf("day").diff(today, "days");
          if (!inSendWindow) continue;
          const customerId = Number(item?.customerId ?? item?.customer_id ?? 0);
          if (customerId && rulesCfg?.maxPerDayPerCustomer) {
            const sent = await hasCustomerDailyCap("telegram", customerId);
            const pending = await hasPendingCustomerCapInOutbox(
              "telegram",
              customerId,
            );
            if (sent || pending) continue;
          }
          const matches = (rules || []).filter((r) => {
            if (!reminderTargetsChecks(r as any)) return false;
            if (r.matchType === "days_until")
              return Number(r.value) === Number(daysUntil);
            if (r.matchType === "overdue_days")
              return Number(daysUntil) === -Math.abs(Number(r.value));
            return false;
          });
          if (!matches.length) continue;
          matches.sort((a, b) => {
            const pa =
              a.matchType === "overdue_days"
                ? 0
                : Number(a.value) === 0
                  ? 1
                  : 2;
            const pb =
              b.matchType === "overdue_days"
                ? 0
                : Number(b.value) === 0
                  ? 1
                  : 2;
            if (pa !== pb) return pa - pb;
            return Math.abs(Number(a.value)) - Math.abs(Number(b.value));
          });
          const rule = matches[0];
          const name = item?.customerFullName || "مشتری";
          const amount = formatMoneyFa(item?.amount);
          const dueDate = String(item?.dueDate || "").trim();
          const vars = {
            name,
            amount,
            dueDate,
            days: String(daysUntil),
            saleId: String(item?.saleId ?? ""),
            checkNumber: String(item?.checkNumber || "—"),
            bank: String(item?.bankName || "—"),
            type: "چک",
          };
          const tpl = markdownishToHtml(
            String((rule as any).checkTemplate || rule.template || ""),
          );
          const text = renderTplHtml(tpl, vars);
          await enqueueOutbox({
            channel: "telegram",
            eventType: `check_rule_${rule.id}`,
            entityType: "installment_check",
            entityId: Number(item?.checkId ?? 0) || null,
            recipient: chatId,
            payload: {
              text,
              chatId,
              reply_markup: buildTelegramDeepLinkKeyboard({
                primaryMenu: "installments",
                installment: {
                  saleId: item?.saleId,
                  checkId: item?.checkId,
                  amount: item?.amount,
                  dueDate: item?.dueDate,
                  customerId: item?.customerId,
                },
                settings,
              }),
              parse_mode: "HTML",
              capCustomerId: customerId || undefined,
              meta: {
                ruleId: rule.id,
                capCustomerId: customerId || undefined,
                checkId: item?.checkId,
              },
            },
            dedupeToday: true,
          });
        }
      }
    }
    if (enabledRepairs) {
      // VIP: notify on ANY status change (deduped by repair_notify_state)
      const repairs = await allAsync(
        `SELECT r.id, r.customerId, r.deviceModel, r.status, r.finalCost, r.dateReceived,
                c.fullName AS customerFullName,
                COALESCE(c.telegram_chat_id, c.telegramChatId) AS telegramChatId,
                COALESCE(c.telegram_opted_out,0) AS telegramOptedOut
         FROM repairs r
         JOIN customers c ON c.id = r.customerId
         WHERE COALESCE(c.telegram_chat_id, c.telegramChatId) IS NOT NULL
           AND TRIM(COALESCE(c.telegram_chat_id, c.telegramChatId)) != ''
         ORDER BY r.id DESC
         LIMIT 250`,
        [],
      ).catch(() => []);
      for (const item of repairs || []) {
        const chatId = String(item?.telegramChatId || "").trim();
        const optedOut = String(item?.telegramOptedOut || "0").trim() === "1";
        if (
          !chatId ||
          optedOut ||
          String(
            (item as any)?.telegramInvalid ||
              (item as any)?.telegram_invalid ||
              "0",
          ) === "1"
        )
          continue;
        const currentStatus = String(item?.status || "").trim();
        if (!currentStatus) continue;
        const st = await getAsync(
          `SELECT lastStatus FROM repair_notify_state WHERE repairId=? LIMIT 1`,
          [Number(item?.id ?? 0)],
        ).catch(() => null);
        const lastStatus = String(st?.lastStatus || "").trim();
        if (lastStatus && lastStatus === currentStatus) continue;
        // Enqueue notification
        const isReady =
          currentStatus.toLowerCase().includes("ready") ||
          currentStatus.includes("آماده");
        const text = isReady
          ? buildRepairReadyText(item, settings)
          : buildRepairStatusChangedText(item, settings);
        await enqueueOutbox({
          channel: "telegram",
          eventType: isReady ? "repair_ready" : "repair_status_changed",
          entityType: "repair",
          entityId: Number(item?.id ?? 0) || null,
          recipient: chatId,
          payload: {
            text,
            chatId,
            reply_markup: buildTelegramDeepLinkKeyboard({
              primaryMenu: "repairs",
              repair: { repairId: item?.id, customerId: item?.customerId },
              settings,
            }),
            parse_mode: "HTML",
          },
          dedupeToday: false,
        });
        // Update state immediately to avoid duplicates; outbox will retry if needed.
        await runAsync(
          `INSERT INTO repair_notify_state (repairId, lastStatus, lastNotifiedAt)
           VALUES (?,?,strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
           ON CONFLICT(repairId) DO UPDATE SET lastStatus=excluded.lastStatus, lastNotifiedAt=excluded.lastNotifiedAt`,
          [Number(item?.id ?? 0), currentStatus],
        ).catch(() => {});
      }
    }
    // kick worker (small batch)
    try {
      for (let i = 0; i < 20; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const did = await processOneOutboxRow();
        if (!did) break;
      }
    } catch {}
  } catch (e: any) {
    try {
      console.error(
        "Customer telegram notifications tick failed:",
        e?.message || e,
      );
    } catch {}
  }
};
  let customerTelegramNotifySchedulerStarted = false;
  const startCustomerTelegramNotifyScheduler = () => {
  if (customerTelegramNotifySchedulerStarted) return;
  customerTelegramNotifySchedulerStarted = true;
  // every 15 minutes (safe, deduped daily)
  try {
    cron.schedule("*/15 * * * *", async () => {
      await runCustomerTelegramNotificationsTick();
    });
  } catch (e) {
    try {
      console.error(
        "Failed to start customer telegram scheduler:",
        (e as any)?.message || e,
      );
    } catch {}
  }
  // run once shortly after boot
  setTimeout(() => {
    runCustomerTelegramNotificationsTick();
  }, 15_000);
};

  return {
    runCustomerTelegramNotificationsTick,
    startCustomerTelegramNotifyScheduler,
  };
};
