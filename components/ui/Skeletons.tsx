import React from 'react';
import { cn } from '../../utils/cn';
import Skeleton from './Skeleton';

type SkeletonTone = 'neutral' | 'info' | 'success' | 'warning' | 'violet';

export function TableSkeleton({ rows = 8, className, tone = 'neutral' }: { rows?: number; className?: string; tone?: SkeletonTone }) {
  return (
    <div className={cn('app-card ui-skeleton-shell p-4 md:p-5', `ui-skeleton-shell--${tone}`, className)} dir="rtl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton tone={tone} className="h-7 w-44" rounded="lg" />
        <Skeleton tone={tone} className="h-10 w-32" rounded="xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} tone={tone} className="h-10" rounded="lg" />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton({ blocks = 5, className, tone = 'neutral' }: { blocks?: number; className?: string; tone?: SkeletonTone }) {
  return (
    <div className={cn('app-card ui-skeleton-shell p-4 md:p-5 space-y-4', `ui-skeleton-shell--${tone}`, className)} dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <Skeleton tone={tone} className="h-7 w-52" rounded="lg" />
        <Skeleton tone={tone} className="h-9 w-28" rounded="xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: blocks }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton tone={tone} className="h-4 w-24" rounded="sm" />
            <Skeleton tone={tone} className="h-12" rounded="xl" />
          </div>
        ))}
      </div>
      <Skeleton tone={tone} className="mr-auto h-11 w-36" rounded="xl" />
    </div>
  );
}
