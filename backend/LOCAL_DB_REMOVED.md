# 本地数据库已删除

## 删除时间
$(date)

## 删除的数据库
- 数据库名: `vioflow_mam`
- 主机: `localhost`
- 端口: `5432`

## 当前配置
应用现在完全使用 Supabase 数据库，不再依赖本地数据库。

## 环境变量配置
确保 `backend/.env` 文件中配置了 `DATABASE_URL`：

```env
DATABASE_URL=postgresql://postgres.bejrwnamnxxdxoqwoxag:你的密码@aws-0-us-west-2.pooler.supabase.com:5432/postgres
```

## 注意事项
1. ✅ 所有数据已同步到 Supabase
2. ✅ 应用已配置为使用 Supabase
3. ✅ 本地数据库已删除
4. ⚠️  如果需要恢复本地数据库，需要重新创建并运行迁移脚本

## 恢复本地数据库（如果需要）
如果需要恢复本地数据库用于开发：

```bash
# 1. 创建数据库
createdb -h localhost -U postgres vioflow_mam

# 2. 运行迁移脚本
cd backend
npx ts-node src/database/check-db.ts
```


