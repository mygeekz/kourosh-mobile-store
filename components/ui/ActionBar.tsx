import React from 'react';
import { cn } from '../../utils/cn';
import Button from '../Button';
import type { SurfaceDensity, SurfaceTone } from './SurfaceHeader';

type ActionBarAlign = 'split' | 'start' | 'end';

type Props = {
  onExport?: () => void;
  onPrint?: () => void;
  onReset?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  density?: SurfaceDensity;
  tone?: SurfaceTone;
  align?: ActionBarAlign;
  sticky?: boolean;
  ariaLabel?: string;
};

const ActionBar: React.FC<Props> = ({
  onExport,
  onPrint,
  onReset,
  left,
  right,
  disabled,
  className,
  density = 'comfortable',
  tone = 'neutral',
  align = 'split',
  sticky,
  ariaLabel = 'اقدامات صفحه',
}) => {
  const hasLeft = Boolean(left);
  const hasRight = Boolean(right || onReset || onPrint || onExport);

  return (
    <div
      className={cn('ux-action-bar', sticky ? 'ux-action-bar--sticky' : '', className)}
      data-ui-action-bar="true"
      data-ui-density={density}
      data-ui-tone={tone}
      data-ui-align={align}
      aria-label={ariaLabel}
      dir="rtl"
    >
      {hasLeft ? <div className="ux-action-bar__cluster ux-action-bar__cluster--start">{left}</div> : null}

      {hasRight ? (
        <div className="ux-action-bar__cluster ux-action-bar__cluster--end">
          {onReset && (
            <Button type="button" disabled={disabled} onClick={onReset} variant="secondary" size="sm" className="ux-btn-chip" tooltip="پاک‌کردن فیلترها و بازگشت به حالت پیش‌فرض" leftIcon={<i className="fa-solid fa-rotate-left text-[12px]" />}>
              بازنشانی
            </Button>
          )}

          {onPrint && (
            <Button type="button" disabled={disabled} onClick={onPrint} variant="secondary" size="sm" className="ux-btn-chip" tooltip="چاپ نمای فعلی یا ذخیره تغییرات PDF از داده‌های بازشده" leftIcon={<i className="fa-solid fa-print text-[12px]" />}>
              چاپ
            </Button>
          )}

          {onExport && (
            <Button type="button" disabled={disabled} onClick={onExport} variant="primary" size="sm" className="ux-btn-chip" tooltip="دریافت فایل اکسل بر اساس داده‌ها و فیلترهای فعلی" leftIcon={<i className="fa-solid fa-file-export text-[12px]" />}>
              خروجی اکسل
            </Button>
          )}

          {right}
        </div>
      ) : null}
    </div>
  );
};

export default ActionBar;
