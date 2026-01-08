# 系统资源管理

本文档说明如何使用系统资源管理功能来管理系统Logo等通用资源。

## 概述

系统资源管理模块提供了完整的系统公共资源管理功能，包括：
- Logo文件管理
- 默认头像管理
- Banner图片管理
- 其他系统公共资源

所有系统资源存储在 `/www/wwwroot/vioflow_storage/system/` 目录下。

## 目录结构

```
/www/wwwroot/vioflow_storage/system/
├── defaults/          # 默认资源目录
│   ├── logo.png      # 系统Logo
│   ├── logo.svg      # 系统Logo（SVG格式）
│   ├── favicon.ico   # 网站图标
│   └── avatar.png    # 默认用户头像
└── assets/           # 其他系统资源目录
    └── banner.jpg    # Banner图片
```

## API接口

### 1. 获取常用资源URL

获取系统常用资源的访问URL。

**请求：**
```
GET /api/system-resources/common
```

**响应：**
```json
{
  "statusCode": 200,
  "data": {
    "logo": "http://localhost:3000/storage/system/defaults/logo.png",
    "favicon": "http://localhost:3000/storage/system/defaults/favicon.ico",
    "defaultAvatar": "http://localhost:3000/storage/system/defaults/avatar.png",
    "banner": "http://localhost:3000/storage/system/assets/banner.jpg"
  }
}
```

### 2. 列出资源文件

列出指定目录下的所有资源文件。

**请求：**
```
GET /api/system-resources/list/:subPath?
```

**参数：**
- `subPath` (可选): 子目录路径，例如 `defaults` 或 `assets`

**示例：**
```bash
# 列出所有资源
GET /api/system-resources/list

# 列出defaults目录下的资源
GET /api/system-resources/list/defaults
```

**响应：**
```json
{
  "statusCode": 200,
  "data": [
    {
      "name": "logo.png",
      "path": "defaults/logo.png",
      "url": "http://localhost:3000/storage/system/defaults/logo.png"
    },
    {
      "name": "favicon.ico",
      "path": "defaults/favicon.ico",
      "url": "http://localhost:3000/storage/system/defaults/favicon.ico"
    }
  ]
}
```

### 3. 获取资源信息

获取指定资源的详细信息。

**请求：**
```
GET /api/system-resources/info/:resourcePath
```

**参数：**
- `resourcePath`: 资源相对路径，例如 `defaults/logo.png`

**响应：**
```json
{
  "statusCode": 200,
  "data": {
    "exists": true,
    "path": "/www/wwwroot/vioflow_storage/system/defaults/logo.png",
    "url": "http://localhost:3000/storage/system/defaults/logo.png",
    "size": 12345,
    "mtime": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. 上传资源文件

上传新的系统资源文件。

**请求：**
```
POST /api/system-resources/upload/:resourcePath
Content-Type: multipart/form-data
```

**参数：**
- `resourcePath`: 资源相对路径，例如 `defaults/logo.png`
- `file`: 文件内容（multipart/form-data）

**示例（使用curl）：**
```bash
curl -X POST \
  http://localhost:3000/api/system-resources/upload/defaults/logo.png \
  -F "file=@/path/to/logo.png"
```

**响应：**
```json
{
  "statusCode": 201,
  "message": "资源上传成功",
  "data": {
    "path": "defaults/logo.png",
    "url": "http://localhost:3000/storage/system/defaults/logo.png",
    "size": 12345
  }
}
```

### 5. 删除资源文件

删除指定的系统资源文件。

**请求：**
```
DELETE /api/system-resources/:resourcePath
```

**参数：**
- `resourcePath`: 资源相对路径，例如 `defaults/old-logo.png`

**示例：**
```bash
curl -X DELETE \
  http://localhost:3000/api/system-resources/defaults/old-logo.png
```

**响应：**
```json
{
  "statusCode": 200,
  "message": "资源删除成功"
}
```

### 6. 直接访问资源文件（通过API）

通过API直接访问资源文件内容。

**请求：**
```
GET /api/system-resources/file/:resourcePath
```

**参数：**
- `resourcePath`: 资源相对路径

**响应：**
返回文件内容，Content-Type根据文件类型自动设置。

## 直接访问（推荐）

系统资源也可以通过存储服务直接访问，这是推荐的方式，因为性能更好：

```
GET /storage/system/{resourcePath}
```

例如：
- `http://localhost:3000/storage/system/defaults/logo.png`
- `http://localhost:3000/storage/system/assets/banner.jpg`

