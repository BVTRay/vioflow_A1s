# 分享链接功能配置说明

## 功能概述

已实现完整的对外分享链接功能，包括：
- 创建分享链接（支持密码保护、下载权限、过期时间）
- 公开分享页面（响应式布局，适配各种设备）
- 密码验证
- 视频播放
- 下载功能（如果允许）

## 配置步骤

### 1. 配置分享域名

分享链接需要配置域名才能正常访问。有两种方式：

#### 方式一：使用环境变量（推荐）

在前端项目的 `.env` 或 `.env.production` 文件中添加：

```bash
VITE_SHARE_DOMAIN=https://your-domain.com
```

例如：
```bash
VITE_SHARE_DOMAIN=https://vioflow.io
```

#### 方式二：使用默认域名

如果不配置 `VITE_SHARE_DOMAIN`，系统会使用当前访问的域名（`window.location.origin`）。

### 2. 后端API配置

确保后端API地址配置正确：

```bash
VITE_API_BASE_URL=https://api.vioflow.cc/api
```

### 3. 路由配置

分享页面的路由已自动配置为：`/share/:token`

访问示例：
```
https://your-domain.com/share/abc123def456
```

## 功能特性

### 创建分享链接

1. 在审阅模块中，点击视频的分享按钮
2. 如果是历史版本，需要填写分享原因
3. 配置分享选项：
   - 允许下载源文件
   - 密码保护（可选）
4. 点击"创建分享链接"
5. 复制生成的链接分享给他人

### 分享页面功能

- **响应式设计**：自动适配手机、平板、电脑等不同设备
- **密码保护**：如果设置了密码，访问时需要输入密码
- **视频播放**：支持在线播放视频，包含播放控制
- **下载功能**：如果允许下载，可以下载源文件
- **视频信息**：显示版本、大小、时长、分辨率等信息

## 技术实现

### 前端文件

- `src/api/shares.ts` - 分享API调用
- `src/components/Share/SharePage.tsx` - 分享页面组件
- `components/Layout/MainBrowser.tsx` - 分享功能集成

### 后端文件

- `backend/src/modules/shares/shares.controller.ts` - 分享控制器
- `backend/src/modules/shares/shares.service.ts` - 分享服务
- `backend/src/modules/shares/entities/share-link.entity.ts` - 分享链接实体

### API接口

- `POST /api/shares` - 创建分享链接（需要认证）
- `GET /api/shares/:token` - 获取分享链接详情（公开）
- `POST /api/shares/:token/verify-password` - 验证密码（公开）

## 注意事项

1. **域名配置**：确保分享域名指向正确的前端部署地址
2. **CORS配置**：确保后端允许前端域名的跨域请求
3. **视频访问**：确保视频文件的存储URL可以公开访问（或配置适当的访问权限）
4. **过期时间**：默认分享链接有效期为7天，可以在创建时自定义

## 测试建议

1. 创建分享链接并复制
2. 在无痕浏览器中打开链接，测试公开访问
3. 测试密码保护功能
4. 在不同设备上测试响应式布局
5. 测试视频播放和下载功能

