# 数据库规划方案更新 - 功能调整补充

## 一、新需求分析

### 1.1 新增功能点

#### 功能1：浏览区批量操作
- **需求**：浏览区添加「批量选择」复选框，操作台增加批量处理按钮（批量上传、批量打标、批量生成分享链接）
- **数据库影响**：✅ **无需调整** - 这是前端功能，数据库层面都是基于现有表的批量操作

#### 功能2：设置模块集中管理分享链接
- **需求**：管理员及超级管理员在设置中可以集中管理审阅链接、交付链接、案例包链接
- **管理内容**：
  - 是否允许查看
  - 是否允许下载
  - 查看下载记录
- **数据库影响**：⚠️ **需要补充** - 需要详细的访问记录和下载记录

### 1.2 现有功能检查

#### share_links 表现有字段
- ✅ `allow_download` - 是否允许下载
- ✅ `is_active` - 是否激活（可理解为是否允许查看）
- ✅ `download_count` - 下载次数（仅计数）
- ❌ **缺少**：详细的下载记录
- ❌ **缺少**：查看记录（谁查看过链接）

## 二、需要补充的数据库结构

### 2.1 新增表：share_link_access_logs（分享链接访问记录表）

**用途**：记录所有分享链接的访问和下载行为

```sql
-- 分享链接访问记录表
CREATE TABLE IF NOT EXISTS "share_link_access_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "share_link_id" uuid NOT NULL REFERENCES "share_links"("id") ON DELETE CASCADE,
  "action" varchar(20) NOT NULL, -- 'view', 'download'
  "viewer_ip" varchar(45),
  "viewer_user_agent" varchar(500),
  "viewer_email" varchar(255), -- 访客邮箱（如果有）
  "viewer_name" varchar(100), -- 访客名称（如果有）
  "resource_type" varchar(50), -- 'video', 'delivery_package', 'showcase_package'
  "resource_id" uuid, -- 访问的资源ID
  "file_name" varchar(255), -- 下载的文件名（如果是下载操作）
  "file_size" bigint, -- 下载的文件大小（如果是下载操作）
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_access_logs_share_link" ON "share_link_access_logs"("share_link_id");
CREATE INDEX IF NOT EXISTS "idx_access_logs_action" ON "share_link_access_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_access_logs_created" ON "share_link_access_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_access_logs_resource" ON "share_link_access_logs"("resource_type", "resource_id");
```

**设计说明**：
- 记录每次访问（view）和下载（download）操作
- 记录访问者信息（IP、User-Agent、邮箱、名称）
- 记录访问的资源信息
- 支持按分享链接、操作类型、时间范围查询

### 2.2 修改 share_links 表（可选优化）

**当前字段已足够，但可以考虑添加**：

```sql
-- 可选：添加允许查看的明确字段（虽然可以用is_active，但更明确）
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "allow_view" boolean DEFAULT true;

-- 可选：添加最后访问时间
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "last_accessed_at" timestamp;

-- 可选：添加访问次数（与download_count对应）
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;
```

**注意**：这些字段是可选的，因为：
- `allow_view` 可以通过 `is_active` 和 `expires_at` 判断
- `last_accessed_at` 和 `view_count` 可以通过 `share_link_access_logs` 表统计

### 2.3 批量操作支持

**数据库层面**：无需新增表，因为批量操作都是基于现有表的：
- 批量上传：基于 `videos` 表
- 批量打标：基于 `video_tags` 表
- 批量生成分享链接：基于 `share_links` 表

**应用层实现**：
- 前端：提供批量选择UI
- 后端：提供批量操作API（接收ID数组，批量处理）

## 三、功能覆盖验证

### 3.1 批量操作功能 ✅

| 功能 | 数据库支持 | 说明 |
|------|-----------|------|
| 批量上传 | ✅ | 基于 `videos` 表，循环插入 |
| 批量打标 | ✅ | 基于 `video_tags` 表，批量插入 |
| 批量生成分享链接 | ✅ | 基于 `share_links` 表，批量插入 |

### 3.2 集中管理分享链接功能 ✅

| 功能 | 数据库支持 | 说明 |
|------|-----------|------|
| 查看所有分享链接 | ✅ | 基于 `share_links` 表，按团队过滤 |
| 管理是否允许查看 | ✅ | 通过 `share_links.is_active` 和 `expires_at` |
| 管理是否允许下载 | ✅ | 通过 `share_links.allow_download` |
| 查看访问记录 | ✅ | 通过 `share_link_access_logs` 表（新增） |
| 查看下载记录 | ✅ | 通过 `share_link_access_logs` 表，过滤 `action='download'` |
| 查看下载统计 | ✅ | 通过 `share_links.download_count` 或统计 `share_link_access_logs` |

## 四、SQL 迁移脚本补充

### 4.1 新增表创建脚本

```sql
-- ============================================
-- 分享链接访问记录表
-- ============================================

CREATE TABLE IF NOT EXISTS "share_link_access_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "share_link_id" uuid NOT NULL REFERENCES "share_links"("id") ON DELETE CASCADE,
  "action" varchar(20) NOT NULL, -- 'view', 'download'
  "viewer_ip" varchar(45),
  "viewer_user_agent" varchar(500),
  "viewer_email" varchar(255),
  "viewer_name" varchar(100),
  "resource_type" varchar(50),
  "resource_id" uuid,
  "file_name" varchar(255),
  "file_size" bigint,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_access_logs_share_link" ON "share_link_access_logs"("share_link_id");
CREATE INDEX IF NOT EXISTS "idx_access_logs_action" ON "share_link_access_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_access_logs_created" ON "share_link_access_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_access_logs_resource" ON "share_link_access_logs"("resource_type", "resource_id");
```

