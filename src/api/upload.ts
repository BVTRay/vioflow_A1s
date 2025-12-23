import apiClient, { getApiBaseUrl } from './client';
import { AxiosRequestConfig } from 'axios';

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
  duration?: string;
  resolution?: string;
  aspectRatio?: 'landscape' | 'portrait';
  thumbnailUrl?: string;
}

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

    try {
      // 使用 apiClient.request 方法，这样可以自动处理 token 和 teamId，同时支持上传进度
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/upload/video',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10分钟超时（用于500MB文件上传）
        signal,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      };

      const response = await apiClient.request<UploadVideoResponse>(config);
      return response;
    } catch (error: any) {
      // 详细记录错误信息
      const errorInfo = {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        stack: error?.stack,
      };
      console.error('[uploadApi] 上传失败:', errorInfo);
      console.error('[uploadApi] 完整错误对象:', error);
      
      // 提取错误消息用于调试
      const errorMessage = error?.response?.data?.message || error?.message || '上传失败';
      console.error('[uploadApi] 提取的错误消息:', errorMessage);
      
      // 重新抛出错误，让调用者处理
      throw error;
    }
  },
};

