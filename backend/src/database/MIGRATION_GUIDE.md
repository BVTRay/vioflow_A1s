# 数据库迁移指南

## 概述

本指南说明如何将现有数据库升级到支持团队管理和权限系统的版本。

## 迁移内容

本次迁移将添加以下功能：

1. **团队管理**：teams 和 team_members 表
2. **项目组管理**：project_groups 表
3. **操作日志**：audit_logs 表
4. **存储空间统计**：storage_usage 表
5. **用户信息完善**：users 表新增 phone、is_active、team_id 字段
6. **项目关联完善**：projects 表新增 team_id、group_id、month_prefix 字段
7. **分享链接完善**：share_links 表新增 client_name 字段

## 迁移步骤

### 方式一：全新安装（推荐用于新环境）

如果是在新环境中安装，直接运行更新后的 `init-schema.sql`：

```sql
-- 在 Supabase SQL Editor 中运行
-- 文件路径：backend/src/database/init-schema.sql
```

这个脚本包含了所有表结构，包括新增的团队管理相关表。

### 方式二：现有数据库迁移（推荐用于生产环境）

如果数据库已经存在数据，使用迁移脚本：

```sql
-- 在 Supabase SQL Editor 中运行
-- 文件路径：backend/src/database/migration-add-teams-and-permissions.sql
```

这个脚本会：
1. 创建新的枚举类型
2. 创建新的表
3. 修改现有表结构
4. 为现有用户创建默认团队
5. 迁移项目组数据
6. 初始化存储空间统计
7. 创建触发器

## 迁移前检查

在运行迁移脚本之前，请确认：

1. ✅ 已备份数据库
2. ✅ 数据库连接正常
3. ✅ 有足够的权限执行 DDL 操作
4. ✅ 了解迁移脚本的内容

## 迁移后验证

运行以下 SQL 查询验证迁移是否成功：

```sql
-- 1. 检查新表是否创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members', 'project_groups', 'audit_logs', 'storage_usage')
ORDER BY table_name;

-- 2. 检查用户表新字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('team_id', 'phone', 'is_active');

-- 3. 检查项目表新字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('team_id', 'group_id', 'month_prefix');

-- 4. 检查是否所有用户都有团队
SELECT 
  COUNT(*) as total_users,
  COUNT(team_id) as users_with_team,
  COUNT(*) - COUNT(team_id) as users_without_team
FROM users;

-- 5. 检查是否所有项目都关联了团队
SELECT 
  COUNT(*) as total_projects,
  COUNT(team_id) as projects_with_team,
  COUNT(*) - COUNT(team_id) as projects_without_team
FROM projects;

-- 6. 检查存储空间统计是否初始化
SELECT 
  t.name as team_name,
  su.total_size,
  su.standard_size,
  su.cold_size,
  su.file_count
FROM storage_usage su
JOIN teams t ON t.id = su.team_id;
```

## 回滚方案

如果需要回滚迁移，可以执行以下操作：

```sql
-- 警告：这将删除所有团队相关数据，请谨慎操作！

-- 1. 删除触发器
DROP TRIGGER IF EXISTS trigger_update_storage_on_video_insert ON videos;
DROP TRIGGER IF EXISTS trigger_update_storage_on_video_delete ON videos;
DROP TRIGGER IF EXISTS trigger_update_storage_on_video_tier_change ON videos;

-- 2. 删除函数
DROP FUNCTION IF EXISTS update_storage_on_video_insert();
DROP FUNCTION IF EXISTS update_storage_on_video_delete();
DROP FUNCTION IF EXISTS update_storage_on_video_tier_change();

-- 3. 删除新表（注意：这将删除所有相关数据）
DROP TABLE IF EXISTS storage_usage;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS project_groups;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;

-- 4. 删除新字段
ALTER TABLE share_links DROP COLUMN IF EXISTS client_name;
ALTER TABLE projects DROP COLUMN IF EXISTS month_prefix;
ALTER TABLE projects DROP COLUMN IF EXISTS group_id;
ALTER TABLE projects DROP COLUMN IF EXISTS team_id;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS team_id;

-- 5. 恢复 projects.group 为 NOT NULL（如果需要）
ALTER TABLE projects ALTER COLUMN "group" SET NOT NULL;

-- 6. 删除枚举类型
DROP TYPE IF EXISTS member_status_enum;
DROP TYPE IF EXISTS team_role_enum;
```

