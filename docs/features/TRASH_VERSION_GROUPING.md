# 回收站视频版本折叠功能

## 功能概述

在回收站中，同一视频的不同版本会被折叠显示，提供更清晰的界面和更好的用户体验。

## 功能特性

### 1. 视频版本分组
- 按 `projectId` 和 `baseName` 对视频进行分组
- 每个组显示最新版本的信息
- 显示版本数量徽章

### 2. 折叠/展开功能
- **折叠状态**（默认）：只显示最新版本
- **展开状态**：显示该视频的所有版本
- 点击展开/折叠按钮切换状态

### 3. 批量操作
- **恢复全部**：一键恢复该视频的所有版本
- **删除全部**：一键彻底删除该视频的所有版本
- **单版本操作**：展开后可以单独恢复或删除某个版本

## 实现细节

### 数据分组

```typescript
// 按 projectId 和 baseName 分组视频
const groupedVideos = useMemo(() => {
  const groups = new Map<string, Video[]>();
  
  deletedVideos.forEach(video => {
    const projectId = (video as any).project_id || video.projectId;
    const baseName = video.baseName || video.name;
    const key = `${projectId}_${baseName}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(video);
  });
  
  // 对每个组内的视频按版本号排序（降序）
  groups.forEach(videos => {
    videos.sort((a, b) => (b.version || 0) - (a.version || 0));
  });
  
  return Array.from(groups.entries()).map(([key, videos]) => ({
    key,
    projectId: (videos[0] as any).project_id || videos[0].projectId,
    baseName: videos[0].baseName || videos[0].name,
    videos,
    latestVideo: videos[0], // 最新版本
    versionCount: videos.length
  }));
}, [deletedVideos]);
```

### 展开/折叠状态管理

```typescript
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

const toggleGroup = (groupKey: string) => {
  setExpandedGroups(prev => {
    const newSet = new Set(prev);
    if (newSet.has(groupKey)) {
      newSet.delete(groupKey);
    } else {
      newSet.add(groupKey);
    }
    return newSet;
  });
};
```

### 批量恢复

```typescript
const handleRestoreGroup = async (groupKey: string, videos: Video[]) => {
  setRestoringVideoId(groupKey);
  try {
    // 恢复所有版本
    await Promise.all(videos.map(video => videosApi.restoreVideo(video.id)));
    toast.success(`已恢复 ${videos.length} 个版本`);
    await loadDeletedVideos();
  } catch (error: any) {
    console.error('恢复视频失败:', error);
    toast.error(error?.response?.data?.message || '恢复视频失败');
  } finally {
    setRestoringVideoId(null);
  }
};
```

### 批量删除

```typescript
const handlePermanentlyDeleteGroup = async (groupKey: string, videos: Video[]) => {
  if (!confirm(`确定要彻底删除这个视频的所有 ${videos.length} 个版本吗？此操作不可恢复！`)) {
    return;
  }
  setDeletingVideoId(groupKey);
  try {
    // 彻底删除所有版本
    await Promise.all(videos.map(video => videosApi.permanentlyDeleteVideo(video.id)));
    toast.success(`已彻底删除 ${videos.length} 个版本`);
    await loadDeletedVideos();
  } catch (error: any) {
    console.error('彻底删除视频失败:', error);
    toast.error(error?.response?.data?.message || '删除视频失败');
  } finally {
    setDeletingVideoId(null);
  }
};
```

## UI 设计

### 主卡片（折叠状态）
```
┌─────────────────────────────────────────────────────────┐
│ [>] 📹 视频名称                        [3 个版本]       │
│     项目: 项目名称                                       │
│     删除时间: 2 天前                                     │
│     🕐 将在 28 天后自动清理                              │
│                             [恢复全部] [删除全部]       │
└─────────────────────────────────────────────────────────┘
```

### 主卡片（展开状态）
```
┌─────────────────────────────────────────────────────────┐
│ [v] 📹 视频名称                        [3 个版本]       │
│     项目: 项目名称                                       │
│     删除时间: 2 天前                                     │
│     🕐 将在 28 天后自动清理                              │
│                             [恢复全部] [删除全部]       │
│   ┌───────────────────────────────────────────────────┐ │
│   │ [v3] 文件名_v3.mp4 [最新]                         │ │
│   │ 删除时间: 2 天前                                   │ │
│   │ 🕐 将在 28 天后自动清理                            │ │
│   │                            [恢复] [删除]          │ │
│   └───────────────────────────────────────────────────┘ │
│   ┌───────────────────────────────────────────────────┐ │
│   │ [v2] 文件名_v2.mp4                                 │ │
│   │ 删除时间: 3 天前                                   │ │
│   │ 🕐 将在 27 天后自动清理                            │ │
│   │                            [恢复] [删除]          │ │
│   └───────────────────────────────────────────────────┘ │
│   ┌───────────────────────────────────────────────────┐ │
│   │ [v1] 文件名_v1.mp4                                 │ │
│   │ 删除时间: 5 天前                                   │ │
│   │ 🕐 将在 25 天后自动清理                            │ │
│   │                            [恢复] [删除]          │ │
│   └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 单版本视频
```
┌─────────────────────────────────────────────────────────┐
│ 📹 视频名称                              [v1]            │
│     项目: 项目名称                                       │
│     删除时间: 2 天前                                     │
│     🕐 将在 28 天后自动清理                              │
│                               [恢复] [彻底删除]         │
└─────────────────────────────────────────────────────────┘
```

## 用户交互流程

