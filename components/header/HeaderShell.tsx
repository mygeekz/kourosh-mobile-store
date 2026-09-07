import React from 'react';

type HeaderShellProps = {
  authState?: 'loading' | 'guest' | 'authenticated';
  children: React.ReactNode;
};

const HEADER_SHELL_CLASS = 'app-header-shell';

const HeaderShell: React.FC<HeaderShellProps> = ({ authState, children }) => (
  <header
    className={[HEADER_SHELL_CLASS, authState !== 'authenticated' ? 'app-header-shell--simple' : ''].filter(Boolean).join(' ')}
    data-ui-navigation="header"
    data-ui-shell="topbar"
    data-header-contract="v3"
    data-auth-state={authState}
  >
    {children}
  </header>
);

export default HeaderShell;
