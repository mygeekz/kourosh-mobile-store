import React from 'react';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';

type HeaderTheme = 'light' | 'dark' | 'system';

type HeaderThemeToggleProps = {
  theme: HeaderTheme;
  onCycleTheme: () => void;
};

const HeaderThemeToggle: React.FC<HeaderThemeToggleProps> = ({ theme, onCycleTheme }) => {
  const title =
    theme === 'light'
      ? 'حالت روشن (کلیک: تیره)'
      : theme === 'dark'
        ? 'حالت تیره (کلیک: سیستمی)'
        : 'حالت سیستمی (کلیک: روشن)';

  const icon =
    theme === 'light'
      ? 'fa-regular fa-sun'
      : theme === 'dark'
        ? 'fa-regular fa-moon'
        : 'fa-solid fa-laptop';

  return (
    <button
      onClick={onCycleTheme}
      title={title}
      aria-label="تغییر تم"
      data-skip-global-button="true"
      className="header-action-icon grid h-9 w-9 place-items-center rounded-[15px] border border-slate-200/80 bg-white/82 text-slate-700 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.26)] ring-1 ring-white/60 transition-all duration-200 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.32)] dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-200 dark:ring-white/5 dark:hover:bg-slate-900/88"
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
};

export default HeaderThemeToggle;
