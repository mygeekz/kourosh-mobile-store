import Button from '../Button';

interface PasswordVisibilityButtonProps {
  visible: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
  className?: string;
}

export default function PasswordVisibilityButton({
  visible,
  onToggle,
  showLabel = 'نمایش کلمه عبور',
  hideLabel = 'پنهان‌کردن کلمه عبور',
  className,
}: PasswordVisibilityButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      unstyled
      className={['app-password-visibility-button', className].filter(Boolean).join(' ')}
      ripple={false}
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={visible ? hideLabel : showLabel}
      leftIcon={<i className={`fa-solid ${visible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />}
      autoIcon={false}
    />
  );
}
