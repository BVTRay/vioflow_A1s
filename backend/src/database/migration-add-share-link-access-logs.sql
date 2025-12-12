-- Vioflow MAM 数据库迁移脚本：添加分享链接访问记录表
-- 在 Supabase SQL Editor 中运行此脚本

-- ============================================
-- 第一部分：新增表结构
-- ============================================

-- 分享链接访问记录表
CREATE TABLE IF NOT EXISTS "share_link_access_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "share_link_id" uuid NOT NULL REFERENCES "share_links"("id") ON DELETE CASCADE,
  "action" varchar(20) NOT NULL, -- 'view', 'download'
  "viewer_ip" varchar(45),
  "viewer_user_agent" varchar(500),
  "viewer_email" varchar(255), -- 访客邮箱（如果有）
  "viewer_name" varchar(100), -- 访客名称（如果有）
  "resource_type" varchar(50), -- 'video', 'delivery_package', 'showcase_package'
  "resource_id" uuid, -- 访问的资源ID
  "file_name" varchar(255), -- 下载的文件名（如果是下载操作）
  "file_size" bigint, -- 下载的文件大小（如果是下载操作）
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_access_logs_share_link" ON "share_link_access_logs"("share_link_id");
CREATE INDEX IF NOT EXISTS "idx_access_logs_action" ON "share_link_access_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_access_logs_created" ON "share_link_access_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_access_logs_resource" ON "share_link_access_logs"("resource_type", "resource_id");

-- ============================================
-- 第二部分：可选优化字段（根据需要选择是否添加）
-- ============================================

-- 可选：添加允许查看的明确字段
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "allow_view" boolean DEFAULT true;

-- 可选：添加最后访问时间
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "last_accessed_at" timestamp;

-- 可选：添加访问次数
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_share_links_allow_view" ON "share_links"("allow_view");
CREATE INDEX IF NOT EXISTS "idx_share_links_last_accessed" ON "share_links"("last_accessed_at");

-- ============================================
-- 第三部分：创建触发器（自动更新统计）
-- ============================================

-- 自动更新 share_links 的访问统计
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
-- 完成提示
-- ============================================

-- 迁移完成！请验证以下内容：
-- 1. share_link_access_logs 表已创建
-- 2. 所有索引已创建
-- 3. 触发器已创建
-- 4. 可选字段已添加（如果选择了）

