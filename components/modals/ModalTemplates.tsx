import React, { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type SectionProps = React.HTMLAttributes<HTMLElement>;

export type ModalTemplateTone = 'neutral' | 'success' | 'accent' | 'warning' | 'danger' | 'info';

export function ModalTemplateForm({ className, children, dir = 'ltr', ...props }: DivProps) {
  return (
    <div
      className={cn('modal-template-form', className)}
      dir={dir}
      data-ui-modal-template="form"
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalTemplateSide({ className, children, dir = 'rtl', ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <aside className={cn('modal-template-side', className)} dir={dir} {...props}>
      {children}
    </aside>
  );
}

export function ModalTemplateMain({ className, children, dir = 'rtl', ...props }: DivProps) {
  return (
    <div className={cn('modal-template-main', className)} dir={dir} {...props}>
      {children}
    </div>
  );
}

export function ModalTemplateSection({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn('modal-template-section', className)} {...props}>
      {children}
    </section>
  );
}

export type ModalTemplateSectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tone?: ModalTemplateTone;
  divider?: boolean;
  className?: string;
  titleId?: string;
};

const sectionIconToneClasses: Record<ModalTemplateTone, string> = {
  neutral: 'text-slate-500 dark:text-slate-300',
  success: 'text-emerald-700 dark:text-emerald-300',
  accent: 'text-amber-600 dark:text-amber-300',
  warning: 'text-amber-600 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
  info: 'text-sky-700 dark:text-sky-300',
};

export function ModalTemplateSectionHeader({
  title,
  subtitle,
  icon,
  tone = 'accent',
  divider = true,
  className,
  titleId,
}: ModalTemplateSectionHeaderProps) {
  return (
    <div className={cn('flex min-w-0 items-start gap-3', divider ? 'border-b border-slate-200 pb-4 dark:border-slate-800' : '', className)}>
      {icon ? (
        <span
          className={cn('grid h-10 w-10 shrink-0 place-items-center text-xl', sectionIconToneClasses[tone])}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 text-right">
        <h4 id={titleId} className="text-base font-black leading-7 text-slate-950 dark:text-white">{title}</h4>
        {subtitle ? <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export type ModalTemplateCardProps = DivProps & {
  tone?: ModalTemplateTone;
};

export function ModalTemplateCard({ className, children, tone = 'neutral', ...props }: ModalTemplateCardProps) {
  return (
    <div
      className={cn('modal-template-card', className)}
      data-modal-template-tone={tone}
      {...props}
    >
      {children}
    </div>
  );
}

export type ModalTemplateSummaryProps = DivProps & {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  note?: ReactNode;
  noteIcon?: ReactNode;
};

export function ModalTemplateSummary({
  className,
  title,
  subtitle,
  icon,
  note,
  noteIcon,
  children,
  ...props
}: ModalTemplateSummaryProps) {
  return (
    <ModalTemplateCard className={cn('modal-template-summary', className)} tone="success" data-ui-modal-template-summary="true" {...props}>
      <div className="modal-template-summary__header">
        <div className="min-w-0 text-right">
          <h4 className="text-lg font-black leading-8 text-slate-950 dark:text-white">{title}</h4>
          {subtitle ? <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {icon ? (
          <span className="modal-template-summary__hero-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      {children}
      {note ? (
        <div className="modal-template-summary__note">
          {noteIcon ? <span className="modal-template-summary__note-icon" aria-hidden="true">{noteIcon}</span> : null}
          <span className="min-w-0 flex-1">{note}</span>
        </div>
      ) : null}
    </ModalTemplateCard>
  );
}

export function ModalTemplateMetricList({ className, children, ...props }: DivProps) {
  return <div className={cn('modal-template-metric-list', className)} {...props}>{children}</div>;
}

export type ModalTemplateMetricProps = Omit<DivProps, 'children'> & {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  valueDir?: 'rtl' | 'ltr' | 'auto';
};

export function ModalTemplateMetric({ className, label, value, icon, valueDir = 'rtl', ...props }: ModalTemplateMetricProps) {
  return (
    <div className={cn('modal-template-metric', className)} {...props}>
      {icon ? <span className="modal-template-metric__icon" aria-hidden="true">{icon}</span> : null}
      <div className="modal-template-metric__copy">
        <span>{label}</span>
        <strong dir={valueDir}>{value}</strong>
      </div>
    </div>
  );
}

export type ModalTemplateNoteProps = DivProps & {
  icon?: ReactNode;
};

export function ModalTemplateNote({ className, icon, children, ...props }: ModalTemplateNoteProps) {
  return (
    <div className={cn('flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs font-semibold leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400', className)} {...props}>
      {icon ? <span className="mt-1 shrink-0" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
}
