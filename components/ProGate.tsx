import React from 'react';

type Props = {
  featureName?: string;
  children: React.ReactNode;
};

/**
 * این پروژه به‌صورت پیش‌فرض «پرو» است و نیاز به گیت/نسخه‌بندی ندارد.
 * ProGate را نگه می‌داریم تا صفحات قبلی بدون تغییر کار کنند.
 */
export default function ProGate({ children }: Props) {
  return <>{children}</>;
}
