# 登录功能实施指南

## 📋 功能概述

根据您的需求，已实现以下登录功能：

### 网页端登录
1. **默认登录方式**：手机号 + 验证码登录
   - 未注册用户自动注册
   - 输入手机号 → 获取验证码 → 输入验证码 → 登录

2. **微信扫码登录**：
   - 页面显示二维码
   - 用户扫码后跳转到小程序
   - 前端自动轮询扫码状态
   - 扫码确认后自动登录

### 小程序端登录流程

1. **扫码后流程**：
   - 用户扫码 → 进入 `pages/scan/index`（自动处理）
   - 跳转到 `pages/agreement/index`（用户协议页面）
   - 用户勾选"已阅读并同意 用户协议｜隐私政策"
   - 选择登录方式：
     - **微信手机号快捷登录**：点击按钮获取微信手机号
     - **手动输入手机号**：跳转到 `pages/phone-login/index`

2. **手机号登录页面**：
   - 输入手机号
   - 获取验证码
   - 输入验证码
   - 登录成功

## 🔧 需要配置的内容

### 1. 小程序扫码跳转配置

当前二维码使用 `weixin://dl/business/?t=${scanId}` 格式，需要配置小程序扫码跳转规则：

**方式一：使用小程序码（推荐）**
- 在微信公众平台配置扫码跳转规则
- 或使用微信小程序码 API 生成二维码

**方式二：使用 H5 中转页面**
- 创建 H5 页面，接收扫码参数
- H5 页面跳转到小程序

**方式三：使用自定义协议**
- 配置自定义 URL Scheme
- 小程序处理该协议

### 2. 微信手机号解密接口（待实现）

当前微信手机号快捷登录会跳转到手动输入页面。要实现真正的快捷登录，需要：

**后端接口**：
```typescript
POST /api/auth/wechat-phone-decrypt
{
  encryptedData: string;  // 加密的手机号数据
  iv: string;             // 初始向量
  scanId: string;        // 扫码ID
  code: string;          // 微信登录 code
}
```

**实现步骤**：
1. 使用 `session_key` 解密手机号
2. 使用手机号进行登录或注册
3. 调用确认扫码登录接口完成登录

## 📁 文件结构

### 后端新增文件
- `backend/src/modules/auth/services/qrcode-scan.service.ts` - 扫码会话管理
- `backend/src/modules/auth/dto/wechat-qrcode.dto.ts` - 扫码相关 DTO

### 前端新增文件
- `src/components/Auth/PhoneLoginPage.tsx` - 新的登录页面

### 小程序新增页面
- `miniprogram/pages/scan/index.*` - 扫码处理页面
- `miniprogram/pages/agreement/index.*` - 用户协议页面
- `miniprogram/pages/phone-login/index.*` - 手机号登录页面

## 🚀 使用流程

### 网页端登录

1. 访问登录页面
2. 输入手机号，点击"获取验证码"
3. 输入验证码，点击"登录"
4. 或使用微信扫码登录

### 小程序端登录

1. 用户扫码网页上的二维码
2. 小程序自动打开并处理扫码
3. 显示用户协议页面
4. 勾选协议后选择登录方式
5. 完成登录

## ⚠️ 注意事项

1. **二维码跳转**：当前需要配置小程序扫码跳转规则，否则扫码无法跳转到小程序

2. **微信手机号解密**：需要后端实现解密接口，当前快捷登录会跳转到手动输入

3. **扫码会话存储**：当前使用内存存储，生产环境建议使用 Redis

4. **验证码存储**：当前使用内存存储，生产环境建议使用 Redis

## 📝 API 接口

### 网页端
- `POST /api/auth/send-sms` - 发送短信验证码
- `POST /api/auth/phone-login` - 手机号登录
- `POST /api/auth/wechat-qrcode` - 生成扫码二维码
- `GET /api/auth/wechat-qrcode/:scanId` - 检查扫码状态

### 小程序端
- `POST /api/auth/wechat-qrcode/scan` - 扫码接口
- `POST /api/auth/wechat-qrcode/confirm` - 确认登录接口

## 🔄 下一步优化

1. 实现微信手机号解密接口
2. 配置小程序扫码跳转规则
3. 使用 Redis 存储会话和验证码
4. 优化用户体验和错误处理






