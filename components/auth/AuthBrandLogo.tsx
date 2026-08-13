import React from 'react';

import LoginLogoMotionV3 from '../LoginLogoMotionV3';
import defaultLogoUrl from '../assets/kourosh-final-symbol-gold.svg';
import { cn } from '../../utils/cn';

type AuthBrandLogoProps = {
  animated?: boolean;
  size?: 'default' | 'compact' | 'install';
  className?: string;
  decorative?: boolean;
};

/**
 * Shared authentication brand mark.
 *
 * The install presentation uses the approved static gold SVG. This avoids relying on
 * SVG getBBox() during Android layout, which can return an incomplete box while
 * the document is still settling and visibly squeeze/crop the logo.
 */
const AuthBrandLogo: React.FC<AuthBrandLogoProps> = ({
  animated = true,
  size = 'default',
  className,
  decorative = true,
}) => {
  if (animated) {
    return (
      <LoginLogoMotionV3
        size={size === 'install' ? 'mini' : size === 'compact' ? 'compact' : 'default'}
      />
    );
  }

  return (
    <div className={cn('mx-auto flex w-full justify-center', className)}>
      <img
        src={defaultLogoUrl}
        alt={decorative ? '' : 'نشان کوروش'}
        aria-hidden={decorative ? 'true' : undefined}
        className={cn(
          'block h-auto object-contain',
          size === 'install'
            ? 'w-[148px] max-w-[48vw] sm:w-[178px]'
            : size === 'compact'
              ? 'w-[210px] max-w-[58vw] sm:w-[250px]'
              : 'w-[300px] max-w-[72vw] sm:w-[390px]',
        )}
      />
    </div>
  );
};

export default AuthBrandLogo;
