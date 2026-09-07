import { formatExactNumberText, formatReadablePercentText } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import { allAsync, runAsync } from "../../database";

const SMART_INSIGHT_CURRENCY_BASE = "TOMAN";
const SMART_INSIGHT_DISPLAY_CURRENCY = "تومان";
const smartInsightNum = (value: any) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;
const smartInsightRound = (value: any) => smartInsightNum(value);
const smartInsightMoney = (value: any) =>
  `${formatExactNumberText(Math.round(smartInsightNum(value) / 1_000) * 1_000)} ${SMART_INSIGHT_DISPLAY_CURRENCY}`;
const smartInsightPercent = (value: any) =>
  formatReadablePercentText(smartInsightNum(value), 2);
const smartInsightShamsi = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const m = moment(raw, [moment.ISO_8601, "YYYY-MM-DD", "YYYY/MM/DD"], true);
  return m.isValid() ? m.locale("fa").format("jYYYY/jMM/jDD") : raw;
};
const smartInsightSeverityFromScore = (score: number) => {
  const s = Math.max(0, Math.min(100, (score || 0)));
  if (s >= 82) return "critical";
  if (s >= 64) return "high";
  if (s >= 42) return "medium";
  return "low";
};
const smartInsightSafeRows = async (sql: string, params: any[] = []) => {
  try {
    return await allAsync(sql, params);
  } catch (e: any) {
    console.error("SmartInsight query failed:", e?.message || e);
    return [];
  }
};
const smartInsightSafeOne = async (sql: string, params: any[] = []) => {
  const rows = await smartInsightSafeRows(sql, params);
  return Array.isArray(rows) && rows.length ? rows[0] : {};
};

const ensureSmartInsightDecisionMemory = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS smart_insight_decisions (
      insightId TEXT PRIMARY KEY,
      type TEXT,
      title TEXT,
      severity TEXT,
      score REAL DEFAULT 0,
      confidence REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      userDecision TEXT DEFAULT 'pending',
      outcome TEXT DEFAULT 'unknown',
      note TEXT,
      actionLabel TEXT,
      occurrenceCount INTEGER DEFAULT 0,
      firstGeneratedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      lastGeneratedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      decidedAt TEXT,
      outcomeAt TEXT,
      updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER
    )
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS pricing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      oldPrice REAL DEFAULT 0,
      newPrice REAL DEFAULT 0,
      source TEXT DEFAULT 'ai_brain',
      note TEXT,
      createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER
    )
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS customer_scores (
      customerId INTEGER PRIMARY KEY,
      segment TEXT,
      riskScore REAL DEFAULT 0,
      profitScore REAL DEFAULT 0,
      lastCalculatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    )
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS profit_engine_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodFrom TEXT,
      periodTo TEXT,
      grossSales REAL DEFAULT 0,
      realProfit REAL DEFAULT 0,
      recognizedProfit REAL DEFAULT 0,
      profitAtRisk REAL DEFAULT 0,
      marginPct REAL DEFAULT 0,
      createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER
    )
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ai_feature_impact_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      featureKey TEXT NOT NULL,
      eventType TEXT NOT NULL,
      impactAmount REAL DEFAULT 0,
      success INTEGER DEFAULT 1,
      errorMessage TEXT,
      context TEXT,
      createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER
    )
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ai_feature_impact_events_key_date ON ai_feature_impact_events(featureKey, createdAt)`
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ai_feature_configs (
      key TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      icon TEXT,
      enabled INTEGER DEFAULT 1,
      requiresLearning INTEGER DEFAULT 0,
      minimumProgress INTEGER DEFAULT 40,
      updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER
    )
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ai_feature_auto_pause_reviews (
      featureKey TEXT PRIMARY KEY,
      dismissedAt TEXT,
      dismissedUntil TEXT,
      note TEXT,
      updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER
    )
  `);
};

