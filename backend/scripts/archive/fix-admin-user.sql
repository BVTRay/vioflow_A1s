-- 快速修复 admin 用户登录问题
-- 在 Supabase SQL Editor 中运行此脚本

BEGIN;

-- 1. 更新 admin 用户的名字为小写（支持 'admin' 登录）
UPDATE users
SET 
    name = 'admin',
    updated_at = NOW()
WHERE email = 'admin@vioflow.com';

-- 2. 确保 admin 用户有密码哈希（如果缺失）
UPDATE users
SET 
    password_hash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    updated_at = NOW()
WHERE email = 'admin@vioflow.com'
AND (password_hash IS NULL OR password_hash = '');

-- 3. 确保 is_active 为 true
UPDATE users
SET 
    is_active = true,
    updated_at = NOW()
WHERE email = 'admin@vioflow.com'
AND is_active = false;

COMMIT;

-- 验证修复结果
SELECT 
    id,
    email,
    name,
    role,
    is_active,
    CASE 
        WHEN password_hash IS NULL THEN '❌ 密码哈希为空'
        WHEN LENGTH(password_hash) < 50 THEN '⚠️ 密码哈希长度异常'
        ELSE '✅ 密码哈希正常'
    END as password_status,
    updated_at
FROM users
WHERE email = 'admin@vioflow.com';


