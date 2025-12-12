import apiClient from './client';

export interface DevAdminUser {
  id: string;
  username: string;
  email: string;
  phone: string;
  teamName: string;
  role: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface UpdateUserDto {
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export const devAdminApi = {
  getAllUsers: async (): Promise<DevAdminUser[]> => {
    return apiClient.get('/admin/users');
  },

  updateUser: async (id: string, data: UpdateUserDto): Promise<any> => {
    return apiClient.patch(`/admin/users/${id}`, data);
  },

  resetPassword: async (id: string): Promise<void> => {
    return apiClient.post(`/admin/users/${id}/reset-password`);
  },

  softDeleteUser: async (id: string): Promise<void> => {
    return apiClient.delete(`/admin/users/${id}`);
  },

  impersonateUser: async (id: string): Promise<{ access_token: string; user: any }> => {
    return apiClient.post(`/admin/users/${id}/impersonate`);
  },
};

