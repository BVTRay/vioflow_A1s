import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/theme';

export const useThemeClasses = () => {
  const { theme } = useTheme();
  return getThemeClasses(theme);
};


