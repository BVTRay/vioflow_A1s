# 手机号和微信登录功能说明

## 功能概述

本模块实现了手机号验证码登录和微信小程序登录功能，扩展了原有的邮箱/用户名登录方式。

## 新增接口

### 1. 发送短信验证码
- **接口**: `POST /api/auth/send-sms`
- **请求体**:
```json
{
  "phone": "13800138000"
}
```
- **响应**:
```json
{
  "success": true,
  "code": "123456"  // 仅开发环境返回
}
```

### 2. 手机号登录
- **接口**: `POST /api/auth/phone-login`
- **请求体**:
```json
{
  "phone": "13800138000",
  "code": "123456"
}
```
- **响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "phone": "13800138000",
    "email": "13800138000@temp.vioflow.com",
    "name": "用户8000",
    "role": "member",
    "avatar_url": null
  }
}
```

### 3. 微信登录
- **接口**: `POST /api/auth/wechat-login`
- **请求体**:
```json
{
  "code": "微信小程序登录code"
}
```
- **响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "phone": null,
    "email": "openid@wechat.vioflow.com",
    "name": "微信用户",
    "role": "member",
    "avatar_url": null
  }
}
```

## 环境变量配置

### 必需配置

#### 微信小程序配置
```env
# 微信小程序 AppID
WECHAT_APP_ID=your_app_id

# 微信小程序 AppSecret
WECHAT_APP_SECRET=your_app_secret
```

#### 短信服务配置（二选一）

**选项1: 阿里云短信**
```env
# 短信服务商
SMS_PROVIDER=aliyun

# 阿里云 AccessKey ID
ALIYUN_SMS_ACCESS_KEY_ID=your_access_key_id

# 阿里云 AccessKey Secret
ALIYUN_SMS_ACCESS_KEY_SECRET=your_access_key_secret

# 短信签名
ALIYUN_SMS_SIGN_NAME=你的签名

# 短信模板代码
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456789
```

**选项2: 腾讯云短信**
```env
# 短信服务商
SMS_PROVIDER=tencent

# 腾讯云 SecretId
TENCENT_SMS_SECRET_ID=your_secret_id

# 腾讯云 SecretKey
TENCENT_SMS_SECRET_KEY=your_secret_key

# 短信应用 ID
TENCENT_SMS_APP_ID=your_app_id

# 短信签名
TENCENT_SMS_SIGN_NAME=你的签名

# 短信模板 ID
TENCENT_SMS_TEMPLATE_ID=123456
```

**选项3: 开发模式（不实际发送短信）**
```env
# 不配置短信服务商或配置为空，开发环境会自动返回验证码
SMS_PROVIDER=
```

## 数据库迁移

运行以下 SQL 脚本添加微信相关字段：

```sql
-- 在 Supabase SQL Editor 中运行
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "wechat_openid" varchar(100),
  ADD COLUMN IF NOT EXISTS "wechat_unionid" varchar(100),
  ADD COLUMN IF NOT EXISTS "wechat_session_key" varchar(200);

CREATE INDEX IF NOT EXISTS "idx_users_wechat_openid" ON "users"("wechat_openid");
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users"("phone");
```

或者运行迁移脚本：
```bash
cd backend
npm run migration:run
```

## 使用说明

### 手机号登录流程

1. 用户输入手机号，调用 `/api/auth/send-sms` 发送验证码
2. 用户输入验证码，调用 `/api/auth/phone-login` 登录
3. 如果用户不存在，系统会自动创建新用户
4. 返回 JWT token 和用户信息

### 微信登录流程

1. 小程序端调用 `wx.login()` 获取 code
2. 将 code 发送到 `/api/auth/wechat-login`
3. 后端通过 code 获取 openid
4. 如果用户不存在，系统会自动创建新用户
5. 返回 JWT token 和用户信息

## 安全说明

1. **验证码有效期**: 5分钟
2. **验证码发送频率**: 同一手机号1分钟内只能发送一次
3. **验证码使用**: 每个验证码只能使用一次
4. **登录频率限制**: 
   - 手机号登录：1分钟内最多5次
   - 微信登录：1分钟内最多10次
   - 发送验证码：1分钟内最多3次

## 注意事项

1. 手机号登录创建的用户，邮箱为临时邮箱（`{phone}@temp.vioflow.com`）
2. 微信登录创建的用户，邮箱为临时邮箱（`{openid}@wechat.vioflow.com`）
3. 用户可以通过后续功能绑定真实邮箱
4. 生产环境建议使用 Redis 存储验证码，而不是内存存储
5. 短信服务需要根据实际服务商实现具体的发送逻辑






