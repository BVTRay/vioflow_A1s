# 开发工作流程指南

## 目标

建立统一的开发工作流程，确保：
- ✅ 本地开发环境可以测试所有更改
- ✅ 推送到 GitHub 后自动部署到 Vercel（前端）和 Railway（后端）
- ✅ 数据库迁移和种子数据可以在本地和云端同步

## 架构概览

```
本地开发环境
  ├── 前端：http://localhost:3009 (Vite)
  ├── 后端：http://localhost:3002 (NestJS)
  └── 数据库：Supabase PostgreSQL（与生产环境一致）

GitHub
  ├── 前端 → Vercel (自动部署)
  └── 后端 → Railway (自动部署)
      └── 数据库：Supabase PostgreSQL
```

## 第一步：本地开发环境设置

### 1.1 配置后端环境变量

在 `backend` 目录下创建 `.env` 文件：

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

# JWT 密钥（可选）
JWT_SECRET=dev-secret-key-change-in-production
```

**如何获取 DATABASE_URL：**
1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击 Settings → Database
4. 在 Connection string 部分，选择 "URI" 标签
5. 选择 "Connection pooling" 模式（端口 6543）
6. 复制连接字符串

### 1.2 配置前端环境变量

在项目根目录创建 `.env` 文件：

```env
# 本地开发：指向本地后端
VITE_API_BASE_URL=http://localhost:3002/api
```

### 1.3 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ..
npm install
```

### 1.4 初始化数据库

#### 方法 1：使用 SQL 脚本（推荐）

1. 登录 Supabase Dashboard
2. 打开 SQL Editor
3. 运行 `backend/src/database/init-schema.sql` 创建表结构
4. 运行 `backend/src/database/seed-data.sql` 注入种子数据（可选）

#### 方法 2：使用 TypeScript 迁移脚本

```bash
cd backend
npm run migration:run  # 运行迁移创建表结构
npm run seed          # 注入种子数据（需要先创建用户）
```

### 1.5 启动开发服务器

```bash
# 终端 1：启动后端
cd backend
npm run start:dev
# 后端将在 http://localhost:3002 启动

# 终端 2：启动前端
cd ..
npm run dev
# 前端将在 http://localhost:3009 启动
```

## 第二步：开发工作流程

### 2.1 日常开发流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **进行代码更改**
   - 修改前端代码（`src/`）
   - 修改后端代码（`backend/src/`）
   - 修改数据库实体（`backend/src/modules/*/entities/`）

3. **测试本地更改**
   - 前端：访问 http://localhost:3009
   - 后端：API 在 http://localhost:3002/api
   - 检查功能是否正常工作

4. **数据库更改流程**
   - 如果修改了实体，需要生成迁移：
     ```bash
     cd backend
     npm run migration:generate -- -n YourMigrationName
     ```
   - 运行迁移：
     ```bash
     npm run migration:run
     ```
   - 测试迁移是否正常工作

5. **提交更改**
   ```bash
   git add .
   git commit -m "描述你的更改"
   git push origin feature/your-feature-name
   ```

### 2.2 数据库迁移工作流程

#### 场景 1：修改实体（添加字段、表等）

1. **修改实体文件**
   ```typescript
   // backend/src/modules/users/entities/user.entity.ts
   @Column()
   new_field: string;
   ```

2. **生成迁移文件**
   ```bash
   cd backend
   npm run migration:generate -- -n AddNewFieldToUser
   ```
   这会在 `backend/src/database/migrations/` 创建新的迁移文件。

3. **本地测试迁移**
   ```bash
   npm run migration:run
   ```
   验证迁移是否成功。

4. **提交迁移文件**
   ```bash
   git add backend/src/database/migrations/
   git commit -m "Add migration: AddNewFieldToUser"
   git push
   ```

5. **云端应用迁移**
   - 推送到 GitHub 后，Railway 会自动部署代码
   - **重要**：需要在 Railway 中手动运行迁移，或使用 Supabase SQL Editor 运行迁移 SQL

#### 场景 2：添加种子数据

1. **修改种子数据脚本**
   - TypeScript: `backend/src/database/seeds/seed.ts`
   - SQL: `backend/src/database/seed-data.sql`

2. **本地测试**
   ```bash
   cd backend
   npm run seed
   ```
   或直接在 Supabase SQL Editor 中运行 SQL 脚本

3. **提交更改**
   ```bash
   git add backend/src/database/seeds/
   git commit -m "Update seed data"
   git push
   ```

4. **云端应用**
   - 在 Supabase SQL Editor 中运行更新后的 SQL 脚本

