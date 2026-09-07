/**
 * Opens a clean Print/PDF window for report pages.
 *
 * - Works in Vite/React
 * - Copies both <link rel="stylesheet"> and <style> tags (Vite injects Tailwind as <style> in dev)
 * - Supports two modes:
 *   - print: normal printing
 *   - pdf: A4-friendly layout for "Save as PDF"
 */
export function openReportPrintWindow(opts?: {
  title?: string;
  selector?: string;
  element?: HTMLElement;
  rtl?: boolean;
  mode?: 'print' | 'pdf';
}) {
  const title = opts?.title ?? document.title ?? 'Report';
  const selector = opts?.selector ?? '#report-print-root';
  const mode = opts?.mode ?? 'print';

  const el = (opts?.element ?? (document.querySelector(selector) as HTMLElement | null)) as HTMLElement | null;
  const source = el ?? (document.body as HTMLElement);

  // IMPORTANT:
  // Many charts are rendered as <canvas>. When we move HTML to a new window,
  // the canvas bitmap does NOT transfer (result: blank charts → "white" print/PDF).
  // Fix: clone DOM and replace canvases with <img src="data:image/...">.
  const cloned = (source?.cloneNode(true) as HTMLElement | null) ?? null;
  if (cloned) {
    const srcCanvases = Array.from(source.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const dstCanvases = Array.from(cloned.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const n = Math.min(srcCanvases.length, dstCanvases.length);
    for (let i = 0; i < n; i++) {
      const sc = srcCanvases[i];
      const dc = dstCanvases[i];
      try {
        const dataUrl = sc.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;

        // Keep sizing consistent
        const w = sc.getAttribute('width') || String(sc.width || '');
        const h = sc.getAttribute('height') || String(sc.height || '');
        if (w) img.setAttribute('width', w);
        if (h) img.setAttribute('height', h);
        img.style.maxWidth = '100%';
        img.style.height = 'auto';

        // If canvas had inline styles, keep them on the image
        const prevStyle = dc.getAttribute('style') || '';
        img.setAttribute('style', `${prevStyle};max-width:100%;height:auto;`);

        dc.replaceWith(img);
      } catch {
        // If toDataURL fails (tainted canvas), keep the canvas.
      }
    }
  }

  const html = (cloned ?? source)?.outerHTML ?? '<div />';

  // پنجره جدید را بدون گزینه‌های noopener/noreferrer باز می‌کنیم تا دسترسی کامل برای document.write داشته باشیم
  const w = window.open('', '_blank');
  if (!w) {
    // Popup blocked; fallback to regular print.
    window.print();
    return;
  }

  // Bring over stylesheets (Tailwind/custom CSS) AND inline <style> tags.
  // In Vite dev, Tailwind is usually injected as <style>, not a <link>.
  const links = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
    .map((l) => (l as HTMLLinkElement).outerHTML)
    .join('\n');

  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((s) => (s as HTMLStyleElement).outerHTML)
    .join('\n');

  // Inline style: ensure typography/tables look good and never become "white on white".
  const baseStyle = `
    <style>
      :root { color-scheme: light; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body {
        font-family: Vazir, Tahoma, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        color: #111;
      }
      body[dir="rtl"], [dir="rtl"] body { direction: rtl; }

      .print-wrap { padding: 14px; }

      /* Force readable text even if app styles set low opacity */
      .print-wrap * { color: #111 !important; opacity: 1 !important; }

      /* tables */
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid rgba(0,0,0,.14); padding: 8px; font-size: 12px; }
      th { background: rgba(0,0,0,.05); font-weight: 800; }

      /* hide UI-only elements */
      .no-print, [data-no-print="true"], button, .print\\:hidden { display: none !important; }

      @page { size: ${mode === 'pdf' ? 'A4 portrait' : 'auto'}; margin: 10mm; }

      /* A4 tweaks */
      ${mode === 'pdf' ? `
        .print-wrap { padding: 10mm; }
        h1,h2,h3 { page-break-after: avoid; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
      ` : ''}
    </style>
  `;

  w.document.open();
  const dir = opts?.rtl ? 'rtl' : (document.documentElement.getAttribute('dir') ?? 'rtl');
  w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${links}
    ${inlineStyles}
    ${baseStyle}
  </head>
  <body dir="${dir}">
    <div class="print-wrap">${html}</div>
    <script>
      window.onload = () => {
        try { window.focus(); } catch (e) {}
        setTimeout(() => { window.print(); }, 150);
      };
    </script>
  </body>
</html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
