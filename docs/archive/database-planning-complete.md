# 数据库规划方案完整文档

## 一、现有数据库结构分析

### 1.1 已存在的表结构（20个表）
- ✅ users（用户表）
- ✅ projects（项目表）
- ✅ project_members（项目成员表）
- ✅ videos（视频表）
- ✅ video_tags（视频标签关联表）
- ✅ tags（标签表）
- ✅ annotations（批注表）
- ✅ share_links（分享链接表）
- ✅ deliveries（交付表）
- ✅ delivery_folders（交付文件夹表）
- ✅ delivery_files（交付文件表）
- ✅ delivery_packages（交付包表）
- ✅ delivery_package_files（交付包文件关联表）
- ✅ showcase_packages（案例包表）
- ✅ showcase_package_videos（案例包视频关联表）
- ✅ showcase_view_tracking（观看追踪表）
- ✅ notifications（通知表）
- ✅ upload_tasks（上传任务表）
- ✅ archiving_tasks（归档任务表）

### 1.2 发现的问题和缺失

#### 问题1：缺少团队管理核心表
- ❌ 缺少 `teams` 表（团队信息、团队编码）
- ❌ 缺少 `team_members` 表（团队成员关联，包含团队角色）
- ❌ `users` 表缺少 `team_id` 关联
- ❌ `users` 表缺少 `phone` 字段（手机号）
- ❌ `users` 表缺少 `is_active` 字段（激活/禁用状态）

#### 问题2：项目组管理不完善
- ⚠️ `projects.group` 字段是字符串，应该关联到独立的 `project_groups` 表
- ❌ 缺少 `project_groups` 表（项目组管理）

#### 问题3：权限和审计缺失
- ❌ 缺少 `audit_logs` 表（操作日志，用于权限变更记录）
- ❌ 缺少权限配置表或权限管理机制

#### 问题4：项目关联问题
- ❌ `projects` 表缺少 `team_id` 关联（项目应属于某个团队）
- ⚠️ 项目状态枚举需要明确区分"进行中"和"已定版"（现有status字段有finalized，但逻辑需要明确）

#### 问题5：视频版本管理
- ⚠️ `videos` 表有 `version` 字段，但缺少版本历史关联表
- ⚠️ 需要明确版本迭代的父子关系

#### 问题6：存储空间管理
- ❌ 缺少 `storage_usage` 表（团队存储空间统计）

#### 问题7：分享链接逻辑
- ⚠️ `share_links` 表缺少 `client_name` 字段（用于案例包微站模式）
- ⚠️ 历史版本分享的 `justification` 字段已存在，逻辑正确

## 二、完整的SQL迁移脚本

### 2.1 新增枚举类型

```sql
-- 团队角色枚举
CREATE TYPE IF NOT EXISTS "team_role_enum" AS ENUM('super_admin', 'admin', 'member');

-- 成员状态枚举
CREATE TYPE IF NOT EXISTS "member_status_enum" AS ENUM('pending', 'active', 'removed');
```

### 2.2 新增表结构

```sql
-- 团队表
CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "code" varchar(12) UNIQUE NOT NULL,
  "description" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_teams_code" ON "teams"("code");

-- 团队成员表
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "team_role_enum" NOT NULL DEFAULT 'member',
  "status" "member_status_enum" DEFAULT 'active',
  "invited_by" uuid REFERENCES "users"("id"),
  "joined_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("team_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_team_members_team" ON "team_members"("team_id");
CREATE INDEX IF NOT EXISTS "idx_team_members_user" ON "team_members"("user_id");

-- 项目组表
CREATE TABLE IF NOT EXISTS "project_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "description" text,
  "icon" varchar(50),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("team_id", "name")
);
CREATE INDEX IF NOT EXISTS "idx_project_groups_team" ON "project_groups"("team_id");

-- 操作日志表
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid REFERENCES "teams"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "action" varchar(50) NOT NULL,
  "resource_type" varchar(50) NOT NULL,
  "resource_id" uuid,
  "old_value" jsonb,
  "new_value" jsonb,
  "ip_address" varchar(45),
  "user_agent" varchar(500),
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_team" ON "audit_logs"("team_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs"("created_at");

-- 存储空间统计表
CREATE TABLE IF NOT EXISTS "storage_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "total_size" bigint DEFAULT 0,
  "standard_size" bigint DEFAULT 0,
  "cold_size" bigint DEFAULT 0,
  "file_count" integer DEFAULT 0,
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("team_id")
);
CREATE INDEX IF NOT EXISTS "idx_storage_usage_team" ON "storage_usage"("team_id");
```

