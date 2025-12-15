# Supabase 数据库直接设置指南

## 🎯 快速开始（推荐）

### 方法一：一次性运行完整脚本（最简单）

1. **打开 Supabase Dashboard**
   - 访问 [https://supabase.com](https://supabase.com)
   - 登录并选择你的项目

2. **打开 SQL Editor**
   - 左侧菜单点击 **"SQL Editor"**
   - 点击 **"New query"** 创建新查询

3. **复制并运行完整脚本**
   - 打开文件：`backend/src/database/SUPABASE_QUICK_START.sql`
   - **全选并复制**整个文件内容（Ctrl+A, Ctrl+C）
   - 粘贴到 Supabase SQL Editor
   - 点击 **"Run"** 按钮（或按 `Ctrl+Enter`）

4. **如果出现警告对话框**
   - 点击 **"Run this query"**（脚本是安全的）

5. **验证迁移**
   - 运行下面的验证查询

---

## ✅ 验证查询

在 SQL Editor 中运行以下查询验证迁移是否成功：

```sql
-- 1. 检查所有新表（应该返回 6 行）
SELECT table_name 
FROM information_schema.tables 
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

-- 3. 检查 users 表新字段（应该返回 3 行）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('team_id', 'phone', 'is_active')
ORDER BY column_name;

-- 4. 检查 projects 表新字段（应该返回 3 行）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('team_id', 'group_id', 'month_prefix')
ORDER BY column_name;

-- 5. 检查 share_links 表新字段（应该返回 4 行）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'share_links' 
AND column_name IN ('allow_view', 'last_accessed_at', 'view_count', 'client_name')
ORDER BY column_name;

-- 6. 检查数据迁移结果
SELECT 
  COUNT(*) as total_users,
  COUNT(team_id) as users_with_team,
  COUNT(*) - COUNT(team_id) as users_without_team
FROM users;

-- 7. 检查团队成员
SELECT 
  COUNT(*) as total_team_members,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins
FROM team_members;
```

---

## 📋 分步执行（如果需要）

如果一次性运行出现问题，可以分步执行：

### 步骤 1：创建枚举类型

```sql
-- 团队角色枚举
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role_enum') THEN
    CREATE TYPE "team_role_enum" AS ENUM('super_admin', 'admin', 'member');
  END IF;
END $$;

-- 成员状态枚举
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status_enum') THEN
    CREATE TYPE "member_status_enum" AS ENUM('pending', 'active', 'removed');
  END IF;
END $$;
```

### 步骤 2：创建新表

运行 `SUPABASE_QUICK_START.sql` 中"第二部分：新增表结构"的所有内容

### 步骤 3：修改现有表

运行 `SUPABASE_QUICK_START.sql` 中"第三部分：修改现有表"的所有内容

### 步骤 4：数据迁移

运行 `SUPABASE_QUICK_START.sql` 中"第四部分：数据迁移"的所有内容

### 步骤 5：创建触发器

运行 `SUPABASE_QUICK_START.sql` 中"第五部分：创建触发器"的所有内容

---

## 🔍 检查清单

迁移完成后，确认以下项目：

- [ ] 所有新表已创建（6个表）
- [ ] 所有枚举类型已创建（2个枚举）
- [ ] users 表新字段已添加（3个字段）
- [ ] projects 表新字段已添加（3个字段）
- [ ] share_links 表新字段已添加（4个字段）
- [ ] 所有索引已创建
- [ ] 所有触发器已创建
- [ ] 现有用户已关联到默认团队
- [ ] 存储统计已初始化

---

## ❌ 常见问题

### 问题 1：表已存在错误

**解决**：脚本使用了 `IF NOT EXISTS`，可以安全地多次运行。如果表已存在，脚本会跳过创建。

### 问题 2：外键约束错误

**解决**：确保 `users` 表存在。如果 `users` 表不存在，需要先创建基础表结构。

### 问题 3：用户没有团队

**解决**：检查数据迁移部分是否执行成功。可以手动运行：

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

---

## 🎉 完成后的下一步

1. **重启后端服务**（如果正在运行）
2. **测试 API 接口**
3. **更新前端代码**以使用新功能

---

**提示**：
- ✅ 脚本已修复所有语法错误
- ✅ 可以安全地多次运行
- ✅ 不会删除现有数据
- ⚠️ 建议先在测试环境验证


