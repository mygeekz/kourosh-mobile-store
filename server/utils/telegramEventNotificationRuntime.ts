import moment from "jalali-moment";
import cron from "node-cron";
import { APP_MESSAGES } from "../../shared/messages";

type TelegramTopic = "reports" | "installments" | "sales" | "notifications";
type AutoSendMode = "off" | "sms" | "telegram" | "both";
type EnqueueOutbox = (payload: any) => Promise<any>;

type TelegramEventNotificationRuntimeDeps = {
  getAllSettingsAsObject: () => Promise<Record<string, any>>;
  setTelegramProxy: (proxy: any) => void;
  parseChatIdList: (input: any) => string[];
  enqueueOutbox: EnqueueOutbox;
  getInstallmentPaymentDetailsForSms: (id: number) => Promise<any>;
  getInstallmentCheckDetailsForSms: (id: number) => Promise<any>;
  getPendingInstallmentPaymentsWithCustomer: () => Promise<any[]>;
  getPendingInstallmentChecksWithCustomer: () => Promise<any[]>;
  getRepairsReadyForPickupFromDb: () => Promise<any[]>;
  getRepairDetailsForSms: (id: number) => Promise<any>;
  getAsync: (sql: string, params?: any[]) => Promise<any>;
  formatPriceForSms: (value: any) => string;
  buildAppLink: (baseUrl: string, path: string) => string;
  buildTelegramDeepLinkKeyboard: (opts: any) => any;
  safeReplaceTemplate: (template: string, vars: Record<string, any>) => string;
  getTelegramTemplateForAudience: (
    settings: Record<string, any>,
    baseKey: string,
    audience: "customer" | "partner" | "manager",
    fallback: string,
  ) => { template: string; parseMode?: string | null };
  normalizeTelegramParseMode: (mode: any) => string | undefined;
  sendTelegramMessages: (botToken: string, chatIds: any[], text: string) => Promise<any>;
  normalizeAutoSendMode: (value: any) => AutoSendMode;
  ensureReminderRulesTables: () => Promise<void>;
  getEnabledReminderRules: (channel?: any) => Promise<any[]>;
  runCustomerTelegramNotificationsTick: () => Promise<any>;
  processOneOutboxRow: () => Promise<boolean>;
};

