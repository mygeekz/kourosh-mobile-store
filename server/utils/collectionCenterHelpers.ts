import moment from "jalali-moment";
import { allAsync, fromShamsiStringToISO } from "../database";
import {
  formatReportMoneyText,
  getProductSalesDocKey,
  productSalesRiskLevelMeta,
} from "./productSalesReportHelpers";

export const extractCollectionCenterAction = (note: any) => {
  const match = String(note || "").match(/\[action:([^\]]+)\]/);
  return match ? String(match[1] || "").trim() : "";
};

export const COLLECTION_KANBAN_STAGE_META: Record<
  string,
  { label: string; rank: number }
> = {
  new: { label: "جدید", rank: 1 },
  waiting: { label: "در انتظار پاسخ", rank: 2 },
  promise: { label: "قول پرداخت", rank: 3 },
  today: { label: "امروز پیگیری شود", rank: 4 },
  critical: { label: "بحرانی", rank: 5 },
  settled: { label: "تسویه/بسته شد", rank: 0 },
};

export const collectionCenterKanbanMeta = (stage: any) =>
  COLLECTION_KANBAN_STAGE_META[String(stage || "new")] ||
  COLLECTION_KANBAN_STAGE_META.new;

export const extractCollectionCenterKanbanStage = (note: any) => {
  const action = extractCollectionCenterAction(note);
  const match = String(action || "").match(
    /^kanban_(new|waiting|promise|today|critical|settled)$/,
  );
  return match ? match[1] : "";
};

export const deriveCollectionCenterKanbanStage = (
  item: any,
  history: any[],
  customerHistory: any[],
) => {
  const ownHistory = (Array.isArray(history) ? history : [])
    .filter((h: any) => h && h.createdAt)
    .sort(
      (a: any, b: any) =>
        moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf(),
    );
  const explicit = ownHistory.find((h: any) =>
    extractCollectionCenterKanbanStage(h.note),
  );
  if (explicit)
    return extractCollectionCenterKanbanStage(explicit.note) || "new";

  const allHistory = (
    ownHistory.length
      ? ownHistory
      : Array.isArray(customerHistory)
        ? customerHistory
        : []
  )
    .filter((h: any) => h && h.createdAt)
    .sort(
      (a: any, b: any) =>
        moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf(),
    );
  const lastAction =
    allHistory
      .map((h: any) => ({
        ...h,
        action: extractCollectionCenterAction(h.note),
      }))
      .find((h: any) => h.action) || null;
  const today = moment().startOf("day");
  const nextFollowup = lastAction?.nextFollowupDate
    ? moment(lastAction.nextFollowupDate)
    : null;
  if (
    nextFollowup &&
    nextFollowup.isValid() &&
    nextFollowup.isSameOrBefore(today.clone().endOf("day"))
  )
    return "today";
  if (
    String(item?.level || "") === "critical" ||
    item?.automation?.shouldEscalate
  )
    return "critical";
  if (lastAction?.action === "promise_payment") return "promise";
  if (lastAction?.action === "reviewed") return "settled";
  if (lastAction?.action === "move_tomorrow") return "today";
  if (
    lastAction?.action === "call_done" ||
    lastAction?.action === "message_sent"
  )
    return "waiting";
  if (
    Number(item?.overdueDays || 0) > 0 ||
    String(item?.level || "") === "urgent"
  )
    return "today";
  return "new";
};

export const productSalesCollectionLevelFromScore = (score: number) =>
  productSalesRiskLevelMeta(Math.min(100, Math.max(0, Number(score || 0))));

