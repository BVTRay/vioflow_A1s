import { useCallback } from 'react';
import { Toast, ToastType } from '../components/UI/Toast';

interface ToastOptions {
  duration?: number; // 显示时长（毫秒），0 表示不自动关闭
}

class ToastManager {
  private listeners: Set<(toasts: Toast[]) => void> = new Set();
  private toasts: Toast[] = [];

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  show(message: string, type: ToastType = 'info', options?: ToastOptions) {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = {
      id,
      type,
      message,
      duration: options?.duration !== undefined ? options.duration : 3000,
    };

    this.toasts.push(toast);
    this.notify();

    return id;
  }

  close(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  success(message: string, options?: ToastOptions) {
    return this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    return this.show(message, 'error', options);
  }

  info(message: string, options?: ToastOptions) {
    return this.show(message, 'info', options);
  }

  warning(message: string, options?: ToastOptions) {
    return this.show(message, 'warning', options);
  }

  getToasts() {
    return [...this.toasts];
  }
}

// 全局单例
const toastManager = new ToastManager();

export const useToast = () => {
  const show = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions) => {
    return toastManager.show(message, type, options);
  }, []);

  const success = useCallback((message: string, options?: ToastOptions) => {
    return toastManager.success(message, options);
  }, []);

  const error = useCallback((message: string, options?: ToastOptions) => {
    return toastManager.error(message, options);
  }, []);

  const info = useCallback((message: string, options?: ToastOptions) => {
    return toastManager.info(message, options);
  }, []);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    return toastManager.warning(message, options);
  }, []);

  const close = useCallback((id: string) => {
    toastManager.close(id);
  }, []);

  return {
    show,
    success,
    error,
    info,
    warning,
    close,
  };
};

// 导出 toastManager 用于在组件外部使用
export { toastManager };



