import React, { forwardRef } from 'react';

import { cn } from '../../utils/cn';

export type SurfaceMaterial = 'default' | 'glass';
export type GlassSurfaceVariant = 'panel' | 'subtle' | 'bar' | 'modal' | 'auth';
export type GlassSurfaceScheme = 'dark' | 'adaptive';

const darkGlassClasses: Record<GlassSurfaceVariant, string> = {
  panel: [
    '[&&]:!border [&&]:!border-white/25',
    '[&&]:!bg-[linear-gradient(155deg,rgba(255,255,255,0.105)_0%,rgba(255,255,255,0.045)_34%,rgba(7,9,18,0.34)_100%)]',
    '[&&]:!shadow-[0_44px_110px_-34px_rgba(0,0,0,0.94),0_18px_46px_-24px_rgba(25,20,48,0.82),0_0_0_1px_rgba(255,255,255,0.055),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(255,255,255,0.055)]',
    '[&&]:!backdrop-blur-[27px] [&&]:!backdrop-saturate-[1.26]',
  ].join(' '),
  subtle: [
    '[&&]:!border [&&]:!border-white/15',
    '[&&]:!bg-slate-950/80',
    '[&&]:!shadow-[0_24px_56px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.11)]',
    '[&&]:!backdrop-blur-xl [&&]:!backdrop-saturate-[1.25]',
  ].join(' '),
  bar: [
    '[&&]:!border [&&]:!border-white/20',
    '[&&]:!bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.028))]',
    '[&&]:!shadow-[0_20px_52px_-32px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.14)]',
    '[&&]:!backdrop-blur-xl [&&]:!backdrop-saturate-[1.2]',
  ].join(' '),
  modal: [
    '[&&]:!rounded-[26px] [&&]:!border [&&]:!border-white/20',
    '[&&]:!bg-[linear-gradient(155deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.05)_36%,rgba(7,9,18,0.5)_100%)]',
    '[&&]:!shadow-[0_46px_120px_-42px_rgba(0,0,0,0.92),0_22px_54px_-34px_rgba(25,20,48,0.7),inset_0_1px_0_rgba(255,255,255,0.28)]',
    '[&&]:!backdrop-blur-[30px] [&&]:!backdrop-saturate-[1.24]',
  ].join(' '),
  auth: [
    '[&&]:!rounded-[28px] [&&]:!border [&&]:!border-white/15',
    '[&&]:!bg-[linear-gradient(155deg,rgba(15,18,31,0.98)_0%,rgba(8,10,19,0.97)_52%,rgba(4,5,10,0.99)_100%)]',
    '[&&]:!shadow-[0_42px_110px_-40px_rgba(0,0,0,0.96),0_18px_44px_-30px_rgba(17,14,34,0.72),inset_0_1px_0_rgba(255,255,255,0.12)]',
    '[&&]:!backdrop-blur-[24px] [&&]:!backdrop-saturate-[1.12]',
  ].join(' '),
};

const adaptiveGlassClasses: Record<GlassSurfaceVariant, string> = {
  panel: [
    '[&&]:!border [&&]:!border-[var(--ds-border-subtle)]',
    '[&&]:!bg-[var(--ds-surface-card)]',
    '[&&]:!text-[var(--ds-text-primary)]',
    '[&&]:!shadow-[var(--ds-shadow-card)]',
    '[&&]:!backdrop-blur-none [&&]:!backdrop-saturate-100',
  ].join(' '),
  subtle: [
    '[&&]:!border [&&]:!border-[var(--ds-border-subtle)]',
    '[&&]:!bg-[var(--ds-surface-card-muted)]',
    '[&&]:!text-[var(--ds-text-primary)]',
    '[&&]:!shadow-none',
    '[&&]:!backdrop-blur-none [&&]:!backdrop-saturate-100',
  ].join(' '),
  bar: [
    '[&&]:!border [&&]:!border-[var(--ds-border-subtle)]',
    '[&&]:!bg-[var(--ds-surface-card)]',
    '[&&]:!text-[var(--ds-text-primary)]',
    '[&&]:!shadow-[var(--ds-shadow-card)]',
    '[&&]:!backdrop-blur-none [&&]:!backdrop-saturate-100',
  ].join(' '),
  modal: [
    '[&&]:!rounded-[26px] [&&]:!border [&&]:!border-[var(--ds-border-strong)]',
    '[&&]:!bg-[var(--ds-surface-elevated)]',
    '[&&]:!text-[var(--ds-text-primary)]',
    '[&&]:!shadow-[var(--ds-shadow-popover)]',
    '[&&]:!backdrop-blur-none [&&]:!backdrop-saturate-100',
  ].join(' '),
  auth: [
    '[&&]:!rounded-[28px] [&&]:!border [&&]:!border-white/15',
    '[&&]:!bg-[linear-gradient(155deg,rgba(15,18,31,0.98)_0%,rgba(8,10,19,0.97)_52%,rgba(4,5,10,0.99)_100%)]',
    '[&&]:!shadow-[0_42px_110px_-40px_rgba(0,0,0,0.96),0_18px_44px_-30px_rgba(17,14,34,0.72),inset_0_1px_0_rgba(255,255,255,0.12)]',
    '[&&]:!backdrop-blur-[24px] [&&]:!backdrop-saturate-[1.12]',
  ].join(' '),
};

