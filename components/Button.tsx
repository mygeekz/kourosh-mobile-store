import { CheckCircle2, Loader2 } from 'lucide-react';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { hasAnyRole, type RoleName } from '../utils/rbac';
import { APP_MESSAGES } from '../shared/messages';
import {
  actionControlSizeClassMap,
  actionControlVariantClassMap,
  inferActionControlIcon,
  normalizeActionControlIcon,
  type ActionControlSize,
  type ActionControlVariant,
} from './ui/actionControlContract';

export type ButtonVariant = ActionControlVariant;
export type ButtonSize = ActionControlSize;
type PermissionMode = 'disable' | 'hide';
type PermissionReason = string | ((roleName?: RoleName | null) => string);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tooltip?: string;
  loading?: boolean;
  loadingText?: string;
  loadingHint?: React.ReactNode;
  loadingStageIcon?: React.ReactNode;
  loadingStageStep?: number;
  loadingStageTotal?: number;
  successPulseText?: React.ReactNode;
  successPulseHint?: React.ReactNode;
  successPulseDuration?: number;
  requiredRoles?: RoleName[];
  permissionMode?: PermissionMode;
  permissionTooltip?: PermissionReason;
  ripple?: boolean;
  autoIcon?: boolean;
  unstyled?: boolean;
}

const clampProgress = (step?: number, total?: number) => {
  if (!Number.isFinite(step) || !Number.isFinite(total) || Number(total) <= 0) return null;
  return Math.min(1, Math.max(0, Number(step) / Number(total)));
};

const loadingHostCounts = new WeakMap<HTMLElement, number>();

const applyImportantStyles = (
  element: HTMLElement | null,
  styles: Record<string, string>,
) => {
  if (!element) return () => undefined;
  const snapshot = Object.keys(styles).map((property) => ({
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }));
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value, 'important');
  }
  return () => {
    for (const item of snapshot) {
      if (item.value) element.style.setProperty(item.property, item.value, item.priority);
      else element.style.removeProperty(item.property);
    }
  };
};

