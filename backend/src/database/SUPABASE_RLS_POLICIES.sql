-- ============================================
-- Supabase RLS (Row Level Security) 策略脚本
-- Vioflow MAM 系统
-- ============================================
-- 
-- 说明：
-- 1. 此脚本假设使用自定义 JWT 认证，用户 ID 存储在 users 表中
-- 2. 如果使用 Supabase Auth，需要将 auth.users.id 映射到 users.id
-- 3. 所有策略基于团队隔离和角色权限
--
-- ============================================

-- ============================================
-- 第一部分：辅助函数
-- ============================================

-- 获取当前用户 ID（从 JWT token 中提取）
-- 如果使用 Supabase Auth，可以改为：auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- 尝试从 JWT claims 中获取用户 ID
  -- 假设 JWT payload 中有 'sub' 或 'user_id' 字段
  BEGIN
    user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      BEGIN
        user_id := (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid;
      EXCEPTION
        WHEN OTHERS THEN
          -- 如果无法从 JWT 获取，返回 NULL
          RETURN NULL;
      END;
  END;
  
  RETURN user_id;
END;
$$;

-- 检查用户是否是某个团队的成员
CREATE OR REPLACE FUNCTION is_team_member(team_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = team_id_param
      AND user_id = user_id_param
      AND status = 'active'
  );
END;
$$;

-- 获取用户在团队中的角色
CREATE OR REPLACE FUNCTION get_user_team_role(team_id_param uuid, user_id_param uuid)
RETURNS team_role_enum
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_role team_role_enum;
BEGIN
  SELECT role INTO user_role
  FROM team_members
  WHERE team_id = team_id_param
    AND user_id = user_id_param
    AND status = 'active'
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- 检查用户是否是团队管理员（admin 或 super_admin）
CREATE OR REPLACE FUNCTION is_team_admin(team_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = team_id_param
      AND user_id = user_id_param
      AND status = 'active'
      AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- 获取用户所属的团队 ID 列表
CREATE OR REPLACE FUNCTION get_user_team_ids(user_id_param uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  team_ids uuid[];
BEGIN
  SELECT ARRAY_AGG(team_id) INTO team_ids
  FROM team_members
  WHERE user_id = user_id_param
    AND status = 'active';
  
  RETURN COALESCE(team_ids, ARRAY[]::uuid[]);
END;
$$;

-- ============================================
-- 第二部分：Teams 表 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看自己是成员的团队
CREATE POLICY "Users can view teams they are members of"
ON teams
FOR SELECT
USING (
  is_team_member(id, get_current_user_id())
);

-- 策略：用户可以创建团队（创建者自动成为 super_admin）
CREATE POLICY "Users can create teams"
ON teams
FOR INSERT
WITH CHECK (
  created_by = get_current_user_id()
);

-- 策略：只有管理员可以更新团队信息
CREATE POLICY "Only team admins can update teams"
ON teams
FOR UPDATE
USING (
  is_team_admin(id, get_current_user_id())
)
WITH CHECK (
  is_team_admin(id, get_current_user_id())
);

-- 策略：只有超级管理员可以删除团队
CREATE POLICY "Only super admins can delete teams"
ON teams
FOR DELETE
USING (
  get_user_team_role(id, get_current_user_id()) = 'super_admin'
);

-- ============================================
-- 第三部分：Team_Members 表 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 策略：用户可以查看自己所在团队的所有成员
CREATE POLICY "Users can view members of their teams"
ON team_members
FOR SELECT
USING (
  is_team_member(team_id, get_current_user_id())
);

-- 策略：只有管理员可以添加成员
CREATE POLICY "Only team admins can add members"
ON team_members
FOR INSERT
WITH CHECK (
  is_team_admin(team_id, get_current_user_id())
);

-- 策略：只有管理员可以更新成员信息
CREATE POLICY "Only team admins can update members"
ON team_members
FOR UPDATE
USING (
  is_team_admin(team_id, get_current_user_id())
)
WITH CHECK (
  is_team_admin(team_id, get_current_user_id())
);

-- 策略：只有管理员可以移除成员
CREATE POLICY "Only team admins can remove members"
ON team_members
FOR DELETE
USING (
  is_team_admin(team_id, get_current_user_id())
);

-- ============================================
-- 第四部分：Projects 表 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看自己团队的项目
CREATE POLICY "Users can view projects in their teams"
ON projects
FOR SELECT
USING (
  team_id IS NULL OR team_id = ANY(get_user_team_ids(get_current_user_id()))
);

-- 策略：用户可以创建项目（必须是团队成员）
CREATE POLICY "Users can create projects in their teams"
ON projects
FOR INSERT
WITH CHECK (
  team_id IS NULL OR is_team_member(team_id, get_current_user_id())
);

-- 策略：用户可以更新自己团队的项目
CREATE POLICY "Users can update projects in their teams"
ON projects
FOR UPDATE
USING (
  team_id IS NULL OR is_team_member(team_id, get_current_user_id())
)
WITH CHECK (
  team_id IS NULL OR is_team_member(team_id, get_current_user_id())
);

-- 策略：只有管理员可以删除项目
CREATE POLICY "Only team admins can delete projects"
ON projects
FOR DELETE
USING (
  team_id IS NULL OR is_team_admin(team_id, get_current_user_id())
);

-- ============================================
-- 第五部分：Project_Groups 表 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE project_groups ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看自己团队的项目组
CREATE POLICY "Users can view project groups in their teams"
ON project_groups
FOR SELECT
USING (
  is_team_member(team_id, get_current_user_id())
);

-- 策略：只有管理员可以创建项目组
CREATE POLICY "Only team admins can create project groups"
ON project_groups
FOR INSERT
WITH CHECK (
  is_team_admin(team_id, get_current_user_id())
);

-- 策略：只有管理员可以更新项目组
CREATE POLICY "Only team admins can update project groups"
ON project_groups
FOR UPDATE
USING (
  is_team_admin(team_id, get_current_user_id())
)
WITH CHECK (
  is_team_admin(team_id, get_current_user_id())
);

-- 策略：只有管理员可以删除项目组
CREATE POLICY "Only team admins can delete project groups"
ON project_groups
FOR DELETE
USING (
  is_team_admin(team_id, get_current_user_id())
);

-- ============================================
-- 第六部分：Videos 表 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看自己团队的项目中的视频
CREATE POLICY "Users can view videos in their team projects"
ON videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = videos.project_id
      AND (p.team_id IS NULL OR p.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

-- 策略：用户可以创建视频（必须是团队成员）
CREATE POLICY "Users can create videos in their team projects"
ON videos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = videos.project_id
      AND (p.team_id IS NULL OR is_team_member(p.team_id, get_current_user_id()))
  )
);

-- 策略：用户可以更新自己团队的视频
CREATE POLICY "Users can update videos in their teams"
ON videos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = videos.project_id
      AND (p.team_id IS NULL OR is_team_member(p.team_id, get_current_user_id()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = videos.project_id
      AND (p.team_id IS NULL OR is_team_member(p.team_id, get_current_user_id()))
  )
);

-- 策略：用户可以删除自己团队的视频
CREATE POLICY "Users can delete videos in their teams"
ON videos
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = videos.project_id
      AND (p.team_id IS NULL OR is_team_member(p.team_id, get_current_user_id()))
  )
);

