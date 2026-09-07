import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import {
  resolveFloatingOverlayPosition,
  type FloatingOverlayAlign,
  type FloatingOverlayDirection,
  type FloatingOverlayPlacementPreference,
  type FloatingOverlayPosition,
} from '../../utils/floatingOverlayPosition';
import { OVERLAY_ANCHOR_GAP, OVERLAY_VIEWPORT_MARGIN } from './overlayContract';

export type AnchoredOverlayPosition = FloatingOverlayPosition & {
  maxHeight: number;
};

export type UseAnchoredOverlayPositionOptions = {
  isOpen: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
  anchorElement?: HTMLElement | null;
  panelRef?: RefObject<HTMLElement | null>;
  preferredWidth: number;
  fallbackPanelHeight: number;
  maxPanelHeight?: number;
  margin?: number;
  gap?: number;
  align?: FloatingOverlayAlign;
  direction?: FloatingOverlayDirection;
  placement?: FloatingOverlayPlacementPreference;
};

const getViewport = () => ({
  width: Math.max(0, window.visualViewport?.width || window.innerWidth || 0),
  height: Math.max(0, window.visualViewport?.height || window.innerHeight || 0),
});

/**
 * Canonical positioning hook for portal-based dropdowns/popovers/menus.
 * It uses viewport-fixed coordinates, remeasures after render, observes the
 * anchor/panel dimensions, and reacts to scroll/resize/visualViewport changes.
 */
export const useAnchoredOverlayPosition = ({
  isOpen,
  anchorRef,
  anchorElement,
  panelRef,
  preferredWidth,
  fallbackPanelHeight,
  maxPanelHeight,
  margin = OVERLAY_VIEWPORT_MARGIN,
  gap = OVERLAY_ANCHOR_GAP,
  align = 'start',
  direction = 'rtl',
  placement = 'auto',
}: UseAnchoredOverlayPositionOptions) => {
  const [position, setPosition] = useState<AnchoredOverlayPosition | null>(null);

  const updatePosition = useCallback(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const anchor = anchorElement ?? anchorRef?.current ?? null;
    if (!anchor) return;

    const measuredPanelHeight = panelRef?.current?.getBoundingClientRect().height || fallbackPanelHeight;
    const desiredPanelHeight = Math.max(
      0,
      Math.min(measuredPanelHeight, maxPanelHeight ?? Number.POSITIVE_INFINITY),
    );

    const resolved = resolveFloatingOverlayPosition({
      anchor: anchor.getBoundingClientRect(),
      viewport: getViewport(),
      preferredWidth,
      panelHeight: desiredPanelHeight,
      margin,
      gap,
      align,
      direction,
      placement,
    });

    setPosition({
      ...resolved,
      maxHeight: Math.max(0, Math.min(maxPanelHeight ?? resolved.availableHeight, resolved.availableHeight)),
    });
  }, [
    align,
    anchorElement,
    anchorRef,
    direction,
    fallbackPanelHeight,
    gap,
    isOpen,
    margin,
    maxPanelHeight,
    panelRef,
    placement,
    preferredWidth,
  ]);

  useLayoutEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      setPosition(null);
      return undefined;
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    const anchor = anchorElement ?? anchorRef?.current ?? null;
    const panel = panelRef?.current ?? null;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePosition) : null;
    if (anchor) observer?.observe(anchor);
    if (panel) observer?.observe(panel);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [anchorElement, anchorRef, isOpen, panelRef, updatePosition]);

  return { position, updatePosition };
};

export default useAnchoredOverlayPosition;
