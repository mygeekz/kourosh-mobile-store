// src/utils/printArea.ts — نسخه نهایی: پشتیبانی از targetWindow (پاپ‌آپ) + iframe fallback

type PrintOptions = {
  paper?: 'A4' | '58mm';
  title?: string;
  extraCss?: string;
  /** اگر پاپ‌آپ را همزمان با کلیک باز کردی، همین را بده تا در همان پنجره چاپ کنیم */
  targetWindow?: Window | null;
};

const LABEL_CSS = `
.label-preview-outline { outline: 1px dashed rgba(0,0,0,.15); }
.label-50x30 { width: 50mm; height: 30mm; padding: 2mm 2.2mm; box-sizing: border-box; }
.sheet-a4 { width: 210mm; min-height: 297mm; padding: 5mm; box-sizing: border-box; display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 30mm; gap: 2mm 3mm; }
.roll58 { width: 58mm; padding: 2mm; box-sizing: border-box; }

.label-58 {
  width: 100%;
  padding: 1.5mm;
  box-sizing: border-box;
  page-break-inside: avoid;
}

/* وسط‌چینی تصویر بارکد */
.img-barcode, .label-58 img {
  display: block !important;
  margin-left: auto !important;
  margin-right: auto !important;
  max-height: 14mm;
}

/* چند کلاس دم‌دستی تا بدون Tailwind هم بد دیده نشود */
.text-center { text-align: center; }
.border-b { border-bottom: 1px solid #e5e7eb; }
.mb-3 { margin-bottom: 3mm; }
.pb-2 { padding-bottom: 2mm; }
.text-gray-600 { color: #4b5563; }
.font-semibold { font-weight: 600; }
.text-lg { font-size: 14px; }
`;

function buildHtml(inner: string, title: string, css: string) {
  const base = `${location.origin}/`; // برای resolve شدن /api/barcode/...
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <base href="${base}">
  <title>${title.replace(/[<>]/g, '')}</title>
  <style>${css}</style>
</head>
<body>
  <div id="__print_root">${inner}</div>
  <script>
    (function(){
      function go(){ try{ window.focus(); window.print(); }catch(e){} }
      var imgs = Array.prototype.slice.call(document.images || []);
      if (!imgs.length) { setTimeout(go, 50); return; }
      var left = imgs.length, done=false;
      function tick(){ if(done) return; if(--left<=0){ done=true; setTimeout(go, 50); } }
      imgs.forEach(function(img){
        if (img.complete) { tick(); }
        else {
          img.addEventListener('load', tick, {once:true});
          img.addEventListener('error', tick, {once:true});
        }
      });
      setTimeout(function(){ if(!done){ done=true; go(); } }, 3000); // بیمه
    })();
  <\/script>
</body>
</html>`;
}

export function printArea(selector: string, opt: PrintOptions = {}) {
  const hostNode = document.querySelector(selector) as HTMLElement | null;
  if (!hostNode) { alert('ناحیهٔ چاپ پیدا نشد.'); return; }

  const paper = opt.paper || 'A4';
  const CSS_PAGE = paper === '58mm'
    ? `@page { size: 58mm auto; margin: 0; }`
    : `@page { size: A4; margin: 0; }`;

  const css = `
    ${CSS_PAGE}
    html, body { margin: 0; padding: 0; width: 100%; background: #fff; }
    body { font-family: Vazir, Tahoma, sans-serif; color: #111; }
    #__print_root { text-align: center !important; padding-top: 1mm; }
    ${LABEL_CSS}
    @media print { .no-print { display: none !important; } }
    ${opt.extraCss || ''}
  `;

  // هنگام چاپ، اگر گزارش دارای نمودار canvas باشد، کپی مستقیم HTML باعث می‌شود
  // که محتوای canvas در چاپ سفید شود (canvas داده‌ی خود را به iframe منتقل نمی‌کند).
  // برای جلوگیری از این مشکل، DOM را شبیه‌سازی کرده و همهٔ canvas‌ها را به <img> با dataURL تبدیل می‌کنیم.
  let printSource: HTMLElement = hostNode;
  try {
    // کلون عمیق می‌گیریم تا بتوانیم بدون تغییر DOM اصلی، canvas‌ها را جایگزین کنیم
    const cloned = hostNode.cloneNode(true) as HTMLElement;
    const srcCanvases = Array.from(hostNode.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const dstCanvases = Array.from(cloned.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const n = Math.min(srcCanvases.length, dstCanvases.length);
    for (let i = 0; i < n; i++) {
      const sc = srcCanvases[i];
      const dc = dstCanvases[i];
      try {
        const dataUrl = sc.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        // حفظ سایز و استایل‌ها
        const w = sc.getAttribute('width') || String(sc.width || '');
        const h = sc.getAttribute('height') || String(sc.height || '');
        if (w) img.setAttribute('width', w);
        if (h) img.setAttribute('height', h);
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        const prevStyle = dc.getAttribute('style') || '';
        img.setAttribute('style', `${prevStyle};max-width:100%;height:auto;`);
        dc.replaceWith(img);
      } catch {
        // اگر به هر دلیل تبدیل عملیات ناعملیات با موفقیت انجام شد بود بود، همان canvas را نگه می‌داریم
      }
    }
    printSource = cloned;
  } catch (e) {
    // اگر cloning مشکلی داشت، از DOM اصلی استفاده می‌کنیم
    console.warn('printArea: خطا در کلون کردن DOM برای تبدیل canvas:', e);
  }

  const html = buildHtml(printSource.innerHTML, opt.title ?? 'Print', css);

  // اگر پنجره هدف داده شده بود، همان را استفاده کن
  if (opt.targetWindow) {
    try {
      const w = opt.targetWindow;
      w.document.open();
      w.document.write(html);
      w.document.close();
      // پاکسازی بعد از چاپ
      w.onafterprint = () => { try { w.close(); } catch {} };
      return;
    } catch (e) {
      console.warn('printArea(targetWindow): نوشتن در پنجره هدف عملیات ناعملیات با موفقیت انجام شد بود بود. روی iframe می‌افتم.', e);
    }
  }

  // حالت پیش‌فرض: iframe مخفی
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  // srcdoc پایدارتر از document.write
  iframe.srcdoc = html;

  const clean = () => { setTimeout(() => { try { iframe.remove(); } catch {} }, 300); };
  const iw = iframe.contentWindow;
  if (iw) iw.onafterprint = clean;
  setTimeout(clean, 8000);
}

// برای دسترسی مستقیم از کنسول
;(window as any).printArea = printArea;
