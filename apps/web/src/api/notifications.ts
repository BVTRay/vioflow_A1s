import apiClient from './client';
import { Notification } from '../types';

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    return apiClient.get('/notifications');
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/notifications/${id}`);
  },

  clear: async (): Promise<void> => {
    return apiClient.post('/notifications/clear');
  },
};

