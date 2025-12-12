# 登录问题排查和修复指南

## 问题：部署后无法登录

如果推送到 GitHub 并在 Railway 和 Vercel 部署后无法登录，请按照以下步骤排查：

## 第一步：检查 Vercel 环境变量

### 1.1 登录 Vercel

1. 访问 https://vercel.com
2. 登录你的账号
3. 进入你的项目

### 1.2 检查环境变量

**位置**：项目 → Settings → Environment Variables

**必须配置的环境变量**：

```
VITE_API_BASE_URL=https://你的railway域名.railway.app/api
```

**如何获取 Railway 域名**：

1. 登录 Railway (https://railway.app)
2. 进入你的后端项目
3. 在服务设置中，找到 **Networking** 或 **Settings** → **Networking**
4. 你会看到一个域名，例如：`vioflowa1s-production.up.railway.app`
5. 你的 API 地址就是：`https://vioflowa1s-production.up.railway.app/api`

**⚠️ 重要**：
- 环境变量名称必须以 `VITE_` 开头
- 确保选择了所有环境（Production、Preview、Development）
- 修改环境变量后，**必须重新部署**才能生效

### 1.3 重新部署

配置完环境变量后：

1. 在 Vercel 项目页面
2. 点击 **Deployments** 标签页
3. 找到最新的部署，点击右侧的 **⋯** 菜单
4. 选择 **Redeploy**
5. 等待部署完成

## 第二步：检查 Railway 环境变量

### 2.1 登录 Railway

1. 访问 https://railway.app
2. 登录你的账号
3. 进入你的后端项目

### 2.2 检查环境变量

**位置**：项目 → Variables 标签页

**必须配置的环境变量**：

```env
# 数据库配置
DATABASE_URL=postgresql://...

# 应用配置
PORT=3000
NODE_ENV=production

# CORS 配置（重要！）
CORS_ORIGIN=https://你的vercel域名.vercel.app,https://a1s.vioflow.cc

# Supabase 配置
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
SUPABASE_STORAGE_BUCKET=videos
```

**⚠️ 重要**：
- `CORS_ORIGIN` 必须包含你的 Vercel 域名
- 多个域名用逗号分隔
- 确保包含所有可能的前端域名（包括预览域名）

### 2.3 检查服务状态

1. 在 Railway 项目页面
2. 检查服务是否正在运行（绿色状态）
3. 查看日志，确认没有错误

## 第三步：浏览器调试

### 3.1 打开开发者工具

1. 访问你的 Vercel 部署地址
2. 按 `F12` 打开开发者工具
3. 切换到 **Console** 标签页

### 3.2 检查 API 地址

在控制台中，你应该看到：

```
🌐 API Base URL: https://你的railway域名.railway.app/api
🌐 Environment: production
🌐 VITE_API_BASE_URL: https://你的railway域名.railway.app/api
```

**如果看到**：
- `API Base URL: https://api.vioflow.cc/api` → 说明环境变量未配置
- `VITE_API_BASE_URL: 未设置` → 说明环境变量未配置
- `API Base URL: http://localhost:3002/api` → 说明构建时使用了开发环境

### 3.3 检查网络请求

1. 切换到 **Network** 标签页
2. 尝试登录
3. 查看登录请求（`/auth/login`）

**检查点**：
- 请求 URL 应该是：`https://你的railway域名.railway.app/api/auth/login`
- 如果看到 Supabase URL，说明配置错误
- 查看响应状态码：
  - `200` → 成功
  - `401` → 认证失败（用户名或密码错误）
  - `403` → CORS 问题
  - `404` → API 地址错误
  - `500` → 服务器错误

### 3.4 检查错误信息

在控制台中查看错误信息：

**常见错误**：

1. **CORS 错误**：
   ```
   Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy
   ```
   - **解决方案**：检查 Railway 的 `CORS_ORIGIN` 环境变量，确保包含 Vercel 域名

2. **网络错误**：
   ```
   Network Error
   Failed to fetch
   ```
   - **解决方案**：检查 Railway 服务是否运行，API 地址是否正确

3. **401 错误**：
   ```
   401 Unauthorized
   ```
   - **解决方案**：检查用户名和密码是否正确，检查后端认证逻辑

## 第四步：验证配置

### 4.1 验证 Vercel 配置

在浏览器控制台运行：

```javascript
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

应该输出你的 Railway API 地址。

### 4.2 验证 Railway 配置

在 Railway 日志中，应该看到：

```
CORS 允许的域名: [...]
✓ 后端服务已启动
✓ API地址: http://localhost:3000
```

### 4.3 测试 API 连接

在浏览器控制台运行：

```javascript
fetch('https://你的railway域名.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

如果成功，说明 API 可访问。

## 第五步：常见问题解决

### 问题 1：环境变量已配置但未生效

**原因**：修改环境变量后没有重新部署

**解决方案**：
1. 在 Vercel 中重新部署项目
2. 清除浏览器缓存
3. 使用无痕模式测试

### 问题 2：CORS 错误

**原因**：Railway 的 `CORS_ORIGIN` 没有包含 Vercel 域名

**解决方案**：
1. 在 Railway 环境变量中，更新 `CORS_ORIGIN`
2. 确保包含所有 Vercel 域名（包括预览域名）
3. 格式：`https://domain1.vercel.app,https://domain2.vercel.app`
4. 重启 Railway 服务

### 问题 3：API 地址错误

**原因**：Vercel 的 `VITE_API_BASE_URL` 配置错误

**解决方案**：
1. 检查 Railway 域名是否正确
2. 确保 API 地址格式：`https://域名.railway.app/api`（注意 `/api` 后缀）
3. 重新部署 Vercel 项目

### 问题 4：登录请求返回 401

**原因**：用户名或密码错误，或后端认证逻辑问题

**解决方案**：
1. 检查用户名和密码是否正确
2. 查看 Railway 日志，确认后端是否收到请求
3. 检查后端认证逻辑

## 快速检查清单

- [ ] Vercel 环境变量 `VITE_API_BASE_URL` 已配置
- [ ] Vercel 环境变量已应用到所有环境（Production、Preview）
- [ ] Vercel 项目已重新部署
- [ ] Railway 环境变量 `CORS_ORIGIN` 已配置
- [ ] Railway 环境变量包含 Vercel 域名
- [ ] Railway 服务正在运行
- [ ] 浏览器控制台显示正确的 API 地址
- [ ] 网络请求发送到正确的 Railway 地址
- [ ] 没有 CORS 错误
- [ ] 登录请求返回 200 状态码

## 需要帮助？

如果按照以上步骤仍然无法解决问题，请：

1. 收集以下信息：
   - Vercel 部署日志
   - Railway 服务日志
   - 浏览器控制台错误信息
   - 网络请求详情（Network 标签页）

2. 检查文档：
   - `docs/setup/VERCEL_SETUP.md`
   - `docs/setup/RAILWAY_SUPABASE_DEPLOY.md`
   - `docs/troubleshooting/VERCEL_TROUBLESHOOTING.md`

