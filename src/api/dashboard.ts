import apiClient from './client';
import { Project } from '../types';

export const dashboardApi = {
  getActiveProjects: async (limit?: number): Promise<Project[]> => {
    return apiClient.get('/dashboard/active-projects', { params: { limit } });
  },

  getRecentOpened: async (limit?: number): Promise<Project[]> => {
    return apiClient.get('/dashboard/recent-opened', { params: { limit } });
  },
};

