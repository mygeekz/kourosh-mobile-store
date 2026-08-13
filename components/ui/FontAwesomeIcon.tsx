import React from 'react';
import { cn } from '../../utils/cn';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';

export interface FontAwesomeIconProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** FontAwesome metadata class, for example `fa-solid fa-chart-line`. */
  icon: FontAwesomeIconClass;
  /** Adds FontAwesome fixed-width alignment for navigation/menu rows. */
  fixedWidth?: boolean;
}

/**
 * Canonical renderer for FontAwesome metadata strings.
 *
 * Metadata registries may continue to store FontAwesome classes as strings,
 * but React surfaces should render them through this component instead of
 * repeating raw `<i className=... />` composition.
 */
const FontAwesomeIcon = React.forwardRef<HTMLElement, FontAwesomeIconProps>(
  ({ icon, fixedWidth = false, className, 'aria-label': ariaLabel, 'aria-hidden': ariaHidden, ...props }, ref) => (
    <i
      {...props}
      ref={ref}
      className={cn(icon, fixedWidth && 'fa-fw', className)}
      aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
    />
  ),
);

FontAwesomeIcon.displayName = 'FontAwesomeIcon';

export default FontAwesomeIcon;
