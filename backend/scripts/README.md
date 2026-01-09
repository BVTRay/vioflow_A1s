# 脚本目录说明

本目录包含项目的所有运维和工具脚本，按功能分类。

## 📁 目录结构

### migrations/ - 数据迁移脚本
一次性数据迁移脚本，通常在特定场景下使用一次。

| 脚本 | 说明 | 使用方式 | 状态 |
|------|------|----------|------|
| `migrate-r2-to-local.ts` | R2云存储迁移到本地 | `npx ts-node scripts/migrations/migrate-r2-to-local.ts` | 已完成可归档 |
| `migrate-videos-to-local.ts` | 视频文件迁移到本地 | `npx ts-node scripts/migrations/migrate-videos-to-local.ts` | 已完成可归档 |
| `export-from-supabase.sh` | 从Supabase导出数据 | `sh scripts/migrations/export-from-supabase.sh` | 按需使用 |
| `import-to-local.sh` | 导入数据到本地数据库 | `sh scripts/migrations/import-to-local.sh` | 按需使用 |
| `switch-to-local-db.sh` | 切换到本地数据库 | `sh scripts/migrations/switch-to-local-db.sh` | 已完成可归档 |
| `quick-migrate.sh` | 快速迁移工具 | `sh scripts/migrations/quick-migrate.sh` | 按需使用 |
| `add_annotation_fields.js` | 添加注释字段到数据库 | `node scripts/migrations/add_annotation_fields.js` | 已完成可归档 |

### maintenance/ - 维护工具
日常维护和数据检查工具，可重复使用。

| 脚本 | 说明 | 使用方式 | 频率 |
|------|------|----------|------|
| `regenerate-thumbnails.ts` | ⭐ 重新生成视频缩略图 | `npx ts-node scripts/maintenance/regenerate-thumbnails.ts` | 按需 |
| `check-video-urls.ts` | 检查视频URL有效性 | `npx ts-node scripts/maintenance/check-video-urls.ts` | 定期 |
| `check-deleted-videos.ts` | 检查已删除的视频 | `npx ts-node scripts/maintenance/check-deleted-videos.ts` | 定期 |
| `check-r2-thumbnails.ts` | 检查R2存储的缩略图 | `npx ts-node scripts/maintenance/check-r2-thumbnails.ts` | 定期 |
| `check-thumbnail-progress.ts` | 检查缩略图生成进度 | `npx ts-node scripts/maintenance/check-thumbnail-progress.ts` | 按需 |
| `check_annotation.js` | 检查注释数据完整性 | `node scripts/maintenance/check_annotation.js` | 定期 |
| `init-storage-structure.sh` | 初始化存储目录结构 | `sh scripts/maintenance/init-storage-structure.sh` | 按需 |

### ci/ - CI/CD脚本
持续集成、部署和测试相关脚本。

| 脚本 | 说明 | 使用方式 | 用途 |
|------|------|----------|------|
| `start.sh` | 启动服务脚本 | `sh scripts/ci/start.sh` | 部署 |
| `check-api.sh` | API健康检查 | `sh scripts/ci/check-api.sh` | 监控 |
| `test-api.sh` | API功能测试 | `sh scripts/ci/test-api.sh` | 测试 |

## 🚀 使用建议

### 1. 添加到 package.json

建议在 `package.json` 中添加常用脚本的快捷命令：

```json
{
  "scripts": {
    "start:custom": "sh scripts/ci/start.sh",
    "test:api": "sh scripts/ci/test-api.sh",
    "check:api": "sh scripts/ci/check-api.sh",
    "maintenance:thumbnails": "ts-node scripts/maintenance/regenerate-thumbnails.ts",
    "maintenance:check-videos": "ts-node scripts/maintenance/check-video-urls.ts",
    "migrate:r2-local": "ts-node scripts/migrations/migrate-r2-to-local.ts"
  }
}
```

然后可以使用 `npm run` 命令：
```bash
npm run maintenance:thumbnails
npm run test:api
```

### 2. TypeScript 脚本注意事项

部分脚本可能需要访问 NestJS 的依赖注入容器中的 Service。如果遇到问题：

- 确保脚本中正确初始化了 NestJS 应用
- 考虑重构为 NestJS Standalone Application
- 或使用 `nestjs-command` 库

### 3. Shell 脚本权限

如果遇到权限问题，记得添加执行权限：
```bash
chmod +x scripts/ci/*.sh
chmod +x scripts/migrations/*.sh
chmod +x scripts/maintenance/*.sh
```

## 📝 维护建议

1. **已完成的迁移脚本**: 标记为"已完成可归档"的脚本可以移到 `scripts/archive/` 目录
2. **定期运行**: 建议每月运行一次检查类脚本
3. **日志记录**: 运行脚本时记录日志，便于追踪问题
4. **版本控制**: 脚本修改后及时提交到 Git

## ⚠️ 安全提示

- 运行迁移脚本前先备份数据
- 在生产环境运行脚本前先在测试环境验证
- 不要在脚本中硬编码敏感信息（如密码、密钥）
- 使用环境变量管理配置

---

如有问题，请参考 `BACKEND_CLEANUP_SUMMARY.md` 或联系团队技术负责人。










