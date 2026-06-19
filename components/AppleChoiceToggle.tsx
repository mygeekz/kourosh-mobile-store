import React from 'react';

type AppleChoiceToggleProps = {
  active?: boolean;
  iconClass?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  role?: string;
  ariaLabel?: string;
};

const AppleChoiceToggle: React.FC<AppleChoiceToggleProps> = ({
  active = false,
  iconClass,
  label,
  hint,
  disabled = false,
  className,
  onClick,
  type = 'button',
  role,
  ariaLabel,
}) => {
  return (
    <button
      type={type}
      role={role}
      disabled={disabled}
      aria-pressed={active}
      aria-selected={active}
      aria-current={active ? 'true' : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      className={['apple-choice-toggle', active ? 'is-active' : '', className].filter(Boolean).join(' ')}
    >
      {iconClass ? (
        <span className="apple-choice-toggle__icon" aria-hidden="true">
          <i className={iconClass} />
        </span>
      ) : null}
      <span className="apple-choice-toggle__content min-w-0">
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
    </button>
  );
};

export default AppleChoiceToggle;
