import apiClient from './client';
import { Project } from '../types';

export interface CreateProjectRequest {
  name: string;
  client: string;
  lead: string;
  postLead: string;
  group: string;
}

export interface UpdateProjectRequest {
  name?: string;
  client?: string;
  lead?: string;
  postLead?: string;
  group?: string;
}

export const projectsApi = {
  getAll: async (filters?: { status?: string; group?: string; month?: string }): Promise<Project[]> => {
    return apiClient.get('/projects', { params: filters });
  },

  getActive: async (limit?: number): Promise<Project[]> => {
    return apiClient.get('/projects/active', { params: { limit } });
  },

  getRecentOpened: async (limit?: number): Promise<Project[]> => {
    return apiClient.get('/projects/recent-opened', { params: { limit } });
  },

  getById: async (id: string): Promise<Project> => {
    return apiClient.get(`/projects/${id}`);
  },

  create: async (data: CreateProjectRequest): Promise<Project> => {
    return apiClient.post('/projects', data);
  },

  update: async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    return apiClient.patch(`/projects/${id}`, data);
  },

  finalize: async (id: string): Promise<Project> => {
    return apiClient.post(`/projects/${id}/finalize`);
  },

  unlock: async (id: string, justification: string): Promise<Project> => {
    return apiClient.post(`/projects/${id}/unlock`, { justification });
  },

  updateLastOpened: async (id: string): Promise<void> => {
    return apiClient.patch(`/projects/${id}/last-opened`);
  },

  getMembers: async (id: string) => {
    return apiClient.get(`/projects/${id}/members`);
  },

  addMember: async (id: string, userId: string, role?: string) => {
    return apiClient.post(`/projects/${id}/members`, { userId, role });
  },
};

