import React from 'react';
import HeaderIconButton from './HeaderIconButton';

type HeaderTheme = 'light' | 'dark' | 'system';

type HeaderThemeToggleProps = {
  theme: HeaderTheme;
  onCycleTheme: () => void;
};

const HeaderThemeToggle: React.FC<HeaderThemeToggleProps> = ({ theme, onCycleTheme }) => {
  const title =
    theme === 'light'
      ? 'حالت روشن؛ تغییر به تیره'
      : theme === 'dark'
        ? 'حالت تیره؛ تغییر به سیستمی'
        : 'حالت سیستمی؛ تغییر به روشن';

  const icon =
    theme === 'light'
      ? 'fa-regular fa-sun'
      : theme === 'dark'
        ? 'fa-regular fa-moon'
        : 'fa-solid fa-laptop';

  return (
    <HeaderIconButton
      onClick={onCycleTheme}
      title={title}
      aria-label="تغییر تم"
      icon={icon}
    />
  );
};

export default HeaderThemeToggle;
