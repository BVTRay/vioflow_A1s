# 启动后端服务指南

## 当前状态

✅ 配置已正确：
- `.env` 文件存在
- `DATABASE_URL` 已配置为 Supabase
- 数据库连接正常

⚠️ **后端服务未运行** - 需要启动服务

## 启动方法

### 方法 1: 开发模式（推荐用于开发）

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
npm run start:dev
```

服务将在 `http://localhost:3002` 启动，支持热重载。

### 方法 2: 使用 PM2（推荐用于生产或后台运行）

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend

# 启动服务
pm2 start npm --name vioflow-backend -- run start:dev

# 查看服务状态
pm2 status

# 查看日志
pm2 logs vioflow-backend

# 停止服务
pm2 stop vioflow-backend

# 重启服务
pm2 restart vioflow-backend
```

### 方法 3: 使用 nohup（简单后台运行）

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
nohup npm run start:dev > backend.log 2>&1 &
```

## 验证服务运行

启动后，你应该看到：

```
📌 数据库连接: Supabase
   Host: aws-0-us-west-2.pooler.supabase.com:5432
   Database: postgres
   Username: postgres.bejrwnamnxxdxoqwoxag
✓ 后端服务已启动
✓ API地址: http://localhost:3002
✓ 前端地址: http://localhost:3009
```

## 测试连接

在浏览器中访问：
- 健康检查: http://localhost:3002/health
- API 健康检查: http://localhost:3002/api/health

应该返回 JSON 响应，包含数据库连接状态。

## 常见问题

### Q: 端口 3002 已被占用？

A: 检查并停止占用端口的进程：
```bash
lsof -ti:3002 | xargs kill -9
```

### Q: 数据库连接失败？

A: 检查 `.env` 文件中的 `DATABASE_URL` 是否正确，密码是否正确。

### Q: CORS 错误？

A: 确保 `.env` 文件中的 `CORS_ORIGIN` 配置为 `http://localhost:3009`。

## 下一步

启动后端服务后，前端应该能够正常连接到 API。


