import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import PortalLayer from '../ui/PortalLayer';

const SIDEBAR_SELECTOR = [
  '[data-ui-navigation="sidebar"]',
  '[data-ui-shell="sidebar"]',
  '[data-sidebar]',
  '.app-sidebar',
  '.sidebar',
  '.main-sidebar',
  '.main-layout-sidebar',
  '.navigation-sidebar',
  '.layout-sidebar',
  'aside[aria-label*="menu" i]',
  'aside[aria-label*="navigation" i]',
].join(', ');
const CONTENT_SELECTOR = '[data-ui-shell="content"], [data-main-content], main';

const readCssPx = (value: string | null | undefined) => {
  const parsed = Number.parseFloat(String(value || '').replace('px', ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isVisibleElement = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  return computed.display !== 'none' && computed.visibility !== 'hidden' && rect.width >= 72 && rect.height >= 120;
};

const measureRightSidebarLane = () => {
  let measuredOffset = 0;

  document.querySelectorAll<HTMLElement>(SIDEBAR_SELECTOR).forEach((sidebar) => {
    if (!isVisibleElement(sidebar)) return;
    const rect = sidebar.getBoundingClientRect();
    const nearRightEdge = rect.right >= window.innerWidth - 24;
    const plausibleSidebar = rect.width >= 180 && rect.width <= 480;
    if (nearRightEdge && plausibleSidebar) {
      measuredOffset = Math.max(measuredOffset, window.innerWidth - rect.left);
    }
  });

  if (measuredOffset > 0) return measuredOffset;

  // Fallback for shell variants that do not expose a sidebar selector: find the visible
  // fixed/sticky RTL navigation lane on the visual right. This is scoped to plausible
  // navigation columns only, not arbitrary cards inside the page.
  document.querySelectorAll<HTMLElement>('aside, nav, [role="navigation"], [class*="sidebar" i], [class*="navigation" i]').forEach((candidate) => {
    if (!isVisibleElement(candidate)) return;
    const rect = candidate.getBoundingClientRect();
    const computed = window.getComputedStyle(candidate);
    const positioned = computed.position === 'fixed' || computed.position === 'sticky';
    const nearRightEdge = rect.right >= window.innerWidth - 24;
    const plausibleSidebar = rect.width >= 180 && rect.width <= 480 && rect.height >= Math.min(520, window.innerHeight * 0.55);
    if (positioned && nearRightEdge && plausibleSidebar) {
      measuredOffset = Math.max(measuredOffset, window.innerWidth - rect.left);
    }
  });

  return measuredOffset;
};

const readSidebarOffset = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  if (window.innerWidth < 1024) return 0;

  let measuredOffset = measureRightSidebarLane();

  const content = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
  if (content) {
    const contentStyle = window.getComputedStyle(content);
    measuredOffset = Math.max(
      measuredOffset,
      readCssPx(contentStyle.marginRight),
      readCssPx(contentStyle.paddingRight),
    );
  }

  const rootStyle = window.getComputedStyle(document.documentElement);
  const configuredSidebar =
    readCssPx(rootStyle.getPropertyValue('--sidebar-pill-w')) ||
    readCssPx(rootStyle.getPropertyValue('--sidebar-width')) ||
    readCssPx(rootStyle.getPropertyValue('--app-sidebar-width')) ||
    360;

  const responsiveFallback =
    window.innerWidth >= 1440 ? 360 :
    window.innerWidth >= 1280 ? 348 :
    window.innerWidth >= 1024 ? 336 :
    0;
  const safeFallback = window.innerWidth >= 1024
    ? Math.min(420, Math.max(300, configuredSidebar || responsiveFallback, responsiveFallback))
    : 0;

  return (Math.max(0, Math.min(460, measuredOffset || safeFallback)));
};

export function useSmartInsightModalCssVars(): CSSProperties {
  const [sidebarOffset, setSidebarOffset] = useState(() => readSidebarOffset());

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setSidebarOffset(readSidebarOffset()));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    const sidebar = document.querySelector<HTMLElement>(SIDEBAR_SELECTOR);
    const observer = new MutationObserver(update);
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-sidebar-collapsed', 'data-sidebar-open'],
      });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      observer.disconnect();
    };
  }, []);

  return {
    '--smart-insight-sidebar-offset': `${sidebarOffset}px`,
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: `${sidebarOffset}px`,
    width: 'auto',
    maxWidth: 'none',
    boxSizing: 'border-box',
  } as CSSProperties;
}

