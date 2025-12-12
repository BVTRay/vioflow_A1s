-- 给不恭文化的ray用户授予开发者超级管理员权限
-- 在 Supabase SQL Editor 或数据库管理工具中运行此脚本

-- 首先确保 DEV_SUPER_ADMIN 角色已添加到枚举类型
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'DEV_SUPER_ADMIN' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
  ) THEN
    ALTER TYPE user_role_enum ADD VALUE 'DEV_SUPER_ADMIN';
  END IF;
END $$;

-- 查找ray用户信息（用于确认）
SELECT id, email, name, role, is_active, created_at 
FROM users 
WHERE email = 'ray@bugong.com';

-- 更新ray用户的角色为 DEV_SUPER_ADMIN
UPDATE users 
SET role = 'DEV_SUPER_ADMIN',
    updated_at = now()
WHERE email = 'ray@bugong.com';

-- 验证更新结果
SELECT id, email, name, role, is_active, updated_at
FROM users 
WHERE email = 'ray@bugong.com';

-- 查看所有具有开发者超级管理员权限的用户
SELECT id, email, name, role, is_active 
FROM users 
WHERE role = 'DEV_SUPER_ADMIN';