type AiFeatureDefinition = {
  key: string;
  title: string;
  description: string;
  icon: string;
  requiresLearning?: boolean;
  minimumProgress?: number;
  defaultEnabled?: boolean;
};
const AI_FEATURE_DEFINITIONS: AiFeatureDefinition[] = [
  {
    key: "decision_memory",
    title: "حافظه تصمیمات",
    description: "ثبت اقدام/رد/نتیجه هر Insight برای یادگیری رفتاری فروشگاه.",
    icon: "fa-database",
    requiresLearning: true,
    minimumProgress: 25,
  },
  {
    key: "today_actions",
    title: "امروز چه کار کنم؟",
    description: "انتخاب سه اقدام مهم روز از بین Insightهای فعال.",
    icon: "fa-list-check",
    requiresLearning: true,
    minimumProgress: 35,
  },
  {
    key: "forecast",
    title: "پیش‌بینی فروش و خرید",
    description:
      "تحلیل سرعت فروش، سیگنال خرید مجدد و نزدیک‌شدن موجودی به نقطه امن.",
    icon: "fa-chart-line",
    requiresLearning: true,
    minimumProgress: 45,
  },
  {
    key: "hidden_profit",
    title: "کشف سود پنهان",
    description: "کالاهای پرسود کم‌نمایش، باندل‌های طبیعی و فرصت افزایش سود.",
    icon: "fa-gem",
    requiresLearning: true,
    minimumProgress: 55,
  },
  {
    key: "audit_radar",
    title: "رادار کنترل فاکتور",
    description:
      "تشخیص تخفیف غیرعادی، فروش زیر قیمت خرید، سود منفی و اختلاف جمع اقلام.",
    icon: "fa-shield-halved",
    requiresLearning: false,
    minimumProgress: 0,
  },
  {
    key: "customer_intelligence",
    title: "شخصیت مشتری",
    description: "امتیاز ریسک، سودآوری، تخفیف‌پذیری و وضعیت ریزش مشتری.",
    icon: "fa-users-viewfinder",
    requiresLearning: true,
    minimumProgress: 50,
  },
  {
    key: "auto_pricing",
    title: "قیمت‌گذاری هوشمند",
    description: "پیشنهاد قیمت امن، قیمت بهینه و سناریوی محافظه‌کارانه/تهاجمی.",
    icon: "fa-tags",
    requiresLearning: true,
    minimumProgress: 60,
  },
  {
    key: "sales_agent",
    title: "دستیار فروش فعال",
    description:
      "ساخت پیام و پیشنهاد اقدام برای فروش، بازگشت مشتری یا پیگیری وصول.",
    icon: "fa-headset",
    requiresLearning: true,
    minimumProgress: 55,
  },
  {
    key: "profit_engine",
    title: "موتور سود واقعی",
    description: "محاسبه سود واقعی، سود شناسایی‌شده و سود در خطر.",
    icon: "fa-sack-dollar",
    requiresLearning: false,
    minimumProgress: 0,
  },
];

const ensureAiFeatureConfigs = async () => {
  await ensureSmartInsightDecisionMemory();
  for (const feature of AI_FEATURE_DEFINITIONS) {
    await runAsync(
      `
      INSERT INTO ai_feature_configs (key, title, description, icon, enabled, requiresLearning, minimumProgress, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      ON CONFLICT(key) DO UPDATE SET
        title = excluded.title, description = excluded.description, icon = excluded.icon, requiresLearning = excluded.requiresLearning, minimumProgress = excluded.minimumProgress
    `,
      [
        feature.key,
        feature.title,
        feature.description,
        feature.icon,
        feature.defaultEnabled === false ? 0 : 1,
        feature.requiresLearning ? 1 : 0,
        feature.minimumProgress ?? 40,
      ]
    );
  }
};

const getAiFeatureRows = async () => {
  await ensureAiFeatureConfigs();
  return await smartInsightSafeRows(`SELECT * FROM ai_feature_configs`);
};

const getAiFeatureEnabledMap = async () => {
  const rows = await getAiFeatureRows();
  const map: Record<string, boolean> = {};
  for (const def of AI_FEATURE_DEFINITIONS)
    map[def.key] = def.defaultEnabled !== false;
  for (const row of rows || [])
    map[String(row.key)] = smartInsightNum(row.enabled) !== 0;
  return map;
};

const aiProgressStatus = (progress: number, enabled: boolean, minimum = 40) => {
  if (!enabled) return { status: "disabled", statusLabel: "خاموش" };
  if (progress < Math.max(1, minimum))
    return { status: "insufficient", statusLabel: "داده کافی نیست" };
  if (progress < 70)
    return { status: "learning", statusLabel: "در حال یادگیری" };
  if (progress < 90) return { status: "ready", statusLabel: "آماده فعالیت" };
  return { status: "excellent", statusLabel: "دقیق و بالغ" };
};

