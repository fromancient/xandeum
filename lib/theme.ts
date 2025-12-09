import { Theme } from '@/types';

const THEME_STORAGE_KEY = 'xpic-theme';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
  if (stored) return stored;
  
  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

export function setTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function initTheme() {
  if (typeof window === 'undefined') return;
  
  const theme = getTheme();
  setTheme(theme);
}

