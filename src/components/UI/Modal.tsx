import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  maxWidth = 'md',
  showCloseButton = true
}) => {
  const theme = useThemeClasses();

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // 阻止 body 滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className={`${theme.bg.modal} border ${theme.border.secondary} ${maxWidthClasses[maxWidth]} w-full rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${theme.border.primary} flex items-center justify-between ${theme.bg.primary}`}>
            <h2 className={`text-base font-semibold ${theme.text.primary}`}>
              {title}
            </h2>
            {showCloseButton && (
              <button 
                onClick={onClose} 
                className={`p-1.5 ${theme.bg.hover} rounded transition-colors ${theme.text.muted} ${theme.text.hoverPrimary}`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className={`p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar ${theme.bg.modal} ${theme.text.primary}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={`px-6 py-4 border-t ${theme.border.primary} ${theme.bg.primary} flex justify-end gap-3`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

