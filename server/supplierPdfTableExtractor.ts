import { detectSupplierPhoneStorage } from "./supplierFeedParser";

type BboxLine = { xMin: number; yMin: number; xMax: number; yMax: number; text: string };
type BboxBlock = { xMin: number; yMin: number; xMax: number; yMax: number; text: string; lines: BboxLine[] };

export type SupplierPdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SupplierPdfTextPage = {
  width: number;
  height: number;
  items: SupplierPdfTextItem[];
};

const decodeXml = (value: string): string => value
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

const attribute = (tag: string, name: string): number => Number(tag.match(new RegExp(`${name}="([0-9.]+)"`))?.[1] || 0);
const words = (body: string): string[] => [...body.matchAll(/<word\b[^>]*>([\s\S]*?)<\/word>/g)]
  .map((match) => decodeXml(match[1]).replace(/<[^>]+>/g, "").trim()).filter(Boolean);

const parseBlocks = (xhtml: string): { width: number; blocks: BboxBlock[] } => {
  const pageTag = xhtml.match(/<page\b[^>]*>/)?.[0] ?? "";
  const width = attribute(pageTag, "width");
  const blocks: BboxBlock[] = [];
  for (const blockMatch of xhtml.matchAll(/(<block\b[^>]*>)([\s\S]*?)<\/block>/g)) {
    const tag = blockMatch[1];
    const body = blockMatch[2];
    const lines: BboxLine[] = [];
    for (const lineMatch of body.matchAll(/(<line\b[^>]*>)([\s\S]*?)<\/line>/g)) {
      const lineTag = lineMatch[1];
      lines.push({
        xMin: attribute(lineTag, "xMin"), yMin: attribute(lineTag, "yMin"),
        xMax: attribute(lineTag, "xMax"), yMax: attribute(lineTag, "yMax"),
        text: words(lineMatch[2]).join(" "),
      });
    }
    const text = lines.map((line) => line.text).filter(Boolean).join(" ");
    if (text) blocks.push({
      xMin: attribute(tag, "xMin"), yMin: attribute(tag, "yMin"),
      xMax: attribute(tag, "xMax"), yMax: attribute(tag, "yMax"), text, lines,
    });
  }
  return { width, blocks };
};

const overlapsRow = (left: BboxBlock, right: BboxBlock): boolean =>
  Math.min(left.yMax, right.yMax) - Math.max(left.yMin, right.yMin) >= -2;

const looksLikePhoneModel = (block: BboxBlock, pageWidth: number): boolean => {
  if (!pageWidth || block.xMin > pageWidth * 0.52 || !detectSupplierPhoneStorage(block.text)) return false;
  if (!/[a-z]/i.test(block.text) || /(?:BUDS|TAB\b|PAD\b|WATCH|POWER|ADAPTER|AIRPOD|CABLE|کابل)/i.test(block.text)) return false;
  return /[a-z]*\d|\d[a-z]/i.test(block.text);
};

const compactPriceTokens = (value: string): string[] => [...value.matchAll(/(?:^|\s)(\d{4,7}(?:\/(?:B|W|P|G|BL|BLU|BLUE|SIL|GOLD|GRAY|RAY|ICE|MIX|N|J))*)/gi)].map((match) => match[1]);
const colorOnly = (value: string): boolean => /^(?:B|W|P|G|BL|BLU|BLUE|SIL|GOLD|GRAY|RAY|ICE|MIX|N|J)(?:\/(?:B|W|P|G|BL|BLU|BLUE|SIL|GOLD|GRAY|RAY|ICE|MIX|N|J))*\/?$/i.test(value.trim());

