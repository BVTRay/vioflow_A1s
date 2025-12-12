import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'warning',
  loading = false
}) => {
  const theme = useThemeClasses();

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-500 text-white',
      icon: 'text-red-400'
    },
    warning: {
      button: 'bg-orange-600 hover:bg-orange-500 text-white',
      icon: 'text-orange-400'
    },
    info: {
      button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      icon: 'text-indigo-400'
    }
  };

  const styles = variantStyles[variant];

  const footer = (
    <>
      <button
        onClick={onClose}
        disabled={loading}
        className={`px-4 py-2 text-sm ${theme.text.muted} ${theme.text.hoverPrimary} ${theme.bg.hover} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {cancelText}
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`px-4 py-2 text-sm ${styles.button} font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? '处理中...' : confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="sm"
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className={`text-sm ${theme.text.secondary} leading-relaxed`}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

