import type { Express } from 'express';
import { allAsync, getAsync } from '../database';

const normDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const normalizeQuery = (q: string) =>
  normDigits(q)
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[ـ"']/g, " ") // tatweel & quotes
    .trim();

const faNum = (v: any) => Number(v ?? 0).toLocaleString("fa-IR");
const toPrefixQuery = (q: string) =>
  normalizeQuery(q)
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter(Boolean)
    .map((t) => (t.endsWith("*") ? t : t + "*"))
    .join(" ");

const escapeSearchHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeFtsHighlight = (value: unknown) => {
  const raw = String(value ?? "");
  const open = "__KOUROSH_MARK_OPEN__";
  const close = "__KOUROSH_MARK_CLOSE__";
  return escapeSearchHtml(
    raw.replace(/<mark>/g, open).replace(/<\/mark>/g, close),
  )
    .replace(new RegExp(open, "g"), "<mark>")
    .replace(new RegExp(close, "g"), "</mark>");
};

const highlightSearchPlainText = (value: unknown, rawQuery: string) => {
  let escaped = escapeSearchHtml(value);
  const tokens = normalizeQuery(rawQuery)
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .slice(0, 8);
  for (const token of tokens) {
    const safe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!safe) continue;
    escaped = escaped.replace(
      new RegExp(safe, "gi"),
      (match) => `<mark>${match}</mark>`,
    );
  }
  return escaped;
};

const makeSearchSnippet = (value: unknown, rawQuery: string, maxLen = 140) => {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const tokens = normalizeQuery(rawQuery).split(/\s+/).filter(Boolean);
  const normalizedText = normalizeQuery(text);
  let idx = -1;
  for (const token of tokens) {
    idx = normalizedText.indexOf(token);
    if (idx >= 0) break;
  }
  const start = idx > 35 ? Math.max(0, idx - 35) : 0;
  const slice = text.slice(start, start + maxLen);
  return `${start > 0 ? "… " : ""}${slice}${start + maxLen < text.length ? " …" : ""}`;
};

const stripSearchHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const normalizeSearchRankText = (value: unknown) =>
  normalizeQuery(stripSearchHtml(value)).toLowerCase();
const searchQueryTokens = (rawQuery: string) =>
  normalizeSearchRankText(rawQuery).split(/\s+/).filter(Boolean).slice(0, 8);

