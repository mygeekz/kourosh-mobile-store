import React from 'react';

import { FontAwesomeIcon } from '../ui';

export const SidebarSupport: React.FC = () => (
  <footer className="app-sidebar-support">
    <a href="tel:09361583838" className="app-sidebar-support__link" data-ui-nav-action="support">
      <span className="app-sidebar-support__icon" aria-hidden="true">
        <FontAwesomeIcon icon="fa-solid fa-headset" />
      </span>
      <span className="app-sidebar-support__content">
        <span className="app-sidebar-support__label">پشتیبانی</span>
        <b className="app-sidebar-support__phone" dir="ltr">۰۹۳۶۱۵۸۳۸۳۸</b>
      </span>
    </a>
  </footer>
);
