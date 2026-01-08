# 短信服务测试指南

## ✅ 当前配置

```env
SMS_PROVIDER=tencent
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=your_sign_name
TENCENT_SMS_TEMPLATE_ID=your_template_id
```

## 🧪 测试步骤

### 1. 确保配置已加载

在 `backend/.env` 文件中确认所有配置项都已添加。

### 2. 启动后端服务

```bash
cd backend
npm run start:dev
```

### 3. 测试发送验证码

**使用 curl**：
```bash
curl -X POST http://localhost:3002/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'
```

**使用 Postman 或浏览器**：
- URL: `POST http://localhost:3002/api/auth/send-sms`
- Body (JSON):
```json
{
  "phone": "13800138000"
}
```

### 4. 检查结果

**成功情况**：
- 响应：`{"success": true}`
- 后端日志：`[腾讯云] 验证码发送成功: 13800138000，模板ID: 2580851`
- 手机收到验证码短信

**失败情况**：
- 查看后端日志中的错误信息
- 开发环境会在日志中输出验证码（方便测试）

### 5. 测试登录

使用收到的验证码进行登录：

```bash
curl -X POST http://localhost:3002/api/auth/phone-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456"
  }'
```

## 🔍 常见错误及解决方法

### 错误1: "模板不存在" (InvalidParameterValue.TemplateIdNotFound)

**原因**：
- 模板ID不正确
- 模板未审核通过
- 模板与应用ID不匹配

**解决**：
1. 登录腾讯云控制台
2. 检查模板ID是否为 `2580851`
3. 确认模板状态为"已通过"
4. 确认模板属于应用 `1401074591`

### 错误2: "签名不存在" (InvalidParameterValue.SignNameNotFound)

**原因**：
- 签名名称不正确（注意大小写和空格）
- 签名未审核通过
- 签名与应用ID不匹配

**解决**：
1. 登录腾讯云控制台
2. 检查签名名称是否为 `北京不恭文化传媒有限公司`（完全一致）
3. 确认签名状态为"已通过"
4. 确认签名属于应用 `1401074591`

### 错误3: "签名验证失败"

**原因**：
- SecretId 或 SecretKey 不正确
- 签名算法实现有误

**解决**：
1. 检查 SecretId 和 SecretKey 是否正确
2. 查看后端日志中的详细错误信息

### 错误4: "手机号格式不正确"

**原因**：
- 手机号格式不符合要求

**解决**：
- 确保手机号为11位数字
- 确保以 `1` 开头，第二位为 `3-9`

## 📊 日志说明

### 成功日志示例

```
[腾讯云] 发送短信到 13800138000，使用模板 2580851
[腾讯云] 验证码发送成功: 13800138000，模板ID: 2580851
```

### 失败日志示例

```
[腾讯云] 发送短信到 13800138000，使用模板 2580851
腾讯云短信发送失败: 模板不存在
{
  code: 'InvalidParameterValue.TemplateIdNotFound',
  phone: '13800138000',
  templateId: '2580851',
  signName: '北京不恭文化传媒有限公司'
}
```

### 开发环境日志

如果发送失败，开发环境会在日志中输出验证码：
```
[开发环境] 短信发送失败，验证码: 123456
```

## ✅ 配置验证清单

- [ ] 所有环境变量已添加到 `backend/.env`
- [ ] 签名 `北京不恭文化传媒有限公司` 已在腾讯云审核通过
- [ ] 模板 `2580851` 已在腾讯云审核通过
- [ ] 测试发送验证码接口成功
- [ ] 手机收到验证码短信
- [ ] 测试手机号登录接口成功
- [ ] 未注册用户自动创建账号功能正常

## 🔗 相关链接

- [腾讯云短信控制台](https://console.cloud.tencent.com/smsv2)
- [查看签名状态](https://console.cloud.tencent.com/smsv2/csms/sign)
- [查看模板状态](https://console.cloud.tencent.com/smsv2/csms/template)

