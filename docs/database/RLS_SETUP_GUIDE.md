# Supabase RLS (Row Level Security) 设置指南

## 📋 概述

本文档说明如何为 Vioflow MAM 系统设置 Supabase RLS 策略，实现基于团队的数据隔离和权限控制。

## 🔐 核心安全规则

### 1. Teams 表
- ✅ 用户只能查看自己是成员的团队
- ✅ 用户可以创建团队（自动成为 super_admin）
- ✅ 只有管理员（admin/super_admin）可以更新团队信息
- ✅ 只有超级管理员（super_admin）可以删除团队

### 2. Team_Members 表
- ✅ 用户可以查看自己所在团队的所有成员列表
- ✅ 只有管理员可以添加、更新、移除成员

### 3. Projects 表
- ✅ 用户只能查看 team_id 等于自己所在团队的数据
- ✅ 用户可以创建项目（必须是团队成员）
- ✅ 用户可以更新自己团队的项目
- ✅ 只有管理员可以删除项目

### 4. Project_Groups 表
- ✅ 用户只能查看自己团队的项目组
- ✅ 只有管理员可以创建、更新、删除项目组

### 5. Videos 表
- ✅ 用户只能查看自己团队项目中的视频
- ✅ 用户可以创建、更新、删除自己团队的视频

### 6. 其他表
- ✅ Storage_Usage: 只能查看自己团队的存储统计
- ✅ Audit_Logs: 只能查看自己团队的审计日志
- ✅ Share_Links: 基于项目团队隔离
- ✅ Deliveries: 基于项目团队隔离
- ✅ Annotations: 基于视频项目团队隔离

## 🚀 执行步骤

### 步骤 1：在 Supabase SQL Editor 中运行脚本

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `SUPABASE_RLS_POLICIES.sql` 文件内容
4. 粘贴到 SQL Editor
5. 点击 "Run" 执行

### 步骤 2：验证 RLS 已启用

运行以下查询验证：

```sql
-- 检查所有表的 RLS 状态
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'projects', 'project_groups', 'videos',
    'storage_usage', 'audit_logs', 'share_links', 'share_link_access_logs',
    'deliveries', 'delivery_files', 'delivery_packages', 'showcase_packages',
    'annotations', 'upload_tasks', 'notifications', 'tags'
  )
ORDER BY tablename;
```

所有表的 `rls_enabled` 应该为 `true`。

### 步骤 3：检查策略

运行以下查询查看所有策略：

```sql
-- 查看所有 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## ⚙️ 重要配置说明

### 用户 ID 获取函数

脚本中的 `get_current_user_id()` 函数需要根据你的认证系统调整：

#### 选项 1：使用 Supabase Auth

如果你使用 Supabase 的内置认证系统，将函数改为：

```sql
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- 从 Supabase Auth 获取用户 ID
  -- 需要将 auth.users.id 映射到 users.id
  RETURN (
    SELECT id
    FROM users
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;
```

#### 选项 2：使用自定义 JWT

如果使用自定义 JWT（当前实现），确保 JWT payload 中包含用户 ID：

```json
{
  "sub": "user-uuid-here",
  "user_id": "user-uuid-here",
  ...
}
```

函数会尝试从 `sub` 或 `user_id` 字段获取用户 ID。

#### 选项 3：使用请求头

如果用户 ID 通过请求头传递，可以修改函数：

```sql
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- 从请求头获取用户 ID
  RETURN (current_setting('request.headers', true)::json->>'x-user-id')::uuid;
END;
$$;
```

## 🧪 测试 RLS 策略

### 测试 1：验证团队隔离

```sql
-- 以用户 A 身份登录，应该只能看到自己的团队
SET LOCAL request.jwt.claims = '{"sub": "user-a-id"}';
SELECT * FROM teams;

-- 以用户 B 身份登录，应该只能看到自己的团队
SET LOCAL request.jwt.claims = '{"sub": "user-b-id"}';
SELECT * FROM teams;
```

### 测试 2：验证权限控制

```sql
-- 普通成员尝试更新团队（应该失败）
SET LOCAL request.jwt.claims = '{"sub": "member-user-id"}';
UPDATE teams SET name = 'Hacked' WHERE id = 'team-id';
-- 应该返回 0 行或错误

-- 管理员尝试更新团队（应该成功）
SET LOCAL request.jwt.claims = '{"sub": "admin-user-id"}';
UPDATE teams SET name = 'Updated' WHERE id = 'team-id';
-- 应该成功
```

### 测试 3：验证项目隔离

```sql
-- 用户只能看到自己团队的项目
SET LOCAL request.jwt.claims = '{"sub": "user-id"}';
SELECT * FROM projects;
-- 应该只返回该用户团队的项目
```

## 🔧 故障排除

### 问题 1：无法获取用户 ID

**症状**：所有查询返回空结果

**解决方案**：
1. 检查 JWT token 是否正确传递
2. 验证 `get_current_user_id()` 函数是否正确实现
3. 检查 JWT payload 中的用户 ID 字段名

### 问题 2：权限不足错误

**症状**：UPDATE/DELETE 操作失败

**解决方案**：
1. 检查用户是否是团队成员
2. 验证用户角色（admin/super_admin）
3. 检查 `is_team_admin()` 函数是否正确

### 问题 3：跨团队数据泄露

**症状**：用户能看到其他团队的数据

**解决方案**：
1. 验证 RLS 策略是否正确应用
2. 检查 `get_user_team_ids()` 函数
3. 确保所有相关表都启用了 RLS

## 📝 注意事项

1. **性能考虑**：RLS 策略会在每次查询时执行，确保辅助函数使用 `STABLE` 标记以提高性能

2. **安全定义者**：辅助函数使用 `SECURITY DEFINER`，确保它们有足够权限访问数据

3. **NULL 处理**：某些表允许 `team_id` 为 NULL，策略中已处理这种情况

4. **向后兼容**：对于没有 `team_id` 的旧数据，策略允许访问（可能需要根据业务需求调整）

5. **测试环境**：在生产环境部署前，务必在测试环境充分测试所有策略

## 🔄 更新策略

如果需要修改策略，可以：

1. 删除旧策略：
```sql
DROP POLICY "policy_name" ON table_name;
```

2. 创建新策略：
```sql
CREATE POLICY "new_policy_name" ON table_name
FOR SELECT
USING (...);
```

## 📚 相关文档

- [Supabase RLS 文档](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS 文档](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## ✅ 完成检查清单

- [ ] 所有表的 RLS 已启用
- [ ] 所有策略已创建
- [ ] `get_current_user_id()` 函数已正确配置
- [ ] 测试了团队隔离
- [ ] 测试了权限控制
- [ ] 测试了数据访问限制
- [ ] 性能测试通过
- [ ] 文档已更新

---

**重要**：在生产环境部署前，请务必进行充分测试！

