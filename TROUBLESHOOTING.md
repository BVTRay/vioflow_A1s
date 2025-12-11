# 前后端连接问题排查指南

## 问题诊断结果

根据数据库检查，**种子数据已经成功插入**：
- ✅ 5 个用户
- ✅ 5 个项目
- ✅ 4 个视频
- ✅ 8 个标签
- ✅ 3 个项目成员
- ✅ 5 个交付
- ✅ 2 个通知

**数据在数据库中，但前端看不到，可能是以下原因：**

## 排查步骤

### 1. 检查后端服务是否运行

```bash
cd backend
npm run start:dev
```

后端应该在 `http://localhost:3002` 启动。

### 2. 测试后端 API

运行测试脚本：

```bash
cd backend
./test-api.sh
```

或者手动测试：

```bash
# 1. 测试健康检查
curl http://localhost:3002/health

# 2. 测试登录
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@vioflow.com","password":"admin"}'

# 3. 使用返回的 token 测试 API
TOKEN="你的token"
curl http://localhost:3002/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 检查前端 API 配置

确认 `src/api/client.ts` 中的 API 地址：

- **本地开发**：应该是 `http://localhost:3002/api`
- **生产环境**：应该是你的 Railway 后端地址

检查浏览器控制台（F12）：
1. 打开 **Network** 标签页
2. 查看 API 请求是否发送
3. 检查请求的 URL 是否正确
4. 查看响应状态码和内容

### 4. 检查用户是否已登录

后端 API 需要 JWT 认证。确保：

1. **用户已登录**：前端应该保存了 `auth_token` 在 localStorage
2. **Token 有效**：检查 token 是否过期
3. **请求头包含 Token**：在 Network 标签页查看请求头是否包含 `Authorization: Bearer <token>`

### 5. 检查 CORS 配置

如果看到 CORS 错误，检查后端 `src/main.ts` 中的 CORS 配置：

```typescript
// 应该包含你的前端地址
CORS_ORIGIN=http://localhost:3009,https://a1s.vioflow.cc
```

### 6. 检查浏览器控制台错误

打开浏览器开发者工具（F12），查看：

- **Console** 标签页：是否有 JavaScript 错误
- **Network** 标签页：API 请求的状态和响应
- **Application** → **Local Storage**：是否有 `auth_token`

## 常见问题

### 问题 1：API 请求返回 401 Unauthorized

**原因**：用户未登录或 token 无效

**解决**：
1. 重新登录
2. 检查 token 是否在 localStorage 中
3. 检查后端 JWT_SECRET 配置

### 问题 2：API 请求返回 404 Not Found

**原因**：API 路径错误或后端路由未注册

**解决**：
1. 检查 API 路径是否正确（应该是 `/api/projects` 而不是 `/projects`）
2. 检查后端模块是否正确导入到 `app.module.ts`

### 问题 3：API 请求返回 500 Internal Server Error

**原因**：后端服务器错误

**解决**：
1. 查看后端日志
2. 检查数据库连接
3. 运行 `npm run check-db` 检查数据库状态

### 问题 4：前端显示空白或加载中

**原因**：API 请求失败或数据格式不匹配

**解决**：
1. 检查浏览器 Network 标签页
2. 查看 API 响应数据格式
3. 检查前端代码中的数据处理逻辑

## 快速验证清单

- [ ] 后端服务正在运行（`http://localhost:3002`）
- [ ] 数据库连接正常（运行 `npm run check-db`）
- [ ] 可以成功登录（获取 token）
- [ ] API 请求包含正确的 Authorization 头
- [ ] 浏览器控制台没有错误
- [ ] Network 标签页显示 API 请求成功
- [ ] 前端 API 地址配置正确

## 下一步

如果以上都正常，但前端仍看不到数据：

1. **检查前端组件**：查看 `useApiData` hook 是否正确使用
2. **检查数据渲染**：查看组件是否正确显示数据
3. **添加调试日志**：在 `useApiData.ts` 中添加 `console.log` 查看数据

