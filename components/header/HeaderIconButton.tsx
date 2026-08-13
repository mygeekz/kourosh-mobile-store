import React, { forwardRef } from 'react';
import { FontAwesomeIcon } from '@/components/ui';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';

type HeaderIconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: FontAwesomeIconClass;
  iconClassName?: string;
  content?: React.ReactNode;
  active?: boolean;
  tooltip?: string;
};

const HeaderIconButton = forwardRef<HTMLButtonElement, HeaderIconButtonProps>(({
  icon,
  iconClassName,
  content,
  active = false,
  className = '',
  type = 'button',
  title,
  tooltip,
  ...buttonProps
}, ref) => {
  const resolvedTooltip = tooltip ?? (typeof title === 'string' ? title : undefined);
  const ariaLabel = buttonProps['aria-label'] ?? resolvedTooltip;

  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      data-tooltip={resolvedTooltip}
      data-skip-global-button="true"
      data-ui-header-command="icon"
      data-active={active ? 'true' : 'false'}
      className={['app-header-icon-button', className].filter(Boolean).join(' ')}
    >
      {content ?? <FontAwesomeIcon icon={icon} className={iconClassName} />}
    </button>
  );
});

HeaderIconButton.displayName = 'HeaderIconButton';

export default HeaderIconButton;
