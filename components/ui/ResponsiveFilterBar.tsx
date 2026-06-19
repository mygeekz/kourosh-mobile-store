import React from 'react';

type Props = {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  secondaryRow?: React.ReactNode;
  className?: string;
  dir?: 'rtl' | 'ltr';
};

const ResponsiveFilterBar: React.FC<Props> = ({
  search,
  filters,
  actions,
  secondaryRow,
  className,
  dir = 'rtl',
}) => {
  return (
    <div className={['responsive-filter-bar', className].filter(Boolean).join(' ')} dir={dir}>
      <div className="responsive-filter-bar__main">
        {(search || filters) ? (
          <div className="responsive-filter-bar__cluster responsive-filter-bar__cluster--filters">
            {search ? <div className="responsive-filter-bar__search">{search}</div> : null}
            {filters ? <div className="responsive-filter-bar__filters">{filters}</div> : null}
          </div>
        ) : null}

        {actions ? (
          <div className="responsive-filter-bar__cluster responsive-filter-bar__cluster--actions">
            {actions}
          </div>
        ) : null}
      </div>

      {secondaryRow ? <div className="responsive-filter-bar__secondary">{secondaryRow}</div> : null}
    </div>
  );
};

export default ResponsiveFilterBar;
