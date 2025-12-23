#!/bin/bash

# 前端服务启动脚本
# 使用方法: ./start-frontend.sh [pm2|nohup|dev]

cd "$(dirname "$0")"

MODE=${1:-dev}

case $MODE in
  pm2)
    echo "🚀 使用 PM2 启动前端服务..."
    pm2 start npm --name vioflow-frontend -- run dev
    pm2 save
    echo "✅ 前端服务已启动（PM2）"
    echo "📊 查看状态: pm2 status"
    echo "📋 查看日志: pm2 logs vioflow-frontend"
    ;;
  nohup)
    echo "🚀 使用 nohup 启动前端服务..."
    nohup npm run dev > frontend.log 2>&1 &
    echo $! > frontend.pid
    echo "✅ 前端服务已启动（后台运行）"
    echo "📋 查看日志: tail -f frontend.log"
    echo "🛑 停止服务: kill \$(cat frontend.pid)"
    ;;
  dev|*)
    echo "🚀 启动前端开发服务器..."
    echo "📍 服务地址: http://localhost:3009"
    echo "📍 服务地址: http://192.168.110.112:3009"
    echo ""
    npm run dev
    ;;
esac







