import axios from 'axios';
import apiClient from './client';

export interface UploadVideoResponse {
  id: string;
  projectId: string;
  name: string;
  originalFilename: string;
  baseName: string;
  version: number;
  type: 'video' | 'image' | 'audio';
  url: string;
  storageUrl: string;
  storageKey: string;
  size: string;
  status: 'initial' | 'annotated' | 'approved';
  changeLog?: string;
}

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL || 'https://api.vioflow.cc/api';
  }
  // 开发环境：根据当前访问的域名动态调整 API 地址
  const hostname = window.location.hostname;
  const port = '3002';
  
  // 默认使用服务器 IP 地址
  const serverIp = '192.168.110.112';
  
  // 如果是 localhost 或 127.0.0.1，使用服务器 IP
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${serverIp}:${port}/api`;
  }
  
  // 如果是内网 IP（192.168.x.x 或 172.x.x.x），使用相同的 IP
  if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
    return `http://${hostname}:${port}/api`;
  }
  
  // 默认使用服务器 IP
  return `http://${serverIp}:${port}/api`;
};

export const uploadApi = {
  uploadVideo: async (
    file: File,
    projectId: string,
    name: string,
    version: number,
    baseName: string,
    changeLog?: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<UploadVideoResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('name', name);
    formData.append('version', version.toString());
    formData.append('baseName', baseName);
    if (changeLog) {
      formData.append('changeLog', changeLog);
    }

    const token = apiClient.getToken();
    const teamId = apiClient.getTeamId();

    const response = await axios.post(`${getApiBaseUrl()}/upload/video`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(teamId && { 'X-Team-Id': teamId }),
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },
};

