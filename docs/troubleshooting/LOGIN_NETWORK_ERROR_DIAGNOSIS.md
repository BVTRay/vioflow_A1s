# 登录网络错误诊断报告

## 问题症状
- 前端错误：`ERR_CONNECTION_REFUSED`
- API地址：`http://192.168.110.112:3002/api/auth/login`
- 前端运行在：`http://192.168.110.112:3009`

## 诊断结果

### 当前状态
1. ✅ 前端服务正常运行（端口3009）
2. ❌ 后端服务进程存在但**未监听端口3002**
3. ❌ 后端API无法访问

### 发现的进程
- 进程1：`node dist/main` (PID: 962748) - 生产模式，但未监听端口
- 进程2：`nest start --watch` (PID: 2982793) - 开发模式，但未监听端口

### 可能的原因
1. **服务启动失败**：虽然进程在运行，但可能在启动过程中遇到错误（数据库连接失败、Redis连接失败等）
2. **端口冲突**：端口3002可能被其他进程占用
3. **启动不完整**：服务可能卡在启动的某个阶段

## 解决方案

### 方案1：检查并重启后端服务（推荐）

```bash
# 1. 停止所有后端进程
pkill -f "nest start"
pkill -f "node dist/main"

# 2. 确认端口已释放
lsof -i :3002
# 应该没有输出

# 3. 进入后端目录
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend

# 4. 启动开发模式服务
npm run start:dev
```

### 方案2：检查启动日志

如果服务启动失败，查看错误信息：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
npm run start:dev 2>&1 | tee backend-start.log
```

常见错误：
- 数据库连接失败：检查 `DATABASE_URL` 是否正确
- Redis连接失败：检查 Redis 是否运行 `redis-cli ping`
- 端口被占用：使用 `lsof -i :3002` 查找占用进程

### 方案3：使用PM2管理（推荐生产环境）

```bash
# 安装PM2（如果未安装）
npm install -g pm2

# 停止所有后端进程
pkill -f "nest start"
pkill -f "node dist/main"

# 使用PM2启动
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
pm2 start npm --name "vioflow-backend" -- run start:dev

# 查看日志
pm2 logs vioflow-backend

# 查看状态
pm2 status
```

## 验证修复

启动服务后，验证：

```bash
# 1. 检查端口监听
lsof -i :3002
# 应该显示服务正在监听

# 2. 测试健康检查
curl http://192.168.110.112:3002/api/health
# 应该返回JSON响应

# 3. 测试登录接口
curl -X POST http://192.168.110.112:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://192.168.110.112:3009" \
  -d '{"username":"jeff@bugong.com","password":"your_password"}'
```

## 预期结果

服务成功启动后，应该看到：

```
✓ 后端服务已启动
✓ API地址: http://192.168.110.112:3002
✓ 前端地址: http://192.168.110.112:3009
```

然后前端登录应该可以正常工作。


