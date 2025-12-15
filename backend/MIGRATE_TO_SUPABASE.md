# 迁移到 Supabase 数据库指南

本指南将帮助你将本地数据库的数据迁移到 Supabase，并配置应用只使用 Supabase。

## 步骤 1: 同步数据到 Supabase

### 1.1 准备 Supabase 连接字符串

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入你的项目
3. 点击 **Settings** → **Database**
4. 在 **Connection string** 部分：
   - 选择 **URI** 标签
   - 选择 **Direct connection**（端口 5432）或 **Connection pooling**（端口 6543）
   - 复制连接字符串
   - **重要**: 将 `[YOUR-PASSWORD]` 替换为你的数据库密码

连接字符串格式：
```
postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres
```

### 1.2 运行同步脚本

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend

# 方法 1: 使用环境变量
export SUPABASE_DATABASE_URL="postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
npx ts-node src/database/sync-to-supabase.ts

# 方法 2: 作为参数传入
npx ts-node src/database/sync-to-supabase.ts "postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

同步脚本会：
- ✅ 连接本地数据库和 Supabase
- ✅ 按依赖顺序同步所有表的数据
- ✅ 跳过已存在的记录（避免重复）
- ✅ 显示同步进度和结果

### 1.3 验证同步结果

同步完成后，脚本会显示统计信息。你也可以在 Supabase Dashboard 中查看数据。

## 步骤 2: 配置应用使用 Supabase

### 2.1 创建或更新 .env 文件

在 `backend` 目录下创建 `.env` 文件：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
```

创建 `.env` 文件，内容如下：

```env
# Supabase 数据库连接（替换为你的实际连接字符串和密码）
DATABASE_URL=postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres

# 应用配置
PORT=3002
NODE_ENV=development
CORS_ORIGIN=http://localhost:3009
JWT_SECRET=dev-secret-key-change-in-production
```

**重要**: 
- 将 `你的密码` 替换为 Supabase 数据库的实际密码
- 如果使用连接池，端口改为 `6543`

### 2.2 验证配置

重启应用后，查看启动日志，应该看到：

```
📌 数据库连接: Supabase
   Host: aws-0-us-west-2.pooler.supabase.com:5432
   Database: postgres
   Username: postgres.bejrwnamnxxdxoqwoxag
```

如果看到 "本地 PostgreSQL"，说明 `DATABASE_URL` 未正确配置。

## 步骤 3: 验证应用功能

### 3.1 测试数据库连接

```bash
cd backend
npx ts-node src/database/check-db-connection.ts
```

应该显示 Supabase 的数据。

### 3.2 测试开发者后台

1. 启动应用
2. 访问开发者后台
3. 检查用户列表，应该显示 Supabase 中的数据
4. 确认"不恭文化"团队等数据都正确显示

## 步骤 4: 删除本地数据库（可选）

⚠️ **警告**: 只有在确认 Supabase 数据完全正确后，才删除本地数据库！

### 4.1 备份本地数据库（可选但推荐）

```bash
# 导出本地数据库
pg_dump -h localhost -U postgres -d vioflow_mam > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 4.2 删除本地数据库

```bash
# 连接到 PostgreSQL
psql -h localhost -U postgres

# 删除数据库
DROP DATABASE vioflow_mam;

# 退出
\q
```

或者使用命令行：

```bash
dropdb -h localhost -U postgres vioflow_mam
```

### 4.3 清理环境变量（可选）

如果不再需要本地数据库配置，可以从 `.env` 文件中删除：

```env
# 可以删除这些，因为现在只使用 DATABASE_URL
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
# DB_DATABASE=vioflow_mam
```

## 步骤 5: 配置生产环境（Railway）

如果使用 Railway 部署，需要在 Railway 项目设置中配置 `DATABASE_URL` 环境变量：

1. 登录 [Railway Dashboard](https://railway.app)
2. 选择你的项目
3. 点击 **Variables** 标签
4. 添加环境变量：
   - 名称: `DATABASE_URL`
   - 值: 你的 Supabase 连接字符串（与本地相同）

## 常见问题

### Q: 同步时出现外键约束错误？

A: 同步脚本已经按依赖顺序同步数据。如果仍有问题，可能需要先禁用外键检查，或者手动调整同步顺序。

### Q: 如何确认数据已完全同步？

A: 运行对比脚本：
```bash
npx ts-node src/database/compare-databases.ts "你的Supabase连接字符串"
```

### Q: 可以保留本地数据库作为备份吗？

A: 可以。本地数据库不会影响应用运行，只要 `.env` 中配置了 `DATABASE_URL`，应用就会使用 Supabase。

### Q: 如何回滚到本地数据库？

A: 从 `.env` 文件中删除或注释掉 `DATABASE_URL`，应用会自动使用本地数据库配置。

## 注意事项

1. ✅ **数据安全**: 确保 Supabase 连接字符串中的密码正确
2. ✅ **备份**: 删除本地数据库前，建议先备份
3. ✅ **验证**: 同步后务必验证数据完整性
4. ✅ **生产环境**: 确保生产环境也配置了正确的 `DATABASE_URL`
5. ✅ **RLS 策略**: 如果 Supabase 启用了 RLS，可能需要调整策略以允许应用访问

## 完成检查清单

- [ ] 数据已成功同步到 Supabase
- [ ] `.env` 文件中配置了 `DATABASE_URL`
- [ ] 应用启动日志显示连接 Supabase
- [ ] 开发者后台显示的数据与 Supabase 一致
- [ ] 生产环境（Railway）已配置 `DATABASE_URL`
- [ ] （可选）本地数据库已删除或备份

完成以上步骤后，你的应用将完全使用 Supabase 数据库，不再依赖本地数据库。


