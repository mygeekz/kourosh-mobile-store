import React from 'react';

type HeaderShellProps = {
  authState?: 'loading' | 'guest' | 'authenticated';
  children: React.ReactNode;
};

const HEADER_SHELL_CLASS = 'header-premium-shell relative z-[140] bg-white/96 dark:bg-slate-950/96 border-b border-slate-200/80 dark:border-slate-800/90 backdrop-blur-xl flex items-center justify-between gap-2 px-2.5 sm:px-3 md:px-3.5';

const HeaderShell: React.FC<HeaderShellProps> = ({ authState, children }) => (
  <header
    className={HEADER_SHELL_CLASS}
    data-ui-navigation="header"
    data-ui-shell="topbar"
    data-auth-state={authState}
    style={{ minHeight: 'calc(var(--app-header-h) - 4px)' }}
  >
    {children}
  </header>
);

export default HeaderShell;
