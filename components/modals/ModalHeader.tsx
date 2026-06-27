import React from 'react';
import type { ModalTone } from './modalTypes';
import { cn } from '../../utils/cn';

type Props = {
  title: string;
  titleId: string;
  kicker?: string;
  iconClass?: string;
  tone: ModalTone;
  descriptionId?: string;
  ariaDescription?: string;
  className?: string;
};

const toneFallbackIcon: Record<ModalTone, string> = {
  danger: 'fa-solid fa-triangle-exclamation',
  warning: 'fa-solid fa-circle-exclamation',
  success: 'fa-solid fa-circle-check',
  info: 'fa-solid fa-circle-info',
  violet: 'fa-solid fa-wand-magic-sparkles',
  neutral: 'fa-solid fa-window-restore',
};

export default function ModalHeader({
  title,
  titleId,
  kicker,
  iconClass,
  tone,
  descriptionId,
  ariaDescription,
  className,
}: Props) {
  return (
    <header className={cn('kourosh-modal__header modal-premium-header', className)}>
      <span className="kourosh-modal__icon modal-premium-badge" data-modal-tone={tone} aria-hidden="true">
        <i className={iconClass || toneFallbackIcon[tone]} />
      </span>
      <div className="kourosh-modal__titleBlock">
        {kicker ? <p className="kourosh-modal__kicker modal-premium-kicker">{kicker}</p> : null}
        <h3 id={titleId} className="kourosh-modal__title modal-premium-title">{title}</h3>
        {ariaDescription ? <p id={descriptionId} className="sr-only">{ariaDescription}</p> : null}
      </div>
    </header>
  );
}
