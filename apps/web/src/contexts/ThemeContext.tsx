import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'dark' | 'dark-gray' | 'dark-blue';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 从localStorage读取保存的主题，默认为'dark'
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme && ['dark', 'dark-gray', 'dark-blue'].includes(savedTheme)) {
          return savedTheme;
        }
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }
    return 'dark';
  });

  // 保存主题到localStorage并应用
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('app-theme', newTheme);
      }
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
    applyTheme(newTheme);
  };

  // 应用主题类到document
  const applyTheme = (themeToApply: Theme) => {
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        // 移除所有主题类
        document.documentElement.classList.remove('theme-dark', 'theme-dark-gray', 'theme-dark-blue');
        // 添加当前主题类
        document.documentElement.classList.add(`theme-${themeToApply}`);
      }
    } catch (error) {
      console.warn('Failed to apply theme to document:', error);
    }
  };

  // 初始化时应用主题
  useEffect(() => {
    applyTheme(theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