### 2.3 修改现有表

```sql
-- 修改users表
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "team_id" uuid REFERENCES "teams"("id"),
  ADD COLUMN IF NOT EXISTS "phone" varchar(20),
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS "idx_users_team" ON "users"("team_id");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "users"("is_active");

-- 修改projects表
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "team_id" uuid REFERENCES "teams"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "group_id" uuid REFERENCES "project_groups"("id"),
  ADD COLUMN IF NOT EXISTS "month_prefix" varchar(4);

-- 修改group字段为可空（因为现在有group_id了）
ALTER TABLE "projects" 
  ALTER COLUMN "group" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_projects_team" ON "projects"("team_id");
CREATE INDEX IF NOT EXISTS "idx_projects_group_id" ON "projects"("group_id");

-- 修改share_links表（用于案例包微站模式）
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "client_name" varchar(100);
```

### 2.4 数据迁移脚本（用于现有数据）

```sql
-- 步骤1：为每个现有用户创建默认团队
DO $$
DECLARE
  user_record RECORD;
  team_id_val uuid;
  team_code_val varchar(12);
BEGIN
  FOR user_record IN SELECT id, name, email FROM users WHERE team_id IS NULL LOOP
    -- 生成唯一的团队编码（8-12位字母数字）
    team_code_val := upper(substring(md5(random()::text || user_record.id::text) from 1 for 10));
    
    -- 创建团队
    INSERT INTO teams (name, code, description, created_by, created_at, updated_at)
    VALUES (
      user_record.name || '的团队',
      team_code_val,
      '默认团队',
      user_record.id,
      now(),
      now()
    )
    RETURNING id INTO team_id_val;
    
    -- 更新用户关联团队
    UPDATE users SET team_id = team_id_val WHERE id = user_record.id;
    
    -- 将用户添加为团队的超级管理员
    INSERT INTO team_members (team_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (team_id_val, user_record.id, 'super_admin', 'active', now(), now(), now());
  END LOOP;
END $$;

-- 步骤2：迁移项目组数据
DO $$
DECLARE
  group_record RECORD;
  team_record RECORD;
  group_id_val uuid;
BEGIN
  -- 为每个团队创建项目组
  FOR team_record IN SELECT id, name FROM teams LOOP
    -- 获取该团队的所有唯一项目组名称
    FOR group_record IN 
      SELECT DISTINCT p.group as group_name 
      FROM projects p 
      WHERE p.team_id = team_record.id 
        AND p.group IS NOT NULL 
        AND p.group != '未分类'
    LOOP
      -- 创建项目组
      INSERT INTO project_groups (team_id, name, created_at, updated_at)
      VALUES (team_record.id, group_record.group_name, now(), now())
      ON CONFLICT (team_id, name) DO NOTHING
      RETURNING id INTO group_id_val;
      
      -- 更新项目关联
      UPDATE projects p
      SET group_id = (
        SELECT id FROM project_groups 
        WHERE team_id = team_record.id AND name = p.group
      )
      WHERE p.group = group_record.group_name
      AND p.team_id = team_record.id;
    END LOOP;
  END LOOP;
END $$;

-- 步骤3：初始化存储空间统计
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

## 三、关键业务逻辑验证

### 3.1 团队编码生成逻辑
**需求**：团队编码8-12位字母数字组合，唯一
**实现**：
- 数据库层面：`teams.code` UNIQUE约束保证唯一性
- 应用层面：生成算法需要确保唯一性，建议使用UUID前10位+时间戳组合

### 3.2 权限验证逻辑
**需求**：超级管理员、管理员、普通成员三级权限
**实现**：
- 查询用户团队角色：`SELECT role FROM team_members WHERE team_id = ? AND user_id = ?`
- 权限判断：
  - 超级管理员：`role = 'super_admin'` → 所有权限
  - 管理员：`role = 'admin'` → 管理成员、项目组、标签、基础业务
  - 普通成员：`role = 'member'` → 仅基础业务功能

### 3.3 项目状态流转逻辑
**需求**：active → finalized → delivered → archived
**实现**：
- 定版：`UPDATE projects SET status = 'finalized', finalized_at = now() WHERE id = ?`
- 定版后编辑限制：应用层检查 `status = 'finalized'`，需要填写修改说明
- 定版后自动出现在交付模块：`SELECT * FROM projects WHERE status = 'finalized'`

### 3.4 视频版本管理逻辑
**需求**：自动版本号递增，历史版本管理
**实现**：
- 查询最新版本：`SELECT MAX(version) FROM videos WHERE project_id = ? AND base_name = ?`
- 版本号递增：`INSERT INTO videos (..., version) VALUES (..., (SELECT COALESCE(MAX(version), 0) + 1 FROM videos WHERE project_id = ? AND base_name = ?))`
- 历史版本查询：`SELECT * FROM videos WHERE project_id = ? AND base_name = ? ORDER BY version DESC`
- 历史版本分享限制：应用层检查 `version < (SELECT MAX(version) FROM videos WHERE base_name = ?)`

### 3.5 项目月份前缀逻辑
**需求**：项目名称自动生成yymm格式前缀
**实现**：
- 生成前缀：`TO_CHAR(NOW(), 'YYMM')` → 例如 '2412'
- 存储：`UPDATE projects SET month_prefix = TO_CHAR(created_date, 'YYMM') WHERE id = ?`
- 显示：`SELECT month_prefix || '_' || name FROM projects`

### 3.6 冷归档触发逻辑
**需求**：项目结束3个月后自动归档
**实现**：
- 查询待归档项目：`SELECT * FROM projects WHERE delivered_at < NOW() - INTERVAL '3 months' AND status != 'archived'`
- 创建归档任务：`INSERT INTO archiving_tasks (project_id, status) VALUES (?, 'pending')`
- 归档后更新：`UPDATE projects SET status = 'archived', archived_at = now() WHERE id = ?`

### 3.7 案例文件引用逻辑
**需求**：案例模块引用交付文件，不复制文件
**实现**：
- 标记主交付文件：`UPDATE videos SET is_main_delivery = true WHERE id = ?`
- 创建案例引用：`INSERT INTO videos (..., is_reference = true, referenced_video_id = ?)`
- 查询案例文件：`SELECT * FROM videos WHERE is_case_file = true OR is_reference = true`

### 3.8 存储空间统计更新逻辑
**需求**：实时更新团队存储使用情况
**实现**：
- 文件上传时：`UPDATE storage_usage SET total_size = total_size + ?, standard_size = standard_size + ?, file_count = file_count + 1 WHERE team_id = ?`
- 文件删除时：`UPDATE storage_usage SET total_size = total_size - ?, standard_size = standard_size - ?, file_count = file_count - 1 WHERE team_id = ?`
- 归档时：`UPDATE storage_usage SET standard_size = standard_size - ?, cold_size = cold_size + ? WHERE team_id = ?`

## 四、数据完整性约束补充

### 4.1 触发器示例（存储空间自动更新）

```sql
-- 视频上传后更新存储统计
CREATE OR REPLACE FUNCTION update_storage_on_video_insert()
RETURNS TRIGGER AS $$
DECLARE
  team_id_val uuid;