const darkDecorationTop = [
  'pointer-events-none absolute inset-0',
  'bg-[linear-gradient(145deg,rgba(255,255,255,0.24),rgba(255,255,255,0.035)_30%,transparent_58%)]',
  'opacity-70 mix-blend-screen',
].join(' ');

const darkDecorationBottom = [
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(58%_82%_at_50%_118%,rgba(126,102,255,0.13),transparent_72%)]',
  'opacity-80 mix-blend-screen',
].join(' ');

const adaptiveDecorationTop = [
  'pointer-events-none absolute inset-0',
  'bg-[linear-gradient(145deg,rgba(255,255,255,0.62),rgba(255,255,255,0.12)_32%,transparent_58%)]',
  'opacity-[0.55] dark:opacity-[0.07]',
].join(' ');

const adaptiveDecorationBottom = [
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(64%_76%_at_50%_118%,rgba(99,102,241,0.09),transparent_74%)]',
  'opacity-60 dark:opacity-30',
].join(' ');

export const glassControlClasses = {
  shell: [
    '[--ds-control-bg:transparent]',
    '[--ds-control-border:transparent]',
    '[--ds-control-fg:rgba(255,255,255,0.96)]',
    '[--ds-control-muted:rgba(226,232,240,0.62)]',
    '[--ds-control-shadow:none]',
    '[--ds-focus-border:rgba(255,255,255,0.42)]',
    '[--ds-focus-ring:rgba(255,255,255,0.08)]',
    '[--app-field-bg:transparent]',
    '[--app-field-border:transparent]',
    '[--app-field-text:rgba(255,255,255,0.96)]',
    '[--app-field-muted:rgba(226,232,240,0.62)]',
    '[--app-field-focus:rgba(255,255,255,0.16)]',
    '[--ux-control-bg:transparent]',
    '[--ux-control-border:transparent]',
    '[--ux-control-fg:rgba(255,255,255,0.96)]',
    '[--ux-control-muted:rgba(226,232,240,0.62)]',
    '[--ux-control-shadow:none]',
    '[--ux-control-focus:rgba(255,255,255,0.16)]',
    '[--ux-control-icon-border:transparent]',
    '[--ux-control-icon-bg:transparent]',
    '[--ux-control-icon-fg:rgba(226,232,240,0.72)]',
    '[--ux-control-icon-shadow:none]',
  ].join(' '),
  controlWrap: [
    'isolate overflow-hidden rounded-[29px] border border-white/20',
    'bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]',
    'shadow-[0_30px_68px_-34px_rgba(0,0,0,0.98),0_14px_30px_-24px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.17),inset_0_-1px_0_rgba(255,255,255,0.035)]',
    'backdrop-blur-[20px] backdrop-saturate-[1.32]',
    'transition-[border-color,box-shadow,background-color] duration-200',
    'hover:border-white/30',
    'has-[:focus]:border-white/45',
    'has-[:focus]:shadow-[0_34px_78px_-34px_rgba(0,0,0,1),0_16px_36px_-22px_rgba(0,0,0,0.96),0_0_0_3px_rgba(255,255,255,0.065),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(255,255,255,0.045)]',
  ].join(' '),
  label: '!text-white/75',
  icon: '!border-0 !bg-transparent !bg-none !text-slate-200/70 !shadow-none',
  input: [
    'appearance-none !border-0 !bg-transparent !bg-none !text-white !shadow-none !outline-none !ring-0',
    'placeholder:!text-slate-200/60 placeholder:!opacity-100',
    '[&:-webkit-autofill]:!shadow-[inset_0_0_0_1000px_transparent]',
    '[&:-webkit-autofill]:[-webkit-text-fill-color:rgba(255,255,255,0.97)]',
    '[&:-webkit-autofill]:[-webkit-background-clip:text]',
    '[&:-webkit-autofill]:[background-clip:text]',
    '[&:-webkit-autofill]:[transition:background-color_999999s_ease-out_0s]',
    '[&::-ms-reveal]:hidden [&::-ms-clear]:hidden',
  ].join(' '),
} as const;

export type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  surface?: SurfaceMaterial;
  variant?: GlassSurfaceVariant;
  scheme?: GlassSurfaceScheme;
  contentClassName?: string;
  wrapContent?: boolean;
};

const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  {
    surface = 'default',
    variant = 'panel',
    scheme = 'dark',
    className,
    contentClassName,
    wrapContent = true,
    children,
    ...props
  },
  ref,
) {
  const isGlass = surface === 'glass';
  const materialClasses = scheme === 'adaptive' ? adaptiveGlassClasses : darkGlassClasses;
  const decorationTop = scheme === 'adaptive' ? adaptiveDecorationTop : darkDecorationTop;
  const decorationBottom = scheme === 'adaptive' ? adaptiveDecorationBottom : darkDecorationBottom;
  const showDecoration = isGlass && variant === 'auth';

  return (
    <div
      {...props}
      ref={ref}
      data-ui-material={surface}
      data-ui-material-variant={isGlass ? variant : undefined}
      data-ui-material-scheme={isGlass ? scheme : undefined}
      className={cn(
        'relative isolate min-w-0',
        isGlass ? 'overflow-hidden' : '',
        isGlass ? materialClasses[variant] : '',
        className,
      )}
    >
      {showDecoration ? <span aria-hidden="true" className={decorationTop} /> : null}
      {showDecoration ? <span aria-hidden="true" className={decorationBottom} /> : null}
      {wrapContent ? <div className={cn('relative z-10 min-w-0', contentClassName)}>{children}</div> : children}
    </div>
  );
});

export default Surface;