const buildSearchRankMeta = (args: {
  domain: string;
  rawQuery: string;
  title?: unknown;
  subtitle?: unknown;
  snippet?: unknown;
  ftsScore?: unknown;
}) => {
  const query = normalizeSearchRankText(args.rawQuery);
  const tokens = searchQueryTokens(args.rawQuery);
  const title = normalizeSearchRankText(args.title);
  const subtitle = normalizeSearchRankText(args.subtitle);
  const snippet = normalizeSearchRankText(args.snippet);
  const haystack = [title, subtitle, snippet].filter(Boolean).join(" ");
  const phraseInTitle = Boolean(query && title.includes(query));
  const phraseInSubtitle = Boolean(query && subtitle.includes(query));
  const phraseInSnippet = Boolean(query && snippet.includes(query));
  const exactTitle = Boolean(query && title === query);
  const allTokensTitle =
    tokens.length > 0 && tokens.every((t) => title.includes(t));
  const allTokensSnippet =
    tokens.length > 0 && tokens.every((t) => snippet.includes(t));
  const allTokensAny =
    tokens.length > 0 && tokens.every((t) => haystack.includes(t));
  const sourceBase =
    args.domain === "phone"
      ? "مدل/مشخصات گوشی"
      : args.domain === "product"
        ? "نام/مشخصات کالا"
        : args.domain === "service"
          ? "نام/توضیح خدمت"
          : args.domain === "customer"
            ? "پرونده/تراکنش مشتری"
            : args.domain === "partner"
              ? "پرونده/دفتر همکار"
              : args.domain === "invoice"
                ? "فاکتور/اقلام"
                : args.domain === "installment"
                  ? "فروش اقساطی/شرح"
                  : args.domain === "repair"
                    ? "تعمیرات/شرح"
                    : "جستجو";

  let rank = 20;
  let matchSource = sourceBase;
  let matchReason = "تطابق عمومی در جستجوی سراسری";

  if (
    exactTitle &&
    (args.domain === "phone" ||
      args.domain === "product" ||
      args.domain === "service")
  ) {
    rank = 120;
    matchSource =
      args.domain === "phone"
        ? "مدل دقیق گوشی"
        : args.domain === "product"
          ? "نام دقیق کالا"
          : "نام دقیق خدمت";
    matchReason = `عبارت «${stripSearchHtml(args.rawQuery)}» دقیقاً با ${matchSource} تطابق دارد.`;
  } else if (
    phraseInTitle &&
    (args.domain === "phone" ||
      args.domain === "product" ||
      args.domain === "service")
  ) {
    rank = 105;
    matchSource =
      args.domain === "phone"
        ? "مدل گوشی"
        : args.domain === "product"
          ? "نام کالا"
          : "نام خدمت";
    matchReason = `عبارت جستجو در ${matchSource} پیدا شد.`;
  } else if (phraseInSnippet) {
    rank = 88;
    matchSource =
      args.domain === "customer"
        ? "توضیح/تراکنش مشتری"
        : args.domain === "partner"
          ? "دفتر/توضیح همکار"
          : args.domain === "invoice"
            ? "توضیحات یا اقلام فاکتور"
            : args.domain === "repair"
              ? "شرح تعمیرات"
              : args.domain === "installment"
                ? "شرح فروش اقساطی"
                : "توضیحات/یادداشت";
    matchReason = `عبارت جستجو داخل ${matchSource} پیدا شد.`;
  } else if (phraseInTitle) {
    rank = 78;
    matchSource = sourceBase;
    matchReason = `عبارت جستجو در عنوان ${sourceBase} پیدا شد.`;
  } else if (phraseInSubtitle) {
    rank = 68;
    matchSource = "اطلاعات تکمیلی";
    matchReason = "عبارت جستجو در اطلاعات تکمیلی نتیجه پیدا شد.";
  } else if (allTokensTitle) {
    rank = 62;
    matchSource = sourceBase;
    matchReason = "همه کلمات جستجو در عنوان نتیجه وجود دارد.";
  } else if (allTokensSnippet) {
    rank = 56;
    matchSource = "توضیحات/یادداشت";
    matchReason = "همه کلمات جستجو در توضیحات یا یادداشت پیدا شد.";
  } else if (allTokensAny) {
    rank = 44;
    matchSource = "تطابق ترکیبی";
    matchReason = "کلمات جستجو در چند بخش مختلف نتیجه پیدا شد.";
  } else if (Number.isFinite(Number(args.ftsScore))) {
    rank = Math.max(25, Math.round(42 - Number(args.ftsScore || 0)));
    matchSource = "ایندکس جستجو";
    matchReason = "نتیجه از ایندکس جستجوی سریع پیدا شد.";
  }

  return {
    rankScore: Math.max(1, Math.min(140, rank)),
    matchSource,
    matchReason,
  };
};
// از اینجا به بعد همه‌ی روترها پشت authenticateToken هستند (app.use(authenticateToken))
export const registerSearchRoutes = (app: Express): void => {
  app.get("/api/search", async (req, res, next) => {
  try {
    const rawQ = String(req.query.q || "").slice(0, 100);
    const limit = Math.min(
      parseInt(String(req.query.limit || "20"), 10) || 20,
      50,
    );
    if (!rawQ) return res.json({ items: [] });
    // مطمئن شو search_index ساخته شده
    const hasFts = await getAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='search_index'",
    );
    if (!hasFts) {
      return res.status(501).json({
        success: false,
        message: "FTS5 فعال نیست یا search_index ساخته نشده.",
      });
    }
    const q = toPrefixQuery(rawQ);
    if (!q) return res.json({ items: [] });
    const rows = await allAsync(
      `
      SELECT 
        rowid,
        domain,
        entity_id as entityId,
        highlight(search_index, 2, '<mark>','</mark>') AS titleHL,
        snippet(search_index, 3, '<mark>','</mark>', ' … ', 8) AS snippet,
        bm25(search_index) AS score
      FROM search_index
      WHERE search_index MATCH ?
      ORDER BY score ASC
      LIMIT ?;
      `,
      [q, limit],
    );
    const seenSearchItems = new Set(
      rows.map((r: any) => `${r.domain}:${r.entityId}`),
    );
    const addSupplementalRows = (list: any[]) => {
      for (const item of list || []) {
        const key = `${item.domain}:${item.entityId}`;
        if (seenSearchItems.has(key)) continue;
        seenSearchItems.add(key);
        rows.push({
          rowid: 0,
          domain: item.domain,
          entityId: Number(item.entityId),
          titleHL: highlightSearchPlainText(item.title || "", rawQ),
          snippet: highlightSearchPlainText(
            makeSearchSnippet(
              item.content || item.extra || item.title || "",
              rawQ,
            ),
            rawQ,
          ),
          score: 999,
        });
      }
    };

    const normalizedLikeValue = normalizeQuery(rawQ);
    const like = `%${normalizedLikeValue}%`;
    const rawLike = `%${rawQ.trim()}%`;
    const lowerLike = `%${rawQ.trim().toLowerCase()}%`;

    // اولویت ویژه: توضیحات و اقلام فروش نقدی (فاکتورهای فروش) حتی اگر FTS پر شده باشد
    // تا در جستجوی سراسری، متن‌های یادداشت/شرح فروش نقدی از قلم نیفتند.
    const prioritizedInvoiceMatches = await allAsync(
      `
      SELECT 'invoice' AS domain, i.id AS entityId, TRIM(COALESCE(i.invoiceNumber,'') || ' فاکتور #' || i.id) AS title,
             TRIM(COALESCE(c.fullName,'') || ' ' || COALESCE(i.notes,'') || ' ' || COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = i.id),'')) AS content,
             TRIM(COALESCE(i.invoiceNumber,'') || ' ' || COALESCE(i.notes,'')) AS extra
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customerId
      WHERE COALESCE(i.notes,'') LIKE ?
         OR COALESCE(i.notes,'') LIKE ?
         OR COALESCE(i.invoiceNumber,'') LIKE ?
         OR COALESCE(i.invoiceNumber,'') LIKE ?
         OR COALESCE(c.fullName,'') LIKE ?
         OR COALESCE(c.fullName,'') LIKE ?
         OR COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = i.id),'') LIKE ?
         OR COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = i.id),'') LIKE ?
      ORDER BY i.id DESC
      LIMIT ?`,
      [
        like,
        rawLike,
        like,
        rawLike,
        like,
        rawLike,
        like,
        rawLike,
        Math.min(Math.max(limit, 20), 30),
      ],
    ).catch(() => []);
    addSupplementalRows(prioritizedInvoiceMatches as any[]);

    // نسل اصلی فروش نقدی/اعتباری پروژه داخل sales_orders ذخیره می‌شود؛
    // برای همین علاوه بر invoices، خود فاکتورهای فروش و اقلامشان هم باید جستجو شوند.
    const prioritizedSalesOrderMatches = await allAsync(
      `
      SELECT 'invoice' AS domain, so.id AS entityId, TRIM('فاکتور فروش #' || so.id) AS title,
             TRIM(COALESCE(c.fullName,'') || ' ' || COALESCE(so.notes,'') || ' ' || COALESCE(so.paymentMethod,'') || ' ' || COALESCE(so.transactionDate,'') || ' ' || COALESCE((SELECT group_concat(description, ' • ') FROM sales_order_items WHERE orderId = so.id),'')) AS content,
             TRIM(CAST(so.id AS TEXT) || ' ' || COALESCE(so.notes,'') || ' ' || COALESCE((SELECT group_concat(description, ' • ') FROM sales_order_items WHERE orderId = so.id),'')) AS extra
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customerId
      WHERE COALESCE(so.notes,'') LIKE ?
         OR COALESCE(so.notes,'') LIKE ?
         OR CAST(so.id AS TEXT) LIKE ?
         OR COALESCE(c.fullName,'') LIKE ?
         OR COALESCE(c.fullName,'') LIKE ?
         OR COALESCE((SELECT group_concat(description, ' • ') FROM sales_order_items WHERE orderId = so.id),'') LIKE ?
         OR COALESCE((SELECT group_concat(description, ' • ') FROM sales_order_items WHERE orderId = so.id),'') LIKE ?
      ORDER BY so.id DESC
      LIMIT ?`,
      [
        like,
        rawLike,
        rawLike,
        like,
        rawLike,
        like,
        rawLike,
        Math.min(Math.max(limit, 20), 30),
      ],
    ).catch(() => []);
    addSupplementalRows(prioritizedSalesOrderMatches as any[]);

    if (
      rows.length < limit ||
      prioritizedInvoiceMatches.length > 0 ||
      prioritizedSalesOrderMatches.length > 0
    ) {
      const remaining = Math.max(0, limit - rows.length);
      const supplementalTasks = [
        allAsync(
          `
          SELECT 'customer' AS domain, id AS entityId, fullName AS title,
                 TRIM(COALESCE(address,'') || ' ' || COALESCE(notes,'') || ' ' || COALESCE(tags,'')) AS content,
                 COALESCE(phoneNumber,'') AS extra
          FROM customers
          WHERE COALESCE(fullName,'') LIKE ? OR COALESCE(phoneNumber,'') LIKE ? OR COALESCE(address,'') LIKE ? OR COALESCE(notes,'') LIKE ? OR COALESCE(tags,'') LIKE ?
          LIMIT ?`,
          [like, like, like, like, like, remaining],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'partner' AS domain, id AS entityId, partnerName AS title,
                 TRIM(COALESCE(partnerType,'') || ' ' || COALESCE(contactPerson,'') || ' ' || COALESCE(address,'') || ' ' || COALESCE(notes,'')) AS content,
                 TRIM(COALESCE(phoneNumber,'') || ' ' || COALESCE(email,'')) AS extra
          FROM partners
          WHERE COALESCE(partnerName,'') LIKE ? OR COALESCE(partnerType,'') LIKE ? OR COALESCE(contactPerson,'') LIKE ? OR COALESCE(phoneNumber,'') LIKE ? OR COALESCE(email,'') LIKE ? OR COALESCE(address,'') LIKE ? OR COALESCE(notes,'') LIKE ?
          LIMIT ?`,
          [like, like, like, like, like, like, like, remaining],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'customer' AS domain, cl.customerId AS entityId, c.fullName AS title,
                 TRIM('تراکنش مشتری • ' || COALESCE(cl.transactionDate,'') || ' • ' || COALESCE(cl.description,'')) AS content,
                 TRIM(COALESCE(c.phoneNumber,'') || ' ' || CAST(COALESCE(cl.debit,0) AS TEXT) || ' ' || CAST(COALESCE(cl.credit,0) AS TEXT)) AS extra
          FROM customer_ledger cl
          LEFT JOIN customers c ON c.id = cl.customerId
          WHERE COALESCE(cl.description,'') LIKE ? OR COALESCE(cl.transactionDate,'') LIKE ? OR COALESCE(c.fullName,'') LIKE ? OR COALESCE(c.phoneNumber,'') LIKE ?
          ORDER BY cl.id DESC
          LIMIT ?`,
          [like, like, like, like, remaining],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'partner' AS domain, pl.partnerId AS entityId, p.partnerName AS title,
                 TRIM('دفتر همکار • ' || COALESCE(pl.transactionDate,'') || ' • ' || COALESCE(pl.description,'')) AS content,
                 TRIM(COALESCE(p.phoneNumber,'') || ' ' || CAST(COALESCE(pl.debit,0) AS TEXT) || ' ' || CAST(COALESCE(pl.credit,0) AS TEXT)) AS extra
          FROM partner_ledger pl
          LEFT JOIN partners p ON p.id = pl.partnerId
          WHERE COALESCE(pl.description,'') LIKE ? OR COALESCE(pl.transactionDate,'') LIKE ? OR COALESCE(p.partnerName,'') LIKE ? OR COALESCE(p.phoneNumber,'') LIKE ?
          ORDER BY pl.id DESC
          LIMIT ?`,
          [like, like, like, like, remaining],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'product' AS domain, p.id AS entityId, p.name AS title,
                 TRIM(COALESCE(p.name,'') || ' ' || COALESCE(c.name,'') || ' ' || COALESCE(s.partnerName,'')) AS content,
                 TRIM(COALESCE(p.sku,'') || ' ' || COALESCE(p.barcode,'')) AS extra
          FROM products p
          LEFT JOIN categories c ON c.id = p.categoryId
          LEFT JOIN partners s ON s.id = p.supplierId
          WHERE COALESCE(p.name,'') LIKE ? OR LOWER(COALESCE(p.name,'')) LIKE ? OR COALESCE(c.name,'') LIKE ? OR COALESCE(s.partnerName,'') LIKE ? OR COALESCE(p.sku,'') LIKE ? OR LOWER(COALESCE(p.sku,'')) LIKE ? OR COALESCE(p.barcode,'') LIKE ?
          LIMIT ?`,
          [
            rawLike,
            lowerLike,
            like,
            like,
            rawLike,
            lowerLike,
            rawLike,
            remaining,
          ],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'phone' AS domain, ph.id AS entityId, ph.model AS title,
                 TRIM(COALESCE(ph.model,'') || ' ' || COALESCE(ph.color,'') || ' ' || COALESCE(ph.storage,'') || ' ' || COALESCE(ph.ram,'') || ' ' || COALESCE(ph.condition,'') || ' ' || COALESCE(ph.status,'') || ' ' || COALESCE(ph.notes,'') || ' ' || COALESCE(s.partnerName,'')) AS content,
                 TRIM(COALESCE(ph.imei,'') || ' ' || COALESCE(ph.sellerName,'') || ' ' || COALESCE(ph.buyerName,'')) AS extra
          FROM phones ph
          LEFT JOIN partners s ON s.id = ph.supplierId
          WHERE COALESCE(ph.model,'') LIKE ? OR LOWER(COALESCE(ph.model,'')) LIKE ? OR COALESCE(ph.imei,'') LIKE ? OR COALESCE(ph.color,'') LIKE ? OR COALESCE(ph.storage,'') LIKE ? OR COALESCE(ph.ram,'') LIKE ? OR COALESCE(ph.notes,'') LIKE ? OR COALESCE(s.partnerName,'') LIKE ?
          LIMIT ?`,
          [
            rawLike,
            lowerLike,
            rawLike,
            like,
            like,
            like,
            like,
            like,
            remaining,
          ],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'service' AS domain, id AS entityId, name AS title, COALESCE(description,'') AS content, CAST(COALESCE(price,0) AS TEXT) AS extra
          FROM services
          WHERE COALESCE(name,'') LIKE ? OR COALESCE(description,'') LIKE ?
          LIMIT ?`,
          [like, like, remaining],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'invoice' AS domain, i.id AS entityId, TRIM(COALESCE(i.invoiceNumber,'') || ' فاکتور #' || i.id) AS title,
                 TRIM(COALESCE(c.fullName,'') || ' ' || COALESCE(i.notes,'') || ' ' || COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = i.id),'')) AS content,
                 COALESCE(i.invoiceNumber,'') AS extra
          FROM invoices i LEFT JOIN customers c ON c.id = i.customerId
          WHERE COALESCE(i.invoiceNumber,'') LIKE ? OR COALESCE(i.notes,'') LIKE ? OR COALESCE(c.fullName,'') LIKE ? OR COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = i.id),'') LIKE ?
          LIMIT ?`,
          [rawLike, like, like, like, Math.max(remaining, 8)],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'invoice' AS domain, so.id AS entityId, TRIM('فاکتور فروش #' || so.id) AS title,
                 TRIM(COALESCE(c.fullName,'') || ' ' || COALESCE(so.notes,'') || ' ' || COALESCE(so.paymentMethod,'') || ' ' || COALESCE(so.transactionDate,'') || ' ' || COALESCE((SELECT group_concat(description, ' • ') FROM sales_order_items WHERE orderId = so.id),'')) AS content,
                 TRIM(CAST(so.id AS TEXT) || ' ' || COALESCE(so.notes,'')) AS extra
          FROM sales_orders so LEFT JOIN customers c ON c.id = so.customerId
          WHERE CAST(so.id AS TEXT) LIKE ? OR COALESCE(so.notes,'') LIKE ? OR COALESCE(so.notes,'') LIKE ? OR COALESCE(c.fullName,'') LIKE ? OR COALESCE(c.fullName,'') LIKE ? OR COALESCE((SELECT group_concat(description, ' • ') FROM sales_order_items WHERE orderId = so.id),'') LIKE ? OR COALESCE((SELECT group_concat(description, ' • ') FROM sales_order_items WHERE orderId = so.id),'') LIKE ?
          LIMIT ?`,
          [
            rawLike,
            like,
            rawLike,
            like,
            rawLike,
            like,
            rawLike,
            Math.max(remaining, 8),
          ],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'repair' AS domain, r.id AS entityId, TRIM('تعمیر #' || r.id || ' ' || COALESCE(r.deviceModel,'')) AS title,
                 TRIM(COALESCE(c.fullName,'') || ' ' || COALESCE(r.problemDescription,'') || ' ' || COALESCE(r.technicianNotes,'')) AS content,
                 COALESCE(r.serialNumber,'') AS extra
          FROM repairs r LEFT JOIN customers c ON c.id = r.customerId
          WHERE COALESCE(r.deviceModel,'') LIKE ? OR COALESCE(r.problemDescription,'') LIKE ? OR COALESCE(r.technicianNotes,'') LIKE ? OR COALESCE(r.serialNumber,'') LIKE ? OR COALESCE(c.fullName,'') LIKE ?
          LIMIT ?`,
          [like, like, like, like, like, remaining],
        ).catch(() => []),
        allAsync(
          `
          SELECT 'installment' AS domain, ins.id AS entityId, TRIM('فروش اقساطی #' || ins.id || ' ' || COALESCE(c.fullName,'')) AS title,
                 TRIM(COALESCE(ins.itemsSummary,'') || ' ' || COALESCE(ins.notes,'') || ' ' || COALESCE((SELECT imei FROM phones WHERE id = ins.phoneId),'')) AS content,
                 COALESCE((SELECT imei FROM phones WHERE id = ins.phoneId),'') AS extra
          FROM installment_sales ins LEFT JOIN customers c ON c.id = ins.customerId
          WHERE COALESCE(c.fullName,'') LIKE ? OR COALESCE(ins.itemsSummary,'') LIKE ? OR COALESCE(ins.notes,'') LIKE ? OR COALESCE((SELECT imei FROM phones WHERE id = ins.phoneId),'') LIKE ?
          LIMIT ?`,
          [like, like, like, like, remaining],
        ).catch(() => []),
      ];
      const supplementalGroups = await Promise.all(supplementalTasks);
      for (const group of supplementalGroups) {
        addSupplementalRows(group as any[]);
      }
    }

    rows.forEach((r: any) => {
      r.titleHL = sanitizeFtsHighlight(r.titleHL || "");
      r.snippet = sanitizeFtsHighlight(r.snippet || "");
    });

    // گروه‌بندی id ها برای گرفتن دیتای خلاصه هر دامنه
    const ids = {
      product: [] as number[],
      phone: [] as number[],
      customer: [] as number[],
      partner: [] as number[],
      service: [] as number[],
      invoice: [] as number[],
      repair: [] as number[],
      installment: [] as number[],
    };
    rows.forEach((r: any) => {
      if (ids[r.domain as keyof typeof ids])
        ids[r.domain as keyof typeof ids].push(r.entityId);
    });
    const inClause = (arr: number[]) => arr.map(() => "?").join(",");
    const [
      prodRows,
      phoneRows,
      custRows,
      partnerRows,
      servRows,
      invRows,
      repRows,
      insRows,
    ] = await Promise.all([
      ids.product.length
        ? allAsync(
            `SELECT id, name, sellingPrice FROM products WHERE id IN (${inClause(ids.product)})`,
            ids.product,
          )
        : Promise.resolve([]),
      ids.phone.length
        ? allAsync(
            `SELECT id, model, storage, ram, color, imei, status, salePrice FROM phones WHERE id IN (${inClause(ids.phone)})`,
            ids.phone,
          )
        : Promise.resolve([]),
      ids.customer.length
        ? allAsync(
            `SELECT id, fullName, phoneNumber FROM customers WHERE id IN (${inClause(ids.customer)})`,
            ids.customer,
          )
        : Promise.resolve([]),
      ids.partner.length
        ? allAsync(
            `SELECT id, partnerName, partnerType, phoneNumber FROM partners WHERE id IN (${inClause(ids.partner)})`,
            ids.partner,
          )
        : Promise.resolve([]),
      ids.service.length
        ? allAsync(
            `SELECT id, name, price FROM services WHERE id IN (${inClause(ids.service)})`,
            ids.service,
          )
        : Promise.resolve([]),
      ids.invoice.length
        ? allAsync(
            `SELECT i.id, i.invoiceNumber, i.date, i.grandTotal, i.customerId, c.fullName AS customerName
	         FROM invoices i LEFT JOIN customers c ON c.id = i.customerId
	         WHERE i.id IN (${inClause(ids.invoice)})
	         UNION ALL
	         SELECT so.id, ('فروش-' || so.id) AS invoiceNumber, so.transactionDate AS date, so.grandTotal, so.customerId, c.fullName AS customerName
	         FROM sales_orders so LEFT JOIN customers c ON c.id = so.customerId
	         WHERE so.id IN (${inClause(ids.invoice)})`,
            [...ids.invoice, ...ids.invoice],
          )
        : Promise.resolve([]),
      ids.repair.length
        ? allAsync(
            `SELECT r.id, r.deviceModel, r.status, r.dateReceived, r.dateCompleted, r.estimatedCost, r.finalCost, r.customerId, c.fullName AS customerName
	         FROM repairs r LEFT JOIN customers c ON c.id = r.customerId
	         WHERE r.id IN (${inClause(ids.repair)})`,
            ids.repair,
          )
        : Promise.resolve([]),
      ids.installment.length
        ? allAsync(
            `SELECT ins.id, ins.actualSalePrice, ins.downPayment, ins.numberOfInstallments, ins.installmentAmount, ins.installmentsStartDate, ins.saleType, ins.dateCreated,
	                ins.customerId, c.fullName AS customerName
	         FROM installment_sales ins LEFT JOIN customers c ON c.id = ins.customerId
	         WHERE ins.id IN (${inClause(ids.installment)})`,
            ids.installment,
          )
        : Promise.resolve([]),
    ]);
    const byId = (arr: any[], key = "id") =>
      Object.fromEntries(arr.map((x: any) => [x[key], x]));
    const pMap = byId(prodRows);
    const phMap = byId(phoneRows);
    const cMap = byId(custRows);
    const partnerMap = byId(partnerRows);
    const sMap = byId(servRows);
    const iMap = byId(invRows);
    const rMap = byId(repRows);
    const insMap = byId(insRows);
    const items = rows
      .map((r: any) => {
        const base = {
          id: r.entityId,
          domain: r.domain,
          ftsScore: r.score,
          score: r.score,
          titleHL: r.titleHL,
          snippet: r.snippet,
        };
        let item: any;
        switch (r.domain) {
          case "product": {
            const d = pMap[r.entityId] || {};
            item = {
              ...base,
              title: d.name,
              subtitle:
                d.sellingPrice != null
                  ? `قیمت فروش: ${Number(d.sellingPrice).toLocaleString("fa-IR")} تومان`
                  : undefined,
            };
            break;
          }
          case "phone": {
            const d = phMap[r.entityId] || {};
            const sub = [d.color, d.storage, d.ram, d.status]
              .filter(Boolean)
              .join(" • ");
            item = {
              ...base,
              title: d.model,
              subtitle: `IMEI: ${d.imei}` + (sub ? ` | ${sub}` : ""),
              price: d.salePrice,
            };
            break;
          }
          case "customer": {
            const d = cMap[r.entityId] || {};
            item = { ...base, title: d.fullName, subtitle: d.phoneNumber };
            break;
          }
          case "partner": {
            const d = partnerMap[r.entityId] || {};
            const sub = [d.partnerType, d.phoneNumber]
              .filter(Boolean)
              .join(" • ");
            item = { ...base, title: d.partnerName, subtitle: sub };
            break;
          }
          case "service": {
            const d = sMap[r.entityId] || {};
            item = {
              ...base,
              title: d.name,
              subtitle:
                d.price != null
                  ? `${Number(d.price).toLocaleString("fa-IR")} تومان`
                  : undefined,
            };
            break;
          }
          case "invoice": {
            const d = iMap[r.entityId] || {};
            const dt = d.date ? String(d.date).slice(0, 10) : "";
            const sub = [
              d.customerName,
              dt && `تاریخ: ${dt}`,
              d.grandTotal != null && `جمع: ${faNum(d.grandTotal)} تومان`,
            ]
              .filter(Boolean)
              .join(" • ");
            item = {
              ...base,
              title: d.invoiceNumber
                ? `فاکتور ${d.invoiceNumber}`
                : `خرید #${d.id}`,
              subtitle: sub,
            };
            break;
          }
          case "repair": {
            const d = rMap[r.entityId] || {};
            const sub = [
              d.customerName,
              d.deviceModel,
              d.status && `وضعیت: ${d.status}`,
            ]
              .filter(Boolean)
              .join(" • ");
            item = { ...base, title: `تعمیر #${d.id}`, subtitle: sub };
            break;
          }
          case "installment": {
            const d = insMap[r.entityId] || {};
            const sub = [
              d.customerName,
              d.actualSalePrice != null &&
                `مبلغ: ${faNum(d.actualSalePrice)} تومان`,
              d.saleType && `نوع: ${d.saleType}`,
            ]
              .filter(Boolean)
              .join(" • ");
            item = { ...base, title: `اقساط #${d.id}`, subtitle: sub };
            break;
          }
          default:
            item = base;
            break;
        }
        const rankMeta = buildSearchRankMeta({
          domain: item.domain,
          rawQuery: rawQ,
          title: item.title || item.titleHL,
          subtitle: item.subtitle,
          snippet: item.snippet,
          ftsScore: item.ftsScore,
        });
        return {
          ...item,
          score: rankMeta.rankScore,
          rankScore: rankMeta.rankScore,
          matchSource: rankMeta.matchSource,
          matchReason: rankMeta.matchReason,
        };
      })
      .sort(
        (a: any, b: any) =>
          Number(b.rankScore || b.score || 0) -
          Number(a.rankScore || a.score || 0),
      );
    res.json({ items: items.slice(0, limit) });
  } catch (e) {
    next(e);
  }
});
};