### 4.2 可选优化字段（如果需要）

```sql
-- 可选：添加允许查看的明确字段
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "allow_view" boolean DEFAULT true;

-- 可选：添加最后访问时间
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "last_accessed_at" timestamp;

-- 可选：添加访问次数
ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_share_links_allow_view" ON "share_links"("allow_view");
CREATE INDEX IF NOT EXISTS "idx_share_links_last_accessed" ON "share_links"("last_accessed_at");
```

### 4.3 触发器（自动更新统计）

```sql
-- 自动更新 share_links 的访问统计
CREATE OR REPLACE FUNCTION update_share_link_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action = 'view' THEN
    UPDATE share_links
    SET 
      view_count = COALESCE(view_count, 0) + 1,
      last_accessed_at = NEW.created_at
    WHERE id = NEW.share_link_id;
  ELSIF NEW.action = 'download' THEN
    UPDATE share_links
    SET 
      download_count = COALESCE(download_count, 0) + 1,
      last_accessed_at = NEW.created_at
    WHERE id = NEW.share_link_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_share_link_stats ON share_link_access_logs;
CREATE TRIGGER trigger_update_share_link_stats
AFTER INSERT ON share_link_access_logs
FOR EACH ROW
EXECUTE FUNCTION update_share_link_stats();
```

## 五、API 设计建议

### 5.1 批量操作 API

```typescript
// 批量打标
POST /api/videos/batch-tag
Body: {
  videoIds: string[],
  tagIds: string[]
}

// 批量生成分享链接
POST /api/shares/batch-create
Body: {
  videoIds: string[],
  allowDownload: boolean,
  hasPassword: boolean,
  password?: string
}
```

### 5.2 分享链接管理 API

```typescript
// 获取团队所有分享链接（设置页面）
GET /api/shares/team/all
Query: {
  type?: 'video_review' | 'delivery_package' | 'showcase_package',
  page?: number,
  limit?: number
}

// 获取分享链接访问记录
GET /api/shares/:id/access-logs
Query: {
  action?: 'view' | 'download',
  startDate?: string,
  endDate?: string,
  page?: number,
  limit?: number
}

// 更新分享链接权限
PUT /api/shares/:id/permissions
Body: {
  allowView: boolean,
  allowDownload: boolean,
  isActive: boolean
}

// 获取分享链接统计
GET /api/shares/:id/stats
Response: {
  viewCount: number,
  downloadCount: number,
  lastAccessedAt: string,
  recentAccess: AccessLog[]
}
```

## 六、数据查询示例

### 6.1 查询团队所有分享链接

```sql
SELECT 
  sl.*,
  p.name as project_name,
  v.name as video_name,
  dp.title as delivery_title,
  sp.name as showcase_name
FROM share_links sl
LEFT JOIN projects p ON p.id = sl.project_id
LEFT JOIN videos v ON v.id = sl.video_id
LEFT JOIN delivery_packages dp ON dp.id = sl.delivery_package_id
LEFT JOIN showcase_packages sp ON sp.id = sl.showcase_package_id
WHERE p.team_id = ? OR v.project_id IN (
  SELECT id FROM projects WHERE team_id = ?
)
ORDER BY sl.created_at DESC;
```

### 6.2 查询分享链接访问记录

```sql
SELECT 
  al.*,
  sl.type as share_link_type,
  sl.token as share_link_token
FROM share_link_access_logs al
JOIN share_links sl ON sl.id = al.share_link_id
WHERE al.share_link_id = ?
  AND (?::varchar IS NULL OR al.action = ?)
  AND (?::timestamp IS NULL OR al.created_at >= ?)
  AND (?::timestamp IS NULL OR al.created_at <= ?)
ORDER BY al.created_at DESC
LIMIT ? OFFSET ?;
```

### 6.3 统计分享链接使用情况

```sql
SELECT 
  sl.id,
  sl.type,
  sl.token,
  COUNT(CASE WHEN al.action = 'view' THEN 1 END) as view_count,
  COUNT(CASE WHEN al.action = 'download' THEN 1 END) as download_count,
  MAX(al.created_at) as last_accessed_at
FROM share_links sl
LEFT JOIN share_link_access_logs al ON al.share_link_id = sl.id
WHERE sl.created_by IN (
  SELECT user_id FROM team_members WHERE team_id = ?
)
GROUP BY sl.id, sl.type, sl.token
ORDER BY last_accessed_at DESC NULLS LAST;
```

## 七、总结

### 7.1 需要补充的内容

1. ✅ **新增表**：`share_link_access_logs` - 记录所有访问和下载行为
2. ⚠️ **可选优化**：`share_links` 表添加 `allow_view`、`last_accessed_at`、`view_count` 字段
3. ✅ **触发器**：自动更新访问统计

### 7.2 不需要调整的内容

1. ✅ **批量操作**：基于现有表，无需新增表结构
2. ✅ **其他功能**：现有数据库结构已完全支持

### 7.3 实施优先级

- **P0（必须）**：创建 `share_link_access_logs` 表
- **P1（推荐）**：添加触发器自动更新统计
- **P2（可选）**：优化 `share_links` 表字段

### 7.4 功能覆盖验证

✅ 所有新需求都可以通过补充后的数据库结构实现
✅ 没有发现无法实现的逻辑漏洞
✅ 数据完整性约束完善
✅ 性能优化方案明确

