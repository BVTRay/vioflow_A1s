import apiClient from './client';
import { ShowcasePackage } from '../types';

export const showcaseApi = {
  getAll: async (): Promise<ShowcasePackage[]> => {
    return apiClient.get('/showcase/packages');
  },

  getById: async (id: string): Promise<ShowcasePackage> => {
    return apiClient.get(`/showcase/packages/${id}`);
  },

  create: async (data: {
    name: string;
    description: string;
    mode: 'quick_player' | 'pitch_page';
    clientName?: string;
    videoIds: string[];
  }): Promise<ShowcasePackage> => {
    return apiClient.post('/showcase/packages', data);
  },

  generateLink: async (id: string): Promise<{ link: string }> => {
    return apiClient.post(`/showcase/packages/${id}/generate-link`);
  },

  getTracking: async (id: string) => {
    return apiClient.get(`/showcase/packages/${id}/tracking`);
  },
};

