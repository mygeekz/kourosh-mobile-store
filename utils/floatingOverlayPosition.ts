export type FloatingOverlayPlacement = 'top' | 'bottom';
export type FloatingOverlayPlacementPreference = 'auto' | FloatingOverlayPlacement;
export type FloatingOverlayAlign = 'start' | 'center' | 'end';
export type FloatingOverlayDirection = 'rtl' | 'ltr';

export type FloatingOverlayRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type FloatingOverlayViewport = {
  width: number;
  height: number;
};

export type FloatingOverlayPositionInput = {
  anchor: FloatingOverlayRect;
  viewport: FloatingOverlayViewport;
  preferredWidth: number;
  panelHeight: number;
  margin?: number;
  gap?: number;
  align?: FloatingOverlayAlign;
  direction?: FloatingOverlayDirection;
  placement?: FloatingOverlayPlacementPreference;
};

export type FloatingOverlayPosition = {
  top: number;
  left: number;
  width: number;
  placement: FloatingOverlayPlacement;
  availableHeight: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const resolveHorizontalLeft = ({
  anchor,
  width,
  viewportWidth,
  margin,
  align,
  direction,
}: {
  anchor: FloatingOverlayRect;
  width: number;
  viewportWidth: number;
  margin: number;
  align: FloatingOverlayAlign;
  direction: FloatingOverlayDirection;
}) => {
  const maxLeft = Math.max(margin, viewportWidth - width - margin);
  let preferredLeft = anchor.right - width;

  if (align === 'center') {
    preferredLeft = anchor.left + ((anchor.right - anchor.left) - width) / 2;
  } else if (align === 'end') {
    preferredLeft = direction === 'rtl' ? anchor.left : anchor.right - width;
  } else if (direction === 'ltr') {
    preferredLeft = anchor.left;
  }

  return clamp(preferredLeft, margin, maxLeft);
};

/**
 * Resolves a fixed portal surface in CSS viewport pixels.
 *
 * The default keeps the historical Kourosh behavior: RTL + start alignment,
 * meaning the surface's inline-start edge (right edge) follows the anchor.
 * Consumers can opt into center/end alignment without reimplementing collision
 * math or page-owned viewport clamps.
 */
export const resolveFloatingOverlayPosition = ({
  anchor,
  viewport,
  preferredWidth,
  panelHeight,
  margin = 8,
  gap = 8,
  align = 'start',
  direction = 'rtl',
  placement = 'auto',
}: FloatingOverlayPositionInput): FloatingOverlayPosition => {
  const safeViewportWidth = Math.max(0, viewport.width);
  const safeViewportHeight = Math.max(0, viewport.height);
  const usableWidth = Math.max(0, safeViewportWidth - margin * 2);
  const width = Math.min(Math.max(0, preferredWidth), usableWidth);
  const left = resolveHorizontalLeft({
    anchor,
    width,
    viewportWidth: safeViewportWidth,
    margin,
    align,
    direction,
  });

  const belowTop = anchor.bottom + gap;
  const spaceBelow = Math.max(0, safeViewportHeight - margin - belowTop);
  const spaceAbove = Math.max(0, anchor.top - gap - margin);
  const fitsBelow = panelHeight <= spaceBelow;
  const fitsAbove = panelHeight <= spaceAbove;

  let resolvedPlacement: FloatingOverlayPlacement;
  if (placement === 'bottom') resolvedPlacement = 'bottom';
  else if (placement === 'top') resolvedPlacement = 'top';
  else if (fitsBelow) resolvedPlacement = 'bottom';
  else if (fitsAbove) resolvedPlacement = 'top';
  else resolvedPlacement = spaceBelow >= spaceAbove ? 'bottom' : 'top';

  const availableHeight = resolvedPlacement === 'bottom' ? spaceBelow : spaceAbove;
  const effectiveHeight = Math.max(0, Math.min(panelHeight, availableHeight));
  const maxTop = Math.max(margin, safeViewportHeight - margin - effectiveHeight);
  const preferredTop = resolvedPlacement === 'bottom'
    ? belowTop
    : anchor.top - gap - effectiveHeight;
  const top = clamp(preferredTop, margin, maxTop);

  return {
    top,
    left,
    width,
    placement: resolvedPlacement,
    availableHeight,
  };
};
