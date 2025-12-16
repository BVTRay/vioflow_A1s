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
  password_hash?: string;
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
    isMainDelivery?: boolean;
  };
  project?: {
    id: string;
    name: string;
    client: string;
  };
}

export const sharesApi = {
  getAll: async (teamId?: string): Promise<ShareLink[]> => {
    const params = teamId ? { teamId } : {};
    return apiClient.get('/shares', { params });
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
    const env = import.meta.env as any;
    let apiBaseUrl: string;
    if (env.VITE_API_BASE_URL) {
      apiBaseUrl = env.VITE_API_BASE_URL;
    } else if (env.PROD) {
      apiBaseUrl = env.VITE_API_BASE_URL || 'https://api.vioflow.cc/api';
    } else {
      const hostname = window.location.hostname;
      const port = '3002';
      const serverIp = '192.168.110.112';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        apiBaseUrl = `http://${serverIp}:${port}/api`;
      } else if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
        apiBaseUrl = `http://${hostname}:${port}/api`;
      } else {
        apiBaseUrl = `http://${serverIp}:${port}/api`;
      }
    }
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
    const env = import.meta.env as any;
    let apiBaseUrl: string;
    if (env.VITE_API_BASE_URL) {
      apiBaseUrl = env.VITE_API_BASE_URL;
    } else if (env.PROD) {
      apiBaseUrl = env.VITE_API_BASE_URL || 'https://api.vioflow.cc/api';
    } else {
      const hostname = window.location.hostname;
      const port = '3002';
      const serverIp = '192.168.110.112';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        apiBaseUrl = `http://${serverIp}:${port}/api`;
      } else if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
        apiBaseUrl = `http://${hostname}:${port}/api`;
      } else {
        apiBaseUrl = `http://${serverIp}:${port}/api`;
      }
    }
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

