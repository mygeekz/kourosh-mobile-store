import React from 'react';
import { cn } from '../../utils/cn';

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
  const hasPrimaryFilters = Boolean(search || filters);

  return (
    <div className={cn('responsive-filter-bar ux-filter-bar', className)} dir={dir} data-ui-toolbar="true">
      <div className="responsive-filter-bar__main ux-filter-bar__main">
        {hasPrimaryFilters ? (
          <div className="responsive-filter-bar__cluster responsive-filter-bar__cluster--filters ux-filter-bar__cluster ux-filter-bar__cluster--filters">
            {search ? <div className="responsive-filter-bar__search ux-filter-bar__search">{search}</div> : null}
            {filters ? <div className="responsive-filter-bar__filters ux-filter-bar__filters">{filters}</div> : null}
          </div>
        ) : null}

        {actions ? (
          <div className="responsive-filter-bar__cluster responsive-filter-bar__cluster--actions ux-filter-bar__cluster ux-filter-bar__cluster--actions">
            {actions}
          </div>
        ) : null}
      </div>

      {secondaryRow ? <div className="responsive-filter-bar__secondary ux-filter-bar__secondary">{secondaryRow}</div> : null}
    </div>
  );
};

export default ResponsiveFilterBar;
