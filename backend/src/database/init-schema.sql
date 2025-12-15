-- Vioflow MAM 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本以创建所有表结构

-- 用户角色枚举
CREATE TYPE "user_role_enum" AS ENUM('admin', 'member', 'viewer', 'sales');

-- 团队角色枚举
CREATE TYPE IF NOT EXISTS "team_role_enum" AS ENUM('super_admin', 'admin', 'member');

-- 成员状态枚举
CREATE TYPE IF NOT EXISTS "member_status_enum" AS ENUM('pending', 'active', 'removed');

-- 用户表（先创建，不包含team_id外键）
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) UNIQUE NOT NULL,
  "name" varchar(100) NOT NULL,
  "avatar_url" varchar(500),
  "role" "user_role_enum" DEFAULT 'member',
  "password_hash" varchar(255) NOT NULL,
  "phone" varchar(20),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "users"("is_active");

-- 项目状态枚举
CREATE TYPE "project_status_enum" AS ENUM('active', 'finalized', 'delivered', 'archived');

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

-- 现在添加users表的team_id字段（因为teams表已创建）
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "team_id" uuid REFERENCES "teams"("id");
CREATE INDEX IF NOT EXISTS "idx_users_team" ON "users"("team_id");

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

-- 项目表
CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "client" varchar(100) NOT NULL,
  "lead" varchar(100) NOT NULL,
  "post_lead" varchar(100) NOT NULL,
  "group" varchar(100),
  "team_id" uuid REFERENCES "teams"("id") ON DELETE CASCADE,
  "group_id" uuid REFERENCES "project_groups"("id"),
  "month_prefix" varchar(4),
  "status" "project_status_enum" DEFAULT 'active',
  "created_date" date NOT NULL,
  "last_activity_at" timestamp,
  "last_opened_at" timestamp,
  "archived_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "finalized_at" timestamp,
  "delivered_at" timestamp
);
CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects"("status");
CREATE INDEX IF NOT EXISTS "idx_projects_group" ON "projects"("group");
CREATE INDEX IF NOT EXISTS "idx_projects_team" ON "projects"("team_id");
CREATE INDEX IF NOT EXISTS "idx_projects_group_id" ON "projects"("group_id");
CREATE INDEX IF NOT EXISTS "idx_projects_last_activity" ON "projects"("last_activity_at");
CREATE INDEX IF NOT EXISTS "idx_projects_last_opened" ON "projects"("last_opened_at");

-- 成员角色枚举
CREATE TYPE "member_role_enum" AS ENUM('owner', 'member', 'viewer');

-- 项目成员表
CREATE TABLE IF NOT EXISTS "project_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "member_role_enum" DEFAULT 'member',
  "created_at" timestamp DEFAULT now()
);

-- 标签表
CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(50) UNIQUE NOT NULL,
  "category" varchar(50),
  "usage_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_tags_name" ON "tags"("name");
CREATE INDEX IF NOT EXISTS "idx_tags_usage" ON "tags"("usage_count");

-- 视频类型枚举
CREATE TYPE "video_type_enum" AS ENUM('video', 'image', 'audio');
CREATE TYPE "video_status_enum" AS ENUM('initial', 'annotated', 'approved');
CREATE TYPE "storage_tier_enum" AS ENUM('standard', 'cold');
CREATE TYPE "aspect_ratio_enum" AS ENUM('landscape', 'portrait');

