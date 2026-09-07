export type SupplierFeedPlatform = "telegram" | "whatsapp" | "bale" | "manual";
export type SupplierFeedCurrency = "rial" | "toman" | "ambiguous";
export type SupplierRegistrationStatus = "registered" | "unregistered" | "unknown";
export type SupplierActivationStatus = "active" | "not-activated" | "unknown";

export type ParsedSupplierFeedItem = {
  lineNumber: number;
  rawLine: string;
  model: string;
  storage: string | null;
  ram: string | null;
  color: string | null;
  condition: string | null;
  registrationStatus: SupplierRegistrationStatus;
  activationStatus: SupplierActivationStatus;
  partNumber: string | null;
  priceType: "purchase" | "sale";
  rawPrice: number | null;
  currency: SupplierFeedCurrency;
  priceToman: number | null;
  priceRial: number | null;
  confidence: "high" | "medium" | "low";
  reviewReasons: string[];
};

const normalizeDigits = (value: unknown): string => String(value ?? "")
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک");

const capacityLabel = (amount: number, isTb = false): string => {
  const gb = isTb ? amount * 1024 : amount;
  return gb === 1024 ? "1 TB" : `${gb} GB`;
};

export const detectSupplierPhoneStorage = (line: string): string | null => {
  const explicit = line.match(/\b(1|2)\s*(?:tb|t)\b|\b(1|2)\s*ترابایت/i);
  if (explicit) return capacityLabel(Number(explicit[1] || explicit[3]), true);
  const gb = line.match(/\b(32|64|128|256|512|1024)\s*(?:gb|g|گیگ(?:ابایت)?)\b/i);
  if (gb) return capacityLabel(Number(gb[1]));
  const standalone = line.match(/(?:^|[\s/|_-])(32|64|128|256|512|1024)(?=[\s/|_-]|$)/);
  return standalone ? capacityLabel(Number(standalone[1])) : null;
};

const detectRam = (line: string): string | null => {
  const match = line.match(/(?:ram|رم|\br)\s*[:：-]?\s*(2|3|4|6|8|12|16|24)(?:\s*(?:gb|g|گیگ))?/i)
    ?? line.match(/(?:32|64|128|256|512|1024|1\s*t)\s*\/\s*(2|3|4|6|8|12|16|24)\b/i)
    ?? line.match(/(?:32|64|128|256|512|1024|1\s*t)\s+(2|3|4|6|8|12|16|24)(?=\s*\$|\s+(?:not|active|ch)\b)/i);
  return match ? `${Number(match[1])} GB` : null;
};

const detectColor = (line: string): string | null => {
  const emojiColors: Array<[RegExp, string]> = [
    [/🖤/, "مشکی"], [/🤍/, "سفید"], [/💙/, "آبی"], [/💜/, "بنفش"], [/🩶/, "خاکستری"],
    [/🧡/, "نارنجی"], [/💚/, "سبز"], [/❤️|❤/, "قرمز"], [/💝|🩷/, "صورتی"], [/💛/, "طلایی"],
  ];
  const emoji = emojiColors.find(([pattern]) => pattern.test(line));
  if (emoji) return emoji[1];
  const namedColors: Array<[RegExp, string]> = [
    [/(?:^|\s)(?:black|مشکی)(?:\s|$)/i, "مشکی"], [/(?:^|\s)(?:white|سفید)(?:\s|$)/i, "سفید"],
    [/(?:^|\s)(?:blue|آبی)(?:\s|$)/i, "آبی"], [/(?:^|\s)(?:green|سبز)(?:\s|$)/i, "سبز"],
    [/(?:^|\s)(?:purple|بنفش)(?:\s|$)/i, "بنفش"], [/(?:^|\s)(?:pink|صورتی)(?:\s|$)/i, "صورتی"],
    [/(?:^|\s)(?:orange|نارنجی)(?:\s|$)/i, "نارنجی"], [/(?:^|\s)(?:gold|golden|طلایی)(?:\s|$)/i, "طلایی"],
    [/(?:^|\s)(?:silver|نقره‌ای)(?:\s|$)/i, "نقره‌ای"], [/(?:^|\s)(?:gray|grey|خاکستری)(?:\s|$)/i, "خاکستری"],
    [/(?:^|\s)(?:ice)(?:\s|$)/i, "یخی"], [/(?:^|\s)(?:mix)(?:\s|$)/i, "تمام رنگ‌ها (MIX)"],
  ];
  const named = namedColors.find(([pattern]) => pattern.test(line));
  if (named) return named[1];
  const codeMap: Record<string, string> = {
    B: "مشکی", W: "سفید", P: "صورتی", G: "سبز", BL: "آبی", BLU: "آبی", BLUE: "آبی",
    SIL: "نقره‌ای", GOLD: "طلایی", GRAY: "خاکستری", GREY: "خاکستری", RAY: "خاکستری",
    ICE: "یخی", MIX: "تمام رنگ‌ها (MIX)", N: "کد رنگ N", J: "کد رنگ J", NAVY: "سرمه‌ای",
    BLACK: "مشکی", WHITE: "سفید", PINK: "صورتی", GREEN: "سبز", PURPLE: "بنفش",
    RED: "قرمز", SILVER: "نقره‌ای",
  };
  const priceIndex = line.search(/(?<!\d)\d{4,12}(?!\d)/);
  const colorRegion = priceIndex >= 0 ? line.slice(priceIndex).replace(/(?<!\d)\d{4,12}(?!\d)/g, " ") : line;
  const codes = colorRegion
    .split(/[\s/|,،]+/)
    .map((token) => token.toUpperCase().trim())
    .map((token) => codeMap[token])
    .filter(Boolean);
  return codes.length ? [...new Set(codes)].join("، ") : null;
};

