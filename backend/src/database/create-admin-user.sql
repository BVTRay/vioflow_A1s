-- 创建管理员用户脚本
-- 在 Supabase SQL Editor 或 Railway 数据库中运行此脚本
-- 此脚本会创建 admin 用户，密码为 'admin'

-- 注意：密码哈希是 'admin' 的 bcrypt 哈希值
-- 如果需要更改密码，请使用 https://bcrypt-generator.com/ 生成新的哈希

BEGIN;

-- 创建 admin 用户（如果不存在）
-- 支持通过 email='admin@vioflow.com' 或 name='admin' 登录
INSERT INTO "users" (id, email, name, password_hash, role, is_active, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(), 
    'admin@vioflow.com', 
    'admin', 
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
    'admin', 
    true, 
    NOW(), 
    NOW()
  )
ON CONFLICT (email) DO UPDATE
SET 
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 创建测试用户（可选）
INSERT INTO "users" (id, email, name, password_hash, role, is_active, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(), 
    'sarah@vioflow.com', 
    'Sarah D.', 
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
    'member', 
    true, 
    NOW(), 
    NOW()
  )
ON CONFLICT (email) DO UPDATE
SET 
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

COMMIT;

-- 验证用户是否创建成功
SELECT id, email, name, role, is_active, created_at 
FROM "users" 
WHERE email IN ('admin@vioflow.com', 'sarah@vioflow.com')
ORDER BY email;

