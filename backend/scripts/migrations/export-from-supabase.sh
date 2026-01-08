#!/bin/bash

# 从 Supabase 导出数据库的脚本

echo "================================================"
echo "  从 Supabase 导出数据到本地"
echo "================================================"

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: 未找到 DATABASE_URL 环境变量"
    echo "请确保 .env 文件中包含 DATABASE_URL"
    exit 1
fi

# 解析 DATABASE_URL
echo "📡 连接到 Supabase 数据库..."

# 提取数据库连接信息
SUPABASE_URL="$DATABASE_URL"

# 创建导出目录
EXPORT_DIR="./database_export_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"

echo "📂 导出目录: $EXPORT_DIR"

# 导出数据库结构和数据
echo ""
echo "📋 导出数据库结构和数据..."
echo "🔗 使用连接: ${SUPABASE_URL:0:30}..."

# 直接使用 DATABASE_URL 进行导出（pg_dump 会自动解析）
pg_dump "$SUPABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    -f "$EXPORT_DIR/full_database.sql" 2>&1

DUMP_EXIT_CODE=$?

if [ $DUMP_EXIT_CODE -eq 0 ]; then
    echo "✅ 数据库导出成功!"
    echo "📁 文件位置: $EXPORT_DIR/full_database.sql"
    
    # 显示文件大小
    FILE_SIZE=$(du -h "$EXPORT_DIR/full_database.sql" | cut -f1)
    echo "📊 文件大小: $FILE_SIZE"
    
    # 显示表统计
    echo ""
    echo "📈 导出统计:"
    grep -c "^CREATE TABLE" "$EXPORT_DIR/full_database.sql" | xargs -I {} echo "  - 表数量: {} 个"
    grep -c "^COPY.*FROM stdin" "$EXPORT_DIR/full_database.sql" | xargs -I {} echo "  - 数据表: {} 个"
    
    echo ""
    echo "✨ 下一步: 将数据导入本地数据库"
    echo "运行命令: ./import-to-local.sh"
else
    echo "❌ 导出失败"
    exit 1
fi

