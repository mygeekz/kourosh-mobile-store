/* چاپ بارکد در پنجره‌ی مجزا (ایزوله از CSS اپ) */
export type PrintBarcodeOptions = {
  text: string;                     // مقداری که باید بارکد شود (IMEI/SKU/…)
  title?: string;                   // عنوان (مثلاً مدل گوشی)
  price?: number | string;          // قیمت اختیاری
  paper?: 'A4' | '58mm' | 'auto';   // عرض صفحه‌ی چاپ
  scale?: number;                   // scale بارکد (۲ تا ۴)
  height?: number;                  // ارتفاع بارکد (۸ تا ۱۸)
  showHumanText?: boolean;          // نمایش متن زیر بارکد
};

function getAuthHeaders(): Record<string,string> {
  const cand = ([
    localStorage.getItem('authToken'),
    localStorage.getItem('token'),
    sessionStorage.getItem('authToken'),
    sessionStorage.getItem('token'),
  ].find(Boolean)) as string | null;
  const h: Record<string,string> = {};
  if (cand) {
    h['Authorization'] = cand.startsWith('Bearer ') ? cand : 'Bearer ' + cand;
    h['X-Auth-Token'] = cand;
  }
  return h;
}

function formatPrice(p: any) {
  const n = (p==null ? null : Number(p));
  if (n==null || !isFinite(n)) return '';
  try { return n.toLocaleString('fa-IR') + ' تومان'; } catch { return String(n); }
}

async function fetchAsDataURL(url: string, withAuth=true): Promise<string|null> {
  try {
    const res = await fetch(url, {
      headers: withAuth ? getAuthHeaders() : undefined,
      credentials: 'include',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// کمک‌تابع: آدرس را مطلق کن تا در about:blank هم درست لود شود
function absUrl(u: string) {
  if (!u) return u;
  if (u.startsWith('data:')) return u;
  try { return new URL(u, window.location.origin).href; } catch { return u; }
}

export async function printBarcode(opts: PrintBarcodeOptions) {
  const text = String(opts.text || '').trim();
  if (!text) { console.error('printBarcode: empty text'); return; }

  const scale  = Math.max(2, Math.min(4, Number(opts.scale ?? 3)));
  const height = Math.max(8, Math.min(18, Number(opts.height ?? 12)));
  const paper  = opts.paper ?? 'auto';
  const showHumanText = opts.showHumanText ?? true;

  const srcUrl = `/api/barcode/code128?text=${encodeURIComponent(text)}&scale=${scale}&height=${height}`;

  // PNG را به DataURL تبدیل می‌کنیم تا مستقل از احراز/کراس‌اوریجین چاپ شود
  let dataUrl = await fetchAsDataURL(srcUrl, true);
  if (!dataUrl) dataUrl = await fetchAsDataURL(srcUrl, false);
  const imgSrc = absUrl(dataUrl || srcUrl);

  const w = window.open('', '_blank', 'width=520,height=740');
  if (!w) { alert('Pop-up blocked! لطفاً اجازه‌ی باز شدن پنجره را بدهید.'); return; }

  const title = (opts.title || '').toString();
  const price = formatPrice(opts.price);

  const cssPaper = (paper === '58mm')
    ? `
      @page { size: 58mm auto; margin: 0; }
      html, body { width: 58mm; margin: 0; padding: 0; }
      .wrap { width: 58mm; padding: 2mm 2mm 0; box-sizing: border-box; }
      .name { font-size: 12px; text-align: center; margin: 1mm 0 0.5mm; }
      .meta { font-size: 10px; text-align: center; opacity: .8; }
      .price { font-size: 11px; text-align: center; margin: 1mm 0; }
      .code { font-size: 9px; text-align: center; margin-top: 0.5mm; direction:ltr }
      img.bar { display:block; width:100%; max-height:14mm; object-fit:contain; image-rendering:pixelated; }
    `
    : `
      @page { size: A4; margin: 10mm; }
      html, body { margin: 0; padding: 0; }
      .wrap { width: 80mm; margin: 0 auto; }
      .name { font-size: 14px; text-align: center; margin: 4mm 0 2mm; }
      .meta { font-size: 12px; text-align: center; opacity: .85; }
      .price { font-size: 13px; text-align: center; margin: 2mm 0; }
      .code { font-size: 11px; text-align: center; margin-top: 1mm; direction:ltr }
      img.bar { display:block; width:100%; max-height:18mm; object-fit:contain; image-rendering:pixelated; }
    `;

  const html = `<!doctype html>
  <html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>چاپ بارکد</title>
    <base href="${window.location.origin}/">
    <style>
      *{box-sizing:border-box}
      body{font-family: Vazir, Tahoma, sans-serif; color:#111; background:#fff;}
      ${cssPaper}
      @media print { .noprint { display:none } }
    </style>
  </head>
  <body>
    <div class="wrap">
      ${title ? '<div class="name">'+title.replace(/[<>]/g,'')+'</div>' : ''}
      <img id="barcode" class="bar" alt="${text}" src="${imgSrc}">
      ${showHumanText ? '<div class="code">'+text.replace(/[<>]/g,'')+'</div>' : ''}
      ${price ? '<div class="price">'+price+'</div>' : ''}
      <div class="noprint" style="text-align:center;margin-top:8mm">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>
    </div>
    <script>
      (function(){
        function go(){ try{ window.focus(); window.print(); }catch(e){} }
        var img = document.getElementById('barcode');
        if (!img) { go(); return; }
        if ((img as any).complete) { setTimeout(go, 50); }
        else { img.addEventListener('load', function(){ setTimeout(go, 50); }); }
        // بیمه: اگر به هر دلیل لود نشد، بعد 1.5 ثانیه تلاش کن
        setTimeout(function(){ if(!(img as any).complete) go(); }, 1500);
      })();
    </script>
  </body>
  </html>`;

  w.document.open(); w.document.write(html); w.document.close();
  try { w.focus(); } catch {}
}

// برای استفاده‌ی بدون import:
declare global { interface Window { printBarcode?: (o: PrintBarcodeOptions) => void } }
if (typeof window !== 'undefined') { (window as any).printBarcode = printBarcode; }
