# 数据库迁移脚本运行指南

## 一、准备工作

### 1.1 确认数据库连接信息

确保你已经：
- ✅ 创建了 Supabase 项目
- ✅ 获取了数据库连接信息（DATABASE_URL）
- ✅ 可以访问 Supabase Dashboard

### 1.2 备份现有数据（重要！）

**在运行迁移脚本之前，强烈建议备份现有数据！**

```sql
-- 在 Supabase SQL Editor 中运行以下命令备份关键表
-- （可选，但强烈推荐）

-- 备份用户表
CREATE TABLE users_backup AS SELECT * FROM users;

-- 备份项目表
CREATE TABLE projects_backup AS SELECT * FROM projects;

-- 备份分享链接表
CREATE TABLE share_links_backup AS SELECT * FROM share_links;
```

## 二、运行迁移脚本

### 方法一：使用 Supabase SQL Editor（推荐）

#### 步骤 1：打开 Supabase Dashboard

1. 访问 [https://supabase.com](https://supabase.com)
2. 登录你的账户
3. 选择你的项目

#### 步骤 2：打开 SQL Editor

1. 在左侧菜单中，点击 **"SQL Editor"**
2. 点击 **"New query"** 创建新查询

#### 步骤 3：运行第一个迁移脚本

1. 打开文件：`backend/src/database/migration-add-teams-and-permissions.sql`
2. **复制整个文件内容**
3. 粘贴到 Supabase SQL Editor 中
4. 点击 **"Run"** 按钮（或按 `Ctrl+Enter` / `Cmd+Enter`）

#### 步骤 4：验证第一个迁移

运行以下验证查询：

```sql
-- 检查新表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members', 'project_groups', 'audit_logs', 'storage_usage')
ORDER BY table_name;

-- 应该返回 5 行数据
```

#### 步骤 5：运行第二个迁移脚本

1. 打开文件：`backend/src/database/migration-add-share-link-access-logs.sql`
2. **复制整个文件内容**
3. 粘贴到 Supabase SQL Editor 中
4. 点击 **"Run"** 按钮

#### 步骤 6：验证第二个迁移

运行以下验证查询：

```sql
-- 检查分享链接访问记录表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'share_link_access_logs';

-- 检查 share_links 表的新字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'share_links' 
AND column_name IN ('allow_view', 'last_accessed_at', 'view_count', 'client_name')
ORDER BY column_name;
```

### 方法二：使用命令行（psql）

如果你有 PostgreSQL 客户端（psql），也可以通过命令行运行：

```bash
# 设置环境变量
export DATABASE_URL="postgresql://user:password@host:port/database"

# 运行第一个迁移脚本
psql $DATABASE_URL -f backend/src/database/migration-add-teams-and-permissions.sql

# 运行第二个迁移脚本
psql $DATABASE_URL -f backend/src/database/migration-add-share-link-access-logs.sql
```

### 方法三：使用数据库管理工具

如果你使用其他数据库管理工具（如 DBeaver、pgAdmin、TablePlus 等）：

1. 连接到你的 Supabase 数据库
2. 打开 SQL 编辑器
3. 复制迁移脚本内容
4. 执行脚本

## 三、完整验证步骤

运行以下 SQL 查询，验证所有表都已正确创建：

```sql
-- ============================================
-- 完整验证查询
-- ============================================

-- 1. 检查所有新表
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

-- 2. 检查枚举类型
SELECT typname 
FROM pg_type 
WHERE typname IN ('team_role_enum', 'member_status_enum')
ORDER BY typname;

-- 3. 检查 users 表的新字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('team_id', 'phone', 'is_active')
ORDER BY column_name;

-- 4. 检查 projects 表的新字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('team_id', 'group_id', 'month_prefix')
ORDER BY column_name;

-- 5. 检查 share_links 表的新字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'share_links' 
AND column_name IN ('allow_view', 'last_accessed_at', 'view_count', 'client_name')
ORDER BY column_name;

-- 6. 检查索引
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('teams', 'team_members', 'project_groups', 'audit_logs', 'storage_usage', 'share_link_access_logs')
ORDER BY tablename, indexname;

-- 7. 检查触发器
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('storage_usage', 'share_link_access_logs')
ORDER BY event_object_table, trigger_name;
```

## 四、数据迁移验证

### 4.1 检查默认团队是否创建

```sql
-- 检查是否有用户被分配了团队
SELECT 
  u.id,
  u.email,
  u.name,
  u.team_id,
  t.name as team_name,
  t.code as team_code
FROM users u
LEFT JOIN teams t ON t.id = u.team_id
LIMIT 10;
```

### 4.2 检查团队成员关系

```sql
-- 检查团队成员
SELECT 
  tm.id,
  t.name as team_name,
  u.email as user_email,
  tm.role,
  tm.status
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
JOIN users u ON u.id = tm.user_id
LIMIT 10;
```

### 4.3 检查存储统计初始化

```sql
-- 检查存储统计表
SELECT 
  t.name as team_name,
  su.total_size,
  su.standard_size,
  su.cold_size,
  su.file_count
FROM storage_usage su
JOIN teams t ON t.id = su.team_id
LIMIT 10;
```

## 五、常见问题排查

### 问题 1：表已存在错误

**错误信息**：`relation "teams" already exists`

**解决方案**：
```sql
-- 如果表已存在，迁移脚本会跳过创建（使用了 IF NOT EXISTS）
-- 但如果需要重新创建，先删除：
DROP TABLE IF EXISTS share_link_access_logs CASCADE;
DROP TABLE IF EXISTS storage_usage CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS project_groups CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- 然后重新运行迁移脚本
```

### 问题 2：外键约束错误

**错误信息**：`foreign key constraint fails`

**解决方案**：
- 确保先运行 `migration-add-teams-and-permissions.sql`
- 再运行 `migration-add-share-link-access-logs.sql`
- 按照脚本中的顺序执行

### 问题 3：枚举类型已存在

**错误信息**：`type "team_role_enum" already exists`

**解决方案**：
```sql
-- 如果枚举类型已存在，脚本会跳过（使用了 IF NOT EXISTS）
-- 如果需要重新创建，先删除：
DROP TYPE IF EXISTS member_status_enum CASCADE;
DROP TYPE IF EXISTS team_role_enum CASCADE;

-- 然后重新运行迁移脚本
```

### 问题 4：触发器创建失败

**错误信息**：`function does not exist`

**解决方案**：
- 确保所有函数都正确创建
- 检查是否有语法错误
- 重新运行触发器创建部分

## 六、回滚方案（如果需要）

如果迁移出现问题，需要回滚：

```sql
-- ⚠️ 警告：这会删除所有新表和数据！

-- 1. 删除新表
DROP TABLE IF EXISTS share_link_access_logs CASCADE;
DROP TABLE IF EXISTS storage_usage CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS project_groups CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- 2. 删除枚举类型
DROP TYPE IF EXISTS member_status_enum CASCADE;
DROP TYPE IF EXISTS team_role_enum CASCADE;

-- 3. 恢复 users 表字段（如果需要）
ALTER TABLE users 
  DROP COLUMN IF EXISTS team_id,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS is_active;

-- 4. 恢复 projects 表字段（如果需要）
ALTER TABLE projects 
  DROP COLUMN IF EXISTS team_id,
  DROP COLUMN IF EXISTS group_id,
  DROP COLUMN IF EXISTS month_prefix;

-- 5. 恢复 share_links 表字段（如果需要）
ALTER TABLE share_links 
  DROP COLUMN IF EXISTS allow_view,
  DROP COLUMN IF EXISTS last_accessed_at,
  DROP COLUMN IF EXISTS view_count,
  DROP COLUMN IF EXISTS client_name;
```

## 七、迁移后检查清单

- [ ] 所有新表已创建（6个表）
- [ ] 所有枚举类型已创建（2个枚举）
- [ ] users 表新字段已添加（3个字段）
- [ ] projects 表新字段已添加（3个字段）
- [ ] share_links 表新字段已添加（4个字段）
- [ ] 所有索引已创建
- [ ] 所有触发器已创建
- [ ] 现有用户已关联到默认团队
- [ ] 现有项目已关联到团队
- [ ] 存储统计已初始化

## 八、下一步

迁移完成后：

1. **更新后端环境变量**（如果需要）
2. **重启后端服务**（如果正在运行）
3. **测试 API 接口**（使用 Postman 或 curl）
4. **更新前端代码**（调用新 API）

## 九、获取帮助

如果遇到问题：

1. 检查 Supabase 日志（Dashboard → Logs）
2. 查看错误信息详情
3. 确认数据库连接正常
4. 验证脚本语法正确

---

**重要提示**：
- ⚠️ 在生产环境运行迁移前，务必在测试环境先测试
- ⚠️ 建议在低峰期运行迁移
- ⚠️ 迁移前备份数据
- ✅ 迁移脚本使用了 `IF NOT EXISTS`，可以安全地多次运行

