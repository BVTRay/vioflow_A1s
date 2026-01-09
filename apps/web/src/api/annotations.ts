import apiClient, { getApiBaseUrl } from './client';

export interface Annotation {
  id: string;
  videoId?: string;
  video_id?: string; // 兼容旧格式
  userId?: string;
  user_id?: string; // 兼容旧格式
  timecode: string;
  content: string;
  screenshotUrl?: string;
  screenshot_url?: string; // 兼容旧格式
  isCompleted?: boolean;
  is_completed?: boolean; // 兼容旧格式
  completedAt?: string;
  completed_at?: string; // 兼容旧格式
  createdAt?: string;
  created_at: string; // 保持向后兼容
  updatedAt?: string;
  updated_at?: string; // 兼容旧格式
  client_name?: string; // 访客名称 (snake_case)
  clientName?: string; // 访客名称 (camelCase)
  user?: {
    id: string;
    name: string;
    email: string;
    team_id?: string;
    team?: {
      id: string;
      name: string;
    };
  };
  userType?: 'guest' | 'team_user' | 'personal_user'; // 用户类型
  teamName?: string | null; // 团队名称（仅团队用户有值）
}

export const annotationsApi = {
  // 获取批注列表（需要认证）
  getAll: async (videoId?: string): Promise<Annotation[]> => {
    const params = videoId ? { videoId } : {};
    return apiClient.get('/annotations', { params });
  },

  // 创建批注（需要认证）
  create: async (data: { videoId: string; timecode: string; content: string; screenshotUrl?: string }): Promise<Annotation> => {
    return apiClient.post('/annotations', data);
  },

  // 完成批注（需要认证）
  complete: async (id: string): Promise<Annotation> => {
    return apiClient.post(`/annotations/${id}/complete`);
  },

  // 导出PDF（需要认证）
  exportPdf: async (videoId: string): Promise<{ url: string }> => {
    return apiClient.get(`/annotations/export/${videoId}`);
  },

  // 通过分享token获取批注（公开接口）
  getByShareToken: async (token: string): Promise<Annotation[]> => {
    // 统一使用 getApiBaseUrl 函数获取 API 地址
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/shares/${token}/annotations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  // 通过分享token创建批注（公开接口，支持登录用户）
  createByShareToken: async (
    token: string,
    data: { timecode: string; content: string; clientName?: string },
  ): Promise<Annotation | { error: string }> => {
    // 统一使用 getApiBaseUrl 函数获取 API 地址
    const apiBaseUrl = getApiBaseUrl();
    
    // 构建请求头，如果有登录 token 则传递
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 从 localStorage 获取登录 token
    const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('access_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${apiBaseUrl}/shares/${token}/annotations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },
};



