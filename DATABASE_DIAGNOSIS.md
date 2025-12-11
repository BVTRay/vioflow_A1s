# 数据库诊断和种子数据插入指南

## 问题诊断步骤

### 1. 检查数据库连接

在 `backend` 目录下运行：

```bash
cd backend
npm run check-db
```

这会显示：
- 数据库连接状态
- 所有表列表
- 每个表的数据量
- 用户和项目数据示例

### 2. 检查环境变量

确保 `backend/.env` 文件存在并包含正确的数据库连接信息：

**对于 Supabase（本地和线上）**：
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**对于本地 PostgreSQL**：
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=vioflow_mam
```

### 3. 检查表是否存在

运行检查脚本后，确认以下表是否存在：
- `users`
- `projects`
- `videos`
- `tags`
- `project_members`
- `video_tags`
- `deliveries`
- `delivery_folders`
- `notifications`

如果表不存在，需要先运行数据库迁移或初始化脚本。

## 插入种子数据的方法

### 方法 1：使用 TypeScript 脚本（推荐用于本地）

```bash
cd backend
npm run seed
```

或者使用简化版本（会自动创建表）：

```bash
npm run seed:simple
```

### 方法 2：在 Supabase SQL Editor 中运行（推荐用于线上）

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单 **SQL Editor**
4. 点击 **"+ New"** 创建新查询
5. 打开文件：`backend/src/database/seed-data-fixed.sql`
6. 复制全部内容
7. 粘贴到 SQL Editor
8. 点击 **"Run"** 执行

**注意**：`seed-data-fixed.sql` 是修复版本，解决了原始 SQL 中的语法问题。

### 方法 3：使用原始 SQL（如果方法 2 失败）

如果 `seed-data-fixed.sql` 仍有问题，可以分步执行：

1. **先创建用户**：
```sql
INSERT INTO "users" (id, email, name, password_hash, role, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'admin@vioflow.com', 'Admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', NOW(), NOW()),
  (gen_random_uuid(), 'sarah@vioflow.com', 'Sarah D.', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'member', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
```

2. **然后运行完整的种子数据脚本**

## 常见问题

### 问题 1：`relation "users" does not exist`

**原因**：数据库表还没有创建。

**解决**：
1. 在 Supabase SQL Editor 中运行 `backend/src/database/init-schema.sql`
2. 或者运行迁移：`npm run migration:run`

### 问题 2：`duplicate key value violates unique constraint`

**原因**：数据已经存在。

**解决**：这是正常的，脚本使用了 `ON CONFLICT DO NOTHING`，会跳过已存在的数据。

### 问题 3：密码哈希不正确

**原因**：用户表中的密码哈希可能不是 'admin' 的正确哈希。

**解决**：
1. 使用 https://bcrypt-generator.com/ 生成 'admin' 的 bcrypt 哈希
2. 在 Supabase SQL Editor 中运行：
```sql
UPDATE "users" 
SET password_hash = '$2b$10$[新生成的哈希]' 
WHERE email = 'admin@vioflow.com';
```

### 问题 4：TypeScript 种子脚本运行失败

**检查**：
1. 确认 `.env` 文件存在且配置正确
2. 确认数据库服务正在运行
3. 检查错误信息，通常是连接问题

**调试**：
```bash
# 先检查数据库连接
npm run check-db

# 如果连接成功，再运行种子脚本
npm run seed
```

## 验证数据

运行检查脚本验证数据是否插入成功：

```bash
npm run check-db
```

应该看到：
- `users`: 至少 2 条记录
- `projects`: 至少 5 条记录
- `videos`: 至少 4 条记录
- `tags`: 至少 8 条记录

## 测试登录

使用以下账号测试：
- 邮箱：`admin@vioflow.com`
- 密码：`admin`

如果登录失败，检查密码哈希是否正确（见问题 3）。

