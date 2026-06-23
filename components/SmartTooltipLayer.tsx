import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

type TooltipState = {
  text: string;
  x: number;
  y: number;
  visible: boolean;
  placement: TooltipPlacement;
  arrowX: number;
  arrowY: number;
};

const SELECTOR = 'button, a, input, select, textarea, [role="button"], [data-tooltip]';

const normalize = (value?: string | null) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || '';
};

const getLabelText = (el: HTMLElement): string => {
  const direct = (el as HTMLInputElement).labels?.[0]?.textContent;
  if (normalize(direct)) return normalize(direct);

  const id = (el as HTMLInputElement).id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) return normalize(label.textContent);
  }

  const wrapLabel = el.closest('label');
  if (wrapLabel?.textContent) return normalize(wrapLabel.textContent);

  const fieldWrap = el.closest('.modal-field, .field, .form-field, [data-field-label]');
  const fieldLabel = fieldWrap?.querySelector('.modal-field-label, .field-label, [data-field-label-text]');
  if (fieldLabel?.textContent) return normalize(fieldLabel.textContent);

  return '';
};

const getTooltipText = (el: HTMLElement): string => {
  if (el.closest('[data-no-tooltip="true"]')) return '';
  const datasetTooltip = normalize(el.getAttribute('data-tooltip'));
  if (datasetTooltip) return datasetTooltip;

  const aria = normalize(el.getAttribute('aria-label'));
  if (aria) return aria;

  const title = normalize(el.getAttribute('title'));
  if (title) return title;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const label = getLabelText(el);
    const preview = normalize(el.getAttribute('data-preview') || el.getAttribute('placeholder'));
    if (label && preview) return `${label} — ${preview}`;
    if (label) return label;
    if (preview) return preview;
    const name = normalize(el.getAttribute('name'));
    if (name) return name;
  }

  const text = normalize(el.textContent);
  if (text && text.length <= 80) return text;

  const iconTitle = normalize(el.querySelector('i')?.getAttribute('title'));
  if (iconTitle) return iconTitle;

  return '';
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const SmartTooltipLayer: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const lastPointerRef = useRef<{ x?: number; y?: number }>({});
  const [state, setState] = useState<TooltipState>({
    text: '',
    x: 0,
    y: 0,
    visible: false,
    placement: 'bottom',
    arrowX: 0,
    arrowY: 0,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let current: HTMLElement | null = null;
    let raf = 0;

    const measure = () => {
      const bubble = bubbleRef.current;
      return {
        width: Math.min(bubble?.offsetWidth || 280, Math.max(180, window.innerWidth - 28)),
        height: bubble?.offsetHeight || 52,
      };
    };

    const calculatePosition = (el: HTMLElement, clientX?: number, clientY?: number) => {
      const rect = el.getBoundingClientRect();
      const { width, height } = measure();
      const margin = 12;
      const gap = 10;
      const pointerX = typeof clientX === 'number' ? clientX : rect.left + rect.width / 2;
      const pointerY = typeof clientY === 'number' ? clientY : rect.top + rect.height / 2;

      const space = {
        top: rect.top,
        bottom: window.innerHeight - rect.bottom,
        left: rect.left,
        right: window.innerWidth - rect.right,
      };

      const placement: TooltipPlacement =
        space.bottom >= height + gap + margin ? 'bottom'
        : space.top >= height + gap + margin ? 'top'
        : space.right >= width + gap + margin ? 'right'
        : space.left >= width + gap + margin ? 'left'
        : space.bottom >= space.top ? 'bottom' : 'top';

      let x = rect.left + rect.width / 2;
      let y = rect.bottom + gap;

      if (placement === 'top') {
        y = rect.top - gap - height;
      } else if (placement === 'left') {
        x = rect.left - gap - width;
        y = rect.top + rect.height / 2 - height / 2;
      } else if (placement === 'right') {
        x = rect.right + gap;
        y = rect.top + rect.height / 2 - height / 2;
      } else {
        y = rect.bottom + gap;
      }

      if (placement === 'top' || placement === 'bottom') {
        x = clamp(x - width / 2, margin, window.innerWidth - width - margin);
      } else {
        y = clamp(y, margin, window.innerHeight - height - margin);
      }

      if (placement === 'top' || placement === 'bottom') {
        return {
          placement,
          x,
          y,
          arrowX: clamp(pointerX - x, 18, width - 18),
          arrowY: placement === 'top' ? height : 0,
        };
      }

      return {
        placement,
        x,
        y,
        arrowX: placement === 'left' ? width : 0,
        arrowY: clamp(pointerY - y, 18, height - 18),
      };
    };

    const updateFor = (el: HTMLElement | null, clientX?: number, clientY?: number) => {
      if (!el) {
        current = null;
        activeRef.current = null;
        window.cancelAnimationFrame(raf);
        setState((s) => ({ ...s, visible: false }));
        return;
      }

      const text = getTooltipText(el);
      if (!text) {
        current = null;
        activeRef.current = null;
        window.cancelAnimationFrame(raf);
        setState((s) => ({ ...s, visible: false }));
        return;
      }

      current = el;
      activeRef.current = el;
      lastPointerRef.current = { x: clientX, y: clientY };

      const first = calculatePosition(el, clientX, clientY);
      setState({ text, visible: true, ...first });

      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        if (!current) return;
        const next = calculatePosition(current, lastPointerRef.current.x, lastPointerRef.current.y);
        setState((s) => ({ ...s, text, visible: true, ...next }));
      });
    };

    const findTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return null;
      if (target.closest('[data-no-tooltip="true"]')) return null;
      return target.closest(SELECTOR) as HTMLElement | null;
    };

    const onPointerOver = (e: Event) => updateFor(findTarget(e.target));
    const onFocusIn = (e: Event) => updateFor(findTarget(e.target));
    const onPointerMove = (e: MouseEvent) => {
      if (!current) return;
      updateFor(current, e.clientX, e.clientY);
    };
    const onLeave = () => updateFor(null);
    const onScroll = () => {
      if (!current) return;
      updateFor(current, lastPointerRef.current.x, lastPointerRef.current.y);
    };

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onLeave, true);
    document.addEventListener('focusout', onLeave, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onLeave, true);
      document.removeEventListener('focusout', onLeave, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const style = useMemo<React.CSSProperties & { '--smart-tooltip-arrow-x'?: string; '--smart-tooltip-arrow-y'?: string }>(() => ({
    position: 'fixed',
    zIndex: 2147483647,
    left: state.x,
    top: state.y,
    opacity: state.visible ? 1 : 0,
    pointerEvents: 'none',
    '--smart-tooltip-arrow-x': `${state.arrowX}px`,
    '--smart-tooltip-arrow-y': `${state.arrowY}px`,
  }), [state.x, state.y, state.arrowX, state.arrowY, state.visible]);

  const tooltipNode = (
    <div
      className={`smart-tooltip-layer smart-tooltip-layer--${state.placement} ${state.visible ? 'smart-tooltip-layer--visible' : 'smart-tooltip-layer--hidden'}`}
      style={style}
      aria-hidden={!state.visible}
      data-placement={state.placement}
      data-tooltip-layer-root="body-portal"
    >
      <div ref={bubbleRef} className="smart-tooltip-bubble">{state.text}</div>
    </div>
  );

  if (!isMounted || typeof document === 'undefined') return null;

  return createPortal(tooltipNode, document.body);
};

export default SmartTooltipLayer;
