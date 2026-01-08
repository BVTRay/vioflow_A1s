# 本地存储迁移完整指南

本指南将帮助你将视频存储从云端（Supabase/R2）迁移到本地存储。

## 📋 概述

已完成的工作：
- ✅ 创建了本地存储服务（LocalStorageService）
- ✅ 创建了静态文件服务（StorageServeController）
- ✅ 创建了目录结构初始化脚本
- ✅ 创建了数据迁移脚本
- ✅ 更新了存储模块配置

## 📁 目录结构

本地存储采用以下目录结构：

```
/www/wwwroot/vioflow_storage/
├── temp/                          # 临时上传区
├── system/                        # 系统公共资源
│   ├── defaults/                  # 默认头像、Logo
│   └── assets/                    # 系统资源
├── teams/                         # 团队租户存储区（核心数据）
│   └── {team_uuid}/               # 团队 UUID
│       ├── avatars/               # 团队头像
│       └── projects/
│           └── {project_uuid}/    # 项目 UUID
│               └── {video_uuid}/  # 视频 UUID（资源包）
│                   ├── source.mp4          # 原始文件
│                   ├── proxy_720p.mp4      # 转码代理文件
│                   ├── cover_original.jpg  # 原始封面
│                   ├── thumb_200x.jpg      # 缩略图
│                   └── waveform.json       # 音频波形
└── users/                         # 个人用户存储区
    └── {user_uuid}/
        ├── avatar.jpg
        └── projects/
```

## 🚀 迁移步骤

### 第 1 步：初始化目录结构

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
chmod +x init-storage-structure.sh
./init-storage-structure.sh
```

验证目录创建成功：
```bash
ls -la /www/wwwroot/vioflow_storage
```

### 第 2 步：配置环境变量

编辑 `.env` 文件（或从示例创建）：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
cp env.local-storage.example .env  # 如果还没有 .env 文件
vi .env  # 或使用你喜欢的编辑器
```

必需的配置：

```env
# 存储类型
STORAGE_TYPE=local

# 本地存储路径
LOCAL_STORAGE_PATH=/www/wwwroot/vioflow_storage

# 访问URL（根据你的实际情况配置）
LOCAL_STORAGE_URL_BASE=http://localhost:3000/storage

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_actual_password
DB_NAME=vioflow

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 应用配置
PORT=3000
NODE_ENV=production
```

### 第 3 步：重新编译后端

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
npm install  # 确保依赖已安装
npm run build
```

### 第 4 步：测试配置（可选但推荐）

先用测试模式启动后端，确保配置正确：

```bash
npm run start:dev
```

检查日志中是否显示：
```
[StorageModule] 使用本地存储服务
[LocalStorageService] 初始化本地存储服务...
```

如果看到这些日志，说明配置成功。按 Ctrl+C 停止测试。

### 第 5 步：运行数据迁移（如果有现有视频）

**⚠️ 重要提示：**
- 确保有足够的磁盘空间
- 建议先备份数据库
- 迁移过程可能需要较长时间

运行迁移脚本：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
npx ts-node migrate-videos-to-local.ts
```

迁移脚本会：
1. ✅ 从数据库读取所有视频记录
2. ✅ 下载视频文件和缩略图
3. ✅ 按新目录结构保存到本地
4. ✅ 更新数据库的 `storage_url` 和 `storage_key`
5. ✅ 显示进度和统计信息

迁移输出示例：
```
========================================
视频迁移脚本 - 从云端迁移到本地存储
========================================
找到 50 个待迁移的视频

[1/50] ========================================
处理视频: demo.mp4 (ID: xxx-xxx-xxx)
  → 下载文件: https://...
  ✓ 下载成功: 125.50 MB
  ✓ 保存文件: /www/wwwroot/vioflow_storage/teams/.../source.mp4
  ✓ 数据库更新成功

...

========================================
迁移完成！
========================================
总计: 50 个视频
成功: 48 个
失败: 0 个
跳过: 2 个
========================================
```

### 第 6 步：验证迁移结果

检查文件是否正确保存：

```bash
# 查看存储目录大小
du -sh /www/wwwroot/vioflow_storage

# 查看团队目录
ls -la /www/wwwroot/vioflow_storage/teams/

# 查看具体视频文件
find /www/wwwroot/vioflow_storage/teams -name "source.*" | head -5
```

检查数据库更新：

```sql
-- 连接数据库
psql -U postgres -d vioflow

-- 查看迁移后的 URL
SELECT id, name, storage_url, storage_key 
FROM videos 
WHERE deleted_at IS NULL 
LIMIT 5;

-- 应该看到类似这样的 URL：
-- http://localhost:3000/storage/teams/xxx/projects/yyy/zzz/source.mp4
```

### 第 7 步：重启后端服务

**注意：根据你的要求，我不会自动重启服务。**

