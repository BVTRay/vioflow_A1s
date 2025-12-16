# 给不恭文化的ray用户授予开发者后台权限

## 操作说明

已为不恭文化的ray用户（邮箱：`ray@bugong.com`）创建了SQL脚本，用于授予开发者超级管理员权限。

## 执行步骤

### 1. 在 Supabase SQL Editor 中执行

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 打开文件：`backend/src/database/migrations/grant-dev-admin-to-ray.sql`
4. 复制所有SQL内容
5. 粘贴到 SQL Editor 中
6. 点击"Run"执行

### 2. 或者直接执行以下SQL

```sql
-- 确保 DEV_SUPER_ADMIN 角色已添加到枚举类型
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

-- 更新ray用户的角色
UPDATE users 
SET role = 'DEV_SUPER_ADMIN',
    updated_at = now()
WHERE email = 'ray@bugong.com';

-- 验证结果
SELECT id, email, name, role, is_active 
FROM users 
WHERE email = 'ray@bugong.com';
```

## 验证

执行SQL后，应该看到：
- `role` 字段值为 `DEV_SUPER_ADMIN`
- `updated_at` 字段已更新为当前时间

## 使用

更新完成后，ray用户（ray@bugong.com）可以：

1. **登录系统**
   - 邮箱：ray@bugong.com
   - 密码：admin（如果未更改）

2. **访问开发者后台**
   - 点击右上角用户头像 → "开发者后台"
   - 或点击左侧边栏底部的终端图标
   - 访问路径：`/admin/users`

3. **功能权限**
   - 查看所有用户列表
   - 编辑用户信息
   - 重置用户密码
   - 模拟登录其他用户
   - 软删除用户

## 注意事项

- 此操作会更新ray用户的系统角色（`users.role`字段）
- 不影响ray在团队中的角色（`team_members.role`字段）
- ray仍然是不恭文化团队的超级管理员（`super_admin`）
- 现在ray同时拥有系统级别的开发者权限和团队级别的超级管理员权限


