# Railway 500 错误排查指南

## 问题：登录时返回 500 Internal Server Error

### 可能的原因

1. **数据库连接失败**（最可能）
   - Supabase 数据库连接字符串配置错误
   - 数据库服务未启动或不可用
   - 网络连接问题

2. **数据库中没有用户数据**
   - 数据库表已创建，但没有初始用户
   - 需要运行数据库种子脚本

3. **JWT 配置问题**
   - JWT 密钥未配置
   - JWT 模块配置错误

4. **其他运行时错误**
   - 代码逻辑错误
   - 依赖缺失

## 排查步骤

### 1. 检查 Railway 部署日志

1. 登录 Railway (https://railway.app)
2. 进入你的项目
3. 点击服务名称
4. 点击 "Deployments" 标签页
5. 找到最新的部署，点击 "View Logs"
6. 查找以下错误信息：

#### 数据库连接错误
```
[TypeOrmModule] Unable to connect to the database
Error: SASL: SCRAM-SERVER-FINAL-MESSAGE
```
**解决方案**：检查 `DATABASE_URL` 环境变量是否正确

#### 用户不存在错误
```
User not found: admin
```
**解决方案**：需要运行数据库种子脚本创建初始用户

#### 其他错误
查看完整的错误堆栈，根据错误信息进行修复

### 2. 检查环境变量

在 Railway 项目设置中，确认以下环境变量已正确配置：

```env
# 数据库连接（必需）
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# 应用配置（必需）
NODE_ENV=production
PORT=3000

# CORS 配置（必需）
CORS_ORIGIN=https://a1s.vioflow.cc

# Supabase Storage（可选，如果使用文件存储）
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
SUPABASE_STORAGE_BUCKET=videos

# JWT 密钥（如果配置了）
JWT_SECRET=你的JWT密钥
```

### 3. 验证数据库连接

#### 方法 1：检查 Railway 日志
查看部署日志，确认是否有 "Database connection successful" 或类似的成功消息。

#### 方法 2：使用 Supabase Dashboard
1. 登录 Supabase (https://supabase.com)
2. 进入你的项目
3. 点击左侧菜单 "Database" → "Connection Pooling"
4. 确认连接池状态正常

### 4. 创建初始用户数据

如果数据库连接正常但没有用户数据，需要创建初始用户：

#### 方法 1：使用 Supabase SQL Editor
1. 登录 Supabase Dashboard
2. 点击左侧菜单 "SQL Editor"
3. 运行以下 SQL（替换密码哈希）：

```sql
-- 创建管理员用户（密码: admin）
INSERT INTO "user" (email, name, password_hash, role, created_at, updated_at)
VALUES (
  'admin@vioflow.com',
  'Admin',
  '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- 这是 'admin' 的 bcrypt 哈希
  'admin',
  NOW(),
  NOW()
);

-- 创建成员用户（密码: admin）
INSERT INTO "user" (email, name, password_hash, role, created_at, updated_at)
VALUES (
  'sarah@vioflow.com',
  'Sarah',
  '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- 这是 'admin' 的 bcrypt 哈希
  'member',
  NOW(),
  NOW()
);
```

**注意**：上面的密码哈希是示例，你需要生成正确的 bcrypt 哈希。

#### 方法 2：使用 Railway CLI 运行种子脚本

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 运行种子脚本（需要先确保数据库连接正常）
railway run npm run seed
```

### 5. 生成正确的密码哈希

如果需要创建新用户，可以使用以下 Node.js 脚本生成密码哈希：

```javascript
const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash:', hash);
}

generateHash();
```

或者使用在线工具（不推荐用于生产环境）：
- https://bcrypt-generator.com/

## 常见错误和解决方案

### 错误 1：数据库连接失败

**错误信息**：
```
[TypeOrmModule] Unable to connect to the database
Error: SASL: SCRAM-SERVER-FINAL-MESSAGE
```

**解决方案**：
1. 检查 `DATABASE_URL` 环境变量格式是否正确
2. 确认使用 Supabase 的连接池模式（端口 6543）
3. 检查密码是否正确
4. 确认 Supabase 项目状态正常

### 错误 2：用户不存在

**错误信息**：
```
User not found: admin
```

**解决方案**：
1. 运行数据库种子脚本创建初始用户
2. 或使用 Supabase SQL Editor 手动创建用户

### 错误 3：JWT 签名失败

**错误信息**：
```
JWT sign error
```

**解决方案**：
1. 检查 `JWT_SECRET` 环境变量是否配置
2. 如果未配置，NestJS 会使用默认值，但建议显式配置

## 验证修复

修复后，按以下步骤验证：

1. **检查 Railway 日志**
   - 确认没有错误信息
   - 确认服务正常启动

2. **测试登录**
   - 访问前端页面
   - 使用测试账号登录：
     - 管理员：`admin@vioflow.com` / `admin`
     - 成员：`sarah@vioflow.com` / `admin`

3. **检查响应**
   - 如果登录成功，应该返回 `access_token` 和用户信息
   - 如果仍然失败，查看浏览器控制台的错误信息

## 获取帮助

如果问题仍然存在：

1. 查看 Railway 的完整部署日志
2. 查看浏览器控制台的错误信息
3. 检查 Supabase Dashboard 中的数据库状态
4. 确认所有环境变量都已正确配置

