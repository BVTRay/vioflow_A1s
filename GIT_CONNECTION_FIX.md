# Git 连接 GitHub 问题解决方案

## 问题描述

Git 无法连接到 GitHub，出现以下错误：
- `Failed to connect to github.com port 443`
- `TLS connection was non-properly terminated`

## 解决方案

### 方案 1：使用 SSH 方式（推荐）

如果网络环境对 HTTPS 有限制，使用 SSH 更稳定：

1. **生成 SSH 密钥**（如果还没有）：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# 按 Enter 使用默认路径
# 可以设置密码或直接按 Enter
```

2. **添加 SSH 密钥到 GitHub**：
```bash
# 显示公钥
cat ~/.ssh/id_ed25519.pub
# 复制输出的内容
```

然后：
- 访问 https://github.com/settings/keys
- 点击 "New SSH key"
- 粘贴公钥内容
- 保存

3. **更改远程仓库地址为 SSH**：
```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1
git remote set-url origin git@github.com:BVTRay/vioflow_A1s.git
git pull origin main
```

### 方案 2：使用 Personal Access Token

如果必须使用 HTTPS：

1. **创建 Personal Access Token**：
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 选择权限：`repo`（完整仓库访问）
   - 生成并复制 token

2. **使用 token 进行认证**：
```bash
# 方式 1：在 URL 中使用 token（临时）
git remote set-url origin https://YOUR_TOKEN@github.com/BVTRay/vioflow_A1s.git
git pull origin main

# 方式 2：使用 Git Credential Helper（推荐）
git config --global credential.helper store
# 第一次 pull 时输入用户名和 token（密码处输入 token）
git pull origin main
```

### 方案 3：配置代理（如果有代理服务器）

如果服务器有代理：

```bash
# 设置 HTTP 代理
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy http://proxy.example.com:8080

# 如果代理需要认证
git config --global http.proxy http://username:password@proxy.example.com:8080

# 取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 方案 4：增加超时和重试（已配置）

已配置以下设置：
```bash
git config --global http.timeout 600
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```

### 方案 5：使用镜像或 CDN

如果 GitHub 访问不稳定，可以使用镜像：

```bash
# 使用 GitHub 镜像（如果可用）
git config --global url."https://github.com.cnpmjs.org/".insteadOf "https://github.com/"
```

## 临时解决方案

如果急需推送代码，可以：

1. **手动下载并合并**：
   - 在 GitHub 网页上查看最新代码
   - 手动复制更改到本地

2. **使用 GitHub CLI**（如果已安装）：
```bash
gh repo sync BVTRay/vioflow_A1s
```

3. **使用其他 Git 托管服务**：
   - 推送到 Gitee 或其他国内 Git 服务
   - 然后从那里同步

## 验证连接

测试连接是否正常：

```bash
# 测试 HTTPS 连接
curl -I https://github.com

# 测试 SSH 连接（如果配置了 SSH）
ssh -T git@github.com
```

## 当前状态

- ✅ Git 超时配置已优化
- ✅ HTTP 版本已设置为 HTTP/1.1
- ⚠️ 网络连接可能受防火墙或代理影响
- 💡 建议使用 SSH 方式或配置代理

## 推荐操作

1. **优先尝试 SSH 方式**（最稳定）
2. 如果 SSH 不可用，使用 Personal Access Token
3. 如果有代理，配置代理设置