export const createTelegramEventNotificationRuntime = ({
  getAllSettingsAsObject,
  setTelegramProxy,
  parseChatIdList,
  enqueueOutbox,
  getInstallmentPaymentDetailsForSms,
  getInstallmentCheckDetailsForSms,
  getPendingInstallmentPaymentsWithCustomer,
  getPendingInstallmentChecksWithCustomer,
  getRepairsReadyForPickupFromDb,
  getRepairDetailsForSms,
  getAsync,
  formatPriceForSms,
  buildAppLink,
  buildTelegramDeepLinkKeyboard,
  safeReplaceTemplate,
  getTelegramTemplateForAudience,
  normalizeTelegramParseMode,
  sendTelegramMessages,
  normalizeAutoSendMode,
  ensureReminderRulesTables,
  getEnabledReminderRules,
  runCustomerTelegramNotificationsTick,
  processOneOutboxRow,
}: TelegramEventNotificationRuntimeDeps) => {
  const enqueueTelegramAudienceCopies = async (opts: {
    settings: Record<string, any>;
    eventType: string;
    baseKey: string;
    customerFallback: string;
    vars: Record<string, any>;
    topic: "reports" | "installments" | "sales" | "notifications";
    entityType: string;
    entityId: number;
  }) => {
    const partnerCfg = getTelegramTemplateForAudience(
      opts.settings,
      opts.baseKey,
      "partner",
      opts.customerFallback,
    );
    const managerCfg = getTelegramTemplateForAudience(
      opts.settings,
      opts.baseKey,
      "manager",
      opts.customerFallback,
    );
    const partnerText = safeReplaceTemplate(
      String(partnerCfg.template || "").trim(),
      opts.vars,
    );
    const managerText = safeReplaceTemplate(
      String(managerCfg.template || "").trim(),
      opts.vars,
    );
    if (partnerText) {
      await enqueueTelegramToTopicTargets(
        opts.topic,
        `${opts.eventType}_PARTNER`,
        partnerText,
        {
          entityType: opts.entityType,
          entityId: opts.entityId,
        },
      );
    }
    if (managerText) {
      await enqueueTelegramToTopicTargets(
        "notifications",
        `${opts.eventType}_MANAGER`,
        managerText,
        {
          entityType: opts.entityType,
          entityId: opts.entityId,
        },
      );
    }
  };

  const getTelegramTargetsForTopic = async (
    topic: "reports" | "installments" | "sales" | "notifications",
  ): Promise<{ botToken: string; chatIds: string[] }> => {
    const settings = await getAllSettingsAsObject();
    setTelegramProxy((settings as any).telegram_proxy);
    const botToken = String(settings.telegram_bot_token || "").trim();
    const fallback = String(settings.telegram_chat_id || "").trim();
    const topicKey =
      topic === "reports"
        ? "telegram_chat_ids_reports"
        : topic === "installments"
          ? "telegram_chat_ids_installments"
          : topic === "sales"
            ? "telegram_chat_ids_sales"
            : "telegram_chat_ids_notifications";
    const chatIds = parseChatIdList((settings as any)[topicKey]);
    const finalIds = chatIds.length ? chatIds : fallback ? [fallback] : [];
    return { botToken, chatIds: finalIds };
  };
  const TOPIC_TYPES_KEYS: Record<string, string> = {
    reports: "telegram_topic_types_reports",
    installments: "telegram_topic_types_installments",
    sales: "telegram_topic_types_sales",
    notifications: "telegram_topic_types_notifications",
  };
  const getEnabledTypesForTopic = async (
    topic: "reports" | "installments" | "sales" | "notifications",
  ): Promise<Set<string>> => {
    const settings = await getAllSettingsAsObject();
    const key = TOPIC_TYPES_KEYS[topic];
    const raw = String((settings as any)[key] || "").trim();
    if (!raw) return new Set(); // empty => allow all
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map((x) => String(x)));
    } catch {
      // also accept comma/newline-separated
      const arr = raw
        .split(/[,\n\r\t\s]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length) return new Set(arr);
    }
    return new Set();
  };
  const isTopicTypeEnabled = async (
    topic: "reports" | "installments" | "sales" | "notifications",
    typeKey: string,
  ): Promise<boolean> => {
    const set = await getEnabledTypesForTopic(topic);
    if (!set.size) return true;
    return set.has(typeKey);
  };
  const enqueueTelegramToTopicTargets = async (
    topic: "reports" | "installments" | "sales" | "notifications",
    typeKey: string,
    text: string,
    meta?: { entityType?: string; entityId?: number },
  ) => {
    try {
      const ok = await isTopicTypeEnabled(topic, typeKey);
      if (!ok) return;
      const { botToken, chatIds } = await getTelegramTargetsForTopic(topic);
      if (!botToken || !chatIds.length) return;
      for (const chatId of chatIds) {
        // eslint-disable-next-line no-await-in-loop
        await enqueueOutbox({
          channel: "telegram",
          provider: null,
          eventType: typeKey,
          entityType: meta?.entityType || topic,
          entityId: meta?.entityId || null,
          recipient: String(chatId),
          payload: {
            text,
            chatId,
              parse_mode: "HTML",
          },
          dedupeToday: false,
        });
      }
    } catch {
      // never break main flows
    }
  };
  const enqueueEventNotifications = async (
    eventType: string,
    targetId: number,
    mode: "sms" | "telegram" | "both",
  ) => {
    const settings = await getAllSettingsAsObject();
    const provider: string = (
      settings.sms_provider || "meli_payamak"
    ).toLowerCase();
    // Build common payloads (same logic as manual trigger)
    if (eventType.startsWith("INSTALLMENT_")) {
      const p = await getInstallmentPaymentDetailsForSms(targetId);
      if (!p) return;
      const recipientNumber = String(p.customerPhoneNumber || "").trim();
      const tokens = [
        p.customerFullName,
        formatPriceForSms(p.amountDue),
        p.dueDate,
      ];
      // SMS identifiers
      const smsPayload: any = { provider, recipient: recipientNumber, tokens };
      if (eventType === "INSTALLMENT_DUE_7") {
        smsPayload.meliBodyId = Number(
          settings.meli_payamak_installment_due_7_pattern_id,
        );
        smsPayload.kavenegarTemplate =
          settings.kavenegar_installment_due_7_template;
        smsPayload.smsIrTemplateId = settings.sms_ir_installment_due_7_template_id
          ? Number(settings.sms_ir_installment_due_7_template_id)
          : undefined;
        smsPayload.ippanelPatternCode =
          settings.ippanel_installment_due_7_pattern_code;
      } else if (eventType === "INSTALLMENT_DUE_3") {
        smsPayload.meliBodyId = Number(
          settings.meli_payamak_installment_due_3_pattern_id,
        );
        smsPayload.kavenegarTemplate =
          settings.kavenegar_installment_due_3_template;
        smsPayload.smsIrTemplateId = settings.sms_ir_installment_due_3_template_id
          ? Number(settings.sms_ir_installment_due_3_template_id)
          : undefined;
        smsPayload.ippanelPatternCode =
          settings.ippanel_installment_due_3_pattern_code;
      } else if (eventType === "INSTALLMENT_DUE_TODAY") {
        smsPayload.meliBodyId = Number(
          (settings as any).meli_payamak_installment_due_notice_pattern_id ||
            settings.meli_payamak_installment_due_today_pattern_id,
        );
        smsPayload.kavenegarTemplate =
          settings.kavenegar_installment_due_today_template;
        smsPayload.smsIrTemplateId =
          settings.sms_ir_installment_due_today_template_id
            ? Number(settings.sms_ir_installment_due_today_template_id)
            : undefined;
        smsPayload.ippanelPatternCode =
          settings.ippanel_installment_due_today_pattern_code;
      } else if (eventType === "INSTALLMENT_REMINDER") {
        smsPayload.meliBodyId = Number(
          settings.meli_payamak_installment_due_notice_pattern_id ||
            settings.meli_payamak_installment_reminder_pattern_id,
        );
        smsPayload.kavenegarTemplate = settings.kavenegar_installment_template;
        smsPayload.smsIrTemplateId = settings.sms_ir_installment_template_id
          ? Number(settings.sms_ir_installment_template_id)
          : undefined;
        smsPayload.ippanelPatternCode = settings.ippanel_installment_pattern_code;
      } else if (eventType === "INSTALLMENT_COMPLETED") {
        smsPayload.meliBodyId =
          settings.meli_payamak_installment_settlement_pattern_id ||
          settings.meli_payamak_installment_completed_pattern_id
            ? Number(
                settings.meli_payamak_installment_settlement_pattern_id ||
                  settings.meli_payamak_installment_completed_pattern_id,
              )
            : undefined;
        smsPayload.kavenegarTemplate =
          settings.kavenegar_installment_completed_template;
        smsPayload.smsIrTemplateId =
          settings.sms_ir_installment_completed_template_id
            ? Number(settings.sms_ir_installment_completed_template_id)
            : undefined;
        smsPayload.ippanelPatternCode =
          settings.ippanel_installment_completed_pattern_code;
      } else {
        return;
      }
      // Telegram template
      const baseUrl = String((settings as any).app_base_url || "").trim();
      const link = buildAppLink(baseUrl, "installment-sales");
      const values: Record<string, any> = {
        name: tokens[0] ?? "",
        amount: tokens[1] ?? "",
        dueDate: tokens[2] ?? "",
        link,
        saleId: (p as any)?.saleId ?? "",
        customerId: (p as any)?.customerId ?? "",
      };
      const tgTemplateKey =
        eventType === "INSTALLMENT_DUE_7"
          ? "telegram_installment_due_7_message"
          : eventType === "INSTALLMENT_DUE_3"
            ? "telegram_installment_due_3_message"
            : eventType === "INSTALLMENT_DUE_TODAY"
              ? "telegram_installment_due_today_message"
              : eventType === "INSTALLMENT_COMPLETED"
                ? "telegram_installment_completed_message"
                : "telegram_installment_reminder_message";
      const tgTemplate = String((settings as any)[tgTemplateKey] || "").trim();
      // جایگزینی متغیرها مثل {name} {amount} {dueDate} {link}
      const build = (tpl: string, vals: Record<string, any>) =>
        safeReplaceTemplate(tpl, vals);
      const tgText = build(
        tgTemplate ||
          "🔔 یادآوری قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}",
        values,
      );
      if (mode === "sms" || mode === "both") {
        await enqueueOutbox({
          channel: "sms",
          provider,
          eventType,
          entityType: "installment_payment",
          entityId: targetId,
          recipient: recipientNumber,
          payload: smsPayload,
          dedupeToday: true,
        });
      }
      if (mode === "telegram" || mode === "both") {
        await enqueueOutbox({
          channel: "telegram",
          provider: null,
          eventType,
          entityType: "installment_payment",
          entityId: targetId,
          recipient: "telegram_chat",
          payload: {
            text: tgText,
            reply_markup: buildTelegramDeepLinkKeyboard({
              primaryMenu: "installments",
              installment: {
                saleId: values.saleId,
                paymentId: targetId,
                amount: (p as any)?.amountDue ?? values.amount,
                dueDate: (p as any)?.dueDate ?? values.dueDate,
                customerId: values.customerId,
              },
              settings,
            }),
            parse_mode: "HTML",
            capCustomerId: Number(values.customerId || 0) || undefined,
          },
          dedupeToday: true,
        });
      }
      // Optional: send an internal copy to configured installments chats
      try {
        const enabled = await isTopicTypeEnabled("installments", eventType);
        if (!enabled) {
          // skip internal copy
        } else {
          const { botToken, chatIds } =
            await getTelegramTargetsForTopic("installments");
          if (botToken && chatIds.length) {
            const adminText =
              `📌 یادآوری اقساط\n` +
              `مشتری: ${String((p as any)?.customerFullName || (p as any)?.customerName || "").trim()}\n` +
              `تاریخ: ${String((p as any)?.dueDate || "").trim()}\n` +
              `مبلغ: ${formatPriceForSms(Number((p as any)?.amount || 0))} تومان\n` +
              `وضعیت: ${eventType.replace("INSTALLMENT_", "")}`;
            await sendTelegramMessages(botToken, chatIds, adminText);
          }
        }
      } catch (e) {
        // do not fail the main flow
      }
      return;
    }
    if (eventType.startsWith("CHECK_")) {
      const c = await getInstallmentCheckDetailsForSms(targetId);
      if (!c) return;
      const recipientNumber = String(c.customerPhoneNumber || "").trim();
      const tokens = [
        c.customerFullName,
        c.checkNumber,
        c.dueDate,
        formatPriceForSms(c.amount),
      ];
      const smsPayload: any = { provider, recipient: recipientNumber, tokens };
      if (eventType === "CHECK_DUE_7") {
        smsPayload.meliBodyId = Number(
          settings.meli_payamak_check_due_7_pattern_id,
        );
        smsPayload.kavenegarTemplate = settings.kavenegar_check_due_7_template;
        smsPayload.smsIrTemplateId = settings.sms_ir_check_due_7_template_id
          ? Number(settings.sms_ir_check_due_7_template_id)
          : undefined;
        smsPayload.ippanelPatternCode = settings.ippanel_check_due_7_pattern_code;
      } else if (eventType === "CHECK_DUE_3") {
        smsPayload.meliBodyId = Number(
          settings.meli_payamak_check_due_3_pattern_id,
        );
        smsPayload.kavenegarTemplate = settings.kavenegar_check_due_3_template;
        smsPayload.smsIrTemplateId = settings.sms_ir_check_due_3_template_id
          ? Number(settings.sms_ir_check_due_3_template_id)
          : undefined;
        smsPayload.ippanelPatternCode = settings.ippanel_check_due_3_pattern_code;
      } else if (eventType === "CHECK_DUE_TODAY") {
        smsPayload.meliBodyId = Number(
          settings.meli_payamak_check_due_today_pattern_id,
        );
        smsPayload.kavenegarTemplate =
          settings.kavenegar_check_due_today_template;
        smsPayload.smsIrTemplateId = settings.sms_ir_check_due_today_template_id
          ? Number(settings.sms_ir_check_due_today_template_id)
          : undefined;
        smsPayload.ippanelPatternCode =
          settings.ippanel_check_due_today_pattern_code;
      } else {
        return;
      }
      const values: Record<string, string> = {
        name: tokens[0] ?? "",
        checkNumber: tokens[1] ?? "",
        dueDate: tokens[2] ?? "",
        amount: tokens[3] ?? "",
      };
      const tgTemplateKey =
        eventType === "CHECK_DUE_7"
          ? "telegram_check_due_7_message"
          : eventType === "CHECK_DUE_3"
            ? "telegram_check_due_3_message"
            : "telegram_check_due_today_message";
      const tgTemplate = String((settings as any)[tgTemplateKey] || "").trim();
      // جایگزینی متغیرها مثل {name} {amount} {dueDate} {link}
      const build = (tpl: string, vals: Record<string, any>) =>
        safeReplaceTemplate(tpl, vals);
      const tgText = build(
        tgTemplate ||
          "🧾 یادآوری چک\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}",
        values,
      );
      if (mode === "sms" || mode === "both") {
        await enqueueOutbox({
          channel: "sms",
          provider,
          eventType,
          entityType: "installment_check",
          entityId: targetId,
          recipient: recipientNumber,
          payload: smsPayload,
          dedupeToday: true,
        });
      }
      if (mode === "telegram" || mode === "both") {
        await enqueueOutbox({
          channel: "telegram",
          provider: null,
          eventType,
          entityType: "installment_check",
          entityId: targetId,
          recipient: "telegram_chat",
          payload: {
            text: tgText,
            capCustomerId: Number((c as any)?.customerId || 0) || undefined,
          },
          dedupeToday: true,
        });
      }
      return;
    }
    if (eventType === "REPAIR_READY_FOR_PICKUP") {
      const r = await getRepairDetailsForSms(targetId);
      if (!r || r.finalCost == null) return;
      const recipientNumber = String(r.customerPhoneNumber || "").trim();
      const tokens = [
        r.customerFullName,
        r.deviceModel,
        formatPriceForSms(r.finalCost),
      ];
      const smsPayload: any = {
        provider,
        recipient: recipientNumber,
        tokens,
        meliBodyId: Number(settings.meli_payamak_repair_ready_pattern_id),
        kavenegarTemplate: settings.kavenegar_repair_ready_template,
        smsIrTemplateId: settings.sms_ir_repair_ready_template_id
          ? Number(settings.sms_ir_repair_ready_template_id)
          : undefined,
        ippanelPatternCode: settings.ippanel_repair_ready_pattern_code,
      };
      const values: Record<string, string> = {
        name: tokens[0] ?? "",
        deviceModel: tokens[1] ?? "",
        finalCost: tokens[2] ?? "",
        repairId: String(targetId),
      };
      const tgTemplate = String(
        settings.telegram_repair_ready_message || "",
      ).trim();
      // جایگزینی متغیرها مثل {name} {amount} {dueDate} {link}
      const build = (tpl: string, vals: Record<string, any>) =>
        safeReplaceTemplate(tpl, vals);
      const tgText = build(
        tgTemplate ||
          "📦 آماده تحویل\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}\nهزینه نهایی: {finalCost}",
        values,
      );
      if (mode === "sms" || mode === "both") {
        await enqueueOutbox({
          channel: "sms",
          provider,
          eventType,
          entityType: "repair",
          entityId: targetId,
          recipient: recipientNumber,
          payload: smsPayload,
          dedupeToday: true,
        });
      }
      if (mode === "telegram" || mode === "both") {
        await enqueueOutbox({
          channel: "telegram",
          provider: null,
          eventType,
          entityType: "repair",
          entityId: targetId,
          recipient: "telegram_chat",
          payload: {
            text: tgText,
            reply_markup: buildTelegramDeepLinkKeyboard({
              primaryMenu: "repairs",
              repair: { repairId: targetId, customerId: (r as any)?.customerId },
              settings,
            }),
            parse_mode: "HTML",
            capCustomerId: Number((r as any)?.customerId || 0) || undefined,
          },
          dedupeToday: true,
        });
      }
    }
  };
  const sendCustomCustomerNotification = async (
    eventType:
      | "INSTALLMENT_SALE_CREATED"
      | "INSTALLMENT_DUE_NOTICE"
      | "INSTALLMENT_PAYMENT_RECEIVED"
      | "INSTALLMENT_SETTLED"
      | "INSTALLMENT_OVERDUE_NOTICE"
      | "REPAIR_RECEIVED_CONFIRMATION"
      | "REPAIR_COST_ESTIMATED"
      | "REPAIR_DELIVERED"
      | "REPAIR_STATUS_UPDATED"
      | "ACCOUNT_BALANCE_STATUS"
      | "CHECK_FAILED"
      | "INVOICE_CREATED"
      | "INVOICE_PAYMENT_RECEIVED",
    targetId: number,
    mode: "sms" | "telegram" | "both" = "both",
    extra?: Record<string, any>,
  ) => {
    const settings = await getAllSettingsAsObject();
    const provider = String(
      settings.sms_provider || "meli_payamak",
    ).toLowerCase();
    const baseUrl = String((settings as any).app_base_url || "").trim();
    let recipientNumber = "";
    let capCustomerId: number | undefined;
    let entityType = "customer";
    let vars: Record<string, any> = {};
    let smsKey = "";
    let tgKey = "";
    let fallbackTemplate = "";
    if (
      eventType === "INSTALLMENT_SALE_CREATED" ||
      eventType === "INSTALLMENT_SETTLED"
    ) {
      const s = (await getAsync(
        `SELECT s.id as saleId, s.customerId, s.actualSalePrice as totalPrice, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber
                                FROM installment_sales s JOIN customers c ON c.id=s.customerId WHERE s.id=?`,
        [targetId],
      )) as any;
      if (!s) return;
      recipientNumber = String(s.customerPhoneNumber || "").trim();
      capCustomerId = Number(s.customerId || 0) || undefined;
      entityType = "installment_sale";
      vars = {
        name: String(s.customerFullName || ""),
        saleId: String(s.saleId || targetId),
        total: formatPriceForSms(Number(s.totalPrice || 0)),
      };
      smsKey =
        eventType === "INSTALLMENT_SETTLED"
          ? "meli_payamak_installment_settlement_pattern_id"
          : "meli_payamak_installment_sale_created_pattern_id";
      tgKey =
        eventType === "INSTALLMENT_SETTLED"
          ? "telegram_installment_settlement_message"
          : "telegram_installment_sale_created_message";
      fallbackTemplate =
        eventType === "INSTALLMENT_SETTLED"
          ? APP_MESSAGES.telegram.installmentSettled
          : APP_MESSAGES.telegram.installmentSaleCreated;
    } else if (
      eventType === "INSTALLMENT_DUE_NOTICE" ||
      eventType === "INSTALLMENT_PAYMENT_RECEIVED" ||
      eventType === "INSTALLMENT_OVERDUE_NOTICE"
    ) {
      const p = (await getAsync(
        `SELECT ip.id as paymentId, ip.saleId, ip.customerId, ip.amountDue, ip.dueDate, ip.remainingAmount, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber
                                FROM (
                                  SELECT ip.id, ip.saleId, s.customerId, ip.amountDue, ip.dueDate,
                                    MAX(0, COALESCE(ip.amountDue,0) - COALESCE((SELECT SUM(t.amount_paid) FROM installment_transactions t WHERE t.installment_payment_id=ip.id),0)) as remainingAmount
                                  FROM installment_payments ip JOIN installment_sales s ON s.id=ip.saleId
                                ) ip
                                JOIN customers c ON c.id=ip.customerId
                                WHERE ip.id=?`,
        [targetId],
      )) as any;
      if (!p) return;
      recipientNumber = String(p.customerPhoneNumber || "").trim();
      capCustomerId = Number(p.customerId || 0) || undefined;
      entityType = "installment_payment";
      vars = {
        name: String(p.customerFullName || ""),
        amount: formatPriceForSms(Number(extra?.amount ?? p.amountDue ?? 0)),
        dueDate: String(p.dueDate || ""),
        remaining: formatPriceForSms(
          Number(extra?.remaining ?? p.remainingAmount ?? 0),
        ),
        saleId: String(p.saleId || ""),
      };
      smsKey =
        eventType === "INSTALLMENT_OVERDUE_NOTICE"
          ? "meli_payamak_installment_overdue_pattern_id"
          : eventType === "INSTALLMENT_DUE_NOTICE"
            ? "meli_payamak_installment_due_notice_pattern_id"
            : "meli_payamak_payment_confirmation_pattern_id";
      tgKey =
        eventType === "INSTALLMENT_OVERDUE_NOTICE"
          ? "telegram_installment_overdue_message"
          : eventType === "INSTALLMENT_DUE_NOTICE"
            ? "telegram_installment_due_notice_message"
            : "telegram_installment_completed_message";
      fallbackTemplate =
        eventType === "INSTALLMENT_OVERDUE_NOTICE"
          ? "مشتری گرامی {name}، پرداخت قسط شما به مبلغ {amount} تومان با سررسید {dueDate} هنوز در سیستم ما ثبت نشده است. لطفاً جهت پیگیری اقدام فرمایید. فروشگاه کوروش"
          : eventType === "INSTALLMENT_DUE_NOTICE"
            ? "مشتری گرامی {name}، قسط شما با سررسید {dueDate} آماده پرداخت است. مبلغ: {amount} تومان. موبایل کوروش"
            : "مشتری گرامی {name}، پرداخت قسط شما به مبلغ {amount} تومان با موفقیت در سیستم ثبت شد. از پرداخت به موقع شما سپاسگزاریم. فروشگاه کوروش";
    } else if (
      eventType === "REPAIR_RECEIVED_CONFIRMATION" ||
      eventType === "REPAIR_COST_ESTIMATED" ||
      eventType === "REPAIR_DELIVERED" ||
      eventType === "REPAIR_STATUS_UPDATED"
    ) {
      const r = (await getAsync(
        `SELECT r.id, r.customerId, r.deviceModel, r.status, r.estimatedCost, r.finalCost, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber
                                FROM repairs r JOIN customers c ON c.id=r.customerId WHERE r.id=?`,
        [targetId],
      )) as any;
      if (!r) return;
      recipientNumber = String(r.customerPhoneNumber || "").trim();
      capCustomerId = Number(r.customerId || 0) || undefined;
      entityType = "repair";
      vars = {
        name: String(r.customerFullName || ""),
        deviceModel: String(r.deviceModel || ""),
        repairId: String(r.id || targetId),
        estimatedCost: formatPriceForSms(Number(r.estimatedCost || 0)),
        finalCost: formatPriceForSms(Number(r.finalCost || 0)),
        status: String(extra?.status || r.status || ""),
      };
      smsKey =
        eventType === "REPAIR_RECEIVED_CONFIRMATION"
          ? "meli_payamak_repair_received_pattern_id"
          : eventType === "REPAIR_COST_ESTIMATED"
            ? "meli_payamak_repair_cost_notice_pattern_id"
            : eventType === "REPAIR_DELIVERED"
              ? "meli_payamak_repair_delivered_pattern_id"
              : "meli_payamak_repair_status_pattern_id";
      tgKey =
        eventType === "REPAIR_RECEIVED_CONFIRMATION"
          ? "telegram_repair_received_message"
          : eventType === "REPAIR_COST_ESTIMATED"
            ? "telegram_repair_cost_notice_message"
            : eventType === "REPAIR_DELIVERED"
              ? "telegram_repair_delivered_message"
              : "telegram_repair_status_message";
      fallbackTemplate =
        eventType === "REPAIR_RECEIVED_CONFIRMATION"
          ? "مشتری گرامی {name}، دستگاه {deviceModel} شما جهت تعمیرات در فروشگاه کوروش پذیرش و با کد رهگیری {repairId} ثبت گردید. وضعیت دستگاه از طریق تماس با فروشگاه قابل پیگیری است. موبایل کوروش"
          : eventType === "REPAIR_COST_ESTIMATED"
            ? "مشتری گرامی {name}، هزینه تعمیرات دستگاه {deviceModel} شما مبلغ {estimatedCost} تومان برآورد شده است. لطفاً جهت تأیید و ادامه فرآیند تعمیر با فروشگاه تماس حاصل فرمایید. فروشگاه کوروش. موبایل کوروش"
            : eventType === "REPAIR_DELIVERED"
              ? "مشتری گرامی {name}، دستگاه {deviceModel} با موفقیت تحویل شد. شماره رسید: {repairId}. سپاس از همراهی شما. موبایل کوروش"
              : "تعمیرات کوروش: دستگاه شما {deviceModel} در وضعیت {status} است. موبایل کوروش";
    } else if (eventType === "ACCOUNT_BALANCE_STATUS") {
      const c = (await getAsync(
        `SELECT id, fullName, phoneNumber, COALESCE((SELECT balance FROM customer_ledger WHERE customerId=customers.id ORDER BY id DESC LIMIT 1),0) AS currentBalance FROM customers WHERE id=?`,
        [targetId],
      )) as any;
      if (!c) return;
      recipientNumber = String(c.phoneNumber || "").trim();
      capCustomerId = Number(c.id || 0) || undefined;
      entityType = "customer";
      const bal = Number(c.currentBalance || 0);
      vars = {
        name: String(c.fullName || ""),
        status: bal > 0 ? "بدهی شما" : bal < 0 ? "طلب شما" : "تسویه",
        amount: formatPriceForSms(Math.abs(bal)),
      };
      smsKey = "meli_payamak_account_balance_pattern_id";
      tgKey = "telegram_account_balance_message";
      fallbackTemplate =
        "وضعیت حساب کوروش: {status} {amount} تومان. موبایل کوروش";
    } else if (eventType === "CHECK_FAILED") {
      const c = (await getAsync(
        `SELECT ic.id, ic.saleId, ic.amount, ic.dueDate, s.customerId, cu.fullName as customerFullName, cu.phoneNumber as customerPhoneNumber
                                FROM installment_checks ic JOIN installment_sales s ON s.id=ic.saleId JOIN customers cu ON cu.id=s.customerId WHERE ic.id=?`,
        [targetId],
      )) as any;
      if (!c) return;
      recipientNumber = String(c.customerPhoneNumber || "").trim();
      capCustomerId = Number(c.customerId || 0) || undefined;
      entityType = "installment_check";
      vars = {
        name: String(c.customerFullName || ""),
        dueDate: String(c.dueDate || ""),
        amount: formatPriceForSms(Number(c.amount || 0)),
      };
      smsKey = "meli_payamak_check_failed_pattern_id";
      tgKey = "telegram_check_failed_message";
      fallbackTemplate =
        "مشتری گرامی {name}، وضعیت چک شما در تاریخ {dueDate} عملیات ناعملیات با موفقیت انجام شد بود ثبت شد. مبلغ: {amount} تومان. لطفاً پیگیری فرمایید. موبایل کوروش";
    } else if (eventType === "INVOICE_CREATED") {
      const inv = (await getAsync(
        `SELECT so.id, so.customerId, so.grandTotal, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber
                                  FROM sales_orders so LEFT JOIN customers c ON c.id=so.customerId WHERE so.id=?`,
        [targetId],
      )) as any;
      if (!inv || !inv.customerId) return;
      recipientNumber = String(inv.customerPhoneNumber || "").trim();
      capCustomerId = Number(inv.customerId || 0) || undefined;
      entityType = "sales_order";
      vars = {
        name: String(inv.customerFullName || ""),
        invoiceNo: String(inv.id || targetId),
        total: formatPriceForSms(Number(inv.grandTotal || 0)),
      };
      smsKey = "meli_payamak_invoice_created_pattern_id";
      tgKey = "telegram_invoice_created_message";
      fallbackTemplate =
        "مشتری گرامی {name}، فاکتور شما ثبت شد. شماره فاکتور: {invoiceNo}. مبلغ قابل پرداخت: {total} تومان. موبایل کوروش";
    } else if (eventType === "INVOICE_PAYMENT_RECEIVED") {
      const customerId = Number(extra?.customerId || targetId || 0);
      const c = (await getAsync(
        `SELECT id, fullName, phoneNumber FROM customers WHERE id=?`,
        [customerId],
      )) as any;
      if (!c) return;
      recipientNumber = String(c.phoneNumber || "").trim();
      capCustomerId = Number(c.id || 0) || undefined;
      entityType = "customer";
      vars = {
        name: String(c.fullName || ""),
        invoiceNo: String(extra?.invoiceNo || "—"),
        amount: formatPriceForSms(Number(extra?.amount || 0)),
      };
      smsKey = "meli_payamak_invoice_payment_received_pattern_id";
      tgKey = "telegram_invoice_payment_received_message";
      fallbackTemplate =
        "مشتری گرامی {name}، پرداخت فاکتور {invoiceNo} به مبلغ {amount} تومان ثبت شد. موبایل کوروش";
    }
    if (!recipientNumber && mode !== "telegram") return;
    const customerTelegram = getTelegramTemplateForAudience(
      settings as any,
      tgKey,
      "customer",
      fallbackTemplate,
    );
    const text = safeReplaceTemplate(
      String(customerTelegram.template || "").trim(),
      vars,
    );
    const maybeBodyId = Number((settings as any)[smsKey] || 0) || undefined;
    if (
      (mode === "sms" || mode === "both") &&
      provider === "meli_payamak" &&
      recipientNumber &&
      maybeBodyId
    ) {
      const tokenCandidates = [
        vars.name,
        vars.saleId,
        vars.total,
        vars.amount,
        vars.dueDate,
        vars.remaining,
        vars.deviceModel,
        vars.repairId,
        vars.status,
      ];
      const tokens = tokenCandidates
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
        .slice(0, 4)
        .map((v) => String(v));
      await enqueueOutbox({
        channel: "sms",
        provider,
        eventType,
        entityType,
        entityId: targetId,
        recipient: recipientNumber,
        payload: {
          provider,
          recipient: recipientNumber,
          tokens,
          meliBodyId: maybeBodyId,
        },
        dedupeToday: false,
      });
    }
    if ((mode === "telegram" || mode === "both") && capCustomerId && text) {
      await enqueueOutbox({
        channel: "telegram",
        provider: null,
        eventType,
        entityType,
        entityId: targetId,
        recipient: "telegram_chat",
        payload: {
          text,
          parse_mode: normalizeTelegramParseMode(customerTelegram.parseMode),
          capCustomerId,
        },
        dedupeToday: false,
      });
    }
    if (mode === "telegram" || mode === "both") {
      const topic =
        eventType.startsWith("INSTALLMENT_") ||
        eventType === "CHECK_FAILED" ||
        eventType === "ACCOUNT_BALANCE_STATUS"
          ? "installments"
          : eventType.startsWith("INVOICE_")
            ? "sales"
            : "notifications";
      await enqueueTelegramAudienceCopies({
        settings: settings as any,
        eventType,
        baseKey: tgKey,
        customerFallback: fallbackTemplate,
        vars,
        topic: topic as any,
        entityType,
        entityId: targetId,
      });
    }
  };
  const runAutoSendRulesOnce = async () => {
    const settings = await getAllSettingsAsObject();
    const modeInstallment = normalizeAutoSendMode(
      (settings as any).auto_send_installment_due,
    );
    const modeCheck = normalizeAutoSendMode(
      (settings as any).auto_send_check_due,
    );
    const modeRepair = normalizeAutoSendMode(
      (settings as any).auto_send_repair_ready,
    );
    // compute target due dates in Shamsi (stored in DB as jYYYY/jMM/jDD)
    const nowJ = moment().locale("fa");
    const d0 = nowJ.clone().format("jYYYY/jMM/jDD");
    const d3 = nowJ.clone().add(3, "day").format("jYYYY/jMM/jDD");
    const d7 = nowJ.clone().add(7, "day").format("jYYYY/jMM/jDD");
    // If Rule Builder has active Telegram rules, use it as the source of truth for Telegram installment reminders.
    // Legacy auto-send will continue only for SMS (or when no rule exists) so Telegram does not ignore Rule Builder.
    let hasTelegramReminderRules = false;
    try {
      await ensureReminderRulesTables();
      const activeTelegramRules = await getEnabledReminderRules("telegram");
      hasTelegramReminderRules = (activeTelegramRules || []).length > 0;
    } catch {
      hasTelegramReminderRules = false;
    }
    if (
      hasTelegramReminderRules &&
      (modeInstallment === "telegram" || modeInstallment === "both")
    ) {
      await runCustomerTelegramNotificationsTick();
    }
    const legacyInstallmentMode: "off" | "sms" | "telegram" | "both" =
      hasTelegramReminderRules
        ? modeInstallment === "both"
          ? "sms"
          : modeInstallment === "telegram"
            ? "off"
            : modeInstallment
        : modeInstallment;
    // installments
    if (legacyInstallmentMode !== "off") {
      const rows = await getPendingInstallmentPaymentsWithCustomer();
      const mapDue: Record<string, string> = {
        [d7]: "INSTALLMENT_DUE_7",
        [d3]: "INSTALLMENT_DUE_3",
        [d0]: "INSTALLMENT_DUE_TODAY",
      };
      for (const r of (rows || []) as any[]) {
        const et = mapDue[String(r.dueDate)];
        if (!et) continue;
        // eslint-disable-next-line no-await-in-loop
        await enqueueEventNotifications(
          et,
          Number(r.paymentId),
          legacyInstallmentMode === "both"
            ? "both"
            : (legacyInstallmentMode as any),
        );
      }
    }
    // checks
    if (modeCheck !== "off") {
      const rows = await getPendingInstallmentChecksWithCustomer();
      const mapDue: Record<string, string> = {
        [d7]: "CHECK_DUE_7",
        [d3]: "CHECK_DUE_3",
        [d0]: "CHECK_DUE_TODAY",
      };
      for (const r of (rows || []) as any[]) {
        const et = mapDue[String(r.dueDate)];
        if (!et) continue;
        // eslint-disable-next-line no-await-in-loop
        await enqueueEventNotifications(
          et,
          Number(r.checkId),
          modeCheck === "both" ? "both" : (modeCheck as any),
        );
      }
    }
    // repairs ready
    if (modeRepair !== "off") {
      const rows = await getRepairsReadyForPickupFromDb();
      for (const r of (rows || []) as any[]) {
        // eslint-disable-next-line no-await-in-loop
        await enqueueEventNotifications(
          "REPAIR_READY_FOR_PICKUP",
          Number(r.id),
          modeRepair === "both" ? "both" : (modeRepair as any),
        );
      }
    }
    // process a small batch immediately
    try {
      for (let i = 0; i < 20; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const did = await processOneOutboxRow();
        if (!did) break;
      }
    } catch (e: any) {
      try {
        console.error("Telegram sendMessage failed:", e?.message || e);
      } catch {}
    }
  };

  let autoSendSchedulerStarted = false;
  const startAutoSendScheduler = () => {
    if (autoSendSchedulerStarted) return;
    autoSendSchedulerStarted = true;
    // run daily 09:00
    try {
      cron.schedule("0 9 * * *", async () => {
        try {
          await runAutoSendRulesOnce();
        } catch (e) {
          console.error("Auto-send rule error:", e);
        }
      });
    } catch (e) {
      console.error("Failed to start auto-send scheduler:", e);
    }
  };

  return {
    getTelegramTargetsForTopic,
    isTopicTypeEnabled,
    enqueueTelegramToTopicTargets,
    enqueueTelegramAudienceCopies,
    enqueueEventNotifications,
    sendCustomCustomerNotification,
    runAutoSendRulesOnce,
    startAutoSendScheduler,
  };
};
