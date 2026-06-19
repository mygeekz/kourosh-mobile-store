import React from "react";
import { cn } from "../utils/cn";

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
};

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
  className,
  size = 'md',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-state={checked ? 'on' : 'off'}
      data-size={size}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked);
      }}
      className={cn('app-toggle-switch unstyled', className)}
    >
      <span className="app-toggle-switch__track" aria-hidden="true">
        <span className="app-toggle-switch__thumb" />
      </span>
    </button>
  );
};

export default ToggleSwitch;
