import { CheckCircle2, Loader2, RefreshCw, Save, Search } from 'lucide-react';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { useStyle } from '../contexts/StyleContext';
import { hasAnyRole, type RoleName } from '../utils/rbac';
import { APP_MESSAGES } from '../shared/messages';

const inferLoadingStageProgress = (loadingText?: string, loadingHint?: string) => {
  const stageText = `${loadingText ?? ''} ${loadingHint ?? ''}`.toLowerCase();

  if (/(اعتبارسنج|بررسی و ادامه|validate|validation|checking|check|جستجو)/.test(stageText)) {
    return { step: 1, total: 3 };
  }
  if (/(ثبت اطلاعات|save|saving|ذخیره تغییرات|create|creating)/.test(stageText)) {
    return { step: 2, total: 3 };
  }
  if (/(به‌روزرسان|بروزرسان|sync|refresh|همگام|نهایی|final|تازه‌ساز|تکمیل|complete)/.test(stageText)) {
    return { step: 3, total: 3 };
  }
  return { step: 1, total: 3 };
};

type ButtonVariant = 'primary' | 'success' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'neutral';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';
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
}


const resolveLoadingStageProgress = (
  loadingText?: string,
  loadingHint?: React.ReactNode,
  explicitStep?: number,
  explicitTotal?: number,
) => {
  if (typeof explicitStep === 'number' && typeof explicitTotal === 'number') {
    return { step: explicitStep, total: explicitTotal };
  }
  const hintText = typeof loadingHint === 'string' ? loadingHint : undefined;
  return inferLoadingStageProgress(loadingText, hintText);
};

