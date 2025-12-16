# 视频上传功能完善总结

## 概述

按照设计思路，完善了系统的视频上传功能，所有上传操作都在操作台中完成，不弹出其他窗口。

## 核心概念

- **视频**：项目下面的显示单位
- **版本**：每个视频可能有多个版本（v1, v2, v3...）
- **baseName**：去除版本号的基础文件名，用于版本分组

## 三种上传入口

### 1. 视频卡片按钮作为入口（为某个视频上传新版本）

**路径**：审阅模块 → 视频卡片 → "上传"按钮

**特点**：
- ✅ **锁定为"添加新版本"模式**，不允许修改
- ✅ 自动使用该视频的文件名（baseName）
- ✅ 自动计算下一个版本号（如当前最高版本为v2，则上传为v3）
- ✅ 显示锁定提示，明确告知用户上传逻辑

**操作流程**：
1. 点击视频卡片的上传按钮
2. 操作台打开，显示"上传新版本"标题
3. 选择文件（拖拽或点击上传）
4. 填写迭代说明（必填）
5. 点击"上传为 vX"按钮完成上传

**代码实现**：
```typescript
// MainBrowser.tsx
const handleUploadNewVersion = (video: Video) => {
    dispatch({ type: 'SELECT_VIDEO', payload: video.id });
    dispatch({ type: 'SELECT_PROJECT', payload: video.projectId });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
};
```

### 2. 审阅模块主浏览区"上传视频"按钮作为入口

**路径**：审阅模块 → 主浏览区右上角 → "上传视频"按钮

**特点**：
- ✅ **默认为"上传新视频"模式**，可切换为"添加新版本"
- ✅ 上传新视频时，自动添加 v1 版本号
- ✅ 添加新版本时，显示当前项目的既有视频列表供选择
- ✅ 既有视频列表按 baseName 分组，只显示每个系列的最新版本

**操作流程（上传新视频）**：
1. 点击主浏览区右上角的"上传视频"按钮
2. 操作台打开，显示"上传视频"标题
3. 选择文件
4. 选择"上传新视频"
5. 填写视频说明（必填）
6. 点击"上传新视频"按钮完成上传

**操作流程（添加新版本）**：
1. 点击主浏览区右上角的"上传视频"按钮
2. 操作台打开，显示"上传视频"标题
3. 选择文件
4. 选择"添加新版本"
5. 从既有视频列表中选择目标视频
6. 填写迭代说明（必填）
7. 点击"上传为 vX"按钮完成上传

**既有视频列表优化**：
- 显示缩略图
- 显示当前版本号和下一个版本号
- 按最后上传时间排序
- 自动去重，只显示每个视频系列的最新版本

### 3. 工作台"快速上传"卡片作为入口

**路径**：工作台（Dashboard） → "快速上传"卡片

**特点**：
- ✅ 首先显示**近期项目选择界面**
- ✅ 显示最近打开的10个活跃项目
- ✅ 如果没有近期项目，显示所有活跃项目（按最后活动时间排序）
- ✅ 选择项目后，流程与"为某个项目上传视频"相同

**操作流程**：
1. 在工作台点击"快速上传"卡片
2. 操作台打开，显示"快速上传"标题和近期项目列表
3. 选择一个项目
4. 后续流程与入口2相同（可选择上传新视频或添加新版本）

**近期项目列表特点**：
- 显示项目名称、所属组别、视频数量
- 智能排序（优先显示近期打开的项目）
- 只显示活跃项目（status === 'active'）
- 悬停效果，提升交互体验

## 操作台布局（固定顺序）

按照设计要求，所有上传功能区从上到下依次为：

1. **上传视频的虚线框** 📤
   - 支持点击选择和拖拽上传
   - 显示文件信息（文件名、大小）
   - 可重新选择文件

2. **上传类型** 🔀
   - "上传新视频" / "添加新版本"
   - 视频卡片入口时锁定为"添加新版本"并显示提示
   - 其他入口可自由切换

3. **选择对应视频** 📹
   - 仅在非视频卡片入口 + "添加新版本"模式下显示
   - 显示项目内所有视频系列的最新版本
   - 带缩略图、版本号、预览信息

4. **上传说明** 📝
   - 上传新视频：显示"新视频说明"（必填）
   - 添加新版本：显示"迭代说明"（必填）
   - 带占位符提示和说明文字

5. **上传按钮** ⬆️
   - 动态显示上传目标（如"上传为 v3"）
   - 智能禁用状态（缺少必填项时）
   - 带验证提示（如"请填写迭代说明"）

## 技术实现亮点

### 1. 智能模式锁定

