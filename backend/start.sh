#!/bin/bash

echo "=========================================="
echo "Vioflow MAM 后端服务启动脚本"
echo "=========================================="
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "✗ 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
fi

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "✓ 已创建 .env 文件，请编辑配置数据库信息"
fi

# 检查PostgreSQL连接
echo ""
echo "检查数据库连接..."
DB_HOST=$(grep DB_HOST .env | cut -d '=' -f2 | tr -d ' ')
DB_PORT=$(grep DB_PORT .env | cut -d '=' -f2 | tr -d ' ')
DB_USERNAME=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' ')
DB_DATABASE=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' ')

if command -v psql &> /dev/null; then
    if PGPASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' ') psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1" &> /dev/null; then
        echo "✓ 数据库连接成功"
        
        # 检查是否需要运行种子数据
        echo "检查种子数据..."
        PROJECT_COUNT=$(PGPASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' ') psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM projects;" 2>/dev/null | tr -d ' ')
        
        if [ "$PROJECT_COUNT" = "0" ] || [ -z "$PROJECT_COUNT" ]; then
            echo "⚠️  数据库为空，建议运行种子数据:"
            echo "   npx ts-node -r tsconfig-paths/register src/database/seeds/run-seed-simple.ts"
        else
            echo "✓ 数据库已有 $PROJECT_COUNT 个项目"
        fi
    else
        echo "⚠️  数据库连接失败，但将继续启动（开发模式会自动创建表）"
        echo "   请确保 PostgreSQL 已启动，或稍后手动运行种子数据"
    fi
else
    echo "⚠️  未找到 psql 命令，跳过数据库检查"
    echo "   请确保 PostgreSQL 已启动并配置正确"
fi

echo ""
echo "启动后端服务..."
echo "=========================================="
echo ""

npm run start:dev

