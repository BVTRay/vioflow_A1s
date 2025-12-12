import apiClient from './client';
import { Video } from '../types';

export const videosApi = {
  getAll: async (filters?: { projectId?: string; isCaseFile?: boolean; teamId?: string }): Promise<Video[]> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = filters?.teamId || apiClient.getTeamId();
    const params = currentTeamId ? { ...filters, teamId: currentTeamId } : filters;
    console.log('📡 请求视频列表:', { filters, currentTeamId, params });
    const result = await apiClient.get('/videos', { params });
    console.log('📥 收到视频列表:', result?.length || 0, '个视频');
    return result;
  },

  getById: async (id: string): Promise<Video> => {
    return apiClient.get(`/videos/${id}`);
  },

  getVersions: async (id: string): Promise<Video[]> => {
    return apiClient.get(`/videos/${id}/versions`);
  },

  updateTags: async (id: string, tagIds: string[]): Promise<Video> => {
    return apiClient.patch(`/videos/${id}/tags`, { tagIds });
  },

  toggleCaseFile: async (id: string): Promise<Video> => {
    return apiClient.patch(`/videos/${id}/case-file`);
  },

  toggleMainDelivery: async (id: string): Promise<Video> => {
    return apiClient.patch(`/videos/${id}/main-delivery`);
  },

  createReference: async (id: string, projectId: string): Promise<Video> => {
    return apiClient.post(`/videos/${id}/create-reference`, { projectId });
  },
};

