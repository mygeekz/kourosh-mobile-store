import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

type PortalLayerKind = 'popover' | 'tooltip' | 'toast' | 'floating';

type PortalLayerProps = {
  children: React.ReactNode;
  isOpen?: boolean;
  layer?: PortalLayerKind;
  className?: string;
  dir?: 'rtl' | 'ltr' | 'auto';
  attributes?: React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | number | boolean | undefined>;
};

const PortalLayer: React.FC<PortalLayerProps> = ({
  children,
  isOpen = true,
  layer = 'floating',
  className,
  dir = 'rtl',
  attributes,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      {...attributes}
      data-kourosh-layer={layer}
      className={cn('app-portal-layer', `app-portal-layer--${layer}`, className)}
      dir={dir}
    >
      {children}
    </div>,
    document.body,
  );
};

export default PortalLayer;
