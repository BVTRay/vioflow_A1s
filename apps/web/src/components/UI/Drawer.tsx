
import React, { useEffect, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  const [visible, setVisible] = useState(false);
  const theme = useThemeClasses();

  useEffect(() => {
    if (isOpen) setVisible(true);
    else setTimeout(() => setVisible(false), 300); // Wait for animation
  }, [isOpen]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 bottom-0 w-[420px] ${theme.bg.primary} border-l ${theme.border.primary} z-[61] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className={`h-14 border-b ${theme.border.primary} flex items-center justify-between px-6 ${theme.bg.primary} shrink-0`}>
            <h2 className={`font-semibold ${theme.text.primary}`}>{title}</h2>
            <button onClick={onClose} className={`p-2 ${theme.bg.secondary} rounded-full ${theme.text.muted} transition-colors`}>
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-6 ${theme.bg.primary}`}>
            {children}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${theme.border.primary} ${theme.bg.secondary}/30`}>
            <button className="w-full bg-zinc-100 hover:bg-white text-zinc-950 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <span>查看全部历史</span>
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
      </div>
    </>
  );
};