当你准备好后，手动重启后端：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
pm2 restart vioflow-backend  # 或使用你的进程管理器
```

### 第 8 步：测试视频播放

1. 登录前端应用
2. 打开一个项目
3. 尝试播放视频
4. 检查浏览器控制台和网络面板，确认视频从本地加载

预期的视频 URL 格式：
```
http://localhost:3000/storage/teams/{team_id}/projects/{project_id}/{video_id}/source.mp4
```

## 🔧 生产环境优化（推荐）

### 使用 Nginx 反向代理

为了更好的性能，建议使用 Nginx 直接提供静态文件：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # API 请求转发到 Node.js
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态文件由 Nginx 直接提供
    location /storage/ {
        alias /www/wwwroot/vioflow_storage/;
        
        # Range 请求支持（视频播放必需）
        add_header Accept-Ranges bytes;
        
        # 缓存设置
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # 安全设置
        add_header X-Content-Type-Options nosniff;
        
        # CORS（如果需要跨域访问）
        add_header Access-Control-Allow-Origin *;
        
        # 限制大小（可选）
        client_max_body_size 500M;
    }

    # 前端静态文件
    location / {
        root /www/wwwroot/vioflow-A/vioflow_A1s-1/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

如果使用 Nginx，更新 `.env`：
```env
LOCAL_STORAGE_URL_BASE=https://yourdomain.com/storage
```

然后重新运行迁移脚本更新数据库中的 URL。

### 磁盘空间监控

设置定期检查脚本 `/usr/local/bin/check-storage.sh`：

```bash
#!/bin/bash
STORAGE_PATH="/www/wwwroot/vioflow_storage"
THRESHOLD=80  # 磁盘使用率阈值

USAGE=$(df -h "$STORAGE_PATH" | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "警告：存储空间使用率达到 ${USAGE}%"
    # 这里可以添加发送通知的代码
fi
```

添加到 crontab：
```bash
# 每小时检查一次
0 * * * * /usr/local/bin/check-storage.sh
```

## 📊 文件访问 API

本地存储的文件通过以下 API 访问：

```
GET /storage/{path}
```

特性：
- ✅ 支持 Range 请求（视频流播放）
- ✅ 自动 Content-Type 识别
- ✅ 路径安全检查
- ✅ 缓存控制头

示例：
```bash
# 获取视频
curl http://localhost:3000/storage/teams/xxx/projects/yyy/zzz/source.mp4

# Range 请求（用于流媒体）
curl -H "Range: bytes=0-1024" http://localhost:3000/storage/teams/xxx/projects/yyy/zzz/source.mp4
```

## 🔄 回滚到云存储

如果需要切换回云存储，只需修改 `.env`：

```env
# 切换回 R2
STORAGE_TYPE=r2

# 或切换回 Supabase
STORAGE_TYPE=supabase
```

然后重启服务。已存在的本地文件仍可访问，新上传的文件将使用云存储。

## 📝 文件清单

本次迁移创建/修改的文件：

### 新增文件
- `backend/src/common/storage/local-storage.service.ts` - 本地存储服务
- `backend/src/modules/storage-serve/storage-serve.module.ts` - 静态文件模块
- `backend/src/modules/storage-serve/storage-serve.controller.ts` - 静态文件控制器
- `backend/init-storage-structure.sh` - 目录结构初始化脚本
- `backend/migrate-videos-to-local.ts` - 数据迁移脚本
- `backend/LOCAL_STORAGE_SETUP.md` - 详细配置文档
- `backend/env.local-storage.example` - 环境变量示例
- `LOCAL_STORAGE_MIGRATION_GUIDE.md` - 本指南

### 修改文件
- `backend/src/common/storage/storage.module.ts` - 添加本地存储支持
- `backend/src/app.module.ts` - 注册静态文件服务模块

## ❓ 故障排查

### 1. 上传失败

**问题**：上传视频时报错 "保存文件到本地失败"

**解决**：
```bash
# 检查目录权限
ls -la /www/wwwroot/vioflow_storage
chmod -R 755 /www/wwwroot/vioflow_storage

# 检查磁盘空间
df -h /www/wwwroot
```

### 2. 文件访问 404

**问题**：访问视频时返回 404

**解决**：
```bash
# 检查文件是否存在
ls -la /www/wwwroot/vioflow_storage/teams/.../

# 检查数据库中的 URL
psql -U postgres -d vioflow -c "SELECT storage_url FROM videos WHERE id='xxx';"

# 确认 URL 配置
echo $LOCAL_STORAGE_URL_BASE
```

### 3. 视频无法播放

**问题**：视频加载但无法播放

**解决**：
- 检查浏览器控制台错误
- 确认服务器支持 Range 请求
- 检查视频文件是否完整（对比大小）
- 尝试用 curl 测试：
```bash
curl -I http://localhost:3000/storage/teams/.../source.mp4
# 应该看到 Accept-Ranges: bytes
```

### 4. 迁移脚本失败

**问题**：迁移中途失败

**解决**：
- 检查网络连接
- 确认有足够磁盘空间
- 可以重新运行脚本，会自动跳过已迁移的文件

## 📞 获取帮助

如有问题，请查看：
- `backend/LOCAL_STORAGE_SETUP.md` - 详细技术文档
- `backend/logs/backend.log` - 后端日志
- 浏览器开发者工具的网络面板

## ✅ 完成检查清单

- [ ] 目录结构已创建
- [ ] 环境变量已配置
- [ ] 后端已重新编译
- [ ] 数据迁移已完成
- [ ] 验证文件已保存
- [ ] 数据库 URL 已更新
- [ ] 服务已重启
- [ ] 视频可以正常播放
- [ ] （可选）Nginx 反向代理已配置
- [ ] （可选）监控脚本已设置

恭喜！你已经成功将视频存储迁移到本地！🎉



