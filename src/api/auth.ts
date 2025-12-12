import apiClient from './client';

export interface LoginRequest {
  username?: string; // 后端期望的字段
  email?: string; // 前端可能使用的字段
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
    // 统一转换为 username 字段（后端期望的格式）
    const loginData = {
      username: data.username || data.email || '',
      password: data.password,
    };
    const response = await apiClient.post<any>('/auth/login', loginData);
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

