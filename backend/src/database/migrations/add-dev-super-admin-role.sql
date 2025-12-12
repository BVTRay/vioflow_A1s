-- 添加 DEV_SUPER_ADMIN 角色到用户角色枚举
-- 在 Supabase SQL Editor 或数据库管理工具中运行此脚本

-- PostgreSQL 不支持直接添加枚举值，需要使用 ALTER TYPE ... ADD VALUE
-- 注意：在事务中无法添加枚举值，需要单独执行

-- 方法1：如果枚举类型已存在，直接添加新值
DO $$ 
BEGIN
  -- 检查枚举值是否已存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'DEV_SUPER_ADMIN' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
  ) THEN
    ALTER TYPE user_role_enum ADD VALUE 'DEV_SUPER_ADMIN';
  END IF;
END $$;

-- 方法2：如果上面的方法不工作，可以尝试直接执行（需要在事务外）
-- ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'DEV_SUPER_ADMIN';

-- 验证：查询所有可用的角色枚举值
SELECT enumlabel as role_value 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
ORDER BY enumsortorder;

