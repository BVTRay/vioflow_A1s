# API 配置问题修复总结

## 问题诊断

### 发现的问题
1. **后端服务未在3002端口监听**
   - 配置端口：3002
   - 实际状态：端口未监听
   - 前端地址：`http://192.168.110.112:3009` ✅ 正常运行
   - API地址：`http://192.168.110.112:3002/api` ❌ 无法连接

2. **多处硬编码IP地址**
   - `src/api/shares.ts` - 3处硬编码 `192.168.110.112`
   - `src/api/annotations.ts` - 2处硬编码 `192.168.110.112`
   - `src/components/Share/SharePage.tsx` - 1处硬编码 `192.168.110.112`

3. **API地址获取逻辑不统一**
   - 不同文件中有重复的API地址获取逻辑
   - 应该统一使用 `getApiBaseUrl()` 函数

## 已完成的修复

### ✅ 1. 统一API地址获取逻辑

**修改文件**：
- `src/api/client.ts` - 优化 `getApiBaseUrl()` 函数，确保正确导出
- `src/api/shares.ts` - 移除所有硬编码IP，统一使用 `getApiBaseUrl()`
- `src/api/annotations.ts` - 移除所有硬编码IP，统一使用 `getApiBaseUrl()`
- `src/components/Share/SharePage.tsx` - 移除硬编码IP，使用 `getApiBaseUrl()`

**改进**：
- 所有API地址现在统一通过 `getApiBaseUrl()` 函数获取
- 开发环境自动推断（基于当前hostname）
- 生产环境强制要求配置 `VITE_API_BASE_URL`
- 不再有硬编码的IP地址

### ✅ 2. 代码优化

**改进点**：
- 移除了重复的API地址获取逻辑
- 统一了错误处理
- 改进了类型安全（添加返回类型注解）

## 待解决的问题

### 🔴 后端服务未启动（需要手动处理）

**症状**：
- 端口3002未监听
- 后端进程存在但服务未正常启动

**可能原因**：
1. 服务启动失败（检查启动日志）
2. 端口被占用
3. 数据库连接失败
4. 环境变量缺失

**解决步骤**：
```bash
# 1. 检查后端服务状态
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
ps aux | grep nest

# 2. 查看启动日志
# 检查控制台输出或日志文件

# 3. 重启后端服务
pkill -f "nest start"
npm run start:dev

# 4. 验证服务启动
curl http://localhost:3002/api/health
# 或
curl http://192.168.110.112:3002/api/health
```

**详细诊断指南**：参考 `BACKEND_SERVICE_DIAGNOSIS.md`

## 验证修复

### 1. 检查代码修复
```bash
# 确认没有硬编码IP
grep -r "192.168.110.112" src/ --include="*.ts" --include="*.tsx"
# 应该没有结果（除了文档和注释）
```

### 2. 检查API配置
- 打开浏览器控制台
- 查看 `🌐 API Base URL:` 日志
- 确认地址正确（应该是 `http://192.168.110.112:3002/api`）

### 3. 测试连接
- 启动后端服务后
- 尝试登录
- 检查网络请求是否成功

## 配置说明

### 环境变量（推荐）
在项目根目录创建 `.env.local` 文件：
```env
VITE_API_BASE_URL=http://192.168.110.112:3002/api
```

### 开发环境自动推断
如果没有设置 `VITE_API_BASE_URL`：
- `localhost` → `http://localhost:3002/api`
- `127.0.0.1` → `http://localhost:3002/api`
- `192.168.110.112` → `http://192.168.110.112:3002/api`
- 其他内网IP → `http://${hostname}:3002/api`

### 生产环境
**必须**设置 `VITE_API_BASE_URL` 环境变量，否则会抛出错误。

## 修复文件清单

1. ✅ `src/api/client.ts` - 优化 `getApiBaseUrl()` 函数
2. ✅ `src/api/shares.ts` - 移除3处硬编码IP
3. ✅ `src/api/annotations.ts` - 移除2处硬编码IP
4. ✅ `src/components/Share/SharePage.tsx` - 移除1处硬编码IP

## 下一步

1. **立即**：启动后端服务（参考 `BACKEND_SERVICE_DIAGNOSIS.md`）
2. **验证**：测试登录功能
3. **配置**：设置 `VITE_API_BASE_URL` 环境变量（推荐）

## 注意事项

- ✅ 所有硬编码IP已移除
- ✅ API地址获取逻辑已统一
- ⚠️ 后端服务需要手动启动
- ⚠️ 生产环境必须配置 `VITE_API_BASE_URL`









