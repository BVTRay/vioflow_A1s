# 开发者后台角色显示不一致问题

## 问题描述

在开发者后台看到的用户角色信息和数据库中的 `users.role` 字段不一致。

## 原因分析

开发者后台的 `getAllUsers()` 方法存在逻辑问题：

### 原始逻辑（有问题）

```typescript
role: activeTeamMember ? this.mapTeamRole(activeTeamMember.role) : '个人用户',
```

**问题**：
1. 如果用户有团队成员关系（`team_members`），显示的是**团队角色**（`team_members.role`），而不是用户的**系统角色**（`users.role`）
2. 如果用户没有团队成员关系，显示的是 `'个人用户'`，而不是数据库中的 `users.role` 值

### 数据库中的角色字段

- **`users.role`**：用户的系统角色（`admin`、`member`、`DEV_SUPER_ADMIN` 等）
- **`team_members.role`**：用户在团队中的角色（`super_admin`、`admin`、`member`）

这两个是不同的概念：
- 系统角色：用户在整个系统中的权限级别
- 团队角色：用户在特定团队中的权限级别

## 解决方案

已修复 `dev-admin.service.ts`，现在会：

1. **优先显示系统角色**（`users.role`）
2. **如果有团队角色，同时显示**：格式为 `系统角色 (团队角色)`
3. **如果没有团队，只显示系统角色**

### 修复后的显示格式

- 有团队：`Admin (Owner)` - 系统角色是 Admin，团队角色是 Owner
- 无团队：`Admin` - 只显示系统角色
- 特殊角色：`Dev Super Admin` - DEV_SUPER_ADMIN 角色

## 验证修复

修复后，开发者后台应该显示：

1. **系统角色**：来自 `users.role` 字段
2. **团队角色**（如果有）：来自 `team_members.role` 字段
3. **两者都显示**：格式为 `系统角色 (团队角色)`

## 数据库查询验证

可以在 Supabase SQL Editor 中运行以下查询验证：

```sql
-- 查看用户的系统角色和团队角色
SELECT 
    u.id,
    u.email,
    u.name,
    u.role as system_role,
    t.name as team_name,
    tm.role as team_role,
    tm.status as team_member_status
FROM users u
LEFT JOIN team_members tm ON tm.user_id = u.id AND tm.status = 'active'
LEFT JOIN teams t ON t.id = tm.team_id
ORDER BY u.created_at DESC;
```

## 常见情况

### 情况 1：用户有系统角色但没有团队

- 数据库：`users.role = 'admin'`，没有 `team_members` 记录
- 修复前显示：`个人用户` ❌
- 修复后显示：`Admin` ✅

### 情况 2：用户有系统角色和团队角色

- 数据库：`users.role = 'member'`，`team_members.role = 'super_admin'`
- 修复前显示：`Owner` ❌（只显示团队角色）
- 修复后显示：`Member (Owner)` ✅（同时显示）

### 情况 3：DEV_SUPER_ADMIN 角色

- 数据库：`users.role = 'DEV_SUPER_ADMIN'`
- 修复前显示：`个人用户` 或团队角色 ❌
- 修复后显示：`Dev Super Admin` ✅

## 相关文件

- `backend/src/modules/admin/dev-admin.service.ts` - 开发者后台服务
- `src/components/Admin/DevAdminPanel.tsx` - 前端显示组件

