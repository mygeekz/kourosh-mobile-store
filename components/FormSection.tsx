import React from 'react';

type Props = {
  title: string;
  description?: string;
  iconClass?: string;
  iconColor?: string;
  className?: string;
  badgeLabel?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

const FormSection: React.FC<Props> = ({
  title,
  description,
  iconClass,
  iconColor,
  className,
  badgeLabel,
  headerActions,
  children,
}) => {
  return (
    <section className={["ux-form-section", "premium-form-shell", "space-y-4", className || ''].filter(Boolean).join(' ')}>
      <div className="ux-section-header ux-section-header--premium premium-form-section-header">
        <div className="min-w-0 flex flex-1 items-start gap-3">
          {iconClass ? (
            <span
              className="ux-section-header__icon ux-section-header__icon--premium premium-form-section-header__icon"
              style={iconColor ? { color: iconColor } : undefined}
            >
              <i className={iconClass} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="app-section-title premium-form-section-header__title">{title}</h3>
              <span className="ux-section-chip premium-form-section-header__chip">{badgeLabel || 'بخش فرم'}</span>
            </div>
            {description ? <div className="app-subtle premium-form-section-header__description">{description}</div> : null}
          </div>
        </div>
        {headerActions ? <div className="premium-form-section-header__actions">{headerActions}</div> : null}
      </div>

      <div className="ux-form-section__body premium-form-section__body space-y-4">{children}</div>
    </section>
  );
};

export default FormSection;