/** Converts Poppler bbox output from vector Excel-like supplier PDFs into one model/price observation per line. */
export const extractSupplierPdfTableRowsFromBbox = (xhtml: string): string[] => {
  const { width, blocks } = parseBlocks(xhtml);
  const models = blocks.filter((block) => looksLikePhoneModel(block, width)).sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin);
  const output: string[] = [];
  for (const model of models) {
    const modelLabel = model.text
      .replace(/(?:^|\s)\d{4,7}(?:\/(?:B|W|P|G|BL|BLU|BLUE|SIL|GOLD|GRAY|RAY|ICE|MIX|N|J))*/gi, " ")
      .replace(/\s+/g, " ").trim();
    const fragments: string[] = compactPriceTokens(model.text);
    const nextModel = models
      .filter((candidate) => candidate.xMin > model.xMin && overlapsRow(model, candidate))
      .sort((a, b) => a.xMin - b.xMin)[0];
    const rightEdge = nextModel?.xMin ?? Math.min(width * 0.65, model.xMax + 150);
    const detailBlocks = blocks
      .filter((block) => block !== model && block.xMin >= model.xMax - 1 && block.xMin < rightEdge && overlapsRow(model, block))
      .sort((a, b) => a.xMin - b.xMin || a.yMin - b.yMin);
    for (const detail of detailBlocks) {
      for (const line of detail.lines) {
        const value = line.text.trim();
        const prices = compactPriceTokens(value);
        if (prices.length) fragments.push(...prices);
        else if (colorOnly(value) && fragments.length) fragments[fragments.length - 1] = `${fragments[fragments.length - 1]}/${value.replace(/^\/+|\/+$/g, "")}`;
      }
    }
    for (const fragment of fragments) output.push(`${modelLabel} ${fragment}`.replace(/\s+/g, " ").trim());
  }
  return [...new Set(output)].slice(0, 300);
};

type NormalizedRange = readonly [number, number];
type PhoneTableGroup = {
  model: NormalizedRange;
  quote1: NormalizedRange;
  quote2: NormalizedRange;
};

/*
 * Tehran Pakhsh exports an A3 Excel sheet with five phone sections on the left.
 * Each section is a stable three-cell group: model/specification, quote one,
 * quote two or the shared colour. Ratios keep the parser independent of DPI.
 */
const TEHRAN_PAKHSH_PHONE_GROUPS: readonly PhoneTableGroup[] = [
  { model: [0.038, 0.088], quote1: [0.088, 0.128], quote2: [0.128, 0.164] },
  { model: [0.164, 0.213], quote1: [0.213, 0.252], quote2: [0.252, 0.288] },
  { model: [0.288, 0.332], quote1: [0.332, 0.372], quote2: [0.372, 0.408] },
  { model: [0.408, 0.452], quote1: [0.452, 0.492], quote2: [0.492, 0.526] },
  { model: [0.526, 0.576], quote1: [0.576, 0.613], quote2: [0.613, 0.641] },
] as const;

const normalizeDigits = (value: string): string => value
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[\u200c\u200f\u202a-\u202e]/g, "")
  .replace(/\s+/g, " ").trim();

const inRange = (item: SupplierPdfTextItem, range: NormalizedRange, pageWidth: number): boolean => {
  const center = item.x + Math.max(0, item.width) / 2;
  return center >= range[0] * pageWidth && center < range[1] * pageWidth;
};

const joinVisualLine = (items: SupplierPdfTextItem[]): string => {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let result = "";
  let previousEnd: number | null = null;
  for (const item of sorted) {
    const value = normalizeDigits(item.text);
    if (!value) continue;
    const gap = previousEnd === null ? Number.POSITIVE_INFINITY : item.x - previousEnd;
    result += result && gap > Math.max(1.4, item.height * 0.18) ? ` ${value}` : value;
    previousEnd = item.x + Math.max(0, item.width);
  }
  return result.trim();
};

const joinCellItems = (items: SupplierPdfTextItem[], lineTolerance: number): string => {
  const lines: Array<{ y: number; items: SupplierPdfTextItem[] }> = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= lineTolerance);
    if (line) {
      line.items.push(item);
      line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
    } else lines.push({ y: item.y, items: [item] });
  }
  return lines.sort((a, b) => b.y - a.y).map((line) => joinVisualLine(line.items)).filter(Boolean).join(" ").trim();
};