const getOuterWidth = (element: Element) => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const marginStart = Number.parseFloat(style.marginInlineStart || '0') || 0;
  const marginEnd = Number.parseFloat(style.marginInlineEnd || '0') || 0;
  return rect.width + marginStart + marginEnd;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    leftIcon,
    rightIcon,
    variant = 'primary',
    size = 'md',
    className,
    type = 'button',
    tooltip,
    loading = false,
    loadingText,
    loadingHint,
    loadingStageIcon,
    loadingStageStep,
    loadingStageTotal,
    successPulseText,
    successPulseHint,
    successPulseDuration = 1600,
    disabled,
    requiredRoles,
    permissionMode = 'disable',
    permissionTooltip = APP_MESSAGES.button.permissionDenied,
    ripple = true,
    autoIcon: autoIconProp,
    unstyled = false,
    style,
    ...props
  },
  forwardedRef,
) {
  const { currentUser } = useAuth();
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const measurementRef = React.useRef<HTMLSpanElement | null>(null);
  const stateContentRef = React.useRef<HTMLSpanElement | null>(null);
  const stateCopyRef = React.useRef<HTMLSpanElement | null>(null);
  const stateMainRef = React.useRef<HTMLSpanElement | null>(null);
  const stateHintRef = React.useRef<HTMLSpanElement | null>(null);
  const stateTrackRef = React.useRef<HTMLSpanElement | null>(null);
  const stateRunnerRef = React.useRef<HTMLSpanElement | null>(null);

  const setButtonRef = React.useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const allowed = !requiredRoles?.length || hasAnyRole(currentUser?.roleName, requiredRoles);
  if (!allowed && permissionMode === 'hide') return null;

  const isDisabled = Boolean(disabled || loading || !allowed);
  const deniedTooltip = typeof permissionTooltip === 'function' ? permissionTooltip(currentUser?.roleName) : permissionTooltip;
  const resolvedTooltip = !allowed
    ? deniedTooltip
    : tooltip || (typeof children === 'string' ? children : undefined);

  const textLabel = typeof children === 'string' || typeof children === 'number' ? String(children) : '';
  const enableAutoIcon = autoIconProp ?? true;

  const inferredAutoIcon = enableAutoIcon && !leftIcon && !rightIcon && children
    ? inferActionControlIcon(textLabel)
    : null;

  const resolvedLeftIcon = normalizeActionControlIcon(leftIcon ?? inferredAutoIcon);
  const resolvedRightIcon = normalizeActionControlIcon(rightIcon);
  const accessibilityLabel = props['aria-label'] ?? (!children && resolvedTooltip ? resolvedTooltip : undefined);
  const explicitProgress = clampProgress(loadingStageStep, loadingStageTotal);
  const isCompactLoader = size === 'tableIcon' || (size === 'icon' && !loadingText && !loadingHint);

  const [showSuccessPulse, setShowSuccessPulse] = React.useState(false);
  const prevLoadingRef = React.useRef(loading);

  React.useEffect(() => {
    let timeoutId: number | undefined;
    const shouldShowSuccessPulse = Boolean(successPulseText || successPulseHint);

    if (loading) {
      setShowSuccessPulse(false);
    } else if (prevLoadingRef.current && shouldShowSuccessPulse) {
      setShowSuccessPulse(true);
      timeoutId = window.setTimeout(() => setShowSuccessPulse(false), successPulseDuration);
    } else if (!shouldShowSuccessPulse) {
      setShowSuccessPulse(false);
    }

    prevLoadingRef.current = loading;
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [loading, successPulseDuration, successPulseHint, successPulseText]);

  const stateActive = (loading || showSuccessPulse) && !unstyled && !isCompactLoader;
  const stateLabel = loading
    ? (loadingText ?? children ?? APP_MESSAGES.toast.loading)
    : (successPulseText ?? APP_MESSAGES.button.completed);
  // Secondary copy is opt-in. Injecting a generic success hint made short
  // operational buttons unexpectedly grow into large two-line pills.
  const stateHint = loading ? loadingHint : successPulseHint;
  const stateIcon = loading
    ? (loadingStageIcon ?? <Loader2 className="ux-btn__state-spinner h-4 w-4" />)
    : <CheckCircle2 className="h-4 w-4" />;
  const shouldRenderStateHint = Boolean(stateHint);

  React.useLayoutEffect(() => {
    const button = buttonRef.current;
    const parent = button?.parentElement;
    if (!button || !parent || !stateActive) return undefined;

    const parentStyle = window.getComputedStyle(parent);
    const directButtons = Array.from(parent.children).filter((child) => child instanceof HTMLButtonElement);
    const classSignal = `${parent.className || ''}`;
    const isActionHost = directButtons.length > 0 && (
      parentStyle.display.includes('flex')
      || parentStyle.display.includes('grid')
      || /(action|actions|footer|command|submit|savebar|toolbar|sticky|buttons|controls|operations)/i.test(classSignal)
    );

    loadingHostCounts.set(parent, (loadingHostCounts.get(parent) ?? 0) + 1);
    parent.dataset.loadingButtonHost = isActionHost ? 'actions' : 'content';
    parent.dataset.loadingButtonHostLayout = parentStyle.display.includes('grid')
      ? 'grid'
      : parentStyle.display.includes('flex')
        ? 'flex'
        : 'block';
    button.dataset.loadingHostMode = isActionHost ? 'actions' : 'content';

    // Loading is a canonical interaction state, not a shrunken version of the
    // idle button. Text buttons use one readable visual contract everywhere;
    // only icon/tableIcon buttons keep the compact spinner path.
    const sizeContract = size === 'lg'
      ? { minHeight: '52px', fontSize: '.9rem', paddingBlock: '.72rem', paddingInline: '1.28rem', minInlineSize: '14rem' }
      : size === 'xs'
        ? { minHeight: '44px', fontSize: '.78rem', paddingBlock: '.58rem', paddingInline: '.96rem', minInlineSize: '9.5rem' }
        : { minHeight: '48px', fontSize: '.84rem', paddingBlock: '.64rem', paddingInline: '1.12rem', minInlineSize: '12rem' };

    const restoreStyles = [
      applyImportantStyles(button, {
        opacity: '1',
        filter: 'none',
        '-webkit-filter': 'none',
        cursor: loading ? 'progress' : 'default',
        'min-height': sizeContract.minHeight,
        'min-inline-size': `min(100%, ${sizeContract.minInlineSize})`,
        'max-height': 'none',
        height: 'auto',
        'padding-block': sizeContract.paddingBlock,
        'padding-inline': sizeContract.paddingInline,
        'border-radius': 'var(--ux-btn-radius, var(--btn-radius, 18px))',
        'white-space': 'normal',
        overflow: 'hidden',
        'font-size': sizeContract.fontSize,
        'line-height': '1.25',
        transform: 'none',
      }),
      applyImportantStyles(stateContentRef.current, {
        display: 'inline-flex',
        width: '100%',
        'min-width': '0',
        'max-width': '100%',
        'align-items': 'center',
        'justify-content': 'center',
        overflow: 'visible',
        'white-space': 'normal',
        gap: 'clamp(.48rem, 1.5vw, .7rem)',
      }),
      applyImportantStyles(stateCopyRef.current, {
        display: 'inline-flex',
        width: '100%',
        'min-width': '0',
        'max-width': '100%',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        gap: '.24rem',
        overflow: 'visible',
        'white-space': 'normal',
        'text-align': 'center',
      }),
      applyImportantStyles(stateMainRef.current, {
        display: 'block',
        'min-width': '0',
        'max-width': '100%',
        overflow: 'visible',
        'text-overflow': 'clip',
        'white-space': 'normal',
        'overflow-wrap': 'anywhere',
        color: 'inherit',
        'font-size': '1em',
        'font-weight': '900',
        'line-height': '1.35',
        'text-align': 'center',
      }),
      applyImportantStyles(stateHintRef.current, {
        display: 'block',
        'min-width': '0',
        'max-width': 'min(100%, 34ch)',
        overflow: 'visible',
        'text-overflow': 'clip',
        'white-space': 'normal',
        'overflow-wrap': 'anywhere',
        color: 'inherit',
        'font-size': '.72em',
        'font-weight': '750',
        'line-height': '1.4',
        opacity: '.8',
        'text-align': 'center',
      }),
      applyImportantStyles(stateTrackRef.current, {
        position: 'relative',
        display: 'block',
        width: 'min(100%, 11rem)',
        'min-width': 'min(6rem, 100%)',
        height: '.3rem',
        margin: '.3rem auto 0',
        overflow: 'hidden',
        'border-radius': '999px',
        direction: 'ltr',
        background: 'color-mix(in srgb, currentColor 24%, transparent)',
        color: 'inherit',
        opacity: '1',
        isolation: 'isolate',
      }),
      applyImportantStyles(stateRunnerRef.current, {
        position: 'absolute',
        display: 'block',
        'inset-block': '0',
        'inset-inline-start': '0',
        width: explicitProgress === null ? '42%' : '100%',
        'border-radius': 'inherit',
        background: 'currentColor',
        color: 'inherit',
        opacity: '.96',
        'transform-origin': 'left center',
      }),
      isActionHost && parentStyle.display.includes('flex')
        ? applyImportantStyles(parent, { 'flex-wrap': 'wrap', 'row-gap': 'max(8px, .5rem)' })
        : () => undefined,
    ];

    return () => {
      for (const restore of restoreStyles.reverse()) restore();
      delete button.dataset.loadingHostMode;
      delete button.dataset.loadingDedicatedRow;
      button.style.removeProperty('grid-column');
      button.style.removeProperty('flex-basis');
      button.style.removeProperty('inline-size');
      button.style.removeProperty('width');

      const remaining = Math.max(0, (loadingHostCounts.get(parent) ?? 1) - 1);
      if (remaining === 0) {
        loadingHostCounts.delete(parent);
        delete parent.dataset.loadingButtonHost;
        delete parent.dataset.loadingButtonHostLayout;
      } else {
        loadingHostCounts.set(parent, remaining);
      }
    };
  }, [explicitProgress, loading, size, stateActive]);

  const updateAdaptiveWidth = React.useCallback(() => {
    const button = buttonRef.current;
    const measurement = measurementRef.current;
    if (!button || !measurement || !stateActive) return;

    const buttonStyle = window.getComputedStyle(button);
    const padding = (Number.parseFloat(buttonStyle.paddingInlineStart || '0') || 0)
      + (Number.parseFloat(buttonStyle.paddingInlineEnd || '0') || 0);
    const intrinsicContentWidth = Math.ceil(measurement.getBoundingClientRect().width + padding + 2);
    const canonicalMinWidth = size === 'lg' ? 224 : size === 'xs' ? 152 : 192;
    const measuredContentWidth = Math.max(intrinsicContentWidth, canonicalMinWidth);
    const viewportAvailable = Math.max(0, document.documentElement.clientWidth - 24);
    const currentWidth = button.getBoundingClientRect().width;
    let available = viewportAvailable;
    const parent = button.parentElement;

    if (parent) {
      const parentStyle = window.getComputedStyle(parent);
      const parentInnerWidth = Math.max(
        0,
        parent.clientWidth
          - (Number.parseFloat(parentStyle.paddingInlineStart || '0') || 0)
          - (Number.parseFloat(parentStyle.paddingInlineEnd || '0') || 0),
      );
      available = Math.min(available, parentInnerWidth || available);

      const isActionHost = button.dataset.loadingHostMode === 'actions';
      const needsMoreRoom = measuredContentWidth > currentWidth + 8;
      const isCompactViewport = window.matchMedia('(max-width: 640px)').matches;
      // Stateful action buttons need a dedicated row on compact screens even
      // when the first measurement happens before the modal/grid settles.
      // This keeps Restore and other long operational labels identical to the
      // style laboratory instead of leaving them trapped in a half-width cell.
      const canOwnDedicatedRow = isActionHost && (needsMoreRoom || isCompactViewport);

      if (parentStyle.display.includes('grid')) {
        if (canOwnDedicatedRow) {
          available = Math.min(available, parentInnerWidth || available);
          button.dataset.loadingDedicatedRow = 'true';
          button.style.setProperty('grid-column', '1 / -1', 'important');
          button.style.setProperty('inline-size', '100%', 'important');
        } else {
          available = Math.min(available, Math.max(96, currentWidth));
          delete button.dataset.loadingDedicatedRow;
          button.style.removeProperty('grid-column');
          button.style.removeProperty('inline-size');
        }
      }

      if (parentStyle.display.includes('flex')) {
        if (canOwnDedicatedRow) {
          available = Math.min(available, parentInnerWidth || available);
          button.dataset.loadingDedicatedRow = 'true';
          button.style.setProperty('flex-basis', '100%', 'important');
          button.style.setProperty('inline-size', '100%', 'important');
        } else if (parentStyle.flexWrap === 'nowrap') {
          const siblings = Array.from(parent.children).filter((child) => child !== button);
          const siblingWidth = siblings.reduce((sum, child) => sum + getOuterWidth(child), 0);
          const gap = Number.parseFloat(parentStyle.columnGap || parentStyle.gap || '0') || 0;
          available = Math.min(available, Math.max(96, parentInnerWidth - siblingWidth - (gap * siblings.length)));
          delete button.dataset.loadingDedicatedRow;
          button.style.removeProperty('flex-basis');
          button.style.removeProperty('inline-size');
        } else {
          delete button.dataset.loadingDedicatedRow;
          button.style.removeProperty('flex-basis');
          button.style.removeProperty('inline-size');
        }
      }
    }

    const targetWidth = Math.min(measuredContentWidth, available);
    button.style.setProperty('min-inline-size', `${Math.max(Math.min(currentWidth, available), targetWidth)}px`, 'important');
    button.style.setProperty('max-inline-size', `${available}px`, 'important');
    button.dataset.loadingWrap = measuredContentWidth > available + 1 ? 'true' : 'false';
  }, [size, stateActive, stateHint, stateIcon, stateLabel]);

  React.useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button || !stateActive) {
      button?.style.removeProperty('min-inline-size');
      button?.style.removeProperty('max-inline-size');
      button?.style.removeProperty('grid-column');
      button?.style.removeProperty('flex-basis');
      button?.style.removeProperty('inline-size');
      button?.style.removeProperty('width');
      if (button) {
        delete button.dataset.loadingWrap;
        delete button.dataset.loadingDedicatedRow;
      }
      return undefined;
    }

    let disposed = false;
    const frame = window.requestAnimationFrame(updateAdaptiveWidth);
    const parent = button.parentElement;
    const measurement = measurementRef.current;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateAdaptiveWidth) : null;
    if (measurement) observer?.observe(measurement);
    if (parent) observer?.observe(parent);
    window.addEventListener('resize', updateAdaptiveWidth);
    document.fonts?.ready.then(() => {
      if (!disposed) updateAdaptiveWidth();
    }).catch(() => undefined);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', updateAdaptiveWidth);
      button.style.removeProperty('min-inline-size');
      button.style.removeProperty('max-inline-size');
      button.style.removeProperty('grid-column');
      button.style.removeProperty('flex-basis');
      button.style.removeProperty('inline-size');
      button.style.removeProperty('width');
      delete button.dataset.loadingWrap;
      delete button.dataset.loadingDedicatedRow;
    };
  }, [stateActive, updateAdaptiveWidth]);

  const hasLabelContent = Boolean(
    children
    || (loading && (loadingText || loadingHint))
    || (showSuccessPulse && (successPulseText || successPulseHint)),
  );
  const isBareIconOnly = Boolean(
    unstyled
    && !hasLabelContent
    && !loading
    && !showSuccessPulse
    && (resolvedLeftIcon || resolvedRightIcon),
  );

  const renderStateTrack = (mode: 'loading' | 'success') => (
    <span
      ref={stateTrackRef}
      className={cn('ux-btn__loading-track', mode === 'success' && 'ux-btn__loading-track--success')}
      data-progress-mode={mode === 'loading' && explicitProgress !== null ? 'determinate' : mode === 'success' ? 'complete' : 'indeterminate'}
      aria-hidden="true"
    >
      <span
        ref={stateRunnerRef}
        className="ux-btn__loading-runner"
        style={mode === 'loading' && explicitProgress !== null ? { transform: `scaleX(${explicitProgress})` } : undefined}
      />
    </span>
  );

  return (
    <button
      ref={setButtonRef}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={accessibilityLabel}
      data-loading={loading ? 'true' : undefined}
      data-tooltip={resolvedTooltip}
      data-permission-state={!allowed ? 'denied' : 'granted'}
      data-ripple={ripple ? 'true' : 'false'}
      data-ui-button={unstyled ? undefined : 'true'}
      data-ui-variant={unstyled ? undefined : variant}
      data-ui-size={unstyled ? undefined : size}
      data-skip-global-button={unstyled ? 'true' : undefined}
      data-loading-layout={stateActive ? 'adaptive' : isCompactLoader && loading ? 'compact' : undefined}
      data-loading-contract={stateActive ? 'canonical-v2' : undefined}
      data-loading-progress={loading ? (explicitProgress === null ? 'indeterminate' : 'determinate') : undefined}
      data-success-pulse={showSuccessPulse && !isCompactLoader ? 'true' : undefined}
      className={cn(
        unstyled ? 'unstyled unstyled-button inline-flex items-center justify-center' : 'ux-btn app-command-button',
        unstyled ? '' : actionControlVariantClassMap[variant],
        unstyled ? '' : actionControlSizeClassMap[size],
        !unstyled && !children ? 'ux-icon-btn app-command-button--icon-only' : '',
        className,
      )}
      style={style}
      {...props}
    >
      {stateActive ? (
        <span ref={measurementRef} className="ux-btn__intrinsic-measure" aria-hidden="true">
          {stateIcon ? <span className="ux-btn__state-icon">{stateIcon}</span> : null}
          <span className="ux-btn__state-copy">
            <span className="ux-btn__state-main">{stateLabel}</span>
            {shouldRenderStateHint ? <span className="ux-btn__state-hint">{stateHint}</span> : null}
            <span className="ux-btn__loading-track"><span className="ux-btn__loading-runner" /></span>
          </span>
        </span>
      ) : null}

      {isBareIconOnly ? (resolvedLeftIcon ?? resolvedRightIcon) : (
        <span ref={stateActive ? stateContentRef : undefined} className={cn('ux-btn__content', stateActive && 'ux-btn__content--state')}>
          {loading ? (
            isCompactLoader ? (
              <span className="ux-btn__spinner ux-btn__spinner--compact" aria-hidden="true">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            ) : (
              <>
                {stateIcon ? <span className="ux-btn__state-icon" aria-hidden="true">{stateIcon}</span> : null}
                <span ref={stateCopyRef} className="ux-btn__state-copy" aria-live="polite">
                  <span ref={stateMainRef} className="ux-btn__state-main">{stateLabel}</span>
                  {shouldRenderStateHint ? <span ref={stateHintRef} className="ux-btn__state-hint">{stateHint}</span> : null}
                  {renderStateTrack('loading')}
                </span>
              </>
            )
          ) : showSuccessPulse ? (
            isCompactLoader ? (
              <span className="ux-btn__spinner ux-btn__spinner--compact" aria-hidden="true">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : (
              <>
                <span className="ux-btn__state-icon ux-btn__state-icon--success" aria-hidden="true">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span ref={stateCopyRef} className="ux-btn__state-copy" aria-live="polite">
                  <span ref={stateMainRef} className="ux-btn__state-main">{stateLabel}</span>
                  {shouldRenderStateHint ? <span ref={stateHintRef} className="ux-btn__state-hint">{stateHint}</span> : null}
                  {renderStateTrack('success')}
                </span>
              </>
            )
          ) : (
            <>
              {resolvedLeftIcon ? (
                <span data-ui-icon-surface="bare" className={unstyled ? 'inline-flex shrink-0 items-center justify-center leading-none !bg-none !bg-transparent !shadow-none' : 'ux-btn__icon !border-0 !bg-none !bg-transparent !shadow-none'}>
                  {resolvedLeftIcon}
                </span>
              ) : null}
              {hasLabelContent ? (
                <span className="ux-btn__label">
                  <span className="ux-btn__label-main">{children}</span>
                </span>
              ) : null}
              {resolvedRightIcon ? (
                <span data-ui-icon-surface="bare" className={unstyled ? 'inline-flex shrink-0 items-center justify-center leading-none !bg-none !bg-transparent !shadow-none' : 'ux-btn__icon !border-0 !bg-none !bg-transparent !shadow-none'}>
                  {resolvedRightIcon}
                </span>
              ) : null}
            </>
          )}
        </span>
      )}
    </button>
  );
});

export default Button;
