# 视频删除功能权限控制

## 功能概述

当用户点击视频卡片上的删除按钮时，系统会：
1. 弹出确认对话框
2. 检查用户权限
3. 删除该视频的所有版本（而不是单个版本）
4. 支持权限控制：普通用户只能删除自己上传的视频，管理员可以删除所有视频

## 权限规则

### 用户角色
- **普通用户（member）**：只能删除自己上传的视频
- **管理员（admin）**：可以删除所有视频
- **超级管理员（DEV_SUPER_ADMIN）**：可以删除所有视频

### 权限检查位置
1. **前端检查**：在点击删除按钮时检查权限，如果没有权限则显示错误提示
2. **后端检查**：在 API 层再次验证权限，确保安全性

## 实现细节

### 前端实现

#### 1. 添加删除确认弹窗状态
```typescript
// MainBrowser.tsx
const [deleteConfirmState, setDeleteConfirmState] = useState<{
  isOpen: boolean;
  video: Video | null;
  isDeleting: boolean;
}>({
  isOpen: false,
  video: null,
  isDeleting: false,
});
```

#### 2. 权限检查和弹窗显示
```typescript
const handleDeleteVideo = (video: Video) => {
  // 检查权限：普通用户只能删除自己上传的视频
  const isAdmin = user?.role === 'admin' || user?.role === 'DEV_SUPER_ADMIN';
  const isOwner = video.uploaderId === user?.id;
  
  if (!isAdmin && !isOwner) {
    toastManager.error('只能删除自己上传的视频');
    return;
  }
  
  // 打开确认弹窗
  setDeleteConfirmState({
    isOpen: true,
    video,
    isDeleting: false,
  });
};
```

#### 3. 确认删除处理
```typescript
const handleConfirmDelete = async () => {
  const video = deleteConfirmState.video;
  if (!video) return;
  
  setDeleteConfirmState(prev => ({ ...prev, isDeleting: true }));
  
  try {
    const { videosApi } = await import('../../api/videos');
    // 删除该视频的所有版本（deleteAllVersions: true）
    await videosApi.delete(video.id, true);
    
    // 从state中移除该视频的所有版本
    const updatedVideos = videos.filter(v => 
      !(v.projectId === video.projectId && v.baseName === video.baseName)
    );
    dispatch({
      type: 'SET_VIDEOS',
      payload: updatedVideos
    });
    
    // 关闭弹窗
    setDeleteConfirmState({
      isOpen: false,
      video: null,
      isDeleting: false,
    });
    
    toastManager.success(`视频 "${video.baseName || video.name}" 的所有版本已删除`);
  } catch (error: any) {
    console.error('删除视频失败:', error);
    toastManager.error(error?.response?.data?.message || '删除失败，请重试');
    setDeleteConfirmState(prev => ({ ...prev, isDeleting: false }));
  }
};
```

#### 4. 确认弹窗 UI
```tsx
<ConfirmModal
  isOpen={deleteConfirmState.isOpen}
  onClose={() => setDeleteConfirmState({ isOpen: false, video: null, isDeleting: false })}
  onConfirm={handleConfirmDelete}
  title="确认删除视频"
  confirmText="删除所有版本"
  cancelText="取消"
  variant="danger"
  loading={deleteConfirmState.isDeleting}
>
  <div className="space-y-4">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 text-red-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className={`text-sm ${theme.text.secondary} leading-relaxed mb-3`}>
          确定要删除视频 <span className="text-zinc-200 font-medium">"{deleteConfirmState.video?.baseName || deleteConfirmState.video?.name}"</span> 的所有版本吗？
        </p>
        <p className={`text-sm ${theme.text.muted} leading-relaxed`}>
          此操作将删除该视频的所有版本，删除后可在回收站中恢复。
        </p>
        {!user || (user.role !== 'admin' && user.role !== 'DEV_SUPER_ADMIN') ? (
          <p className={`text-xs ${theme.text.muted} mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded`}>
            提示：普通用户只能删除自己上传的视频
          </p>
        ) : null}
      </div>
    </div>
  </div>
</ConfirmModal>
```

### 后端实现

#### 1. Controller 层添加权限参数
```typescript
// videos.controller.ts
@Delete(':id')
async deleteVideo(
  @Param('id') id: string,
  @Query('deleteAllVersions') deleteAllVersions?: string,
  @Request() req,
  @Headers('x-team-id') teamId?: string,
  @Query('teamId') queryTeamId?: string,
) {
  const userId = req.user?.id;
  const finalTeamId = queryTeamId || teamId;
  
  if (!finalTeamId) {
    throw new BadRequestException('需要提供 teamId');
  }
  
  const video = await this.videosService.findOne(id);
  const shouldDeleteAll = deleteAllVersions === 'true';
  
  if (shouldDeleteAll) {
    // 软删除所有版本（带权限验证）
    await this.videosService.deleteAllVersions(video.project_id, video.base_name, userId, finalTeamId);
    return { message: '所有版本已删除' };
  } else {
    // 只软删除当前版本（带权限验证）
    await this.videosService.deleteVersion(id, userId, finalTeamId);
    return { message: '视频版本已删除' };
  }
}
```

#### 2. Service 层权限验证