const parseSmartUtcTimestamp = (value?: any) => {
  if (!value) return Number.NaN;
  const raw = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00Z`
      : raw;
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

const latestSmartIso = (current?: any, candidate?: any) => {
  const currentTime = parseSmartUtcTimestamp(current);
  const candidateTime = parseSmartUtcTimestamp(candidate);
  if (!Number.isFinite(candidateTime)) return current || null;
  if (!Number.isFinite(currentTime) || candidateTime > currentTime) return String(candidate);
  return current || null;
};

const daysSinceSmartIso = (iso?: any) => {
  const timestamp = parseSmartUtcTimestamp(iso);
  if (!Number.isFinite(timestamp)) return 9999;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
};

type AiAutoPauseSignal = {
  level: "off" | "watch" | "pause" | "ok";
  shouldSuggestPause: boolean;
  title: string;
  reason: string;
  suggestedAction: string;
  dismissedUntil?: string;
};

const calculateAiAutoPauseSignal = (
  feature: any,
  impact: any,
  enabled: boolean,
  progress: number
): AiAutoPauseSignal => {
  if (!enabled) {
    return {
      level: "off",
      shouldSuggestPause: false,
      title: "خاموش است",
      reason: "این ماژول فعلاً اجرا نمی‌شود و فشاری به سیستم وارد نمی‌کند.",
      suggestedAction: "هیچ اقدامی لازم نیست.",
    };
  }
  const usage = smartInsightNum(impact?.usageCount);
  const errors = smartInsightNum(impact?.errorCount);
  const positive = smartInsightNum(impact?.positiveCount);
  const negative = smartInsightNum(impact?.negativeCount);
  const valueScore = smartInsightNum(impact?.valueScore);
  const estimatedImpact = smartInsightNum(impact?.estimatedImpact);
  const lastUsedDays = daysSinceSmartIso(impact?.lastUsedAt);
  const requiresLearning = !!feature?.requiresLearning;
  const minProgress = smartInsightNum(
    feature?.minimumProgress ?? feature?.minimum ?? 40
  );
  if (requiresLearning && progress < Math.max(1, minProgress)) {
    return {
      level: "watch",
      shouldSuggestPause: false,
      title: "فعلاً در حال یادگیری",
      reason: `هنوز به حد شروع ${formatReadablePercentText(minProgress, 1)} نرسیده؛ روشن بماند اما خروجی آن قطعی تلقی نشود.`,
      suggestedAction:
        "خاموش‌کردن پیشنهاد نمی‌شود؛ بهتر است داده بیشتری ثبت شود.",
    };
  }
  if (usage >= 3 && (errors >= 3 || errors / Math.max(1, usage) >= 0.35)) {
    return {
      level: "pause",
      shouldSuggestPause: true,
      title: "پیشنهاد توقف موقت",
      reason:
        "نرخ خطا یا شکست این ماژول بالاست و ممکن است فشار/نویز غیرضروری ایجاد کند.",
      suggestedAction: "توقف موقت و بررسی تنظیمات/داده‌ها پیشنهاد می‌شود.",
    };
  }
  if (usage >= 4 && negative >= Math.max(2, positive * 2) && valueScore < 45) {
    return {
      level: "pause",
      shouldSuggestPause: true,
      title: "اثر منفی ثبت شده",
      reason: "نتیجه‌های منفی این ماژول از نتیجه‌های مثبت بیشتر بوده است.",
      suggestedAction:
        "بهتر است موقتاً خاموش شود تا داده یا منطق آن بازبینی شود.",
    };
  }
  if (usage >= 5 && valueScore < 25 && estimatedImpact <= 0) {
    return {
      level: "pause",
      shouldSuggestPause: true,
      title: "ارزش روشن‌ماندن پایین",
      reason: "استفاده کافی ثبت شده اما اثر مثبت قابل قبول دیده نشده است.",
      suggestedAction: "خاموش‌کردن موقت می‌تواند سرعت سیستم را بهتر کند.",
    };
  }
  if (usage > 0 && lastUsedDays >= 45 && valueScore < 50) {
    return {
      level: "watch",
      shouldSuggestPause: false,
      title: "مدتی استفاده نشده",
      reason: `آخرین استفاده حدود ${formatExactNumberText(lastUsedDays)} روز پیش بوده؛ ممکن است روشن‌ماندن آن ضروری نباشد.`,
      suggestedAction: "فعلاً فقط پایش شود؛ خاموش‌کردن دستی اختیاری است.",
    };
  }
  return {
    level: "ok",
    shouldSuggestPause: false,
    title: "روشن‌ماندن منطقی است",
    reason: "اثر منفی جدی یا خطای پرتکرار ثبت نشده است.",
    suggestedAction: "فعال بماند و نتیجه تصمیم‌ها همچنان ثبت شود.",
  };
};

const calculateAiFeatureProgress = async (
  enabledMap?: Record<string, boolean>
) => {
  const enabled = enabledMap || (await getAiFeatureEnabledMap());
  const [
    ordersRow,
    customersRow,
    productRows,
    pricedRow,
    costRow,
    decisionRow,
    pricingHistoryRow,
    phonePricingRow,
    profitSnapshotRow,
  ] = await Promise.all([
    smartInsightSafeOne(
      `SELECT COUNT(*) AS c, COUNT(DISTINCT transactionDate) AS activeDays FROM sales_orders WHERE COALESCE(status, 'active') = 'active'`
    ),
    smartInsightSafeOne(`SELECT COUNT(*) AS c FROM customers`),
    smartInsightSafeOne(
      `SELECT COUNT(DISTINCT itemId) AS c FROM sales_order_items WHERE itemType IN ('inventory','service','phone')`
    ),
    smartInsightSafeOne(
      `SELECT COUNT(*) AS c FROM products WHERE COALESCE(salePrice, 0) > 0 OR COALESCE(price, 0) > 0`
    ),
    smartInsightSafeOne(
      `SELECT COUNT(*) AS c FROM sales_order_items WHERE COALESCE(buyPrice, 0) > 0`
    ),
    smartInsightSafeOne(
      `SELECT COUNT(*) AS c, SUM(CASE WHEN userDecision != 'pending' THEN 1 ELSE 0 END) AS decided FROM smart_insight_decisions`
    ),
    smartInsightSafeOne(`SELECT COUNT(*) AS c FROM pricing_history`),
    smartInsightSafeOne(
      `SELECT COUNT(*) AS c FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND COALESCE(so.status, 'active') = 'active' AND COALESCE(soi.unitPrice, soi.totalPrice, 0) > 0`
    ),
    smartInsightSafeOne(`SELECT COUNT(*) AS c FROM profit_engine_snapshots`),
  ]);
  const orders = smartInsightNum(ordersRow.c);
  const activeDays = smartInsightNum(ordersRow.activeDays);
  const customers = smartInsightNum(customersRow.c);
  const soldProducts = smartInsightNum(productRows.c);
  const pricedProducts = smartInsightNum(pricedRow.c);
  const costLines = smartInsightNum(costRow.c);
  const decisions = smartInsightNum(decisionRow.c);
  const decided = smartInsightNum(decisionRow.decided);
  const pricingHistory = smartInsightNum(pricingHistoryRow.c);
  const phonePricingSignals = smartInsightNum(phonePricingRow.c);
  const profitSnapshots = smartInsightNum(profitSnapshotRow.c);
  const baseSignals = {
    orders: formatExactNumberText(orders),
    activeDays: formatExactNumberText(activeDays),
    customers: formatExactNumberText(customers),
    soldProducts: formatExactNumberText(soldProducts),
    decisions: formatExactNumberText(decisions),
  };
  const progressMap: Record<
    string,
    { progress: number; progressLabel: string; signals: any[] }
  > = {
    decision_memory: {
      progress: Math.min(
        100,
        ((decisions / 40) * 100 + (decided / 25) * 35)
      ),
      progressLabel: `${formatReadablePercentText(Math.min(100, ((decisions / 40) * 100 + (decided / 25) * 35)), 1)} آموزش تصمیمات`,
      signals: [
        { label: "Insight ثبت‌شده", value: formatExactNumberText(decisions) },
        { label: "تصمیم واقعی", value: formatExactNumberText(decided) },
      ],
    },
    today_actions: {
      progress: Math.min(
        100,
        ((orders / 80) * 55 + (decisions / 25) * 45)
      ),
      progressLabel: "آمادگی اولویت‌بندی روزانه",
      signals: [
        { label: "فاکتور", value: baseSignals.orders },
        { label: "حافظه", value: baseSignals.decisions },
      ],
    },
    forecast: {
      progress: Math.min(
        100,
        (
          (orders / 180) * 55 +
            (activeDays / 45) * 25 +
            (soldProducts / 30) * 20
        )
      ),
      progressLabel: "پوشش داده فروش برای پیش‌بینی",
      signals: [
        { label: "فاکتور", value: baseSignals.orders },
        { label: "روز فعال", value: baseSignals.activeDays },
        { label: "کالای فروخته‌شده", value: baseSignals.soldProducts },
      ],
    },
    hidden_profit: {
      progress: Math.min(
        100,
        (
          (orders / 160) * 45 +
            (soldProducts / 35) * 35 +
            (costLines / 120) * 20
        )
      ),
      progressLabel: "پوشش سود/هم‌خرید",
      signals: [
        { label: "فاکتور", value: baseSignals.orders },
        { label: "کالا", value: baseSignals.soldProducts },
        {
          label: "ردیف دارای بهای خرید",
          value: formatExactNumberText(costLines),
        },
      ],
    },
    audit_radar: {
      progress: 100,
      progressLabel: "کنترل‌های قطعی بدون آموزش",
      signals: [
        { label: "فاکتور قابل کنترل", value: baseSignals.orders },
        { label: "ردیف دارای بها", value: formatExactNumberText(costLines) },
      ],
    },
    customer_intelligence: {
      progress: Math.min(
        100,
        (
          (customers / 50) * 35 + (orders / 140) * 45 + (activeDays / 35) * 20
        )
      ),
      progressLabel: "پوشش رفتار مشتری",
      signals: [
        { label: "مشتری", value: baseSignals.customers },
        { label: "فاکتور", value: baseSignals.orders },
        { label: "روز فعال", value: baseSignals.activeDays },
      ],
    },
    auto_pricing: {
      progress: Math.min(
        100,
        (
          (orders / 220) * 25 +
            (soldProducts / 45) * 20 +
            (pricedProducts / 80) * 15 +
            ((pricingHistory + phonePricingSignals) / 20) * 40
        )
      ),
      progressLabel: "آمادگی قیمت‌گذاری",
      signals: [
        { label: "فروش", value: baseSignals.orders },
        {
          label: "فروش گوشی",
          value: formatExactNumberText(phonePricingSignals),
        },
        {
          label: "لاگ قیمت",
          value: formatExactNumberText((pricingHistory + phonePricingSignals)),
        },
      ],
    },
    sales_agent: {
      progress: Math.min(
        100,
        (
          (customers / 60) * 35 + (orders / 160) * 35 + (decided / 20) * 30
        )
      ),
      progressLabel: "آمادگی پیشنهاد فروش/وصول",
      signals: [
        { label: "مشتری", value: baseSignals.customers },
        { label: "فاکتور", value: baseSignals.orders },
        { label: "تصمیم ثبت‌شده", value: formatExactNumberText(decided) },
      ],
    },
    profit_engine: {
      progress: Math.min(
        100,
        (
          (costLines / Math.max(1, orders * 1.5)) * 70 +
            (profitSnapshots / 20) * 30
        )
      ),
      progressLabel: "پوشش بهای خرید برای سود واقعی",
      signals: [
        { label: "ردیف دارای بها", value: formatExactNumberText(costLines) },
        {
          label: "Snapshot سود",
          value: formatExactNumberText(profitSnapshots),
        },
      ],
    },
  };
  const impactMap = await calculateAiFeatureImpactSummary();
  const dismissedRows = await smartInsightSafeRows(
    `SELECT featureKey, dismissedUntil FROM ai_feature_auto_pause_reviews WHERE dismissedUntil IS NOT NULL AND datetime(dismissedUntil) > datetime('now')`
  );
  const dismissedMap: Record<string, string> = {};
  for (const row of dismissedRows || [])
    dismissedMap[String(row.featureKey)] = String(row.dismissedUntil || "");
  return AI_FEATURE_DEFINITIONS.map((def) => {
    const p = progressMap[def.key] || {
      progress: 0,
      progressLabel: "در حال جمع‌آوری داده",
      signals: [],
    };
    const progress = Math.max(0, Math.min(100, (p.progress || 0)));
    const st = aiProgressStatus(
      progress,
      enabled[def.key] !== false,
      def.minimumProgress ?? 40
    );
    const impact = impactMap[def.key] || defaultAiFeatureImpact(def.key);
    const isEnabled = enabled[def.key] !== false;
    const autoPause = calculateAiAutoPauseSignal(
      def,
      impact,
      isEnabled,
      progress
    );
    if (dismissedMap[def.key] && autoPause?.level === "pause") {
      autoPause.level = "watch";
      autoPause.shouldSuggestPause = false;
      autoPause.title = "پیشنهاد توقف فعلاً پنهان شده";
      autoPause.dismissedUntil = dismissedMap[def.key];
      autoPause.suggestedAction = "تا پایان مهلت ثبت‌شده، هشدار توقف دوباره نمایش داده نمی‌شود.";
    }
    return {
      ...def,
      enabled: isEnabled,
      requiresLearning: !!def.requiresLearning,
      minimum: def.minimumProgress ?? 40,
      progress,
      ...st,
      progressLabel: p.progressLabel,
      signals: p.signals || [],
      impact,
      autoPause,
    };
  });
};
const defaultAiFeatureImpact = (featureKey: string) => ({
  featureKey,
  usageCount: 0,
  successCount: 0,
  errorCount: 0,
  positiveCount: 0,
  negativeCount: 0,
  estimatedImpact: 0,
  lastUsedAt: null as string | null,
  valueScore: 0,
  valueLabel: "هنوز اثر قابل اندازه‌گیری ندارد",
  recommendation: "برای سنجش ارزش، چند تصمیم/اقدام واقعی ثبت کن.",
});

const insightTypeToAiFeatureKey = (type: any) => {
  const t = String(type || "").trim();
  if (t === "auto_pricing") return "auto_pricing";
  if (t === "ai_sales_agent") return "sales_agent";
  if (t === "real_profit" || t === "profit_quality" || t === "hidden_loss")
    return "profit_engine";
  if (
    t === "customer_intelligence" ||
    t === "customer_risk" ||
    t === "collection_risk"
  )
    return "customer_intelligence";
  if (t === "invoice_audit" || t === "discount_anomaly") return "audit_radar";
  if (t === "hidden_profit") return "hidden_profit";
  if (t === "stock_reorder") return "forecast";
  if (t === "daily_summary" || t === "sales_drop" || t === "sales_growth")
    return "today_actions";
  return "decision_memory";
};

const recordAiFeatureImpactEvent = async (
  featureKey: string,
  eventType: string,
  options: {
    impactAmount?: number;
    success?: boolean;
    errorMessage?: string;
    context?: any;
    userId?: any;
  } = {}
) => {
  try {
    await ensureSmartInsightDecisionMemory();
    await runAsync(
      `INSERT INTO ai_feature_impact_events (featureKey, eventType, impactAmount, success, errorMessage, context, userId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(featureKey || "decision_memory"),
        String(eventType || "usage"),
        smartInsightNum(options.impactAmount),
        options.success === false ? 0 : 1,
        options.errorMessage
          ? String(options.errorMessage).slice(0, 500)
          : null,
        options.context ? JSON.stringify(options.context).slice(0, 2000) : null,
        options.userId || null,
      ]
    );
  } catch (_err) {}
};

