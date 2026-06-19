import React, { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { ReportsExportsProvider } from '../contexts/ReportsExportsContext';

// یک لایه سبک مخصوص چاپ/PDF (بدون MainLayout)
const PrintLayout: React.FC = () => {
  const [sp] = useSearchParams();

  // در گزارش‌ها دیتای صفحه معمولاً async لود می‌شود.
  // اگر خیلی زود window.print() بزنیم، Chrome یک snapshot سفید می‌گیرد و همان را preview می‌کند.
  // این helper صبر می‌کند تا محتوای واقعی داخل #report-print-root ظاهر شود.
  const waitForReportReady = async (timeoutMs = 12000) => {
    const start = Date.now();
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (Date.now() - start < timeoutMs) {
      const root = document.getElementById('report-print-root') as HTMLElement | null;
      if (root) {
        const text = (root.innerText || '').replace(/\s+/g, ' ').trim();
        const hasLoadingText = /بارگذاری|در حال|loading|please wait/i.test(text);
        const rowCount = root.querySelectorAll('table tbody tr').length;
        const hasMeaningfulDom = root.querySelectorAll('*').length > 10;

        // اگر جدول دارد یا متن کافی دارد و پیام loading دیده نمی‌شود، آماده است.
        if (!hasLoadingText && (rowCount > 0 || text.length > 60) && hasMeaningfulDom) {
          // دو فریم صبر کن تا layout نهایی شود
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return;
        }
      }
      await sleep(250);
    }
  };

  useEffect(() => {
    // auto-print در تب جدید
    const modeFromQuery = sp.get('mode');
    const modeFromStorage = (() => {
      try {
        return sessionStorage.getItem('KOUROSH_PRINT_MODE');
      } catch {
        return null;
      }
    })();

    const mode = (modeFromQuery || modeFromStorage || 'pdf') as 'pdf' | 'print';
    try {
      sessionStorage.removeItem('KOUROSH_PRINT_MODE');
    } catch {
      // ignore
    }

    let cancelled = false;

    (async () => {
      // صبر برای فونت‌ها
      try {
        // @ts-ignore
        await document.fonts?.ready;
      } catch {}

      // صبر برای لود شدن دیتای گزارش
      await waitForReportReady(12000);
      if (cancelled) return;

      window.focus();
      window.print();
    })();

    return () => {
      cancelled = true;
    };
  }, [sp]);

  return (
    <div dir="rtl" className="min-h-screen bg-white text-slate-900">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: #fff !important; color: #0f172a !important; }
          body { font-family: 'Vazir', Tahoma, sans-serif !important; }
          /* مخفی کردن کنترل‌ها در چاپ */
          button, input, select, textarea, .no-print, [data-print-hide="true"] { display: none !important; }
          /* خنثی کردن transform که در Chrome باعث سفید شدن/کات می‌شود */
          * { transform: none !important; filter: none !important; }
          /* اسکرول‌ها را باز کن تا محتوا کامل چاپ شود */
          * { overflow: visible !important; max-height: none !important; }
          #report-print-root, .report-print-shell { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          .report-print-shell { border: 1px solid rgba(15,23,42,.08) !important; border-radius: 18px !important; padding: 8mm !important; box-shadow: none !important; background: #fff !important; }
          table { page-break-inside: auto !important; }
          thead { display: table-header-group !important; }
          tr, img, svg, canvas { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* برای سازگاری با صفحات گزارش که registerReportExports می‌خواهند */}
      <ReportsExportsProvider value={{ registerReportExports: () => {} }}>
        <div className="mx-auto w-full max-w-[980px] px-6 py-6">
          <Outlet />
        </div>
      </ReportsExportsProvider>
    </div>
  );
};

export default PrintLayout;