export const buildCollectionCenterAutomation = (
  item: any,
  history: any[],
  customerHistory: any[],
) => {
  const safeHistory = Array.isArray(history) ? history : [];
  const safeCustomerHistory = Array.isArray(customerHistory)
    ? customerHistory
    : [];
  const allHistory = [...safeHistory, ...safeCustomerHistory]
    .filter((h: any) => h && h.createdAt)
    .sort(
      (a: any, b: any) =>
        moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf(),
    );

  const actionRows = allHistory
    .map((h: any) => ({ ...h, action: extractCollectionCenterAction(h.note) }))
    .filter((h: any) => h.action);
  let unansweredAttempts = 0;
  for (const h of actionRows) {
    if (String(h.action || "").startsWith("kanban_")) {
      if (h.action === "kanban_promise" || h.action === "kanban_settled") break;
      continue;
    }
    if (h.action === "promise_payment" || h.action === "reviewed") break;
    if (
      h.action === "call_done" ||
      h.action === "message_sent" ||
      h.action === "move_tomorrow"
    )
      unansweredAttempts += 1;
  }

  const lastAction = actionRows[0] || null;
  const score = Number(item?.score || 0);
  const outstanding = Number(item?.outstandingAmount || 0);
  const collectionRate = Number(item?.collectionRate || 0);
  const overdueDays = Number(item?.overdueDays || 0);
  const level = String(item?.level || "low");
  const customerName = String(item?.customerName || "مشتری").trim() || "مشتری";
  const phone = String(item?.customerPhone || "").trim();
  const docTitle =
    (String(item?.sourceType || "invoice") === "installment"
      ? "فروش اقساطی"
      : "فاکتور") +
    " شماره " +
    Number(item?.orderId || 0).toLocaleString("fa-IR");
  const outstandingText = formatReportMoneyText(outstanding);

  const shouldEscalate =
    unansweredAttempts >= 3 ||
    (unansweredAttempts >= 2 && (level === "critical" || overdueDays > 14));
  const escalationBonus =
    unansweredAttempts >= 4
      ? 18
      : unansweredAttempts >= 3
        ? 12
        : unansweredAttempts >= 2
          ? 6
          : 0;
  const adjustedScore = Math.min(100, Math.round(score + escalationBonus));
  const adjustedMeta = productSalesCollectionLevelFromScore(adjustedScore);

  let recommendedAction = "message_sent";
  let recommendedActionLabel = "ارسال پیامک/تلگرام";
  if (shouldEscalate || level === "critical") {
    recommendedAction = "call_done";
    recommendedActionLabel = "تماس فوری";
  } else if (unansweredAttempts >= 1 || level === "urgent") {
    recommendedAction = "call_done";
    recommendedActionLabel = "تماس پیگیری";
  } else if (collectionRate >= 70 && overdueDays <= 0) {
    recommendedAction = "message_sent";
    recommendedActionLabel = "یادآوری محترمانه";
  }

  const nextDays = shouldEscalate
    ? 0
    : level === "critical"
      ? 0
      : level === "urgent"
        ? 1
        : level === "followup"
          ? 2
          : 4;
  const suggestedNextFollowupDate = moment()
    .add(nextDays, "day")
    .endOf("day")
    .toISOString();
  const duePhrase =
    overdueDays > 0
      ? "با توجه به " + overdueDays.toLocaleString("fa-IR") + " روز تأخیر،"
      : "طبق وضعیت حساب،";
  const urgencyPhrase = shouldEscalate
    ? "این مورد به دلیل چند پیگیری بی‌پاسخ در اولویت بالاتر قرار گرفته است."
    : level === "critical"
      ? "این مورد در وضعیت بحرانی است."
      : level === "urgent"
        ? "این مورد نیاز به پیگیری فوری دارد."
        : "این مورد برای پیگیری منظم پیشنهاد شده است.";

  const callScript =
    "سلام وقت بخیر، از فروشگاه کوروش تماس می‌گیرم. بابت " +
    docTitle +
    "، مانده حساب شما " +
    outstandingText +
    " است. " +
    duePhrase +
    " لطفاً زمان دقیق پرداخت یا واریز مرحله بعد را اعلام بفرمایید تا در پرونده ثبت کنم.";
  const smsText =
    "مشتری گرامی " +
    customerName +
    "، مانده " +
    docTitle +
    " شما " +
    outstandingText +
    " است. لطفاً زمان پرداخت را اعلام بفرمایید. فروشگاه کوروش";
  const telegramText =
    "سلام " +
    customerName +
    " عزیز 🌿\nبرای " +
    docTitle +
    " مبلغ " +
    outstandingText +
    " مانده ثبت شده است. لطفاً زمان پرداخت یا هماهنگی بعدی را اعلام بفرمایید.\nفروشگاه کوروش";

  const touchPlan = [
    shouldEscalate
      ? "تماس مستقیم با مشتری و ثبت نتیجه مکالمه"
      : recommendedAction === "call_done"
        ? "تماس کوتاه و گرفتن زمان پرداخت"
        : "ارسال پیام یادآوری محترمانه",
    collectionRate < 50
      ? "در صورت عدم پاسخ، پیگیری دوباره در همان روز کاری"
      : "پیگیری بعدی طبق تاریخ پیشنهادی سیستم",
    outstanding > 10000000
      ? "در صورت قول پرداخت، مبلغ و تاریخ دقیق در تاریخچه ثبت شود"
      : "بعد از وصول، سند به عنوان بررسی‌شده علامت‌گذاری شود",
  ];

  return {
    status: shouldEscalate ? "escalated" : lastAction ? "watch" : "ready",
    label: shouldEscalate
      ? "افزایش ریسک خودکار"
      : lastAction
        ? "در چرخه پیگیری"
        : "آماده شروع پیگیری",
    reason: shouldEscalate
      ? "بعد از " +
        unansweredAttempts.toLocaleString("fa-IR") +
        " اقدام بدون نتیجه قطعی، سطح پیگیری باید بالاتر برود."
      : urgencyPhrase,
    unansweredAttempts,
    escalationBonus,
    shouldEscalate,
    adjustedScore,
    adjustedLevel: adjustedMeta.level,
    adjustedLabel: adjustedMeta.label,
    recommendedAction,
    recommendedActionLabel,
    suggestedNextFollowupDate,
    callScript,
    smsText,
    telegramText,
    touchPlan,
    lastAction: lastAction
      ? {
          key: lastAction.action,
          at: lastAction.createdAt || null,
          by: lastAction.createdByUsername || "",
          note: lastAction.note || "",
        }
      : null,
    hasPhone: Boolean(phone),
  };
};

