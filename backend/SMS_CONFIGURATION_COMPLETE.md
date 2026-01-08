# 短信服务配置完成

## ✅ 已配置的腾讯云短信参数

### 完整配置清单

```env
# 短信服务商
SMS_PROVIDER=tencent

# 腾讯云密钥
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key

# 短信应用ID
TENCENT_SMS_APP_ID=your_app_id

# 短信签名
TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司

# 短信模板ID
TENCENT_SMS_TEMPLATE_ID=2580851
```

## 📋 配置说明

### 1. 短信签名
- **名称**: 北京不恭文化传媒有限公司
- **用途**: 显示在短信内容的前缀
- **状态**: 需要在腾讯云控制台审核通过

### 2. 短信模板
- **模板ID**: 2580851
- **用途**: 验证码短信模板
- **状态**: 需要在腾讯云控制台审核通过
- **参数**: 模板中应包含 `{1}` 作为验证码占位符

## 🧪 测试步骤

### 1. 检查配置

确保在 `backend/.env` 文件中已添加所有配置：

```env
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=your_sign_name
TENCENT_SMS_TEMPLATE_ID=your_template_id
```

### 2. 测试发送验证码

**使用 curl 测试**：
```bash
curl -X POST http://localhost:3002/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'
```

**预期响应**：
```json
{
  "success": true
}
```

**如果配置正确**：
- 后端日志会显示：`[腾讯云] 验证码发送成功: 13800138000`
- 手机应该收到验证码短信

**如果配置有问题**：
- 后端日志会显示错误信息
- 开发环境会在日志中输出验证码（方便测试）

### 3. 测试手机号登录

```bash
curl -X POST http://localhost:3002/api/auth/phone-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456"
  }'
```

## ⚠️ 常见问题

### Q: 短信发送失败，提示"模板不存在"？

**可能原因**：
1. 模板ID不正确
2. 模板未审核通过
3. 模板与应用ID不匹配

**解决方法**：
1. 登录腾讯云控制台
2. 检查模板ID是否为 `2580851`
3. 确认模板审核状态为"已通过"
4. 确认模板属于应用ID `1401074591`

### Q: 短信发送失败，提示"签名不存在"？

**可能原因**：
1. 签名名称不正确
2. 签名未审核通过
3. 签名与应用ID不匹配

**解决方法**：
1. 登录腾讯云控制台
2. 检查签名名称是否为 `北京不恭文化传媒有限公司`（完全一致）
3. 确认签名审核状态为"已通过"
4. 确认签名属于应用ID `1401074591`

### Q: 收到短信但验证码不正确？

**可能原因**：
1. 模板参数格式不正确
2. 验证码参数位置不对

**解决方法**：
1. 检查模板内容，确认验证码占位符为 `{1}`
2. 模板示例：`您的验证码是{1}，5分钟内有效。请勿泄露给他人。`

### Q: 开发环境如何测试？

**开发环境**：
- 如果短信发送失败，系统会在日志中输出验证码
- 查看后端日志：`[开发环境] 短信发送失败，验证码: 123456`

**生产环境**：
- 必须配置完整的签名和模板
- 发送失败会抛出异常

## 📝 模板参数说明

腾讯云短信模板使用 `{1}`, `{2}` 等作为参数占位符。

**示例模板**：
```
您的验证码是{1}，5分钟内有效。请勿泄露给他人。
```

**发送时**：
- `TemplateParamSet: [code]` - 验证码会替换 `{1}`

## 🔍 调试技巧

### 1. 查看后端日志

```bash
# 查看实时日志
tail -f backend/logs/backend.log

# 或查看控制台输出
cd backend
npm run start:dev
```

### 2. 检查配置加载

日志中应该显示：
```
[腾讯云] 发送短信到 13800138000，使用模板 2580851
[腾讯云] 验证码发送成功: 13800138000，模板ID: 2580851
```

### 3. 测试完整流程

1. 发送验证码 → 检查日志/手机
2. 输入验证码登录 → 检查是否成功
3. 查看用户是否自动创建

## ✅ 配置验证清单

- [ ] 所有环境变量已添加到 `backend/.env`
- [ ] 签名和模板已在腾讯云控制台审核通过
- [ ] 测试发送验证码接口成功
- [ ] 测试手机号登录接口成功
- [ ] 未注册用户自动创建账号功能正常

## 📚 相关文档

- [腾讯云短信控制台](https://console.cloud.tencent.com/smsv2)
- [腾讯云短信API文档](https://cloud.tencent.com/document/product/382/43197)
- [后端短信服务代码](../backend/src/modules/auth/services/sms.service.ts)