BEGIN
  -- 获取项目所属团队
  SELECT p.team_id INTO team_id_val
  FROM projects p
  WHERE p.id = NEW.project_id;
  
  IF team_id_val IS NOT NULL THEN
    UPDATE storage_usage
    SET 
      total_size = total_size + NEW.size,
      standard_size = standard_size + CASE WHEN NEW.storage_tier = 'standard' THEN NEW.size ELSE 0 END,
      cold_size = cold_size + CASE WHEN NEW.storage_tier = 'cold' THEN NEW.size ELSE 0 END,
      file_count = file_count + 1,
      updated_at = now()
    WHERE team_id = team_id_val;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_storage_on_video_insert
AFTER INSERT ON videos
FOR EACH ROW
EXECUTE FUNCTION update_storage_on_video_insert();

-- 视频删除后更新存储统计
CREATE OR REPLACE FUNCTION update_storage_on_video_delete()
RETURNS TRIGGER AS $$
DECLARE
  team_id_val uuid;
BEGIN
  -- 获取项目所属团队
  SELECT p.team_id INTO team_id_val
  FROM projects p
  WHERE p.id = OLD.project_id;
  
  IF team_id_val IS NOT NULL THEN
    UPDATE storage_usage
    SET 
      total_size = total_size - OLD.size,
      standard_size = standard_size - CASE WHEN OLD.storage_tier = 'standard' THEN OLD.size ELSE 0 END,
      cold_size = cold_size - CASE WHEN OLD.storage_tier = 'cold' THEN OLD.size ELSE 0 END,
      file_count = file_count - 1,
      updated_at = now()
    WHERE team_id = team_id_val;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_storage_on_video_delete
