import apiClient from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  is_active?: boolean;
  team_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export const usersApi = {
  // 获取所有用户
  getAll: async (): Promise<User[]> => {
    return apiClient.get('/users');
  },

  // 获取单个用户
  getOne: async (id: string): Promise<User> => {
    return apiClient.get(`/users/${id}`);
  },

  // 更新用户
  update: async (id: string, data: UpdateUserDto): Promise<User> => {
    return apiClient.patch(`/users/${id}`, data);
  },

  // 删除用户（如果后端支持）
  remove: async (id: string): Promise<void> => {
    return apiClient.delete(`/users/${id}`);
  },
};


