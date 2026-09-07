import React from 'react';
import { cn } from '../../utils/cn';

export type BidiContentKind = 'auto' | 'text' | 'phone' | 'imei' | 'serial' | 'code' | 'email' | 'url' | 'number' | 'currency';

export const resolveBidiDirection = (kind: BidiContentKind = 'auto'): 'rtl' | 'ltr' | 'auto' => {
  if (kind === 'text') return 'rtl';
  if (kind === 'auto') return 'auto';
  return 'ltr';
};

export type BidiTextProps = Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'dir'> & {
  children: React.ReactNode;
  kind?: BidiContentKind;
  dir?: 'rtl' | 'ltr' | 'auto';
  isolate?: boolean;
};

export default function BidiText({
  children,
  kind = 'auto',
  dir,
  isolate = true,
  className,
  ...props
}: BidiTextProps) {
  const resolvedDir = dir ?? resolveBidiDirection(kind);
  const classNames = cn(
    'min-w-0',
    resolvedDir === 'ltr' ? 'tabular-nums' : '',
    className,
  );

  if (isolate) {
    return (
      <bdi {...props} dir={resolvedDir} data-ui-bidi="true" data-ui-bidi-kind={kind} className={classNames}>
        {children}
      </bdi>
    );
  }

  return (
    <span {...props} dir={resolvedDir} data-ui-bidi="true" data-ui-bidi-kind={kind} className={classNames}>
      {children}
    </span>
  );
}
