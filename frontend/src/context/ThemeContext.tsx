import React, { createContext, useContext, useEffect, useState } from 'react';

// Two themes only: paper (light) and navy (dark). Older saved themes map to dark.
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (role?: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function initialTheme(): Theme {
  let saved: string | null = null;
  try { saved = localStorage.getItem('rks_theme'); } catch { /* storage blocked */ }
  if (saved === 'light') return 'light';
  if (saved === 'dark' || saved === 'black-gold' || saved === 'glass') return 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    try { localStorage.setItem('rks_theme', theme); } catch { /* storage blocked */ }
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0F1A33' : '#FFFFFF');
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    // Set the attribute before re-rendering, so components reading computed colors see the new theme
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
