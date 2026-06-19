import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * True PDF export (downloads a .pdf) instead of opening the print dialog.
 * - Renders the report DOM node to a canvas via html2canvas
 * - Paginates into A4 pages
 */
export async function exportReportToPdf(opts: {
  title: string;
  element: HTMLElement;
  fileName?: string;
  landscape?: boolean;
}) {
  const { title, element, fileName, landscape } = opts;

  // Temporarily ensure white background for crisp output
  const prevBg = element.style.backgroundColor;
  if (!prevBg) element.style.backgroundColor = '#ffffff';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      scrollX: 0,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Fit image to page width
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = 0;
    let remaining = imgHeight;

    // Add title (small) on first page
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(title, pageWidth - 40, 22, { align: 'right' });

    // Start image below title
    const topOffset = 32;

    // First page
    pdf.addImage(imgData, 'PNG', 0, topOffset, imgWidth, imgHeight, undefined, 'FAST');
    remaining -= pageHeight;

    // If it overflows, create pages by shifting the image up (classic technique)
    while (remaining > 0) {
      pdf.addPage();
      y = remaining - imgHeight;
      pdf.addImage(imgData, 'PNG', 0, y + topOffset, imgWidth, imgHeight, undefined, 'FAST');
      remaining -= pageHeight;
    }

    const safeName = (fileName || title || 'report')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .trim();

    pdf.save(`${safeName}.pdf`);
  } finally {
    element.style.backgroundColor = prevBg;
  }
}
