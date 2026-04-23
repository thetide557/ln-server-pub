export type ThemeType = 'light' | 'dark';

export interface ThemeConfig {
  type: ThemeType;
  name: string;
  colors: {
    primaryColor: string;
    primaryBackground: string;
    textColor: string;
    headingColor: string;
    bgColor: string;
    cardBgColor: string;
    borderColor: string;
    tableHeaderBg: string;
    tableRowHoverBg: string;
    menuBg: string;
    menuItemColor: string;
    linkColor: string;
    warningColor: string;
    successColor: string;
    dangerColor: string;
  };
}

export const lightTheme: ThemeConfig = {
  type: 'light',
  name: '亮色主题',
  colors: {
    primaryColor: '#0A4B9D',
    primaryBackground: '#F0ECF9',
    textColor: '#767676',
    headingColor: '#262626',
    bgColor: '#f9f9f9',
    cardBgColor: '#ffffff',
    borderColor: '#d2d6dc',
    tableHeaderBg: '#f0f0f0',
    tableRowHoverBg: '#EAE8F2',
    menuBg: '#f0f0f0',
    menuItemColor: '#8C8C8C',
    linkColor: '#0A4B9D',
    warningColor: '#e6a23c',
    successColor: '#45d678',
    dangerColor: '#ff5656',
  },
};

export const darkTheme: ThemeConfig = {
  type: 'dark',
  name: '暗色主题',
  colors: {
    primaryColor: '#177ddc',
    primaryBackground: '#1f2a3c',
    textColor: 'rgba(255, 255, 255, 0.65)',
    headingColor: 'rgba(255, 255, 255, 0.85)',
    bgColor: '#20222E',
    cardBgColor: '#2A2D3C',
    borderColor: '#303030',
    tableHeaderBg: '#323545',
    tableRowHoverBg: '#3d4258',
    menuBg: '#1a1c24',
    menuItemColor: 'rgba(255, 255, 255, 0.65)',
    linkColor: '#177ddc',
    warningColor: '#e6a23c',
    successColor: '#45d678',
    dangerColor: '#ff5656',
  },
};

export const themes: Record<ThemeType, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
};

export const getThemeConfig = (type: ThemeType): ThemeConfig => {
  return themes[type] || lightTheme;
};