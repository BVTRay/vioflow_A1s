import apiClient from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
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