export const buildCollectionCenterMarker = (sourceType: any, orderId: any) =>
  `[collection:${String(sourceType || "invoice")}:${Number(orderId || 0)}]`;

export const collectionCenterActionMeta = (action: any) => {
  const key = String(action || "reviewed").trim();
  const map: Record<
    string,
    { label: string; nextDays: number | null; icon: string }
  > = {
    call_done: { label: "تماس گرفتم", nextDays: 2, icon: "fa-phone" },
    message_sent: {
      label: "پیامک/تلگرام ارسال شد",
      nextDays: 1,
      icon: "fa-paper-plane",
    },
    promise_payment: {
      label: "قول پرداخت گرفتیم",
      nextDays: 3,
      icon: "fa-handshake",
    },
    move_tomorrow: {
      label: "انتقال به فردا",
      nextDays: 1,
      icon: "fa-calendar-plus",
    },
    reviewed: { label: "بررسی شد", nextDays: null, icon: "fa-check" },
    kanban_new: {
      label: "انتقال به ستون جدید",
      nextDays: 2,
      icon: "fa-sparkles",
    },
    kanban_waiting: {
      label: "انتقال به در انتظار پاسخ",
      nextDays: 2,
      icon: "fa-hourglass-half",
    },
    kanban_promise: {
      label: "انتقال به قول پرداخت",
      nextDays: 3,
      icon: "fa-handshake",
    },
    kanban_today: {
      label: "انتقال به امروز پیگیری شود",
      nextDays: 0,
      icon: "fa-calendar-day",
    },
    kanban_critical: {
      label: "انتقال به بحرانی",
      nextDays: 0,
      icon: "fa-triangle-exclamation",
    },
    kanban_settled: {
      label: "انتقال به تسویه/بسته شد",
      nextDays: null,
      icon: "fa-circle-check",
    },
  };
  return map[key] || map.reviewed;
};

export const defaultCollectionCenterNextDate = (action: any, provided?: any) => {
  const raw = String(provided || "").trim();
  if (raw) {
    const j = moment(raw, "jYYYY/jMM/jDD", true);
    if (j.isValid()) return j.endOf("day").toISOString();
    const iso = moment(raw);
    if (iso.isValid()) return iso.endOf("day").toISOString();
  }
  const meta = collectionCenterActionMeta(action);
  if (meta.nextDays == null) return null;
  return moment().add(meta.nextDays, "day").endOf("day").toISOString();
};

