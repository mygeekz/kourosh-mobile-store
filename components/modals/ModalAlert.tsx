import React from 'react';
import type { ModalTone } from './modalTypes';
import { cn } from '../../utils/cn';

type SummaryItem = {
  label: React.ReactNode;
  value: React.ReactNode;
};

type Props = {
  tone?: ModalTone;
  iconClass?: string;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  text?: React.ReactNode;
  fileLabel?: React.ReactNode;
  fileName?: React.ReactNode;
  fileMode?: 'block' | 'inline';
  summaryItems?: SummaryItem[];
  children?: React.ReactNode;
  className?: string;
};

const toneIcon: Record<ModalTone, string> = {
  danger: 'fa-solid fa-triangle-exclamation',
  warning: 'fa-solid fa-circle-exclamation',
  success: 'fa-solid fa-circle-check',
  info: 'fa-solid fa-circle-info',
  violet: 'fa-solid fa-wand-magic-sparkles',
  neutral: 'fa-solid fa-circle-info',
};

export default function ModalAlert({
  tone = 'neutral',
  iconClass,
  eyebrow,
  title,
  text,
  fileLabel,
  fileName,
  fileMode = 'block',
  summaryItems,
  children,
  className,
}: Props) {
  return (
    <section className={cn('app-modal-alert kourosh-modal-alert', className)} data-modal-alert-tone={tone} data-modal-file-mode={fileMode}>
      <span className="app-modal-alert__icon kourosh-modal-alert__icon" aria-hidden="true">
        <i className={iconClass || toneIcon[tone]} />
      </span>
      <div className={fileMode === 'inline' ? 'app-modal-alert__inlineContent kourosh-modal-alert__inlineContent' : 'app-modal-alert__content kourosh-modal-alert__content'}>
        {eyebrow ? (
          fileMode === 'inline'
            ? <div className="app-modal-alert__inlineEyebrow kourosh-modal-alert__inlineEyebrow">{eyebrow}</div>
            : <p className="app-modal-alert__eyebrow kourosh-modal-alert__eyebrow">{eyebrow}</p>
        ) : null}
        {title ? (
          fileMode === 'inline'
            ? <div className="app-modal-alert__inlineTitle kourosh-modal-alert__inlineTitle">{title}</div>
            : <p className="app-modal-alert__title kourosh-modal-alert__title">{title}</p>
        ) : null}
        {text ? (
          fileMode === 'inline'
            ? <div className="app-modal-alert__inlineText kourosh-modal-alert__inlineText">{text}</div>
            : <p className="app-modal-alert__text kourosh-modal-alert__text">{text}</p>
        ) : null}
        {fileName ? (
          fileMode === 'inline' ? (
            <div className="app-modal-alert__fileInline kourosh-modal-alert__fileInline">
              <span>{fileLabel || 'فایل'}</span>
              <bdi>{fileName}</bdi>
            </div>
          ) : (
            <div className="app-modal-alert__fileRow kourosh-modal-alert__fileRow">
              <span>{fileLabel || 'فایل'}</span>
              <bdi>{fileName}</bdi>
            </div>
          )
        ) : null}
        {summaryItems?.length ? (
          <div className="app-modal-alert__summaryGrid kourosh-modal-alert__summaryGrid">
            {summaryItems.map((item, index) => (
              <div className="app-modal-alert__summaryItem kourosh-modal-alert__summaryItem" key={index}>
                <div className="app-modal-alert__summaryLabel kourosh-modal-alert__summaryLabel">{item.label}</div>
                <div className="app-modal-alert__summaryValue kourosh-modal-alert__summaryValue">{item.value}</div>
              </div>
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
