# Supabase 种子数据注入指南

## 目的

在 Supabase 数据库中注入测试数据，用于验证数据库功能是否正常工作。

## 前置条件

1. ✅ 数据库表结构已创建（已运行 `init-schema.sql`）
2. ✅ 用户已创建（admin@vioflow.com 和 sarah@vioflow.com）
3. ✅ 用户密码已正确设置

## 操作步骤

### 步骤 1：打开 Supabase SQL Editor

1. 登录 Supabase Dashboard
2. 选择你的项目
3. 点击左侧菜单 **SQL Editor**
4. 点击 **"+ New"** 创建新查询

### 步骤 2：运行种子数据脚本

1. 打开文件：`backend/src/database/seed-data.sql`
2. 复制全部内容
3. 粘贴到 Supabase SQL Editor
4. 点击绿色的 **"Run"** 按钮（或按 `⌘↩` / `Ctrl+Enter`）

### 步骤 3：验证数据

脚本运行完成后，会自动显示数据统计：

- Users: 2（或更多，如果之前已创建）
- Projects: 5
- Videos: 4
- Tags: 8
- Project Members: 3
- Video Tags: 2
- Deliveries: 2
- Delivery Folders: 4
- Notifications: 2

## 种子数据内容

### 标签（8个）
- AI生成
- 三维制作
- 病毒广告
- 剧情
- 纪录片
- 广告片
- 社交媒体
- 品牌宣传

### 项目（5个）
1. **2412_Nike_AirMax_Holiday** (Nike) - 活跃状态
2. **2501_Spotify_Wrapped_Asia** (Spotify) - 活跃状态
3. **2411_Netflix_Docu_S1** (Netflix) - 已定版
4. **2410_Porsche_911_Launch** (Porsche) - 已交付
5. **2409_Apple_Event_Launch** (Apple) - 活跃状态

### 视频（4个）
1. **v4_Nike_AirMax.mp4** - Nike 项目，初始状态
2. **v3_Nike_AirMax.mp4** - Nike 项目，已批注
3. **v12_Porsche_Launch_Master.mov** - Porsche 项目，已批准，案例文件
4. **v8_Netflix_Ep1_Lock.mp4** - Netflix 项目，初始状态

### 项目成员（3个）
- Nike 项目：Sarah（所有者）、Admin（成员）
- Spotify 项目：Admin（所有者）

### 交付数据（2个）
- Netflix 项目：部分完成
- Porsche 项目：已完成（包含所有文件夹）

### 通知（2个）
- 视频上传完成通知
- 项目定版通知

## 验证数据

### 查看项目列表
```sql
SELECT name, client, status, "group" FROM projects ORDER BY created_date DESC;
```

### 查看视频列表
```sql
SELECT v.name, p.name as project_name, v.status, v.version 
FROM videos v 
JOIN projects p ON v.project_id = p.id 
ORDER BY v.upload_time DESC;
```

### 查看项目成员
```sql
SELECT p.name as project_name, u.name as user_name, pm.role 
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN users u ON pm.user_id = u.id;
```

### 查看交付信息
```sql
SELECT p.name as project_name, d.has_clean_feed, d.has_multi_resolution, d.completed_at
FROM deliveries d
JOIN projects p ON d.project_id = p.id;
```

## 测试登录和功能

1. **登录测试**
   - 使用 `admin@vioflow.com` / `admin` 登录
   - 应该能看到项目列表和视频列表

2. **查看工作台**
   - 应该能看到 5 个项目
   - 应该能看到最近的活动

3. **查看项目详情**
   - 点击任意项目，应该能看到项目信息和视频列表

4. **查看视频**
   - 应该能看到 4 个视频
   - 每个视频都有对应的项目

## 如果遇到错误

### 错误 1：外键约束错误
如果看到外键约束错误，可能是：
- 用户不存在：确保已创建 admin@vioflow.com 和 sarah@vioflow.com
- 项目 ID 获取失败：检查项目是否成功创建

**解决方案**：重新运行脚本，或手动检查数据

### 错误 2：唯一约束冲突
如果看到唯一约束冲突，说明数据已存在。

**解决方案**：
- 可以忽略这些错误（使用 `ON CONFLICT DO NOTHING`）
- 或者先删除现有数据再运行

### 错误 3：数据类型错误
如果看到数据类型错误，检查：
- 枚举值是否正确
- 日期格式是否正确

## 清理数据（可选）

如果需要重新注入数据，可以先清理：

```sql
-- 注意：这会删除所有数据，请谨慎操作
DELETE FROM notifications;
DELETE FROM delivery_folders;
DELETE FROM delivery_package_files;
DELETE FROM delivery_packages;
DELETE FROM delivery_files;
DELETE FROM deliveries;
DELETE FROM video_tags;
DELETE FROM annotations;
DELETE FROM videos;
DELETE FROM project_members;
DELETE FROM projects;
DELETE FROM tags;
-- 注意：不要删除 users 表，除非你想重新创建用户
```

## 完成后的验证清单

- [ ] 种子数据脚本运行成功
- [ ] 数据统计显示正确的数量
- [ ] 可以正常登录
- [ ] 可以看到项目列表
- [ ] 可以看到视频列表
- [ ] 可以查看项目详情
- [ ] 所有功能正常工作

如果所有项目都打勾，说明数据库功能正常！🎉

