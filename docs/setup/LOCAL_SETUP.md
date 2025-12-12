# 本地开发环境设置指南

## 目标

设置完整的本地开发环境，使用 Supabase 作为数据库（与生产环境一致）。

## 前置要求

- Node.js 18+ 
- npm 或 yarn
- Git
- Supabase 账户（用于数据库）

## 第一步：项目设置

### 1.1 克隆项目

```bash
git clone https://github.com/BVTRay/vioflow_A1s.git
cd vioflow_A1s
```

### 1.2 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ..
npm install
```

## 第二步：Supabase 数据库设置

### 2.1 获取 Supabase 连接字符串

1. 登录 Supabase Dashboard (https://supabase.com)
2. 选择你的项目（或创建新项目）
3. 点击 **Settings** → **Database**
4. 在 **Connection string** 部分：
   - 选择 **URI** 标签
   - 选择 **Connection pooling** 模式（端口 6543）
   - 复制连接字符串

连接字符串格式：
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 2.2 初始化数据库（如果还没有）

如果数据库表还没有创建，需要运行初始化脚本：

1. 在 Supabase Dashboard 中，点击 **SQL Editor**
2. 点击 **"+ New"** 创建新查询
3. 打开文件 `backend/src/database/init-schema.sql`
4. 复制全部内容并粘贴到 SQL Editor
5. 点击 **"Run"** 执行

## 第三步：环境变量配置

### 3.1 后端环境变量

创建 `backend/.env` 文件：

```env
# 数据库配置（使用 Supabase，与生产环境一致）
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# 应用配置
PORT=3002
NODE_ENV=development

# CORS 配置
CORS_ORIGIN=http://localhost:3009

# Supabase Storage（可选，如果使用文件存储）
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
SUPABASE_STORAGE_BUCKET=videos

# JWT 密钥（开发环境可以使用默认值）
JWT_SECRET=dev-secret-key-change-in-production
```

**重要**：将 `[project-ref]`、`[password]`、`[region]` 替换为实际值。

### 3.2 前端环境变量

创建项目根目录的 `.env` 文件：

```env
# 本地开发：指向本地后端
VITE_API_BASE_URL=http://localhost:3002/api
```

## 第四步：数据库初始化

### 4.1 创建表结构（如果还没有）

如果数据库表还没有创建，在 Supabase SQL Editor 中运行：

1. 打开 `backend/src/database/init-schema.sql`
2. 复制全部内容
3. 在 Supabase SQL Editor 中运行

### 4.2 创建初始用户（如果还没有）

在 Supabase SQL Editor 中运行：

```sql
-- 生成 bcrypt 哈希（密码: admin）
-- 使用 https://bcrypt-generator.com/ 生成，或使用以下示例哈希

-- 创建管理员用户
INSERT INTO "users" (email, name, password_hash, role, created_at, updated_at)
VALUES (
  'admin@vioflow.com',
  'Admin',
  '$2b$10$你的bcrypt哈希值', -- 替换为实际的 bcrypt 哈希
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 创建成员用户
INSERT INTO "users" (email, name, password_hash, role, created_at, updated_at)
VALUES (
  'sarah@vioflow.com',
  'Sarah',
  '$2b$10$你的bcrypt哈希值', -- 使用相同的哈希值
  'member',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
```

**生成密码哈希：**
- 访问 https://bcrypt-generator.com/
- 输入密码：`admin`
- Rounds：`10`
- 复制生成的哈希值

### 4.3 注入种子数据（可选）

在 Supabase SQL Editor 中运行：

1. 打开 `backend/src/database/seed-data.sql`
2. 复制全部内容
3. 在 Supabase SQL Editor 中运行

## 第五步：启动开发服务器

### 5.1 启动后端

```bash
cd backend
npm run start:dev
```

后端将在 http://localhost:3002 启动。

你应该看到：
```
✓ 后端服务已启动
✓ API地址: http://localhost:3002
✓ 前端地址: http://localhost:3009
```

### 5.2 启动前端

在新的终端窗口中：

```bash
# 在项目根目录
npm run dev
```

前端将在 http://localhost:3009 启动。

## 第六步：验证设置

### 6.1 检查后端

访问健康检查端点：
```
http://localhost:3002/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development",
  "services": {
    "database": "connected"
  }
}
```

### 6.2 检查前端

1. 打开浏览器访问 http://localhost:3009
2. 应该能看到登录页面
3. 使用测试账号登录：
   - 管理员：`admin@vioflow.com` / `admin`
   - 成员：`sarah@vioflow.com` / `admin`

### 6.3 检查数据库

在 Supabase Dashboard 中：

1. 点击 **Table Editor**
2. 应该能看到所有表（users, projects, videos 等）
3. 点击 **SQL Editor**，运行查询：
   ```sql
   SELECT email, name, role FROM users;
   ```

## 常见问题

### Q1: 后端启动失败，提示数据库连接错误

**解决方案：**
1. 检查 `DATABASE_URL` 是否正确
2. 确认 Supabase 项目状态正常
3. 检查连接字符串格式（确保使用 Connection pooling 模式）

### Q2: 前端无法连接到后端

**解决方案：**
1. 确认后端正在运行（http://localhost:3002）
2. 检查 `.env` 文件中的 `VITE_API_BASE_URL`
3. 检查浏览器控制台的错误信息

### Q3: 迁移失败

**解决方案：**
1. 检查 `DATABASE_URL` 是否正确
2. 确认迁移文件格式正确
3. 查看错误日志

### Q4: 种子数据注入失败

**解决方案：**
1. 确认表结构已创建
2. 检查用户是否已存在
3. 查看错误日志

## 开发工作流程

### 日常开发

1. **启动服务**
   ```bash
   # 终端 1：后端
   cd backend && npm run start:dev
   
   # 终端 2：前端
   npm run dev
   ```

2. **进行更改**
   - 修改代码
   - 保存文件
   - 查看浏览器/终端中的更新

3. **测试更改**
   - 在浏览器中测试功能
   - 检查后端日志
   - 验证数据库更改

### 数据库更改

1. **修改实体**
   ```typescript
   // backend/src/modules/users/entities/user.entity.ts
   @Column()
   new_field: string;
   ```

2. **生成迁移**
   ```bash
   cd backend
   npm run migration:generate -- -n AddNewField
   ```

3. **运行迁移**
   ```bash
   npm run migration:run
   ```

4. **测试**
   - 验证新字段是否创建
   - 测试相关功能

## 下一步

- 查看 `DEVELOPMENT_WORKFLOW.md` 了解完整的工作流程
- 查看 `RAILWAY_SUPABASE_DEPLOY.md` 了解云端部署

