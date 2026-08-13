import React from 'react';
import { cn } from '../../utils/cn';

type SkeletonTone = 'neutral' | 'info' | 'success' | 'warning' | 'violet';

type SkeletonProps = {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  tone?: SkeletonTone;
};

const radiusMap: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

/**
 * Lightweight skeleton loader (Tailwind) with subtle shimmer.
 */
const toneMap: Record<SkeletonTone, string> = {
  neutral: 'ui-skeleton ui-skeleton--neutral',
  info: 'ui-skeleton ui-skeleton--info',
  success: 'ui-skeleton ui-skeleton--success',
  warning: 'ui-skeleton ui-skeleton--warning',
  violet: 'ui-skeleton ui-skeleton--violet',
};

export const Skeleton: React.FC<SkeletonProps> = ({ className, rounded = 'md', tone = 'neutral' }) => {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden',
        toneMap[tone],
        radiusMap[rounded],
        'before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/45 dark:before:via-white/10 before:to-transparent before:animate-[shimmer_1.2s_infinite]',
        className,
      )}
    />
  );
};

export default Skeleton;