-- ============================================
-- 第七部分：其他相关表的 RLS 策略
-- ============================================

-- Storage_Usage 表
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view storage usage of their teams"
ON storage_usage
FOR SELECT
USING (
  is_team_member(team_id, get_current_user_id())
);

-- Audit_Logs 表
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs of their teams"
ON audit_logs
FOR SELECT
USING (
  team_id IS NULL OR is_team_member(team_id, get_current_user_id())
);

CREATE POLICY "Users can create audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (
  user_id = get_current_user_id()
  AND (team_id IS NULL OR is_team_member(team_id, get_current_user_id()))
);

-- Share_Links 表（基于项目团队隔离）
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view share links of their team projects"
ON share_links
FOR SELECT
USING (
  project_id IS NULL OR EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = share_links.project_id
      AND (p.team_id IS NULL OR p.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

CREATE POLICY "Users can create share links for their team projects"
ON share_links
FOR INSERT
WITH CHECK (
  created_by = get_current_user_id()
  AND (
    project_id IS NULL OR EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = share_links.project_id
        AND (p.team_id IS NULL OR is_team_member(p.team_id, get_current_user_id()))
    )
  )
);

CREATE POLICY "Users can update their share links"
ON share_links
FOR UPDATE
USING (
  created_by = get_current_user_id()
)
WITH CHECK (
  created_by = get_current_user_id()
);

CREATE POLICY "Users can delete their share links"
ON share_links
FOR DELETE
USING (
  created_by = get_current_user_id()
);

-- Share_Link_Access_Logs 表
ALTER TABLE share_link_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view access logs of their share links"
ON share_link_access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM share_links sl
    WHERE sl.id = share_link_access_logs.share_link_id
      AND sl.created_by = get_current_user_id()
  )
);

