import { Theme } from '../contexts/ThemeContext';

// 主题颜色映射
export const getThemeClasses = (theme: Theme) => {
  const themes = {
    dark: {
      bg: {
        primary: 'bg-zinc-950',
        secondary: 'bg-zinc-900',
        tertiary: 'bg-zinc-800',
        hover: 'hover:bg-zinc-800',
        active: 'bg-zinc-700',
        card: 'bg-zinc-900',
        modal: 'bg-zinc-900',
      },
      border: {
        primary: 'border-zinc-800',
        secondary: 'border-zinc-700',
        hover: 'hover:border-zinc-700',
      },
      text: {
        primary: 'text-zinc-100',
        secondary: 'text-zinc-200',
        tertiary: 'text-zinc-300',
        muted: 'text-zinc-400',
        disabled: 'text-zinc-500',
        hover: 'hover:text-zinc-200',
        hoverPrimary: 'hover:text-zinc-100',
        indigo: 'text-indigo-400', // 用于强调色（如激活状态）
      },
    },
    'dark-gray': {
      bg: {
        primary: 'bg-neutral-900',
        secondary: 'bg-neutral-800',
        tertiary: 'bg-neutral-700',
        hover: 'hover:bg-neutral-700',
        active: 'bg-neutral-600',
        card: 'bg-neutral-800',
        modal: 'bg-neutral-800',
      },
      border: {
        primary: 'border-neutral-700',
        secondary: 'border-neutral-600',
        hover: 'hover:border-neutral-600',
      },
      text: {
        primary: 'text-neutral-100',
        secondary: 'text-neutral-200',
        tertiary: 'text-neutral-300',
        muted: 'text-neutral-400',
        disabled: 'text-neutral-500',
        hover: 'hover:text-neutral-200',
        hoverPrimary: 'hover:text-neutral-100',
        indigo: 'text-indigo-400', // 用于强调色（如激活状态）
      },
    },
    'dark-blue': {
      bg: {
        primary: 'bg-slate-950',
        secondary: 'bg-slate-900',
        tertiary: 'bg-slate-800',
        hover: 'hover:bg-slate-800',
        active: 'bg-slate-700',
        card: 'bg-slate-900',
        modal: 'bg-slate-900',
      },
      border: {
        primary: 'border-slate-800',
        secondary: 'border-slate-700',
        hover: 'hover:border-slate-700',
      },
      text: {
        primary: 'text-slate-100',
        secondary: 'text-slate-200',
        tertiary: 'text-slate-300',
        muted: 'text-slate-400',
        disabled: 'text-slate-500',
        hover: 'hover:text-slate-200',
        hoverPrimary: 'hover:text-slate-100',
        indigo: 'text-indigo-400', // 用于强调色（如激活状态）
      },
    },
  };

  return themes[theme];
};

