# 数据库迁移操作步骤

## 📋 准备工作

### 1. 确认环境
- ✅ 已创建 Supabase 项目
- ✅ 可以访问 Supabase Dashboard
- ✅ 数据库连接正常

### 2. 备份数据（强烈推荐）

在 Supabase SQL Editor 中运行以下备份脚本：

```sql
-- 备份关键表
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS projects_backup AS SELECT * FROM projects;
CREATE TABLE IF NOT EXISTS share_links_backup AS SELECT * FROM share_links;
```

## 🚀 执行迁移

### 步骤 1：打开 Supabase SQL Editor

1. 访问 [https://supabase.com](https://supabase.com)
2. 登录你的账户
3. 选择你的项目
4. 在左侧菜单中，点击 **"SQL Editor"**
5. 点击 **"New query"** 创建新查询

### 步骤 2：运行第一个迁移脚本

1. 打开文件：`backend/src/database/migration-add-teams-and-permissions.sql`
2. **全选并复制**整个文件内容（Ctrl+A, Ctrl+C 或 Cmd+A, Cmd+C）
3. 粘贴到 Supabase SQL Editor 中
4. 点击 **"Run"** 按钮（或按 `Ctrl+Enter` / `Cmd+Enter`）

**预期结果**：
- ✅ 应该看到 "Success. No rows returned" 或类似的成功消息
- ⚠️ 如果看到警告对话框，点击 "Run this query"（脚本是安全的）

### 步骤 3：验证第一个迁移

在 SQL Editor 中运行以下验证查询：

```sql
-- 检查新表是否创建成功（应该返回 5 行）
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members', 'project_groups', 'audit_logs', 'storage_usage')
ORDER BY table_name;

-- 检查枚举类型（应该返回 2 行）
SELECT typname 
FROM pg_type 
WHERE typname IN ('team_role_enum', 'member_status_enum')
ORDER BY typname;

-- 检查 users 表新字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('team_id', 'phone', 'is_active')
ORDER BY column_name;

-- 检查 projects 表新字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('team_id', 'group_id', 'month_prefix')
ORDER BY column_name;
```

**如果验证失败**：
- 检查错误信息
- 查看 Supabase 日志（Dashboard → Logs）
- 参考下面的"常见问题"部分

### 步骤 4：运行第二个迁移脚本

1. 打开文件：`backend/src/database/migration-add-share-link-access-logs.sql`
2. **全选并复制**整个文件内容
3. 在 Supabase SQL Editor 中创建**新的查询**（点击 "New query"）
4. 粘贴内容
5. 点击 **"Run"** 按钮

### 步骤 5：验证第二个迁移

运行以下验证查询：

```sql
-- 检查分享链接访问记录表（应该返回 1 行）
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'share_link_access_logs';

-- 检查 share_links 表的新字段（应该返回 4 行）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'share_links' 
AND column_name IN ('allow_view', 'last_accessed_at', 'view_count', 'client_name')
ORDER BY column_name;

-- 检查触发器（应该返回 1 行）
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'share_link_access_logs';
```

## ✅ 完整验证

运行以下完整验证查询，确保所有内容都已正确创建：

```sql
-- ============================================
-- 完整验证查询
-- ============================================

-- 1. 检查所有新表（应该返回 6 行）
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
  'teams',
  'team_members', 
  'project_groups',
  'audit_logs',
  'storage_usage',
  'share_link_access_logs'
)
ORDER BY table_name;

-- 2. 检查枚举类型（应该返回 2 行）
SELECT typname 
FROM pg_type 
WHERE typname IN ('team_role_enum', 'member_status_enum')
ORDER BY typname;

-- 3. 检查所有新字段
SELECT 
  'users' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('team_id', 'phone', 'is_active')
UNION ALL
SELECT 
  'projects' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('team_id', 'group_id', 'month_prefix')
UNION ALL
SELECT 
  'share_links' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'share_links' 
AND column_name IN ('allow_view', 'last_accessed_at', 'view_count', 'client_name')
ORDER BY table_name, column_name;

-- 4. 检查数据迁移结果
-- 检查是否有用户被分配了团队
SELECT 
  COUNT(*) as total_users,
  COUNT(team_id) as users_with_team,
  COUNT(*) - COUNT(team_id) as users_without_team
FROM users;

-- 检查团队成员
SELECT 
  COUNT(*) as total_team_members,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'member' THEN 1 END) as members
FROM team_members;

-- 检查存储统计
SELECT 
  COUNT(*) as teams_with_storage_stats,
  SUM(total_size) as total_storage_bytes
FROM storage_usage;
```

## 🔍 数据验证

### 检查默认团队创建

```sql
-- 查看用户和团队的关联
SELECT 
  u.id,
  u.email,
  u.name,
  t.name as team_name,
  t.code as team_code,
  tm.role as team_role
FROM users u
LEFT JOIN teams t ON t.id = u.team_id
LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = u.id
LIMIT 10;
```

### 检查项目关联

```sql
-- 查看项目和团队的关联
SELECT 
  p.id,
  p.name as project_name,
  t.name as team_name,
  pg.name as project_group_name
FROM projects p
LEFT JOIN teams t ON t.id = p.team_id
LEFT JOIN project_groups pg ON pg.id = p.group_id
LIMIT 10;
```

## ❌ 常见问题排查

### 问题 1：枚举类型创建失败

**错误**：`syntax error at or near "NOT"`

**原因**：PostgreSQL 的 `CREATE TYPE` 不支持 `IF NOT EXISTS`

**解决**：已修复，脚本现在使用 `DO` 块检查

### 问题 2：表已存在错误

**错误**：`relation "teams" already exists`

**解决**：脚本使用了 `IF NOT EXISTS`，可以安全地多次运行。如果仍有问题，检查表是否真的存在：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'teams';
```

### 问题 3：外键约束错误

**错误**：`foreign key constraint fails`

**解决**：
1. 确保先运行第一个脚本（`migration-add-teams-and-permissions.sql`）
2. 再运行第二个脚本（`migration-add-share-link-access-logs.sql`）
3. 检查 `users` 表是否存在

### 问题 4：现有用户没有团队

**解决**：如果迁移脚本的数据迁移部分没有执行，可以手动运行：

```sql
-- 为没有团队的用户创建默认团队
DO $$
DECLARE
  user_record RECORD;
  team_id_val uuid;
  team_code_val varchar(12);
  code_exists boolean;
BEGIN
  FOR user_record IN SELECT id, name, email FROM users WHERE team_id IS NULL LOOP
    LOOP
      team_code_val := upper(substring(md5(random()::text || user_record.id::text || clock_timestamp()::text) from 1 for 10));
      SELECT EXISTS(SELECT 1 FROM teams WHERE code = team_code_val) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    INSERT INTO teams (name, code, description, created_by, created_at, updated_at)
    VALUES (
      COALESCE(user_record.name, '用户') || '的团队',
      team_code_val,
      '默认团队',
      user_record.id,
      now(),
      now()
    )
    RETURNING id INTO team_id_val;
    
    UPDATE users SET team_id = team_id_val WHERE id = user_record.id;
    
    INSERT INTO team_members (team_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (team_id_val, user_record.id, 'super_admin', 'active', now(), now(), now())
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END LOOP;
END $$;
```

## 📝 迁移后检查清单

完成迁移后，确认以下项目：

- [ ] 所有新表已创建（6个表）
- [ ] 所有枚举类型已创建（2个枚举）
- [ ] users 表新字段已添加（3个字段）
- [ ] projects 表新字段已添加（3个字段）
- [ ] share_links 表新字段已添加（4个字段）
- [ ] 所有索引已创建
- [ ] 所有触发器已创建
- [ ] 现有用户已关联到默认团队
- [ ] 现有项目已关联到团队（如果有项目成员）
- [ ] 存储统计已初始化

## 🎯 下一步

迁移完成后：

1. **重启后端服务**（如果正在运行）
   ```bash
   # 如果使用 Railway
   # 服务会自动重启，或手动触发部署
   
   # 如果本地运行
   cd backend
   npm run start:dev
   ```

2. **测试 API 接口**
   - 使用 Postman 或 curl 测试团队管理 API
   - 验证权限控制是否正常工作

3. **更新前端代码**
   - 调用新的团队管理 API
   - 实现批量操作功能
   - 实现分享链接管理功能

## 🔄 如果需要回滚

如果迁移出现问题需要回滚，运行以下脚本：

```sql
-- ⚠️ 警告：这会删除所有新表和数据！

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_update_share_link_stats ON share_link_access_logs;
DROP TRIGGER IF EXISTS trigger_update_storage_on_video_insert ON videos;
DROP TRIGGER IF EXISTS trigger_update_storage_on_video_delete ON videos;
DROP TRIGGER IF EXISTS trigger_update_storage_on_video_tier_change ON videos;

-- 删除函数
DROP FUNCTION IF EXISTS update_share_link_stats();
DROP FUNCTION IF EXISTS update_storage_on_video_insert();
DROP FUNCTION IF EXISTS update_storage_on_video_delete();
DROP FUNCTION IF EXISTS update_storage_on_video_tier_change();

-- 删除新表
DROP TABLE IF EXISTS share_link_access_logs CASCADE;
DROP TABLE IF EXISTS storage_usage CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS project_groups CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- 删除枚举类型
DROP TYPE IF EXISTS member_status_enum CASCADE;
DROP TYPE IF EXISTS team_role_enum CASCADE;

-- 删除新字段
ALTER TABLE share_links 
  DROP COLUMN IF EXISTS allow_view,
  DROP COLUMN IF EXISTS last_accessed_at,
  DROP COLUMN IF EXISTS view_count,
  DROP COLUMN IF EXISTS client_name;

ALTER TABLE projects 
  DROP COLUMN IF EXISTS month_prefix,
  DROP COLUMN IF EXISTS group_id,
  DROP COLUMN IF EXISTS team_id;

ALTER TABLE users 
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS team_id;
```

---

**重要提示**：
- ✅ 脚本已修复，可以安全运行
- ✅ 使用了 `IF NOT EXISTS`，可以多次运行
- ✅ 不会删除现有数据
- ⚠️ 建议先在测试环境验证
- ⚠️ 生产环境建议在低峰期运行


