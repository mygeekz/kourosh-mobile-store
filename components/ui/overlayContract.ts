import { useEffect, useState } from 'react';

export type OverlayLayerKind =
  | 'modal-backdrop'
  | 'modal'
  | 'drawer-backdrop'
  | 'drawer'
  | 'sheet-backdrop'
  | 'sheet'
  | 'command-backdrop'
  | 'command'
  | 'dropdown'
  | 'popover'
  | 'tooltip'
  | 'toast'
  | 'floating';

export const OVERLAY_VIEWPORT_MARGIN = 8;
export const OVERLAY_ANCHOR_GAP = 8;

const overlayHostId = (layer: OverlayLayerKind) => `kourosh-overlay-host-${layer}`;

/**
 * Returns the canonical DOM host for a UI overlay layer.
 *
 * Every portal-like surface (including third-party portals such as react-select)
 * should target this host rather than attaching directly to document.body with
 * a page-owned z-index. Stacking is owned exclusively by overlay-layer-contract.css.
 */
export const getOverlayPortalHost = (
  layer: OverlayLayerKind,
  dir: 'rtl' | 'ltr' | 'auto' = 'rtl',
): HTMLElement | null => {
  if (typeof document === 'undefined') return null;

  // Toasts are non-blocking feedback, not viewport overlays. Portaling them
  // directly to <body> prevents a persistent, full-viewport fixed host from
  // becoming a Chromium/PWA compositor plane after a repair status update.
  if (layer === 'toast') {
    const staleToastHost = document.getElementById(overlayHostId('toast'));
    if (staleToastHost && staleToastHost.childElementCount === 0) staleToastHost.remove();
    return document.body;
  }

  const id = overlayHostId(layer);
  const existing = document.getElementById(id);
  if (existing) {
    existing.setAttribute('dir', dir);
    return existing;
  }

  const host = document.createElement('div');
  host.id = id;
  host.className = `app-overlay-layer-host app-overlay-layer-host--${layer}`;
  host.setAttribute('data-kourosh-layer-host', layer);
  host.setAttribute('dir', dir);
  document.body.appendChild(host);
  return host;
};

/**
 * React-safe portal target resolver for third-party components that need an
 * HTMLElement target (react-select, chart popovers, etc.).
 */
export const useOverlayPortalTarget = (
  layer: OverlayLayerKind,
  dir: 'rtl' | 'ltr' | 'auto' = 'rtl',
) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(getOverlayPortalHost(layer, dir));
  }, [dir, layer]);

  return target;
};
