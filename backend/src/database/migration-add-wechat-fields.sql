-- Vioflow MAM 数据库迁移脚本：添加微信登录相关字段
-- 在 Supabase SQL Editor 中运行此脚本

-- 添加微信相关字段到 users 表
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "wechat_openid" varchar(100),
  ADD COLUMN IF NOT EXISTS "wechat_unionid" varchar(100),
  ADD COLUMN IF NOT EXISTS "wechat_session_key" varchar(200);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_users_wechat_openid" ON "users"("wechat_openid");
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users"("phone");






