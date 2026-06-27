import type React from 'react';

export type ModalTone = 'danger' | 'warning' | 'violet' | 'info' | 'success' | 'neutral';
export type ModalVariant = 'compact' | 'operational' | 'expansive';
export type ModalLayout = 'vertical' | 'horizontal' | 'split';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'wide' | 'full';

export type ModalPanelData = React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | number | boolean | undefined>;
