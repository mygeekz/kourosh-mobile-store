import type { Express, Request, Response } from "express";
import type { AuthorizeRole } from "./routes/intelligence/types";
import multer from "multer";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { allAsync, getAsync, runAsync } from "./db/query";
import { ensurePhoneMarketSnapshotTable } from "./phoneMarketPriceSnapshots";
import { parseSupplierFeedText, type SupplierFeedPlatform } from "./supplierFeedParser";
import { extractSupplierPdfTableRowsFromBbox, extractSupplierPdfTableRowsFromTextPages, type SupplierPdfTextPage } from "./supplierPdfTableExtractor";

const execFileAsync = promisify(execFile);
const attachmentDirectory = join(process.cwd(), "uploads", "supplier-feeds");
const acceptedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const extensionByMime: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "application/pdf": ".pdf" };
const validFileSignature = (buffer: Buffer, mimeType: string): boolean => {
  if (mimeType === "image/png") return buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (mimeType === "image/jpeg") return buffer.subarray(0, 3).toString("hex") === "ffd8ff";
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!acceptedMimeTypes.has(file.mimetype)) return callback(new Error("unsupported_supplier_feed_file"));
    return callback(null, true);
  },
});

export const SUPPLIER_FEED_SCHEMA = `
CREATE TABLE IF NOT EXISTS supplier_channel_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL CHECK(platform IN ('telegram','whatsapp','bale','manual')),
  source_name TEXT NOT NULL, source_reference TEXT, observed_at TEXT NOT NULL,
  input_kind TEXT NOT NULL CHECK(input_kind IN ('text','image','pdf','mixed')),
  attachment_path TEXT, original_file_name TEXT, mime_type TEXT, attachment_sha256 TEXT,
  raw_text TEXT, extracted_text TEXT,
  extraction_status TEXT NOT NULL CHECK(extraction_status IN ('not-required','extracted','needs-manual-review','failed')),
  review_status TEXT NOT NULL DEFAULT 'pending-review' CHECK(review_status IN ('pending-review','partially-approved','approved','rejected')),
  created_by_user_id INTEGER, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
);
CREATE TABLE IF NOT EXISTS supplier_channel_feed_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, feed_id INTEGER NOT NULL, line_number INTEGER NOT NULL, raw_line TEXT NOT NULL,
  model TEXT, storage TEXT, ram TEXT, color TEXT, condition TEXT, registration_status TEXT, activation_status TEXT, part_number TEXT,
  price_type TEXT NOT NULL CHECK(price_type IN ('purchase','sale')), raw_price REAL, currency TEXT,
  price_toman REAL, price_rial REAL, confidence TEXT NOT NULL CHECK(confidence IN ('high','medium','low')), review_reasons TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending-review' CHECK(review_status IN ('pending-review','approved','rejected')),
  approved_snapshot_id INTEGER, reviewed_by_user_id INTEGER, reviewed_at TEXT,
  FOREIGN KEY(feed_id) REFERENCES supplier_channel_feeds(id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_feed_created ON supplier_channel_feeds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_feed_items_feed ON supplier_channel_feed_items(feed_id, review_status);
`;

export const ensureSupplierFeedTables = async (): Promise<void> => {
  const statements = SUPPLIER_FEED_SCHEMA.split(";").map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) await runAsync(statement);
  const columns = new Set((await allAsync("PRAGMA table_info(supplier_channel_feed_items)")).map((column: any) => String(column.name)));
  for (const [name, definition] of [
    ["registration_status", "TEXT"], ["activation_status", "TEXT"], ["part_number", "TEXT"], ["price_toman", "REAL"],
  ] as const) if (!columns.has(name)) await runAsync(`ALTER TABLE supplier_channel_feed_items ADD COLUMN ${name} ${definition}`);
  await runAsync("UPDATE supplier_channel_feed_items SET price_toman = price_rial / 10 WHERE price_toman IS NULL AND COALESCE(price_rial, 0) > 0");
};

const text = (value: unknown, max: number): string => String(value ?? "").trim().slice(0, max);
const safeObservedAt = (value: unknown): string | null => {
  const parsed = new Date(String(value ?? ""));
  const ageDays = (Date.now() - parsed.getTime()) / 86_400_000;
  return !Number.isNaN(parsed.getTime()) && ageDays >= -1 && ageDays <= 90 ? parsed.toISOString() : null;
};

