# 快速开始指南

## 插入种子数据并测试前后端连接

### 方法 1：在 Supabase SQL Editor 中运行（推荐）

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com
   - 进入你的项目

2. **打开 SQL Editor**
   - 点击左侧菜单 **SQL Editor**
   - 点击 **"+ New"** 创建新查询

3. **运行种子数据脚本**
   - 打开文件：`backend/src/database/seed-data.sql`
   - 复制全部内容
   - 粘贴到 Supabase SQL Editor
   - 点击 **"Run"** 执行

4. **验证数据**
   脚本运行完成后会自动显示数据统计，或运行：
   ```sql
   SELECT 'Projects' as type, COUNT(*) as count FROM projects
   UNION ALL
   SELECT 'Videos', COUNT(*) FROM videos
   UNION ALL
   SELECT 'Tags', COUNT(*) FROM tags;
   ```

### 方法 2：使用 TypeScript 脚本（需要配置 DATABASE_URL）

如果你已经配置了 `backend/.env` 文件（包含 `DATABASE_URL`）：

```bash
cd backend
npm run seed
```

## 测试前后端连接

### 1. 启动后端

```bash
cd backend
npm run start:dev
```

后端将在 http://localhost:3002 启动

### 2. 启动前端

在新的终端：

```bash
npm run dev
```

前端将在 http://localhost:3009 启动

### 3. 测试功能

1. **访问前端**：http://localhost:3009
2. **登录测试**：
   - 账号：`admin@vioflow.com`
   - 密码：`admin`
3. **检查数据**：
   - 应该能看到项目列表
   - 应该能看到视频列表
   - 应该能看到标签

### 4. 验证 API 连接

在浏览器开发者工具（F12）中：
- 打开 **Network** 标签页
- 查看 API 请求是否成功
- 检查响应数据

## 如果遇到问题

### 数据库连接失败
- 检查 `DATABASE_URL` 是否正确
- 确认 Supabase 项目状态正常

### 登录失败
- 检查用户是否已创建
- 检查密码哈希是否正确

### API 请求失败
- 检查后端是否正在运行
- 检查 `VITE_API_BASE_URL` 环境变量

