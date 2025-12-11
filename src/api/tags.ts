import apiClient from './client';
import { Tag } from '../types';

export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    return apiClient.get('/tags');
  },

  getPopular: async (limit?: number): Promise<Tag[]> => {
    return apiClient.get('/tags/popular', { params: { limit } });
  },

  getSuggestions: async (query?: string): Promise<Tag[]> => {
    return apiClient.get('/tags/suggestions', { params: { q: query } });
  },

  create: async (name: string, category?: string): Promise<Tag> => {
    return apiClient.post('/tags', { name, category });
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/tags/${id}`);
  },
};

