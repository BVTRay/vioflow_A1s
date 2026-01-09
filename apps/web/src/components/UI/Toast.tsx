import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useThemeClasses } from '../../hooks/useThemeClasses';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const theme = useThemeClasses();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 触发进入动画
    setTimeout(() => setIsVisible(true), 10);
    
    // 自动关闭
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(toast.id), 300); // 等待动画完成
      }, toast.duration || 3000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300);
  };

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-orange-400" />,
    info: <Info className="w-5 h-5 text-indigo-400" />,
  };

  const bgColorMap = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-orange-500/10 border-orange-500/20',
    info: 'bg-indigo-500/10 border-indigo-500/20',
  };

  return (
    <div
      className={`
        ${bgColorMap[toast.type]} 
        border rounded-lg shadow-lg 
        px-4 py-3 min-w-[300px] max-w-[500px]
        flex items-start gap-3
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        {iconMap[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${theme.text.secondary} leading-relaxed break-words`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={handleClose}
        className={`
          flex-shrink-0 p-1 
          ${theme.bg.hover} rounded 
          ${theme.text.muted} ${theme.text.hoverPrimary}
          transition-colors
        `}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};





