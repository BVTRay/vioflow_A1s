# 🔍 jeff 账号数据问题排查指南

## 问题描述

在 Supabase 数据库中能看到很多项目，但是使用 jeff@bugong.com 账号登录后看不到这些项目。

## 可能的原因

### 1. 项目没有关联到团队（最可能）

**问题**：旧的种子数据脚本（`seed-data.sql`, `seed-data-cloud.sql`, `seed.ts`）在创建项目时没有设置 `team_id`，导致项目 `team_id` 为 `NULL`。

**检查方法**：
```sql
-- 在 Supabase SQL Editor 中运行
SELECT COUNT(*) as total_projects FROM projects;
SELECT COUNT(*) as projects_with_team FROM projects WHERE team_id IS NOT NULL;
SELECT COUNT(*) as projects_without_team FROM projects WHERE team_id IS NULL;

-- 查看没有 team_id 的项目
SELECT id, name, client, team_id FROM projects WHERE team_id IS NULL;
```

**解决方案**：运行修复脚本 `fix-jeff-data.ts`，它会将所有没有 `team_id` 的项目关联到"不恭文化"团队。

### 2. jeff 账号的 team_id 不正确

**问题**：jeff 账号的 `team_id` 字段可能为 `NULL` 或指向错误的团队。

**检查方法**：
```sql
-- 检查 jeff 账号
SELECT id, email, name, team_id FROM users WHERE email = 'jeff@bugong.com';

-- 检查"不恭文化"团队 ID
SELECT id, name, code FROM teams WHERE name = '不恭文化';
```

**解决方案**：修复脚本会自动更新 jeff 的 `team_id`。

### 3. jeff 不是团队成员

**问题**：jeff 账号可能没有在 `team_members` 表中，导致无法访问团队数据。

**检查方法**：
```sql
-- 检查 jeff 是否是团队成员
SELECT tm.*, u.email, u.name, t.name as team_name
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'jeff@bugong.com';
```

**解决方案**：修复脚本会自动将 jeff 添加到团队。

### 4. 后端接口过滤逻辑问题

**问题**：后端接口可能没有正确过滤团队数据。

**检查点**：
- ✅ `ProjectsService.findAll()` 已实现 `teamId` 过滤
- ✅ `ProjectsController.findAll()` 已支持从查询参数和请求头读取 `teamId`
- ✅ 如果没有提供 `teamId`，返回空数组（多租户模式要求）

**验证方法**：查看后端日志，应该看到：
```
[ProjectsService] 查询项目，团队 ID: <team-id>
[ProjectsService] 找到 X 个项目
```

如果没有看到这些日志，说明 `teamId` 没有正确传递。

### 5. 前端没有正确传递 teamId

**问题**：前端可能没有正确设置或传递 `teamId`。

**检查点**：
- ✅ `TeamContext` 会自动加载并设置当前团队
- ✅ `apiClient` 会自动在请求中添加 `X-Team-Id` 请求头和 `teamId` 查询参数
- ✅ `projectsApi.getAll()` 会自动从 `apiClient.getTeamId()` 获取团队 ID

**验证方法**：
1. 打开浏览器开发者工具
2. 查看 Network 标签
3. 找到 `/api/projects` 请求
4. 检查：
   - 请求头中是否有 `X-Team-Id`
   - 查询参数中是否有 `teamId`
   - 响应数据是否为空

### 6. 团队上下文没有正确加载

**问题**：`TeamContext` 可能没有正确加载团队，导致 `apiClient.getTeamId()` 返回 `null`。

**检查方法**：
1. 打开浏览器控制台
2. 查看是否有以下日志：
   - `🔄 开始加载团队列表...`
   - `✅ 加载到团队: X 个`
   - `✅ 最终设置当前团队: 不恭文化 <team-id>`
   - `📤 API 请求 [GET /projects]: 添加 teamId=<team-id>`

如果没有看到这些日志，说明团队上下文没有正确加载。

## 排查步骤

### 步骤 1: 运行诊断脚本

