# 环境变量配置指南

## 手机号和微信登录功能所需配置

### 1. 微信小程序配置（必需）

在微信公众平台（https://mp.weixin.qq.com/）注册小程序后获取：

```env
# 微信小程序 AppID（小程序管理后台 -> 开发 -> 开发管理 -> 开发设置）
WECHAT_APP_ID=wx1234567890abcdef

# 微信小程序 AppSecret（小程序管理后台 -> 开发 -> 开发管理 -> 开发设置）
WECHAT_APP_SECRET=your_app_secret_here
```

**获取方式**:
1. 登录微信公众平台
2. 进入小程序管理后台
3. 开发 -> 开发管理 -> 开发设置
4. 查看 AppID 和 AppSecret（需要重置才能查看）

### 2. 短信服务配置（必需，三选一）

#### 选项 A: 阿里云短信服务

**前提条件**:
1. 注册阿里云账号
2. 开通短信服务
3. 申请短信签名和模板

**配置项**:
```env
# 短信服务商
SMS_PROVIDER=aliyun

# 阿里云 AccessKey ID（访问控制 -> 用户 -> 创建用户 -> 创建 AccessKey）
ALIYUN_SMS_ACCESS_KEY_ID=LTAI5txxxxxxxxxxxxx

# 阿里云 AccessKey Secret
ALIYUN_SMS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 短信签名（短信服务 -> 国内消息 -> 签名管理）
ALIYUN_SMS_SIGN_NAME=你的签名名称

# 短信模板代码（短信服务 -> 国内消息 -> 模板管理）
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456789
```

**短信模板示例**:
```
您的验证码是${code}，5分钟内有效。请勿泄露给他人。
```

#### 选项 B: 腾讯云短信服务

**前提条件**:
1. 注册腾讯云账号
2. 开通短信服务
3. 申请短信签名和模板

**配置项**:
```env
# 短信服务商
SMS_PROVIDER=tencent

# 腾讯云 SecretId（访问管理 -> API密钥管理）
TENCENT_SMS_SECRET_ID=your_secret_id

# 腾讯云 SecretKey
TENCENT_SMS_SECRET_KEY=your_secret_key

# 短信应用 ID（短信 -> 应用管理）
TENCENT_SMS_APP_ID=your_app_id

# 短信签名（短信 -> 国内短信 -> 签名管理）
TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司

# 短信模板 ID（短信 -> 国内短信 -> 正文模板管理）
TENCENT_SMS_TEMPLATE_ID=2580851
```

**短信模板示例**:
```
您的验证码是{1}，5分钟内有效。请勿泄露给他人。
```

#### 选项 C: 开发模式（不实际发送短信）

开发环境可以不配置短信服务，系统会在日志中输出验证码：

```env
# 不配置或留空
SMS_PROVIDER=
```

开发环境下，`/api/auth/send-sms` 接口会在响应中直接返回验证码。

### 3. 完整配置示例

在 `backend/.env` 文件中添加以下配置：

```env
# ============================================
# 微信小程序配置
# ============================================
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your_app_secret_here

# ============================================
# 短信服务配置（选择一种）
# ============================================
# 选项1: 阿里云
SMS_PROVIDER=aliyun
ALIYUN_SMS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_SMS_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_SMS_SIGN_NAME=你的签名
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456789

# 选项2: 腾讯云
# SMS_PROVIDER=tencent
# TENCENT_SMS_SECRET_ID=your_secret_id
# TENCENT_SMS_SECRET_KEY=your_secret_key
# TENCENT_SMS_APP_ID=your_app_id
# TENCENT_SMS_SIGN_NAME=你的签名
# TENCENT_SMS_TEMPLATE_ID=123456

# 选项3: 开发模式（不实际发送）
# SMS_PROVIDER=
```

## 配置检查清单

- [ ] 已注册微信小程序并获取 AppID 和 AppSecret
- [ ] 已选择短信服务商（阿里云/腾讯云/开发模式）
- [ ] 已配置短信服务相关密钥和参数
- [ ] 已在数据库中运行迁移脚本添加微信字段
- [ ] 已测试发送验证码接口
- [ ] 已测试手机号登录接口
- [ ] 已测试微信登录接口

## 常见问题

### Q: 如何获取微信小程序的 AppSecret？
A: 登录微信公众平台 -> 小程序管理后台 -> 开发 -> 开发管理 -> 开发设置 -> AppSecret（需要重置才能查看）

### Q: 短信服务必须配置吗？
A: 开发环境可以不配置，生产环境必须配置。不配置时，验证码会在日志中输出（开发环境）或响应中返回（开发环境）。

### Q: 可以使用其他短信服务商吗？
A: 可以，需要修改 `backend/src/modules/auth/services/sms.service.ts` 中的实现。

### Q: 验证码存储在哪里？
A: 当前使用内存存储（Map），生产环境建议使用 Redis。需要修改 `SmsService` 的实现。

## 下一步

配置完成后，请：
1. 运行数据库迁移脚本
2. 重启后端服务
3. 测试各个接口
4. 查看日志确认配置是否正确

