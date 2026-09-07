export type TemplateFormat = 'text' | 'markdown' | 'html';

export type TemplateVariable = {
  key: string; // بدون آکولاد
  label?: string;
  example?: string;
};

export function extractPlaceholders(tpl: string): string[] {
  const m = String(tpl || '').match(/\{(\w+)\}/g) || [];
  const keys = m.map((x) => x.replace(/[{}]/g, '')).filter(Boolean);
  return Array.from(new Set(keys));
}

export function applyTemplate(tpl: string, values: Record<string, any>): string {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_m, p) => {
    const v = values?.[p];
    return v === undefined || v === null ? '' : String(v);
  });
}

export function validatePlaceholders(previews: string[], allowed: TemplateVariable[]): {
  unknown: string[];
} {
  const allowedSet = new Set((allowed || []).map((v) => v.key));
  return { unknown: previews.filter((k) => !allowedSet.has(k)) };
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// رندر مینیمال Markdown (بدون HTML خام)
// پشتیبانی: **bold**، *italic*، `code`، [text](url)، و خط جدید.
export function markdownToSafeHtml(md: string): string {
  let s = escapeHtml(String(md || ''));
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_m, text, url) => {
    const u = String(url || '').trim();
    const ok = /^https?:\/\//i.test(u);
    const safe = ok ? u : '#';
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">${text}</a>`;
  });
  s = s.replace(/\n/g, '<br/>');
  return s;
}

// Sanitizer ساده برای Preview (برای داشبورد کافی است)
export function sanitizeHtml(html: string): string {
  let s = String(html || '');
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)(.|\n|\r)*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/>/gi, '');
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  s = s.replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"');
  s = s.replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, '$1="#"');

  const allowed = new Set([
    'b', 'strong', 'i', 'em', 'u', 's', 'br', 'p', 'div', 'span', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'blockquote',
  ]);

  s = s.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (m, tag) => {
    const t = String(tag || '').toLowerCase();
    if (!allowed.has(t)) return escapeHtml(m);
    return m;
  });
  return s;
}

export function renderTemplatePreviewHtml(format: TemplateFormat, text: string): string {
  const f = (format || 'text').toLowerCase() as TemplateFormat;
  if (f === 'html') return sanitizeHtml(String(text || ''));
  if (f === 'markdown') return sanitizeHtml(markdownToSafeHtml(String(text || '')));
  return sanitizeHtml(escapeHtml(String(text || '')).replace(/\n/g, '<br/>'));
}
