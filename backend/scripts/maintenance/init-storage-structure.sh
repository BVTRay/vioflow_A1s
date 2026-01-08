#!/bin/bash

# 本地存储目录初始化脚本
# 按照设计方案创建目录结构

STORAGE_ROOT="/www/wwwroot/vioflow_storage"

echo "========================================="
echo "初始化本地存储目录结构"
echo "存储根目录: $STORAGE_ROOT"
echo "========================================="

# 创建根目录
mkdir -p "$STORAGE_ROOT"
echo "✓ 创建根目录: $STORAGE_ROOT"

# 1. 临时上传区
mkdir -p "$STORAGE_ROOT/temp"
echo "✓ 创建临时上传区: $STORAGE_ROOT/temp"

# 2. 系统公共资源
mkdir -p "$STORAGE_ROOT/system/defaults"
mkdir -p "$STORAGE_ROOT/system/assets"
echo "✓ 创建系统资源目录"

# 3. 团队租户存储区
mkdir -p "$STORAGE_ROOT/teams"
echo "✓ 创建团队存储区: $STORAGE_ROOT/teams"

# 4. 个人用户存储区
mkdir -p "$STORAGE_ROOT/users"
echo "✓ 创建用户存储区: $STORAGE_ROOT/users"

# 设置权限（确保 Node.js 进程可以写入）
chmod -R 755 "$STORAGE_ROOT"
echo "✓ 设置目录权限"

echo ""
echo "========================================="
echo "目录结构创建完成！"
echo "========================================="
echo ""
echo "目录结构预览:"
tree -L 2 "$STORAGE_ROOT" 2>/dev/null || ls -laR "$STORAGE_ROOT"



