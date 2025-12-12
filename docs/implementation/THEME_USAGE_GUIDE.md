# 主题系统使用指南

## 概述

本项目的主题系统使用统一的 `useThemeClasses` Hook 来管理所有颜色，确保所有组件都能正确应用主题。

## 核心文件

1. **`src/contexts/ThemeContext.tsx`** - 主题上下文，管理当前主题状态
2. **`src/utils/theme.ts`** - 主题颜色映射，定义所有主题的颜色类名
3. **`src/hooks/useThemeClasses.ts`** - 主题类名 Hook，组件中使用此 Hook 获取主题类名

## 使用方法

### 1. 在组件中使用主题

```tsx
import { useThemeClasses } from '../../src/hooks/useThemeClasses';

export const MyComponent: React.FC = () => {
  const theme = useThemeClasses();
  
  return (
    <div className={`${theme.bg.primary} ${theme.text.primary} border ${theme.border.primary}`}>
      {/* 内容 */}
    </div>
  );
};
```

### 2. 可用的主题类名

#### 背景色 (bg)
- `theme.bg.primary` - 主背景色
- `theme.bg.secondary` - 次要背景色
- `theme.bg.tertiary` - 第三级背景色
- `theme.bg.hover` - 悬停背景色（包含 hover: 前缀）
- `theme.bg.active` - 激活状态背景色
- `theme.bg.card` - 卡片背景色
- `theme.bg.modal` - 模态框背景色

#### 边框色 (border)
- `theme.border.primary` - 主边框色
- `theme.border.secondary` - 次要边框色
- `theme.border.hover` - 悬停边框色（包含 hover: 前缀）

#### 文字色 (text)
- `theme.text.primary` - 主文字色
- `theme.text.secondary` - 次要文字色
- `theme.text.tertiary` - 第三级文字色
- `theme.text.muted` - 弱化文字色
- `theme.text.disabled` - 禁用文字色
- `theme.text.hover` - 悬停文字色（包含 hover: 前缀）
- `theme.text.hoverPrimary` - 悬停主文字色（包含 hover: 前缀）
- `theme.text.indigo` - 强调色（如激活状态，固定为 indigo-400）

### 3. 添加新主题

在 `src/utils/theme.ts` 中的 `themes` 对象中添加新主题：

```tsx
export const getThemeClasses = (theme: Theme) => {
  const themes = {
    // ... 现有主题
    'new-theme': {
      bg: {
        primary: 'bg-xxx-950',
        secondary: 'bg-xxx-900',
        // ... 其他背景色
      },
      border: {
        primary: 'border-xxx-800',
        // ... 其他边框色
      },
      text: {
        primary: 'text-xxx-100',
        // ... 其他文字色
        indigo: 'text-indigo-400', // 强调色保持不变
      },
    },
  };
  return themes[theme];
};
```

然后在 `src/contexts/ThemeContext.tsx` 中更新 `Theme` 类型：

```tsx
export type Theme = 'dark' | 'dark-gray' | 'dark-blue' | 'new-theme';
```

## 重要规则

### ❌ 禁止

1. **不要使用硬编码的颜色类名**
   ```tsx
   // ❌ 错误
   <div className="bg-zinc-900 text-zinc-200">
   
   // ✅ 正确
   <div className={`${theme.bg.secondary} ${theme.text.secondary}`}>
   ```

2. **不要在组件中自定义主题映射**
   ```tsx
   // ❌ 错误
   const getThemeClasses = () => {
     const themeMap = {
       dark: { bg: 'bg-zinc-950' },
       // ...
     };
   };
   
   // ✅ 正确
   const theme = useThemeClasses();
   ```

3. **不要使用条件判断来切换颜色**
   ```tsx
   // ❌ 错误
   className={theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-900'}
   
   // ✅ 正确
   className={theme.bg.primary}
   ```

### ✅ 推荐

1. **始终使用 `useThemeClasses` Hook**
2. **使用主题类名对象，而不是字符串拼接**
3. **强调色（如激活状态）使用 `theme.text.indigo`**
4. **悬停效果使用预定义的 hover 类名**

## 检查清单

在添加新组件或修改现有组件时，请确保：

- [ ] 所有颜色都使用 `theme.*` 而不是硬编码
- [ ] 导入了 `useThemeClasses` Hook
- [ ] 没有使用 `text-zinc-*`, `bg-zinc-*`, `border-zinc-*` 等硬编码类名
- [ ] 悬停效果使用 `theme.bg.hover` 或 `theme.text.hover`
- [ ] 激活状态使用 `theme.bg.active` 和 `theme.text.indigo`

## 调试

如果发现某个组件没有正确应用主题：

1. 检查是否使用了 `useThemeClasses` Hook
2. 检查是否有硬编码的颜色类名
3. 检查主题类名是否正确（如 `theme.bg.primary` 而不是 `theme.bgPrimary`）
4. 查看浏览器控制台是否有错误

## 示例

### 完整的组件示例

```tsx
import React from 'react';
import { useThemeClasses } from '../../src/hooks/useThemeClasses';

export const ExampleComponent: React.FC = () => {
  const theme = useThemeClasses();
  
  return (
    <div className={`${theme.bg.primary} ${theme.text.primary} min-h-screen`}>
      <div className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg p-4`}>
        <h2 className={`${theme.text.secondary} text-lg font-semibold`}>
          标题
        </h2>
        <p className={theme.text.muted}>
          描述文字
        </p>
        <button 
          className={`
            ${theme.bg.tertiary} ${theme.text.primary} 
            ${theme.bg.hover} ${theme.text.hoverPrimary}
            border ${theme.border.primary} rounded px-4 py-2
          `}
        >
          按钮
        </button>
      </div>
    </div>
  );
};
```

