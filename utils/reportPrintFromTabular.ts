import { printArea } from './printArea';
import type { TabularExport } from './reportTabular';

function esc(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * چاپ «پایدار» گزارش بر اساس خروجی Tabular.
 * این روش وابسته به CSS/Chart/DOM پیچیده نیست و عملاً مثل چاپ اکسل عمل می‌کند.
 */
export function printTabularReport(opts: { title: string; tabular: TabularExport }) {
  const { title, tabular } = opts;

  const wrapperId = '__report_tabular_print__';
  const old = document.getElementById(wrapperId);
  if (old) old.remove();

  const metaRows = tabular.meta
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');

  const head = `<tr>${tabular.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const body = tabular.rows
    .map((r) => `<tr>${tabular.headers.map((_, i) => `<td>${esc(r?.[i] ?? '')}</td>`).join('')}</tr>`)
    .join('');

  const html = `
    <div class="tp">
      <div class="tp__title">${esc(title)}</div>
      <table class="tp__meta">${metaRows}</table>
      <table class="tp__table">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;

  const host = document.createElement('div');
  host.id = wrapperId;
  host.style.display = 'none';
  host.innerHTML = html;
  document.body.appendChild(host);

  const extraCss = `
    @page { size: A4; margin: 10mm; }
    *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    html, body { background:#fff; }
    body { direction: rtl; font-family: "Vazir", Tahoma, sans-serif; color:#111; }

    .tp { width: 100%; box-sizing: border-box; }
    .tp__title { font-weight: 900; font-size: 18px; margin: 0 0 8mm; text-align: center; }

    .tp__meta { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
    .tp__meta th, .tp__meta td { border: 1px solid rgba(0,0,0,.18); padding: 6px 8px; font-size: 12px; }
    .tp__meta th { background: rgba(0,0,0,.06); width: 24%; white-space: nowrap; }

    .tp__table { width: 100%; border-collapse: collapse; }
    .tp__table th, .tp__table td { border: 1px solid rgba(0,0,0,.18); padding: 6px 8px; font-size: 12px; }
    .tp__table thead th { background: rgba(0,0,0,.06); font-weight: 900; white-space: nowrap; }
    .tp__table td { text-align: right; white-space: nowrap; }

    @media print {
      /* هیچ چیز از UI گزارش چاپ نشود */
      button, input, select, textarea, .no-print, [data-print-hide="true"] { display:none !important; }
    }
  `;

  printArea(`#${wrapperId}`, { title, extraCss });
  setTimeout(() => {
    try { host.remove(); } catch {}
  }, 8000);
}
