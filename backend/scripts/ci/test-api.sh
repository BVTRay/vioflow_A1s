#!/bin/bash

echo "=========================================="
echo "测试后端 API 连接和数据"
echo "=========================================="
echo ""

API_BASE="http://localhost:3002/api"

# 1. 测试健康检查
echo "1. 测试健康检查端点..."
HEALTH=$(curl -s "$API_BASE/../health" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✓ 健康检查成功"
  echo "$HEALTH" | head -3
else
  echo "✗ 健康检查失败"
fi
echo ""

# 2. 测试登录
echo "2. 测试登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@vioflow.com","password":"admin"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "accessToken\|access_token"; then
  echo "✓ 登录成功"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  if [ -z "$TOKEN" ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .access_token' 2>/dev/null)
  fi
  echo "Token: ${TOKEN:0:30}..."
else
  echo "✗ 登录失败"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# 3. 测试获取项目列表
echo "3. 测试获取项目列表..."
PROJECTS=$(curl -s -X GET "$API_BASE/projects" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if echo "$PROJECTS" | grep -q "id\|name"; then
  PROJECT_COUNT=$(echo "$PROJECTS" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "✓ 获取项目列表成功"
  echo "  找到 $PROJECT_COUNT 个项目"
  echo "$PROJECTS" | head -10
else
  echo "✗ 获取项目列表失败"
  echo "响应: $PROJECTS"
fi
echo ""

# 4. 测试获取标签列表
echo "4. 测试获取标签列表..."
TAGS=$(curl -s -X GET "$API_BASE/tags" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if echo "$TAGS" | grep -q "id\|name"; then
  TAG_COUNT=$(echo "$TAGS" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "✓ 获取标签列表成功"
  echo "  找到 $TAG_COUNT 个标签"
else
  echo "✗ 获取标签列表失败"
  echo "响应: $TAGS"
fi
echo ""

# 5. 测试获取视频列表
echo "5. 测试获取视频列表..."
VIDEOS=$(curl -s -X GET "$API_BASE/videos" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if echo "$VIDEOS" | grep -q "id\|name"; then
  VIDEO_COUNT=$(echo "$VIDEOS" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "✓ 获取视频列表成功"
  echo "  找到 $VIDEO_COUNT 个视频"
else
  echo "✗ 获取视频列表失败"
  echo "响应: $VIDEOS"
fi
echo ""

# 6. 测试 Dashboard API
echo "6. 测试 Dashboard API..."
DASHBOARD=$(curl -s -X GET "$API_BASE/dashboard/active-projects?limit=5" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if echo "$DASHBOARD" | grep -q "id\|name"; then
  DASHBOARD_COUNT=$(echo "$DASHBOARD" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "✓ Dashboard API 成功"
  echo "  找到 $DASHBOARD_COUNT 个活跃项目"
else
  echo "✗ Dashboard API 失败"
  echo "响应: $DASHBOARD"
fi
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

