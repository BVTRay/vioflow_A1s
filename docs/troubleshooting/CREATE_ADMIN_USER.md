# 创建管理员用户指南

## 问题：登录时提示 "User not found"

如果遇到错误：`User not found: admin`，说明数据库中还没有创建用户。

## 解决方案

### 方法 1：使用 Supabase SQL Editor（推荐）

如果你使用 Supabase 作为数据库：

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 点击 **New query**
5. 复制并粘贴以下 SQL 脚本：

```sql
-- 创建管理员用户
BEGIN;

INSERT INTO "users" (id, email, name, password_hash, role, is_active, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(), 
    'admin@vioflow.com', 
    'admin', 
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
    'admin', 
    true, 
    NOW(), 
    NOW()
  )
ON CONFLICT (email) DO UPDATE
SET 
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

COMMIT;

-- 验证用户是否创建成功
SELECT id, email, name, role, is_active, created_at 
FROM "users" 
WHERE email = 'admin@vioflow.com';
```

6. 点击 **Run** 执行脚本
7. 确认用户已创建

### 方法 2：使用 Railway 数据库连接

如果你使用 Railway PostgreSQL：

1. 在 Railway 项目页面，找到数据库服务
2. 点击 **Data** 标签页
3. 点击 **Connect** 或 **Query**
4. 复制并粘贴上面的 SQL 脚本
5. 执行脚本

### 方法 3：使用 psql 命令行

如果你有数据库连接字符串：

```bash
# 使用 Railway 提供的连接字符串
psql "你的数据库连接字符串"

# 然后执行 SQL
\i backend/src/database/create-admin-user.sql
```

或者直接执行：

```bash
psql "你的数据库连接字符串" -f backend/src/database/create-admin-user.sql
```

## 登录信息

创建用户后，可以使用以下信息登录：

- **用户名/邮箱**: `admin` 或 `admin@vioflow.com`
- **密码**: `admin`

## 验证用户是否创建成功

在 SQL Editor 中运行：

```sql
SELECT id, email, name, role, is_active, created_at 
FROM "users" 
WHERE email = 'admin@vioflow.com';
```

应该返回一行数据，显示用户信息。

## 创建更多用户

如果需要创建更多用户，可以修改 SQL 脚本：

```sql
INSERT INTO "users" (id, email, name, password_hash, role, is_active, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(), 
    '新用户邮箱@example.com', 
    '用户名', 
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
    'member',  -- 角色：admin, member, sales
    true, 
    NOW(), 
    NOW()
  )
ON CONFLICT (email) DO NOTHING;
```

**注意**：密码哈希 `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy` 对应密码 `admin`。

如果需要使用不同的密码，请：
1. 访问 https://bcrypt-generator.com/
2. 输入新密码
3. 生成 bcrypt 哈希
4. 替换 SQL 中的 `password_hash` 值

## 常见问题

### Q: 执行脚本后仍然无法登录

**A**: 检查以下几点：
1. 确认用户已创建（运行验证查询）
2. 确认使用的是正确的用户名/邮箱和密码
3. 检查 `is_active` 字段是否为 `true`
4. 查看 Railway 日志，确认后端服务正常运行

### Q: 如何更改密码

**A**: 
1. 使用 https://bcrypt-generator.com/ 生成新密码的哈希
2. 在 SQL Editor 中运行：

```sql
UPDATE "users" 
SET password_hash = '新的bcrypt哈希值', updated_at = NOW()
WHERE email = 'admin@vioflow.com';
```

### Q: 如何创建不同角色的用户

**A**: 修改 SQL 中的 `role` 字段：
- `admin` - 管理员
- `member` - 普通成员
- `sales` - 销售

```sql
INSERT INTO "users" (id, email, name, password_hash, role, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'user@example.com', '用户名', '$2b$10$...', 'member', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
```

