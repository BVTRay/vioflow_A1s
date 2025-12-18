import apiClient from './client';
import { ShowcasePackage } from '../types';

export const showcaseApi = {
  getAll: async (): Promise<ShowcasePackage[]> => {
    return apiClient.get('/showcase/packages');
  },

  getById: async (id: string): Promise<ShowcasePackage> => {
    return apiClient.get(`/showcase/packages/${id}`);
  },

  getByLinkId: async (linkId: string): Promise<any> => {
    return apiClient.get(`/showcase/packages/link/${linkId}`);
  },

  verifyPassword: async (linkId: string, password: string): Promise<any> => {
    return apiClient.post(`/showcase/packages/link/${linkId}/verify-password`, { password });
  },

  create: async (data: {
    name: string;
    description: string;
    mode: 'quick_player' | 'pitch_page';
    clientName?: string;
    welcomeMessage?: string;
    contactInfo?: string;
    videoIds: string[];
    itemDescriptions?: Record<string, string>;
  }): Promise<ShowcasePackage> => {
    return apiClient.post('/showcase/packages', data);
  },

  generateLink: async (id: string, config?: {
    linkExpiry?: number; // 有效期天数，0表示永久
    requirePassword?: boolean;
    password?: string;
  }): Promise<{ link?: string; linkId?: string }> => {
    return apiClient.post(`/showcase/packages/${id}/generate-link`, config || {});
  },

  getTracking: async (id: string) => {
    return apiClient.get(`/showcase/packages/${id}/tracking`);
  },

  updateLink: async (packageId: string, config: {
    linkExpiry?: number;
    requirePassword?: boolean;
    password?: string;
  }): Promise<any> => {
    return apiClient.patch(`/showcase/packages/${packageId}/link`, config);
  },

  toggleLink: async (packageId: string): Promise<any> => {
    return apiClient.post(`/showcase/packages/${packageId}/link/toggle`);
  },
};

