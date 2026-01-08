# 本地存储配置指南

本文档说明如何配置项目以使用本地存储来存储视频文件。

## 目录结构

本地存储采用以下目录结构：

```
/www/wwwroot/vioflow_storage/
├── temp/                          # 临时上传区（分片上传碎片、转码中间产物）
│   ├── {upload_id}/
│   └── ...
├── system/                        # 系统公共资源（默认头像、Logo、Banner）
│   ├── defaults/
│   └── assets/
├── teams/                         # 团队租户存储区（核心数据）
│   ├── {team_uuid}/               # 使用UUID，不要用团队名（防重名、防修改）
│   │   ├── avatars/               # 团队头像/LOGO
│   │   ├── projects/
│   │   │   ├── {project_uuid}/    # 项目隔离
│   │   │   │   ├── {video_uuid}/  # "资源包"概念（核心设计）
│   │   │   │   │   ├── source.mp4       # 原始文件
│   │   │   │   │   ├── proxy_720p.mp4   # 转码后的代理文件（在线播放用）
│   │   │   │   │   ├── cover_original.jpg # 原始封面
│   │   │   │   │   ├── thumb_200x.jpg   # 列表小图
│   │   │   │   │   └── waveform.json    # 音频波形数据
│   │   │   │   └── {file_uuid}/   # 其他文档资源
│   │   └── ...
│   └── ...
└── users/                         # 个人用户存储区（个人工作区）
    ├── {user_uuid}/
    │   ├── avatar.jpg
    │   ├── projects/
    │   └── ...
```

## 环境变量配置

在 `.env` 文件中添加以下环境变量：

### 存储类型选择

```env
# 存储类型：设置为 'local' 使用本地存储
STORAGE_TYPE=local
```

### 本地存储配置

```env
# 本地存储根目录路径
LOCAL_STORAGE_PATH=/www/wwwroot/vioflow_storage

# 本地存储访问URL基础路径
# 开发环境示例：
LOCAL_STORAGE_URL_BASE=http://localhost:3000/storage

# 生产环境示例（如果使用反向代理）：
# LOCAL_STORAGE_URL_BASE=https://yourdomain.com/storage
```

### 数据库配置（用于迁移脚本）

```env
# PostgreSQL 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=vioflow
```

## 初始化存储目录

运行以下命令创建目录结构：

```bash
cd backend
chmod +x init-storage-structure.sh
./init-storage-structure.sh
```

这将在 `/www/wwwroot/vioflow_storage` 下创建所有必要的目录。

## 从云端迁移现有视频

如果你已经有存储在云端（Supabase 或 R2）的视频，可以使用迁移脚本将它们迁移到本地：

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

确保 `.env` 文件中包含：
- 数据库连接信息
- 本地存储配置
- （可选）原云存储的访问凭证（如果文件需要认证才能下载）

### 3. 运行迁移脚本

```bash
# 编译 TypeScript
npm run build

# 运行迁移脚本
npx ts-node migrate-videos-to-local.ts
```

迁移脚本会：
1. 从数据库读取所有视频记录
2. 下载每个视频文件及其缩略图
3. 按照新的目录结构保存到本地
4. 更新数据库中的 `storage_url` 和 `storage_key` 字段

### 迁移注意事项

- 迁移过程可能需要较长时间，取决于视频数量和大小
- 确保有足够的磁盘空间
- 脚本会自动跳过已经迁移的文件
- 如果中途失败，可以重新运行脚本继续迁移
- 建议先备份数据库

## 文件访问

本地存储的文件通过以下路由访问：

```
GET /storage/{path}
```

例如：
```
GET /storage/teams/xxx-xxx-xxx/projects/yyy-yyy-yyy/zzz-zzz-zzz/source.mp4
```

### 特性

- **支持 Range 请求**：视频可以流式播放和拖动进度条
- **自动 Content-Type**：根据文件扩展名自动设置正确的 MIME 类型
- **路径安全检查**：防止路径遍历攻击
- **缓存控制**：设置合理的缓存头以提高性能

## 生产环境配置

### 使用 Nginx 反向代理（推荐）

为了更好的性能，建议使用 Nginx 直接提供静态文件服务：

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
    }

    # 静态文件直接由 Nginx 提供
    location /storage/ {
        alias /www/wwwroot/vioflow_storage/;
        
        # 启用 Range 请求支持（视频播放）
        add_header Accept-Ranges bytes;
        
        # 缓存设置
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # 安全设置
        add_header X-Content-Type-Options nosniff;
        
        # CORS 设置（如果需要）
        add_header Access-Control-Allow-Origin *;
    }
}
```

如果使用 Nginx，将 `LOCAL_STORAGE_URL_BASE` 设置为：
```env
LOCAL_STORAGE_URL_BASE=https://yourdomain.com/storage
```

### 磁盘空间监控

定期检查磁盘使用情况：

```bash
# 检查存储目录大小
du -sh /www/wwwroot/vioflow_storage

# 检查各团队的存储使用
du -sh /www/wwwroot/vioflow_storage/teams/*

# 检查磁盘剩余空间
df -h /www/wwwroot
```

## 备份策略

建议定期备份存储目录：

```bash
# 增量备份（使用 rsync）
rsync -av --progress /www/wwwroot/vioflow_storage/ /backup/vioflow_storage/

# 或使用 tar 打包
tar -czf vioflow_storage_$(date +%Y%m%d).tar.gz /www/wwwroot/vioflow_storage/
```

## 故障排查

### 文件上传失败

1. 检查目录权限：
```bash
ls -la /www/wwwroot/vioflow_storage
# 确保 Node.js 进程有写入权限
```

2. 检查磁盘空间：
```bash
df -h /www/wwwroot
```

### 文件访问失败

1. 检查文件是否存在：
```bash
ls -la /www/wwwroot/vioflow_storage/teams/...
```

2. 检查 URL 配置：
```bash
# 确认 LOCAL_STORAGE_URL_BASE 与实际访问路径匹配
echo $LOCAL_STORAGE_URL_BASE
```

3. 检查日志：
```bash
tail -f backend/logs/backend.log
```

## 性能优化

### 1. 使用 SSD

- 将 `/www/wwwroot/vioflow_storage` 存储在 SSD 上以获得更好的读写性能

### 2. 文件系统选择

- 推荐使用 ext4 或 xfs 文件系统
- 确保启用了 noatime 挂载选项以减少磁盘写入

### 3. 定期清理临时文件

```bash
# 清理超过7天的临时文件
find /www/wwwroot/vioflow_storage/temp -type f -mtime +7 -delete
```

## 从本地存储切换回云存储

如果需要切换回云存储，只需修改 `.env`：

```env
# 切换回 R2
STORAGE_TYPE=r2

# 或切换回 Supabase
STORAGE_TYPE=supabase
```

新上传的文件将使用云存储，但已存在的本地文件仍可访问。



