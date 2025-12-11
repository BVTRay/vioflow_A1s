# Vercel 部署检查清单

## ✅ 在 Vercel 中需要完成的操作

### 1. 环境变量配置（最重要！）

**位置**：Vercel 项目 → Settings → Environment Variables

**添加以下环境变量**：

```
VITE_API_BASE_URL=https://你的railway域名.railway.app/api
```

**步骤**：
1. 登录 Vercel (https://vercel.com)
2. 进入你的项目
3. 点击 **Settings** → **Environment Variables**
4. 点击 **Add** 按钮
5. 填写：
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://你的railway域名.railway.app/api`
   - **Environment**: 选择所有环境（Production、Preview、Development）
6. 点击 **Save**

**⚠️ 重要**：
- 环境变量名称必须以 `VITE_` 开头（Vite 的要求）
- 修改环境变量后，需要重新部署项目才能生效
- 确保 Railway 后端已部署并获取到域名

### 2. 验证项目设置

**位置**：Vercel 项目 → Settings → General

检查以下设置：

- ✅ **Framework Preset**: Vite（自动检测）
- ✅ **Root Directory**: 留空（项目在根目录）
- ✅ **Build Command**: `npm run build`
- ✅ **Output Directory**: `dist`
- ✅ **Install Command**: `npm install`

通常 Vercel 会自动检测，无需手动修改。

### 3. 重新部署

**位置**：Vercel 项目 → Deployments

1. 配置完环境变量后
2. 点击 **Deployments** 标签页
3. 找到最新的部署，点击右侧的 **⋯** 菜单
4. 选择 **Redeploy**
5. 或者直接推送代码到 GitHub，Vercel 会自动部署

### 4. 验证部署

#### 检查部署状态
- 在 **Deployments** 页面，确认最新部署状态为 **Ready**（绿色）

#### 测试功能
1. 访问你的 Vercel 域名（例如：`https://a1s.vioflow.cc`）
2. 测试登录功能
3. 打开浏览器开发者工具（F12）
4. 查看 **Network** 标签页，确认 API 请求是否成功

### 5. 检查日志（如果遇到问题）

**位置**：Vercel 项目 → Deployments → 选择部署 → View Function Logs

查看：
- 构建日志（Build Logs）
- 运行时日志（Runtime Logs）

## 快速检查清单

- [ ] 已在 Vercel 中添加 `VITE_API_BASE_URL` 环境变量
- [ ] 环境变量值指向正确的 Railway 后端地址
- [ ] 环境变量已应用到 Production 环境
- [ ] 已重新部署项目（修改环境变量后）
- [ ] Railway 后端服务正常运行
- [ ] 前端可以正常访问
- [ ] 登录功能正常工作
- [ ] API 请求可以正常发送

## 常见问题

### ❌ 问题：前端显示 "Failed to fetch" 或网络错误

**原因**：环境变量未配置或配置错误

**解决**：
1. 检查 `VITE_API_BASE_URL` 是否已配置
2. 检查值是否正确（包含 `https://` 和 `/api`）
3. 重新部署项目

### ❌ 问题：CORS 错误

**原因**：后端 CORS 配置未包含 Vercel 域名

**解决**：
1. 在 Railway 后端环境变量中，确保 `CORS_ORIGIN` 包含你的 Vercel 域名
2. 重启 Railway 后端服务

### ❌ 问题：环境变量不生效

**原因**：环境变量修改后未重新部署

**解决**：
1. 修改环境变量后，必须重新部署
2. 在 Deployments 页面点击 **Redeploy**

## 完成后的验证

部署完成后，你应该能够：

1. ✅ 访问前端网站
2. ✅ 看到登录页面
3. ✅ 使用测试账号登录
4. ✅ 正常使用所有功能
5. ✅ API 请求成功（在浏览器 Network 标签页查看）

## 需要帮助？

如果遇到问题，按以下顺序检查：

1. **Vercel 环境变量**：是否正确配置
2. **Railway 后端**：是否正常运行
3. **浏览器控制台**：查看具体错误信息
4. **网络请求**：检查 API 请求的 URL 和响应

祝你部署成功！🎉

