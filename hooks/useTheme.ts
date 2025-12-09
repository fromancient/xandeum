'use client';

import { useState, useEffect } from 'react';
import { Theme } from '@/types';
import { getTheme, setTheme as setThemeStorage, initTheme } from '@/lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initTheme();
    setThemeState(getTheme());
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setThemeStorage(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return { theme, setTheme, toggleTheme, mounted };
}

