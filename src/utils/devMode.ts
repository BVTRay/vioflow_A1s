/**
 * 开发者模式工具函数
 */

/**
 * 检查是否处于开发者模式
 */
export const isDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dev_mode') === 'true';
};

/**
 * 设置开发者模式
 */
export const setDevMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem('dev_mode', 'true');
  } else {
    localStorage.removeItem('dev_mode');
  }
};

/**
 * 清除开发者模式
 */
export const clearDevMode = (): void => {
  setDevMode(false);
};

