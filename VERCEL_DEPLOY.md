# Vercel 部署配置说明

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

### 前端环境变量（Vercel）

1. 进入 Vercel 项目设置
2. 找到 "Environment Variables" 选项
3. 添加以下变量：

```
VITE_API_BASE_URL=https://你的后端API地址/api
```

例如：
```
VITE_API_BASE_URL=https://api.vioflow.cc/api
```

### 后端环境变量（后端服务器）

在后端服务器的 `.env` 文件中配置：

```env
# CORS 允许的域名（用逗号分隔多个域名）
CORS_ORIGIN=https://a1s.vioflow.cc,http://localhost:3009

# 后端服务端口
PORT=3000
```

## 常见问题

### 1. CORS 错误

如果遇到 CORS 错误，确保：
- 后端 `.env` 中的 `CORS_ORIGIN` 包含你的 Vercel 域名
- 后端服务已重启以加载新的环境变量

### 2. API 地址错误

确保在 Vercel 中设置了 `VITE_API_BASE_URL` 环境变量，指向你的后端 API 地址。

### 3. Tailwind CSS 警告

这是开发警告，不影响功能。如需移除警告，可以：
- 安装 Tailwind CSS：`npm install -D tailwindcss postcss autoprefixer`
- 配置 Tailwind CSS（参考官方文档）

### 4. index.css 404 错误

已移除对不存在的 `index.css` 的引用，此错误应该已解决。

## 部署步骤

1. 确保代码已推送到 GitHub
2. 在 Vercel 中配置环境变量
3. 重新部署项目
4. 确保后端服务已配置正确的 CORS 设置

