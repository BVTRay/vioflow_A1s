# 修复说明

## 问题 1: localhost:3009 无法访问

**原因**: Vite 配置已正确，但可能需要重启前端服务

**修复**:
- ✅ `vite.config.ts` 已配置 `host: '0.0.0.0'`，应该可以通过 localhost 访问
- 如果仍无法访问，请重启前端服务

**验证**:
```bash
# 检查端口监听
netstat -tlnp | grep 3009
# 应该看到: 0.0.0.0:3009
```

## 问题 2: 上传视频 500 错误

**原因**: 数据库缺少 `annotation_count` 列

**修复步骤**:

### 方法 1: 在 Supabase Dashboard 中执行（推荐）

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 打开 SQL Editor
4. 执行以下 SQL:

```sql
ALTER TABLE videos ADD COLUMN IF NOT EXISTS annotation_count integer DEFAULT 0;

-- 更新现有记录的 annotation_count
UPDATE videos 
SET annotation_count = (
  SELECT COUNT(*) 
  FROM annotations 
  WHERE annotations.video_id = videos.id
)
WHERE annotation_count = 0 OR annotation_count IS NULL;
```

### 方法 2: 使用命令行（如果服务器有 psql）

```bash
cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
cat .env | grep DATABASE_URL | sed 's/DATABASE_URL=//' | xargs psql -c "ALTER TABLE videos ADD COLUMN IF NOT EXISTS annotation_count integer DEFAULT 0;"
```

## 问题 3: API 地址问题

**原因**: 通过 IP 访问时，API 请求仍然指向 localhost:3002

**修复**:
- ✅ 已更新 `src/api/client.ts` 和 `src/api/upload.ts`，现在会根据当前访问的域名动态调整 API 地址
- ✅ 已更新后端监听地址为 `0.0.0.0`，允许通过 IP 访问

**验证**:
- 通过 `192.168.110.112:3009` 访问时，API 请求应该指向 `http://192.168.110.112:3002/api`
- 通过 `localhost:3009` 访问时，API 请求应该指向 `http://localhost:3002/api`

## 下一步操作

1. **执行数据库迁移**（必须）:
   - 在 Supabase Dashboard 的 SQL Editor 中运行上面的 SQL

2. **重启后端服务**:
   ```bash
   cd /www/wwwroot/vioflow-A/vioflow_A1s-1/backend
   # 停止当前服务
   lsof -ti:3002 | xargs kill -9
   # 重新启动
   nohup npm run start:dev > /tmp/nest.log 2>&1 &
   ```

3. **验证修复**:
   - 尝试通过 `localhost:3009` 访问前端
   - 尝试通过 `192.168.110.112:3009` 访问前端
   - 尝试上传一个视频，应该不再出现 500 错误


