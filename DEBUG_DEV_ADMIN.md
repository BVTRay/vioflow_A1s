# 开发者后台调试指南

## 问题：点击开发者入口后页面没有显示

### 可能的原因

1. **用户角色未更新**
   - ray 用户的角色可能还没有更新为 `DEV_SUPER_ADMIN`
   - 需要执行 SQL 更新用户角色

2. **JWT Token 中的角色信息过期**
   - 即使数据库中的角色已更新，JWT token 中可能还是旧的角色
   - **解决方案**：需要重新登录以获取新的 token

3. **路由被拦截**
   - 检查浏览器控制台是否有错误信息
   - 检查网络请求是否成功

4. **权限检查失败**
   - 前端权限检查：`DevAdminRoute` 组件
   - 后端权限检查：`DevSuperAdminGuard`

## 调试步骤

### 1. 检查数据库中的用户角色

在 Supabase SQL Editor 中执行：

```sql
-- 检查 ray 用户的角色
SELECT id, email, name, role, is_active 
FROM users 
WHERE email = 'ray@bugong.com';

-- 如果角色不是 DEV_SUPER_ADMIN，执行更新
UPDATE users 
SET role = 'DEV_SUPER_ADMIN',
    updated_at = now()
WHERE email = 'ray@bugong.com';

-- 验证更新结果
SELECT id, email, name, role, is_active 
FROM users 
WHERE email = 'ray@bugong.com';
```

### 2. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页，应该能看到以下调试信息：

- `🔒 DevAdminRoute: 用户信息` - 显示用户角色
- `⚠️ DevAdminRoute: 权限不足` - 如果角色不匹配
- `✅ DevAdminRoute: 权限验证通过` - 如果权限检查通过
- `📊 DevAdminPanel: 组件已挂载` - 如果组件已加载
- `📊 DevAdminPanel: 开始调用 getAllUsers API` - API 调用开始
- `📊 DevAdminPanel: 成功获取用户数据` - API 调用成功

### 3. 检查网络请求

在浏览器开发者工具的 Network 标签页中：

1. 刷新页面或点击开发者后台入口
2. 查找以下请求：
   - `/api/auth/me` - 应该返回用户信息，包括 `role: "DEV_SUPER_ADMIN"`
   - `/api/admin/users` - 应该返回用户列表（如果权限通过）

### 4. 重新登录

**重要**：如果数据库中的角色已更新，但 JWT token 中还是旧的角色，需要：

1. 退出登录
2. 重新登录（使用 ray@bugong.com / admin）
3. 新的 token 会包含更新后的角色信息

### 5. 检查路由配置

确认路由顺序正确（`/admin/users` 应该在 `/*` 之前）：

```typescript
<Route path="/admin/users" ... />  // 应该在前面
<Route path="/*" ... />  // 应该在后面
```

## 常见错误信息

### 错误1：权限不足，重定向到首页

**原因**：用户角色不是 `DEV_SUPER_ADMIN`

**解决**：
1. 执行 SQL 更新用户角色
2. 重新登录获取新 token

### 错误2：403 Forbidden

**原因**：后端权限检查失败

**解决**：
1. 检查后端日志
2. 确认 `DevSuperAdminGuard` 正常工作
3. 确认 JWT token 有效

### 错误3：页面空白

**原因**：可能是路由被拦截或组件渲染失败

**解决**：
1. 检查浏览器控制台错误
2. 检查网络请求是否成功
3. 检查组件是否正确导入

## 快速修复

如果确认数据库中的角色已更新，但页面还是不显示：

1. **清除浏览器缓存和 localStorage**
   ```javascript
   // 在浏览器控制台执行
   localStorage.clear();
   location.reload();
   ```

2. **重新登录**
   - 退出登录
   - 使用 ray@bugong.com / admin 重新登录

3. **检查 URL**
   - 确认 URL 是 `/admin/users`
   - 不是 `/admin` 或其他路径

