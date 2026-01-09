<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Vioflow MAM - Monorepo

这是一个 Monorepo 项目，包含前端 Web 应用、微信小程序和后端 API。

## 📁 项目结构

```
vioflow-mam-monorepo/
├── apps/                    # 应用目录
│   ├── web/                 # 前端 Web 应用 (React + Vite)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── miniprogram/        # 微信小程序
│       ├── app.js
│       ├── app.json
│       └── project.config.json
├── backend/                # 后端 API (NestJS)
│   ├── src/
│   └── package.json
├── docs/                   # 项目文档
├── package.json            # Monorepo 根配置
└── README.md
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
# 安装所有子项目的依赖
npm run install:all

# 或者分别安装
npm install                    # 根目录依赖
cd apps/web && npm install     # 前端依赖
cd ../../backend && npm install # 后端依赖
```

### 开发模式

```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run dev:web      # 启动前端 (http://localhost:3009)
npm run dev:backend  # 启动后端 (http://localhost:3002)
```

### 构建

```bash
# 构建所有项目
npm run build

# 或者分别构建
npm run build:web      # 构建前端
npm run build:backend  # 构建后端
```

## 📦 子项目说明

### apps/web - 前端 Web 应用

基于 React + Vite 的前端应用。

**启动：**
```bash
cd apps/web
npm run dev
```

**访问：** http://localhost:3009

### apps/miniprogram - 微信小程序

微信小程序应用。

**开发：**
1. 使用微信开发者工具打开 `apps/miniprogram` 目录
2. 配置 AppID
3. 开始开发

### backend - 后端 API

基于 NestJS 的后端 API 服务。

**启动：**
```bash
cd backend
npm run start:dev
```

**访问：** http://localhost:3002

## 📚 项目文档

项目文档已整理到 `docs/` 目录，请查看 [文档索引](docs/INDEX.md) 获取完整的文档列表。

### 快速导航
- 🚀 [快速开始指南](docs/setup/QUICK_START.md)
- 🔧 [修复记录](docs/fixes/)
- 📊 [状态报告](docs/reports/)
- 📖 [开发指南](docs/guides/)
- 🗄️ [数据库文档](docs/database/)
- 🐛 [故障排除](docs/troubleshooting/)
- 💻 [实现文档](docs/implementation/)

## 🛠️ 开发命令

### 根目录命令

```bash
npm run dev              # 同时启动前端和后端
npm run dev:web          # 仅启动前端
npm run dev:backend      # 仅启动后端
npm run build            # 构建所有项目
npm run build:web        # 构建前端
npm run build:backend    # 构建后端
npm run lint:web         # Lint 前端代码
npm run lint:backend     # Lint 后端代码
npm run test:web         # 测试前端
npm run test:backend     # 测试后端
```

### 前端命令 (apps/web)

```bash
cd apps/web
npm run dev              # 开发模式
npm run build            # 构建生产版本
npm run preview          # 预览构建结果
npm run lint             # 代码检查
npm run lint:fix         # 自动修复代码
npm run format           # 格式化代码
npm run test             # 单元测试
npm run test:e2e         # E2E 测试
```

### 后端命令 (backend)

```bash
cd backend
npm run start:dev        # 开发模式
npm run build            # 构建
npm run start:prod       # 生产模式
npm run migration:run    # 运行数据库迁移
```

## 📝 环境变量配置

### 前端 (apps/web)

创建 `apps/web/.env.local`：

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

### 后端 (backend)

复制 `backend/.env.example` 为 `backend/.env` 并配置：

```env
DATABASE_URL=postgresql://...
PORT=3002
JWT_SECRET=your-secret
# ... 其他配置
```

## 🔗 相关链接

- [前端 README](apps/web/README.md)
- [后端 README](backend/README.md)
- [小程序 README](apps/miniprogram/README.md)
- [文档索引](docs/INDEX.md)

## 📄 License

私有项目
