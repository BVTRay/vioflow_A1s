# Supabase 数据库初始化指南

## 问题：数据库表不存在

如果遇到错误：`relation "users" does not exist`，说明数据库表还没有创建。

## 解决方案：运行初始化 SQL 脚本

### 步骤 1：登录 Supabase Dashboard

1. 访问 https://supabase.com
2. 登录你的账户
3. 选择你的项目

### 步骤 2：打开 SQL Editor

1. 在左侧菜单中，点击 **SQL Editor**
2. 点击 **New query** 按钮

### 步骤 3：运行初始化脚本

1. 复制 `backend/src/database/init-schema.sql` 文件中的全部内容
2. 粘贴到 SQL Editor 中
3. 点击 **Run** 按钮（或按 `Ctrl+Enter` / `Cmd+Enter`）

### 步骤 4：验证表已创建

运行以下 SQL 查询，确认表已创建：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

你应该看到以下表：
- users
- projects
- project_members
- tags
- videos
- video_tags
- annotations
- share_links
- deliveries
- delivery_folders
- delivery_files
- delivery_packages
- delivery_package_files
- showcase_packages
- showcase_package_videos
- showcase_view_tracking
- notifications
- upload_tasks
- archiving_tasks

### 步骤 5：创建初始用户

表创建完成后，需要创建初始用户才能登录。运行以下 SQL（需要先生成密码哈希）：

```sql
-- 生成 bcrypt 哈希（密码: admin）
-- 可以使用 Node.js 脚本或在线工具生成
-- 这里是一个示例哈希（你需要生成自己的）

-- 创建管理员用户
INSERT INTO "users" (email, name, password_hash, role, created_at, updated_at)
VALUES (
  'admin@vioflow.com',
  'Admin',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- 这是 'admin' 的 bcrypt 哈希
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
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- 这是 'admin' 的 bcrypt 哈希
  'member',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
```

**注意**：上面的哈希是示例。你需要生成正确的 bcrypt 哈希。

#### 生成密码哈希的方法

**方法 1：使用 Node.js（推荐）**

```javascript
const bcrypt = require('bcrypt');

async function generateHash() {
  const hash = await bcrypt.hash('admin', 10);
  console.log('Password hash:', hash);
}

generateHash();
```

**方法 2：使用在线工具（仅用于测试）**

- https://bcrypt-generator.com/
- 输入密码 `admin`，rounds 设为 `10`
- 复制生成的哈希值

## 验证

1. **检查表结构**
   - 在 Supabase SQL Editor 中运行表查询
   - 确认所有表都已创建

2. **检查用户数据**
   ```sql
   SELECT email, name, role FROM users;
   ```
   - 应该看到 `admin@vioflow.com` 和 `sarah@vioflow.com`

3. **测试登录**
   - 访问前端页面
   - 使用 `admin@vioflow.com` / `admin` 登录
   - 应该能成功登录

## 如果遇到错误

### 错误 1：类型已存在
如果看到 `type "xxx_enum" already exists`，说明某些类型已经存在。可以：
- 忽略这些错误（使用 `IF NOT EXISTS` 可以避免）
- 或者先删除已存在的类型

### 错误 2：表已存在
如果看到 `relation "xxx" already exists`，说明表已经创建过了。可以：
- 忽略这些错误
- 或者删除已存在的表后重新运行

### 错误 3：外键约束错误
如果看到外键约束错误，可能是表的创建顺序问题。确保按照脚本中的顺序创建表。

## 完成后的下一步

1. ✅ 表结构已创建
2. ✅ 初始用户已创建
3. ✅ 测试登录功能
4. ✅ 如果登录成功，问题已解决！