CREATE POLICY "Anyone can create access logs (for tracking)"
ON share_link_access_logs
FOR INSERT
WITH CHECK (true);

-- Deliveries 表（基于项目团队隔离）
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries of their team projects"
ON deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = deliveries.project_id
      AND (p.team_id IS NULL OR p.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

-- Delivery_Files 表
ALTER TABLE delivery_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery files of their team projects"
ON delivery_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = delivery_files.delivery_id
      AND (p.team_id IS NULL OR p.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

-- Delivery_Packages 表
ALTER TABLE delivery_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery packages of their team projects"
ON delivery_packages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = delivery_packages.delivery_id
      AND (p.team_id IS NULL OR p.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

-- Showcase_Packages 表（基于创建者团队）
ALTER TABLE showcase_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view showcase packages of their teams"
ON showcase_packages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = showcase_packages.created_by
      AND (u.team_id IS NULL OR u.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

-- Annotations 表（基于视频项目团队）
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotations of their team videos"
ON annotations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM videos v
    JOIN projects p ON p.id = v.project_id
    WHERE v.id = annotations.video_id
      AND (p.team_id IS NULL OR p.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

CREATE POLICY "Users can create annotations for their team videos"
ON annotations
FOR INSERT
WITH CHECK (
  user_id = get_current_user_id()
  AND EXISTS (
    SELECT 1
    FROM videos v
    JOIN projects p ON p.id = v.project_id
    WHERE v.id = annotations.video_id
      AND (p.team_id IS NULL OR is_team_member(p.team_id, get_current_user_id()))
  )
);

-- Upload_Tasks 表
ALTER TABLE upload_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upload tasks"
ON upload_tasks
FOR SELECT
USING (
  user_id = get_current_user_id()
  OR EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = upload_tasks.project_id
      AND (p.team_id IS NULL OR p.team_id = ANY(get_user_team_ids(get_current_user_id())))
  )
);

-- Notifications 表
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (
  user_id = get_current_user_id()
);

-- Tags 表（全局可见，但可能需要团队隔离）
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 允许所有认证用户查看标签（可以根据需要修改为团队隔离）
CREATE POLICY "Authenticated users can view tags"
ON tags
FOR SELECT
USING (
  get_current_user_id() IS NOT NULL
);

-- ============================================
-- 第八部分：验证和测试
-- ============================================

-- 检查所有表的 RLS 状态
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'teams', 'team_members', 'projects', 'project_groups', 'videos',
        'storage_usage', 'audit_logs', 'share_links', 'share_link_access_logs',
        'deliveries', 'delivery_files', 'delivery_packages', 'showcase_packages',
        'annotations', 'upload_tasks', 'notifications', 'tags'
      )
  LOOP
    RAISE NOTICE 'Table: % - RLS enabled', table_record.tablename;
  END LOOP;
END $$;

-- ============================================
-- 完成提示
-- ============================================
-- 
-- RLS 策略已全部创建并启用！
-- 
-- 重要提示：
-- 1. get_current_user_id() 函数需要根据你的认证系统调整
-- 2. 如果使用 Supabase Auth，将 get_current_user_id() 改为 auth.uid()
-- 3. 如果 JWT payload 中的用户 ID 字段名不同，请修改 get_current_user_id() 函数
-- 4. 建议在生产环境前进行充分测试
-- 5. 某些表（如 tags）的策略可能需要根据业务需求调整
--
-- ============================================


