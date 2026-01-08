# 回收站彻底删除功能测试指南

## 功能说明

彻底删除功能允许管理员和超级管理员从回收站中永久删除视频，包括：
1. 删除物理存储文件（视频文件）
2. 删除缩略图文件
3. 删除数据库中的标签关联
4. 删除数据库中的视频记录

## 权限要求

- ✅ **管理员（ADMIN）**：可以彻底删除
- ✅ **超级管理员（SUPER_ADMIN）**：可以彻底删除
- ❌ **普通成员（MEMBER）**：无权彻底删除

## API 接口

```
DELETE /api/videos/trash/:id/permanent?teamId={teamId}
```

### 请求参数
- `id`: 视频ID（路径参数）
- `teamId`: 团队ID（查询参数或 Header: x-team-id）

### 响应
成功：
```json
{
  "message": "视频已彻底删除"
}
```

失败：
```json
{
  "statusCode": 403,
  "message": "只有管理员和超级管理员可以彻底删除视频"
}
```

## 测试步骤

### 1. 准备测试数据

1. 以管理员身份登录
2. 上传一个测试视频
3. 软删除该视频（移到回收站）
4. 记录视频ID和存储路径

### 2. 测试权限检查

**测试用例 1：普通成员尝试删除**
```bash
# 以普通成员身份请求
curl -X DELETE \
  'http://192.168.110.112:3002/api/videos/trash/{video_id}/permanent?teamId={team_id}' \
  -H 'Authorization: Bearer {member_token}'

# 预期结果：403 Forbidden
```

**测试用例 2：管理员删除**
```bash
# 以管理员身份请求
curl -X DELETE \
  'http://192.168.110.112:3002/api/videos/trash/{video_id}/permanent?teamId={team_id}' \
  -H 'Authorization: Bearer {admin_token}'

# 预期结果：200 OK，视频已彻底删除
```

### 3. 验证物理文件删除

**检查视频文件**
```bash
# 查看存储目录
ls -la /www/wwwroot/vioflow_storage/{team_id}/

# 确认视频文件已被删除
# 文件路径通常为：{team_id}/{video_id}/source.mp4
```

**检查缩略图文件**
```bash
# 确认缩略图已被删除
# 文件路径通常为：{team_id}/{video_id}/thumbnail.jpg
```

### 4. 验证数据库清理

```sql
-- 检查视频记录是否已删除
SELECT * FROM videos WHERE id = '{video_id}';
-- 预期结果：0 rows

-- 检查标签关联是否已删除
SELECT * FROM video_tags WHERE video_id = '{video_id}';
-- 预期结果：0 rows
```

### 5. 前端测试

1. 打开回收站页面
2. 找到已删除的视频
3. 点击"彻底删除"按钮
4. 确认删除
5. 验证：
   - 视频从列表中消失
   - 显示成功提示
   - 刷新页面后视频不再出现

## 日志检查

查看后端日志，应该看到类似输出：

```
[VideosService] 开始彻底删除视频: {video_id}, 用户: {user_id}, 团队: {team_id}
[VideosService] 用户角色: admin
[VideosService] 找到视频: {...}
[VideosService] 删除视频文件: {storage_key}
[LocalStorageService] 删除文件: {storage_key}
[LocalStorageService] 文件删除成功: /www/wwwroot/vioflow_storage/{path}
[VideosService] 视频文件删除成功
[VideosService] 删除缩略图: {thumbnail_key}
[LocalStorageService] 文件删除成功: /www/wwwroot/vioflow_storage/{thumbnail_path}
[VideosService] 缩略图删除成功
[VideosService] 删除标签关联
[VideosService] 删除数据库记录
[VideosService] 视频 {video_id} 已彻底删除
```

## 错误处理

### 常见错误

1. **403 Forbidden**
   - 原因：用户不是管理员或超级管理员
   - 解决：使用管理员账号

2. **400 Bad Request: 视频未在回收站中**
   - 原因：视频未被软删除
   - 解决：先软删除视频

3. **404 Not Found**
   - 原因：视频ID不存在
   - 解决：检查视频ID是否正确

4. **500 Internal Server Error**
   - 原因：文件删除失败或数据库操作失败
   - 解决：查看后端日志详细信息

## 注意事项

1. **不可恢复**：彻底删除后无法恢复，请谨慎操作
2. **文件删除失败不影响流程**：即使物理文件删除失败，数据库记录仍会删除
3. **日志记录**：所有删除操作都有详细日志记录
4. **权限严格**：只有管理员级别才能执行此操作

## 测试清单

- [ ] 普通成员无法彻底删除（403）
- [ ] 管理员可以彻底删除（200）
- [ ] 超级管理员可以彻底删除（200）
- [ ] 视频文件被物理删除
- [ ] 缩略图文件被物理删除
- [ ] 数据库记录被删除
- [ ] 标签关联被删除
- [ ] 前端界面正常显示和操作
- [ ] 删除后刷新页面不再显示
- [ ] 后端日志记录完整


