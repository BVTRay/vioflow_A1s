-- ============================================
-- 修复 jeff 账号数据问题的 SQL 脚本
-- 在 Supabase SQL Editor 中直接运行此脚本
-- ============================================

BEGIN;

-- 1. 获取"不恭文化"团队 ID 和 jeff 用户 ID
DO $$
DECLARE
  bugong_team_id uuid;
  jeff_user_id uuid;
  projects_updated_count integer;
  team_member_exists boolean;
BEGIN
  -- 获取"不恭文化"团队 ID
  SELECT id INTO bugong_team_id FROM teams WHERE name = '不恭文化';
  
  IF bugong_team_id IS NULL THEN
    RAISE EXCEPTION '未找到"不恭文化"团队！请先创建团队。';
  END IF;
  
  RAISE NOTICE '✅ 找到"不恭文化"团队: %', bugong_team_id;
  
  -- 获取 jeff 用户 ID
  SELECT id INTO jeff_user_id FROM users WHERE email = 'jeff@bugong.com';
  
  IF jeff_user_id IS NULL THEN
    RAISE EXCEPTION '未找到 jeff 账号！邮箱: jeff@bugong.com';
  END IF;
  
  RAISE NOTICE '✅ 找到 jeff 账号: %', jeff_user_id;
  
  -- 2. 更新 jeff 的 team_id
  UPDATE users 
  SET team_id = bugong_team_id, updated_at = NOW()
  WHERE id = jeff_user_id;
  
  RAISE NOTICE '✅ 已更新 jeff 的 team_id';
  
  -- 3. 检查 jeff 是否已经是团队成员
  SELECT EXISTS(
    SELECT 1 FROM team_members 
    WHERE team_id = bugong_team_id AND user_id = jeff_user_id
  ) INTO team_member_exists;
  
  -- 4. 如果 jeff 不是团队成员，添加为成员
  IF NOT team_member_exists THEN
    INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      bugong_team_id,
      jeff_user_id,
      'admin',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (team_id, user_id) DO UPDATE SET
      role = 'admin',
      status = 'active',
      updated_at = NOW();
    
    RAISE NOTICE '✅ 已添加 jeff 为团队成员';
  ELSE
    RAISE NOTICE '✅ jeff 已经是团队成员';
  END IF;
  
  -- 5. 将所有没有 team_id 的项目关联到"不恭文化"团队
  UPDATE projects 
  SET team_id = bugong_team_id, updated_at = NOW()
  WHERE team_id IS NULL;
  
  GET DIAGNOSTICS projects_updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ 已更新 % 个项目的 team_id', projects_updated_count;
  
  -- 6. 显示修复结果
  RAISE NOTICE '';
  RAISE NOTICE '📊 修复结果:';
  RAISE NOTICE '   - jeff 的 team_id: %', (SELECT team_id FROM users WHERE id = jeff_user_id);
  RAISE NOTICE '   - jeff 是团队成员: %', (SELECT EXISTS(
    SELECT 1 FROM team_members 
    WHERE team_id = bugong_team_id AND user_id = jeff_user_id
  ));
  RAISE NOTICE '   - "不恭文化"团队的项目数: %', (
    SELECT COUNT(*) FROM projects WHERE team_id = bugong_team_id
  );
  
END $$;

-- 7. 验证修复结果
SELECT 
  'jeff 账号信息' as check_type,
  u.email,
  u.name,
  u.team_id,
  t.name as team_name,
  CASE 
    WHEN u.team_id IS NOT NULL THEN '✅ 有 team_id'
    ELSE '❌ team_id 为 NULL'
  END as team_id_status
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
WHERE u.email = 'jeff@bugong.com';

SELECT 
  '团队成员关系' as check_type,
  u.email,
  u.name,
  tm.role,
  tm.status,
  t.name as team_name,
  CASE 
    WHEN tm.id IS NOT NULL THEN '✅ 是团队成员'
    ELSE '❌ 不是团队成员'
  END as member_status
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'jeff@bugong.com';

SELECT 
  '项目统计' as check_type,
  COUNT(*) as total_projects,
  COUNT(CASE WHEN team_id IS NOT NULL THEN 1 END) as projects_with_team,
  COUNT(CASE WHEN team_id IS NULL THEN 1 END) as projects_without_team,
  COUNT(CASE WHEN team_id = (SELECT id FROM teams WHERE name = '不恭文化') THEN 1 END) as bugong_projects
FROM projects;

SELECT 
  '不恭文化团队项目列表' as check_type,
  p.name,
  p.client,
  p.status,
  p.team_id
FROM projects p
JOIN teams t ON p.team_id = t.id
WHERE t.name = '不恭文化'
ORDER BY p.created_date DESC;

COMMIT;

-- ============================================
-- 修复完成！
-- 
-- 下一步：
-- 1. 使用 jeff@bugong.com 登录
-- 2. 应该能看到所有项目了
-- 3. 如果仍然看不到，检查浏览器控制台和网络请求
-- ============================================

