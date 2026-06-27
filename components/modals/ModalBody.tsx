import React from 'react';
import { cn } from '../../utils/cn';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function ModalBody({ children, className }: Props) {
  return <div className={cn('kourosh-modal__body modal-body-premium', className)}>{children}</div>;
}
