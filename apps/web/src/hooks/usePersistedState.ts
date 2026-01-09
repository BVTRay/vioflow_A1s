import { useState, useEffect } from 'react';

/**
 * 持久化状态的Hook
 * @param key localStorage的key
 * @param initialValue 初始值
 * @returns [state, setState]
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 从localStorage读取初始值
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Failed to read ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  // 当state变化时，保存到localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }, [key, state]);

  return [state, setState];
}




