这种方式由 `StorageServeController` 处理，支持：
- Range请求（用于大文件）
- 自动Content-Type识别
- 长期缓存（1年）
- 路径安全检查

## 使用示例

### 在前端代码中使用

```typescript
// 方式1：直接使用存储路径（推荐）
const logoUrl = `${API_BASE_URL}/storage/system/defaults/logo.png`;

// 方式2：通过API获取常用资源URL
const response = await fetch(`${API_BASE_URL}/api/system-resources/common`);
const { data } = await response.json();
const logoUrl = data.logo;

// 在React组件中使用
<img src={logoUrl} alt="Logo" />
```

### 在HTML中使用

```html
<!-- 直接使用存储路径（推荐） -->
<img src="/storage/system/defaults/logo.png" alt="Logo" />

<!-- 或使用完整URL -->
<img src="http://yourdomain.com/storage/system/defaults/logo.png" alt="Logo" />
```

### 上传Logo文件

```typescript
// 使用FormData上传文件
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  `${API_BASE_URL}/api/system-resources/upload/defaults/logo.png`,
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();
console.log('上传成功:', result.data.url);
```

## 服务端使用

在NestJS服务中注入 `SystemResourcesService`：

```typescript
import { SystemResourcesService } from './modules/system-resources/system-resources.service';

@Injectable()
export class SomeService {
  constructor(
    private readonly systemResourcesService: SystemResourcesService,
  ) {}

  async getLogoUrl(): Promise<string> {
    const urls = this.systemResourcesService.getCommonResourceUrls();
    return urls.logo || '';
  }

  async checkLogoExists(): Promise<boolean> {
    return await this.systemResourcesService.resourceExists('defaults/logo.png');
  }
}
```

## 文件命名建议

### Logo文件
- `defaults/logo.png` - 主Logo（PNG格式，支持透明背景）
- `defaults/logo.svg` - 主Logo（SVG格式，推荐，矢量图）
- `defaults/logo-white.png` - 白色版本Logo（用于深色背景）
- `defaults/logo-dark.png` - 深色版本Logo（用于浅色背景）

### 图标文件
- `defaults/favicon.ico` - 网站图标
- `defaults/apple-touch-icon.png` - Apple设备图标

### 默认头像
- `defaults/avatar.png` - 默认用户头像
- `defaults/default-avatar.png` - 备用默认头像

### Banner和其他资源
- `assets/banner.jpg` - 系统Banner
- `assets/background.jpg` - 背景图片

## 注意事项

1. **文件大小限制**：
   - Logo文件建议不超过500KB
   - Banner图片建议不超过2MB

2. **文件格式**：
   - Logo推荐使用SVG格式（矢量图，可缩放）
   - 图标使用ICO或PNG格式
   - 照片类资源使用JPG格式

3. **权限设置**：
   ```bash
   # 确保Web服务器有读取权限
   chmod -R 755 /www/wwwroot/vioflow_storage/system
   
   # 如果需要上传功能，确保Web服务器有写入权限
   chmod -R 775 /www/wwwroot/vioflow_storage/system
   chown -R www:www /www/wwwroot/vioflow_storage/system
   ```

4. **缓存**：
   - 系统资源设置了长期缓存（1年）
   - 更新资源后可能需要清除浏览器缓存或使用版本号

5. **安全性**：
   - 所有路径都经过安全检查，防止路径遍历攻击
   - 只能访问 `system/` 目录下的文件

## 故障排查

### 文件无法访问

1. 检查文件是否存在：
   ```bash
   ls -la /www/wwwroot/vioflow_storage/system/defaults/logo.png
   ```

2. 检查文件权限：
   ```bash
   ls -la /www/wwwroot/vioflow_storage/system/
   ```

3. 检查URL配置：
   ```bash
   # 确认 LOCAL_STORAGE_URL_BASE 与实际访问路径匹配
   echo $LOCAL_STORAGE_URL_BASE
   ```

### 上传失败

1. 检查目录权限：
   ```bash
   ls -la /www/wwwroot/vioflow_storage/system/
   # 确保Node.js进程有写入权限
   ```

2. 检查磁盘空间：
   ```bash
   df -h /www/wwwroot
   ```

3. 查看后端日志：
   ```bash
   tail -f backend/logs/backend.log
   ```