-- 视频表
CREATE TABLE IF NOT EXISTS "videos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "original_filename" varchar(255) NOT NULL,
  "base_name" varchar(255) NOT NULL,
  "version" integer NOT NULL,
  "type" "video_type_enum" DEFAULT 'video',
  "storage_url" varchar(500) NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "storage_tier" "storage_tier_enum" DEFAULT 'standard',
  "thumbnail_url" varchar(500),
  "size" bigint NOT NULL,
  "duration" integer,
  "resolution" varchar(20),
  "aspect_ratio" "aspect_ratio_enum",
  "status" "video_status_enum" DEFAULT 'initial',
  "annotation_count" integer DEFAULT 0,
  "change_log" text,
  "is_case_file" boolean DEFAULT false,
  "is_main_delivery" boolean DEFAULT false,
  "is_reference" boolean DEFAULT false,
  "referenced_video_id" uuid REFERENCES "videos"("id"),
  "uploader_id" uuid NOT NULL REFERENCES "users"("id"),
  "upload_time" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_videos_project" ON "videos"("project_id");
CREATE INDEX IF NOT EXISTS "idx_videos_base_name" ON "videos"("base_name");
CREATE INDEX IF NOT EXISTS "idx_videos_case_file" ON "videos"("is_case_file");
CREATE INDEX IF NOT EXISTS "idx_videos_main_delivery" ON "videos"("is_main_delivery");

-- 视频标签关联表
CREATE TABLE IF NOT EXISTS "video_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now(),
  UNIQUE("video_id", "tag_id")
);
CREATE INDEX IF NOT EXISTS "idx_video_tags_video" ON "video_tags"("video_id");
CREATE INDEX IF NOT EXISTS "idx_video_tags_tag" ON "video_tags"("tag_id");

-- 批注表
CREATE TABLE IF NOT EXISTS "annotations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id"),
  "timecode" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "screenshot_url" varchar(500),
  "is_completed" boolean DEFAULT false,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_annotations_video" ON "annotations"("video_id");
CREATE INDEX IF NOT EXISTS "idx_annotations_user" ON "annotations"("user_id");

-- 分享链接类型枚举
CREATE TYPE "share_link_type_enum" AS ENUM('video_review', 'video_share', 'delivery_package', 'showcase_package');

-- 分享链接表
CREATE TABLE IF NOT EXISTS "share_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id" uuid REFERENCES "videos"("id"),
  "project_id" uuid REFERENCES "projects"("id"),
  "delivery_package_id" uuid,
  "showcase_package_id" uuid,
  "type" "share_link_type_enum" NOT NULL,
  "token" varchar(100) UNIQUE NOT NULL,
  "password_hash" varchar(255),
  "allow_download" boolean DEFAULT false,
  "expires_at" timestamp,
  "download_count" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "justification" text,
  "client_name" varchar(100),
  "allow_view" boolean DEFAULT true,
  "last_accessed_at" timestamp,
  "view_count" integer DEFAULT 0,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_share_links_allow_view" ON "share_links"("allow_view");
CREATE INDEX IF NOT EXISTS "idx_share_links_last_accessed" ON "share_links"("last_accessed_at");
CREATE INDEX IF NOT EXISTS "idx_share_links_token" ON "share_links"("token");
CREATE INDEX IF NOT EXISTS "idx_share_links_active" ON "share_links"("is_active");

-- 交付表
CREATE TABLE IF NOT EXISTS "deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid UNIQUE NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "has_clean_feed" boolean DEFAULT false,
  "has_multi_resolution" boolean DEFAULT false,
  "has_script" boolean DEFAULT false,
  "has_copyright_files" boolean DEFAULT false,
  "has_tech_review" boolean DEFAULT false,
  "has_copyright_check" boolean DEFAULT false,
  "has_metadata" boolean DEFAULT false,
  "delivery_note" text,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 文件夹类型枚举
CREATE TYPE "folder_type_enum" AS ENUM('master', 'variants', 'clean_feed', 'docs');

-- 交付文件夹表
CREATE TABLE IF NOT EXISTS "delivery_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "delivery_id" uuid NOT NULL REFERENCES "deliveries"("id") ON DELETE CASCADE,
  "folder_type" "folder_type_enum" NOT NULL,
  "storage_path" varchar(500) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 交付文件类型枚举
