export type TabularExport = {
  meta: Array<[string, string]>;
  headers: string[];
  rows: Array<Array<string>>;
};

const safeText = (s: any) => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * استخراج خروجی جدولیِ گزارش‌ها (همان منطقی که برای Excel استفاده می‌شود).
 * هدف: یک خروجی «پایدار» برای چاپ/PDF بدون درگیر شدن با Canvas/Chart/CSS.
 */
export function extractReportTabular(opts: { title: string; element: HTMLElement }): TabularExport {
  const { element } = opts;

  // Meta (date range / generated at)
  // HashRouter: پارامترها معمولاً داخل location.hash هستند نه location.search
  const hash = window.location.hash || '';
  const hashQuery = (() => {
    const q = hash.includes('?') ? hash.split('?')[1] : '';
    return q || '';
  })();
  const sp = new URLSearchParams(hashQuery || window.location.search || '');
  let fromJ = sp.get('fromDate') || sp.get('from') || sp.get('fromJ') || '';
  let toJ = sp.get('toDate') || sp.get('to') || sp.get('toJ') || '';

  // اگر پارامترهای URL موجود نبود، از ورودی‌های تاریخ داخل خود صفحه (DatePicker) حدس می‌زنیم
  if (!fromJ || !toJ) {
    // بعضی گزارش‌ها DatePicker را در هدر (خارج از report-print-root) دارند
    const fromInput = (element.querySelector(
      'input[preview*="از"], input[aria-label*="از"], input[name*="from"], input[id*="from"]'
    ) as HTMLInputElement | null) ||
      (document.querySelector(
        'input[preview*="از"], input[aria-label*="از"], input[name*="from"], input[id*="from"]'
      ) as HTMLInputElement | null);

    const toInput = (element.querySelector(
      'input[preview*="تا"], input[aria-label*="تا"], input[name*="to"], input[id*="to"]'
    ) as HTMLInputElement | null) ||
      (document.querySelector(
        'input[preview*="تا"], input[aria-label*="تا"], input[name*="to"], input[id*="to"]'
      ) as HTMLInputElement | null);
    const fv = (fromInput?.value || '').trim();
    const tv = (toInput?.value || '').trim();
    if (!fromJ && fv) fromJ = fv;
    if (!toJ && tv) toJ = tv;
  }

  // اگر جابه‌جا شده بودند (برای تاریخ‌های شمسی به فرم YYYY/MM/DD)، swap کن
  // نکته: ممکن است اعداد فارسی/عربی باشند؛ برای مقایسه، اول به اعداد لاتین نرمال می‌کنیم.
  const toEnDigits = (s: string) =>
    s
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const fromCmp = fromJ ? toEnDigits(fromJ) : '';
  const toCmp = toJ ? toEnDigits(toJ) : '';

  // (مقایسه رشته‌ای برای فرمت YYYY/MM/DD جواب می‌دهد)
  if (fromJ && toJ && fromCmp && toCmp && fromCmp > toCmp) {
    const tmp = fromJ;
    fromJ = toJ;
    toJ = tmp;
  }

  const meta: Array<[string, string]> = [];
  if (fromJ || toJ) {
    meta.push(['از', fromJ || '—']);
    meta.push(['تا', toJ || '—']);
  }
  meta.push(['تاریخ خروجی', new Date().toLocaleString('fa-IR')]);

  // Prefer largest table in the report
  const tables = Array.from(element.querySelectorAll('table')) as HTMLTableElement[];
  const table = tables
    .map((t) => ({
      t,
      score: (t.tBodies?.[0]?.rows?.length || 0) * (t.rows?.[0]?.cells?.length || 1),
    }))
    .sort((a, b) => b.score - a.score)[0]?.t;

  if (table) {
    const allRows = Array.from(table.rows);
    const headerCells = allRows[0] ? Array.from(allRows[0].cells) : [];
    const headers = headerCells.map((c) => safeText((c as any).innerText));
    const bodyRows = allRows.slice(1).map((r) => Array.from(r.cells).map((c) => safeText((c as any).innerText)));
    return { meta, headers, rows: bodyRows };
  }

  // Fallback: KPI/text based sheet
  const cleaned = element.cloneNode(true) as HTMLElement;
  cleaned
    .querySelectorAll(
      'button, nav, header, footer, aside, [role="button"], [role="menu"], [role="menuitem"], [data-export-exclude], .report-action-btn, .no-export, [aria-hidden="true"], .no-print, .print-hidden'
    )
    .forEach((n) => n.remove());
  cleaned.querySelectorAll('script, style, svg, img, canvas, video, audio, noscript').forEach((n) => n.remove());

  const isValue = (s: string) => /[0-9۰-۹]/.test(s) || /(تومان|ریال|٪|%)/.test(s);
  const isJunkLine = (s: string) =>
    /^(:root|root)\s*\{/.test(s) ||
    /--[a-zA-Z0-9_-]+\s*:\s*/.test(s) ||
    /\b(hsl|rgb)a?\(/i.test(s) ||
    /\bbrand\b/i.test(s);

  // 1) label/value pairs
  const pairRows: Array<[string, string]> = [];
  const seen = new Set<string>();
  const candidates = Array.from(cleaned.querySelectorAll('div, li, p, section, article')) as HTMLElement[];
  for (const node of candidates) {
    const full = safeText((node as any).innerText);
    if (!full || full.length > 220) continue;
    if (isJunkLine(full)) continue;
    const kids = Array.from(node.children) as HTMLElement[];
    if (kids.length < 2 || kids.length > 4) continue;
    const texts = kids.map((k) => safeText((k as any).innerText)).filter(Boolean);
    if (texts.length < 2) continue;
    let bestLabel = '';
    let bestValue = '';
    for (const a of texts) {
      for (const b of texts) {
        if (a === b) continue;
        if (!isValue(a) && isValue(b)) {
          bestLabel = a;
          bestValue = b;
        }
      }
    }
    if (!bestLabel || !bestValue) continue;
    const key = `${bestLabel}||${bestValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairRows.push([bestLabel, bestValue]);
  }
  if (pairRows.length >= 5) {
    return { meta, headers: ['عنوان', 'مقدار'], rows: pairRows.map((p) => [p[0], p[1]]) };
  }

  // 2) lines
  const rawText = safeText((cleaned as any).innerText);
  let lines = rawText
    .split(/\n+/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !isJunkLine(x))
    .slice(0, 1200);

  if (lines.length <= 2 && rawText.length > 140) {
    lines = rawText
      .split(/[\n\r]+|\s{2,}|[؛•\u2022]+/g)
      .flatMap((chunk) => chunk.split(/[،]+/g))
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => !isJunkLine(x))
      .slice(0, 1200);
  }

  const rows: Array<Array<string>> = [];
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (b && !isValue(a) && isValue(b)) {
      rows.push([a, b]);
      i++;
      continue;
    }
    const c = lines[i + 2];
    if (b && c && !isValue(a) && /^(تومان|ریال)$/.test(b) && isValue(c)) {
      rows.push([a, `${c} ${b}`]);
      i += 2;
      continue;
    }
    rows.push([a, '']);
  }

  return { meta, headers: ['عنوان', 'مقدار'], rows };
}
