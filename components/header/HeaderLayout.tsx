import React from 'react';

type HeaderLayoutProps = {
  title: React.ReactNode;
  search: React.ReactNode;
  liveActions: React.ReactNode;
  utilities: React.ReactNode;
};

const HeaderLayout: React.FC<HeaderLayoutProps> = ({ title, search, liveActions, utilities }) => (
  <div className="app-header-layout" data-ui-header-layout="true">
    <div className="app-header-layout__title" data-ui-header-region="title">
      {title}
    </div>
    <div className="app-header-layout__search" data-ui-header-region="search">
      {search}
    </div>
    <div className="app-header-layout__live" data-ui-header-region="live-actions">
      {liveActions}
    </div>
    <div className="app-header-layout__utilities" data-ui-header-region="utilities">
      {utilities}
    </div>
  </div>
);

export default HeaderLayout;
