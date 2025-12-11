-- Vioflow MAM 扩展种子数据脚本（用于 Supabase 云上版本）
-- 在 Supabase SQL Editor 中运行此脚本以添加完整的测试数据
-- 注意：此脚本会添加更多数据，包括新用户、新标签、新项目、新视频等

-- 开始事务
BEGIN;

-- 1. 添加更多标签（如果不存在）
INSERT INTO "tags" (id, name, category, usage_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), '运动', NULL, 12, NOW(), NOW()),
  (gen_random_uuid(), '音乐', NULL, 8, NOW(), NOW()),
  (gen_random_uuid(), '科技', NULL, 15, NOW(), NOW()),
  (gen_random_uuid(), '时尚', NULL, 6, NOW(), NOW()),
  (gen_random_uuid(), '汽车', NULL, 9, NOW(), NOW()),
  (gen_random_uuid(), '美食', NULL, 4, NOW(), NOW()),
  (gen_random_uuid(), '旅游', NULL, 5, NOW(), NOW()),
  (gen_random_uuid(), '教育', NULL, 7, NOW(), NOW()),
  (gen_random_uuid(), '游戏', NULL, 11, NOW(), NOW()),
  (gen_random_uuid(), '娱乐', NULL, 13, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. 添加更多用户（如果不存在）
INSERT INTO "users" (id, email, name, password_hash, role, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'jen@vioflow.com', 'Jen', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'member', NOW(), NOW()),
  (gen_random_uuid(), 'jessica@vioflow.com', 'Jessica', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'member', NOW(), NOW()),
  (gen_random_uuid(), 'tom@vioflow.com', 'Tom', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'member', NOW(), NOW()),
  (gen_random_uuid(), 'lisa@vioflow.com', 'Lisa', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'member', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. 使用 DO 块创建更多项目和关联数据
DO $$
DECLARE
  admin_user_id uuid;
  sarah_user_id uuid;
  alex_user_id uuid;
  mike_user_id uuid;
  jen_user_id uuid;
  adidas_project_id uuid;
  samsung_project_id uuid;
  tesla_project_id uuid;
  microsoft_project_id uuid;
  google_project_id uuid;
  meta_project_id uuid;
  amazon_project_id uuid;
  disney_project_id uuid;
  adidas_video_id uuid;
  samsung_video_id uuid;
  tesla_video_id uuid;
  microsoft_video_id uuid;
  google_video_id uuid;
  meta_video_id uuid;
  amazon_video_id uuid;
  disney_video_id uuid;
  tag_sport_id uuid;
  tag_tech_id uuid;
  tag_car_id uuid;
BEGIN
  -- 获取用户 ID
  SELECT id INTO admin_user_id FROM "users" WHERE email = 'admin@vioflow.com' LIMIT 1;
  SELECT id INTO sarah_user_id FROM "users" WHERE email = 'sarah@vioflow.com' LIMIT 1;
  SELECT id INTO alex_user_id FROM "users" WHERE email = 'alex@vioflow.com' LIMIT 1;
  SELECT id INTO mike_user_id FROM "users" WHERE email = 'mike@vioflow.com' LIMIT 1;
  SELECT id INTO jen_user_id FROM "users" WHERE email = 'jen@vioflow.com' LIMIT 1;

  -- 创建新项目
  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2502_Adidas_Spring_Collection', 'Adidas', 'Alex', 'Jen', '广告片', 'active', '2025-01-15', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes', NOW(), NOW())
  RETURNING id INTO adidas_project_id;

  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2501_Samsung_Galaxy_Launch', 'Samsung', 'Mike', 'Sarah D.', '广告片', 'active', '2025-01-08', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW(), NOW())
  RETURNING id INTO samsung_project_id;

  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2412_Tesla_Cybertruck_Reveal', 'Tesla', 'Sarah D.', 'Mike', '广告片', 'active', '2024-12-10', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '4 hours', NOW(), NOW())
  RETURNING id INTO tesla_project_id;

  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2411_Microsoft_Surface_Pro', 'Microsoft', 'Alex', 'Jen', '广告片', 'active', '2024-11-20', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours', NOW(), NOW())
  RETURNING id INTO microsoft_project_id;

  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, finalized_at, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2410_Google_Pixel_8_Launch', 'Google', 'Mike', 'Sarah D.', '广告片', 'finalized', '2024-10-15', '2024-10-30'::timestamp, '2024-10-30'::timestamp, '2024-11-05'::timestamp, NOW(), NOW())
  RETURNING id INTO google_project_id;

  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, finalized_at, delivered_at, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2409_Meta_Quest_3_Launch', 'Meta', 'Alex', 'Jen', '广告片', 'delivered', '2024-09-10', '2024-09-25'::timestamp, '2024-09-28'::timestamp, '2024-09-28'::timestamp, '2024-10-01'::timestamp, NOW(), NOW())
  RETURNING id INTO meta_project_id;

  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2408_Amazon_Prime_Day', 'Amazon', 'Sarah D.', 'Mike', '社交媒体', 'active', '2024-08-05', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW(), NOW())
  RETURNING id INTO amazon_project_id;

  INSERT INTO "projects" (id, name, client, lead, post_lead, "group", status, created_date, last_activity_at, last_opened_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '2407_Disney_Plus_Original', 'Disney', 'Alex', 'Jen', '长视频', 'active', '2024-07-20', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW(), NOW())
  RETURNING id INTO disney_project_id;

  -- 创建项目成员
  INSERT INTO "project_members" (id, project_id, user_id, role, created_at)
  VALUES
    (gen_random_uuid(), adidas_project_id, alex_user_id, 'owner', NOW()),
    (gen_random_uuid(), adidas_project_id, jen_user_id, 'member', NOW()),
    (gen_random_uuid(), samsung_project_id, mike_user_id, 'owner', NOW()),
    (gen_random_uuid(), samsung_project_id, sarah_user_id, 'member', NOW()),
    (gen_random_uuid(), tesla_project_id, sarah_user_id, 'owner', NOW()),
    (gen_random_uuid(), tesla_project_id, mike_user_id, 'member', NOW())
  ON CONFLICT DO NOTHING;

  -- 获取标签 ID
  SELECT id INTO tag_sport_id FROM "tags" WHERE name = '运动' LIMIT 1;
  SELECT id INTO tag_tech_id FROM "tags" WHERE name = '科技' LIMIT 1;
  SELECT id INTO tag_car_id FROM "tags" WHERE name = '汽车' LIMIT 1;

  -- 创建视频
  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), adidas_project_id, 'v2_Adidas_Spring.mp4', 'Adidas_Spring.mp4', 'Adidas_Spring.mp4', 2, 'video',
      'https://example.com/videos/v2_Adidas_Spring.mp4', 'videos/v2_Adidas_Spring.mp4',
      'https://picsum.photos/seed/adidas/400/225', 1800000000, 60, '3840x2160', 'landscape', 'initial',
      '版本 2 更新', false, false, false, alex_user_id, NOW() - INTERVAL '1 hour', NOW(), NOW()
    )
  RETURNING id INTO adidas_video_id;

  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), samsung_project_id, 'v5_Samsung_Galaxy.mp4', 'Samsung_Galaxy.mp4', 'Samsung_Galaxy.mp4', 5, 'video',
      'https://example.com/videos/v5_Samsung_Galaxy.mp4', 'videos/v5_Samsung_Galaxy.mp4',
      'https://picsum.photos/seed/samsung/400/225', 2700000000, 90, '3840x2160', 'landscape', 'annotated',
      '版本 5 更新', false, false, false, mike_user_id, NOW() - INTERVAL '3 hours', NOW(), NOW()
    )
  RETURNING id INTO samsung_video_id;

  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), tesla_project_id, 'v3_Tesla_Cybertruck.mp4', 'Tesla_Cybertruck.mp4', 'Tesla_Cybertruck.mp4', 3, 'video',
      'https://example.com/videos/v3_Tesla_Cybertruck.mp4', 'videos/v3_Tesla_Cybertruck.mp4',
      'https://picsum.photos/seed/tesla/400/225', 3600000000, 120, '4096x2160', 'landscape', 'initial',
      '版本 3 更新', false, false, false, sarah_user_id, NOW() - INTERVAL '6 hours', NOW(), NOW()
    )
  RETURNING id INTO tesla_video_id;

  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), microsoft_project_id, 'v4_Microsoft_Surface.mp4', 'Microsoft_Surface.mp4', 'Microsoft_Surface.mp4', 4, 'video',
      'https://example.com/videos/v4_Microsoft_Surface.mp4', 'videos/v4_Microsoft_Surface.mp4',
      'https://picsum.photos/seed/microsoft/400/225', 2250000000, 75, '3840x2160', 'landscape', 'approved',
      '版本 4 更新', false, false, false, alex_user_id, NOW() - INTERVAL '12 hours', NOW(), NOW()
    )
  RETURNING id INTO microsoft_video_id;

  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), google_project_id, 'v8_Google_Pixel_Master.mov', 'Google_Pixel_Master.mov', 'Google_Pixel_Master.mov', 8, 'video',
      'https://example.com/videos/v8_Google_Pixel_Master.mov', 'videos/v8_Google_Pixel_Master.mov',
      'https://picsum.photos/seed/google/400/225', 4200000000, 60, '4096x2160', 'landscape', 'approved',
      '最终定版', true, true, false, mike_user_id, '2024-10-30'::timestamp, NOW(), NOW()
    )
  RETURNING id INTO google_video_id;

  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), meta_project_id, 'v10_Meta_Quest_Master.mov', 'Meta_Quest_Master.mov', 'Meta_Quest_Master.mov', 10, 'video',
      'https://example.com/videos/v10_Meta_Quest_Master.mov', 'videos/v10_Meta_Quest_Master.mov',
      'https://picsum.photos/seed/meta/400/225', 5400000000, 90, '4096x2160', 'landscape', 'approved',
      '最终定版', true, true, false, sarah_user_id, '2024-09-28'::timestamp, NOW(), NOW()
    )
  RETURNING id INTO meta_video_id;

  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), amazon_project_id, 'v6_Amazon_Prime.mp4', 'Amazon_Prime.mp4', 'Amazon_Prime.mp4', 6, 'video',
      'https://example.com/videos/v6_Amazon_Prime.mp4', 'videos/v6_Amazon_Prime.mp4',
      'https://picsum.photos/seed/amazon/400/225', 1350000000, 45, '1920x1080', 'landscape', 'annotated',
      '版本 6 更新', false, false, false, alex_user_id, NOW() - INTERVAL '2 days', NOW(), NOW()
    )
  RETURNING id INTO amazon_video_id;

  INSERT INTO "videos" (
    id, project_id, name, original_filename, base_name, version, type, storage_url, storage_key,
    thumbnail_url, size, duration, resolution, aspect_ratio, status, change_log,
    is_case_file, is_main_delivery, is_reference, uploader_id, upload_time, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), disney_project_id, 'v12_Disney_Original.mp4', 'Disney_Original.mp4', 'Disney_Original.mp4', 12, 'video',
      'https://example.com/videos/v12_Disney_Original.mp4', 'videos/v12_Disney_Original.mp4',
      'https://picsum.photos/seed/disney/400/225', 5400000000, 1800, '1920x1080', 'landscape', 'initial',
      '版本 12 更新', false, false, false, sarah_user_id, NOW() - INTERVAL '5 days', NOW(), NOW()
    )
  RETURNING id INTO disney_video_id;

  -- 创建视频标签关联
  INSERT INTO "video_tags" (id, video_id, tag_id, created_at)
  SELECT gen_random_uuid(), adidas_video_id, id, NOW() FROM "tags" WHERE name IN ('运动', '广告片') LIMIT 2
  ON CONFLICT (video_id, tag_id) DO NOTHING;

  INSERT INTO "video_tags" (id, video_id, tag_id, created_at)
  SELECT gen_random_uuid(), samsung_video_id, id, NOW() FROM "tags" WHERE name IN ('科技', '广告片') LIMIT 2
  ON CONFLICT (video_id, tag_id) DO NOTHING;

  INSERT INTO "video_tags" (id, video_id, tag_id, created_at)
  SELECT gen_random_uuid(), tesla_video_id, id, NOW() FROM "tags" WHERE name IN ('汽车', '广告片') LIMIT 2
  ON CONFLICT (video_id, tag_id) DO NOTHING;

  INSERT INTO "video_tags" (id, video_id, tag_id, created_at)
  SELECT gen_random_uuid(), microsoft_video_id, id, NOW() FROM "tags" WHERE name IN ('科技', '广告片') LIMIT 2
  ON CONFLICT (video_id, tag_id) DO NOTHING;

  INSERT INTO "video_tags" (id, video_id, tag_id, created_at)
  SELECT gen_random_uuid(), google_video_id, id, NOW() FROM "tags" WHERE name IN ('科技', '广告片') LIMIT 2
  ON CONFLICT (video_id, tag_id) DO NOTHING;

  INSERT INTO "video_tags" (id, video_id, tag_id, created_at)
  SELECT gen_random_uuid(), meta_video_id, id, NOW() FROM "tags" WHERE name IN ('科技', '广告片') LIMIT 2
  ON CONFLICT (video_id, tag_id) DO NOTHING;

  -- 创建交付记录
  INSERT INTO "deliveries" (
    id, project_id, has_clean_feed, has_multi_resolution, has_script, has_copyright_files,
    has_tech_review, has_copyright_check, has_metadata, delivery_note, completed_at, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), google_project_id, true, true, true, true,
      true, true, true, '已完成交付', '2024-10-30'::timestamp, NOW(), NOW()
    ),
    (
      gen_random_uuid(), meta_project_id, true, true, true, true,
      true, true, true, '已完成交付', '2024-09-28'::timestamp, NOW(), NOW()
    )
  ON CONFLICT DO NOTHING;

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
SELECT 'Deliveries', COUNT(*) FROM "deliveries";