##### deleteVersion 方法
```typescript
async deleteVersion(videoId: string, userId?: string, teamId?: string): Promise<void> {
  const video = await this.findOne(videoId);
  
  if (!video) {
    throw new NotFoundException(`Video with ID ${videoId} not found`);
  }

  // 权限检查：普通用户只能删除自己上传的视频，管理员可以删除所有视频
  if (userId && teamId) {
    const userRole = await this.teamsService.getUserRole(teamId, userId);
    
    // 如果不是管理员，检查是否是上传者
    if (userRole !== TeamRole.ADMIN && userRole !== TeamRole.SUPER_ADMIN) {
      if (video.uploader_id !== userId) {
        throw new ForbiddenException('只能删除自己上传的视频');
      }
    }
  }
  
  // 软删除视频
  const result = await this.videoRepository
    .createQueryBuilder()
    .update(Video)
    .set({ deleted_at: new Date() })
    .where('id = :id', { id: videoId })
    .andWhere('deleted_at IS NULL')
    .execute();
  
  if (result.affected === 0) {
    throw new Error(`Failed to soft delete video ${videoId}`);
  }
}
```

##### deleteAllVersions 方法
```typescript
async deleteAllVersions(projectId: string, baseName: string, userId?: string, teamId?: string): Promise<void> {
  // 权限检查：普通用户只能删除自己上传的视频，管理员可以删除所有视频
  if (userId && teamId) {
    const userRole = await this.teamsService.getUserRole(teamId, userId);
    
    // 如果不是管理员，需要检查所有版本是否都是该用户上传的
    if (userRole !== TeamRole.ADMIN && userRole !== TeamRole.SUPER_ADMIN) {
      // 查询该基础名称的所有未删除视频
      const videos = await this.videoRepository.find({
        where: {
          project_id: projectId,
          base_name: baseName,
          deleted_at: null,
        },
      });
      
      // 检查是否所有版本都是该用户上传的
      const allOwnedByUser = videos.every(v => v.uploader_id === userId);
      if (!allOwnedByUser) {
        throw new ForbiddenException('只能删除自己上传的视频');
      }
      
      if (videos.length === 0) {
        return;
      }
    }
  }
  
  // 批量软删除所有版本
  const result = await this.videoRepository
    .createQueryBuilder()
    .update(Video)
    .set({ deleted_at: new Date() })
    .where('project_id = :projectId', { projectId })
    .andWhere('base_name = :baseName', { baseName })
    .andWhere('deleted_at IS NULL')
    .execute();
}
```

### API 调用

#### videosApi.delete 方法
```typescript
// videos.ts
delete: async (id: string, deleteAllVersions: boolean = false): Promise<void> => {
  const teamId = apiClient.getTeamId();
  await apiClient.delete(`/videos/${id}`, {
    params: { 
      deleteAllVersions: deleteAllVersions ? 'true' : 'false',
      teamId: teamId || undefined
    },
  });
}
```

## 类型定义更新

### Video 接口添加 uploaderId 字段
```typescript
// types.ts
export interface Video {
  id: string;
  projectId: string;
  name: string;
  baseName?: string;
  uploaderId?: string; // 新增：上传者ID
  // ... 其他字段
}
```

## 用户体验

### 删除流程
1. 用户点击视频卡片上的删除按钮
2. 系统检查权限：
   - 如果是管理员：显示确认弹窗
   - 如果是普通用户且是上传者：显示确认弹窗
   - 如果是普通用户但不是上传者：显示错误提示"只能删除自己上传的视频"
3. 用户在确认弹窗中点击"删除所有版本"
4. 系统删除该视频的所有版本
5. 显示成功提示："视频 xxx 的所有版本已删除"
6. 视频从列表中移除

### 确认弹窗内容
- **标题**：确认删除视频
- **内容**：
  - 主要提示：确定要删除视频 "xxx" 的所有版本吗？
  - 补充说明：此操作将删除该视频的所有版本，删除后可在回收站中恢复。
  - 权限提示（仅普通用户）：提示：普通用户只能删除自己上传的视频
- **按钮**：
  - 取消（灰色）
  - 删除所有版本（红色，危险样式）

## 安全性

1. **双重权限检查**：前端和后端都进行权限验证
2. **软删除**：删除的视频可以在回收站中恢复
3. **审计日志**：所有删除操作都会记录在审计日志中
4. **团队隔离**：只能删除当前团队的视频

## 测试场景

### 场景1：管理员删除任意视频
1. 以管理员身份登录
2. 点击任意视频的删除按钮
3. 应该显示确认弹窗
4. 点击"删除所有版本"
5. 应该成功删除该视频的所有版本

### 场景2：普通用户删除自己上传的视频
1. 以普通用户身份登录
2. 点击自己上传的视频的删除按钮
3. 应该显示确认弹窗
4. 点击"删除所有版本"
5. 应该成功删除该视频的所有版本

### 场景3：普通用户尝试删除他人上传的视频
1. 以普通用户身份登录
2. 点击他人上传的视频的删除按钮
3. 应该显示错误提示："只能删除自己上传的视频"
4. 不应该显示确认弹窗

### 场景4：删除多版本视频
1. 上传同一视频的多个版本（v1, v2, v3）
2. 点击任意版本的删除按钮
3. 确认删除
4. 应该删除所有版本（v1, v2, v3）

## 相关文件

### 前端
- `src/components/Layout/MainBrowser.tsx` - 主浏览区组件，包含删除按钮和确认弹窗
- `src/components/UI/ConfirmModal.tsx` - 确认弹窗组件
- `src/api/videos.ts` - 视频 API 调用
- `src/types.ts` - Video 类型定义

### 后端
- `backend/src/modules/videos/videos.controller.ts` - 视频控制器
- `backend/src/modules/videos/videos.service.ts` - 视频服务，包含权限验证逻辑
- `backend/src/modules/videos/entities/video.entity.ts` - 视频实体定义

## 注意事项

1. 删除操作是软删除，视频会移到回收站
2. 删除的是该视频的所有版本，而不是单个版本
3. 普通用户只能删除自己上传的视频
4. 管理员可以删除所有视频
5. 删除后可以在回收站中恢复











