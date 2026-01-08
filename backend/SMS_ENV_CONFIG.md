# 短信服务环境变量配置指南

## 📍 配置位置

### 本地开发环境

**配置文件路径**：`backend/.env`

如果文件不存在，需要创建：

```bash
cd backend
touch .env
```

### 生产环境（Railway）

如果后端部署在 Railway，需要在 Railway 项目设置中配置环境变量：

1. 登录 [Railway](https://railway.app)
2. 进入后端项目
3. 点击 **Variables** 标签页
4. 添加以下环境变量

## 📝 需要配置的环境变量

在 `backend/.env` 文件中添加以下配置：

```env
# ============================================
# 短信服务配置（腾讯云）
# ============================================
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=1401074591
TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司
TENCENT_SMS_TEMPLATE_ID=2580851
```

## 🔧 配置步骤

### 步骤 1: 创建或编辑 .env 文件

```bash
# 进入后端目录
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend

# 如果文件不存在，创建它
touch .env

# 编辑文件
nano .env
# 或使用其他编辑器
```

### 步骤 2: 添加配置

将以下内容添加到 `backend/.env` 文件中：

```env
# 短信服务配置
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=1401074591
TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司
TENCENT_SMS_TEMPLATE_ID=2580851
```

### 步骤 3: 保存文件

保存并退出编辑器。

### 步骤 4: 重启后端服务

配置修改后，需要重启后端服务才能生效：

```bash
# 如果使用 npm run start:dev
# 停止当前服务（Ctrl+C），然后重新启动
npm run start:dev

# 如果使用 PM2
pm2 restart vioflow-backend
```

## ✅ 验证配置

### 方法 1: 检查环境变量是否加载

启动后端服务后，查看日志，应该能看到配置已加载。

### 方法 2: 测试发送验证码

```bash
curl -X POST http://localhost:3002/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'
```

如果配置正确，应该：
- 返回 `{"success": true}`
- 后端日志显示：`[腾讯云] 验证码发送成功: 13800138000`
- 手机收到验证码短信

## ⚠️ 注意事项

1. **文件权限**：确保 `.env` 文件有正确的读取权限
2. **不要提交到 Git**：`.env` 文件通常包含敏感信息，应该添加到 `.gitignore`
3. **格式要求**：
   - 每行一个配置项
   - 使用 `KEY=VALUE` 格式
   - 不要有空格（除非值本身包含空格）
   - 不要使用引号（除非值本身需要引号）

4. **重启服务**：修改 `.env` 文件后，必须重启后端服务才能生效

## 🔒 安全建议

1. **不要将 `.env` 文件提交到 Git**
2. **生产环境使用环境变量管理工具**（如 Railway、Vercel 的环境变量配置）
3. **定期轮换密钥**

## 📋 完整配置示例

`backend/.env` 文件的完整示例（包含短信配置）：

```env
# 数据库配置
DATABASE_URL=postgresql://...

# 应用配置
PORT=3002
NODE_ENV=development

# JWT 配置
JWT_SECRET=your-jwt-secret

# CORS 配置
CORS_ORIGIN=http://localhost:3009

# 微信小程序配置
WECHAT_APP_ID=wx88534d2b615d32a5
WECHAT_APP_SECRET=29f223111f2209572f119cfdbf0049a8

# 短信服务配置（腾讯云）
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=1401074591
TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司
TENCENT_SMS_TEMPLATE_ID=2580851
```

## 🚀 快速配置命令

如果您想快速添加配置，可以使用以下命令：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend

# 追加配置到 .env 文件
cat >> .env << 'EOF'

# 短信服务配置（腾讯云）
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=1401074591
TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司
TENCENT_SMS_TEMPLATE_ID=2580851
EOF
```

## 📚 相关文档

- [后端配置指南](ENV_CONFIG_GUIDE.md)
- [短信服务测试指南](TEST_SMS.md)
- [配置检查清单](CONFIGURATION_CHECKLIST.md)






