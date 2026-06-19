import React from 'react';

const RIPPLE_SELECTOR = 'button, a.ux-btn, a[class*="action"], a[class*="btn"], .premium-submit-btn, .premium-cancel-btn, .inventory-inline-add, .people-primary-btn, .people-secondary-btn';
const INTERACTIVE_SELECTOR = 'button, [role="button"], a.ux-btn';
const NATIVE_BUTTON_SELECTOR = 'button:not(.ux-btn):not(.unstyled-button):not([data-skip-global-button="true"]), a[class*="action"]:not(.ux-btn):not([data-skip-global-button="true"]), a[class*="btn"]:not(.ux-btn):not([data-skip-global-button="true"])';
const NATIVE_BUTTON_SKIP_SELECTOR = [
  '.wizard-chip',
  '.wizard-bottom-modern button',
  '.calendar-day-btn',
  '.calendar-nav-btn',
  '.calendar-action-btn',
  '.shamsi-datepicker button',
  '[data-skip-global-buttons="true"] button',
].join(', ');
function shouldSkipRipple(target: HTMLElement | null) {
  if (!target) return true;
  if (target.matches('[disabled], [aria-disabled="true"], .no-ripple, [data-ripple="false"]')) return true;
  const computed = window.getComputedStyle(target);
  return computed.pointerEvents === 'none';
}

function textOf(el: HTMLElement | null) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function hasVisualIcon(el: HTMLElement) {
  return Boolean(el.querySelector('svg, img, .ux-btn__icon, [data-role="btn-icon"], i[class], span[class*="icon"], .fa, .fas, .far, .fal, .fab'));
}

function detectVariant(el: HTMLElement, label: string) {
  const classes = el.className || '';
  const bag = `${classes} ${label}`;
  if (/(حذف مورد|پاک|لغو نهایی|remove|delete|trash|danger|rose-|red-)/i.test(bag)) return 'danger';
  if (/(دانلود|install|نصب|download)/i.test(bag)) return 'secondary';
  if (/(فروش اعتباری|اعتباری|credit|installment|اقساط|warning|amber-|orange-|yellow-)/i.test(bag)) return 'warning';
  if (/(فروش نقدی|نقدی|cash|بررسی و ادامه|اجرای|همگام|ارسال پیام|send|run|sync|check|health|success|sky-|blue-|indigo-|cyan-)/i.test(bag)) return 'success';
  if (/(بازگشت|بستن|انصراف|مشاهده جزئیات|جزئیات|فیلتر|بیشتر|close|cancel|secondary|ghost|gray-|slate-|stone-|neutral|border)/i.test(bag)) return 'secondary';
  if (/(ویرایش اطلاعات|تغییر|اصلاح|edit)/i.test(bag)) return 'warning';
  if (/(بروزرسانی|به\s?روزرسانی|refresh|reload|rotate|بکاپ|پشتیبان|backup|logo|لوگو|روشن|تیره|سیستمی|theme)/i.test(bag)) return 'primary';
  return 'primary';
}

function detectSize(el: HTMLElement, label: string) {
  const classes = el.className || '';
  const bag = `${classes} ${label}`;
  if (/(text-\[10px\]|text-\[11px\]|text-xs|px-2|py-1|h-8|ux-btn-xs)/.test(bag)) return 'ux-btn-xs';
  if (/(text-sm|px-3|py-1\.5|h-9|ux-btn-sm)/.test(bag)) return 'ux-btn-sm';
  if (/(text-base|px-5|py-3|h-11|h-12|ux-btn-lg)/.test(bag)) return 'ux-btn-lg';
  return 'ux-btn-md';
}

function shouldInjectSyntheticIcon(el: HTMLElement, label: string) {
  if (el.dataset.forceGlobalIcon === 'true') return true;
  if (!label) return false;
  if (el.closest('.page-shell-actions, .modal-actions, .settings-action-row, .repair-actions-row, .detail-action-row, .ux-toolbar-actions, .customers-toolbar, .ux-table-shell__actions, .ux-table-row-actions, .inventory-table-row-actions, .installment-table-actions, .installment-card-actions')) return true;
  return false;
}

function detectIconGlyph(variant: string, label: string) {
  const bag = label;
  if (/(حذف مورد|پاک|trash|delete)/i.test(bag)) return '\uf1f8';
  if (/(ویرایش اطلاعات|اصلاح|edit)/i.test(bag)) return '\uf044';
  if (/(بستن|انصراف|بازگشت|close|cancel)/i.test(bag)) return '\uf00d';
  if (/(دانلود|download|install|نصب)/i.test(bag)) return '\uf019';
  if (/(بروزرسانی|به\s?روزرسانی|refresh|reload|rotate)/i.test(bag)) return '\uf2f1';
  if (/(بکاپ|پشتیبان|backup)/i.test(bag)) return '\uf1c0';
  if (/(چاپ|print|pdf)/i.test(bag)) return '\uf02f';
  if (/(ذخیره تغییرات|ثبت اطلاعات|ایجاد|افزودن مورد جدید|تایید|جدید|save|create|add|submit)/i.test(bag)) return '\uf067';
  if (/(جستجو|search|فیلتر)/i.test(bag)) return '\uf1de';
  if (/(لوگو|تصویر|logo|image)/i.test(bag)) return '\uf03e';
  if (/(روشن|تیره|سیستمی|theme|dark|light|system)/i.test(bag)) return '\uf53f';
  if (/(مشاهده|جزئیات|نمایش|view)/i.test(bag)) return '\uf06e';
  if (/(ارسال|بررسی و ادامه|sync|send|run|check)/i.test(bag)) return '\uf0e7';
  if (variant === 'danger') return '\uf1f8';
  if (variant === 'warning') return '\uf304';
  if (variant === 'secondary') return '\uf1de';
  if (variant === 'success') return '\uf058';
  return '\uf0d0';
}


