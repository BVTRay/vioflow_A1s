# 阿里云短信服务测试指南

## 配置状态

✅ 已配置阿里云短信服务：
- `SMS_PROVIDER=aliyun`
- `ALIYUN_SMS_ACCESS_KEY_ID=your_access_key_id`
- `ALIYUN_SMS_ACCESS_KEY_SECRET=your_access_key_secret`
- `ALIYUN_SMS_SIGN_NAME=your_sign_name`
- `ALIYUN_SMS_TEMPLATE_CODE=your_template_code`

## 测试步骤

### 1. 测试发送验证码

```bash
curl -X POST http://localhost:3002/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
```

**预期结果**：
- 开发环境：返回 `{"success":true,"code":"123456"}`（验证码会在响应中返回）
- 生产环境：返回 `{"success":true}`（验证码不会返回，会通过短信发送）

### 2. 测试手机号登录

```bash
# 先获取验证码（记下返回的 code）
VERIFY_CODE=$(curl -s -X POST http://localhost:3002/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}' | grep -o '"code":"[^"]*"' | cut -d'"' -f4)

# 使用验证码登录
curl -X POST http://localhost:3002/api/auth/phone-login \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"13800138000\",\"code\":\"$VERIFY_CODE\"}"
```

**预期结果**：
- 返回 `access_token` 和用户信息
- 如果是新用户，会自动注册

## 问题排查

### 问题 1: 验证码验证失败

**原因**：
- 验证码已过期（5分钟有效期）
- 验证码已被使用（验证码只能使用一次）
- 手机号不匹配

**解决方案**：
- 重新发送验证码
- 确保使用正确的手机号和验证码

### 问题 2: 短信未实际发送

**开发环境**：
- 开发环境下，即使短信发送失败，也会在响应中返回验证码
- 查看后端日志，确认是否有错误信息

**生产环境**：
- 检查阿里云短信服务配置是否正确
- 检查短信签名和模板是否已审核通过
- 查看后端日志中的错误信息

### 问题 3: 登录返回 500 错误

**已修复**：
- ✅ 数据库字段问题已修复（已添加 `wechat_openid`、`wechat_unionid`、`wechat_session_key` 字段）
- ✅ 用户创建时的 `password_hash` 问题已修复（现在会生成随机密码哈希）

## 查看日志

```bash
# 查看后端日志
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
pm2 logs vioflow-backend --lines 100

# 过滤短信相关日志
pm2 logs vioflow-backend --lines 500 | grep -E "阿里云|短信|验证码|send-sms|phone-login"
```

## 注意事项

1. **验证码有效期**：5分钟
2. **验证码使用次数**：只能使用一次
3. **发送频率限制**：同一手机号1分钟内只能发送一次
4. **开发环境**：验证码会在响应中返回，方便测试
5. **生产环境**：验证码不会返回，必须通过短信接收