## 常见问题

### Q1: 迁移脚本执行失败，提示外键约束错误

**A**: 这可能是因为表的创建顺序问题。确保先创建 users 表，再创建 teams 表。如果问题仍然存在，可以暂时禁用外键检查，迁移完成后再启用。

### Q2: 现有用户没有自动关联到团队

**A**: 检查迁移脚本中的 DO 块是否正常执行。可以手动运行以下查询为单个用户创建团队：

```sql
-- 替换 <user_id> 为实际的用户ID
DO $$
DECLARE
  user_id_val uuid := '<user_id>';
  team_id_val uuid;
  team_code_val varchar(12);
BEGIN
  -- 生成团队编码
  team_code_val := upper(substring(md5(random()::text || user_id_val::text || clock_timestamp()::text) from 1 for 10));
  
  -- 创建团队
  INSERT INTO teams (name, code, description, created_by, created_at, updated_at)
  VALUES (
    (SELECT name || '的团队' FROM users WHERE id = user_id_val),
    team_code_val,
    '默认团队',
    user_id_val,
    now(),
    now()
  )
  RETURNING id INTO team_id_val;
  
  -- 更新用户
  UPDATE users SET team_id = team_id_val WHERE id = user_id_val;
  
  -- 添加为超级管理员
  INSERT INTO team_members (team_id, user_id, role, status, joined_at, created_at, updated_at)
  VALUES (team_id_val, user_id_val, 'super_admin', 'active', now(), now(), now());
END $$;
```

### Q3: 项目组数据没有迁移

**A**: 检查项目是否有 team_id。如果项目没有 team_id，需要先为项目关联团队。可以运行：

```sql
-- 为没有团队的项目关联团队（通过项目成员）
UPDATE projects p
SET team_id = (
  SELECT u.team_id
  FROM project_members pm
  JOIN users u ON u.id = pm.user_id
  WHERE pm.project_id = p.id
  AND u.team_id IS NOT NULL
  LIMIT 1
)
WHERE p.team_id IS NULL;
```

### Q4: 存储空间统计不准确

**A**: 可以手动重新计算存储空间统计：

```sql
-- 重新计算所有团队的存储空间
INSERT INTO storage_usage (team_id, total_size, standard_size, cold_size, file_count, updated_at)
SELECT 
  t.id,
  COALESCE(SUM(v.size), 0) as total_size,
  COALESCE(SUM(CASE WHEN v.storage_tier = 'standard' THEN v.size ELSE 0 END), 0) as standard_size,
  COALESCE(SUM(CASE WHEN v.storage_tier = 'cold' THEN v.size ELSE 0 END), 0) as cold_size,
  COUNT(v.id) as file_count,
  now()
FROM teams t
LEFT JOIN projects p ON p.team_id = t.id
LEFT JOIN videos v ON v.project_id = p.id
GROUP BY t.id
ON CONFLICT (team_id) DO UPDATE SET
  total_size = EXCLUDED.total_size,
  standard_size = EXCLUDED.standard_size,
  cold_size = EXCLUDED.cold_size,
  file_count = EXCLUDED.file_count,
  updated_at = now();
```

## 性能考虑

迁移脚本包含以下性能优化：

1. **索引**：所有外键和常用查询字段都创建了索引
2. **触发器**：存储空间统计通过触发器自动更新，无需手动维护
3. **批量操作**：数据迁移使用 DO 块进行批量处理，提高效率

## 后续步骤

迁移完成后，需要：

1. 更新后端代码以支持新的表结构
2. 更新前端代码以支持团队管理功能
3. 测试所有功能是否正常工作
4. 监控数据库性能

## 支持

如有问题，请查看：
- 数据库规划文档：`backend/src/database/database-planning-complete.md`
- 迁移脚本：`backend/src/database/migration-add-teams-and-permissions.sql`

