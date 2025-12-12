# 数据库用户问题诊断和修复

## 问题分析

从你的数据库截图可以看到：
- ✅ 数据库中已经有用户数据
- ✅ 有 `admin@vioflow.com` 用户，名字是 `Admin`（大写A）
- ❌ 但是 Railway 报错说找不到 `admin` 用户

## 可能的原因

### 1. 大小写敏感问题

PostgreSQL 的字符串比较默认是**大小写敏感**的。如果你尝试用 `admin` 登录，但数据库中名字是 `Admin`，查找会失败。

**认证服务代码**：
```typescript
const user = await this.userRepository.findOne({
  where: [{ email: username }, { name: username }],
});
```

这意味着：
- ✅ 用 `admin@vioflow.com` 登录 → 会找到用户（通过 email）
- ❌ 用 `admin` 登录 → 不会找到（因为 name 是 `Admin`，不是 `admin`）

### 2. 密码哈希缺失

如果用户没有 `password_hash` 字段或值为空，密码验证会失败。

### 3. 数据库不同步

Railway 的数据库和 Supabase 的数据库可能不是同一个，或者数据没有同步。

## 诊断步骤

### 步骤 1：运行诊断脚本

在 Supabase SQL Editor 中运行 `backend/src/database/check-user-issue.sql`：

```sql
-- 检查所有用户（包括密码哈希）
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
```

### 步骤 2：检查 admin 用户

```sql
-- 检查 admin 用户详情
SELECT 
    id,
    email,
    name,
    role,
    is_active,
    password_hash IS NOT NULL as has_password,
    LENGTH(password_hash) as password_length,
    created_at
FROM users
WHERE email = 'admin@vioflow.com';
```

### 步骤 3：验证 Railway 数据库

确认 Railway 使用的数据库和 Supabase 是同一个：

1. 在 Railway 环境变量中检查 `DATABASE_URL`
2. 确认它指向的是同一个 Supabase 数据库
3. 如果不是，需要同步数据或更新配置

## 解决方案

### 方案 1：修复用户名字段（推荐）

确保用户可以用 `admin` 或 `Admin` 登录，更新用户名字段：

```sql
-- 更新 admin 用户的名字为小写（支持 'admin' 登录）
UPDATE users
SET name = 'admin', updated_at = NOW()
WHERE email = 'admin@vioflow.com';
```

或者，如果你想保持 `Admin`，可以添加一个别名：

```sql
-- 添加一个名字为 'admin' 的用户（如果不存在）
-- 或者更新现有用户
UPDATE users
SET name = 'admin', updated_at = NOW()
WHERE email = 'admin@vioflow.com' AND name = 'Admin';
```

### 方案 2：修复密码哈希

如果用户没有密码哈希，需要添加：

```sql
-- 为 admin 用户添加密码哈希（密码是 'admin'）
UPDATE users
SET 
    password_hash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    updated_at = NOW()
WHERE email = 'admin@vioflow.com'
AND (password_hash IS NULL OR password_hash = '');
```

### 方案 3：创建新的 admin 用户

如果现有用户有问题，可以创建一个新的：

```sql
-- 删除旧的 admin 用户（可选）
DELETE FROM users WHERE email = 'admin@vioflow.com';

-- 创建新的 admin 用户
INSERT INTO "users" (id, email, name, password_hash, role, is_active, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(), 
    'admin@vioflow.com', 
    'admin',  -- 小写，支持 'admin' 登录
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
    'admin', 
    true, 
    NOW(), 
    NOW()
  )
ON CONFLICT (email) DO UPDATE
SET 
  name = 'admin',
  password_hash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  role = 'admin',
  is_active = true,
  updated_at = NOW();
```

### 方案 4：改进认证服务（长期方案）

修改认证服务，支持大小写不敏感的查找：

```typescript
// 在 auth.service.ts 中
const user = await this.userRepository
  .createQueryBuilder('user')
  .where('LOWER(user.email) = LOWER(:username)', { username })
  .orWhere('LOWER(user.name) = LOWER(:username)', { username })
  .getOne();
```

## 验证修复

修复后，验证用户是否可以登录：

```sql
-- 验证用户信息
SELECT 
    email,
    name,
    role,
    is_active,
    password_hash IS NOT NULL as has_password,
    created_at
FROM users
WHERE email = 'admin@vioflow.com';
```

然后尝试登录：
- 用户名：`admin` 或 `admin@vioflow.com`
- 密码：`admin`

## 检查迁移状态

如果怀疑是迁移问题，检查数据库结构：

```sql
-- 检查必要的表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'teams', 'team_members', 'projects')
ORDER BY table_name;

-- 检查 users 表的字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('password_hash', 'is_active', 'team_id', 'phone')
ORDER BY column_name;
```

如果缺少字段，需要运行迁移脚本：
- `backend/src/database/migration-add-teams-and-permissions.sql`

## 常见问题

### Q: 为什么用 `admin` 登录找不到用户？

**A**: 因为数据库中名字是 `Admin`（大写A），而 PostgreSQL 字符串比较是大小写敏感的。解决方案：
1. 更新用户名字段为小写 `admin`
2. 或者用邮箱 `admin@vioflow.com` 登录

### Q: 如何确认 Railway 和 Supabase 使用同一个数据库？

**A**: 
1. 在 Railway 环境变量中查看 `DATABASE_URL`
2. 在 Supabase Dashboard → Settings → Database → Connection string 查看连接字符串
3. 对比两者是否一致

### Q: 迁移脚本需要运行吗？

**A**: 
- 如果数据库已经有所有必要的表和字段，不需要运行迁移
- 如果缺少 `password_hash`、`is_active`、`team_id` 等字段，需要运行迁移脚本

