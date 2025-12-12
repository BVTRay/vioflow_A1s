import apiClient from './client';

export interface Annotation {
  id: string;
  video_id: string;
  user_id?: string;
  timecode: string;
  content: string;
  screenshot_url?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const annotationsApi = {
  // 通过分享token获取批注（公开接口）
  getByShareToken: async (token: string): Promise<Annotation[]> => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 
      (import.meta.env.PROD ? 'https://api.vioflow.cc/api' : 'http://localhost:3002/api');
    const response = await fetch(`${apiBaseUrl}/shares/${token}/annotations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  // 通过分享token创建批注（公开接口）
  createByShareToken: async (
    token: string,
    data: { timecode: string; content: string; clientName?: string },
  ): Promise<Annotation | { error: string }> => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 
      (import.meta.env.PROD ? 'https://api.vioflow.cc/api' : 'http://localhost:3002/api');
    const response = await fetch(`${apiBaseUrl}/shares/${token}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};


