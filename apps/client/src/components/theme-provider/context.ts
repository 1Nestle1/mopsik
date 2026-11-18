import { createContext, useContext } from 'react';

type TTheme = 'dark' | 'light' | 'system';

type TThemeState = {
  theme: TTheme;
  setTheme: (theme: TTheme) => void;
};

const ThemeProviderContext = createContext<TThemeState>({
  theme: 'system',
  setTheme: () => undefined
});

const useTheme = () => useContext(ThemeProviderContext);

export { ThemeProviderContext, useTheme, type TTheme };