export function SmartInsightModalPortal({ children }: { children: ReactNode }) {
  const modalStyle = useSmartInsightModalCssVars();
  const overlayRef = useRef<HTMLElement | null>(null);
  const sidebarOffset = readCssPx(String(modalStyle.right || '0'));

  const enforceViewportContract = useCallback((overlay: HTMLElement | null) => {
    if (!overlay || typeof window === 'undefined') return;

    const viewportHeight = Math.max(320, (window.visualViewport?.height || window.innerHeight));
    const viewportWidth = Math.max(320, (window.visualViewport?.width || window.innerWidth));
    const padding = viewportWidth < 640 ? 8 : viewportWidth < 1024 ? 12 : 16;
    const laneWidth = Math.max(0, viewportWidth - sidebarOffset);
    const surface = overlay.querySelector<HTMLElement>('[data-report-modal-surface="true"]');
    const body = surface?.querySelector<HTMLElement>(':scope > [data-report-modal-body="true"]');

    overlay.style.setProperty('position', 'fixed', 'important');
    overlay.style.setProperty('inset', `0 ${sidebarOffset}px 0 0`, 'important');
    overlay.style.setProperty('width', 'auto', 'important');
    overlay.style.setProperty('height', `${viewportHeight}px`, 'important');
    overlay.style.setProperty('max-width', 'none', 'important');
    overlay.style.setProperty('box-sizing', 'border-box', 'important');
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.style.setProperty('align-items', 'center', 'important');
    overlay.style.setProperty('justify-content', 'center', 'important');
    overlay.style.setProperty('padding', `${padding}px`, 'important');
    overlay.style.setProperty('overflow', 'hidden', 'important');

    if (surface) {
      const safeWidth = Math.max(280, Math.min(1180, laneWidth - (padding * 2)));
      const safeHeight = Math.max(280, viewportHeight - (padding * 2));
      surface.style.setProperty('box-sizing', 'border-box', 'important');
      surface.style.setProperty('width', `${safeWidth}px`, 'important');
      surface.style.setProperty('max-width', '100%', 'important');
      surface.style.setProperty('height', 'auto', 'important');
      surface.style.setProperty('max-height', `${safeHeight}px`, 'important');
      surface.style.setProperty('min-width', '0', 'important');
      surface.style.setProperty('min-height', '0', 'important');
      surface.style.setProperty('margin', '0', 'important');
      surface.style.setProperty('display', 'grid', 'important');
      surface.style.setProperty('grid-template-rows', 'auto minmax(0, 1fr) auto', 'important');
      surface.style.setProperty('overflow', 'hidden', 'important');
    }

    if (body) {
      body.style.setProperty('min-width', '0', 'important');
      body.style.setProperty('min-height', '0', 'important');
      body.style.setProperty('height', 'auto', 'important');
      body.style.setProperty('max-height', 'none', 'important');
      body.style.setProperty('overflow', 'auto', 'important');
      body.style.setProperty('overscroll-behavior', 'contain', 'important');
      body.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
    }
  }, [sidebarOffset]);

  const setOverlayRef = useCallback((node: HTMLElement | null) => {
    overlayRef.current = node;
    enforceViewportContract(node);
  }, [enforceViewportContract]);

  useEffect(() => {
    const update = () => enforceViewportContract(overlayRef.current);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [enforceViewportContract]);

  const enhanceSurface = (surfaceNode: ReactElement<Record<string, unknown>>) => {
    const enhancedChildren = Children.map(surfaceNode.props.children as ReactNode, (child) => {
      if (!isValidElement<Record<string, unknown>>(child)) return child;
      const className = typeof child.props.className === 'string' ? child.props.className : '';
      const isBody = /(?:^|\s)(?:[\w-]+(?:__|-)(?:body|main)|sib211-main)(?:\s|$)/.test(className);
      return isBody
        ? cloneElement(child, { 'data-report-modal-body': 'true' })
        : child;
    });

    return cloneElement(surfaceNode, {
      'data-report-modal-surface': 'true',
      role: surfaceNode.props.role || 'dialog',
      'aria-modal': 'true',
      tabIndex: surfaceNode.props.tabIndex ?? -1,
      children: enhancedChildren,
    });
  };

  const enhancedChildren = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        ref: setOverlayRef,
        'data-report-modal-frame': 'true',
        style: { ...(children.props.style as CSSProperties || {}), ...modalStyle },
        children: Children.map(children.props.children as ReactNode, (child, index) => (
          index === 0 && isValidElement<Record<string, unknown>>(child)
            ? enhanceSurface(child)
            : child
        )),
      })
    : children;

  return (
    <PortalLayer layer="modal" className="smart-insight-modal-portal">
      {enhancedChildren}
    </PortalLayer>
  );
}