CREATE TYPE "delivery_file_type_enum" AS ENUM('master', 'variant', 'clean_feed', 'script', 'copyright_music', 'copyright_video', 'copyright_font');

-- 交付文件表
CREATE TABLE IF NOT EXISTS "delivery_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "delivery_id" uuid NOT NULL REFERENCES "deliveries"("id") ON DELETE CASCADE,
  "folder_id" uuid REFERENCES "delivery_folders"("id"),
  "file_type" "delivery_file_type_enum" NOT NULL,
  "storage_url" varchar(500) NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "filename" varchar(255) NOT NULL,
  "size" bigint NOT NULL,
  "uploaded_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

-- 交付包表
CREATE TABLE IF NOT EXISTS "delivery_packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "delivery_id" uuid NOT NULL REFERENCES "deliveries"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "share_link_id" uuid REFERENCES "share_links"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_delivery_packages_delivery" ON "delivery_packages"("delivery_id");

-- 交付包文件关联表
CREATE TABLE IF NOT EXISTS "delivery_package_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "package_id" uuid NOT NULL REFERENCES "delivery_packages"("id") ON DELETE CASCADE,
  "video_id" uuid REFERENCES "videos"("id"),
  "file_id" uuid REFERENCES "delivery_files"("id"),
  "created_at" timestamp DEFAULT now()
);

-- 案例包模式枚举
CREATE TYPE "showcase_mode_enum" AS ENUM('quick_player', 'pitch_page');

-- 案例包表
CREATE TABLE IF NOT EXISTS "showcase_packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "mode" "showcase_mode_enum" NOT NULL,
  "client_name" varchar(100),
  "share_link_id" uuid REFERENCES "share_links"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "sales_user_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 案例包视频关联表
CREATE TABLE IF NOT EXISTS "showcase_package_videos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "package_id" uuid NOT NULL REFERENCES "showcase_packages"("id") ON DELETE CASCADE,
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "order" integer NOT NULL,
  "description" text,
  "group_name" varchar(100),
  "created_at" timestamp DEFAULT now()
);

-- 观看追踪表
CREATE TABLE IF NOT EXISTS "showcase_view_tracking" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "package_id" uuid NOT NULL REFERENCES "showcase_packages"("id") ON DELETE CASCADE,
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "viewer_ip" varchar(45) NOT NULL,
  "viewer_user_agent" varchar(500) NOT NULL,
  "progress" integer NOT NULL,
  "duration_watched" integer NOT NULL,
  "last_updated_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_tracking_package" ON "showcase_view_tracking"("package_id");
CREATE INDEX IF NOT EXISTS "idx_tracking_video" ON "showcase_view_tracking"("video_id");

-- 通知类型枚举
CREATE TYPE "notification_type_enum" AS ENUM('info', 'success', 'alert', 'view_tracking');

-- 通知表
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "notification_type_enum" NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "related_type" varchar(50) NOT NULL,
  "related_id" uuid,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications"("is_read");

-- 上传状态枚举
CREATE TYPE "upload_status_enum" AS ENUM('pending', 'uploading', 'processing', 'completed', 'failed');

-- 上传任务表
CREATE TABLE IF NOT EXISTS "upload_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "filename" varchar(255) NOT NULL,
  "total_size" bigint NOT NULL,
  "uploaded_size" bigint DEFAULT 0,
  "status" "upload_status_enum" DEFAULT 'pending',
  "storage_key" varchar(500),
  "error_message" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 归档状态枚举
CREATE TYPE "archiving_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed');

-- 归档任务表
CREATE TABLE IF NOT EXISTS "archiving_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "status" "archiving_status_enum" DEFAULT 'pending',
  "files_count" integer DEFAULT 0,
  "total_size" bigint DEFAULT 0,
  "cold_storage_path" varchar(500),
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_archiving_project" ON "archiving_tasks"("project_id");
CREATE INDEX IF NOT EXISTS "idx_archiving_status" ON "archiving_tasks"("status");

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

