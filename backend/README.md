# Vioflow MAM Backend API

## 项目说明

这是 Vioflow 视频管理系统的后端 API，基于 NestJS + TypeORM + PostgreSQL 构建。

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息。

### 3. 数据库设置

确保 PostgreSQL 已安装并运行，然后创建数据库：

```sql
CREATE DATABASE vioflow_mam;
```

### 4. 运行数据库迁移

```bash
npm run migration:run
```

### 5. 启动开发服务器

```bash
npm run start:dev
```

服务器将在 http://localhost:3000 启动。

## 项目结构

```
backend/
├── src/
│   ├── modules/          # 功能模块
│   │   ├── auth/        # 认证模块
│   │   ├── users/       # 用户管理
│   │   ├── projects/    # 项目管理
│   │   ├── videos/      # 视频管理
│   │   ├── tags/        # 标签管理
│   │   ├── uploads/     # 文件上传
│   │   ├── annotations/ # 批注管理
│   │   ├── shares/      # 分享链接
│   │   ├── deliveries/  # 交付管理
│   │   ├── showcase/    # 案例包管理
│   │   ├── dashboard/   # 工作台
│   │   ├── notifications/ # 通知管理
│   │   ├── archiving/   # 冷归档
│   │   ├── tracking/    # 观看追踪
│   │   └── search/      # 全局搜索
│   ├── database/        # 数据库配置
│   ├── common/          # 公共模块
│   └── main.ts          # 入口文件
├── package.json
└── tsconfig.json
```

## API 文档

### 认证

- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/logout` - 登出

### 项目管理

- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PATCH /api/projects/:id` - 更新项目
- `POST /api/projects/:id/finalize` - 项目定版
- `GET /api/projects/active` - 获取活跃项目
- `GET /api/projects/recent-opened` - 获取近期打开的项目

## 开发说明

### 添加新模块

1. 创建实体文件 `entities/*.entity.ts`
2. 创建 DTO 文件 `dto/*.dto.ts`
3. 创建服务文件 `*.service.ts`
4. 创建控制器文件 `*.controller.ts`
5. 创建模块文件 `*.module.ts`
6. 在 `app.module.ts` 中导入新模块

### 数据库迁移

生成迁移文件：
```bash
npm run migration:generate -- -n MigrationName
```

运行迁移：
```bash
npm run migration:run
```

回滚迁移：
```bash
npm run migration:revert
```

## 待完善功能

由于代码量较大，以下模块需要继续完善：

1. **视频模块** (`modules/videos/`)
   - 视频上传服务
   - 版本号自动分配
   - 视频元数据提取（FFmpeg）
   - 预览图生成

2. **标签模块** (`modules/tags/`)
   - 标签CRUD
   - 标签使用统计
   - 标签自动补全

3. **上传模块** (`modules/uploads/`)
   - 分片上传
   - 上传进度追踪
   - 文件存储集成

4. **批注模块** (`modules/annotations/`)
   - 批注CRUD
   - 批注PDF导出
   - 批注完成通知

5. **分享模块** (`modules/shares/`)
   - 分享链接生成
   - Token管理
   - 密码保护

6. **交付模块** (`modules/deliveries/`)
   - 交付流程管理
   - 文件夹结构自动创建
   - 交付包管理

7. **案例包模块** (`modules/showcase/`)
   - 案例包CRUD
   - 引用机制
   - 两种模式支持

8. **工作台模块** (`modules/dashboard/`)
   - 活跃项目查询
   - 快速操作

9. **通知模块** (`modules/notifications/`)
   - 通知CRUD
   - 实时推送

10. **冷归档模块** (`modules/archiving/`)
    - 定时任务
    - 文件迁移

11. **观看追踪模块** (`modules/tracking/`)
    - WebSocket集成
    - 观看进度记录

12. **搜索模块** (`modules/search/`)
    - 全局搜索
    - 搜索建议

## 存储服务集成

需要配置对象存储服务（AWS S3 / 阿里云OSS / 腾讯云COS），在 `.env` 中配置相关密钥。

## WebSocket 支持

系统使用 Socket.io 实现实时功能，需要配置 WebSocket 网关。

## 注意事项

1. 生产环境请修改 JWT_SECRET
2. 配置正确的 CORS 源
3. 设置合适的文件上传大小限制
4. 配置冷存储服务（如 AWS Glacier）

## 许可证

私有项目

