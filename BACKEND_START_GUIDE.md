# 后端服务启动指南

## 问题诊断

### 发现的问题
1. ✅ **循环依赖已修复** - 使用 `forwardRef` 解决
2. ⚠️ **端口被占用** - 可能有旧的服务实例在运行

## 启动步骤

### 1. 停止所有现有服务
```bash
# 停止所有 nest 进程
pkill -f "nest start"

# 停止所有 node dist/main 进程（生产模式）
ps aux | grep "node.*dist/main" | grep -v grep | awk '{print $2}' | xargs kill -9

# 检查端口是否空闲
lsof -i :3002
# 应该没有输出
```

### 2. 启动后端服务
```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
npm run start:dev
```

### 3. 验证服务启动
```bash
# 检查健康端点
curl http://192.168.110.112:3002/health

# 或
curl http://localhost:3002/health

# 应该返回：
# {"status":"ok","timestamp":"...","environment":"development","services":{"database":"connected"}}
```

### 4. 检查端口监听
```bash
lsof -i :3002
# 或
netstat -tlnp | grep 3002
# 应该显示服务正在监听
```

## 常见问题

### 问题1: 端口被占用
**错误**: `EADDRINUSE: address already in use 0.0.0.0:3002`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3002
# 或
fuser 3002/tcp

# 停止进程
kill -9 <PID>
```

### 问题2: 循环依赖错误
**错误**: `The module at index [1] of the AnnotationsModule "imports" array is undefined`

**状态**: ✅ **已修复** - 使用 `forwardRef` 解决

### 问题3: Redis 连接失败
**错误**: 队列相关错误

**解决**:
```bash
# 检查 Redis 是否运行
redis-cli ping
# 应该返回: PONG

# 如果未运行，启动 Redis
sudo systemctl start redis
# 或
redis-server
```

### 问题4: 数据库连接失败
**错误**: 数据库相关错误

**检查**:
```bash
# 检查 .env 文件中的 DATABASE_URL
cd backend
cat .env | grep DATABASE_URL
```

## 生产环境启动

### 使用 PM2（推荐）
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd backend
pm2 start npm --name "vioflow-backend" -- run start:dev

# 查看日志
pm2 logs vioflow-backend

# 查看状态
pm2 status
```

### 使用 systemd（可选）
创建服务文件 `/etc/systemd/system/vioflow-backend.service`:
```ini
[Unit]
Description=Vioflow Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/www/wwwroot/vioflow-A/vioflow_A1s-1/backend
ExecStart=/usr/bin/npm run start:dev
Restart=always

[Install]
WantedBy=multi-user.target
```

然后：
```bash
sudo systemctl daemon-reload
sudo systemctl enable vioflow-backend
sudo systemctl start vioflow-backend
sudo systemctl status vioflow-backend
```

## 验证清单

启动后检查：
- [ ] 服务进程正在运行
- [ ] 端口3002正在监听
- [ ] 健康检查端点返回成功
- [ ] 数据库连接正常
- [ ] Redis连接正常（如果使用队列）
- [ ] 前端可以连接到API

## 下一步

1. **启动后端服务**（参考上方步骤）
2. **测试前端连接**：
   - 刷新浏览器
   - 尝试登录
   - 检查网络请求是否成功

3. **如果仍有问题**：
   - 查看后端日志
   - 检查环境变量配置
   - 验证数据库和Redis连接


