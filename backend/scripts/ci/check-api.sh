#!/bin/bash

echo "检查后端API服务..."
echo ""

# 检查服务是否运行
if curl -s http://localhost:3000/api/auth/login > /dev/null 2>&1; then
    echo "✓ 后端服务正在运行"
    echo ""
    
    # 测试登录接口
    echo "测试登录接口..."
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@vioflow.com","password":"admin"}')
    
    if echo "$RESPONSE" | grep -q "access_token"; then
        echo "✓ 登录接口正常"
        TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        echo "✓ Token: ${TOKEN:0:20}..."
        echo ""
        
        # 测试获取项目列表
        echo "测试获取项目列表..."
        PROJECTS=$(curl -s -X GET http://localhost:3000/api/projects \
          -H "Authorization: Bearer $TOKEN")
        
        if echo "$PROJECTS" | grep -q "id"; then
            echo "✓ 项目列表接口正常"
            PROJECT_COUNT=$(echo "$PROJECTS" | grep -o '"id"' | wc -l | tr -d ' ')
            echo "✓ 找到 $PROJECT_COUNT 个项目"
        else
            echo "✗ 项目列表接口异常"
        fi
        
        # 测试获取标签列表
        echo ""
        echo "测试获取标签列表..."
        TAGS=$(curl -s -X GET http://localhost:3000/api/tags \
          -H "Authorization: Bearer $TOKEN")
        
        if echo "$TAGS" | grep -q "id"; then
            echo "✓ 标签列表接口正常"
            TAG_COUNT=$(echo "$TAGS" | grep -o '"id"' | wc -l | tr -d ' ')
            echo "✓ 找到 $TAG_COUNT 个标签"
        else
            echo "✗ 标签列表接口异常"
        fi
        
    else
        echo "✗ 登录失败，请检查种子数据是否已注入"
        echo "响应: $RESPONSE"
    fi
else
    echo "✗ 后端服务未运行"
    echo "请先启动服务: cd backend && npm run start:dev"
fi

