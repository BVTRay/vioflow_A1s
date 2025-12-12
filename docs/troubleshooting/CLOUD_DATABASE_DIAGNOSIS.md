# 云端数据库诊断和修复指南

## 问题描述

云端项目（Railway + Supabase）没有看到任何数据，需要诊断并修复。

## 快速诊断

### 方法 1：使用诊断脚本（推荐）

在本地运行诊断脚本（需要配置 DATABASE_URL 环境变量）：

```bash
cd backend
npm run diagnose-cloud
```

诊断脚本会检查：
- ✅ 环境变量配置
- ✅ 数据库连接
- ✅ 表结构完整性
- ✅ 数据量统计
- ✅ 用户和项目数据

### 方法 2：在 Supabase Dashboard 中检查

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单 **SQL Editor**
4. 运行以下查询：

```sql
-- 检查表结构
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 检查数据量
SELECT 
  'users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'projects', COUNT(*) FROM "projects"
UNION ALL
SELECT 'videos', COUNT(*) FROM "videos"
UNION ALL
SELECT 'tags', COUNT(*) FROM "tags"
UNION ALL
SELECT 'project_members', COUNT(*) FROM "project_members"
UNION ALL
SELECT 'deliveries', COUNT(*) FROM "deliveries";
```

## 常见问题和解决方案

### 问题 1：表结构不存在

**症状**：诊断脚本显示缺少表

**解决方案**：
1. 在 Supabase Dashboard 中打开 **SQL Editor**
2. 打开文件：`backend/src/database/init-schema.sql`
3. 复制全部内容
4. 粘贴到 SQL Editor
5. 点击 **"Run"** 执行

### 问题 2：表存在但没有数据

**症状**：所有表的 count 都是 0

**解决方案**：
1. 在 Supabase Dashboard 中打开 **SQL Editor**
2. 打开文件：`backend/src/database/seed-data-fixed.sql`
3. 复制全部内容
4. 粘贴到 SQL Editor
5. 点击 **"Run"** 执行

### 问题 3：数据库连接失败

**症状**：诊断脚本无法连接数据库

**检查清单**：
- [ ] Railway 环境变量中是否配置了 `DATABASE_URL`
- [ ] `DATABASE_URL` 格式是否正确（Supabase 连接字符串）
- [ ] Supabase 项目是否正常运行
- [ ] 网络连接是否正常

**获取 Supabase 连接字符串**：
1. 登录 Supabase Dashboard
2. 进入项目设置 → **Settings** → **Database**
3. 在 **Connection string** 部分：
   - 选择 **URI** 标签
   - 选择 **Connection pooling** 模式（端口 6543）
   - 复制连接字符串

**Railway 环境变量配置**：
```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 问题 4：部分数据缺失

**症状**：有用户但没有项目，或有项目但没有视频

**解决方案**：
1. 运行基础种子数据：`seed-data-fixed.sql`
2. 运行扩展种子数据：`seed-data-cloud.sql`（可选）

## 完整修复流程

### 步骤 1：检查数据库连接

```bash
cd backend
npm run diagnose-cloud
```

### 步骤 2：初始化表结构（如果需要）

在 Supabase SQL Editor 中运行：
- `backend/src/database/init-schema.sql`

### 步骤 3：插入种子数据

在 Supabase SQL Editor 中运行：
- `backend/src/database/seed-data-fixed.sql`（基础数据）
- `backend/src/database/seed-data-cloud.sql`（扩展数据，可选）

### 步骤 4：验证数据

在 Supabase SQL Editor 中运行：

```sql
SELECT 
  'Users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'Projects', COUNT(*) FROM "projects"
UNION ALL
SELECT 'Videos', COUNT(*) FROM "videos"
UNION ALL
SELECT 'Tags', COUNT(*) FROM "tags"
UNION ALL
SELECT 'Project Members', COUNT(*) FROM "project_members"
UNION ALL
SELECT 'Deliveries', COUNT(*) FROM "deliveries";
```

预期结果：
- Users: 2+ 条记录
- Projects: 5+ 条记录
- Videos: 4+ 条记录
- Tags: 8+ 条记录

### 步骤 5：测试登录

使用测试账号登录：
- **管理员**：`admin@vioflow.com` / `admin`
- **成员**：`sarah@vioflow.com` / `admin`

## 验证清单

完成修复后，检查以下内容：

- [ ] 数据库连接正常
- [ ] 所有必需的表都存在
- [ ] 用户表有数据（至少 2 个用户）
- [ ] 项目表有数据（至少 5 个项目）
- [ ] 视频表有数据（至少 4 个视频）
- [ ] 标签表有数据（至少 8 个标签）
- [ ] 可以使用测试账号登录
- [ ] 前端可以显示项目列表
- [ ] 前端可以显示项目详情

## 如果问题仍然存在

1. **检查 Railway 日志**：
   - 在 Railway Dashboard 中查看部署日志
   - 检查是否有数据库连接错误

2. **检查 Supabase 日志**：
   - 在 Supabase Dashboard 中查看 **Logs**
   - 检查是否有 SQL 错误

3. **检查前端 API 调用**：
   - 打开浏览器开发者工具
   - 查看 Network 标签
   - 检查 API 请求是否成功

4. **联系支持**：
   - 提供诊断脚本的完整输出
   - 提供 Supabase 和 Railway 的日志截图


