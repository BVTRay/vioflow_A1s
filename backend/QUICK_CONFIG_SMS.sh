#!/bin/bash

# 快速配置短信服务环境变量脚本

ENV_FILE=".env"

echo "================================================"
echo "  配置短信服务环境变量"
echo "================================================"
echo ""

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 创建 .env 文件..."
    touch "$ENV_FILE"
fi

# 检查是否已存在短信配置
if grep -q "SMS_PROVIDER" "$ENV_FILE"; then
    echo "⚠️  检测到已存在短信配置"
    read -p "是否要覆盖现有配置？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消配置"
        exit 0
    fi
    # 删除旧的短信配置
    sed -i '/^# 短信服务配置/,/^TENCENT_SMS_TEMPLATE_ID=/d' "$ENV_FILE"
fi

# 追加新的配置
echo "" >> "$ENV_FILE"
echo "# 短信服务配置（腾讯云）" >> "$ENV_FILE"
echo "SMS_PROVIDER=tencent" >> "$ENV_FILE"
echo "TENCENT_SMS_SECRET_ID=your_secret_id" >> "$ENV_FILE"
echo "TENCENT_SMS_SECRET_KEY=your_secret_key" >> "$ENV_FILE"
echo "TENCENT_SMS_APP_ID=1401074591" >> "$ENV_FILE"
echo "TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司" >> "$ENV_FILE"
echo "TENCENT_SMS_TEMPLATE_ID=2580851" >> "$ENV_FILE"

echo "✅ 配置已添加到 $ENV_FILE"
echo ""
echo "📋 配置内容："
echo "  SMS_PROVIDER=tencent"
echo "  TENCENT_SMS_SECRET_ID=your_secret_id"
echo "  TENCENT_SMS_SECRET_KEY=your_secret_key"
echo "  TENCENT_SMS_APP_ID=1401074591"
echo "  TENCENT_SMS_SIGN_NAME=北京不恭文化传媒有限公司"
echo "  TENCENT_SMS_TEMPLATE_ID=2580851"
echo ""
echo "⚠️  重要提示："
echo "  1. 配置已添加到 .env 文件"
echo "  2. 需要重启后端服务才能生效"
echo "  3. 建议测试发送验证码功能"
echo ""
echo "🧪 测试命令："
echo "  curl -X POST http://localhost:3002/api/auth/send-sms \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"phone\": \"13800138000\"}'"
echo ""






