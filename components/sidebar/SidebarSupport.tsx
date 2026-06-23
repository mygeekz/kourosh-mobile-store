import React from 'react';

import { FontAwesomeIcon } from '../ui';

export const SidebarSupport: React.FC = () => (
  <div className="sidebar-support-shell relative z-10 p-2 border-t border-slate-200/80 dark:border-slate-800/80">
    <div className="sidebar-support-card text-right">
      <a href="tel:09361583838" className="sidebar-support-link" data-ui-nav-action="support">
        <FontAwesomeIcon icon="fa-solid fa-headset" />
        <span>پشتیبانی</span>
        <b dir="ltr">۰۹۳۶۱۵۸۳۸۳۸</b>
      </a>
    </div>
  </div>
);
