import {
  getLocalStorageItem,
  LocalStorageKey,
  setLocalStorageItem
} from '@/helpers/storage';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ThemeProviderContext, type TTheme } from './context';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: TTheme;
  storageKey?: LocalStorageKey;
};

function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = LocalStorageKey.VITE_UI_THEME,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<TTheme>(() => {
    const stored = getLocalStorageItem(storageKey);

    return stored === 'dark' || stored === 'light' || stored === 'system'
      ? stored
      : defaultTheme;
  });

  useLayoutEffect(() => {
    const root = window.document.documentElement;
    const preference = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const dark =
        theme === 'dark' || (theme === 'system' && preference.matches);

      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
    };

    applyTheme();
    if (theme !== 'system') return;

    preference.addEventListener('change', applyTheme);
    return () => preference.removeEventListener('change', applyTheme);
  }, [theme]);

  const updateTheme = useCallback(
    (nextTheme: TTheme) => {
      setLocalStorageItem(storageKey, nextTheme);
      setTheme(nextTheme);
    },
    [storageKey]
  );
  const value = useMemo(
    () => ({ theme, setTheme: updateTheme }),
    [theme, updateTheme]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export { ThemeProvider };
