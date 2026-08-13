import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../utils/cn';
import {
  actionControlSizeClassMap,
  actionControlVariantClassMap,
  inferActionControlIcon,
  normalizeActionControlIcon,
  type ActionControlSize,
  type ActionControlVariant,
} from './actionControlContract';

export type ActionLinkProps = Omit<LinkProps, 'children'> & {
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: ActionControlVariant;
  size?: ActionControlSize;
  tooltip?: string;
  autoIcon?: boolean;
  disabled?: boolean;
  unstyled?: boolean;
};

const ActionLink = React.forwardRef<HTMLAnchorElement, ActionLinkProps>(function ActionLink(
  {
    children,
    leftIcon,
    rightIcon,
    variant = 'secondary',
    size = 'sm',
    tooltip,
    autoIcon = true,
    disabled = false,
    unstyled = false,
    className,
    onClick,
    tabIndex,
    ...props
  },
  ref,
) {
  const textLabel = typeof children === 'string' || typeof children === 'number' ? String(children) : '';
  const inferredIcon = autoIcon && !leftIcon && !rightIcon && children
    ? inferActionControlIcon(textLabel)
    : null;
  const resolvedLeftIcon = normalizeActionControlIcon(leftIcon ?? inferredIcon);
  const resolvedRightIcon = normalizeActionControlIcon(rightIcon);
  const resolvedTooltip = tooltip || props.title || (textLabel || undefined);
  const hasLabel = Boolean(children);
  const accessibilityLabel = props['aria-label'] ?? (!hasLabel ? resolvedTooltip : undefined);
  const isBareIconOnly = Boolean(unstyled && !hasLabel && (resolvedLeftIcon || resolvedRightIcon));

  return (
    <Link
      ref={ref}
      {...props}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      aria-disabled={disabled || undefined}
      aria-label={accessibilityLabel}
      tabIndex={disabled ? -1 : tabIndex}
      data-tooltip={resolvedTooltip}
      data-ui-action-link="true"
      data-ui-variant={unstyled ? undefined : variant}
      data-ui-size={unstyled ? undefined : size}
      data-ripple={unstyled ? undefined : 'true'}
      data-skip-global-button={unstyled ? 'true' : undefined}
      className={cn(
        unstyled ? 'unstyled unstyled-button inline-flex items-center justify-center' : 'ux-btn app-command-button',
        unstyled ? '' : actionControlVariantClassMap[variant],
        unstyled ? '' : actionControlSizeClassMap[size],
        !unstyled && !hasLabel ? 'ux-icon-btn app-command-button--icon-only' : '',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {isBareIconOnly ? (resolvedLeftIcon ?? resolvedRightIcon) : (
        <span className={unstyled ? 'inline-flex items-center justify-center gap-2' : 'ux-btn__content'}>
          {resolvedLeftIcon ? (
            <span
              data-ui-icon-surface="bare"
              className={unstyled
                ? 'inline-flex shrink-0 items-center justify-center leading-none !border-0 !bg-none !bg-transparent !shadow-none'
                : 'ux-btn__icon !border-0 !bg-none !bg-transparent !shadow-none'}
            >
              {resolvedLeftIcon}
            </span>
          ) : null}
          {hasLabel ? (
            <span className="ux-btn__label">
              <span className="ux-btn__label-main">{children}</span>
            </span>
          ) : null}
          {resolvedRightIcon ? (
            <span
              data-ui-icon-surface="bare"
              className={unstyled
                ? 'inline-flex shrink-0 items-center justify-center leading-none !border-0 !bg-none !bg-transparent !shadow-none'
                : 'ux-btn__icon !border-0 !bg-none !bg-transparent !shadow-none'}
            >
              {resolvedRightIcon}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
});

export default ActionLink;
