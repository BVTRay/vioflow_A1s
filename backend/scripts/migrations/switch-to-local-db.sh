#!/bin/bash

# 切换到本地数据库配置的脚本

echo "================================================"
echo "  切换到本地数据库配置"
echo "================================================"
echo ""

ENV_FILE=".env"

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    exit 1
fi

# 备份现有配置
BACKUP_FILE=".env.supabase.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "✅ 已备份当前配置到: $BACKUP_FILE"
echo ""

# 创建新的配置文件
echo "📝 更新 .env 配置..."

# 注释掉 DATABASE_URL，添加本地数据库配置
sed -i 's/^DATABASE_URL=/#DATABASE_URL=/' "$ENV_FILE"

# 检查是否已有本地数据库配置
if ! grep -q "^DB_HOST=" "$ENV_FILE"; then
    cat >> "$ENV_FILE" << 'LOCALDB'

# ========================================
# 本地数据库配置
# ========================================
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=vioflow2026
DB_DATABASE=vioflow_mam
LOCALDB
fi

echo "✅ 配置已更新"
echo ""
echo "📋 新的数据库配置:"
echo "   Host: localhost:5432"
echo "   Database: vioflow_mam"
echo "   Username: postgres"
echo ""
echo "⚠️  注意: 请重启应用服务以使配置生效"
echo "   运行: npm run start:dev"
echo ""