const priceTokenPattern = /(?<!\d)\d{4,7}(?!\d)/g;
const hasCompactPrice = (value: string): boolean => /(?<!\d)\d{4,7}(?!\d)/.test(normalizeDigits(value));

const clusterRowCenters = (values: number[], tolerance: number): number[] => {
  const clusters: Array<{ center: number; count: number }> = [];
  for (const value of [...values].sort((a, b) => b - a)) {
    const cluster = clusters.find((candidate) => Math.abs(candidate.center - value) <= tolerance);
    if (cluster) {
      cluster.center = (cluster.center * cluster.count + value) / (cluster.count + 1);
      cluster.count += 1;
    } else clusters.push({ center: value, count: 1 });
  }
  return clusters.map((cluster) => cluster.center).sort((a, b) => b - a);
};

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const nearestRowIndex = (y: number, centers: number[], maxDistance: number): number => {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  centers.forEach((center, index) => {
    const distance = Math.abs(center - y);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return bestDistance <= maxDistance ? bestIndex : -1;
};

const excludedModelKeywords = /(?:BUDS|TAB\b|PAD\b|WATCH|POWER|ADAPTER|AIRPOD|CABLE|CHARGER|\bT\d{3}\b|\bWIFI\b|هندزفری|ساعت|کابل|شارژر|گارانتی)/i;
const looksLikeStructuredPhoneModel = (value: string): boolean => {
  const normalized = normalizeDigits(value);
  return Boolean(
    detectSupplierPhoneStorage(normalized)
    && /[a-z]/i.test(normalized)
    && /[a-z]*\d|\d[a-z]/i.test(normalized)
    && !excludedModelKeywords.test(normalized),
  );
};

const normalizeQuoteText = (value: string): string => normalizeDigits(value)
  .replace(/G\s+RAY/gi, "GRAY")
  .replace(/B\s+LUE/gi, "BLUE")
  .replace(/S\s+IL/gi, "SIL")
  .replace(/\s*\/\s*/g, "/")
  .replace(/\s+/g, " ")
  .trim();

const quoteColorCodes = new Set([
  "B", "W", "P", "G", "BL", "BLU", "BLUE", "SIL", "GOLD", "GRAY", "GREY", "RAY", "ICE", "MIX", "N", "J",
  "BLACK", "WHITE", "PINK", "GREEN", "PURPLE", "RED", "SILVER", "NAVY",
]);

const colorTokens = (value: string): string[] => normalizeQuoteText(value)
  .replace(priceTokenPattern, " ")
  .split(/[\s/|,،]+/)
  .map((token) => token.toUpperCase().trim())
  .filter((token) => quoteColorCodes.has(token));

type QuoteObservation = { price: string; colors: string[] };

const parseQuoteStream = (quote1: string, quote2: string): QuoteObservation[] => {
  const observations: QuoteObservation[] = [];
  let current: QuoteObservation | null = null;
  for (const cell of [quote1, quote2]) {
    const normalized = normalizeQuoteText(cell);
    if (!normalized) continue;
    const matches = [...normalized.matchAll(priceTokenPattern)];
    if (!matches.length) {
      if (current) current.colors.push(...colorTokens(normalized));
      continue;
    }
    const prefix = normalized.slice(0, matches[0].index ?? 0);
    if (current) current.colors.push(...colorTokens(prefix));
    for (const [index, match] of matches.entries()) {
      const start = (match.index ?? 0) + match[0].length;
      const end = index + 1 < matches.length ? (matches[index + 1].index ?? normalized.length) : normalized.length;
      current = { price: match[0], colors: colorTokens(normalized.slice(start, end)) };
      observations.push(current);
    }
  }
  return observations
    .map((observation) => ({ ...observation, colors: [...new Set(observation.colors)] }))
    .filter((observation) => Number(observation.price) >= 1_000);
};

const countryCodeFrom = (value: string): string | null => {
  const match = normalizeDigits(value).match(/(?:^|\s)(VIT|VN|CHIN|CHINA|CH|IND|INDIA)(?=\s|\/|$)/i);
  if (!match) return null;
  const code = match[1].toUpperCase();
  if (["VIT", "VN"].includes(code)) return "VIT";
  if (["CHIN", "CHINA", "CH"].includes(code)) return "CH";
  if (["IND", "INDIA"].includes(code)) return "IND";
  return code;
};

const serializeObservation = (modelText: string, quoteText: string, observation: QuoteObservation): string => {
  const countryCode = countryCodeFrom(`${modelText} ${quoteText}`);
  const modelWithCountry = countryCode && !new RegExp(`(?:^|\\s)${countryCode}(?:\\s|$)`, "i").test(modelText)
    ? `${modelText} ${countryCode}` : modelText;
  const suffix = observation.colors.length ? `/${observation.colors.join("/")}` : "";
  return `${modelWithCountry} ${observation.price}${suffix}`.replace(/\s+/g, " ").trim();
};

const extractPageRows = (page: SupplierPdfTextPage): string[] => {
  if (!(page.width > 0) || !(page.height > 0) || page.items.length < 10) return [];
  const items = page.items
    .map((item) => ({ ...item, text: normalizeDigits(item.text) }))
    .filter((item) => item.text && Number.isFinite(item.x) && Number.isFinite(item.y));

  const quoteRanges = TEHRAN_PAKHSH_PHONE_GROUPS.flatMap((group) => [group.quote1, group.quote2]);
  const priceBaselines = items
    .filter((item) => quoteRanges.some((range) => inRange(item, range, page.width)) && hasCompactPrice(item.text))
    .map((item) => item.y);
  if (priceBaselines.length < 4) return [];

  const centers = clusterRowCenters(priceBaselines, page.height * 0.0135);
  if (centers.length < 2) return [];
  const gaps = centers.slice(1).map((center, index) => centers[index] - center).filter((gap) => gap > page.height * 0.012);
  const rowSpacing = median(gaps) ?? page.height * 0.0275;
  const rowMaxDistance = Math.min(page.height * 0.014, rowSpacing * 0.48);
  const lineTolerance = Math.max(1.4, page.height * 0.0028);
  const output: string[] = [];

  for (let rowIndex = 0; rowIndex < centers.length; rowIndex += 1) {
    const rowItems = items.filter((item) => nearestRowIndex(item.y, centers, rowMaxDistance) === rowIndex);
    if (!rowItems.length) continue;
    for (const group of TEHRAN_PAKHSH_PHONE_GROUPS) {
      const modelText = joinCellItems(rowItems.filter((item) => inRange(item, group.model, page.width)), lineTolerance);
      if (!looksLikeStructuredPhoneModel(modelText)) continue;
      const quote1 = joinCellItems(rowItems.filter((item) => inRange(item, group.quote1, page.width)), lineTolerance);
      const quote2 = joinCellItems(rowItems.filter((item) => inRange(item, group.quote2, page.width)), lineTolerance);
      const observations = parseQuoteStream(quote1, quote2);
      for (const observation of observations) output.push(serializeObservation(modelText, `${quote1} ${quote2}`, observation));
    }
  }
  return output;
};

/**
 * Pure-JavaScript extractor for Tehran Pakhsh's Excel-like PDF. It does not
 * require Poppler, Tesseract, Python, or any executable to be installed on Windows.
 */
export const extractSupplierPdfTableRowsFromTextPages = (pages: SupplierPdfTextPage[]): string[] =>
  [...new Set(pages.flatMap(extractPageRows))].slice(0, 300);
