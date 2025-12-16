# Supabase 环境变量配置指南

## 如何从 Supabase 获取环境变量

### 1. 登录 Supabase Dashboard

访问：https://supabase.com/dashboard

使用您的账号登录。

### 2. 选择您的项目

在项目列表中找到您的项目：`bejrwnamnxxdxoqwoxag`

或者直接访问：https://supabase.com/dashboard/project/bejrwnamnxxdxoqwoxag

### 3. 获取环境变量

#### 3.1 获取 SUPABASE_URL

1. 在左侧菜单中，点击 **Settings**（设置）
2. 点击 **API**
3. 在 **Project URL** 部分，您会看到类似这样的 URL：
   ```
   https://bejrwnamnxxdxoqwoxag.supabase.co
   ```
4. 复制这个 URL，这就是您的 `SUPABASE_URL`

#### 3.2 获取 SUPABASE_SERVICE_KEY（重要！）

⚠️ **重要**：必须使用 `service_role` key，不要使用 `anon` key！

1. 在同一个 **Settings → API** 页面
2. 找到 **Project API keys** 部分
3. 您会看到两个 key：
   - `anon` `public` - **不要使用这个**
   - `service_role` `secret` - **使用这个**
4. 点击 `service_role` key 旁边的 **眼睛图标** 或 **Reveal** 按钮来显示 key
5. 复制完整的 key（以 `eyJ...` 开头，很长的一串字符）
6. 这就是您的 `SUPABASE_SERVICE_KEY`

**注意**：
- `service_role` key 拥有完全的管理权限，**永远不要**在前端代码中使用
- 只能在后端服务器环境中使用
- 如果泄露，请立即在 Supabase Dashboard 中重新生成

#### 3.3 确认存储桶名称

1. 在左侧菜单中，点击 **Storage**（存储）
2. 查看存储桶列表
3. 确认有一个名为 `videos` 的存储桶
4. 如果没有，需要创建一个：
   - 点击 **New bucket**
   - 名称填写：`videos`
   - 选择 **Public bucket**（公开）或 **Private bucket**（私有）
   - 点击 **Create bucket**

### 4. 配置后端环境变量

在您的后端项目（Railway 或其他部署平台）中，设置以下环境变量：

```env
SUPABASE_URL=https://bejrwnamnxxdxoqwoxag.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlanJ3bmFtbnh4ZHhvcXdveGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTgxMjM0MywiZXhwIjoyMDUxMzg4MzQzfQ.您的完整key
SUPABASE_STORAGE_BUCKET=videos
```

### 5. 本地开发环境配置

如果您在本地开发，在 `backend/.env` 文件中添加：

```env
SUPABASE_URL=https://bejrwnamnxxdxoqwoxag.supabase.co
SUPABASE_SERVICE_KEY=您的service_role_key
SUPABASE_STORAGE_BUCKET=videos
```

### 6. 验证配置

配置完成后，可以通过以下方式验证：

1. **后端测试端点**：
   ```
   GET http://localhost:3002/api/upload/test-supabase
   ```
   需要先登录获取 token，然后在请求头中添加：
   ```
   Authorization: Bearer <your_token>
   ```

2. **查看后端启动日志**：
   如果配置正确，后端启动时不会显示 Supabase 配置缺失的警告。

### 7. 常见问题

#### Q: 找不到 service_role key？
A: 确保您有项目的管理员权限。如果没有，请联系项目管理员。

#### Q: service_role key 显示为 `***`？
A: 点击旁边的眼睛图标或 "Reveal" 按钮来显示完整的 key。

#### Q: 上传文件时提示 "Supabase is not configured"？
A: 
1. 检查环境变量是否正确设置
2. 检查环境变量名称是否正确（区分大小写）
3. 重启后端服务
4. 检查 `.env` 文件是否在正确的位置（`backend/.env`）

#### Q: 上传文件时提示权限错误？
A: 
1. 确保使用的是 `service_role` key，不是 `anon` key
2. 检查存储桶是否存在
3. 检查存储桶的权限设置

### 8. 安全提示

- ✅ `service_role` key 只能在后端使用
- ✅ 永远不要将 `service_role` key 提交到 Git 仓库
- ✅ 使用环境变量管理敏感信息
- ✅ 定期轮换 API keys
- ❌ 不要在前端代码中使用 `service_role` key
- ❌ 不要将 key 硬编码在代码中



