# 权限统一说明

## 问题描述

云端版本无法访问设置页面，原因是权限检查逻辑在本地和云端不一致。

## 根本原因

TypeORM 的枚举字段在不同环境下可能返回不同格式：
- **本地开发**：可能返回枚举对象
- **云端生产**：可能返回字符串

导致前端权限检查 `user?.role === 'admin'` 失败。

## 解决方案

### 后端统一处理

在以下位置确保 `role` 字段始终返回字符串格式：

1. **`auth.service.ts` - `validateUser` 方法**：
   ```typescript
   // 确保 role 为字符串格式（统一本地和云端）
   if (result.role && typeof result.role !== 'string') {
     result.role = String(result.role);
   }
   ```

2. **`auth.service.ts` - `login` 方法**：
   ```typescript
   // 确保 role 为字符串格式（统一本地和云端）
   const role = typeof user.role === 'string' ? user.role : String(user.role);
   ```

3. **`auth.service.ts` - `validateToken` 方法**：
   ```typescript
   // 确保 role 为字符串格式（统一本地和云端）
   if (user.role && typeof user.role !== 'string') {
     user.role = String(user.role) as any;
   }
   ```

4. **`auth.controller.ts` - `getProfile` 方法**：
   ```typescript
   // 确保 role 返回为字符串格式（统一本地和云端）
   const role = typeof req.user.role === 'string' ? req.user.role : String(req.user.role);
   ```

### 前端权限检查

前端统一使用字符串比较：

```typescript
const isAdmin = user?.role === 'admin';
```

## 用户角色枚举

数据库中的角色枚举值：
- `'admin'` - 管理员（可以访问设置页面）
- `'member'` - 成员
- `'viewer'` - 查看者
- `'sales'` - 销售

## 测试账号

- **管理员**：`admin@vioflow.com` / `admin` - 可以访问设置页面
- **成员**：`sarah@vioflow.com` / `admin` - 不能访问设置页面

## 验证方法

1. **登录管理员账号**
2. **访问设置页面**：点击侧边栏的"设置"图标
3. **应该能正常访问**，而不是显示"您没有权限访问设置页面"

## 注意事项

- 所有返回用户信息的 API 端点都应该确保 `role` 字段是字符串格式
- 如果添加新的用户相关 API，也要遵循这个规则
- 前端权限检查统一使用 `user?.role === 'admin'` 格式