```typescript
// 从视频卡片进入时，强制锁定为"添加新版本"
const isLockedToAddVersion = !!selectedVideo;

// 锁定状态下的 useEffect 保护
useEffect(() => {
  if (selectedVideo && uploadConfig.uploadMode !== 'addVersion') {
    setUploadConfig(prev => ({
      ...prev,
      uploadMode: 'addVersion',
      selectedExistingVideoId: selectedVideo.id,
      nextVersion: nextVersion
    }));
  }
}, [selectedVideo?.id, uploadConfig.uploadMode]);
```

### 2. 视频列表去重与分组

```typescript
// 按 baseName 分组，只显示每个系列的最新版本
const videosByBaseName = new Map<string, Video>();
projectVideos.forEach(v => {
  const baseName = v.baseName || v.name.replace(/^v\d+_/, '');
  const existing = videosByBaseName.get(baseName);
  if (!existing || v.version > existing.version) {
    videosByBaseName.set(baseName, v);
  }
});
const latestVersionVideos = Array.from(videosByBaseName.values());
```

### 3. 版本号自动计算

```typescript
const baseName = video.baseName || video.name.replace(/^v\d+_/, '');
const seriesVideos = videos.filter(v => 
    v.projectId === projectId && 
    (v.baseName === baseName || v.name.replace(/^v\d+_/, '') === baseName)
);
const maxVersion = Math.max(0, ...seriesVideos.map(v => v.version));
const nextVersion = maxVersion + 1;
```

### 4. 智能表单验证

```typescript
// 上传按钮禁用条件
disabled={
    currentProject.status !== 'active' ||
    (uploadConfig.uploadMode === 'addVersion' && !uploadConfig.selectedExistingVideoId) ||
    (uploadConfig.uploadMode === 'addVersion' && !uploadConfig.changeLog?.trim()) ||
    (uploadConfig.uploadMode === 'new' && !uploadConfig.videoDescription?.trim())
}
```

## 用户体验优化

1. **视觉层次清晰**
   - 使用卡片、边框、阴影区分不同功能区
   - 重要信息高亮显示（如版本号、文件名）
   - 禁用状态明确提示

2. **交互反馈及时**
   - 悬停效果（hover）
   - 选中状态（selected）
   - 加载状态（loading）
   - 错误提示（alert）

3. **操作引导明确**
   - 锁定模式提示框
   - 必填项标记（红色星号）
   - 占位符提示
   - 实时验证反馈

4. **信息展示完整**
   - 文件信息（名称、大小）
   - 版本信息（当前版本、下一版本）
   - 项目信息（名称、组别、视频数量）
   - 缩略图预览

## 测试检查清单

- [x] 入口1：视频卡片上传按钮 → 锁定为"添加新版本"
- [x] 入口2：主浏览区上传按钮 → 可选择"上传新视频"或"添加新版本"
- [x] 入口3：快速上传卡片 → 显示近期项目列表
- [x] 上传新视频：自动添加 v1 版本号
- [x] 添加新版本：自动计算下一个版本号
- [x] 既有视频列表：按 baseName 分组，只显示最新版本
- [x] 必填项验证：视频说明 / 迭代说明
- [x] 上传按钮文字：动态显示目标版本
- [x] 错误处理：显示友好的错误提示
- [x] Linter 错误修复：所有类型错误已修复

## 文件修改清单

### 修改的文件

1. **src/components/Layout/Workbench.tsx** （主要修改）
   - 重构上传面板布局
   - 实现三种入口逻辑
   - 添加视频列表选择界面
   - 完善快速上传流程
   - 优化用户体验

2. **docs/implementation/VIDEO_UPLOAD_ENHANCEMENT.md** （新建）
   - 功能总结文档

### 未修改但相关的文件

- `src/components/Layout/MainBrowser.tsx`：包含入口1和入口2的触发逻辑
- `src/components/Layout/Dashboard.tsx`：包含入口3的触发逻辑
- `backend/src/modules/uploads/uploads.controller.ts`：后端上传接口
- `backend/src/modules/uploads/uploads.service.ts`：后端上传服务

## 后续建议

1. **批量上传**：支持一次选择多个文件批量上传
2. **上传队列管理**：显示上传进度、支持取消、重试
3. **版本对比**：支持查看不同版本之间的差异
4. **版本回滚**：支持将历史版本设置为最新版本
5. **自动版本号**：基于文件名自动识别版本号
6. **上传预设**：保存常用的上传配置（如默认说明模板）

## 总结

✅ 所有功能按照设计思路完成
✅ 三种入口逻辑清晰明确
✅ 用户体验流畅友好
✅ 代码质量高，无 linter 错误
✅ 符合选项式 API 规范（后端 NestJS）

视频上传功能现已完善，为用户提供了清晰、高效的上传体验！🎉

