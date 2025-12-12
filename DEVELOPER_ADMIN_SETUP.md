# 开发者后台管理页面设置指南

## 概述

开发者后台管理页面是一个独立的用户管理界面，仅对具有 `DEV_SUPER_ADMIN` 角色的用户开放。该页面提供了完整的用户 CRUD 操作、密码重置、模拟登录等功能。

## 功能特性

1. **用户列表展示**：显示所有用户的 UserID、Username、Email、Phone、Team Name、Role、Status
2. **编辑用户**：可以编辑用户的 Email、Phone、激活状态
3. **重置密码**：将用户密码重置为默认密码 `123456`
4. **模拟登录**：以目标用户身份生成 token 并登录，用于测试权限
5. **软删除**：将用户设置为非激活状态

## 访问路径

- **路由**：`/admin/users`
- **权限要求**：用户必须具有 `DEV_SUPER_ADMIN` 角色

## 入口位置

在开发阶段，开发者后台入口在以下两个位置可见（所有登录用户都能看到入口，但只有 `DEV_SUPER_ADMIN` 角色才能访问）：

1. **Header 用户菜单**：
   - 点击右上角用户头像
   - 在下拉菜单中点击"开发者后台"（黄色高亮显示）
   - 位于"个人信息设置"和"退出登录"之间

2. **Sidebar 底部**：
   - 在左侧边栏底部，设置按钮下方
   - 显示终端图标（Terminal）
   - 鼠标悬停显示提示："开发者后台（仅 DEV_SUPER_ADMIN 可访问）"

**注意**：如果用户没有 `DEV_SUPER_ADMIN` 角色，点击入口后会重定向到首页并提示权限不足。

## 设置步骤

### 1. 数据库迁移

在 Supabase SQL Editor 或数据库管理工具中运行以下 SQL：

```sql
-- 添加 DEV_SUPER_ADMIN 角色到枚举类型
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'DEV_SUPER_ADMIN' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')
  ) THEN
    ALTER TYPE user_role_enum ADD VALUE 'DEV_SUPER_ADMIN';
  END IF;
END $$;
```

### 2. 创建开发者超级管理员用户

有两种方式创建具有 `DEV_SUPER_ADMIN` 角色的用户：

#### 方式1：更新现有用户角色

```sql
-- 将某个用户的角色更新为 DEV_SUPER_ADMIN
UPDATE users 
SET role = 'DEV_SUPER_ADMIN' 
WHERE email = 'your-email@example.com';
```

#### 方式2：创建新用户

```sql
-- 创建新的开发者超级管理员用户
-- 注意：password_hash 需要使用 bcrypt 加密，这里只是示例
-- 实际使用时，应该使用后端 API 创建用户，或者使用 bcrypt 工具生成哈希

INSERT INTO users (email, name, password_hash, role, is_active)
VALUES (
  'dev@admin.com',
  'Developer Admin',
  '$2b$10$YourHashedPasswordHere', -- 使用 bcrypt 加密的密码
  'DEV_SUPER_ADMIN',
  true
);
```

### 3. 使用开发者后台

1. 使用具有 `DEV_SUPER_ADMIN` 角色的用户登录系统
2. 访问 `/admin/users` 路径
3. 如果权限不足，会自动重定向到首页

## API 端点

所有 API 端点都需要 JWT 认证和 `DEV_SUPER_ADMIN` 角色：

- `GET /api/admin/users` - 获取所有用户列表
- `PATCH /api/admin/users/:id` - 更新用户信息
- `POST /api/admin/users/:id/reset-password` - 重置用户密码为 123456
- `POST /api/admin/users/:id/impersonate` - 模拟登录（生成 token）
- `DELETE /api/admin/users/:id` - 软删除用户（设置为非激活）

## 安全注意事项

1. **角色保护**：所有 API 端点都使用 `DevSuperAdminGuard` 进行保护
2. **密码安全**：密码哈希不会返回给前端，只提供重置功能
3. **模拟登录**：模拟登录会替换当前会话，请谨慎使用
4. **软删除**：删除操作是软删除，不会真正删除数据库记录

## 文件结构

### 后端文件

- `backend/src/modules/users/entities/user.entity.ts` - 用户实体（已添加 DEV_SUPER_ADMIN 角色）
- `backend/src/modules/auth/guards/dev-super-admin.guard.ts` - 角色守卫
- `backend/src/modules/admin/dev-admin.service.ts` - 开发者后台服务
- `backend/src/modules/admin/dev-admin.controller.ts` - 开发者后台控制器
- `backend/src/modules/admin/dev-admin.module.ts` - 开发者后台模块

### 前端文件

- `src/api/dev-admin.ts` - 开发者后台 API 客户端
- `src/components/Admin/DevAdminPanel.tsx` - 开发者后台页面组件
- `src/AppWithRouter.tsx` - 路由配置（已添加 /admin/users 路由）

## 故障排除

### 问题1：访问 /admin/users 时提示权限不足

**解决方案**：
1. 确认用户角色是否为 `DEV_SUPER_ADMIN`
2. 检查数据库中用户表的 role 字段值
3. 确认 JWT token 中包含正确的角色信息

### 问题2：数据库枚举类型更新失败

**解决方案**：
- PostgreSQL 的枚举类型更新需要在事务外执行
- 如果使用 Supabase，直接在 SQL Editor 中执行，不要使用事务块

### 问题3：模拟登录后无法正常使用

**解决方案**：
- 模拟登录会替换当前 token，确保目标用户账户是激活状态
- 如果目标用户没有团队，可能需要先创建团队

## 开发建议

1. **测试环境**：建议在开发环境先测试所有功能
2. **权限验证**：定期检查权限守卫是否正常工作
3. **日志记录**：考虑添加操作日志，记录所有管理员操作
4. **密码策略**：默认密码 `123456` 仅用于开发，生产环境应使用更强的密码策略

