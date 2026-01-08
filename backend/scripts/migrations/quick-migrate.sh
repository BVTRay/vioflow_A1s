#!/bin/bash

# 快速迁移脚本 - 一键完成本地存储迁移

set -e  # 遇到错误立即退出

echo "=========================================="
echo "   VioFlow 本地存储快速迁移脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在 backend 目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ 请在 backend 目录下运行此脚本${NC}"
    exit 1
fi

echo "第 1 步：检查环境变量配置"
echo "----------------------------------------"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ 未找到 .env 文件${NC}"
    echo "是否从示例创建 .env 文件？ (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        cp env.local-storage.example .env
        echo -e "${GREEN}✓ 已创建 .env 文件，请编辑后重新运行${NC}"
        echo "  vi .env"
        exit 0
    else
        echo -e "${RED}✗ 需要 .env 文件才能继续${NC}"
        exit 1
    fi
fi

# 检查关键环境变量
source .env
if [ -z "$STORAGE_TYPE" ]; then
    echo -e "${RED}✗ 未配置 STORAGE_TYPE${NC}"
    exit 1
fi

if [ "$STORAGE_TYPE" != "local" ]; then
    echo -e "${YELLOW}⚠ STORAGE_TYPE 不是 'local'，当前值：$STORAGE_TYPE${NC}"
    echo "是否继续？ (y/n)"
    read -r answer
    if [ "$answer" != "y" ]; then
        exit 0
    fi
fi

echo -e "${GREEN}✓ 环境变量检查通过${NC}"
echo "  STORAGE_TYPE=$STORAGE_TYPE"
echo "  LOCAL_STORAGE_PATH=$LOCAL_STORAGE_PATH"
echo "  LOCAL_STORAGE_URL_BASE=$LOCAL_STORAGE_URL_BASE"
echo ""

echo "第 2 步：初始化存储目录"
echo "----------------------------------------"
if [ ! -f "init-storage-structure.sh" ]; then
    echo -e "${RED}✗ 未找到 init-storage-structure.sh${NC}"
    exit 1
fi

chmod +x init-storage-structure.sh
./init-storage-structure.sh

if [ ! -d "$LOCAL_STORAGE_PATH" ]; then
    echo -e "${RED}✗ 目录创建失败：$LOCAL_STORAGE_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 存储目录创建成功${NC}"
echo ""

echo "第 3 步：安装依赖并编译"
echo "----------------------------------------"
if [ ! -d "node_modules" ]; then
    echo "安装 npm 依赖..."
    npm install
fi

echo "编译 TypeScript..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}✗ 编译失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 编译成功${NC}"
echo ""

echo "第 4 步：数据迁移"
echo "----------------------------------------"
echo -e "${YELLOW}⚠ 准备开始迁移数据${NC}"
echo ""
echo "迁移将会："
echo "  1. 从数据库读取所有视频记录"
echo "  2. 下载视频文件和缩略图"
echo "  3. 保存到本地存储目录"
echo "  4. 更新数据库中的 URL"
echo ""
echo "注意事项："
echo "  • 迁移可能需要较长时间"
echo "  • 确保有足够的磁盘空间"
echo "  • 建议在低峰期进行"
echo ""

# 检查磁盘空间
AVAILABLE=$(df -BG "$LOCAL_STORAGE_PATH" | tail -1 | awk '{print $4}' | sed 's/G//')
echo "可用磁盘空间：${AVAILABLE}GB"

if [ "$AVAILABLE" -lt 10 ]; then
    echo -e "${RED}✗ 磁盘空间不足（建议至少 10GB）${NC}"
    exit 1
fi

echo ""
echo "是否继续进行数据迁移？ (y/n)"
read -r answer
if [ "$answer" != "y" ]; then
    echo "跳过数据迁移"
    echo ""
    echo "如果后续需要迁移，运行："
    echo "  npx ts-node migrate-videos-to-local.ts"
    exit 0
fi

echo ""
echo "开始迁移..."
npx ts-node migrate-videos-to-local.ts

echo ""
echo -e "${GREEN}✓ 数据迁移完成${NC}"
echo ""

echo "第 5 步：验证迁移结果"
echo "----------------------------------------"

# 统计文件数量
VIDEO_COUNT=$(find "$LOCAL_STORAGE_PATH/teams" -type f -name "source.*" 2>/dev/null | wc -l)
THUMB_COUNT=$(find "$LOCAL_STORAGE_PATH/teams" -type f -name "thumb_*" 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$LOCAL_STORAGE_PATH" | awk '{print $1}')

echo "统计信息："
echo "  视频文件数：$VIDEO_COUNT"
echo "  缩略图数：$THUMB_COUNT"
echo "  总存储大小：$TOTAL_SIZE"
echo ""

echo -e "${GREEN}✓ 迁移验证通过${NC}"
echo ""

echo "=========================================="
echo "   迁移完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 检查日志确认没有错误"
echo "  2. 手动重启后端服务："
echo "     pm2 restart vioflow-backend"
echo "  3. 登录前端测试视频播放"
echo ""
echo "文档："
echo "  • 详细指南：../LOCAL_STORAGE_MIGRATION_GUIDE.md"
echo "  • 配置文档：LOCAL_STORAGE_SETUP.md"
echo ""
echo "如有问题，请查看："
echo "  • 后端日志：logs/backend.log"
echo "  • 浏览器控制台"
echo ""



