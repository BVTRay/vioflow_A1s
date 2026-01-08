# API 配置问题修复报告

## 问题分析

### 发现的问题
1. **后端服务未在3002端口监听**
   - 配置的端口是3002，但实际没有服务监听
   - 可能原因：服务启动失败、端口被占用、配置错误

2. **多处硬编码IP地址**
   - `src/api/shares.ts` - 3处硬编码 `192.168.110.112`
   - `src/api/annotations.ts` - 2处硬编码 `192.168.110.112`
   - `src/components/Share/SharePage.tsx` - 1处硬编码 `192.168.110.112`

3. **API地址获取逻辑不统一**
   - 不同文件中有重复的API地址获取逻辑
   - 应该统一使用 `getApiBaseUrl()` 函数

## 修复内容

### 1. 统一API地址获取逻辑
- ✅ 修复 `src/api/client.ts` - 优化 `getApiBaseUrl()` 函数
- ✅ 修复 `src/api/shares.ts` - 移除硬编码IP，使用 `getApiBaseUrl()`
- ✅ 修复 `src/api/annotations.ts` - 移除硬编码IP，使用 `getApiBaseUrl()`
- ✅ 修复 `src/components/Share/SharePage.tsx` - 移除硬编码IP，使用 `getApiBaseUrl()`

### 2. 后端服务检查
需要检查后端服务是否正常运行：
```bash
# 检查后端服务状态
cd backend
npm run start:dev

# 或检查进程
ps aux | grep nest

# 检查端口
netstat -tlnp | grep 3002
```

## 使用说明

### 环境变量配置
在 `.env` 或 `.env.local` 文件中设置：
```env
VITE_API_BASE_URL=http://192.168.110.112:3002/api
```

### 开发环境自动推断
如果没有设置 `VITE_API_BASE_URL`，开发环境会自动：
- 如果 hostname 是 `localhost` 或 `127.0.0.1`，使用 `http://localhost:3002/api`
- 如果 hostname 是内网IP（如 `192.168.110.112`），使用 `http://${hostname}:3002/api`

### 生产环境
生产环境**必须**设置 `VITE_API_BASE_URL` 环境变量，否则会抛出错误。

## 验证步骤

1. **检查后端服务**
   ```bash
   curl http://192.168.110.112:3002/api/health
   ```

2. **检查前端API配置**
   - 打开浏览器控制台
   - 查看 `🌐 API Base URL:` 日志
   - 确认地址正确

3. **测试登录**
   - 尝试登录
   - 检查网络请求是否成功

## 注意事项

- 所有API地址现在统一通过 `getApiBaseUrl()` 函数获取
- 不再有硬编码的IP地址
- 开发环境会自动推断，生产环境必须配置环境变量









