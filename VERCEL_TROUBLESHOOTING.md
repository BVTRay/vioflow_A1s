# Vercel 部署问题排查指南

## 问题：登录时调用 Supabase API 而不是后端 API

如果遇到错误：`POST https://xxx.supabase.co/auth/v1/token?grant_type=password 400 (Bad Request)`

### 可能的原因

1. **Vercel 环境变量配置错误**
   - 检查是否误配置了 `VITE_SUPABASE_URL` 或其他 Supabase 相关变量
   - 确保只配置了 `VITE_API_BASE_URL`，指向 Railway 后端

2. **浏览器缓存了旧的代码**
   - 清除浏览器缓存
   - 使用无痕模式测试
   - 强制刷新（Ctrl+Shift+R 或 Cmd+Shift+R）

3. **构建时使用了错误的环境变量**
   - 检查 Vercel 项目设置中的环境变量
   - 确保生产环境变量正确

### 解决方案

#### 1. 检查 Vercel 环境变量

在 Vercel 项目设置中，确保配置了：

```env
VITE_API_BASE_URL=https://vioflowa1s-production.up.railway.app/api
```

**不要配置**：
- ❌ `VITE_SUPABASE_URL`
- ❌ `VITE_SUPABASE_ANON_KEY`
- ❌ 任何 Supabase 相关的前端环境变量

#### 2. 清除浏览器缓存

1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
4. 或者使用无痕模式测试

#### 3. 检查网络请求

在浏览器开发者工具的 Network 标签页中：
1. 查看登录请求的实际 URL
2. 确认请求是否发送到正确的 Railway 地址
3. 如果看到 Supabase URL，说明配置有问题

#### 4. 重新部署

1. 在 Vercel 项目页面
2. 点击 "Deployments"
3. 找到最新的部署
4. 点击 "Redeploy"
5. 确保使用正确的环境变量

### 正确的环境变量配置

#### Vercel 环境变量（前端）

```env
VITE_API_BASE_URL=https://你的railway域名.railway.app/api
```

#### Railway 环境变量（后端）

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
SUPABASE_STORAGE_BUCKET=videos
CORS_ORIGIN=https://你的vercel域名.vercel.app,https://a1s.vioflow.cc
NODE_ENV=production
PORT=3000
```

### 验证步骤

1. **检查前端 API 配置**
   - 打开浏览器控制台
   - 查看是否有 "API Base URL" 日志
   - 确认 URL 指向 Railway，不是 Supabase

2. **检查网络请求**
   - 打开 Network 标签页
   - 尝试登录
   - 查看请求 URL 是否正确

3. **检查后端日志**
   - 在 Railway 中查看部署日志
   - 确认是否有登录请求到达后端

### 如果问题仍然存在

1. 检查 Vercel 构建日志，确认环境变量是否正确注入
2. 检查浏览器控制台，查看是否有错误信息
3. 检查 Railway 日志，确认后端是否正常运行
4. 尝试在本地构建并测试，确认代码本身没有问题

