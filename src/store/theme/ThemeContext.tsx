import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from 'react-use';
import { ThemeType, ThemeConfig, themes, getThemeConfig } from './themeConfig';

interface ThemeContextValue {
  themeType: ThemeType;
  themeConfig: ThemeConfig;
  setThemeType: (type: ThemeType) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  themeType: 'light',
  themeConfig: themes.light,
  setThemeType: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeType, setThemeTypeState] = useLocalStorage<ThemeType>('app_theme_type', 'light');

  const setThemeType = (type: ThemeType) => {
    setThemeTypeState(type);
  };

  const themeConfig = useMemo(() => {
    return getThemeConfig(themeType!);
  }, [themeType]);

  const value = useMemo(() => ({
    themeType: themeType!,
    themeConfig,
    setThemeType,
  }), [themeType, themeConfig]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};