const calculateAiFeatureImpactSummary = async () => {
  await ensureSmartInsightDecisionMemory();
  const map: Record<string, any> = {};
  for (const def of AI_FEATURE_DEFINITIONS)
    map[def.key] = defaultAiFeatureImpact(def.key);
  const eventRows = await smartInsightSafeRows(
    `SELECT featureKey, COUNT(*) AS usageCount, SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successCount, SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS errorCount, COALESCE(SUM(impactAmount), 0) AS estimatedImpact, MAX(createdAt) AS lastUsedAt FROM ai_feature_impact_events GROUP BY featureKey`
  );
  for (const row of eventRows || []) {
    const key = String(row.featureKey || "");
    if (!map[key]) map[key] = defaultAiFeatureImpact(key);
    map[key] = {
      ...map[key],
      usageCount: smartInsightNum(row.usageCount),
      successCount: smartInsightNum(row.successCount),
      errorCount: smartInsightNum(row.errorCount),
      estimatedImpact: smartInsightRound(row.estimatedImpact),
      lastUsedAt: row.lastUsedAt || null,
    };
  }
  const decisionRows = await smartInsightSafeRows(
    `SELECT type, COUNT(*) AS c, SUM(CASE WHEN userDecision = 'accepted' THEN 1 ELSE 0 END) AS accepted, SUM(CASE WHEN outcome = 'positive' THEN 1 ELSE 0 END) AS positive, SUM(CASE WHEN outcome = 'negative' THEN 1 ELSE 0 END) AS negative, AVG(COALESCE(score, 0)) AS avgScore, MAX(updatedAt) AS lastUsedAt FROM smart_insight_decisions WHERE userDecision != 'pending' OR outcome != 'unknown' GROUP BY type`
  );
  for (const row of decisionRows || []) {
    const key = insightTypeToAiFeatureKey(row.type);
    if (!map[key]) map[key] = defaultAiFeatureImpact(key);
    map[key].usageCount += smartInsightNum(row.c);
    map[key].successCount += smartInsightNum(row.accepted);
    map[key].positiveCount += smartInsightNum(row.positive);
    map[key].negativeCount += smartInsightNum(row.negative);
    map[key].estimatedImpact += smartInsightRound(
      (smartInsightNum(row.positive) - smartInsightNum(row.negative)) *
        Math.max(1, smartInsightNum(row.avgScore)) *
        10000
    );
    map[key].lastUsedAt = latestSmartIso(map[key].lastUsedAt, row.lastUsedAt);
  }
  const pricing = await smartInsightSafeOne(
    `SELECT COUNT(*) AS c, COALESCE(SUM(newPrice - oldPrice), 0) AS delta, MAX(createdAt) AS lastUsedAt FROM pricing_history`
  );
  if (pricing) {
    map.auto_pricing.usageCount += smartInsightNum(pricing.c);
    map.auto_pricing.successCount += smartInsightNum(pricing.c);
    map.auto_pricing.estimatedImpact += smartInsightRound(pricing.delta);
    map.auto_pricing.lastUsedAt = latestSmartIso(
      map.auto_pricing.lastUsedAt,
      pricing.lastUsedAt
    );
  }
  const profit = await smartInsightSafeOne(
    `SELECT COUNT(*) AS c, COALESCE(SUM(realProfit), 0) AS totalProfit, COALESCE(SUM(profitAtRisk), 0) AS risk, MAX(createdAt) AS lastUsedAt FROM profit_engine_snapshots`
  );
  if (profit) {
    map.profit_engine.usageCount += smartInsightNum(profit.c);
    map.profit_engine.successCount += smartInsightNum(profit.c);
    map.profit_engine.estimatedImpact += smartInsightRound(
      smartInsightNum(profit.totalProfit) -
        Math.max(0, smartInsightNum(profit.risk))
    );
    map.profit_engine.lastUsedAt = latestSmartIso(
      map.profit_engine.lastUsedAt,
      profit.lastUsedAt
    );
  }
  for (const key of Object.keys(map)) {
    const item = map[key];
    const usage = smartInsightNum(item.usageCount);
    const positive = smartInsightNum(item.positiveCount);
    const negative = smartInsightNum(item.negativeCount);
    const errors = smartInsightNum(item.errorCount);
    const successRatio = usage
      ? Math.max(0, Math.min(1, smartInsightNum(item.successCount) / usage))
      : 0;
    const outcomeScore = usage
      ? ((positive - negative) / Math.max(1, positive + negative)) * 35
      : 0;
    const impactScore = Math.max(
      -20,
      Math.min(35, smartInsightNum(item.estimatedImpact) / 1000000)
    );
    const errorPenalty = Math.min(25, errors * 6);
    const valueScore = Math.max(
      0,
      Math.min(
        100,
        (
          (usage ? 35 : 0) +
            successRatio * 30 +
            outcomeScore +
            impactScore -
            errorPenalty
        )
      )
    );
    item.valueScore = valueScore;
    item.valueLabel =
      valueScore >= 75
        ? "ارزش روشن‌ماندن بالا"
        : valueScore >= 50
          ? "مفید اما نیازمند پایش"
          : valueScore >= 25
            ? "اثر محدود/در حال یادگیری"
            : "هنوز ارزش کافی ثابت نشده";
    item.recommendation =
      valueScore >= 75
        ? "روشن بماند؛ اثر عملی یا مالی قابل قبول ثبت شده است."
        : valueScore >= 50
          ? "روشن بماند، اما نتیجه تصمیم‌ها را بیشتر ثبت کن."
          : usage > 0
            ? "فعلاً به‌صورت محدود نگه دار؛ اگر اثر عملی نداشت خاموشش کن."
            : "برای قضاوت هنوز داده کافی ثبت نشده است.";
    item.estimatedImpact = smartInsightRound(item.estimatedImpact);
  }
  return map;
};

