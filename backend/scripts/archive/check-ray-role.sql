-- 检查并更新 ray 用户的角色
-- 在 Supabase SQL Editor 中执行

-- 1. 检查当前角色
SELECT id, email, name, role, is_active, updated_at 
FROM users 
WHERE email = 'ray@bugong.com';

-- 2. 如果角色不是 DEV_SUPER_ADMIN，执行更新
UPDATE users 
SET role = 'DEV_SUPER_ADMIN',
    updated_at = now()
WHERE email = 'ray@bugong.com'
  AND role != 'DEV_SUPER_ADMIN';

-- 3. 验证更新结果
SELECT id, email, name, role, is_active, updated_at 
FROM users 
WHERE email = 'ray@bugong.com';

-- 4. 检查枚举类型是否包含 DEV_SUPER_ADMIN
SELECT enumlabel as role_value 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
ORDER BY enumsortorder;


