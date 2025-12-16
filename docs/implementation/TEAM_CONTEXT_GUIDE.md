# 团队上下文管理指南

## 📋 概述

`TeamContext` 提供了全局的团队状态管理，确保所有 API 请求都自动带上当前团队的 `team_id`。

## 🎯 核心功能

### 1. 自动加载默认团队

用户登录后，系统会：
1. 从 `users` 表的 `team_id` 读取默认团队
2. 如果用户有多个团队，优先使用 `team_id` 指定的团队
3. 如果没有 `team_id`，从 localStorage 恢复上次选择的团队
4. 如果都没有，使用第一个团队

### 2. 团队切换

提供 `switchTeam(teamId)` 方法，允许用户切换团队：
- 更新当前团队状态
- 保存到 localStorage
- 自动更新 API 客户端的 `team_id`

### 3. 自动注入 team_id

所有 API 请求会自动：
- 在请求头中添加 `X-Team-Id`
- 在查询参数中添加 `teamId`（如果 API 需要）

## 🔧 使用方法

### 在组件中使用

```tsx
import { useTeam } from '../src/contexts/TeamContext';

const MyComponent = () => {
  const { currentTeam, teams, switchTeam, loading } = useTeam();

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <p>当前团队: {currentTeam?.name}</p>
      <button onClick={() => switchTeam(teams[1].id)}>
        切换到第二个团队
      </button>
    </div>
  );
};
```

### 在 API 调用中使用

API 客户端会自动添加 `team_id`，无需手动传递：

```tsx
// 自动带上当前团队的 team_id
const groups = await projectGroupsApi.findAll();

// 也可以手动指定 team_id（会覆盖自动添加的）
const groups = await projectGroupsApi.findAll('specific-team-id');
```

## 📦 API 客户端集成

### 请求拦截器

`apiClient` 会自动在请求中添加：

1. **请求头**：`X-Team-Id: <team-id>`
2. **查询参数**：`?teamId=<team-id>`（如果请求有 params）

### 设置团队 ID

```tsx
import apiClient from './api/client';

// 手动设置（通常由 TeamContext 自动管理）
apiClient.setTeamId('team-uuid');

// 获取当前团队 ID
const teamId = apiClient.getTeamId();
```

## 🎨 UI 组件

### TeamSwitcher 组件

已创建的 `TeamSwitcher` 组件可以在 Header 中使用：

```tsx
import { TeamSwitcher } from '../UI/TeamSwitcher';

<TeamSwitcher />
```

组件特性：
- 显示当前团队名称
- 如果有多个团队，显示下拉菜单
- 点击切换团队
- 自动保存选择

## 🔄 数据刷新

切换团队后，可能需要刷新相关数据：

```tsx
const { switchTeam, refreshTeams } = useTeam();

const handleSwitch = async (teamId: string) => {
  await switchTeam(teamId);
  // 刷新项目列表
  await loadProjects();
  // 刷新其他数据...
};
```

## ⚠️ 注意事项

1. **团队权限**：确保用户有权限访问切换的团队
2. **数据隔离**：切换团队后，所有数据查询都会基于新团队
3. **状态同步**：切换团队不会自动刷新页面数据，需要手动刷新
4. **localStorage**：团队选择会持久化到 localStorage

## 🐛 故障排除

### 问题 1：无法加载团队

**检查**：
- 用户是否已登录
- `teamsApi.findAll()` 是否返回数据
- 用户是否有团队成员身份

### 问题 2：API 请求没有 team_id

**检查**：
- `apiClient.setTeamId()` 是否被调用
- 请求拦截器是否正确配置
- 浏览器控制台是否有错误

### 问题 3：切换团队后数据未更新

**解决方案**：
- 手动刷新相关数据
- 使用 `refreshTeams()` 刷新团队列表
- 检查 API 是否正确使用 team_id 过滤

## 📝 示例代码

### 完整示例

```tsx
import React, { useEffect } from 'react';
import { useTeam } from '../src/contexts/TeamContext';
import { projectsApi } from '../src/api/projects';

const ProjectsList = () => {
  const { currentTeam, switchTeam, teams } = useTeam();
  const [projects, setProjects] = React.useState([]);

  useEffect(() => {
    if (currentTeam) {
      loadProjects();
    }
  }, [currentTeam]);

  const loadProjects = async () => {
    // API 会自动带上当前团队的 team_id
    const data = await projectsApi.getAll();
    setProjects(data);
  };

  return (
    <div>
      <h2>当前团队: {currentTeam?.name}</h2>
      {teams.length > 1 && (
        <select onChange={(e) => switchTeam(e.target.value)}>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      )}
      <ul>
        {projects.map(project => (
          <li key={project.id}>{project.name}</li>
        ))}
      </ul>
    </div>
  );
};
```

## ✅ 完成检查清单

- [x] TeamContext 已创建
- [x] TeamProvider 已集成到 App
- [x] API 客户端已更新（自动添加 team_id）
- [x] TeamSwitcher 组件已创建
- [x] Header 已集成 TeamSwitcher
- [x] 后端 auth/me 已返回 team_id
- [x] useAuth 已更新（包含 team_id）
- [x] 文档已完善

---

**提示**：所有 API 请求现在都会自动带上当前团队的 `team_id`，无需手动传递！