### 场景1：查看多版本视频
1. 进入回收站模块
2. 看到视频卡片显示"3 个版本"徽章
3. 点击左侧的展开按钮（>）
4. 展开显示所有版本（v1, v2, v3）
5. 看到最新版本（v3）标记为"最新"

### 场景2：恢复所有版本
1. 在折叠状态下，点击"恢复全部"按钮
2. 系统并行恢复所有版本
3. 显示成功提示："已恢复 3 个版本"
4. 视频从回收站中移除

### 场景3：恢复单个版本
1. 展开视频版本列表
2. 找到要恢复的版本（例如 v2）
3. 点击该版本的"恢复"按钮
4. 只恢复该版本
5. 显示成功提示："视频已恢复"
6. 该版本从回收站中移除

### 场景4：删除所有版本
1. 在折叠状态下，点击"删除全部"按钮
2. 弹出确认对话框："确定要彻底删除这个视频的所有 3 个版本吗？"
3. 确认后，系统并行删除所有版本
4. 显示成功提示："已彻底删除 3 个版本"
5. 视频从回收站中移除

### 场景5：删除单个版本
1. 展开视频版本列表
2. 找到要删除的版本（例如 v1）
3. 点击该版本的"删除"按钮
4. 弹出确认对话框："确定要彻底删除这个视频吗？"
5. 确认后，只删除该版本
6. 显示成功提示："视频已彻底删除"
7. 该版本从回收站中移除

## 视觉设计特性

### 颜色和样式
- **版本徽章**：
  - 多版本：`bg-indigo-500/20 text-indigo-400`（蓝色）
  - 单版本：`bg-zinc-700/50 text-zinc-400`（灰色）
  - 最新标记：`bg-indigo-500/20 text-indigo-400`（小号蓝色）

- **展开/折叠按钮**：
  - 折叠：`ChevronRight` 图标
  - 展开：`ChevronDown` 图标
  - 仅在多版本时显示

- **版本卡片层级**：
  - 主卡片：`bg-secondary` + `border-primary`
  - 版本子卡片：`bg-tertiary` + `border-secondary`
  - 左侧缩进：`ml-12`

### 按钮样式
- **恢复按钮**：`bg-indigo-600 hover:bg-indigo-500`
- **删除按钮**：`bg-red-600 hover:bg-red-500`
- **禁用状态**：50% 透明度 + 不可点击

### 响应式布局
- 使用 Flexbox 确保在不同屏幕尺寸下都能正常显示
- 文本截断（truncate）防止内容溢出
- 按钮文字在小屏幕上可能需要调整

## 性能优化

### useMemo 优化
```typescript
const groupedVideos = useMemo(() => {
  // 分组逻辑
}, [deletedVideos]);
```
- 只有当 `deletedVideos` 变化时才重新计算分组
- 避免每次渲染都重新分组

### Promise.all 并行处理
```typescript
await Promise.all(videos.map(video => videosApi.restoreVideo(video.id)));
```
- 批量操作时并行处理，提高速度
- 比串行处理快得多

## 注意事项

1. **版本排序**：按版本号降序排序，最新版本在最前
2. **展开状态**：使用 `Set` 管理展开状态，性能更好
3. **错误处理**：批量操作时，如果某个失败，其他继续执行
4. **确认对话框**：批量删除前必须确认，防止误操作
5. **自动清理时间**：根据删除时间计算剩余天数，7天内显示红色警告

## 相关文件

- `src/components/Layout/TrashPanel.tsx` - 回收站面板组件
- `src/api/videos.ts` - 视频 API（恢复、删除）
- `src/types.ts` - Video 类型定义

## 测试场景

### 测试1：多版本视频分组
1. 删除同一视频的多个版本（v1, v2, v3）
2. 进入回收站
3. 验证：应该只显示一个卡片，带有"3 个版本"徽章

### 测试2：展开/折叠
1. 点击展开按钮
2. 验证：应该显示所有版本，图标变为向下箭头
3. 点击折叠按钮
4. 验证：应该只显示主卡片，图标变为向右箭头

### 测试3：批量恢复
1. 展开多版本视频
2. 点击"恢复全部"
3. 验证：所有版本都应该被恢复到项目中
4. 验证：回收站中该视频应该消失

### 测试4：单版本恢复
1. 展开多版本视频
2. 点击某个版本的"恢复"按钮
3. 验证：只有该版本被恢复
4. 验证：其他版本仍在回收站中

### 测试5：批量删除
1. 点击"删除全部"
2. 确认对话框
3. 验证：所有版本都应该被彻底删除
4. 验证：回收站中该视频应该消失

### 测试6：单版本删除
1. 展开多版本视频
2. 点击某个版本的"删除"按钮
3. 确认对话框
4. 验证：只有该版本被彻底删除
5. 验证：其他版本仍在回收站中

### 测试7：单版本视频
1. 删除只有一个版本的视频
2. 进入回收站
3. 验证：应该不显示展开按钮
4. 验证：按钮文字应该是"恢复"和"彻底删除"（而不是"恢复全部"和"删除全部"）

## 未来改进

1. **搜索和筛选**：添加搜索框，按项目或名称筛选
2. **批量选择**：支持勾选多个视频组进行批量操作
3. **排序**：按删除时间、项目、剩余天数排序
4. **预览**：点击视频可以预览（如果缩略图还在）
5. **统计信息**：显示回收站占用空间、视频总数等
6. **自动清理提醒**：即将自动清理的视频高亮显示