const detectRegistrationStatus = (line: string, inherited: SupplierRegistrationStatus): SupplierRegistrationStatus =>
  /بدون\s*کد|بدون\s*رجیستر|unregistered/i.test(line) ? "unregistered"
    : /با\s*کد|رجیستر\s*شده|registered/i.test(line) ? "registered" : inherited;

const detectActivationStatus = (line: string): SupplierActivationStatus =>
  /\bnot(?:\s*active)?\b|نات\s*اکتیو/i.test(line) ? "not-activated"
    : /\bactive\b|اکتیو/i.test(line) ? "active" : "unknown";

const detectPartNumber = (line: string): string | null => {
  const match = line.match(/(?:^|\s)(CH\/A|LL\/A|J\/A|ZAA|VIT|VN|CHIN|CHINA|CH|IND|INDIA)(?=\s|\$|\/|$)/i);
  if (!match) return null;
  const code = match[1].toUpperCase();
  if (["VN", "VIT"].includes(code)) return "VIT";
  if (["CHIN", "CHINA", "CH"].includes(code)) return "CH";
  if (["IND", "INDIA"].includes(code)) return "IND";
  return code;
};

const detectCondition = (line: string): string | null => {
  if (/آکبند|پلمپ|\bnew\b/i.test(line)) return "نو (آکبند)";
  if (/در حد نو|like new/i.test(line)) return "در حد نو";
  if (/کارکرده|used/i.test(line)) return "کارکرده";
  return null;
};

type PriceCandidate = { token: string; raw: number; tomanAmount: number };

