import apiClient from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return apiClient.get('/users');
  },
};

