import React from 'react';

import { cn } from '../../utils/cn';

export type TableDensity = 'compact' | 'comfortable';
export type TableLayout = 'auto' | 'fixed' | 'managed';
export type TableMode = 'runtime' | 'print';

export type TableViewportProps = React.HTMLAttributes<HTMLDivElement> & {
  ariaLabel?: string;
  focusable?: boolean;
};

/**
 * Canonical overflow/keyboard boundary for every runtime data table.
 * The viewport owns horizontal scrolling; the table owns only tabular layout.
 */
export const TableViewport = React.forwardRef<HTMLDivElement, TableViewportProps>(function TableViewport(
  {
    ariaLabel,
    focusable = true,
    className,
    children,
    role = 'region',
    tabIndex,
    ...props
  },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      role={role}
      aria-label={ariaLabel}
      tabIndex={tabIndex ?? (focusable ? 0 : undefined)}
      className={cn('min-w-0 max-w-full overflow-x-auto overscroll-x-contain', className)}
      data-ui-table-viewport="true"
      data-ui-table-responsive="scroll"
    >
      {children}
    </div>
  );
});

export type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  density?: TableDensity;
  layout?: TableLayout;
  mode?: TableMode;
  minWidthClassName?: string;
};

/**
 * Canonical semantic table primitive. Runtime tables publish one data contract
 * so Design System CSS can style them without global `table {}` selectors.
 */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  {
    density = 'comfortable',
    layout = 'auto',
    mode = 'runtime',
    minWidthClassName,
    className,
    dir = 'rtl',
    children,
    ...props
  },
  ref,
) {
  return (
    <table
      {...props}
      ref={ref}
      dir={dir}
      data-ui-table={mode === 'print' ? 'print' : 'true'}
      data-ui-table-density={density}
      data-ui-table-layout={layout}
      className={cn(
        'w-full border-collapse text-xs',
        layout === 'fixed' && 'table-fixed',
        minWidthClassName,
        className,
      )}
    >
      {children}
    </table>
  );
});

export default Table;
