import type { DecisionStatusMeta, SmartInsightDecision, SmartInsightLike } from './types/smartInsightContracts';

export const getDecisionStatusMeta = (decision?: SmartInsightDecision): DecisionStatusMeta => {
  const status = String(decision?.status || '').toLowerCase();
  const outcome = String(decision?.outcome || '').toLowerCase();
  const userDecision = String(decision?.userDecision || '').toLowerCase();
  if (status === 'closed' || status === 'dismissed' || outcome === 'positive' || outcome === 'negative' || userDecision === 'rejected') {
    return { key: 'done' as const, label: decision?.outcomeLabel || decision?.statusLabel || decision?.decisionLabel || 'ثبت نتیجه' };
  }
  if (status === 'open' || status === 'in_progress' || userDecision === 'accepted') {
    return { key: 'action' as const, label: decision?.statusLabel || decision?.decisionLabel || 'نیاز به اقدام' };
  }
  return { key: 'new' as const, label: decision?.statusLabel || decision?.decisionLabel || 'جدید' };
};

export const getExecutiveActionOutcomeGuide = (action?: Partial<SmartInsightLike> | Record<string, unknown>) => {
  const title = String(action?.title || '');
  const summary = String(action?.summary || '');
  const combined = `${title} ${summary}`.toLowerCase();

  if (/وصول|collection|قسط|چک|سررسید|overdue|اقساط/.test(combined)) {
    return {
      metric: 'کاهش ریسک وصول و سررسیدهای باز',
      condition: 'وقتی مبلغ معوق کمتر شود یا وضعیت چک/قسط از باز به پاس‌شده/تسویه‌شده تغییر کند، سیستم این اقدام را موفق در نظر می‌گیرد.',
    };
  }

  if (/موجودی|انبار|stock|inventory|خرید/.test(combined)) {
    return {
      metric: 'بهبود موجودی و کاهش هشدار کمبود',
      condition: 'وقتی موجودی کالا به سطح امن برسد یا فروش بدون کمبود ثبت شود، سیستم این اقدام را موفق در نظر می‌گیرد.',
    };
  }

  if (/قیمت|pricing|حاشیه|سود|discount|تخفیف/.test(combined)) {
    return {
      metric: 'حاشیه سود و کیفیت سود باید بهتر شود',
      condition: 'وقتی تخفیف‌های پرریسک کمتر شود یا فروش با سود سالم‌تر ثبت شود، سیستم این مورد را بهبود‌یافته تشخیص می‌دهد.',
    };
  }

  return {
    metric: 'شاخص مرتبط باید در داده‌های بعدی بهتر شود',
    condition: 'بعد از ثبت اقدام و ورود داده‌های جدید، سیستم در تحلیل بعدی اثر این تصمیم را با دوره قبلی مقایسه می‌کند.',
  };
};
