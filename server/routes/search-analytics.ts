// server/routes/search-analytics.ts
import { Router } from 'express';
const r = Router();

r.post('/api/search/log', express.json(), async (req, res) => {
  const { query, normalized, zero, clicked, ts } = req.body || {};
  // TODO: اعتبارسنجی و محدودسازی
  // پیش‌نمایش: درج در SQLite/JSON
  // await db.insert('search_logs', { query, normalized, zero, clicked, ts: Date.now() })
  res.json({ ok: true });
});

export default r;
