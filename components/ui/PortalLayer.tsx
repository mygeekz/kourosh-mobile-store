import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { getOverlayPortalHost, type OverlayLayerKind } from './overlayContract';

type PortalLayerKind = OverlayLayerKind;

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
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalHost(getOverlayPortalHost(layer, dir));
  }, [dir, layer]);

  if (!portalHost || !isOpen) return null;

  return createPortal(
    <div
      {...attributes}
      data-kourosh-layer={layer}
      className={cn('app-portal-layer', `app-portal-layer--${layer}`, className)}
      dir={dir}
    >
      {children}
    </div>,
    portalHost,
  );
};

export default PortalLayer;
export type { PortalLayerKind, PortalLayerProps };