const runOcr = async (path: string): Promise<string> => {
  const languages = await execFileAsync("tesseract", ["--list-langs"], { timeout: 5_000, maxBuffer: 512_000 }).then(({ stdout }) => stdout).catch(() => "");
  const language = /(?:^|\n)fas(?:\n|$)/.test(languages) ? "fas+eng" : "eng";
  const { stdout } = await execFileAsync("tesseract", [path, "stdout", "-l", language, "--psm", "6"], { timeout: 30_000, maxBuffer: 4_000_000 });
  return stdout.trim();
};

const extractPdfTextWithPdfJs = async (path: string): Promise<{ pages: SupplierPdfTextPage[]; plainText: string }> => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({
    data: new Uint8Array(await readFile(path)),
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const document = await loadingTask.promise;
  try {
    const pages: SupplierPdfTextPage[] = [];
    const plainTextPages: string[] = [];
    const pageCount = Math.min(document.numPages, 8);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent({ disableNormalization: false });
      const items = content.items.flatMap((item: any) => {
        if (typeof item?.str !== "string" || !item.str.trim() || !Array.isArray(item.transform)) return [];
        return [{
          text: item.str,
          x: Number(item.transform[4] || 0),
          y: Number(item.transform[5] || 0),
          width: Number(item.width || 0),
          height: Number(item.height || 0),
        }];
      });
      pages.push({ width: viewport.width, height: viewport.height, items });
      const lineTolerance = Math.max(1.5, viewport.height * 0.003);
      const lines: Array<{ y: number; values: Array<{ x: number; text: string }> }> = [];
      for (const item of items) {
        const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= lineTolerance);
        if (line) line.values.push({ x: item.x, text: item.text });
        else lines.push({ y: item.y, values: [{ x: item.x, text: item.text }] });
      }
      plainTextPages.push(lines
        .sort((left, right) => right.y - left.y)
        .map((line) => line.values.sort((left, right) => left.x - right.x).map((value) => value.text.trim()).filter(Boolean).join(" "))
        .filter(Boolean).join("\n"));
    }
    return { pages, plainText: plainTextPages.filter(Boolean).join("\n") };
  } finally {
    await document.destroy();
  }
};

export const extractSupplierFeedAttachmentText = async (path: string, mimeType: string): Promise<{ text: string; status: "extracted" | "needs-manual-review" | "failed"; profile?: "structured-phone-table" | "plain-text" | "ocr" }> => {
  try {
    if (mimeType.startsWith("image/")) {
      const value = await runOcr(path);
      return { text: value, status: value.length >= 4 ? "extracted" : "needs-manual-review", profile: "ocr" };
    }
    const pdfJs = await extractPdfTextWithPdfJs(path).catch(() => ({ pages: [] as SupplierPdfTextPage[], plainText: "" }));
    const internalStructuredRows = extractSupplierPdfTableRowsFromTextPages(pdfJs.pages);
    if (internalStructuredRows.length >= 2) return { text: internalStructuredRows.join("\n"), status: "extracted", profile: "structured-phone-table" };

    const bbox = await execFileAsync("pdftotext", ["-bbox-layout", path, "-"], { timeout: 20_000, maxBuffer: 8_000_000 }).then(({ stdout }) => stdout).catch(() => "");
    const structuredRows = bbox ? extractSupplierPdfTableRowsFromBbox(bbox) : [];
    if (structuredRows.length >= 2) return { text: structuredRows.join("\n"), status: "extracted", profile: "structured-phone-table" };

    const direct = pdfJs.plainText.trim() || await execFileAsync("pdftotext", ["-layout", path, "-"], { timeout: 20_000, maxBuffer: 6_000_000 }).then(({ stdout }) => stdout.trim()).catch(() => "");
    if (direct.length >= 20) {
      const complexLayout = direct.split(/\r?\n/).some((line) => line.length > 240);
      return { text: direct, status: complexLayout ? "needs-manual-review" : "extracted", profile: "plain-text" };
    }
    const renderRoot = await mkdtemp(join(tmpdir(), "kourosh-supplier-pdf-"));
    try {
      const prefix = join(renderRoot, "page");
      await execFileAsync("pdftoppm", ["-png", "-r", "180", "-f", "1", "-l", "5", path, prefix], { timeout: 30_000, maxBuffer: 1_000_000 });
      const pages = (await readdir(renderRoot)).filter((name) => name.endsWith(".png")).sort();
      const chunks: string[] = [];
      for (const page of pages) chunks.push(await runOcr(join(renderRoot, page)).catch(() => ""));
      const value = chunks.filter(Boolean).join("\n").trim();
      return { text: value, status: value.length >= 4 ? "extracted" : "needs-manual-review", profile: "ocr" };
    } finally {
      await rm(renderRoot, { recursive: true, force: true });
    }
  } catch {
    return { text: "", status: "failed" };
  }
};

