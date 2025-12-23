# Cloudflare R2 存储配置指南

本文档说明如何配置项目以使用 Cloudflare R2 作为视频存储服务。

## 环境变量配置

在 `.env` 文件中添加以下环境变量：

### R2 存储配置（必需）

```env
# 存储类型：设置为 'r2' 以使用 R2 存储，或留空/设置为其他值使用 Supabase
STORAGE_TYPE=r2

# R2 访问密钥 ID
R2_ACCESS_KEY_ID=f09c427c27e2bb8ac99e06066fdcb850

# R2 密钥访问密钥
R2_SECRET_ACCESS_KEY=6e4ab076a69ac1f7a2f5f4707db1f70d5a2d572ff640ac810753bc91143e463a

# R2 端点 URL（S3 兼容端点）
R2_ENDPOINT=https://e231a49a57e1864a581d1455819effd0.r2.cloudflarestorage.com

# R2 存储桶名称（可选，默认为 'videos'）
R2_BUCKET_NAME=videos

# R2 公共 URL 基础路径（可选）
# 如果配置了 R2 自定义域名，可以设置此变量
# 例如：https://your-custom-domain.com
R2_PUBLIC_URL_BASE=
```

### Supabase 存储配置（可选，如果使用 Supabase）

如果 `STORAGE_TYPE` 不是 `r2`，系统将使用 Supabase 存储：

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_STORAGE_BUCKET=videos
```

## 配置说明

### 存储服务选择逻辑

系统会根据以下优先级选择存储服务：

1. 如果 `STORAGE_TYPE=r2`，使用 R2 存储
2. 如果未设置 `STORAGE_TYPE`，但配置了 R2 相关环境变量（`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_ENDPOINT`），使用 R2 存储
3. 否则，使用 Supabase 存储

### R2 公共 URL 配置

如果您的 R2 存储桶配置了自定义域名，可以设置 `R2_PUBLIC_URL_BASE` 环境变量：

```env
R2_PUBLIC_URL_BASE=https://your-custom-domain.com
```

如果没有配置自定义域名，系统会使用 R2 端点自动构建 URL。

### 签名 URL

R2 存储服务支持生成签名 URL（用于私有存储桶）。签名 URL 默认有效期为 1 小时，可以通过 API 参数调整。

## 测试连接

启动后端服务后，可以通过以下方式测试存储连接：

1. 访问健康检查接口：`GET /api/upload/health`
2. 查看日志输出，确认使用的存储服务类型

## 注意事项

1. **原有视频不会自动迁移**：配置切换到 R2 后，新上传的视频将存储到 R2，但原有的视频仍保留在原存储位置。

2. **存储桶权限**：确保 R2 存储桶已创建，并且访问密钥具有适当的权限（上传、下载、删除等）。

3. **公共访问**：如果需要公共访问，请确保 R2 存储桶配置了适当的 CORS 策略和公共访问权限。

4. **自定义域名**：建议为 R2 存储桶配置自定义域名，以获得更好的性能和用户体验。

## 故障排除

### 问题：上传失败

- 检查环境变量是否正确配置
- 确认 R2 访问密钥有效
- 检查存储桶名称是否正确
- 查看后端日志获取详细错误信息

### 问题：无法访问视频

- 检查 R2 存储桶的公共访问设置
- 如果使用签名 URL，确认 URL 未过期
- 检查 CORS 配置

### 问题：存储服务选择错误

- 检查 `STORAGE_TYPE` 环境变量
- 确认 R2 相关环境变量是否完整配置
- 查看启动日志，确认使用的存储服务类型


