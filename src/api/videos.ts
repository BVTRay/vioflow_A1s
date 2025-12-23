import apiClient from './client';
import { Video } from '../types';

export const videosApi = {
  getAll: async (filters?: { 
    projectId?: string; 
    isCaseFile?: boolean; 
    teamId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<Video[] | { data: Video[]; total: number; page: number; limit: number }> => {
    // 如果没有提供 teamId，从 apiClient 获取当前团队 ID
    const currentTeamId = filters?.teamId || apiClient.getTeamId();
    const params = currentTeamId ? { ...filters, teamId: currentTeamId } : filters;
    console.log('📡 请求视频列表:', { filters, currentTeamId, params });
    const result = await apiClient.get('/videos', { params });
    
    // 兼容新旧格式：如果返回的是分页格式，提取data；否则直接返回数组
    if (result && typeof result === 'object' && 'data' in result) {
      console.log('📥 收到视频列表（分页）:', result.data?.length || 0, '个视频，总数:', result.total);
      return result;
    }
    console.log('📥 收到视频列表:', result?.length || 0, '个视频');
    return result || [];
  },

  getById: async (id: string): Promise<Video> => {
    return apiClient.get(`/videos/${id}`);
  },

  getVersions: async (id: string): Promise<Video[]> => {
    return apiClient.get(`/videos/${id}/versions`);
  },

  updateTags: async (id: string, tagIds: string[]): Promise<Video> => {
    return apiClient.patch(`/videos/${id}/tags`, { tagIds });
  },

  toggleCaseFile: async (id: string): Promise<Video> => {
    return apiClient.patch(`/videos/${id}/case-file`);
  },

  toggleMainDelivery: async (id: string): Promise<Video> => {
    return apiClient.patch(`/videos/${id}/main-delivery`);
  },

  createReference: async (id: string, projectId: string): Promise<Video> => {
    return apiClient.post(`/videos/${id}/create-reference`, { projectId });
  },

  updateStatus: async (id: string, status: 'initial' | 'annotated' | 'approved'): Promise<Video> => {
    return apiClient.patch(`/videos/${id}/status`, { status });
  },

  getPlaybackUrl: async (id: string, useSignedUrl: boolean = true): Promise<string> => {
    const result = await apiClient.get<{ url: string }>(`/videos/${id}/playback-url`, {
      params: { signed: useSignedUrl ? 'true' : 'false' },
    });
    return result.url;
  },

  delete: async (id: string, deleteAllVersions: boolean = false): Promise<void> => {
    await apiClient.delete(`/videos/${id}`, {
      params: { deleteAllVersions: deleteAllVersions ? 'true' : 'false' },
    });
  },

  // 回收站相关 API
  getDeletedVideos: async (teamId?: string): Promise<Video[]> => {
    const currentTeamId = teamId || apiClient.getTeamId();
    return apiClient.get('/videos/trash/list', {
      params: currentTeamId ? { teamId: currentTeamId } : {},
    });
  },

  restoreVideo: async (id: string): Promise<Video> => {
    const result = await apiClient.post<{ video: Video }>(`/videos/trash/${id}/restore`);
    return result.video;
  },

  permanentlyDeleteVideo: async (id: string): Promise<void> => {
    await apiClient.delete(`/videos/trash/${id}/permanent`);
  },

  cleanupOldDeletedVideos: async (): Promise<{ count: number }> => {
    return apiClient.post('/videos/trash/cleanup');
  },

  // 管理员模式：获取所有视频（包含项目、团队、上传者信息）
  getAllForAdmin: async (includeDeleted: boolean = false): Promise<Video[]> => {
    // 开发者后台接口不需要 teamId，apiClient 会自动识别 /admin/ 路径并跳过 teamId
    return apiClient.get('/videos/admin/all', {
      params: { includeDeleted: includeDeleted ? 'true' : 'false' },
    });
  },

  // 更新视频信息
  update: async (id: string, data: {
    name?: string;
    baseName?: string;
    version?: number;
    changeLog?: string;
  }): Promise<Video> => {
    return apiClient.patch(`/videos/${id}`, data);
  },

  // 检查资产名称在团队内是否唯一
  checkAssetNameUnique: async (baseName: string, teamId?: string): Promise<{ unique: boolean; exists: boolean }> => {
    const currentTeamId = teamId || apiClient.getTeamId();
    return apiClient.get('/videos/check-asset-name', {
      params: { baseName, teamId: currentTeamId },
    });
  },
};

