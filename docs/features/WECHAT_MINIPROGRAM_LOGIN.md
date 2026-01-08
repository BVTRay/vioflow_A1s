# 微信小程序扫码登录功能实现文档

## 功能概述

实现了完整的微信小程序扫码登录流程，用户可以通过扫描小程序码，在微信小程序中完成认证和登录。

## 功能特性

### 1. PC端功能

- ✅ 显示微信小程序码（通过微信API生成）
- ✅ 实时轮询扫码状态
- ✅ 支持账号密码和扫码登录两种模式切换
- ✅ 扫码状态可视化展示（待扫码、已扫码、登录成功、已过期）
- ✅ 二维码过期后可刷新

### 2. 小程序端功能

- ✅ 自动识别小程序码中的 scanId 参数
- ✅ 用户协议和隐私政策勾选确认
- ✅ 支持微信手机号快捷登录（一键获取手机号）
- ✅ 支持手动输入短信验证码登录
- ✅ 首次登录自动创建账号

### 3. 后端功能

- ✅ 生成微信小程序码 API
- ✅ 扫码会话管理（内存存储，可扩展为 Redis）
- ✅ 微信手机号解密
- ✅ 手机号快捷登录
- ✅ 短信验证码登录
- ✅ 状态轮询接口

## 实现架构

### 后端 API 接口

#### 1. 生成小程序码
```
POST /api/auth/wechat-qrcode
Response: { qrCode: string, scanId: string }
```

#### 2. 检查扫码状态
```
GET /api/auth/wechat-qrcode/:scanId
Response: { status: 'pending' | 'scanned' | 'confirmed' | 'expired', token?: string, user?: any }
```

#### 3. 小程序扫码通知
```
POST /api/auth/wechat-qrcode/scan
Body: { scanId: string, code: string }
```

#### 4. 微信手机号快捷登录
```
POST /api/auth/wechat-qrcode/quick-login
Body: { scanId: string, encryptedData: string, iv: string }
Response: { access_token: string, user: any }
```

#### 5. 确认登录（短信验证码）
```
POST /api/auth/wechat-qrcode/confirm
Body: { scanId: string, phone: string, smsCode: string }
Response: { access_token: string, user: any }
```

### 小程序页面

#### 1. pages/scan/index
- 扫码后的入口页面
- 解析小程序码的 scene 参数（格式：sid=xxx）
- 调用后端扫码接口通知 PC 端
- 跳转到协议页面

#### 2. pages/agreement/index
- 显示用户协议和隐私政策
- 用户勾选同意后才能继续
- 提供两个登录选项：
  - 微信手机号快捷登录（调用 wx.getPhoneNumber）
  - 手动输入手机号登录

#### 3. pages/phone-login/index
- 手动输入手机号和短信验证码
- 发送验证码功能（带倒计时）
- 支持扫码登录和普通登录两种模式

### PC 前端组件

#### WechatQrCodeLogin.tsx
- 显示小程序码
- 轮询扫码状态（每 2 秒一次）
- 状态可视化展示
- 支持刷新二维码
- 登录成功后自动跳转

#### LoginPage.tsx
- 集成账号密码登录和扫码登录两种模式
- 模式切换 UI
- 错误处理

## 登录流程

### 流程 1：微信手机号快捷登录

1. **PC端**：生成小程序码并显示
2. **用户**：打开微信扫描小程序码
3. **小程序**：跳转到 scan 页面，解析 scanId
4. **小程序**：调用 `wx.login()` 获取 code，通知后端扫码
5. **PC端**：轮询检测到"已扫码"状态
6. **小程序**：跳转到协议页面
7. **用户**：勾选协议，点击"微信手机号快捷登录"
8. **小程序**：调用 `wx.getPhoneNumber()` 获取加密手机号
9. **小程序**：调用后端快捷登录接口，传递 encryptedData 和 iv
10. **后端**：解密手机号，查找或创建用户，生成 JWT token
11. **小程序**：显示登录成功，跳转到主页
12. **PC端**：轮询检测到"已确认"状态，保存 token 并跳转

