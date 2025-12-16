import apiClient from './client';
import { Project } from '../types';

export interface CreateProjectRequest {
  name: string;
  client: string;
  lead: string;
  postLead: string;
  group: string;
  teamId?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  client?: string;
  lead?: string;
  postLead?: string;
  group?: string;
}

export const projectsApi = {
  getAll: async (filters?: { status?: string; group?: string; month?: string; teamId?: string }): Promise<Project[]> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = filters?.teamId || apiClient.getTeamId();
    const params = currentTeamId ? { ...filters, teamId: currentTeamId } : filters;
    console.log('📡 请求项目列表:', { filters, currentTeamId, params });
    const result = await apiClient.get('/projects', { params });
    console.log('📥 收到项目列表:', result?.length || 0, '个项目');
    return result;
  },

  getActive: async (limit?: number, teamId?: string): Promise<Project[]> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { limit, teamId: currentTeamId } : { limit };
    return apiClient.get('/projects/active', { params });
  },

  getRecentOpened: async (limit?: number, teamId?: string): Promise<Project[]> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { limit, teamId: currentTeamId } : { limit };
    return apiClient.get('/projects/recent-opened', { params });
  },

  getById: async (id: string): Promise<Project> => {
    return apiClient.get(`/projects/${id}`);
  },

  create: async (data: CreateProjectRequest, teamId?: string): Promise<Project> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || data.teamId || apiClient.getTeamId();
    const params = currentTeamId ? { teamId: currentTeamId } : {};
    // 转换字段名：前端使用驼峰，后端需要下划线
    const requestData = {
      name: data.name,
      client: data.client,
      lead: data.lead,
      post_lead: data.postLead, // 转换为后端需要的字段名
      group: data.group,
      teamId: currentTeamId,
    };
    console.log('📤 创建项目请求:', requestData);
    return apiClient.post('/projects', requestData, { params }).catch((error) => {
      console.error('❌ 创建项目失败:', error);
      console.error('错误响应:', error.response?.data || error.message);
      throw error;
    });
  },

  update: async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    return apiClient.patch(`/projects/${id}`, data);
  },

  finalize: async (id: string): Promise<Project> => {
    return apiClient.post(`/projects/${id}/finalize`);
  },

  unlock: async (id: string, justification: string): Promise<Project> => {
    return apiClient.post(`/projects/${id}/unlock`, { justification });
  },

  updateLastOpened: async (id: string): Promise<void> => {
    return apiClient.patch(`/projects/${id}/last-opened`);
  },

  getMembers: async (id: string) => {
    return apiClient.get(`/projects/${id}/members`);
  },

  addMember: async (id: string, userId: string, role?: string) => {
    return apiClient.post(`/projects/${id}/members`, { userId, role });
  },

  remove: async (id: string): Promise<void> => {
    return apiClient.delete(`/projects/${id}`);
  },
};

