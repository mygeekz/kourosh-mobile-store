import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PortalLayer from './ui/PortalLayer';

type TooltipPlacement = 'top' | 'bottom';

type TooltipState = {
  text: string;
  x: number;
  y: number;
  visible: boolean;
  placement: TooltipPlacement;
};

const TOOLTIP_SELECTOR = '[data-tooltip]';
const SHOW_DELAY_MS = 500;
const AUTO_HIDE_MS = 2000;
const VIEWPORT_MARGIN = 10;
const TARGET_GAP = 8;

const normalize = (value?: string | null) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || '';
};

const isInteractive = (element: HTMLElement) =>
  element.matches('button, a, input, select, textarea, [role="button"]');

const normalizeNativeTitle = (element: Element) => {
  if (!(element instanceof HTMLElement)) return;
  if (!element.hasAttribute('title')) return;

  const title = normalize(element.getAttribute('title'));
  const disabled = Boolean(element.closest('[data-no-tooltip="true"]'));

  if (title && !disabled && !element.hasAttribute('data-tooltip')) {
    element.setAttribute('data-tooltip', title);
    element.setAttribute('data-tooltip-source', 'native-title');
  }

  if (title && isInteractive(element) && !element.hasAttribute('aria-label')) {
    const visibleText = normalize(element.textContent);
    if (!visibleText) element.setAttribute('aria-label', title);
  }

  // Native browser tooltips cannot be styled and were the second tooltip layer.
  element.removeAttribute('title');
};

const normalizeNativeTitlesIn = (root: ParentNode) => {
  if (root instanceof Element) normalizeNativeTitle(root);
  root.querySelectorAll?.('[title]').forEach(normalizeNativeTitle);
};

const getTooltipText = (element: HTMLElement): string => {
  if (element.closest('[data-no-tooltip="true"]')) return '';
  return normalize(element.getAttribute('data-tooltip'));
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const SmartTooltipLayer: React.FC = () => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const expiredRef = useRef<HTMLElement | null>(null);
  const visibleRef = useRef(false);
  const showTimerRef = useRef<number | null>(null);
  const autoHideTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<TooltipState>({
    text: '',
    x: 0,
    y: 0,
    visible: false,
    placement: 'bottom',
  });

  const clearTimers = () => {
    if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
    if (autoHideTimerRef.current !== null) window.clearTimeout(autoHideTimerRef.current);
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    showTimerRef.current = null;
    autoHideTimerRef.current = null;
    rafRef.current = null;
  };

  const calculatePosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const measuredWidth = bubbleRef.current?.offsetWidth || 220;
    const measuredHeight = bubbleRef.current?.offsetHeight || 34;
    const width = Math.min(measuredWidth, Math.max(160, window.innerWidth - VIEWPORT_MARGIN * 2));
    const hasBottomSpace = window.innerHeight - rect.bottom >= measuredHeight + TARGET_GAP + VIEWPORT_MARGIN;
    const placement: TooltipPlacement = hasBottomSpace ? 'bottom' : 'top';
    const x = clamp(
      rect.left + rect.width / 2 - width / 2,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    const y = placement === 'bottom'
      ? rect.bottom + TARGET_GAP
      : rect.top - measuredHeight - TARGET_GAP;

    return { x, y, placement };
  };

  const hide = (markExpired = false) => {
    clearTimers();
    if (markExpired) expiredRef.current = activeRef.current;
    activeRef.current = null;
    visibleRef.current = false;
    setState((current) => ({ ...current, visible: false }));
  };

  const showAfterDelay = (element: HTMLElement) => {
    const text = getTooltipText(element);
    if (!text) return;
    if (expiredRef.current && expiredRef.current !== element) expiredRef.current = null;
    if (expiredRef.current === element) return;

    clearTimers();
    activeRef.current = element;

    showTimerRef.current = window.setTimeout(() => {
      if (activeRef.current !== element || !document.contains(element)) return;
      const position = calculatePosition(element);
      visibleRef.current = true;
      setState({ text, visible: true, ...position });

      // Re-measure once the real bubble has rendered.
      rafRef.current = window.requestAnimationFrame(() => {
        if (activeRef.current !== element) return;
        setState((current) => ({ ...current, ...calculatePosition(element) }));
      });

      autoHideTimerRef.current = window.setTimeout(() => hide(true), AUTO_HIDE_MS);
    }, SHOW_DELAY_MS);
  };

  const findTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return null;
    if (target.closest('[data-no-tooltip="true"]')) return null;
    return target.closest(TOOLTIP_SELECTOR) as HTMLElement | null;
  };

  useLayoutEffect(() => {
    normalizeNativeTitlesIn(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          normalizeNativeTitle(mutation.target as Element);
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) normalizeNativeTitlesIn(node);
        });
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['title'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setMounted(true);

    const onPointerOver = (event: PointerEvent) => {
      const target = findTarget(event.target);
      if (!target || target === activeRef.current) return;
      showAfterDelay(target);
    };

    const onPointerOut = (event: PointerEvent) => {
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      const expired = expiredRef.current;
      if (expired && event.target instanceof Node && expired.contains(event.target) && (!related || !expired.contains(related))) {
        expiredRef.current = null;
      }

      const active = activeRef.current;
      if (!active) return;
      if (related && active.contains(related)) return;
      hide(false);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = findTarget(event.target);
      if (target) showAfterDelay(target);
    };

    const onFocusOut = () => {
      expiredRef.current = null;
      hide(false);
    };

    const reposition = () => {
      const active = activeRef.current;
      if (!active || !visibleRef.current) return;
      setState((current) => ({ ...current, ...calculatePosition(active) }));
    };

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('pointerdown', onFocusOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      clearTimers();
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('pointerdown', onFocusOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  // Event listeners are intentionally registered once; current visibility is read by state updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const positionStyle = useMemo<React.CSSProperties>(() => ({
    position: 'fixed',
    left: state.x,
    top: state.y,
  }), [state.x, state.y]);

  if (!mounted) return null;

  return (
    <PortalLayer layer="tooltip" className="app-tooltip-portal">
      <div
        className={`app-tooltip-positioner app-tooltip-positioner--${state.placement} ${state.visible ? 'is-visible' : 'is-hidden'}`}
        style={positionStyle}
        aria-hidden={!state.visible}
        data-tooltip-layer-root="canonical"
      >
        <div ref={bubbleRef} role="tooltip" className="app-tooltip-bubble">
          {state.text}
        </div>
      </div>
    </PortalLayer>
  );
};

export default SmartTooltipLayer;
