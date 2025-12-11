# 云上版本种子数据插入指南

## 问题说明

云上版本（Vercel + Railway + Supabase）没有看到数据，是因为 Supabase 数据库还没有插入种子数据。

## 解决方案

### 方法 1：在 Supabase SQL Editor 中运行 SQL 脚本（推荐）

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com
   - 进入你的项目

2. **打开 SQL Editor**
   - 点击左侧菜单 **SQL Editor**
   - 点击 **"+ New"** 创建新查询

3. **运行基础种子数据脚本**
   - 打开文件：`backend/src/database/seed-data-fixed.sql`
   - 复制全部内容
   - 粘贴到 Supabase SQL Editor
   - 点击 **"Run"** 执行

4. **运行扩展种子数据脚本**（可选，添加更多数据）
   - 打开文件：`backend/src/database/seed-data-cloud.sql`
   - 复制全部内容
   - 粘贴到 Supabase SQL Editor
   - 点击 **"Run"** 执行

### 方法 2：使用 TypeScript 脚本（需要配置 Railway 环境变量）

如果你在 Railway 中配置了 `DATABASE_URL` 环境变量：

1. **在本地运行**（连接到 Supabase）：
   ```bash
   cd backend
   npm run seed:reset  # 清理并插入基础数据
   npm run seed:extended  # 添加扩展数据
   ```

2. **或者在 Railway 中运行**：
   - 在 Railway 项目设置中，找到 **Deployments**
   - 点击 **"New Deploy"** 或使用 Railway CLI
   - 设置环境变量 `DATABASE_URL` 为 Supabase 连接字符串
   - 运行种子脚本

## 验证数据

运行完成后，在 Supabase SQL Editor 中运行：

```sql
SELECT 'Users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'Projects', COUNT(*) FROM "projects"
UNION ALL
SELECT 'Videos', COUNT(*) FROM "videos"
UNION ALL
SELECT 'Tags', COUNT(*) FROM "tags"
UNION ALL
SELECT 'Project Members', COUNT(*) FROM "project_members"
UNION ALL
SELECT 'Video Tags', COUNT(*) FROM "video_tags"
UNION ALL
SELECT 'Deliveries', COUNT(*) FROM "deliveries";
```

应该看到：
- Users: 9+ 条记录
- Projects: 13+ 条记录
- Videos: 12+ 条记录
- Tags: 18+ 条记录

## 测试账号

- **管理员**：`admin@vioflow.com` / `admin`
- **成员**：`sarah@vioflow.com` / `admin`

## 标签显示问题修复

已修复前端标签显示问题：
- ✅ `PreviewPlayer.tsx` - 从 `state.tags` 获取标签
- ✅ `Workbench.tsx` - 从 `state.tags` 获取标签
- ✅ `RetrievalPanel.tsx` - 从 `state.tags` 获取标签

现在标签应该能正确显示在页面上。

## 注意事项

1. **密码哈希**：SQL 脚本中的密码哈希是 `admin` 的 bcrypt 哈希，如果需要修改，请使用 https://bcrypt-generator.com/ 生成新的哈希

2. **数据冲突**：脚本使用了 `ON CONFLICT DO NOTHING`，如果数据已存在，不会重复插入

3. **事务处理**：脚本使用事务，如果出错会自动回滚

4. **云上同步**：插入数据后，Railway 后端会自动读取 Supabase 数据库，前端（Vercel）会通过 API 获取数据

## 如果遇到问题

1. **检查 Supabase 连接**：
   - 确认 `DATABASE_URL` 环境变量正确
   - 确认 Supabase 项目状态正常

2. **检查 Railway 后端**：
   - 查看 Railway 日志
   - 确认后端能连接到 Supabase

3. **检查 Vercel 前端**：
   - 确认 `VITE_API_BASE_URL` 环境变量指向 Railway 后端
   - 查看浏览器控制台错误

