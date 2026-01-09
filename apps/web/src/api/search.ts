import apiClient from './client';

export const searchApi = {
  global: async (query: string) => {
    return apiClient.get('/search/global', { params: { q: query } });
  },
};

