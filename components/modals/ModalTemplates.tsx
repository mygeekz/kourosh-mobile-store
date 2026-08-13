import React from 'react';
import { cn } from '../../utils/cn';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function ModalTemplateForm({ className, children, ...props }: DivProps) {
  return <div className={cn('modal-template-form', className)} {...props}>{children}</div>;
}

export function ModalTemplateSide({ className, children, ...props }: DivProps) {
  return <aside className={cn('modal-template-side', className)} {...props}>{children}</aside>;
}

export function ModalTemplateMain({ className, children, ...props }: DivProps) {
  return <div className={cn('modal-template-main', className)} {...props}>{children}</div>;
}

export function ModalTemplateSection({ className, children, ...props }: DivProps) {
  return <section className={cn('modal-template-section', className)} {...props}>{children}</section>;
}

export function ModalTemplateCard({ className, children, ...props }: DivProps) {
  return <div className={cn('modal-template-card', className)} {...props}>{children}</div>;
}

export function ModalTemplateMetricList({ className, children, ...props }: DivProps) {
  return <div className={cn('modal-template-metric-list', className)} {...props}>{children}</div>;
}

export function ModalTemplateMetric({ className, children, ...props }: DivProps) {
  return <div className={cn('modal-template-metric', className)} {...props}>{children}</div>;
}