### 2.3 合并到主分支

```bash
# 切换到主分支
git checkout main
git pull origin main

# 合并功能分支
git merge feature/your-feature-name

# 推送到 GitHub
git push origin main
```

## 第三步：云端部署流程

### 3.1 自动部署

当你推送到 GitHub 的 `main` 分支时：

1. **Vercel（前端）**
   - 自动检测代码更新
   - 自动构建和部署
   - 使用 `VITE_API_BASE_URL` 环境变量指向 Railway 后端

2. **Railway（后端）**
   - 自动检测代码更新
   - 自动构建和部署
   - 使用 Supabase 数据库（通过 `DATABASE_URL`）

### 3.2 数据库迁移部署

**重要**：Railway 不会自动运行迁移，需要手动执行：

#### 方法 1：在 Supabase SQL Editor 中运行（推荐）

1. 登录 Supabase Dashboard
2. 打开 SQL Editor
3. 复制迁移文件中的 SQL 内容
4. 运行 SQL

#### 方法 2：使用 Railway CLI

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

### 3.3 环境变量配置

#### Vercel 环境变量

在 Vercel 项目设置中添加：

```env
VITE_API_BASE_URL=https://你的railway域名.railway.app/api
```

#### Railway 环境变量

在 Railway 项目设置中添加：

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
SUPABASE_STORAGE_BUCKET=videos
CORS_ORIGIN=https://你的vercel域名.vercel.app,https://a1s.vioflow.cc
NODE_ENV=production
PORT=3000
```

## 第四步：验证部署

### 4.1 验证前端部署

1. 访问 Vercel 部署的 URL
2. 检查是否能正常加载
3. 测试登录功能
4. 检查 API 调用是否正常

### 4.2 验证后端部署

1. 访问健康检查端点：
   ```
   https://你的railway域名.railway.app/health
   ```
2. 检查 Railway 日志，确认没有错误
3. 测试 API 端点

### 4.3 验证数据库

1. 在 Supabase Dashboard 中查看表结构
2. 运行查询验证数据
3. 检查迁移是否已应用

## 常见问题

### Q1: 本地和云端数据库不同步怎么办？

**A**: 由于都使用同一个 Supabase 数据库，它们是同步的。但需要注意：
1. 本地和云端使用相同的 `DATABASE_URL`
2. 迁移需要在 Supabase SQL Editor 中手动运行
3. 或使用 Railway CLI 运行迁移

### Q2: 如何确保本地和生产环境一致？

**A**: 
1. 使用相同的 Supabase 数据库（通过 `DATABASE_URL`）
2. 使用相同的环境变量结构
3. 定期同步种子数据

### Q3: 迁移文件冲突怎么办？

**A**: 
1. 不要手动编辑迁移文件
2. 使用 `migration:generate` 生成新迁移
3. 合并冲突时，保留两个迁移文件

### Q4: 如何回滚迁移？

**A**: 
```bash
cd backend
npm run migration:revert
```

## 最佳实践

1. **始终在本地测试**
   - 在提交前测试所有更改
   - 运行迁移和种子数据脚本

2. **使用版本控制**
   - 提交所有迁移文件
   - 提交种子数据脚本
   - 不要提交 `.env` 文件

3. **环境变量管理**
   - 使用 `.env.example` 作为模板
   - 在 Vercel 和 Railway 中配置环境变量

4. **数据库迁移**
   - 每次实体更改都要生成迁移
   - 测试迁移的向上和向下兼容性
   - 在部署前验证迁移

5. **代码审查**
   - 在合并到主分支前进行代码审查
   - 确保迁移文件正确

## 快速参考

### 本地开发命令

```bash
# 启动后端
cd backend && npm run start:dev

# 启动前端
npm run dev

# 运行迁移
cd backend && npm run migration:run

# 运行种子数据（TypeScript）
cd backend && npm run seed

# 生成迁移
cd backend && npm run migration:generate -- -n MigrationName
```

### 部署检查清单

- [ ] 本地测试通过
- [ ] 迁移文件已提交
- [ ] 环境变量已配置
- [ ] 代码已推送到 GitHub
- [ ] Vercel 部署成功
- [ ] Railway 部署成功
- [ ] 数据库迁移已应用（在 Supabase SQL Editor 中）
- [ ] 功能验证通过

## 下一步

- 查看 `LOCAL_SETUP.md` 了解详细的本地环境设置
- 查看 `RAILWAY_SUPABASE_DEPLOY.md` 了解云端部署详情
- 查看 `SUPABASE_INIT_DATABASE.md` 了解数据库初始化

