# 环境变量配置指南

## 后端环境变量

在 `backend` 目录下创建 `.env` 文件（参考 `backend/.env.example`）：

```env
# 数据库配置（使用 Supabase，与生产环境一致）
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# 应用配置
PORT=3002
NODE_ENV=development

# CORS 配置
CORS_ORIGIN=http://localhost:3009

# Supabase Storage（可选）
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
SUPABASE_STORAGE_BUCKET=videos

# JWT 密钥
JWT_SECRET=dev-secret-key-change-in-production
```

## 前端环境变量

在项目根目录创建 `.env` 文件：

```env
# 本地开发：指向本地后端
VITE_API_BASE_URL=http://localhost:3002/api
```

## 如何获取 DATABASE_URL

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击 **Settings** → **Database**
4. 在 **Connection string** 部分：
   - 选择 **URI** 标签
   - 选择 **Connection pooling** 模式（端口 6543）
   - 复制连接字符串

## 注意事项

- `.env` 文件不要提交到 Git（已在 .gitignore 中）
- 使用 `.env.example` 作为模板
- 生产环境的环境变量在 Vercel 和 Railway 中配置

