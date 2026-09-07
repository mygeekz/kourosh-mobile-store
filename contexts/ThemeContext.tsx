import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useStyleContext } from './StyleContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { style, setStyle } = useStyleContext();
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => setSystemTheme(media?.matches ? 'dark' : 'light');
    syncSystemTheme();
    media?.addEventListener?.('change', syncSystemTheme);
    return () => media?.removeEventListener?.('change', syncSystemTheme);
  }, []);

  const theme = style.theme === 'system' ? systemTheme : style.theme;
  const value = useMemo<ThemeContextType>(() => ({
    theme,
    setTheme: (nextTheme) => setStyle('theme', nextTheme),
  }), [setStyle, theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
