# 审阅功能测试数据说明

## 概述

已在种子数据中添加了批注和分享链接的测试数据，用于演示审阅功能。

## 测试数据内容

### seed-data-fixed.sql

#### 批注数据（9条）
- **Nike v4视频**：4条批注
  - 00:00:15 - "这里的红色饱和度能降低一点吗？整体感觉有点过于鲜艳了。"
  - 00:00:32 - "Logo出现的时间可以提前2秒，现在感觉有点晚了。"
  - 00:01:05 - "背景音乐的音量可以稍微调大一些，现在有点听不清楚。"（已处理）
  - 00:01:28 - "确认锁定。这个版本可以了。"（已处理）

- **Nike v3视频**（历史版本）：2条批注
  - 00:00:20 - "调色需要更暖一些，现在的色调偏冷。"（已处理）
  - 00:00:45 - "这个转场效果不错，可以保留。"（已处理）

- **Netflix视频**：3条批注
  - 00:05:30 - "这里的字幕需要调整，字体太小了，看不清楚。"
  - 00:12:15 - "背景音乐和旁白的声音平衡需要调整，旁白有点被音乐盖住了。"
  - 00:18:45 - "这个镜头的时长可以缩短3秒，节奏会更好。"

#### 分享链接（2个）
1. **Nike视频审阅链接**（无密码）
   - 类型：`video_review`
   - 密码：无
   - 允许下载：否
   - 过期时间：7天后

2. **Netflix视频审阅链接**（有密码）
   - 类型：`video_review`
   - 密码：`review123`（注意：当前使用的是 'admin' 的哈希，实际密码是 'admin'）
   - 允许下载：是
   - 过期时间：14天后

### seed-data-cloud.sql

#### 批注数据（11条）
- **Adidas视频**：3条批注
- **Samsung视频**：2条批注
- **Tesla视频**：3条批注
- **Amazon视频**：3条批注

#### 分享链接（3个）
1. **Adidas视频审阅链接**（无密码）
2. **Samsung视频审阅链接**（有密码：`admin`）
3. **Tesla视频审阅链接**（无密码，允许下载）

## 使用方法

### 1. 运行种子数据脚本

在 Supabase SQL Editor 中运行：
- `backend/src/database/seed-data-fixed.sql`（基础数据）
- `backend/src/database/seed-data-cloud.sql`（扩展数据）

### 2. 获取分享链接Token

运行以下SQL查询获取分享链接的token：

```sql
SELECT 
  s.token,
  s.type,
  v.name as video_name,
  p.name as project_name,
  s.password_hash IS NOT NULL as has_password,
  s.allow_download,
  s.expires_at
FROM share_links s
LEFT JOIN videos v ON s.video_id = v.id
LEFT JOIN projects p ON s.project_id = p.id
WHERE s.type = 'video_review'
ORDER BY s.created_at DESC;
```

### 3. 访问分享页面

使用获取的token访问分享页面：
```
https://your-domain.com/share/{token}
```

例如：
```
https://your-domain.com/share/{nike_video_token}
```

### 4. 测试批注功能

在分享页面中：
- 查看现有批注：批注会自动加载并显示在右侧边栏
- 添加新批注：在视频播放时，在输入框中输入批注内容，按Enter或点击发送按钮
- 跳转到批注时间点：点击批注的时间码，视频会自动跳转到对应时间点

## 注意事项

1. **密码哈希**：当前使用的密码哈希是 'admin' 的哈希值，所以如果分享链接设置了密码，实际密码是 `admin`，而不是 `review123`。

2. **Token唯一性**：每个分享链接的token都是随机生成的UUID，确保唯一性。

3. **数据关联**：批注数据已经关联到对应的视频，分享链接也已经关联到对应的视频和项目。

4. **过期时间**：分享链接设置了过期时间（7-14天），过期后无法访问。

## 验证数据

运行以下SQL查询验证数据：

```sql
-- 查看批注数量
SELECT COUNT(*) as annotation_count FROM annotations;

-- 查看分享链接数量
SELECT COUNT(*) as share_link_count FROM share_links WHERE type = 'video_review';

-- 查看每个视频的批注数量
SELECT 
  v.name as video_name,
  COUNT(a.id) as annotation_count
FROM videos v
LEFT JOIN annotations a ON v.id = a.video_id
GROUP BY v.id, v.name
ORDER BY annotation_count DESC;
```

