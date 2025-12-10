import apiClient from './client';
import { Video } from '../types';

export const videosApi = {
  getAll: async (filters?: { projectId?: string; isCaseFile?: boolean }): Promise<Video[]> => {
    return apiClient.get('/videos', { params: filters });
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

