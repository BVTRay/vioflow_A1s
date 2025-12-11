# Railway + Supabase Storage 部署指南

本指南将帮助你将后端部署到 Railway，并使用 Supabase Storage 进行文件存储。

## 架构概览

```
前端：Vercel (https://a1s.vioflow.cc)
  ↓
后端：Railway (NestJS API)
  ↓
数据库：Railway PostgreSQL
  ↓
文件存储：Supabase Storage
```

## 第一步：设置 Supabase

### 1.1 创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 使用 GitHub 登录
4. 创建新组织（如果还没有）
5. 点击 "New Project"
6. 填写项目信息：
   - **Name**: vioflow-storage（或你喜欢的名称）
   - **Database Password**: 设置一个强密码（保存好）
   - **Region**: 选择离你最近的区域
7. 点击 "Create new project"
8. 等待项目创建完成（约 2 分钟）

### 1.2 创建存储桶

1. 在 Supabase 项目页面，点击左侧菜单的 **Storage**
2. 点击 "Create a new bucket"
3. 填写信息：
   - **Name**: `videos`（或你喜欢的名称）
   - **Public bucket**: 根据需求选择
     - ✅ **公开**：如果视频需要直接通过 URL 访问
     - ❌ **私有**：如果需要签名 URL 访问
4. 点击 "Create bucket"

### 1.3 获取 API Keys

1. 在 Supabase 项目页面，点击左侧菜单的 **Settings** → **API**
2. 记录以下信息：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（⚠️ 保密，不要暴露在前端）

## 第二步：部署到 Railway

### 2.1 创建 Railway 项目

1. 访问 https://railway.app
2. 点击 "Start a New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 Railway 访问你的 GitHub
5. 选择仓库：`BVTRay/vioflow_A1s`
6. Railway 会自动检测项目

### 2.2 配置项目设置

1. 在 Railway 项目页面，点击项目设置（齿轮图标）
2. 在 **Settings** 标签页：
   - **Root Directory**: 设置为 `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### 2.3 添加 PostgreSQL 数据库

1. 在 Railway 项目页面，点击 "+ New"
2. 选择 "Database" → "Add PostgreSQL"
3. Railway 会自动创建数据库并配置连接
4. 数据库创建后，Railway 会自动添加 `DATABASE_URL` 环境变量

### 2.4 配置环境变量

在 Railway 项目设置中，添加以下环境变量：

#### 必需的环境变量

```env
# 数据库（Railway 会自动提供 DATABASE_URL，但也可以手动配置）
DATABASE_URL=postgresql://user:password@host:port/database

# 应用配置
PORT=3000
NODE_ENV=production

# CORS 配置
CORS_ORIGIN=https://a1s.vioflow.cc

# Supabase Storage 配置
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
SUPABASE_STORAGE_BUCKET=videos
```

#### 如何获取这些值

- `DATABASE_URL`: Railway 会自动提供，在数据库服务的 **Variables** 标签页查看
- `SUPABASE_URL`: 从 Supabase 项目设置 → API → Project URL
- `SUPABASE_SERVICE_KEY`: 从 Supabase 项目设置 → API → service_role key
- `SUPABASE_STORAGE_BUCKET`: 你创建的存储桶名称（例如：`videos`）

### 2.5 运行数据库迁移

部署完成后，需要运行数据库迁移：

1. 在 Railway 项目页面，点击你的服务
2. 点击 "Deployments" 标签页
3. 找到最新的部署，点击 "View Logs"
4. 或者使用 Railway CLI：

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 运行迁移
railway run npm run migration:run
```

或者，你可以在 Railway 的部署命令中添加迁移：

在 **Settings** → **Deploy** → **Start Command** 改为：
```bash
npm run migration:run && npm run start:prod
```

### 2.6 获取后端 API 地址

部署成功后：

1. 在 Railway 项目页面，点击你的服务
2. 在 **Settings** → **Networking** 中，你会看到一个域名，例如：`xxx.railway.app`
3. 你的 API 地址将是：`https://xxx.railway.app/api`

## 第三步：更新前端配置

### 3.1 在 Vercel 中配置环境变量

1. 进入 Vercel 项目设置
2. 找到 "Environment Variables"
3. 添加：

```
VITE_API_BASE_URL=https://你的railway域名.railway.app/api
```

例如：
```
VITE_API_BASE_URL=https://vioflow-backend.railway.app/api
```

4. 重新部署前端

## 第四步：验证部署

### 4.1 测试 API

访问你的 API 健康检查端点（如果有）：
```
https://你的railway域名.railway.app/api
```

### 4.2 测试登录

1. 访问前端：https://a1s.vioflow.cc/login
2. 使用测试账号登录
3. 检查是否能正常登录

### 4.3 测试文件上传

1. 登录后，尝试上传文件
2. 检查文件是否成功上传到 Supabase Storage
3. 在 Supabase Storage 界面中查看文件

## 常见问题

### Q: Railway 部署失败

**A:** 检查：
- Root Directory 是否设置为 `backend`
- Build Command 是否正确
- 环境变量是否都已配置

### Q: 数据库连接失败

**A:** 检查：
- `DATABASE_URL` 是否正确
- 数据库服务是否已启动
- SSL 配置是否正确（Railway 通常需要 SSL）

### Q: CORS 错误

**A:** 检查：
- `CORS_ORIGIN` 是否包含你的 Vercel 域名
- 后端服务是否已重启

### Q: 文件上传失败

**A:** 检查：
- Supabase 环境变量是否正确
- 存储桶是否已创建
- 存储桶权限设置是否正确

### Q: 如何查看日志

**A:** 在 Railway 项目页面：
1. 点击你的服务
2. 点击 "Deployments"
3. 选择最新的部署
4. 点击 "View Logs"

## 成本估算

### Railway
- **免费额度**: $5/月
- **PostgreSQL**: 包含在免费额度中
- **超出后**: 按使用量计费

### Supabase
- **免费额度**: 
  - 500MB 数据库
  - 1GB 文件存储
  - 2GB 带宽
- **超出后**: 按使用量计费

### Vercel
- **免费额度**: 足够个人项目使用

## 下一步

1. ✅ 设置 Supabase 项目
2. ✅ 部署到 Railway
3. ✅ 配置环境变量
4. ✅ 运行数据库迁移
5. ✅ 更新前端配置
6. ✅ 测试功能

## 需要帮助？

如果遇到问题，检查：
1. Railway 部署日志
2. Supabase Storage 设置
3. 环境变量配置
4. 网络连接

祝你部署顺利！🎉

