import apiClient from './client';
import { Project } from '../types';

export const dashboardApi = {
  getActiveProjects: async (limit?: number, teamId?: string): Promise<Project[]> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { limit, teamId: currentTeamId } : { limit };
    return apiClient.get('/dashboard/active-projects', { params });
  },

  getRecentOpened: async (limit?: number, teamId?: string): Promise<Project[]> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = teamId || apiClient.getTeamId();
    const params = currentTeamId ? { limit, teamId: currentTeamId } : { limit };
    return apiClient.get('/dashboard/recent-opened', { params });
  },
};