export async function enrichCollectionCenterItems(items: any[]) {
  const safeItems = Array.isArray(items) ? items : [];
  const customerIds = Array.from(
    new Set(
      safeItems
        .map((item) => Number(item.customerId || 0))
        .filter((id) => id > 0),
    ),
  );
  const historyMap = new Map<string, any[]>();
  const customerHistoryMap = new Map<number, any[]>();

  if (customerIds.length) {
    const placeholders = customerIds.map(() => "?").join(",");
    try {
      const rows = await allAsync(
        `SELECT cf.id, cf.customerId, cf.createdAt, cf.createdByUsername, cf.note, cf.nextFollowupDate, cf.status,
                c.fullName AS customerName, c.phoneNumber AS customerPhone
           FROM customer_followups cf
           JOIN customers c ON c.id = cf.customerId
          WHERE cf.customerId IN (${placeholders})
            AND (cf.note LIKE '%[collection:%' OR cf.note LIKE '%وصول%' OR cf.note LIKE '%پیگیری%')
          ORDER BY datetime(cf.createdAt) DESC, cf.id DESC
          LIMIT 800`,
        customerIds,
      );
      for (const row of rows as any[]) {
        const cid = Number(row.customerId || 0);
        const cArr = customerHistoryMap.get(cid) || [];
        if (cArr.length < 10) cArr.push(row);
        customerHistoryMap.set(cid, cArr);
        const note = String(row.note || "");
        const markerMatch = note.match(/\[collection:([^:\]]+):(\d+)\]/);
        if (markerMatch) {
          const key = getProductSalesDocKey(
            markerMatch[1],
            Number(markerMatch[2] || 0),
          );
          const arr = historyMap.get(key) || [];
          if (arr.length < 12) arr.push(row);
          historyMap.set(key, arr);
        }
      }
    } catch {}
  }

  const todayStart = moment().startOf("day").valueOf();
  return safeItems.map((item) => {
    const key = getProductSalesDocKey(
      String(item.sourceType || "invoice"),
      Number(item.orderId || 0),
    );
    const history = historyMap.get(key) || [];
    const customerHistory =
      customerHistoryMap.get(Number(item.customerId || 0)) || [];
    const last = history[0] || customerHistory[0] || null;
    const lastTime = last?.createdAt ? moment(last.createdAt).valueOf() : 0;
    const touchedToday = Boolean(lastTime && lastTime >= todayStart);
    const automation = buildCollectionCenterAutomation(
      item,
      history,
      customerHistory,
    );
    const adjustedMeta = automation.shouldEscalate
      ? productSalesCollectionLevelFromScore(
          Number(automation.adjustedScore || item.score || 0),
        )
      : null;
    const enrichedBase: any = {
      ...item,
      level: adjustedMeta?.level || item.level,
      label: adjustedMeta?.label || item.label,
      score: automation.shouldEscalate
        ? Number(automation.adjustedScore || item.score || 0)
        : item.score,
      reasons: automation.shouldEscalate
        ? [...(item.reasons || []), automation.reason]
        : item.reasons || [],
      automation,
    };
    const kanbanStage = deriveCollectionCenterKanbanStage(
      enrichedBase,
      history,
      customerHistory,
    );
    const kanban = collectionCenterKanbanMeta(kanbanStage);
    return {
      ...enrichedBase,
      marker: buildCollectionCenterMarker(item.sourceType, item.orderId),
      history,
      customerHistory,
      lastActionAt: last?.createdAt || null,
      lastActionNote: last?.note || "",
      lastActionBy: last?.createdByUsername || "",
      nextFollowupDate: last?.nextFollowupDate || null,
      touchedToday,
      kanbanStage,
      kanbanStageLabel: kanban.label,
    };
  });
}

export const summarizeCollectionCenter = (items: any[]) => {
  const counts = {
    low: 0,
    followup: 0,
    urgent: 0,
    critical: 0,
    touchedToday: 0,
    escalated: 0,
    automationReady: 0,
  };
  let totalOutstanding = 0;
  let totalUnrecognizedProfit = 0;
  let highestScore = 0;
  for (const item of items || []) {
    const level = String(item.level || "low");
    if (
      level === "low" ||
      level === "followup" ||
      level === "urgent" ||
      level === "critical"
    )
      counts[level] += 1;
    if (item.touchedToday) counts.touchedToday += 1;
    if (item.automation?.shouldEscalate) counts.escalated += 1;
    if (item.automation?.recommendedAction) counts.automationReady += 1;
    totalOutstanding += Number(item.outstandingAmount || 0);
    totalUnrecognizedProfit += Number(item.unrecognizedProfit || 0);
    highestScore = Math.max(highestScore, Number(item.score || 0));
  }
  return {
    totalItems: items.length,
    counts,
    totalOutstanding,
    totalUnrecognizedProfit,
    highestScore,
  };
};

