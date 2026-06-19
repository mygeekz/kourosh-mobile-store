import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const styleRaw = localStorage.getItem('koroush.style.v1');
      if (styleRaw) {
        const parsed = JSON.parse(styleRaw) as { theme?: 'light' | 'dark' | 'system' };
        if (parsed.theme === 'dark') return 'dark';
        if (parsed.theme === 'light') return 'light';
        if (parsed.theme === 'system') {
          return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      }
    } catch {}
    const storedTheme = localStorage.getItem('theme');
    return (storedTheme as Theme) || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
