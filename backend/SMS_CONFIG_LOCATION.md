# 短信服务配置位置说明

## 📍 配置位置

### 本地开发环境

**配置文件路径**：
```
/www/wwwroot/vioflow-A/vioflow_A1s-1/backend/.env
```

**或者相对路径**：
```
backend/.env
```

## 🔧 配置方法

### 方法一：手动编辑（推荐）

1. **打开配置文件**：
   ```bash
   cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
   nano .env
   # 或使用其他编辑器：vim, code, 等
   ```

2. **添加以下配置**：
   ```env
   # 短信服务配置（腾讯云）
   SMS_PROVIDER=tencent
   TENCENT_SMS_SECRET_ID=your_secret_id
   TENCENT_SMS_SECRET_KEY=your_secret_key
   TENCENT_SMS_APP_ID=your_app_id
   TENCENT_SMS_SIGN_NAME=your_sign_name
   TENCENT_SMS_TEMPLATE_ID=your_template_id
   ```

3. **保存文件**（nano: Ctrl+O, Enter, Ctrl+X）

4. **重启后端服务**

### 方法二：使用快速配置脚本

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
./QUICK_CONFIG_SMS.sh
```

脚本会自动将配置添加到 `.env` 文件中。

### 方法三：使用命令行追加

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend

cat >> .env << 'EOF'

# 短信服务配置（腾讯云）
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=your_sign_name
TENCENT_SMS_TEMPLATE_ID=your_template_id
EOF
```

## 📋 完整配置示例

`backend/.env` 文件应该包含：

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
TENCENT_SMS_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=your_sign_name
TENCENT_SMS_TEMPLATE_ID=your_template_id
```

## ✅ 配置后操作

1. **重启后端服务**：
   ```bash
   # 如果使用 npm run start:dev
   # 停止当前服务（Ctrl+C），然后重新启动
   npm run start:dev
   
   # 如果使用 PM2
   pm2 restart vioflow-backend
   ```

2. **测试配置**：
   ```bash
   curl -X POST http://localhost:3002/api/auth/send-sms \
     -H "Content-Type: application/json" \
     -d '{"phone": "13800138000"}'
   ```

## 🚀 生产环境配置

如果后端部署在 **Railway**：

1. 登录 [Railway](https://railway.app)
2. 进入后端项目
3. 点击 **Variables** 标签页
4. 添加以下环境变量（每行一个）：
   - `SMS_PROVIDER=tencent`
   - `TENCENT_SMS_SECRET_ID=your_secret_id`
   - `TENCENT_SMS_SECRET_KEY=your_secret_key`
   - `TENCENT_SMS_APP_ID=your_app_id`
   - `TENCENT_SMS_SIGN_NAME=your_sign_name`
   - `TENCENT_SMS_TEMPLATE_ID=your_template_id`

5. Railway 会自动重新部署

## ⚠️ 注意事项

1. **文件权限**：确保 `.env` 文件有读取权限
2. **不要提交到 Git**：`.env` 文件包含敏感信息，应该添加到 `.gitignore`
3. **重启服务**：修改配置后必须重启后端服务
4. **格式要求**：
   - 每行一个配置项
   - 格式：`KEY=VALUE`
   - 值中不要有空格（除非用引号）
   - 不要有多余的空格

## 📚 相关文档

- [详细配置指南](SMS_ENV_CONFIG.md)
- [测试指南](TEST_SMS.md)
- [配置检查清单](CONFIGURATION_CHECKLIST.md)