// --- Store Intelligence Engine / Smart Insight Center ---

export const normalizeCollectionCenterDate = (value: any) => {
  const parsed = collectionCenterSafeMoment(value);
  return parsed ? parsed.format("YYYY-MM-DD") : "";
};

export const isCollectionCenterDateInRange = (
  value: any,
  fromISO: string,
  toISO: string,
) => {
  const d = normalizeCollectionCenterDate(value);
  if (!d) return false;
  return (
    !moment(d).isBefore(moment(String(fromISO).slice(0, 10)), "day") &&
    !moment(d).isAfter(moment(String(toISO).slice(0, 10)), "day")
  );
};

export const shouldShowCollectionCenterItemForOperationalWindow = (
  item: any,
  fromISO: string,
  toISO: string,
) => {
  const outstanding = Number(item?.outstandingAmount || 0);
  if (outstanding <= 1000) return false;

  const overdueDays = Number(item?.overdueDays || 0);
  const overdueAmount = Number(item?.overdueAmount || 0);
  const overdueCount = Number(item?.overdueCount || 0);
  const isOverdue = overdueDays > 0 || overdueAmount > 0 || overdueCount > 0;
  if (isOverdue) return true;

  const nextFollowup =
    item?.nextFollowupDate ||
    item?.automation?.suggestedNextFollowupDate ||
    null;
  if (isCollectionCenterDateInRange(nextFollowup, fromISO, toISO)) return true;

  if (isCollectionCenterDateInRange(item?.dueDate, fromISO, toISO)) return true;
  if (isCollectionCenterDateInRange(item?.transactionDate, fromISO, toISO))
    return true;

  const dueInDays = Number(item?.dueInDays);
  const toIncludesToday = !moment(String(toISO).slice(0, 10)).isBefore(
    moment().startOf("day"),
    "day",
  );
  if (
    Number.isFinite(dueInDays) &&
    dueInDays >= 0 &&
    dueInDays <= 7 &&
    toIncludesToday
  )
    return true;

  if (item?.automation?.shouldEscalate) return true;
  return false;
};

export const collectionCenterSafeMoment = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
  const onlyDate = normalized.slice(0, 10);

  // Important: Jalali years like 1405/03/05 are also "valid" Gregorian years for moment.
  // Convert Jalali first, otherwise delay calculations become hundreds of years wrong.
  const looksJalali = /^1[34]\d{2}[\/-]\d{1,2}[\/-]\d{1,2}/.test(normalized);
  if (looksJalali) {
    const jalaliInput = onlyDate.replace(/-/g, "/");
    const iso = fromShamsiStringToISO(jalaliInput);
    if (iso) {
      try {
        const parsed = moment(iso, ["YYYY-MM-DD", moment.ISO_8601], true);
        if (parsed && typeof parsed.isValid === "function" && parsed.isValid())
          return parsed;
      } catch {}
    }
    try {
      const jm = moment(jalaliInput, "jYYYY/jMM/jDD", true);
      if (jm && typeof jm.isValid === "function" && jm.isValid()) return jm;
    } catch {}
    return null;
  }

  const candidates = [normalized, onlyDate].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = moment(
        candidate,
        [moment.ISO_8601, "YYYY-MM-DD", "YYYY/MM/DD"],
        true,
      );
      if (parsed && typeof parsed.isValid === "function" && parsed.isValid())
        return parsed;
    } catch {}
  }

  try {
    const loose = moment(normalized);
    if (loose && typeof loose.isValid === "function" && loose.isValid())
      return loose;
  } catch {}

  return null;
};

export const collectionCenterDateDiffInDays = (value: any, base: any) => {
  const parsed = collectionCenterSafeMoment(value);
  const safeBase =
    base && typeof base.clone === "function"
      ? base.clone()
      : moment().startOf("day");
  if (!parsed) return null;
  return parsed.startOf("day").diff(safeBase.startOf("day"), "days");
};

export const collectionCenterOverdueDays = (value: any, base: any) => {
  const diff = collectionCenterDateDiffInDays(value, base);
  return typeof diff === "number" && diff < 0 ? Math.abs(diff) : 0;
};

