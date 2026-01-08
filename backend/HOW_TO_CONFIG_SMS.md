# 短信服务配置指南

## 📍 配置位置

### 本地开发环境

**配置文件路径**：
```
/www/wwwroot/vioflow-A/vioflow_A1s-1/backend/.env
```

**或者使用相对路径**：
```
backend/.env
```

## 🔧 配置步骤

### 步骤 1: 打开配置文件

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
nano .env
```

如果文件不存在，会自动创建。

### 步骤 2: 添加短信配置

在 `.env` 文件中添加以下内容：

```env
# 短信服务配置（腾讯云）
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=your_sign_name
TENCENT_SMS_TEMPLATE_ID=your_template_id
```

### 步骤 3: 保存文件

- **nano 编辑器**：按 `Ctrl+O` 保存，按 `Enter` 确认，按 `Ctrl+X` 退出
- **vim 编辑器**：按 `Esc`，输入 `:wq` 保存并退出
- **其他编辑器**：正常保存即可

### 步骤 4: 重启后端服务

配置修改后，**必须重启后端服务**才能生效：

```bash
# 如果后端服务正在运行，先停止（Ctrl+C）
# 然后重新启动
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
npm run start:dev
```

## 🚀 快速配置（使用脚本）

如果您想快速配置，可以使用提供的脚本：

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
./QUICK_CONFIG_SMS.sh
```

脚本会自动将配置添加到 `.env` 文件中。

## 📋 完整配置示例

`backend/.env` 文件的完整示例：

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

## ✅ 验证配置

### 方法 1: 检查文件内容

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
cat .env | grep SMS
```

应该能看到所有短信相关的配置项。

### 方法 2: 测试发送验证码

```bash
curl -X POST http://localhost:3002/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'
```

**成功响应**：
```json
{
  "success": true
}
```

**查看后端日志**，应该看到：
```
[腾讯云] 验证码发送成功: 13800138000，模板ID: 2580851
```

## 🚀 生产环境配置（Railway）

如果后端部署在 Railway：

1. 登录 [Railway](https://railway.app)
2. 进入后端项目
3. 点击 **Variables** 标签页
4. 点击 **+ New Variable** 添加以下环境变量：

   | 变量名 | 值 |
   |--------|-----|
   | `SMS_PROVIDER` | `tencent` |
   | `TENCENT_SMS_SECRET_ID` | `your_secret_id` |
   | `TENCENT_SMS_SECRET_KEY` | `your_secret_key` |
   | `TENCENT_SMS_APP_ID` | `your_app_id` |
   | `TENCENT_SMS_SIGN_NAME` | `your_sign_name` |
   | `TENCENT_SMS_TEMPLATE_ID` | `your_template_id` |

5. Railway 会自动重新部署

## ⚠️ 重要提示

1. **配置文件位置**：`backend/.env`（不是项目根目录）
2. **重启服务**：修改配置后必须重启后端服务
3. **不要提交到 Git**：`.env` 文件包含敏感信息
4. **格式要求**：
   - 每行一个配置项
   - 格式：`KEY=VALUE`
   - 值中不要有多余空格
   - 不要使用引号（除非值本身需要）

## 📚 相关文档

- [详细配置说明](SMS_ENV_CONFIG.md)
- [配置位置说明](SMS_CONFIG_LOCATION.md)
- [测试指南](TEST_SMS.md)






