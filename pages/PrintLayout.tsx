import React, { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { ReportsExportsProvider } from '../contexts/ReportsExportsContext';

// یک لایه سبک مخصوص چاپ/PDF (بدون MainLayout)
const PrintLayout: React.FC = () => {
  const [sp] = useSearchParams();

  // در گزارش‌ها دیتای صفحه معمولاً async لود می‌شود.
  // اگر خیلی زود window.print() بزنیم، Chrome یک snapshot سفید می‌گیرد و همان را preview می‌کند.
  // این helper صبر می‌کند تا محتوای واقعی داخل #report-print-root ظاهر شود.
  const waitForReportReady = async (timeoutMs = 12000): Promise<boolean> => {
    const start = Date.now();
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (Date.now() - start < timeoutMs) {
      const root = document.getElementById('report-print-root') as HTMLElement | null;
      if (root) {
        if (root.dataset.printBlocked === 'true') return false;
        const text = (root.innerText || '').replace(/\s+/g, ' ').trim();
        const hasLoadingText = /بارگذاری|در حال|loading|please wait/i.test(text);
        const rowCount = root.querySelectorAll('table tbody tr').length;
        const hasMeaningfulDom = root.querySelectorAll('*').length > 10;

        // اگر جدول دارد یا متن کافی دارد و پیام loading دیده نمی‌شود، آماده است.
        if (!hasLoadingText && (rowCount > 0 || text.length > 60) && hasMeaningfulDom) {
          // دو فریم صبر کن تا layout نهایی شود
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return true;
        }
      }
      await sleep(250);
    }
    return false;
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

    const setPrintSnapshotState = (active: boolean) => {
      document.documentElement.classList.toggle('kourosh-print-snapshot', active);
      document.body.classList.toggle('kourosh-print-snapshot', active);
    };

    const handleAfterPrint = () => setPrintSnapshotState(false);
    window.addEventListener('afterprint', handleAfterPrint);

    (async () => {
      // صبر برای فونت‌ها
      try {
        // @ts-ignore
        await document.fonts?.ready;
      } catch {}

      // صبر برای لود شدن دیتای گزارش
      const isReady = await waitForReportReady(12000);
      if (cancelled || !isReady) return;

      // Print is an isolated document state: only the canonical report root is
      // allowed to participate in Chrome's print snapshot. This prevents
      // hidden app portals/overlays from being moved over the report by global
      // transform/overflow resets.
      setPrintSnapshotState(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
      if (cancelled) return;

      window.focus();
      window.print();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', handleAfterPrint);
      setPrintSnapshotState(false);
    };
  }, [sp]);

  return (
    <div dir="rtl" data-print-layout-root="true" className="min-h-screen bg-white text-slate-900">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html.kourosh-print-snapshot,
          html.kourosh-print-snapshot body,
          html.kourosh-print-snapshot body #root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            color: #0f172a !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          html.kourosh-print-snapshot body {
            direction: rtl !important;
            font-family: 'Vazir', Tahoma, sans-serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* تنها پوسته چاپ باید فرزند قابل چاپ #root باشد. */
          html.kourosh-print-snapshot body > :not(#root),
          html.kourosh-print-snapshot body #root > :not([data-print-layout-root="true"]) {
            display: none !important;
          }
          [data-print-layout-root="true"],
          [data-print-layout-frame="true"],
          #report-print-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            transform: none !important;
            filter: none !important;
            opacity: 1 !important;
            visibility: visible !important;
            background: #fff !important;
          }
          #report-print-root,
          #report-print-root * {
            opacity: 1 !important;
            visibility: visible !important;
            animation: none !important;
            transition: none !important;
            text-shadow: none !important;
            -webkit-text-fill-color: currentColor !important;
          }
          /* مخفی کردن کنترل‌ها در چاپ */
          button, input, select, textarea, .no-print, [data-print-hide="true"],
          [data-kourosh-layer], .app-portal-layer { display: none !important; }
          #report-print-root, .report-print-shell { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          .report-print-shell { border: 1px solid rgba(15,23,42,.08) !important; border-radius: 18px !important; padding: 8mm !important; box-shadow: none !important; background: #fff !important; }
          table { page-break-inside: auto !important; }
          thead { display: table-header-group !important; }
          tr, img, svg, canvas { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* برای سازگاری با صفحات گزارش که registerReportExports می‌خواهند */}
      <ReportsExportsProvider value={{ registerReportExports: () => {} }}>
        <div data-print-layout-frame="true" className="mx-auto w-full max-w-[980px] px-6 py-6">
          <Outlet />
        </div>
      </ReportsExportsProvider>
    </div>
  );
};

export default PrintLayout;