function isActionLikeButton(el: HTMLElement, label: string) {
  const classes = el.className || '';
  const title = el.getAttribute('title') || '';
  const aria = el.getAttribute('aria-label') || '';
  const bag = `${classes} ${title} ${aria} ${label}`;

  if (hasVisualIcon(el)) return true;
  if (el.dataset.forceGlobalButton === 'true') return true;
  if (el.closest('.ux-table-row-actions, .inventory-table-row-actions, .installment-table-actions, .installment-card-actions, .ux-toolbar-actions, .ux-table-shell__actions, .customers-toolbar')) return true;
  if (/(ویرایش اطلاعات|اصلاح|edit|حذف مورد|پاک|delete|trash|دانلود|download|نصب|install|بروزرسانی|به\s?روزرسانی|refresh|reload|rotate|ذخیره تغییرات|ثبت اطلاعات|ایجاد|افزودن مورد جدید|جدید|submit|save|create|add|بستن|انصراف|بازگشت|close|cancel|جستجو|فیلتر|search|چاپ|pdf|print|مشاهده|جزئیات|نمایش|view|ارسال|بررسی و ادامه|همگام|send|run|check|backup|بکاپ|پشتیبان|theme|روشن|تیره|سیستمی|logo|لوگو|image|تصویر)/i.test(bag)) return true;
  if (/(^|\s)(ux-btn|people-action-btn|premium-submit-btn|premium-cancel-btn|inventory-inline-add)(\s|$)/.test(classes)) return true;
  return false;
}

function enhanceNativeButton(el: HTMLElement | null) {
  if (!el || !el.matches(NATIVE_BUTTON_SELECTOR)) return;
  if (el.matches(NATIVE_BUTTON_SKIP_SELECTOR) || el.closest(NATIVE_BUTTON_SKIP_SELECTOR)) return;
  if (el.closest('[data-skip-global-buttons="true"]')) return;

  const label = textOf(el);
  if (!label && !hasVisualIcon(el)) return;

  if (!isActionLikeButton(el, label)) {
    if (el.dataset.uxEnhanced === 'true') {
      delete el.dataset.uxEnhanced;
      delete el.dataset.uxVariant;
      delete el.dataset.uxIconGlyph;
      el.classList.remove('ux-btn', 'ux-btn-primary', 'ux-btn-success', 'ux-btn-secondary', 'ux-btn-danger', 'ux-btn-warning', 'ux-btn-ghost', 'ux-btn-neutral', 'ux-btn-xs', 'ux-btn-sm', 'ux-btn-md', 'ux-btn-lg', 'ux-btn--native');
    }
    return;
  }

  if (el.dataset.uxEnhanced !== 'true') {
    const variant = detectVariant(el, label);
    const sizeClass = detectSize(el, label);
    el.dataset.uxEnhanced = 'true';
    el.dataset.uxVariant = variant;
    el.classList.add('ux-btn', `ux-btn-${variant}`, sizeClass, 'ux-btn--native');
  }

  if (!hasVisualIcon(el) && label && isActionLikeButton(el, label) && shouldInjectSyntheticIcon(el, label)) {
    el.dataset.uxIconGlyph = detectIconGlyph(el.dataset.uxVariant || detectVariant(el, label), label);
  } else {
    delete el.dataset.uxIconGlyph;
  }
}

function updateLoadingStateForElement(el: HTMLElement | null) {
  if (!el || !el.matches(INTERACTIVE_SELECTOR)) return;
  const explicitLoading = el.getAttribute('aria-busy') === 'true' || el.dataset.loading === 'true';

  if (explicitLoading) {
    el.dataset.loading = 'true';
    el.setAttribute('aria-busy', 'true');
  } else if (el.dataset.loading === 'true') {
    delete el.dataset.loading;
    el.removeAttribute('aria-busy');
  }
}

function syncLoadingState(root: ParentNode | HTMLElement = document) {
  if (root instanceof HTMLElement) {
    updateLoadingStateForElement(root);
    enhanceNativeButton(root);
  }
  const nodes = root.querySelectorAll?.(INTERACTIVE_SELECTOR);
  if (!nodes) return;
  nodes.forEach((node) => updateLoadingStateForElement(node as HTMLElement));
  const buttonNodes = root.querySelectorAll?.(NATIVE_BUTTON_SELECTOR);
  buttonNodes?.forEach((node) => enhanceNativeButton(node as HTMLElement));
}

const GlobalButtonEffects: React.FC = () => {
  React.useEffect(() => {
    let rafId: number | null = null;
    const queue = new Set<HTMLElement>();

    const flush = () => {
      rafId = null;
      const batch = Array.from(queue);
      queue.clear();
      batch.forEach((el) => syncLoadingState(el));
    };

    const schedule = (node?: HTMLElement | null) => {
      if (node) queue.add(node);
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(flush);
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const surface = target?.closest(RIPPLE_SELECTOR) as HTMLElement | null;
      if (!surface || shouldSkipRipple(surface)) return;

      const rect = surface.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.35;
      const ripple = document.createElement('span');
      ripple.className = 'ux-ripple';

      const source = 'clientX' in event ? (event as PointerEvent) : null;
      const left = source ? source.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
      const top = source ? source.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${left}px`;
      ripple.style.top = `${top}px`;

      surface.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    };

    syncLoadingState(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) schedule(node);
          });
          continue;
        }

        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          const target = mutation.target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
          if (target) schedule(target);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'aria-busy', 'data-loading', 'class'],
    });

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', handlePointerDown);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
};

export default GlobalButtonEffects;
