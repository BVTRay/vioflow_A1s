-- ============================================
-- Vioflow MAM 数据库迁移脚本 - 完整版
-- 在 Supabase SQL Editor 中一次性运行此脚本
-- ============================================

-- ============================================
-- 第一部分：新增枚举类型
-- ============================================

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

-- ============================================
-- 第二部分：新增表结构
-- ============================================

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

-- 分享链接访问记录表
CREATE TABLE IF NOT EXISTS "share_link_access_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "share_link_id" uuid NOT NULL REFERENCES "share_links"("id") ON DELETE CASCADE,
  "action" varchar(20) NOT NULL,
  "viewer_ip" varchar(45),
  "viewer_user_agent" varchar(500),
  "viewer_email" varchar(255),
  "viewer_name" varchar(100),
  "resource_type" varchar(50),
  "resource_id" uuid,
  "file_name" varchar(255),
  "file_size" bigint,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_access_logs_share_link" ON "share_link_access_logs"("share_link_id");
CREATE INDEX IF NOT EXISTS "idx_access_logs_action" ON "share_link_access_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_access_logs_created" ON "share_link_access_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_access_logs_resource" ON "share_link_access_logs"("resource_type", "resource_id");

-- ============================================
-- 第三部分：修改现有表
-- ============================================

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

-- 修改group字段为可空
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'group' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "projects" ALTER COLUMN "group" DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_projects_team" ON "projects"("team_id");
CREATE INDEX IF NOT EXISTS "idx_projects_group_id" ON "projects"("group_id");

-- 修改share_links表
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "client_name" varchar(100),
  ADD COLUMN IF NOT EXISTS "allow_view" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "last_accessed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_share_links_allow_view" ON "share_links"("allow_view");
CREATE INDEX IF NOT EXISTS "idx_share_links_last_accessed" ON "share_links"("last_accessed_at");

-- ============================================
-- 第四部分：数据迁移（为现有数据创建默认团队）
-- ============================================

-- 步骤1：为每个现有用户创建默认团队
DO $$
DECLARE
  user_record RECORD;
  team_id_val uuid;
  team_code_val varchar(12);
  code_exists boolean;
