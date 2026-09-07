import React from 'react';
import { cn } from '../../utils/cn';

export type FormGridColumns = 1 | 2 | 3 | 4;
export type FormGridGap = 'sm' | 'md';
export type FormGridItemSpan = 1 | 2 | 3 | 4 | 'full';

export type FormGridProps = React.HTMLAttributes<HTMLDivElement> & {
  columns?: FormGridColumns;
  gap?: FormGridGap;
  align?: 'start' | 'stretch';
};

const columnClassMap: Record<FormGridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
};

const gapClassMap: Record<FormGridGap, string> = {
  sm: 'gap-2.5',
  md: 'gap-3',
};

const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(function FormGrid(
  {
    columns = 2,
    gap = 'md',
    align = 'stretch',
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      {...props}
      data-ui-form-grid="true"
      data-ui-form-grid-columns={columns}
      className={cn(
        'grid min-w-0',
        columnClassMap[columns],
        gapClassMap[gap],
        align === 'start' ? 'items-start' : 'items-stretch',
        className,
      )}
    >
      {children}
    </div>
  );
});

export type FormGridItemProps = React.HTMLAttributes<HTMLDivElement> & {
  span?: FormGridItemSpan;
};

const spanClassMap: Record<FormGridItemSpan, string> = {
  1: 'min-w-0',
  2: 'min-w-0 md:col-span-2',
  3: 'min-w-0 xl:col-span-3',
  4: 'min-w-0 xl:col-span-4',
  full: 'min-w-0 col-span-full',
};

export const FormGridItem = React.forwardRef<HTMLDivElement, FormGridItemProps>(function FormGridItem(
  { span = 1, className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} {...props} data-ui-form-grid-item="true" className={cn(spanClassMap[span], className)}>
      {children}
    </div>
  );
});

export default FormGrid;
