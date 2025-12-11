# Vercel 部署配置指南

## 在 Vercel 中需要进行的操作

### 第一步：连接 GitHub 仓库（如果还没连接）

1. 访问 https://vercel.com
2. 登录你的账号
3. 点击 "Add New..." → "Project"
4. 选择你的 GitHub 仓库：`BVTRay/vioflow_A1s`
5. 点击 "Import"

### 第二步：配置项目设置

#### 2.1 基本配置

在项目导入页面或项目设置中：

- **Framework Preset**: Vite（Vercel 会自动检测）
- **Root Directory**: 留空（项目在根目录）
- **Build Command**: `npm run build`（默认，通常不需要修改）
- **Output Directory**: `dist`（Vite 默认输出目录）
- **Install Command**: `npm install`（默认）

#### 2.2 环境变量配置（重要！）

1. 在项目设置页面，点击 **Settings** 标签页
2. 找到 **Environment Variables** 部分
3. 点击 **Add** 添加以下环境变量：

##### 必需的环境变量

```
VITE_API_BASE_URL=https://你的railway域名.railway.app/api
```

**示例**：
```
VITE_API_BASE_URL=https://vioflow-backend.railway.app/api
```

##### 如何获取 Railway 域名

1. 登录 Railway (https://railway.app)
2. 进入你的后端项目
3. 在服务设置中，找到 **Networking** 或 **Settings** → **Networking**
4. 你会看到一个域名，例如：`vioflow-backend-production.up.railway.app`
5. 你的 API 地址就是：`https://vioflow-backend-production.up.railway.app/api`

#### 2.3 环境变量作用域

确保环境变量应用到所有环境：
- ✅ **Production**（生产环境）
- ✅ **Preview**（预览环境）
- ✅ **Development**（开发环境，如果需要）

### 第三步：部署

#### 3.1 首次部署

1. 配置完环境变量后，点击 **Deploy**
2. Vercel 会自动：
   - 安装依赖
   - 构建项目
   - 部署到生产环境

#### 3.2 自动部署

配置完成后，每次推送到 GitHub 的 `main` 分支，Vercel 会自动：
- 检测代码变更
- 重新构建
- 部署新版本

### 第四步：验证部署

#### 4.1 检查部署状态

1. 在 Vercel 项目页面，查看 **Deployments** 标签页
2. 确认最新部署状态为 **Ready**（绿色）

#### 4.2 测试网站

1. 访问 Vercel 提供的域名（例如：`https://a1s.vioflow.cc`）
2. 测试登录功能
3. 检查是否能正常调用后端 API

#### 4.3 检查环境变量

如果遇到 API 连接问题：

1. 在 Vercel 项目设置中，确认环境变量已正确配置
2. 检查环境变量的值是否正确（特别是 Railway 域名）
3. 重新部署项目（环境变量修改后需要重新部署）

### 第五步：自定义域名（可选）

如果你有自己的域名：

1. 在 Vercel 项目设置中，点击 **Domains**
2. 添加你的域名：`a1s.vioflow.cc`
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效（通常几分钟到几小时）

## 常见问题排查

### Q: 前端无法连接到后端 API

**检查清单**：
1. ✅ `VITE_API_BASE_URL` 环境变量是否已配置
2. ✅ Railway 后端服务是否正常运行
3. ✅ Railway 域名是否正确
4. ✅ 环境变量是否应用到 Production 环境
5. ✅ 是否已重新部署（修改环境变量后需要重新部署）

**调试方法**：
1. 在浏览器控制台查看网络请求
2. 检查请求的 URL 是否正确
3. 检查是否有 CORS 错误

### Q: 部署失败

**可能原因**：
1. 构建命令错误
2. 依赖安装失败
3. TypeScript 编译错误

**解决方法**：
1. 查看 Vercel 部署日志
2. 在本地运行 `npm run build` 测试构建
3. 修复构建错误后重新推送代码

### Q: 环境变量不生效

**解决方法**：
1. 确认环境变量名称以 `VITE_` 开头（Vite 要求）
2. 确认环境变量已应用到正确的环境（Production/Preview）
3. 重新部署项目（环境变量修改后必须重新部署）

### Q: 页面刷新后 404

**解决方法**：
- 已通过 `vercel.json` 配置了 rewrites 规则，应该已解决
- 如果仍有问题，检查 `vercel.json` 是否正确

## 环境变量参考

### 生产环境

```env
VITE_API_BASE_URL=https://你的railway域名.railway.app/api
```

### 开发环境（本地）

在项目根目录创建 `.env.local` 文件：

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

**注意**：`.env.local` 文件不要提交到 Git（已在 .gitignore 中）

## 部署流程总结

1. ✅ 连接 GitHub 仓库到 Vercel
2. ✅ 配置项目设置（Framework、Build Command 等）
3. ✅ 添加环境变量 `VITE_API_BASE_URL`
4. ✅ 部署项目
5. ✅ 验证部署是否成功
6. ✅ 测试功能（登录、API 调用等）

## 后续维护

### 更新代码

1. 在本地修改代码
2. 提交到 GitHub：`git push origin main`
3. Vercel 自动检测并部署

### 更新环境变量

1. 在 Vercel 项目设置中修改环境变量
2. 点击 **Save**
3. Vercel 会自动触发重新部署

### 查看日志

1. 在 Vercel 项目页面，点击 **Deployments**
2. 选择最新的部署
3. 查看构建日志和运行时日志

## 需要帮助？

如果遇到问题：
1. 查看 Vercel 部署日志
2. 检查浏览器控制台错误
3. 验证环境变量配置
4. 确认 Railway 后端服务正常运行

祝你部署顺利！🎉