BEGIN
  FOR user_record IN SELECT id, name, email FROM users WHERE team_id IS NULL LOOP
    -- 生成唯一的团队编码
    LOOP
      team_code_val := upper(substring(md5(random()::text || user_record.id::text || clock_timestamp()::text) from 1 for 10));
      SELECT EXISTS(SELECT 1 FROM teams WHERE code = team_code_val) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- 创建团队
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
    
    -- 更新用户关联团队
    UPDATE users SET team_id = team_id_val WHERE id = user_record.id;
    
    -- 将用户添加为团队的超级管理员
    INSERT INTO team_members (team_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (team_id_val, user_record.id, 'super_admin', 'active', now(), now(), now())
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- 步骤2：为现有项目关联团队
DO $$
DECLARE
  project_record RECORD;
  team_id_val uuid;
BEGIN
  FOR project_record IN 
    SELECT DISTINCT p.id, u.team_id
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id
    JOIN users u ON u.id = pm.user_id
    WHERE p.team_id IS NULL AND u.team_id IS NOT NULL
  LOOP
    SELECT u.team_id INTO team_id_val
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = project_record.id
    AND u.team_id IS NOT NULL
    LIMIT 1;
    
    IF team_id_val IS NOT NULL THEN
      UPDATE projects SET team_id = team_id_val WHERE id = project_record.id;
    END IF;
  END LOOP;
END $$;

-- 步骤3：迁移项目组数据
DO $$
DECLARE
  group_record RECORD;
  team_record RECORD;
  group_id_val uuid;
BEGIN
  FOR team_record IN SELECT id, name FROM teams LOOP
    FOR group_record IN 
      SELECT DISTINCT p.group as group_name 
      FROM projects p 
      WHERE p.team_id = team_record.id 
        AND p.group IS NOT NULL 
        AND p.group != '未分类'
        AND p.group != ''
    LOOP
      INSERT INTO project_groups (team_id, name, created_at, updated_at)
      VALUES (team_record.id, group_record.group_name, now(), now())
      ON CONFLICT (team_id, name) DO NOTHING
      RETURNING id INTO group_id_val;
      
      UPDATE projects p
      SET group_id = (
        SELECT id FROM project_groups 
        WHERE team_id = team_record.id AND name = p.group
        LIMIT 1
      )
      WHERE p.group = group_record.group_name
      AND p.team_id = team_record.id
      AND p.group_id IS NULL;
    END LOOP;
  END LOOP;
END $$;

-- 步骤4：初始化存储空间统计
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

-- ============================================
-- 第五部分：创建触发器
-- ============================================

-- 视频上传后更新存储统计
CREATE OR REPLACE FUNCTION update_storage_on_video_insert()
RETURNS TRIGGER AS $$
DECLARE
  team_id_val uuid;
BEGIN
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

DROP TRIGGER IF EXISTS trigger_update_storage_on_video_insert ON videos;
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
  SELECT p.team_id INTO team_id_val
  FROM projects p
  WHERE p.id = OLD.project_id;
  
  IF team_id_val IS NOT NULL THEN
    UPDATE storage_usage
    SET 
      total_size = total_size - OLD.size,
      standard_size = standard_size - CASE WHEN OLD.storage_tier = 'standard' THEN OLD.size ELSE 0 END,
      cold_size = cold_size - CASE WHEN OLD.storage_tier = 'cold' THEN OLD.size ELSE 0 END,
      file_count = GREATEST(file_count - 1, 0),
      updated_at = now()
    WHERE team_id = team_id_val;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_storage_on_video_delete ON videos;
CREATE TRIGGER trigger_update_storage_on_video_delete
AFTER DELETE ON videos
FOR EACH ROW
EXECUTE FUNCTION update_storage_on_video_delete();

-- 视频存储层级变更后更新存储统计
CREATE OR REPLACE FUNCTION update_storage_on_video_tier_change()
RETURNS TRIGGER AS $$
DECLARE
  team_id_val uuid;
BEGIN
  IF OLD.storage_tier != NEW.storage_tier THEN
    SELECT p.team_id INTO team_id_val
    FROM projects p
    WHERE p.id = NEW.project_id;
    
    IF team_id_val IS NOT NULL THEN
      UPDATE storage_usage
      SET 
        standard_size = standard_size - CASE WHEN OLD.storage_tier = 'standard' THEN OLD.size ELSE 0 END,
        cold_size = cold_size - CASE WHEN OLD.storage_tier = 'cold' THEN OLD.size ELSE 0 END,
        updated_at = now()
      WHERE team_id = team_id_val;
      
      UPDATE storage_usage
      SET 
        standard_size = standard_size + CASE WHEN NEW.storage_tier = 'standard' THEN NEW.size ELSE 0 END,
        cold_size = cold_size + CASE WHEN NEW.storage_tier = 'cold' THEN NEW.size ELSE 0 END,
        updated_at = now()
      WHERE team_id = team_id_val;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_storage_on_video_tier_change ON videos;
CREATE TRIGGER trigger_update_storage_on_video_tier_change
AFTER UPDATE OF storage_tier ON videos
FOR EACH ROW
WHEN (OLD.storage_tier IS DISTINCT FROM NEW.storage_tier)
EXECUTE FUNCTION update_storage_on_video_tier_change();

-- 分享链接访问统计触发器
CREATE OR REPLACE FUNCTION update_share_link_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action = 'view' THEN
    UPDATE share_links
    SET 
      view_count = COALESCE(view_count, 0) + 1,
      last_accessed_at = NEW.created_at
    WHERE id = NEW.share_link_id;
  ELSIF NEW.action = 'download' THEN
    UPDATE share_links
    SET 
      download_count = COALESCE(download_count, 0) + 1,
      last_accessed_at = NEW.created_at
    WHERE id = NEW.share_link_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_share_link_stats ON share_link_access_logs;
CREATE TRIGGER trigger_update_share_link_stats
AFTER INSERT ON share_link_access_logs
FOR EACH ROW
EXECUTE FUNCTION update_share_link_stats();

-- ============================================
-- 第六部分：创建业务规则约束
-- ============================================

-- 确保项目组属于正确的团队
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_project_group_team_match'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT check_project_group_team_match
    CHECK (
      group_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM project_groups pg
        WHERE pg.id = projects.group_id 
        AND pg.team_id = projects.team_id
      )
    );
  END IF;
END $$;

-- ============================================
-- 完成提示
-- ============================================

-- 迁移完成！运行以下查询验证：

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('teams', 'team_members', 'project_groups', 'audit_logs', 'storage_usage', 'share_link_access_logs')
-- ORDER BY table_name;

