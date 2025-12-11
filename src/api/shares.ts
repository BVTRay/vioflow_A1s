import apiClient from './client';

export interface ShareLink {
  id: string;
  type: string;
  token: string;
  video_id?: string;
  project_id?: string;
  allow_download: boolean;
  expires_at?: string;
  is_active: boolean;
  justification?: string;
  video?: any;
  project?: any;
}

export interface ShareLinkDetail extends ShareLink {
  video?: {
    id: string;
    name: string;
    url: string;
    storage_url?: string;
    thumbnail_url?: string;
    version: number;
    size: string;
    duration?: string;
    resolution?: string;
  };
  project?: {
    id: string;
    name: string;
    client: string;
  };
}

export const sharesApi = {
  getAll: async (): Promise<ShareLink[]> => {
    return apiClient.get('/shares');
  },

  create: async (data: {
    type: string;
    videoId?: string;
    projectId?: string;
    allowDownload?: boolean;
    hasPassword?: boolean;
    password?: string;
    expiresAt?: string;
    justification?: string;
  }): Promise<ShareLink> => {
    return apiClient.post('/shares', data);
  },

  getByToken: async (token: string): Promise<ShareLinkDetail> => {
    // 分享链接不需要认证，使用公共请求
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 
      (import.meta.env.PROD ? 'https://api.vioflow.cc/api' : 'http://localhost:3002/api');
    const response = await fetch(`${apiBaseUrl}/shares/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  update: async (id: string, data: Partial<ShareLink>): Promise<ShareLink> => {
    return apiClient.patch(`/shares/${id}`, data);
  },

  toggle: async (id: string): Promise<ShareLink> => {
    return apiClient.post(`/shares/${id}/toggle`);
  },

  verifyPassword: async (token: string, password: string): Promise<any> => {
    // 密码验证不需要认证，使用公共请求
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 
      (import.meta.env.PROD ? 'https://api.vioflow.cc/api' : 'http://localhost:3002/api');
    const response = await fetch(`${apiBaseUrl}/shares/${token}/verify-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    return response.json();
  },
};

