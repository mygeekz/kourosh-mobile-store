import React from 'react';
import { cn } from '../../utils/cn';
import Button from '../Button';

type Props = {
  onExport?: () => void;
  onPrint?: () => void;
  onReset?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

const ActionBar: React.FC<Props> = ({ onExport, onPrint, onReset, left, right, disabled, className }) => {
  return (
    <div className={cn('ux-action-bar', className)} dir="rtl">
      <div className="flex flex-wrap items-center gap-2">{left}</div>

      <div className="flex flex-wrap items-center justify-end gap-2">
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
    </div>
  );
};

export default ActionBar;
