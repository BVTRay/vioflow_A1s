-- Vioflow MAM 种子数据脚本
-- 在 Supabase SQL Editor 中运行此脚本以添加测试数据
-- 注意：此脚本假设用户表已有 admin@vioflow.com 和 sarah@vioflow.com

-- 开始事务
BEGIN;

-- 1. 创建标签
INSERT INTO "tags" (id, name, category, usage_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'AI生成', NULL, 5, NOW(), NOW()),
  (gen_random_uuid(), '三维制作', NULL, 8, NOW(), NOW()),
  (gen_random_uuid(), '病毒广告', NULL, 3, NOW(), NOW()),
  (gen_random_uuid(), '剧情', NULL, 6, NOW(), NOW()),
  (gen_random_uuid(), '纪录片', NULL, 4, NOW(), NOW()),
  (gen_random_uuid(), '广告片', NULL, 10, NOW(), NOW()),
  (gen_random_uuid(), '社交媒体', NULL, 7, NOW(), NOW()),
  (gen_random_uuid(), '品牌宣传', NULL, 9, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. 获取用户 ID（用于后续关联）
DO $$
DECLARE
  admin_user_id uuid;
  sarah_user_id uuid;
  nike_project_id uuid;
  spotify_project_id uuid;
  netflix_project_id uuid;
  porsche_project_id uuid;
  apple_project_id uuid;
  tag_ai_id uuid;
  tag_3d_id uuid;
  tag_ads_id uuid;
  tag_doc_id uuid;
  tag_video_id uuid;
  tag_social_id uuid;
  tag_brand_id uuid;
BEGIN
  -- 获取用户 ID
  SELECT id INTO admin_user_id FROM "users" WHERE email = 'admin@vioflow.com' LIMIT 1;
  SELECT id INTO sarah_user_id FROM "users" WHERE email = 'sarah@vioflow.com' LIMIT 1;

  -- 如果用户不存在，创建它们（使用默认密码哈希，需要后续更新）
  IF admin_user_id IS NULL THEN
    INSERT INTO "users" (id, email, name, password_hash, role, created_at, updated_at)
    VALUES (gen_random_uuid(), 'admin@vioflow.com', 'Admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', NOW(), NOW())
    RETURNING id INTO admin_user_id;
  END IF;

  IF sarah_user_id IS NULL THEN
    INSERT INTO "users" (id, email, name, password_hash, role, created_at, updated_at)
    VALUES (gen_random_uuid(), 'sarah@vioflow.com', 'Sarah D.', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'member', NOW(), NOW())
    RETURNING id INTO sarah_user_id;
  END IF;

  -- 3. 创建项目
  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2412_Nike_AirMax_Holiday', 'Nike', 'Sarah D.', 'Mike', '广告片', 'active', '2024-12-01', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW(), NOW()),
    (gen_random_uuid(), '2501_Spotify_Wrapped_Asia', 'Spotify', 'Alex', 'Jen', '社交媒体', 'active', '2025-01-10', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '3 hours', NOW(), NOW()),
    (gen_random_uuid(), '2411_Netflix_Docu_S1', 'Netflix', 'Jessica', 'Tom', '长视频', 'finalized', '2024-11-05', '2024-11-20'::timestamp, '2024-11-25'::timestamp, NOW(), NOW())
  RETURNING id INTO nike_project_id, spotify_project_id, netflix_project_id;

  -- 继续创建更多项目
  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, finalized_at, delivered_at, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2410_Porsche_911_Launch', 'Porsche', 'Tom', 'Sarah', '广告片', 'delivered', '2024-10-20', '2024-10-25'::timestamp, '2024-10-28'::timestamp, '2024-10-28'::timestamp, '2024-10-30'::timestamp, NOW(), NOW()),
    (gen_random_uuid(), '2409_Apple_Event_Launch', 'Apple', 'Sarah D.', 'Mike', '广告片', 'active', '2024-09-15', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', NOW(), NOW())
  RETURNING id INTO porsche_project_id, apple_project_id;

  -- 更新 finalized_at 字段（对于 finalized 状态的项目）
  UPDATE "projects" SET finalized_at = '2024-11-20'::timestamp WHERE id = netflix_project_id;

  -- 4. 创建项目成员
  INSERT INTO "project_members" (id, project_id, user_id, role, created_at)
  VALUES
    (gen_random_uuid(), nike_project_id, sarah_user_id, 'owner', NOW()),
    (gen_random_uuid(), nike_project_id, admin_user_id, 'member', NOW()),
    (gen_random_uuid(), spotify_project_id, admin_user_id, 'owner', NOW())
  ON CONFLICT DO NOTHING;

  -- 5. 获取标签 ID
  SELECT id INTO tag_3d_id FROM "tags" WHERE name = '三维制作' LIMIT 1;
  SELECT id INTO tag_video_id FROM "tags" WHERE name = '广告片' LIMIT 1;

  -- 6. 创建视频
  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), nike_project_id, 'v4_Nike_AirMax.mp4', 'Nike_AirMax.mp4', 'Nike_AirMax.mp4', 4, 'video',
      'https://example.com/videos/v4_Nike_AirMax.mp4', 'videos/v4_Nike_AirMax.mp4',
      'https://picsum.photos/seed/nike1/400/225', 2400000000, 90, '3840x2160', 'landscape', 'initial',
      '调整了结尾Logo的入场动画', false, false, false, sarah_user_id, NOW() - INTERVAL '2 hours', NOW(), NOW()
    ),
    (
      gen_random_uuid(), nike_project_id, 'v3_Nike_AirMax.mp4', 'Nike_AirMax.mp4', 'Nike_AirMax.mp4', 3, 'video',
      'https://example.com/videos/v3_Nike_AirMax.mp4', 'videos/v3_Nike_AirMax.mp4',
      'https://picsum.photos/seed/nike2/400/225', 2400000000, 90, '3840x2160', 'landscape', 'annotated',
      '根据客户意见修改了调色', false, false, false, sarah_user_id, NOW() - INTERVAL '1 day', NOW(), NOW()
    ),
    (
      gen_random_uuid(), porsche_project_id, 'v12_Porsche_Launch_Master.mov', 'Porsche_Launch_Master.mov', 'Porsche_Launch_Master.mov', 12, 'video',
      'https://example.com/videos/v12_Porsche_Launch_Master.mov', 'videos/v12_Porsche_Launch_Master.mov',
      'https://picsum.photos/seed/porsche/400/225', 42000000000, 60, '4096x2160', 'landscape', 'approved',
      '最终定版', true, true, false, sarah_user_id, '2024-10-25'::timestamp, NOW(), NOW()
    ),
    (
      gen_random_uuid(), netflix_project_id, 'v8_Netflix_Ep1_Lock.mp4', 'Netflix_Ep1_Lock.mp4', 'Netflix_Ep1_Lock.mp4', 8, 'video',
      'https://example.com/videos/v8_Netflix_Ep1_Lock.mp4', 'videos/v8_Netflix_Ep1_Lock.mp4',
      'https://picsum.photos/seed/netflix/400/225', 1800000000, 2700, '1920x1080', 'landscape', 'initial',
      '粗剪定版', false, false, false, sarah_user_id, NOW() - INTERVAL '3 days', NOW(), NOW()
    );

  -- 7. 创建视频标签关联（使用子查询获取视频和标签 ID）
  INSERT INTO "video_tags" (id, video_id, tag_id, created_at)
  SELECT
    gen_random_uuid(),
    v.id,
    t.id,
    NOW()
  FROM "videos" v
  CROSS JOIN "tags" t
  WHERE v.name = 'v12_Porsche_Launch_Master.mov'
    AND t.name IN ('三维制作', '广告片')
  ON CONFLICT (video_id, tag_id) DO NOTHING;

  -- 8. 创建交付数据
  INSERT INTO "deliveries" (
    id, project_id, has_clean_feed, has_multi_resolution, has_script, has_copyright_files,
    has_tech_review, has_copyright_check, has_metadata, delivery_note, completed_at, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), netflix_project_id, true, false, false, false,
      false, false, true, '待完善交付信息', NULL, NOW(), NOW()
    ),
    (
      gen_random_uuid(), porsche_project_id, true, true, true, true,
      true, true, true, '最终交付版本，包含所有素材和说明文档。', '2024-10-28'::timestamp, NOW(), NOW()
    );

  -- 9. 创建交付文件夹（获取交付 ID）
  INSERT INTO "delivery_folders" (id, delivery_id, folder_type, storage_path, created_at)
  SELECT
    gen_random_uuid(),
    d.id,
    folder_type_val,
    'deliveries/' || d.project_id || '/' || folder_path,
    NOW()
  FROM "deliveries" d
  CROSS JOIN (
    VALUES
      ('master', 'master'),
      ('variants', 'variants'),
      ('clean_feed', 'clean_feed'),
      ('docs', 'docs')
  ) AS folders(folder_type_val, folder_path)
  WHERE d.project_id = porsche_project_id
    AND d.completed_at IS NOT NULL;

  -- 10. 创建通知
  INSERT INTO "notifications" (
    id, user_id, type, title, message, related_type, related_id, is_read, created_at
  )
  SELECT
    gen_random_uuid(),
    sarah_user_id,
    'success',
    '视频上传完成',
    'v4_Nike_AirMax.mp4 上传成功',
    'video',
    v.id,
    false,
    NOW()
  FROM "videos" v
  WHERE v.name = 'v4_Nike_AirMax.mp4'
  LIMIT 1;

  INSERT INTO "notifications" (
    id, user_id, type, title, message, related_type, related_id, is_read, created_at
  )
  SELECT
    gen_random_uuid(),
    sarah_user_id,
    'info',
    '项目定版',
    'Netflix_Docu_S1 项目已定版，请前往交付模块完善信息',
    'project',
    netflix_project_id,
    false,
    NOW();

END $$;

-- 提交事务
COMMIT;

-- 验证数据
SELECT 'Users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'Projects', COUNT(*) FROM "projects"
UNION ALL
SELECT 'Videos', COUNT(*) FROM "videos"
UNION ALL
SELECT 'Tags', COUNT(*) FROM "tags"
UNION ALL
SELECT 'Project Members', COUNT(*) FROM "project_members"
UNION ALL
SELECT 'Video Tags', COUNT(*) FROM "video_tags"
UNION ALL
SELECT 'Deliveries', COUNT(*) FROM "deliveries"
UNION ALL
SELECT 'Delivery Folders', COUNT(*) FROM "delivery_folders"
UNION ALL
SELECT 'Notifications', COUNT(*) FROM "notifications";

