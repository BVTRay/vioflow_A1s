# 后端 API 地址配置指南

## 当前后端 API 地址

根据项目配置，后端 API 地址如下：

### 开发环境

**本地开发**（在本地电脑上运行）：
```
http://localhost:3002/api
```

**服务器开发**（在服务器上运行）：
```
http://192.168.110.112:3002/api
```

### 生产环境

如果后端部署在 Railway：
```
https://your-railway-domain.railway.app/api
```

如果后端部署在其他平台，使用对应的域名。

## 如何配置

### 1. 修改配置文件

编辑 `miniprogram/utils/config.js`：

```javascript
module.exports = {
  // 根据实际情况修改这里的地址
  apiBaseUrl: 'http://192.168.110.112:3002/api', // 开发环境
  // apiBaseUrl: 'https://your-railway-domain.railway.app/api', // 生产环境
  
  appId: 'wx88534d2b615d32a5',
};
```

### 2. 不同环境的配置

#### 开发环境（本地测试）

如果后端在本地运行：
```javascript
apiBaseUrl: 'http://localhost:3002/api',
```

如果后端在服务器上运行：
```javascript
apiBaseUrl: 'http://192.168.110.112:3002/api',
```

#### 生产环境

如果后端部署在 Railway：
1. 登录 [Railway](https://railway.app)
2. 进入后端项目
3. 在 Settings → Networking 中查看域名
4. 配置为：`https://your-railway-domain.railway.app/api`

### 3. 微信小程序服务器域名配置

**重要**：必须在微信公众平台配置服务器域名，否则无法发起网络请求。

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 开发 → 开发管理 → 开发设置 → 服务器域名
4. 添加以下域名：

**request 合法域名**：
- 开发环境：`http://192.168.110.112:3002`（注意：微信小程序不支持 IP 地址，需要使用域名）
- 生产环境：`https://your-railway-domain.railway.app`

**⚠️ 重要提示**：
- 微信小程序**不支持**使用 IP 地址作为服务器域名
- 开发环境需要使用内网穿透工具（如 ngrok、frp）将本地服务暴露为公网域名
- 或者使用"不校验合法域名"选项（仅开发环境）

## 如何检查后端是否运行

### 1. 检查后端服务状态

```bash
# 检查端口是否监听
netstat -tlnp | grep 3002

# 或使用 curl 测试
curl http://192.168.110.112:3002/api/auth/me
```

### 2. 查看后端日志

后端启动时会输出：
```
✓ 后端服务已启动
✓ API地址: http://192.168.110.112:3002
```

## 常见问题

### Q: 小程序无法连接后端？

**可能原因**：
1. 后端服务未启动
2. API 地址配置错误
3. 未在微信公众平台配置服务器域名
4. 使用了 IP 地址（小程序不支持）

**解决方法**：
1. 确认后端服务正在运行
2. 检查 `utils/config.js` 中的 `apiBaseUrl` 配置
3. 在微信公众平台配置服务器域名
4. 开发环境可以开启"不校验合法域名"选项

### Q: 如何获取生产环境的 API 地址？

如果后端部署在 Railway：
1. 登录 Railway
2. 进入项目 → Settings → Networking
3. 查看 Public Domain
4. API 地址为：`https://your-domain.railway.app/api`

### Q: 开发环境可以使用 localhost 吗？

可以，但需要注意：
- 微信开发者工具中可以使用 `localhost`
- 真机预览时不能使用 `localhost`（需要使用服务器 IP 或域名）

## 推荐配置

### 开发环境

使用内网穿透工具（推荐）：
1. 使用 ngrok：`ngrok http 3002`
2. 获取公网地址：`https://xxxxx.ngrok.io`
3. 配置：`apiBaseUrl: 'https://xxxxx.ngrok.io/api'`
4. 在微信公众平台配置该域名

或使用"不校验合法域名"选项（仅开发环境）。

### 生产环境

使用 HTTPS 域名：
- Railway 自动提供的域名
- 或自定义域名（需要配置 DNS）