```bash
cd backend
npm run ts-node src/database/diagnose-jeff-data.ts
```

诊断脚本会检查：
- jeff 账号是否存在
- jeff 的 `team_id` 是否正确
- jeff 是否是团队成员
- 项目是否有 `team_id`
- "不恭文化"团队的项目数量

### 步骤 2: 运行修复脚本

如果诊断发现问题，运行修复脚本：

```bash
cd backend
npm run ts-node src/database/fix-jeff-data.ts
```

修复脚本会：
1. 更新 jeff 的 `team_id` 为"不恭文化"团队 ID
2. 将 jeff 添加到团队成员表（如果不存在）
3. 将所有没有 `team_id` 的项目关联到"不恭文化"团队

### 步骤 3: 验证修复结果

1. **检查数据库**：
```sql
-- 检查 jeff 的 team_id
SELECT email, name, team_id FROM users WHERE email = 'jeff@bugong.com';

-- 检查团队成员关系
SELECT tm.role, tm.status, u.email, t.name
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'jeff@bugong.com';

-- 检查"不恭文化"团队的项目
SELECT COUNT(*) FROM projects WHERE team_id = (
  SELECT id FROM teams WHERE name = '不恭文化'
);
```

2. **测试登录**：
   - 使用 jeff@bugong.com 登录
   - 打开浏览器开发者工具
   - 查看 Network 标签中的 `/api/projects` 请求
   - 检查请求头和查询参数中是否有 `teamId`
   - 检查响应数据是否包含项目

3. **检查控制台日志**：
   - 查看是否有团队加载日志
   - 查看是否有 API 请求日志
   - 查看是否有错误信息

## 常见问题

### Q1: 诊断脚本显示项目没有 team_id，但修复后仍然看不到？

**A**: 可能的原因：
1. 前端缓存问题 - 清除浏览器缓存或硬刷新（Ctrl+Shift+R）
2. 后端服务没有重启 - 重启后端服务
3. 团队上下文没有重新加载 - 退出登录后重新登录

### Q2: 修复脚本运行成功，但前端仍然看不到项目？

**A**: 检查：
1. 浏览器控制台是否有错误
2. Network 请求是否成功（状态码 200）
3. 响应数据是否为空数组
4. 后端日志中是否有 `[ProjectsService] 找到 X 个项目` 的日志

### Q3: 如何确认 teamId 是否正确传递？

**A**: 
1. 查看浏览器 Network 标签中的请求详情
2. 查看后端日志中的 `[ProjectsService] 查询项目，团队 ID: <team-id>` 日志
3. 在浏览器控制台运行：`localStorage.getItem('current_team_id')`

## 快速修复命令

如果确定是数据问题，可以直接在 Supabase SQL Editor 中运行：

```sql
-- 1. 获取"不恭文化"团队 ID
DO $$
DECLARE
  bugong_team_id uuid;
  jeff_user_id uuid;
BEGIN
  -- 获取团队 ID
  SELECT id INTO bugong_team_id FROM teams WHERE name = '不恭文化';
  
  -- 获取 jeff 用户 ID
  SELECT id INTO jeff_user_id FROM users WHERE email = 'jeff@bugong.com';
  
  -- 更新 jeff 的 team_id
  UPDATE users SET team_id = bugong_team_id WHERE id = jeff_user_id;
  
  -- 确保 jeff 是团队成员
  INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    bugong_team_id,
    jeff_user_id,
    'admin',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (team_id, user_id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    updated_at = NOW();
  
  -- 将所有没有 team_id 的项目关联到"不恭文化"团队
  UPDATE projects SET team_id = bugong_team_id WHERE team_id IS NULL;
  
  RAISE NOTICE '修复完成！团队 ID: %, jeff 用户 ID: %', bugong_team_id, jeff_user_id;
END $$;
```

## 联系支持

如果以上步骤都无法解决问题，请提供：
1. 诊断脚本的完整输出
2. 浏览器控制台的错误信息
3. 后端日志中的相关错误
4. Network 请求的详细信息