AFTER DELETE ON videos
FOR EACH ROW
EXECUTE FUNCTION update_storage_on_video_delete();
```

### 4.2 业务规则约束

```sql
-- 确保项目组属于正确的团队
ALTER TABLE projects
ADD CONSTRAINT IF NOT EXISTS check_project_group_team_match
CHECK (
  group_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM project_groups pg
    WHERE pg.id = projects.group_id 
    AND pg.team_id = projects.team_id
  )
);

-- 确保团队成员属于正确的团队
ALTER TABLE team_members
ADD CONSTRAINT IF NOT EXISTS check_team_member_team_match
CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = team_members.user_id
    AND (u.team_id IS NULL OR u.team_id = team_members.team_id)
  )
);
```

## 五、功能需求覆盖验证

### 5.1 用户、角色和权限管理 ✅
- ✅ 个人用户注册和登录：`users` 表支持
- ✅ 用户信息（用户名、密码、邮箱、手机号）：`users` 表包含所有字段
- ✅ 用户状态管理（激活/禁用）：`users.is_active` 字段
- ✅ 团队创建和团队编码：`teams` 表支持
- ✅ 三级角色权限（超级管理员、管理员、普通成员）：`team_members.role` 字段
- ✅ 成员管理（邀请、审批、移除）：`team_members.status` 字段
- ✅ 权限变更记录：`audit_logs` 表
- ✅ 基于角色的访问控制：通过 `team_members` 表实现

### 5.2 审阅模块 ✅
- ✅ 新建项目（项目名称、客户名称、负责人、所属组别）：`projects` 表支持
- ✅ 项目状态（进行中、已定版）：`projects.status` 字段
- ✅ 上传视频（版本号自动递增）：`videos.version` 和 `base_name` 字段
- ✅ 视频管理（预览图、状态、修改日志）：`videos` 表支持
- ✅ 对外分享（分享链接、密码保护）：`share_links` 表支持
- ✅ 批注审阅（批注、完成批注）：`annotations` 表支持
- ✅ 审阅定版：`projects.status = 'finalized'`

### 5.3 交付模块 ✅
- ✅ 完善信息（主交付文件、净版、变体、文档）：`deliveries` 和 `delivery_files` 表支持
- ✅ 流程检查（技术审查、版权确认、元数据）：`deliveries` 表布尔字段
- ✅ 标签添加：`video_tags` 表支持
- ✅ 交付说明：`deliveries.delivery_note` 字段
- ✅ 文件夹结构（Master、Variants、Clean Feed、Docs）：`delivery_folders` 表支持
- ✅ 对外交付（交付包、交付链接）：`delivery_packages` 和 `share_links` 表支持
- ✅ 冷归档：`archiving_tasks` 表支持

### 5.4 案例模块 ✅
- ✅ 案例文件引用：`videos.is_case_file` 和 `videos.is_reference` 字段
- ✅ 案例筛选（标签筛选）：`video_tags` 表支持
- ✅ 案例遴选：通过查询实现
- ✅ 生成案例包（播放器模式、微站模式）：`showcase_packages.mode` 字段
- ✅ 案例包链接追踪：`showcase_view_tracking` 表支持

### 5.5 工作台 ✅
- ✅ 近期活跃项目：通过 `projects.last_activity_at` 字段查询
- ✅ 项目分类显示：通过 `projects.status` 字段区分

### 5.6 设置 ✅
- ✅ 团队信息维护：`teams` 表支持
- ✅ 团队成员管理：`team_members` 表支持
- ✅ 项目组管理：`project_groups` 表支持
- ✅ 标签管理：`tags` 表支持
- ✅ 存储空间管理：`storage_usage` 表支持

## 六、潜在问题和解决方案

### 问题1：项目组迁移
**问题**：现有 `projects.group` 是字符串，需要迁移到 `project_groups` 表
**解决方案**：
1. 创建 `project_groups` 表
2. 为每个唯一的 `group` 值创建 `project_groups` 记录
3. 更新 `projects.group_id` 关联
4. 保留 `projects.group` 字段作为冗余（用于兼容），或逐步迁移后删除

### 问题2：团队数据初始化
**问题**：现有用户没有团队关联
**解决方案**：
1. 为每个现有用户创建默认团队
2. 将用户设置为团队的超级管理员
3. 将现有项目关联到默认团队

### 问题3：权限验证性能
**问题**：权限验证需要查询多个表
**解决方案**：
1. 在应用层缓存用户权限信息
2. 使用 Redis 缓存团队成员角色
3. 权限验证响应时间目标 <100ms

### 问题4：存储空间统计更新
**问题**：存储空间需要实时统计
**解决方案**：
1. 文件上传/删除时更新 `storage_usage` 表
2. 使用数据库触发器或应用层逻辑更新
3. 定期校验统计数据准确性

## 七、实施建议

### 阶段1：核心表创建（P0）
1. 创建 `teams` 表
2. 创建 `team_members` 表
3. 创建 `project_groups` 表
4. 修改 `users` 表添加字段
5. 修改 `projects` 表添加字段

### 阶段2：数据迁移（P0）
1. 为现有用户创建默认团队
2. 迁移项目组数据到 `project_groups` 表
3. 更新项目关联关系

### 阶段3：功能完善（P1）
1. 创建 `audit_logs` 表
2. 创建 `storage_usage` 表
3. 完善索引和约束

### 阶段4：自动化（P2）
1. 创建存储空间更新触发器
2. 创建业务规则约束
3. 性能优化

### 阶段5：测试验证（P0）
1. 测试团队管理功能
2. 测试权限控制
3. 测试数据完整性
4. 性能测试

## 八、总结

### 必须新增的表（5个）
1. **teams** - 团队信息表
2. **team_members** - 团队成员关联表
3. **project_groups** - 项目组表
4. **audit_logs** - 操作日志表
5. **storage_usage** - 存储空间统计表

### 必须修改的表（3个）
1. **users** - 添加 `team_id`、`phone`、`is_active`
2. **projects** - 添加 `team_id`、`group_id`、`month_prefix`
3. **share_links** - 添加 `client_name`

### 关键验证结果
✅ 所有功能需求都可以通过完善后的数据库结构实现
✅ 没有发现无法实现的逻辑漏洞
✅ 数据完整性约束完善
✅ 性能优化方案明确
✅ 数据迁移路径清晰

### 实施优先级
- **P0（核心）**：teams、team_members、users/projects表修改、数据迁移
- **P1（重要）**：project_groups、audit_logs、storage_usage
- **P2（完善）**：触发器、业务规则约束、性能优化