const feedDetails = async (id: number) => {
  const feed = await getAsync(`SELECT id, platform, source_name AS sourceName, source_reference AS sourceReference,
    observed_at AS observedAt, input_kind AS inputKind, original_file_name AS originalFileName, mime_type AS mimeType,
    extraction_status AS extractionStatus, review_status AS reviewStatus, created_at AS createdAt
    FROM supplier_channel_feeds WHERE id = ?`, [id]);
  if (!feed) return null;
  const items = await allAsync(`SELECT id, line_number AS lineNumber, raw_line AS rawLine, model, storage, ram, color, condition,
    registration_status AS registrationStatus, activation_status AS activationStatus, part_number AS partNumber,
    price_type AS priceType, raw_price AS rawPrice, currency, price_toman AS priceToman, price_rial AS priceRial, confidence,
    review_reasons AS reviewReasons, review_status AS reviewStatus, approved_snapshot_id AS approvedSnapshotId
    FROM supplier_channel_feed_items WHERE feed_id = ? ORDER BY line_number, id`, [id]);
  return { ...feed, items: items.map((item) => ({ ...item, reviewReasons: JSON.parse(item.reviewReasons || "[]") })) };
};

export const registerSupplierChannelFeedRoutes = (app: Express, authorizeRole: AuthorizeRole): void => {
  app.get("/api/phones/supplier-channel-feeds", authorizeRole(["Admin", "Manager", "Warehouse"]), async (request: Request, response: Response, next) => {
    try {
      await ensureSupplierFeedTables();
      const rows = await allAsync(`SELECT f.id, f.platform, f.source_name AS sourceName, f.observed_at AS observedAt,
        f.input_kind AS inputKind, f.extraction_status AS extractionStatus, f.review_status AS reviewStatus,
        COUNT(i.id) AS itemCount, SUM(CASE WHEN i.review_status = 'pending-review' THEN 1 ELSE 0 END) AS pendingCount,
        f.created_at AS createdAt FROM supplier_channel_feeds f LEFT JOIN supplier_channel_feed_items i ON i.feed_id = f.id
        GROUP BY f.id ORDER BY f.id DESC LIMIT 30`);
      return response.json({ success: true, data: rows });
    } catch (error) { return next(error); }
  });

  app.get("/api/phones/supplier-channel-feeds/:id", authorizeRole(["Admin", "Manager", "Warehouse"]), async (request: Request, response: Response, next) => {
    try {
      await ensureSupplierFeedTables();
      const data = await feedDetails(Number(request.params.id));
      return data ? response.json({ success: true, data }) : response.status(404).json({ success: false, message: "ورودی کانال پیدا نشد." });
    } catch (error) { return next(error); }
  });

  app.post("/api/phones/supplier-channel-feeds", authorizeRole(["Admin", "Manager"]), upload.single("attachment"), async (request: Request, response: Response, next) => {
    try {
      const platform = text(request.body?.platform, 16) as SupplierFeedPlatform;
      const sourceName = text(request.body?.sourceName, 120);
      const sourceReference = text(request.body?.sourceReference, 240) || null;
      const observedAt = safeObservedAt(request.body?.observedAt);
      const rawText = text(request.body?.rawText, 100_000);
      const defaultCurrency = text(request.body?.defaultCurrency, 12) as "rial" | "toman";
      const defaultPriceType = text(request.body?.defaultPriceType, 12) as "purchase" | "sale";
      if (!["telegram", "whatsapp", "bale", "manual"].includes(platform) || !sourceName || !observedAt || !["rial", "toman"].includes(defaultCurrency) || !["purchase", "sale"].includes(defaultPriceType) || (!rawText && !request.file)) {
        return response.status(400).json({ success: false, message: "پیام‌رسان، منبع، زمان، واحد پول و متن یا فایل معتبر الزامی است." });
      }
      let attachmentPath: string | null = null;
      let attachmentHash: string | null = null;
      let extractedText = "";
      let extractionStatus: "not-required" | "extracted" | "needs-manual-review" | "failed" = "not-required";
      if (request.file) {
        if (!validFileSignature(request.file.buffer, request.file.mimetype)) return response.status(400).json({ success: false, message: "محتوای فایل با نوع تصویر یا PDF انتخاب‌شده سازگار نیست." });
        await mkdir(attachmentDirectory, { recursive: true });
        attachmentHash = createHash("sha256").update(request.file.buffer).digest("hex");
        const extension = extensionByMime[request.file.mimetype];
        attachmentPath = join(attachmentDirectory, `${attachmentHash.slice(0, 32)}${extension}`);
        await writeFile(attachmentPath, request.file.buffer, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
        const extraction = await extractSupplierFeedAttachmentText(attachmentPath, request.file.mimetype);
        extractedText = extraction.text;
        extractionStatus = extraction.status;
      }
      const combinedText = [rawText, extractedText].filter(Boolean).join("\n");
      const parsedItems = parseSupplierFeedText(combinedText, { defaultCurrency, defaultPriceType, platform, compactThousands: platform === "bale" });
      const inputKind = request.file ? (rawText ? "mixed" : request.file.mimetype === "application/pdf" ? "pdf" : "image") : "text";
      await ensureSupplierFeedTables();
      await runAsync("BEGIN IMMEDIATE");
      try {
        const result = await runAsync(`INSERT INTO supplier_channel_feeds
          (platform, source_name, source_reference, observed_at, input_kind, attachment_path, original_file_name, mime_type, attachment_sha256, raw_text, extracted_text, extraction_status, created_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [platform, sourceName, sourceReference, observedAt, inputKind, attachmentPath, request.file?.originalname || null, request.file?.mimetype || null, attachmentHash, rawText || null, extractedText || null, extractionStatus, Number((request as any).user?.id || 0) || null]);
        for (const item of parsedItems) await runAsync(`INSERT INTO supplier_channel_feed_items
          (feed_id, line_number, raw_line, model, storage, ram, color, condition, registration_status, activation_status, part_number, price_type, raw_price, currency, price_toman, price_rial, confidence, review_reasons)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [result.lastID, item.lineNumber, item.rawLine, item.model || null, item.storage, item.ram, item.color, item.condition, item.registrationStatus, item.activationStatus, item.partNumber, item.priceType, item.rawPrice, item.currency, item.priceToman, item.priceRial, item.confidence, JSON.stringify(item.reviewReasons)]);
        await runAsync("COMMIT");
        return response.status(201).json({ success: true, data: await feedDetails(Number(result.lastID)) });
      } catch (error) { await runAsync("ROLLBACK").catch(() => undefined); throw error; }
    } catch (error) { return next(error); }
  });

  app.post("/api/phones/supplier-channel-feeds/:id/approve", authorizeRole(["Admin", "Manager"]), async (request: Request, response: Response, next) => {
    try {
      const feedId = Number(request.params.id);
      const items = Array.isArray(request.body?.items) ? request.body.items.slice(0, 300) : [];
      await ensureSupplierFeedTables();
      await ensurePhoneMarketSnapshotTable();
      const feed = await getAsync("SELECT * FROM supplier_channel_feeds WHERE id = ?", [feedId]);
      if (!feed) return response.status(404).json({ success: false, message: "ورودی کانال پیدا نشد." });
      const approved = items.filter((item: any) => item?.approved === true);
      if (!approved.length) return response.status(400).json({ success: false, message: "حداقل یک ردیف معتبر را برای تأیید انتخاب کنید." });
      await runAsync("BEGIN IMMEDIATE");
      try {
        let count = 0;
        for (const item of approved) {
          const model = text(item.model, 120); const storage = text(item.storage, 40); const ram = text(item.ram, 40) || null;
          const priceType = text(item.priceType, 12); const priceToman = Number(item.priceToman ?? (Number(item.priceRial) > 0 ? Number(item.priceRial) / 10 : 0));
          const registrationStatus = text(item.registrationStatus, 24) || "unknown";
          const activationStatus = text(item.activationStatus, 24) || "unknown";
          const partNumber = text(item.partNumber, 24) || null;
          if (!model || !storage || !["purchase", "sale"].includes(priceType) || !Number.isFinite(priceToman) || priceToman <= 0) throw new Error("supplier_feed_approved_item_invalid");

          let itemId = Number(item.id);
          if (itemId > 0) {
            const storedItem = await getAsync("SELECT id, review_status AS reviewStatus FROM supplier_channel_feed_items WHERE id = ? AND feed_id = ?", [itemId, feedId]);
            if (!storedItem || storedItem.reviewStatus !== "pending-review") throw new Error("supplier_feed_item_already_reviewed");
          } else {
            const manualItem = await runAsync(`INSERT INTO supplier_channel_feed_items
              (feed_id, line_number, raw_line, model, storage, ram, color, condition, registration_status, activation_status, part_number, price_type, raw_price, currency, price_toman, price_rial, confidence, review_reasons)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'toman', ?, ?, 'low', ?)`, [
              feedId,
              Math.max(1, Math.floor(Number(item.lineNumber) || 1)),
              text(item.rawLine, 500) || "ورودی دستی",
              model,
              storage,
              ram,
              text(item.color, 80) || null,
              text(item.condition, 80) || null,
              registrationStatus,
              activationStatus,
              partNumber,
              priceType,
              priceToman,
              priceToman,
              priceToman * 10,
              JSON.stringify(["manual-review-row"]),
            ]);
            itemId = Number(manualItem.lastID);
          }

          const variantNotes = [
            text(item.condition, 80) || null,
            registrationStatus === "unregistered" ? "رجیستر نشده" : registrationStatus === "registered" ? "رجیستر شده" : null,
            activationStatus === "not-activated" ? "نات اکتیو" : activationStatus === "active" ? "اکتیو" : null,
            partNumber ? `پارت‌نامبر ${partNumber}` : null,
          ].filter(Boolean).join(" • ") || null;
          const snapshot = await runAsync(`INSERT INTO phone_market_price_snapshots
            (model, storage, ram, color, condition, price_type, price, source_name, source_reference, observed_at, approved_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [model, storage, ram, text(item.color, 80) || null, variantNotes, priceType, priceToman, feed.source_name, `${feed.platform}:${feed.source_reference || `feed-${feedId}`}`, feed.observed_at, Number((request as any).user?.id || 0) || null]);
          await runAsync(`UPDATE supplier_channel_feed_items SET model=?, storage=?, ram=?, color=?, condition=?, registration_status=?, activation_status=?, part_number=?, price_type=?, price_toman=?, price_rial=?, review_status='approved', approved_snapshot_id=?, reviewed_by_user_id=?, reviewed_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=? AND feed_id=?`, [model, storage, ram, text(item.color, 80) || null, text(item.condition, 80) || null, registrationStatus, activationStatus, partNumber, priceType, priceToman, priceToman * 10, snapshot.lastID, Number((request as any).user?.id || 0) || null, itemId, feedId]);
          count += 1;
        }
        const remainingPending = Number((await getAsync("SELECT COUNT(*) AS count FROM supplier_channel_feed_items WHERE feed_id = ? AND review_status = 'pending-review'", [feedId]))?.count || 0);
        await runAsync("UPDATE supplier_channel_feeds SET review_status = ? WHERE id = ?", [remainingPending === 0 ? "approved" : "partially-approved", feedId]);
        await runAsync("COMMIT");
        return response.json({ success: true, data: { feedId, approvedItems: count, automaticPricingApplied: false, businessRecordsMutated: false } });
      } catch (error) { await runAsync("ROLLBACK").catch(() => undefined); throw error; }
    } catch (error: any) {
      if (error?.message === "supplier_feed_approved_item_invalid") return response.status(400).json({ success: false, message: "مدل، حافظه، مبلغ تومانی و نوع قیمت ردیف‌های تأییدی باید کامل باشند." });
      if (error?.message === "supplier_feed_item_already_reviewed") return response.status(409).json({ success: false, message: "یکی از ردیف‌ها قبلاً بررسی شده است؛ فهرست را دوباره بارگذاری کنید." });
      return next(error);
    }
  });
};
