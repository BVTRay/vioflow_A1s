# React Hooks 顺序问题修复

## 🔍 问题诊断

从浏览器控制台日志看到：

```
Warning: React has detected a change in the order of Hooks called by AppContent.
```

这是因为在 `AppContent` 组件中，Hooks 的调用顺序不一致。

## ✅ 已修复

### 问题原因

1. **`useTheme()` 在 try-catch 块中调用**
   - 这违反了 React Hooks 规则：Hooks 必须在组件顶层调用
   - 不能在条件语句、循环或嵌套函数中调用

2. **`useThemeClasses()` 在函数内部调用**
   - `renderTransferContent()` 和 `renderNotificationsContent()` 函数内部调用了 Hook
   - 这会导致 Hooks 调用顺序不一致

### 修复方案

1. **将所有 Hooks 移到组件顶层**
   ```typescript
   const AppContent: React.FC<...> = ({ state, dispatch }) => {
     // ✅ 所有 Hooks 在顶层
     const { theme } = useTheme();
     const themeClassesHook = useThemeClasses();
     const { ... } = useApiData();
     
     // ✅ 计算值在 Hooks 之后
     const themeClasses = getThemeClasses();
     
     // ✅ 渲染函数使用顶层的 Hook 结果
     const renderTransferContent = () => {
       const theme = themeClassesHook; // 使用顶层结果
       ...
     };
   }
   ```

2. **移除 try-catch 中的 Hook 调用**
   - 将 `useTheme()` 移到顶层
   - 使用默认值处理错误情况

## 📊 数据加载问题

从日志看：
- ✅ 团队加载成功：1 个团队
- ✅ 数据加载成功：3 个项目
- ⚠️ 但数据库中应该有 13 个项目

**可能原因**：
- 其他 10 个项目属于其他用户的团队
- 当前用户（admin）的团队只有 3 个项目
- 这是正常的，因为每个用户都有自己的默认团队

## 🚀 下一步

1. **刷新浏览器页面**
   - React Hooks 警告应该消失了
   - 数据应该正常显示

2. **验证数据**
   - 检查是否能看到 3 个项目（属于当前用户的团队）
   - 如果需要看到所有项目，需要：
     - 将其他用户的项目迁移到当前用户的团队
     - 或者让当前用户加入其他团队

3. **如果需要迁移项目**
   - 可以运行数据修复脚本，将所有项目关联到第一个团队
   - 或者手动在数据库中更新项目的 `team_id`

