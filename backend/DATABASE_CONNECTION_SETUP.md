# 数据库连接配置指南

## 问题诊断

如果你在开发者后台看到的用户信息和 Supabase Dashboard 中看到的不一致，可能是因为：

1. **应用连接的是本地数据库，而不是 Supabase**
2. **环境变量 `DATABASE_URL` 未正确配置**
3. **连接到了错误的 Supabase 项目**

## 检查当前连接

运行以下命令检查应用实际连接的数据库：

```bash
cd backend
npx ts-node src/database/check-db-connection.ts
```

## 配置 Supabase 连接

### 方法 1: 使用环境变量文件（推荐）

在 `backend` 目录下创建或编辑 `.env` 文件：

```env
# Supabase 数据库连接（替换为你的实际连接字符串）
DATABASE_URL=postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres

# 或者使用连接池（推荐，端口 6543）
# DATABASE_URL=postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:6543/postgres

# 应用配置
PORT=3002
NODE_ENV=development
CORS_ORIGIN=http://localhost:3009
JWT_SECRET=dev-secret-key-change-in-production
```

### 方法 2: 使用 Railway 环境变量（生产环境）

在 Railway 项目设置中配置 `DATABASE_URL` 环境变量。

## 获取 Supabase 连接字符串

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击 **Settings** → **Database**
4. 在 **Connection string** 部分：
   - 选择 **URI** 标签
   - 选择 **Connection pooling** 模式（端口 6543，推荐）或 **Direct connection**（端口 5432）
   - 复制连接字符串
   - **重要**: 将 `[YOUR-PASSWORD]` 替换为你的数据库密码

## 对比本地和 Supabase 数据

运行对比脚本（需要提供 Supabase 连接字符串）：

```bash
cd backend

# 方法 1: 使用环境变量
export SUPABASE_DATABASE_URL="postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
npx ts-node src/database/compare-databases.ts

# 方法 2: 作为参数传入
npx ts-node src/database/compare-databases.ts "postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

## 验证配置

配置完成后，重启应用并检查日志：

```bash
cd backend
npm run start:dev
```

你应该在启动日志中看到类似以下信息：

```
📌 数据库连接: Supabase
   Host: aws-0-us-west-2.pooler.supabase.com:5432
   Database: postgres
   Username: postgres.bejrwnamnxxdxoqwoxag
```

如果看到 "本地 PostgreSQL"，说明 `DATABASE_URL` 未正确配置。

## 常见问题

### Q: 为什么开发者后台显示的数据和 Supabase 不一样？

A: 应用可能连接的是本地数据库。检查启动日志中的数据库连接信息。

### Q: 如何确认应用连接的是哪个数据库？

A: 查看应用启动时的日志，会显示连接的数据库信息。

### Q: 连接池和直接连接有什么区别？

A: 
- **连接池** (端口 6543): 适合高并发，有连接数限制，但更稳定
- **直接连接** (端口 5432): 无连接数限制，但可能在高并发时不稳定

推荐使用连接池模式。

### Q: 密码在哪里找？

A: 在 Supabase Dashboard → Settings → Database → Database password 中可以重置或查看密码。

## 注意事项

1. **不要将 `.env` 文件提交到 Git**（已在 `.gitignore` 中）
2. **生产环境**的环境变量在 Railway 中配置
3. **开发环境**使用 `backend/.env` 文件
4. 确保连接字符串中的密码已正确替换 `[YOUR-PASSWORD]`


