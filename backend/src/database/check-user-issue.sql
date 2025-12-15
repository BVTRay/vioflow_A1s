-- 检查用户登录问题的诊断脚本
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 检查 users 表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. 检查所有用户（包括密码哈希）
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
    LENGTH(password_hash) as password_hash_length,
    created_at
FROM users
ORDER BY email;

-- 3. 检查 admin 用户（大小写不敏感）
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
    created_at
FROM users
WHERE LOWER(email) LIKE '%admin%' 
   OR LOWER(name) LIKE '%admin%'
ORDER BY email;

-- 4. 检查是否有用户缺少密码哈希
SELECT 
    COUNT(*) as users_without_password,
    STRING_AGG(email, ', ') as affected_users
FROM users
WHERE password_hash IS NULL OR password_hash = '';

-- 5. 检查用户表是否有必要的字段
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN '✅ password_hash 字段存在' 
    ELSE '❌ password_hash 字段不存在' 
    END as password_hash_field_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN '✅ is_active 字段存在' 
    ELSE '❌ is_active 字段不存在' 
    END as is_active_field_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'team_id'
    ) THEN '✅ team_id 字段存在' 
    ELSE '❌ team_id 字段不存在' 
    END as team_id_field_check;