export const collectionCenterToShamsiDisplay = (value: any) => {
  const parsed = collectionCenterSafeMoment(value);
  return parsed ? parsed.locale("fa").format("jYYYY/jMM/jDD") : "";
};

export const collectionCenterPickEarliestDate = (...values: any[]) => {
  const parsed = values
    .map((value) => {
      const m = collectionCenterSafeMoment(value);
      return m ? { raw: value, m } : null;
    })
    .filter(Boolean) as Array<{ raw: any; m: any }>;
  if (!parsed.length) return null;
  parsed.sort((a, b) => a.m.valueOf() - b.m.valueOf());
  return parsed[0].raw;
};

export async function buildDirectInstallmentCollectionItems(
  fromISO: string,
  toISO: string,
) {
  const today = moment().startOf("day");
  const todayJ = moment().locale("fa").format("jYYYY/MM/DD");

  const rows = await allAsync(
    `SELECT
        ins.id AS orderId,
        ins.customerId,
        c.fullName AS customerName,
        c.phoneNumber AS customerPhone,
        COALESCE(ins.saleDateISO, ins.dateCreated, '') AS transactionDate,
        COALESCE(ins.actualSalePrice, 0) AS contractualTotal,
        COALESCE(ins.downPayment, 0) AS receivedAmount,
        MAX(0,
          COALESCE(ins.actualSalePrice,0) - COALESCE(ins.downPayment,0)
          - COALESCE((
              SELECT SUM(it.amount_paid)
                FROM installment_payments allp
                JOIN installment_transactions it ON it.installment_payment_id = allp.id
               WHERE allp.saleId = ins.id
            ),0)
          - COALESCE((
              SELECT SUM(
                CASE
                  WHEN TRIM(COALESCE(ic2.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
                  THEN MAX(0, COALESCE(ic2.amount,0) - COALESCE((
                    SELECT SUM(it2.amount_paid)
                      FROM installment_payments rp2
                      JOIN installment_transactions it2 ON it2.installment_payment_id = rp2.id
                     WHERE rp2.sourceType = 'check_recovery' AND rp2.sourceId = ic2.id
                  ),0))
                  ELSE 0
                END
              )
                FROM installment_checks ic2
               WHERE ic2.saleId = ins.id
            ),0)
        ) AS accountingOutstanding,
        COALESCE(pay.unpaidAmount, 0) AS unpaidInstallmentAmount,
        COALESCE(pay.overdueAmount, 0) AS overdueInstallmentAmount,
        COALESCE(pay.unpaidCount, 0) AS unpaidInstallmentCount,
        COALESCE(pay.overdueCount, 0) AS overdueInstallmentCount,
        pay.nearestDueDate AS nearestInstallmentDueDate,
        pay.earliestOverdueDate AS earliestInstallmentOverdueDate,
        COALESCE(ch.unpaidCheckAmount, 0) AS unpaidCheckAmount,
        COALESCE(ch.overdueCheckAmount, 0) AS overdueCheckAmount,
        COALESCE(ch.unpaidCheckCount, 0) AS unpaidCheckCount,
        COALESCE(ch.overdueCheckCount, 0) AS overdueCheckCount,
        ch.nearestCheckDueDate AS nearestCheckDueDate,
        ch.earliestCheckOverdueDate AS earliestCheckOverdueDate
       FROM installment_sales ins
       LEFT JOIN customers c ON c.id = ins.customerId
       LEFT JOIN (
         SELECT x.saleId,
                COUNT(CASE WHEN x.remainingAmount > 0.00001 THEN 1 END) AS unpaidCount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 THEN x.remainingAmount ELSE 0 END),0) AS unpaidAmount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.dueDate < ? THEN x.remainingAmount ELSE 0 END),0) AS overdueAmount,
                SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.dueDate < ? THEN 1 ELSE 0 END) AS overdueCount,
                MIN(CASE WHEN x.remainingAmount > 0.00001 THEN x.dueDate ELSE NULL END) AS nearestDueDate,
                MIN(CASE WHEN x.remainingAmount > 0.00001 AND x.dueDate < ? THEN x.dueDate ELSE NULL END) AS earliestOverdueDate
           FROM (
             SELECT ip.saleId, ip.dueDate,
                    MAX(0, COALESCE(ip.amountDue,0) - COALESCE((
                      SELECT SUM(it.amount_paid)
                        FROM installment_transactions it
                       WHERE it.installment_payment_id = ip.id
                    ),0)) AS remainingAmount
               FROM installment_payments ip
              WHERE COALESCE(ip.sourceType,'installment') = 'installment'
           ) x
          GROUP BY x.saleId
       ) pay ON pay.saleId = ins.id
       LEFT JOIN (
         SELECT x.saleId,
                COUNT(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' THEN 1 END) AS unpaidCheckCount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' THEN x.remainingAmount ELSE 0 END),0) AS unpaidCheckAmount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' AND x.dueDate < ? THEN x.remainingAmount ELSE 0 END),0) AS overdueCheckAmount,
                SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' AND x.dueDate < ? THEN 1 ELSE 0 END) AS overdueCheckCount,
                MIN(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' THEN x.dueDate ELSE NULL END) AS nearestCheckDueDate,
                MIN(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' AND x.dueDate < ? THEN x.dueDate ELSE NULL END) AS earliestCheckOverdueDate
           FROM (
             SELECT ic.saleId, ic.dueDate,
                    CASE
                      WHEN COALESCE(ic.status,'') IN ('وصول شده','پاس شده','تسویه شده','نقدشده','paid','Paid') THEN 'نقد شد'
                      ELSE COALESCE(ic.status,'نزد فروشنده')
                    END AS normalizedStatus,
                    MAX(0, COALESCE(ic.amount,0) - COALESCE((
                      SELECT SUM(it.amount_paid)
                        FROM installment_payments ip
                        JOIN installment_transactions it ON it.installment_payment_id = ip.id
                       WHERE ip.sourceType = 'check_recovery' AND ip.sourceId = ic.id
                    ),0)) AS remainingAmount
               FROM installment_checks ic
               JOIN installment_sales checkSale ON checkSale.id = ic.saleId
              WHERE COALESCE(checkSale.status,'active') = 'active'
                AND (checkSale.saleType = 'check' OR COALESCE(checkSale.numberOfInstallments,0) = 0)
           ) x
          GROUP BY x.saleId
       ) ch ON ch.saleId = ins.id
      WHERE COALESCE(ins.status,'active') = 'active'
        AND COALESCE(ins.actualSalePrice, 0) > 0`,
    [todayJ, todayJ, todayJ, todayJ, todayJ, todayJ],
  ).catch(() => []);

  const items: any[] = [];
  for (const row of rows as any[]) {
    const orderId = Number(row.orderId || 0);
    if (!orderId) continue;

    const dueDateRaw = collectionCenterPickEarliestDate(
      row.nearestInstallmentDueDate,
      row.nearestCheckDueDate,
    );
    const overdueBaseRaw = collectionCenterPickEarliestDate(
      row.earliestInstallmentOverdueDate,
      row.earliestCheckOverdueDate,
    );
    const dueDate = collectionCenterToShamsiDisplay(dueDateRaw);
    const overdueBase = collectionCenterToShamsiDisplay(overdueBaseRaw);

    const dueInDays = dueDateRaw
      ? collectionCenterDateDiffInDays(dueDateRaw, today)
      : null;
    const overdueDays = overdueBaseRaw
      ? collectionCenterOverdueDays(overdueBaseRaw, today)
      : typeof dueInDays === "number" && dueInDays < 0
        ? Math.abs(dueInDays)
        : 0;

    const unpaidInstallmentAmount = Number(row.unpaidInstallmentAmount || 0);
    const unpaidCheckAmount = Number(row.unpaidCheckAmount || 0);
    const overdueInstallmentAmount = Number(row.overdueInstallmentAmount || 0);
    const overdueCheckAmount = Number(row.overdueCheckAmount || 0);
    const total = Math.max(0, Number(row.contractualTotal || 0));
    // The sale-level receivable is authoritative. Installment/check schedules are
    // collection instruments and may overlap on mixed contracts.
    const outstandingAmount = Math.min(
      total,
      Math.max(0, Number(row.accountingOutstanding || 0)),
    );
    if (outstandingAmount <= 1000) continue;

    const received = Math.max(0, total - outstandingAmount);
    const collectionRate =
      total > 0 ? Math.min(100, Math.max(0, (received / total) * 100)) : 0;
    const overdueCount = Math.max(
      0,
      Number(row.overdueInstallmentCount || 0),
      Number(row.overdueCheckCount || 0),
    );
    const overdueAmount = Math.min(
      outstandingAmount,
      Math.max(0, overdueInstallmentAmount, overdueCheckAmount),
    );
    const unpaidCount = Math.max(
      0,
      Number(row.unpaidInstallmentCount || 0),
      Number(row.unpaidCheckCount || 0),
    );

    let score = 18;
    const reasons: string[] = [];
    if (overdueDays > 30) {
      score += 35;
      reasons.push(
        `${overdueDays.toLocaleString("fa-IR")} روز از سررسید گذشته است`,
      );
    } else if (overdueDays > 7) {
      score += 24;
      reasons.push(
        `${overdueDays.toLocaleString("fa-IR")} روز تأخیر در سررسید دارد`,
      );
    } else if (overdueDays > 0) {
      score += 14;
      reasons.push("سررسید قسط/چک گذشته است");
    } else if (
      typeof dueInDays === "number" &&
      dueInDays >= 0 &&
      dueInDays <= 7
    ) {
      score += 10;
      reasons.push(
        `موعد قسط/چک تا ${dueInDays.toLocaleString("fa-IR")} روز آینده است`,
      );
    }

    if (overdueCount >= 3) {
      score += 22;
      reasons.push(
        `${overdueCount.toLocaleString("fa-IR")} قسط/چک عقب‌افتاده وجود دارد`,
      );
    } else if (overdueCount > 0) {
      score += 12;
      reasons.push(
        `${overdueCount.toLocaleString("fa-IR")} مورد سررسید عقب‌افتاده وجود دارد`,
      );
    }

    if (outstandingAmount > 20000000) {
      score += 18;
      reasons.push(
        `مانده وصول بالا است: ${formatReportMoneyText(outstandingAmount)}`,
      );
    } else if (outstandingAmount > 5000000) {
      score += 10;
      reasons.push(
        `مانده وصول قابل توجه است: ${formatReportMoneyText(outstandingAmount)}`,
      );
    }

    if (unpaidCheckAmount > 0)
      reasons.push(
        `چک پرداخت‌نشده/نقدنشده: ${formatReportMoneyText(unpaidCheckAmount)}`,
      );
    if (unpaidInstallmentAmount > 0)
      reasons.push(
        `اقساط پرداخت‌نشده: ${formatReportMoneyText(unpaidInstallmentAmount)}`,
      );
    if (overdueAmount > 0)
      reasons.push(
        `مبلغ سررسید گذشته: ${formatReportMoneyText(overdueAmount)}`,
      );
    if (!reasons.length)
      reasons.push(
        `${unpaidCount.toLocaleString("fa-IR")} قسط/چک پرداخت‌نشده برای پیگیری وجود دارد`,
      );

    const meta = productSalesRiskLevelMeta(score);
    items.push({
      id: getProductSalesDocKey("installment", orderId),
      level: meta.level,
      label: meta.label,
      score: Math.min(100, Math.round(score)),
      sourceType: "installment",
      paymentType: "installment",
      orderId,
      customerId: Number(row.customerId || 0),
      customerName: row.customerName || "مشتری ثبت‌نشده",
      customerPhone: row.customerPhone || "",
      transactionDate: String(row.transactionDate || ""),
      dueDate,
      ageDays: 0,
      dueInDays: typeof dueInDays === "number" ? dueInDays : null,
      overdueDays,
      overdueCount,
      overdueAmount,
      contractualTotal: total,
      receivedAmount: received,
      outstandingAmount,
      fullProfit: 0,
      realizedProfit: 0,
      unrecognizedProfit: 0,
      collectionRate,
      customerBalance: outstandingAmount,
      discountRate: 0,
      reasons,
      directCollectionSource: true,
    });
  }

  return items.filter((item) =>
    shouldShowCollectionCenterItemForOperationalWindow(item, fromISO, toISO),
  );
}

export const buildCollectionCenterSourceFromISO = (fromISO: string) => {
  const explicitFrom = collectionCenterSafeMoment(String(fromISO).slice(0, 10));
  const operationalLookback = moment().subtract(24, "months").startOf("day");
  if (!explicitFrom) return operationalLookback.format("YYYY-MM-DD");
  return explicitFrom.isBefore(operationalLookback, "day")
    ? explicitFrom.format("YYYY-MM-DD")
    : operationalLookback.format("YYYY-MM-DD");
};