const priceCandidates = (line: string, compactThousands: boolean): PriceCandidate[] => {
  const values: PriceCandidate[] = [];
  const occupied = new Set<string>();
  for (const match of line.matchAll(/(?<!\d)(\d{2,3})\s*\/\s*(\d{1,3})(?![\d/])/g)) {
    if (/\d{4}\s*\/\s*\d{1,2}\s*\//.test(line)) continue;
    if ([32, 64, 128, 256, 512].includes(Number(match[1])) && Number(match[2]) <= 24) continue;
    const compact = Number(`${match[1]}${match[2].padEnd(3, "0")}`);
    values.push({ token: match[0], raw: compact, tomanAmount: compact * 1_000 });
    occupied.add(match[0]);
  }
  const regex = compactThousands
    ? /\b\d{1,3}(?:[,٬،._]\d{3}){1,3}\b|\b\d{1,3}(?:\s\d{3}){2,3}\b|\b\d{4,12}\b/g
    : /\b\d{1,3}(?:[,٬،._]\d{3}){1,3}\b|\b\d{1,3}(?:\s\d{3}){2,3}\b|\b\d{6,12}\b/g;
  for (const match of line.matchAll(regex)) {
    if (occupied.has(match[0]) || match[0].includes("/")) continue;
    const numeric = Number(match[0].replace(/[^0-9]/g, ""));
    if (numeric < 1_000 || numeric > 100_000_000_000) continue;
    const tomanAmount = compactThousands && numeric < 1_000_000 ? numeric * 1_000 : numeric;
    values.push({ token: match[0], raw: numeric, tomanAmount });
  }
  return values;
};

const cleanModel = (line: string, priceToken: string | null): string => {
  let value = line;
  if (priceToken) value = value.replace(priceToken, " ");
  value = value
    .replace(/(?:قیمت|همکاری|خرید|فروش|نقدی|چکی|تومان|تومن|ریال|موجود|ناموجود|تمام شد|بدون\s*کد|با\s*کد)/gi, " ")
    .replace(/(?:ram|رم)\s*[:：-]?\s*\d+\s*(?:gb|g|گیگ)?/gi, " ")
    .replace(/(?:^|\s)R(?:2|3|4|6|8|12|16|24)(?=\s|$)/gi, " ")
    .replace(/(?:32|64|128|256|512|1024)\s*\/\s*(?:2|3|4|6|8|12|16|24)\b/gi, " ")
    .replace(/\b(?:32|64|128|256|512|1024)\s*(?:gb|g|گیگ(?:ابایت)?)?\b/gi, " ")
    .replace(/\b(?:1|2)\s*(?:tb|t)\b|(?:1|2)\s*ترابایت/gi, " ")
    .replace(/(?:^|\s)(?:CH\/A|LL\/A|J\/A|ZAA|VIT|VN|CHIN|CHINA|CH|IND|INDIA)(?=\s|\$|\/|$)/gi, " ")
    .replace(/\b(?:not(?:\s*active)?|active)\b/gi, " ")
    .replace(/باشارژر|رژراشاب/gi, " ")
    .replace(/(?:^|\s)(?:R)?(?:2|3|4|6|8|12|16|24)(?=\s*\$|\s*$)/gi, " ")
    .replace(/[✅❌🔥⭐️🔴🟢🟡•|$🔱🖤🤍💙💜🩶🧡💚❤️❤💝🩷💛]+/gu, " ")
    .replace(/(?:^|\/)(?:B|W|P|G|BL|BLU|BLUE|SIL|GOLD|GRAY|GREY|RAY|ICE|MIX|N|J|NAVY|BLACK|WHITE|PINK|GREEN|PURPLE|RED|SILVER)(?=\/|\s|$)/gi, " ")
    .replace(/\/+$/g, " ")
    .replace(/\b([A-Z])\s+(\d{1,3})\b/g, "$1$2")
    .replace(/\b(32|64|128|256|512|1024)\s+G\b/gi, "$1G")
    .replace(/\bR\s+(2|3|4|6|8|12|16|24)\b/gi, "R$1")
    .replace(/\s+/g, " ").trim();
  return value.slice(0, 120);
};

export const parseSupplierFeedText = (
  input: string,
  options: { defaultCurrency?: "rial" | "toman"; defaultPriceType?: "purchase" | "sale"; platform?: SupplierFeedPlatform; compactThousands?: boolean } = {},
): ParsedSupplierFeedItem[] => {
  const text = normalizeDigits(input);
  const rows: ParsedSupplierFeedItem[] = [];
  let inheritedRegistrationStatus: SupplierRegistrationStatus = "unknown";
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 4) return;
    inheritedRegistrationStatus = detectRegistrationStatus(line, inheritedRegistrationStatus);
    const compactThousands = options.compactThousands ?? options.platform === "bale";
    const candidates = priceCandidates(line, compactThousands);
    const candidate = candidates.at(-1) ?? null;
    if (!candidate) return;
    const explicitCurrency: SupplierFeedCurrency = /تومان|تومن|\btoman\b/i.test(line)
      ? "toman" : /ریال|\brial\b/i.test(line) ? "rial" : options.defaultCurrency ?? "ambiguous";
    const model = cleanModel(line, candidate.token);
    const storage = detectSupplierPhoneStorage(line);
    const reviewReasons: string[] = [];
    if (model.length < 2) reviewReasons.push("مدل قابل تشخیص نیست");
    if (!storage) reviewReasons.push("حافظه مشخص نیست");
    if (explicitCurrency === "ambiguous") reviewReasons.push("واحد پول مشخص نیست");
    if (candidates.length > 1) reviewReasons.push("چند مبلغ در یک ردیف دیده شد");
    const priceToman = explicitCurrency === "ambiguous" ? null
      : explicitCurrency === "toman" ? candidate.tomanAmount : candidate.tomanAmount / 10;
    const normalizedToman = priceToman && Number.isFinite(priceToman) ? Math.round(priceToman) : null;
    const priceRial = normalizedToman === null ? null : normalizedToman * 10;
    const activationStatus = detectActivationStatus(line);
    const partNumber = detectPartNumber(line);
    const likelyIphone = /\biphone\b/i.test(line)
      || (!/\b(?:note|redmi|xiaomi|poco)\b/i.test(line) && /\b1[5-9]\s+pro(?:\s+max)?\b/i.test(line));
    if (activationStatus === "unknown" && likelyIphone) reviewReasons.push("وضعیت اکتیو مشخص نیست");
    rows.push({
      lineNumber: index + 1,
      rawLine: raw.slice(0, 500),
      model,
      storage,
      ram: detectRam(line),
      color: detectColor(line),
      condition: detectCondition(line),
      registrationStatus: inheritedRegistrationStatus,
      activationStatus,
      partNumber,
      priceType: options.defaultPriceType ?? "purchase",
      rawPrice: candidate.raw,
      currency: explicitCurrency,
      priceToman: normalizedToman,
      priceRial,
      confidence: reviewReasons.length === 0 ? "high" : reviewReasons.length <= 2 && priceRial ? "medium" : "low",
      reviewReasons,
    });
  });
  return rows.slice(0, 300);
};