### 流程 2：手动输入验证码登录

1-6 步同上
7. **用户**：勾选协议，点击"手动输入手机号登录"
8. **小程序**：跳转到手机号登录页面
9. **用户**：输入手机号，点击"发送验证码"
10. **小程序**：调用发送短信接口
11. **用户**：输入收到的验证码，点击"登录"
12. **小程序**：调用确认登录接口（传递 scanId、phone、smsCode）
13. **后端**：验证短信验证码，查找或创建用户，生成 JWT token
14. **小程序**：显示登录成功，跳转到主页
15. **PC端**：轮询检测到"已确认"状态，保存 token 并跳转

## 技术细节

### 1. 小程序码生成

使用微信 API 接口 `getwxacodeunlimit`，优点：
- 数量不限
- 可携带场景值（scene 参数）
- 永久有效

### 2. 手机号解密

使用 AES-128-CBC 算法解密微信返回的加密手机号数据：
```typescript
const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
```

### 3. 会话管理

扫码会话包含以下信息：
```typescript
interface QrCodeScanSession {
  scanId: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'expired';
  openid?: string;
  code?: string;
  sessionKey?: string;  // 用于解密手机号
  token?: string;
  user?: any;
  createdAt: number;
  expiresAt: number;    // 5分钟过期
}
```

### 4. Access Token 缓存

微信 Access Token 有效期 7200 秒，后端会自动缓存并在过期前 5 分钟刷新。

## 配置要求

### 环境变量

需要在 `.env` 文件中配置：

```env
# 微信小程序配置
WECHAT_APP_ID=wx88534d2b615d32a5
WECHAT_APP_SECRET=你的小程序密钥
```

### 小程序配置

在 `miniprogram/utils/config.js` 中配置后端 API 地址：

```javascript
module.exports = {
  apiBaseUrl: 'http://192.168.110.112:3002/api',
  appId: 'wx88534d2b615d32a5',
};
```

## 安全性

1. ✅ 使用 JWT 进行身份认证
2. ✅ 短信验证码有效期和错误次数限制
3. ✅ 扫码会话 5 分钟自动过期
4. ✅ 手机号解密使用微信官方算法
5. ✅ API 接口使用限流保护（Throttle）

## 待优化项

1. **生产环境优化**
   - [ ] 使用 Redis 存储扫码会话（替代内存存储）
   - [ ] 实现分布式锁避免并发问题
   - [ ] 添加扫码登录日志审计

2. **用户体验优化**
   - [ ] 支持微信内置浏览器直接跳转小程序
   - [ ] 添加扫码登录统计和分析
   - [ ] 优化小程序页面 UI 样式

3. **功能扩展**
   - [ ] 支持绑定已有账号
   - [ ] 支持多端登录管理
   - [ ] 添加登录通知推送

## 测试建议

### 本地测试

1. 启动后端服务
2. 启动前端开发服务器
3. 在微信开发者工具中打开小程序项目
4. 访问登录页面，切换到"扫码登录"模式
5. 使用微信开发者工具扫描小程序码进行测试

### 真机测试

1. 将小程序部署到体验版
2. 确保后端 API 地址可从外网访问
3. 在真机微信中扫描小程序码
4. 测试快捷登录和验证码登录两种方式

## 问题排查

### 1. 小程序码无法生成

- 检查 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 配置
- 查看后端日志中的错误信息
- 确认微信小程序已发布或设置为体验版

### 2. 扫码后无响应

- 检查小程序 `config.js` 中的 API 地址配置
- 确认后端服务可正常访问
- 查看小程序调试控制台的网络请求

### 3. 手机号解密失败

- 确保 `session_key` 正确保存
- 检查加密数据格式是否正确
- 验证 AppID 是否匹配

## 总结

该实现提供了完整的微信小程序扫码登录功能，支持快捷登录和验证码登录两种方式，具有良好的用户体验和安全性。代码结构清晰，易于维护和扩展。







