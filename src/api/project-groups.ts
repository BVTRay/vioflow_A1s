import apiClient from './client';

export interface ProjectGroup {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectGroupDto {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateProjectGroupDto {
  name?: string;
  description?: string;
  icon?: string;
}

export const projectGroupsApi = {
  // 创建项目组
  create: async (data: CreateProjectGroupDto, teamId?: string): Promise<ProjectGroup> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { teamId: currentTeamId } : {};
    return apiClient.post('/project-groups', data, { params });
  },

  // 获取所有项目组
  findAll: async (teamId?: string): Promise<ProjectGroup[]> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { teamId: currentTeamId } : {};
    return apiClient.get('/project-groups', { params });
  },

  // 获取单个项目组
  findOne: async (id: string, teamId?: string): Promise<ProjectGroup> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { teamId: currentTeamId } : {};
    return apiClient.get(`/project-groups/${id}`, { params });
  },

  // 更新项目组
  update: async (id: string, data: UpdateProjectGroupDto, teamId?: string): Promise<ProjectGroup> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { teamId: currentTeamId } : {};
    return apiClient.patch(`/project-groups/${id}`, data, { params });
  },

  // 删除项目组
  remove: async (id: string, teamId?: string): Promise<void> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { teamId: currentTeamId } : {};
    return apiClient.delete(`/project-groups/${id}`, { params });
  },
};

