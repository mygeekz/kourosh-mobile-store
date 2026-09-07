import React from 'react';

import { Button } from '@/components/ui';
import { cn } from '../../utils/cn';
import type { DatabaseRestoreProgressSnapshot } from '../../shared/databaseRestoreProgress';

type CommonProps = {
  loading: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  progress?: DatabaseRestoreProgressSnapshot | null;
};

export const LoginSubmitAction: React.FC<CommonProps> = ({ loading, disabled, onClick, className }) => (
  <Button
    type="submit"
    variant="ghost"
    size="lg"
    className={cn('w-full', className)}
    loading={loading}
    disabled={disabled}
    onClick={onClick}
    loadingText="در حال ورود..."
    rightIcon={<i className="fa-solid fa-arrow-left-long" aria-hidden="true" />}
  >
    ورود به سیستم
  </Button>
);

export const InitialSetupSubmitAction: React.FC<CommonProps> = ({ loading, disabled, onClick, className }) => (
  <Button
    type="submit"
    variant="ghost"
    size="lg"
    className={className}
    disabled={disabled}
    loading={loading}
    onClick={onClick}
    loadingText="در حال ساخت حساب..."
    rightIcon={<i className="fa-solid fa-shield-halved" aria-hidden="true" />}
  >
    ایجاد مدیر اصلی
  </Button>
);

export const BackupImmediateAction: React.FC<CommonProps> = ({ loading, disabled, onClick, className }) => (
  <Button
    onClick={onClick}
    variant="primary"
    size="xs"
    className={className}
    loading={loading}
    loadingText="در حال تهیه نسخه پشتیبان…"
    disabled={disabled}
    leftIcon={<i className="fa-solid fa-download" aria-hidden="true" />}
  >
    دانلود فوری
  </Button>
);


export const BackupRestoreAction: React.FC<CommonProps> = ({ loading, disabled, onClick, className, progress }) => {
  const completed = progress?.status === 'completed';
  return (
    <Button
      onClick={onClick}
      variant="warning"
      size="xs"
      className={className}
      loading={loading}
      loadingText={progress?.label || 'در حال بازیابی…'}
      loadingStageStep={progress?.step}
      loadingStageTotal={progress?.total}
      successPulseText={completed ? 'بازیابی کامل شد' : undefined}
      successPulseDuration={1300}
      disabled={disabled}
      leftIcon={<i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />}
    >
      بازیابی
    </Button>
  );
};

export const RestoreDatabaseSubmitAction: React.FC<CommonProps> = ({ loading, disabled, onClick, className, progress }) => {
  const completed = progress?.status === 'completed';
  return (
    <Button
      onClick={onClick}
      variant="danger"
      size="sm"
      className={className}
      loading={loading}
      loadingText={progress?.label || 'در حال اعتبارسنجی و بازیابی…'}
      loadingHint={progress?.detail || 'بررسی فایل، ساخت نسخه ایمنی و بازگشایی دیتابیس'}
      loadingStageStep={progress?.step}
      loadingStageTotal={progress?.total}
      successPulseText={completed ? 'بازیابی کامل شد' : undefined}
      successPulseHint={completed ? 'نشست فعلی تا لحظاتی دیگر بازنشانی می‌شود' : undefined}
      successPulseDuration={1450}
      disabled={disabled}
      leftIcon={<i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />}
    >
      اعتبارسنجی و بازیابی
    </Button>
  );
};

export const PhoneRegisterSubmitAction: React.FC<CommonProps> = ({ loading, disabled, onClick, className }) => (
  <Button
    type="submit"
    disabled={disabled}
    loading={loading}
    loadingText="در حال ثبت گوشی..."
    successPulseText="گوشی ثبت شد"
    successPulseDuration={1100}
    variant="primary"
    size="md"
    className={cn('phone-register-submitbar__submit w-full px-6 sm:w-auto', className)}
    autoIcon={false}
    onClick={onClick}
  >
    <span className="inline-flex items-center gap-2">
      <i className="fa-solid fa-plus text-[13px]" aria-hidden="true" />
      ثبت گوشی در موجودی
    </span>
  </Button>
);
