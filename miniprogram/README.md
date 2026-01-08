# Vioflow 小程序前端

## 项目结构

```
miniprogram/
├── app.js                 # 小程序入口文件
├── app.json               # 小程序配置
├── app.wxss               # 全局样式
├── sitemap.json           # 站点地图配置
├── project.config.json    # 项目配置
├── pages/                 # 页面目录
│   ├── login/            # 登录页面
│   │   ├── index.js
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   └── home/             # 首页
│       ├── index.js
│       ├── index.wxml
│       ├── index.wxss
│       └── index.json
└── utils/                 # 工具函数
    ├── api.js            # API 请求封装
    └── config.js         # 配置文件
```

## 功能特性

### 1. 登录功能
- ✅ 手机号验证码登录
- ✅ 微信一键登录
- ✅ 自动保存登录状态
- ✅ Token 自动刷新验证

### 2. API 封装
- ✅ 统一的请求封装
- ✅ 自动添加 Token
- ✅ 401 自动跳转登录
- ✅ 错误统一处理

### 3. 用户状态管理
- ✅ 全局用户信息存储
- ✅ 登录状态检查
- ✅ 自动登出功能

## 配置说明

### 1. API 地址配置

在 `utils/config.js` 中配置后端 API 地址：

```javascript
module.exports = {
  apiBaseUrl: 'https://your-api-domain.com/api',
  appId: 'wx88534d2b615d32a5',
};
```

### 2. 小程序 AppID

在 `project.config.json` 中已配置：
```json
{
  "appid": "wx88534d2b615d32a5"
}
```

### 3. 服务器域名配置

在微信公众平台配置服务器域名：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 开发 -> 开发管理 -> 开发设置 -> 服务器域名
4. 添加以下域名：
   - request 合法域名：`https://your-api-domain.com`
   - uploadFile 合法域名：`https://your-api-domain.com`
   - downloadFile 合法域名：`https://your-api-domain.com`

## 使用说明

### 1. 导入项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择 `miniprogram` 目录
4. 填写 AppID：`wx88534d2b615d32a5`

### 2. 配置 API 地址

编辑 `utils/config.js`，将 `apiBaseUrl` 修改为实际的后端 API 地址。

### 3. 运行项目

1. 在微信开发者工具中点击"编译"
2. 在模拟器中测试登录功能
3. 使用真机预览测试

## 页面说明

### 登录页面 (`pages/login/index`)

**功能**：
- 手机号输入和验证
- 验证码发送（带倒计时）
- 手机号登录
- 微信一键登录

**使用流程**：
1. 输入手机号
2. 点击"获取验证码"
3. 输入验证码
4. 点击"登录"

或直接点击"微信登录"进行一键登录。

### 首页 (`pages/home`)

**功能**：
- 显示用户信息
- 退出登录

## API 接口

### 认证相关

- `POST /api/auth/send-sms` - 发送短信验证码
- `POST /api/auth/phone-login` - 手机号登录
- `POST /api/auth/wechat-login` - 微信登录
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/logout` - 登出

## 开发注意事项

### 1. 网络请求

所有网络请求都通过 `utils/api.js` 封装，会自动：
- 添加 Token
- 处理 401 错误
- 统一错误处理

### 2. 登录状态

登录状态通过以下方式管理：
- Token 存储在 `wx.storage` 中
- 用户信息存储在 `app.globalData.user` 中
- 每次请求自动验证 Token

### 3. 页面跳转

- 未登录自动跳转到 `/pages/login/index`
- 登录成功跳转到 `/pages/home/index`
- 使用 `wx.switchTab` 跳转 tabBar 页面
- 使用 `wx.redirectTo` 跳转普通页面

## 后续开发

### 待实现功能

1. **视频列表页面**
   - 显示项目列表
   - 视频列表展示
   - 视频播放

2. **个人中心**
   - 用户信息编辑
   - 设置页面

3. **其他功能**
   - 根据业务需求扩展

## 常见问题

### Q: 登录后提示网络错误？
A: 检查 `utils/config.js` 中的 `apiBaseUrl` 是否正确配置，以及是否在微信公众平台配置了服务器域名。

### Q: 微信登录失败？
A: 检查后端是否正确配置了 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。

### Q: 验证码收不到？
A: 检查后端短信服务配置，开发环境验证码会在日志中输出。

## 相关文档

- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [后端 API 文档](../backend/src/modules/auth/README.md)






