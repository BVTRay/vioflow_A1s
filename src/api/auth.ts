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
    try {
      // 统一转换为 username 字段（后端期望的格式）
      const loginData = {
        username: data.username || data.email || '',
        password: data.password,
      };
      
      console.log('🔐 发送登录请求:', { username: loginData.username });
      
      const response = await apiClient.post<any>('/auth/login', loginData);
      
      console.log('🔐 收到登录响应:', response);
      
      // 检查响应是否存在
      if (!response) {
        console.error('❌ 登录响应为空');
        throw new Error('登录失败：未收到服务器响应');
      }
      
      // 后端可能返回 access_token 或 accessToken，兼容两种格式
      const token = response.access_token || response.accessToken;
      if (!token) {
        console.error('❌ 登录响应中没有 token，响应数据:', response);
        throw new Error('登录失败：未收到认证令牌');
      }
      
      console.log('✅ 登录成功，获取到 token');
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
    } catch (error: any) {
      console.error('❌ 登录过程出错:', error);
      // 如果是我们抛出的错误，直接抛出
      if (error.message && error.message.includes('登录失败')) {
        throw error;
      }
      // 其他错误，包装后抛出
      throw new Error(error.response?.data?.message || error.message || '登录失败，请检查账号和密码');
    }
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    apiClient.setToken(null);
  },

  getMe: async () => {
    return apiClient.get('/auth/me');
  },
};

