export type AppSectionTarget = string | HTMLElement | null | undefined;

type ScrollToAppSectionOptions = {
  behavior?: ScrollBehavior;
  offset?: number;
};

const resolveTarget = (target: AppSectionTarget): HTMLElement | null => {
  if (!target) return null;
  if (typeof target !== 'string') return target;

  const byId = document.getElementById(target);
  if (byId) return byId;

  try {
    return document.querySelector<HTMLElement>(target);
  } catch {
    return null;
  }
};

/**
 * Scroll a detail-page section inside the application's real scroll container.
 *
 * The desktop shell scrolls `.app-main-scroll`, not `window`. Calling only
 * `element.scrollIntoView()` is browser-dependent when the page lives inside
 * that nested overflow container. This helper computes the position against
 * the actual app scroller and keeps a sticky-header-safe offset.
 */
export const scrollToAppSection = (
  target: AppSectionTarget,
  { behavior = 'smooth', offset = 120 }: ScrollToAppSectionOptions = {},
): boolean => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;

  const element = resolveTarget(target);
  if (!element) return false;

  const appScroller = element.closest<HTMLElement>('[data-ui-shell="main-scroll"]')
    || document.querySelector<HTMLElement>('[data-ui-shell="main-scroll"]');

  if (appScroller) {
    const targetRect = element.getBoundingClientRect();
    const scrollerRect = appScroller.getBoundingClientRect();
    const computedMargin = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop || '0') || 0;
    const safeOffset = Math.max(offset, computedMargin);
    const nextTop = Math.max(0, appScroller.scrollTop + targetRect.top - scrollerRect.top - safeOffset);

    appScroller.scrollTo({ top: nextTop, behavior });
    return true;
  }

  const computedMargin = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop || '0') || 0;
  const safeOffset = Math.max(offset, computedMargin);
  const nextTop = Math.max(0, window.scrollY + element.getBoundingClientRect().top - safeOffset);
  window.scrollTo({ top: nextTop, behavior });
  return true;
};

export default scrollToAppSection;