const normalizeSmartDecisionValue = (
  value: any,
  allowed: string[],
  fallback: string
) => {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : fallback;
};
const smartDecisionCopy = (decision: any = {}) => {
  const userDecision = String(decision.userDecision || "pending");
  const outcome = String(decision.outcome || "unknown");
  const status = String(decision.status || "open");
  const decisionLabel =
    userDecision === "accepted"
      ? "اقدام شد"
      : userDecision === "rejected"
        ? "رد شد"
        : userDecision === "snoozed"
          ? "بعداً بررسی شود"
          : "در انتظار تصمیم";
  const outcomeLabel =
    outcome === "positive"
      ? "نتیجه مثبت"
      : outcome === "negative"
        ? "نتیجه منفی"
        : outcome === "neutral"
          ? "بدون اثر قطعی"
          : "نتیجه ثبت نشده";
  const statusLabel =
    status === "closed"
      ? "بسته‌شده"
      : status === "dismissed"
        ? "نادیده گرفته‌شده"
        : status === "snoozed"
          ? "تعویق"
          : "باز";
  return { decisionLabel, outcomeLabel, statusLabel };
};

const roundPricingAiMoney = (value: any, _step = 500000) => smartInsightNum(value);

const buildPricingAiDecision = (row: any, index = 0) => {
  const purchasePrice = smartInsightNum(
    row.purchasePrice || row.buyPrice || row.oldPrice
  );
  const finalSale = smartInsightNum(
    row.finalSale || row.salePrice || row.unitPrice || row.newPrice
  );
  const suggestedSale = roundPricingAiMoney(
    row.suggestedSale || (purchasePrice > 0 ? purchasePrice * 1.14 : finalSale),
    500000
  );
  const markupPercent =
    purchasePrice > 0 && finalSale > 0
      ? ((finalSale - purchasePrice) / purchasePrice) * 100
      : 0;
  const diffRatio =
    suggestedSale > 0 && finalSale > 0
      ? Math.abs(finalSale - suggestedSale) / suggestedSale
      : 1;
  const actionRaw = String(row.action || row.userDecision || "").trim();
  const action =
    actionRaw ||
    (diffRatio <= 0.015
      ? "accepted"
      : diffRatio > 0.04
        ? "overridden"
        : "manual");
  const createdAt = String(
    row.createdAt ||
      row.transactionDate ||
      row.saleDate ||
      row.registerDate ||
      new Date().toISOString()
  );
  return {
    id: String(row.id || `pricing-ai-${index}-${createdAt}`),
    source: String(row.source || "server-pricing-learning"),
    userKey: String(row.userKey || row.username || "system"),
    model: String(
      row.model || row.productName || row.description || "مدل نامشخص"
    ),
    condition: String(
      row.condition || row.status || row.paymentMethod || "فروش ثبت‌شده"
    ),
    purchasePrice,
    suggestedSale,
    finalSale,
    markupPercent,
    suggestedMarkupPercent: 14,
    action: ["accepted", "overridden", "manual"].includes(action)
      ? action
      : "manual",
    createdAt,
  };
};

export {
  SMART_INSIGHT_CURRENCY_BASE,
  SMART_INSIGHT_DISPLAY_CURRENCY,
  AI_FEATURE_DEFINITIONS,
  buildPricingAiDecision,
  calculateAiFeatureImpactSummary,
  calculateAiFeatureProgress,
  ensureAiFeatureConfigs,
  ensureSmartInsightDecisionMemory,
  getAiFeatureEnabledMap,
  insightTypeToAiFeatureKey,
  normalizeSmartDecisionValue,
  recordAiFeatureImpactEvent,
  smartDecisionCopy,
  smartInsightMoney,
  smartInsightNum,
  smartInsightRound,
  smartInsightPercent,
  smartInsightShamsi,
  smartInsightSeverityFromScore,
  smartInsightSafeOne,
  smartInsightSafeRows,
};
