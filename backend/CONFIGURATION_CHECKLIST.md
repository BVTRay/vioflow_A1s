# 配置检查清单

## ✅ 已提供的配置

### 微信小程序配置
- ✅ `WECHAT_APP_ID=wx88534d2b615d32a5`
- ✅ `WECHAT_APP_SECRET=29f223111f2209572f119cfdbf0049a8`

### 腾讯云短信基础配置
- ✅ `SMS_PROVIDER=tencent`
- ✅ `TENCENT_SMS_SECRET_ID=your_secret_id`
- ✅ `TENCENT_SMS_SECRET_KEY=your_secret_key`
- ✅ `TENCENT_SMS_APP_ID=your_app_id`

## ✅ 已提供的完整配置

### 腾讯云短信完整配置
- ✅ `SMS_PROVIDER=tencent`
- ✅ `TENCENT_SMS_SECRET_ID=your_secret_id`
- ✅ `TENCENT_SMS_SECRET_KEY=your_secret_key`
- ✅ `TENCENT_SMS_APP_ID=your_app_id`
- ✅ `TENCENT_SMS_SIGN_NAME=your_sign_name`
- ✅ `TENCENT_SMS_TEMPLATE_ID=2580851`

## 📝 配置步骤

### 1. 在腾讯云控制台创建短信签名

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 "短信" -> "国内短信" -> "签名管理"
3. 点击 "创建签名"
4. 填写签名信息：
   - 签名类型：选择 "自用" 或 "他用"
   - 签名内容：填写您的应用名称或公司名称
   - 证明类型：根据实际情况选择
5. 提交审核（通常几分钟内完成）
6. 审核通过后，记录签名名称

### 2. 在腾讯云控制台创建短信模板

1. 进入 "短信" -> "国内短信" -> "正文模板管理"
2. 点击 "创建正文模板"
3. 填写模板信息：
   - 模板名称：验证码模板
   - 模板内容：`您的验证码是{1}，5分钟内有效。请勿泄露给他人。`
   - 短信类型：验证码
   - 申请说明：用户登录验证码
4. 提交审核
5. 审核通过后，记录模板ID

### 3. 添加到环境变量

在 `backend/.env` 文件中添加：

```env
TENCENT_SMS_SIGN_NAME=你的签名名称
TENCENT_SMS_TEMPLATE_ID=你的模板ID
```

## 🧪 测试配置

配置完成后，可以通过以下方式测试：

### 1. 测试发送验证码接口

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

**如果配置不完整，会在日志中输出验证码**：
```
[腾讯云] 验证码（未发送）: 13800138000 -> 123456
```

### 2. 查看日志

检查后端日志，确认：
- ✅ 配置已正确加载
- ✅ 短信发送成功（或配置不完整时的警告信息）

## 📋 完整配置示例

在 `backend/.env` 文件中应该包含：

```env
# 微信小程序配置
WECHAT_APP_ID=wx88534d2b615d32a5
WECHAT_APP_SECRET=29f223111f2209572f119cfdbf0049a8

# 短信服务配置
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=your_sign_name
TENCENT_SMS_TEMPLATE_ID=your_template_id
```

## ⚠️ 注意事项

1. **签名和模板需要审核**：首次创建需要等待审核通过（通常几分钟到几小时）
2. **模板参数**：验证码模板中的 `{1}` 会被替换为实际的验证码
3. **测试环境**：如果暂时没有签名和模板，系统会在日志中输出验证码，不影响开发测试
4. **生产环境**：生产环境必须配置完整的签名和模板ID

## 🔗 相关链接

- [腾讯云短信控制台](https://console.cloud.tencent.com/smsv2)
- [腾讯云短信文档](https://cloud.tencent.com/document/product/382)
- [短信签名申请指南](https://cloud.tencent.com/document/product/382/37736)
- [短信模板申请指南](https://cloud.tencent.com/document/product/382/37739)

