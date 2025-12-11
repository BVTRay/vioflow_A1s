import apiClient from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string; // 后端返回的是 access_token
  accessToken?: string; // 兼容字段
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar_url?: string;
    avatarUrl?: string; // 兼容字段
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<any>('/auth/login', data);
    // 后端返回 access_token，转换为 accessToken 以便前端使用
    const token = response.access_token || response.accessToken;
    if (token) {
      apiClient.setToken(token);
      // 返回统一格式的响应
      return {
        ...response,
        accessToken: token,
        access_token: token,
        user: {
          ...response.user,
          avatarUrl: response.user?.avatar_url || response.user?.avatarUrl,
        },
      };
    }
    return response;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    apiClient.setToken(null);
  },

  getMe: async () => {
    return apiClient.get('/auth/me');
  },
};

