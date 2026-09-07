import type { Express, Response } from 'express';
import bwipjs from 'bwip-js';
import { allAsync, getAsync, getDbInstance } from '../database';

export const registerBarcodeRoutes = (app: Express): void => {
// =====================================================
// 3) مسیرهای عمومی (بدون احراز هویت): Login + Barcode
// =====================================================
// بارکد محصول
app.get("/api/barcode/product/:id", async (req, res) => {
  try {
    const product = await getAsync("SELECT id FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (!product) return res.status(404).send("Product not found");
    const text = `product-${product.id}`;
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text,
        scale: 3,
        height: 10,
        includetext: false,
        textxalign: "center",
      },
      (err, png) =>
        err
          ? res.status(500).send("Error generating barcode")
          : (res.writeHead(200, { "Content-Type": "image/png" }), res.end(png)),
    );
  } catch {
    res.status(500).send("Server error");
  }
});
// بارکد گوشی
app.get("/api/barcode/phone/:id", async (req, res) => {
  try {
    const phone = await getAsync("SELECT id FROM phones WHERE id = ?", [
      req.params.id,
    ]);
    if (!phone) return res.status(404).send("Phone not found");
    const text = `phone-${phone.id}`;
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text,
        scale: 3,
        height: 10,
        includetext: false,
        textxalign: "center",
      },
      (err, png) =>
        err
          ? res.status(500).send("Error generating barcode")
          : (res.writeHead(200, { "Content-Type": "image/png" }), res.end(png)),
    );
  } catch {
    res.status(500).send("Server error");
  }
});
// =====================================================
// [جدید] مسیر دریافت اطلاعات برای چاپ گروهی لیبل‌ها
// =====================================================
app.post("/api/labels/data", async (req, res, next) => {
  try {
    const db = await getDbInstance();
    if (!db) {
      return next(new Error("DB connection failed"));
    }
    // ۱. خواندن لیست ID ها از body درخواست
    const { ids } = req.body;
    console.log("[Server] Received request for label data with IDs:", ids); // لاگ برای اشکال‌زدایی
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log("[Server] Error: No IDs provided in request body.");
      return res
        .status(400)
        .json({ success: false, message: "No IDs provided" });
    }
    // ۲. آماده‌سازی کوئری برای جلوگیری از SQL Injection
    const previews = ids.map(() => "?").join(",");
    // ۳. دریافت اطلاعات محصولات بر اساس ID های دریافتی
    // توجه: نام ستون‌ها (sku, sellingPrice) باید با ساختار جدول products شما مطابقت داشته باشد.
    const items = await allAsync(
      `SELECT id, name, sku, sellingPrice FROM products WHERE id IN (${previews})`,
      ids,
    );

    // ۴. فرمت کردن داده‌ها برای ارسال به فرانت‌اند
    const responseData = items.map((item) => ({
      id: item.id,
      name: item.name || "محصول بدون نام",
      price: item.sellingPrice || 0,
      code: item.sku || `product-${item.id}`, // استفاده از SKU یا ID به عنوان کد بارکد
      quantity: 1, // مقدار پیش‌فرض تعداد برای هر برچسب
    }));
    console.log(
      `[Server] Found ${responseData.length} items. Sending data to client.`,
    );
    res.json({ success: true, data: responseData });
  } catch (e) {
    console.error("[Server] Error in /api/labels/data endpoint:", e);
    next(e);
  }
});
const barcodeCache = new Map<string, Buffer>();
function cacheKey(text: string, q: any) {
  const scale = Number(q.scale ?? 3);
  const height = Number(q.height ?? 12);
  const human = String(q.human ?? "1");
  return `${text}|${scale}|${height}|${human}`;
}
async function sendCode128Cached(res: Response, text: string, q: any = {}) {
  const key = cacheKey(text, q);
  const cached = barcodeCache.get(key);
  if (cached) {
    res.type("png").send(cached);
    return;
  }
  const scale = Math.max(1, Math.min(8, Number(q.scale ?? 3)));
  const height = Math.max(8, Math.min(30, Number(q.height ?? 12)));
  const human = !["0", "false", "no"].includes(
    String(q.human ?? "1").toLowerCase(),
  );
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale,
    height,
    includetext: human,
    textxalign: "center",
  });
  barcodeCache.set(key, png);
  res.type("png").send(png);
}

};