const getLoadingStageIcon = (
  loadingText?: string,
  loadingHint?: React.ReactNode,
  customIcon?: React.ReactNode,
) => {
  if (customIcon) return customIcon;
  const stageText = `${loadingText ?? ''} ${typeof loadingHint === 'string' ? loadingHint : ''}`.toLowerCase();

  if (/(اعتبارسنج|بررسی و ادامه|validate|validation|checking|check|جستجو)/.test(stageText)) {
    return <Search className="h-3.5 w-3.5" />;
  }
  if (/(ثبت اطلاعات|save|saving|ذخیره تغییرات|create|creating)/.test(stageText)) {
    return <Save className="h-3.5 w-3.5" />;
  }
  if (/(به‌روزرسان|بروزرسان|sync|refresh|همگام|نهایی|final|تازه‌ساز|تکمیل|complete)/.test(stageText)) {
    return <RefreshCw className="h-3.5 w-3.5" />;
  }
  if (/(با موفقیت انجام شد|done|completed)/.test(stageText)) {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
  return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'ux-btn-primary',
  success: 'ux-btn-success',
  secondary: 'ux-btn-secondary',
  danger: 'ux-btn-danger',
  warning: 'ux-btn-warning',
  ghost: 'ux-btn-ghost',
  neutral: 'ux-btn-secondary',
};

const sizeClassMap: Record<ButtonSize, string> = {
  xs: 'ux-btn-xs',
  sm: 'ux-btn-sm',
  md: 'ux-btn-md',
  lg: 'ux-btn-lg',
  icon: 'ux-btn-xs',
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
    ...props
  },
  ref,
) {
  const { currentUser } = useAuth();
  const { style } = useStyle();
  const allowed = !requiredRoles?.length || hasAnyRole(currentUser?.roleName, requiredRoles);

  if (!allowed && permissionMode === 'hide') return null;

  const isDisabled = Boolean(disabled || loading || !allowed);
  const deniedTooltip = typeof permissionTooltip === 'function' ? permissionTooltip(currentUser?.roleName) : permissionTooltip;
  const resolvedTooltip = !allowed
    ? deniedTooltip
    : tooltip || (typeof children === 'string' ? children : undefined);

  const textLabel = typeof children === 'string' || typeof children === 'number' ? String(children) : '';
  const enableAutoIcon = autoIconProp ?? style.buttonIconMode === 'auto';

  const inferredAutoIcon = (() => {
    if (!enableAutoIcon || leftIcon || rightIcon || !children) return null;
    const normalized = textLabel.trim();
    if (/(حذف مورد|پاک|trash|delete)/i.test(normalized)) return <i className="fa-solid fa-trash" aria-hidden="true" />;
    if (/(ویرایش اطلاعات|اصلاح|edit)/i.test(normalized)) return <i className="fa-solid fa-pen-to-square" aria-hidden="true" />;
    if (/(بستن|انصراف|بازگشت|close|cancel)/i.test(normalized)) return <i className="fa-solid fa-xmark" aria-hidden="true" />;
    if (/(دانلود|download|نصب|install)/i.test(normalized)) return <i className="fa-solid fa-download" aria-hidden="true" />;
    if (/(بروزرسانی|به\s?روزرسانی|refresh|reload|sync)/i.test(normalized)) return <i className="fa-solid fa-rotate" aria-hidden="true" />;
    if (/(جستجو|فیلتر|search)/i.test(normalized)) return <i className="fa-solid fa-sliders" aria-hidden="true" />;
    if (/(چاپ|pdf|print)/i.test(normalized)) return <i className="fa-solid fa-print" aria-hidden="true" />;
    if (/(مشاهده|جزئیات|نمایش|view)/i.test(normalized)) return <i className="fa-solid fa-eye" aria-hidden="true" />;
    if (/(ارسال|بررسی و ادامه|همگام|send|run|check)/i.test(normalized)) return <i className="fa-solid fa-bolt" aria-hidden="true" />;
    if (/(ثبت اطلاعات|ذخیره تغییرات|ایجاد|افزودن مورد جدید|جدید|submit|save|create|add)/i.test(normalized)) return <i className="fa-solid fa-plus" aria-hidden="true" />;
    return null;
  })();

  const normalizeIconNode = (icon: React.ReactNode): React.ReactNode => {
    if (typeof icon !== 'string') return icon;
    const trimmed = icon.trim();
    // Some legacy call sites passed a status label (for example: پرداخت نشده) as icon.
    // Render a safe glyph instead of showing text inside the icon slot.
    if (!trimmed) return null;
    const looksLikeFaClass = /^(fa|fa-solid|fa-regular|fa-brands|fas|far|fab|fal|fad)\b/.test(trimmed) || /^fa-[a-z0-9-]+$/i.test(trimmed);
    return <i className={looksLikeFaClass ? trimmed : 'fa-solid fa-circle-dot'} aria-hidden="true" />;
  };

  const resolvedLeftIcon = normalizeIconNode(style.buttonIconSide === 'start' ? (leftIcon ?? inferredAutoIcon) : leftIcon);
  const resolvedRightIcon = normalizeIconNode(style.buttonIconSide === 'end' ? (rightIcon ?? inferredAutoIcon) : rightIcon);
  const accessibilityLabel = props['aria-label'] ?? (!children && resolvedTooltip ? resolvedTooltip : undefined);

  const loadingTone = (() => {
    switch (variant) {
      case 'primary':
        return 'success';
      case 'success':
        return 'info';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'danger';
      case 'ghost':
        return 'neutral';
      case 'secondary':
      case 'neutral':
      default:
        return 'neutral';
    }
  })();

  const stageProgress = loading
    ? resolveLoadingStageProgress(loadingText, loadingHint, loadingStageStep, loadingStageTotal)
    : null;
  const stageIcon = loading ? getLoadingStageIcon(loadingText, loadingHint, loadingStageIcon) : null;

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


  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={accessibilityLabel}
      data-loading={loading ? 'true' : undefined}
      data-tooltip={resolvedTooltip}
      data-permission-state={!allowed ? 'denied' : 'granted'}
      data-ripple={ripple ? 'true' : 'false'}
      data-ui-button="true"
      data-ui-variant={variant}
      data-ui-size={size}
      data-loading-tone={loading ? loadingTone : undefined}
      data-success-pulse={showSuccessPulse ? 'true' : undefined}
      className={cn('ux-btn app-command-button', variantClassMap[variant], sizeClassMap[size], !children ? 'ux-icon-btn app-command-button--icon-only' : '', className)}
      {...props}
    >
      <span className="ux-btn__content">
        {loading ? (
          <span className="ux-btn__spinner ux-btn__spinner--stage" aria-hidden="true">
            <span className="button-loading-stage-icon">{stageIcon}</span>
          </span>
        ) : showSuccessPulse ? (
          <span className="ux-btn__spinner ux-btn__spinner--success" aria-hidden="true">
            <span className="button-loading-stage-icon button-loading-stage-icon--success"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          </span>
        ) : resolvedLeftIcon ? <span className="ux-btn__icon">{resolvedLeftIcon}</span> : null}
        <span className={cn('ux-btn__label', (loading && loadingHint) || showSuccessPulse ? 'ux-btn__label--stacked' : undefined)}>
          <span className="ux-btn__label-main">{loading && loadingText ? loadingText : showSuccessPulse ? (successPulseText ?? APP_MESSAGES.button.completed) : children}</span>
          {loading && loadingHint ? <span className="ux-btn__hint">{loadingHint}</span> : null}
          {showSuccessPulse ? <span className="ux-btn__hint ux-btn__hint--success">{successPulseHint ?? APP_MESSAGES.button.successHint}</span> : null}
          {loading && stageProgress ? (
            <span className="ux-btn__progress-strip" aria-hidden="true">
              {Array.from({ length: Math.max(stageProgress.total, 1) }).map((_, index) => {
                const stepIndex = index + 1;
                const state =
                  stepIndex < stageProgress.step ? 'done' : stepIndex === stageProgress.step ? 'active' : 'idle';
                return <span key={stepIndex} data-state={state} className="ux-btn__progress-segment" />;
              })}
            </span>
          ) : showSuccessPulse ? (
            <span className="ux-btn__progress-strip ux-btn__progress-strip--success" aria-hidden="true">
              {[1,2,3].map((stepIndex) => (
                <span key={stepIndex} data-state="done" className="ux-btn__progress-segment" />
              ))}
            </span>
          ) : null}
        </span>
        {!loading && !showSuccessPulse && resolvedRightIcon ? <span className="ux-btn__icon">{resolvedRightIcon}</span> : null}
      </span>
    </button>
  );
});

export default Button;
