# 本地存储快速开始

## 🚀 一键迁移

最简单的方式：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
./quick-migrate.sh
```

脚本将自动完成：
1. ✅ 检查环境配置
2. ✅ 创建目录结构
3. ✅ 编译代码
4. ✅ 迁移数据
5. ✅ 验证结果

## 📋 手动步骤

如果需要手动执行：

### 1. 初始化目录
```bash
./init-storage-structure.sh
```

### 2. 配置环境变量
编辑 `.env` 文件：
```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=/www/wwwroot/vioflow_storage
LOCAL_STORAGE_URL_BASE=http://localhost:3000/storage
```

### 3. 编译代码
```bash
npm run build
```

### 4. 迁移数据（如有需要）
```bash
npx ts-node migrate-videos-to-local.ts
```

### 5. 重启服务
```bash
pm2 restart vioflow-backend  # 或你的进程管理器
```

## 📚 文档

- **完整指南**：`../LOCAL_STORAGE_MIGRATION_GUIDE.md`
- **技术文档**：`LOCAL_STORAGE_SETUP.md`
- **环境变量示例**：`env.local-storage.example`

## 🎯 关键文件

| 文件 | 用途 |
|------|------|
| `init-storage-structure.sh` | 初始化目录结构 |
| `migrate-videos-to-local.ts` | 数据迁移脚本 |
| `quick-migrate.sh` | 一键迁移脚本 |
| `src/common/storage/local-storage.service.ts` | 本地存储服务 |
| `src/modules/storage-serve/` | 静态文件服务 |

## 🔧 常见命令

```bash
# 检查存储目录
ls -la /www/wwwroot/vioflow_storage

# 查看存储使用情况
du -sh /www/wwwroot/vioflow_storage

# 查看视频文件
find /www/wwwroot/vioflow_storage/teams -name "source.*"

# 重新运行迁移（会跳过已存在的文件）
npx ts-node migrate-videos-to-local.ts

# 查看日志
tail -f logs/backend.log
```

## ⚡ 快速测试

```bash
# 测试文件访问
curl -I http://localhost:3000/storage/teams/xxx/projects/yyy/zzz/source.mp4

# 应该看到：
# HTTP/1.1 200 OK
# Accept-Ranges: bytes
# Content-Type: video/mp4
```

## 🆘 故障排查

### 权限问题
```bash
chmod -R 755 /www/wwwroot/vioflow_storage
```

### 磁盘空间
```bash
df -h /www/wwwroot
```

### 查看日志
```bash
tail -f logs/backend.log
```

## 📞 需要帮助？

1. 查看完整指南：`../LOCAL_STORAGE_MIGRATION_GUIDE.md`
2. 检查后端日志：`logs/backend.log`
3. 检查浏览器控制台

---

**提示**：首次运行建议使用 `quick-migrate.sh` 脚本，它会引导你完成所有步骤。



