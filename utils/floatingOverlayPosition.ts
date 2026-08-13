export type FloatingOverlayPlacement = 'top' | 'bottom';

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
};

export type FloatingOverlayPosition = {
  top: number;
  left: number;
  width: number;
  placement: FloatingOverlayPlacement;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Resolves a fixed, RTL-aligned portal surface in CSS viewport pixels.
 * Browser zoom is already reflected in viewport and DOMRect values, so the
 * same contract works at 90%, 100% and enlarged accessibility zoom.
 */
export const resolveFloatingOverlayPosition = ({
  anchor,
  viewport,
  preferredWidth,
  panelHeight,
  margin = 8,
  gap = 8,
}: FloatingOverlayPositionInput): FloatingOverlayPosition => {
  const safeViewportWidth = Math.max(0, viewport.width);
  const safeViewportHeight = Math.max(0, viewport.height);
  const usableWidth = Math.max(0, safeViewportWidth - margin * 2);
  const width = Math.min(Math.max(0, preferredWidth), usableWidth);
  const maxLeft = Math.max(margin, safeViewportWidth - width - margin);
  const left = clamp(anchor.right - width, margin, maxLeft);
  const bottomTop = anchor.bottom + gap;
  const fitsBelow = bottomTop + panelHeight <= safeViewportHeight - margin;
  const top = fitsBelow
    ? bottomTop
    : Math.max(margin, anchor.top - gap - panelHeight);

  return {
    top,
    left,
    width,
    placement: fitsBelow ? 'bottom' : 'top',
  };
};
