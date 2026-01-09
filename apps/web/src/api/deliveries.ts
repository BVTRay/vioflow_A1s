import apiClient from './client';
import { DeliveryData, DeliveryPackage } from '../types';

export const deliveriesApi = {
  getByProjectId: async (projectId: string): Promise<DeliveryData> => {
    return apiClient.get(`/deliveries/${projectId}`);
  },

  update: async (projectId: string, data: Partial<DeliveryData>): Promise<DeliveryData> => {
    return apiClient.patch(`/deliveries/${projectId}`, data);
  },

  complete: async (projectId: string): Promise<DeliveryData> => {
    return apiClient.post(`/deliveries/${projectId}/complete`);
  },

  getFolders: async (projectId: string) => {
    return apiClient.get(`/deliveries/${projectId}/folders`);
  },

  getPackages: async (projectId: string): Promise<DeliveryPackage[]> => {
    return apiClient.get(`/deliveries/${projectId}/packages`);
  },

  createPackage: async (projectId: string, data: { title: string; description: string; fileIds: string[] }): Promise<DeliveryPackage> => {
    return apiClient.post(`/deliveries/${projectId}/packages`, data);
  },
};

