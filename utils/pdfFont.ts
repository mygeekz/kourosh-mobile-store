// utils/pdfFont.ts
import { jsPDF } from 'jspdf';

// کش ساده تا هر بار فونت لود نشه
let vazirLoaded = false;

export async function ensureVazirFont(doc: jsPDF) {
  if (vazirLoaded) {
    doc.setFont('vazir');
    return;
  }

  // اگر اسم فایل فونتت فرق داره همین رو عوض کن
  const url = 'public/fonts/Vazir.ttf'; // یا public/fonts/Vazir.ttf
  const res = await fetch(url);
  if (!res.ok) throw new Error('فونت پیدا نشد: ' + url);

  const buf = await res.arrayBuffer();
  const b64 = arrayBufferToBase64(buf);

  // نام داخل VFS و نام فونت باید هماهنگ باشن
  doc.addFileToVFS('vazir.ttf', b64);
  doc.addFont('vazir.ttf', 'vazir', 'normal');
  doc.setFont('vazir');
  vazirLoaded = true;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
