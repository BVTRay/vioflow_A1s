#!/bin/bash

# 导入数据到本地 PostgreSQL 的脚本

echo "================================================"
echo "  导入数据到本地 PostgreSQL"
echo "================================================"

# 数据库配置
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="vioflow2026"
DB_NAME="vioflow_mam"

# 查找最新的导出文件
EXPORT_DIR=$(ls -dt database_export_* 2>/dev/null | head -1)

if [ -z "$EXPORT_DIR" ]; then
    echo "❌ 错误: 未找到导出目录"
    echo "请先运行 ./export-from-supabase.sh 导出数据"
    exit 1
fi

SQL_FILE="$EXPORT_DIR/full_database.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 错误: 未找到 SQL 文件: $SQL_FILE"
    exit 1
fi

echo "📁 找到导出文件: $SQL_FILE"
echo "📊 文件大小: $(du -h "$SQL_FILE" | cut -f1)"
echo ""

# 确认操作
read -p "⚠️  这将清空并重建 $DB_NAME 数据库。确认继续? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo ""
echo "🗑️  清空现有数据库..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null

echo "📥 开始导入数据..."
echo "   这可能需要几分钟时间，请耐心等待..."
echo ""

# 导入数据
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$SQL_FILE" \
    -v ON_ERROR_STOP=1 \
    --quiet

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据导入成功!"
    echo ""
    echo "📊 验证数据..."
    
    # 统计表数量和记录数
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\echo ''
\echo '=== 数据库表统计 ==='
SELECT 
    schemaname as schema,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
GROUP BY schemaname;

\echo ''
\echo '=== 主要表的记录数 ==='
SELECT 
    tablename,
    (xpath('/row/count/text()', 
           query_to_xml(format('SELECT COUNT(*) FROM %I.%I', schemaname, tablename), false, true, ''))
    )[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('users', 'teams', 'projects', 'videos', 'annotations')
ORDER BY tablename;
EOF
    
    echo ""
    echo "✨ 迁移完成！"
    echo ""
    echo "📝 下一步:"
    echo "   1. 修改 .env 配置使用本地数据库"
    echo "   2. 重启应用服务"
    
else
    echo ""
    echo "❌ 导入失败"
    echo "请检查错误信息"
    exit 1
fi


