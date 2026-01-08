# 异步队列配置指南

## 概述

系统使用 Bull 和 Redis 来实现异步任务队列，用于处理CPU/IO密集型任务，如：
- 视频缩略图生成
- PDF导出
- 其他重负载任务

## 安装 Redis

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### macOS

```bash
brew install redis
brew services start redis
```

### Docker

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

## 环境变量配置

在 `.env` 文件中添加：

```env
# Redis 配置（可选，默认使用 localhost:6379）
REDIS_URL=redis://localhost:6379

# 如果需要密码
REDIS_URL=redis://:password@localhost:6379

# 如果需要远程Redis
REDIS_URL=redis://user:password@redis.example.com:6379
```

## 验证配置

1. 检查 Redis 是否运行：
```bash
redis-cli ping
# 应该返回: PONG
```

2. 启动后端服务，检查日志中是否有队列初始化信息

## 队列监控

队列状态可以通过 `QueueService.getQueueStatus()` 方法获取，包括：
- 等待中的任务数
- 正在处理的任务数
- 已完成的任务数
- 失败的任务数

## 故障排除

### Redis 连接失败

如果看到 "ECONNREFUSED" 错误：
1. 确认 Redis 服务正在运行
2. 检查 `REDIS_URL` 环境变量是否正确
3. 检查防火墙设置

### 任务处理失败

1. 查看后端日志获取详细错误信息
2. 检查任务重试配置（默认重试3次）
3. 检查相关服务（如 FFmpeg）是否正常

## 性能优化

- 默认队列并发数：根据服务器CPU核心数调整
- 任务重试策略：指数退避，避免频繁重试
- 任务清理：完成后自动清理，失败任务保留用于调试

## 注意事项

1. **Redis 持久化**：生产环境建议启用 Redis 持久化，避免任务丢失
2. **内存管理**：大量任务可能占用 Redis 内存，注意监控
3. **队列分离**：不同类型的任务使用不同的队列，避免相互影响











