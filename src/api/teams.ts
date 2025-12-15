import apiClient from './client';

export interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'member';
  status: 'pending' | 'active' | 'removed';
  invited_by?: string;
  joined_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
}

export interface AddTeamMemberDto {
  user_id: string;
  role?: 'super_admin' | 'admin' | 'member';
}

export interface UpdateTeamMemberDto {
  role?: 'super_admin' | 'admin' | 'member';
  status?: 'pending' | 'active' | 'removed';
}

export interface JoinTeamDto {
  code: string;
}

export const teamsApi = {
  // 创建团队
  create: async (data: CreateTeamDto): Promise<Team> => {
    return apiClient.post('/teams', data);
  },

  // 获取所有团队（当前用户所属的）
  findAll: async (): Promise<Team[]> => {
    return apiClient.get('/teams');
  },

  // 获取单个团队
  findOne: async (id: string): Promise<Team> => {
    return apiClient.get(`/teams/${id}`);
  },

  // 更新团队
  update: async (id: string, data: UpdateTeamDto): Promise<Team> => {
    return apiClient.patch(`/teams/${id}`, data);
  },

  // 删除团队
  remove: async (id: string): Promise<void> => {
    return apiClient.delete(`/teams/${id}`);
  },

  // 获取团队成员
  getMembers: async (id: string): Promise<TeamMember[]> => {
    return apiClient.get(`/teams/${id}/members`);
  },

  // 添加团队成员
  addMember: async (id: string, data: AddTeamMemberDto): Promise<TeamMember> => {
    return apiClient.post(`/teams/${id}/members`, data);
  },

  // 更新团队成员
  updateMember: async (id: string, memberId: string, data: UpdateTeamMemberDto): Promise<TeamMember> => {
    return apiClient.patch(`/teams/${id}/members/${memberId}`, data);
  },

  // 移除团队成员
  removeMember: async (id: string, memberId: string): Promise<void> => {
    return apiClient.delete(`/teams/${id}/members/${memberId}`);
  },

  // 通过编码加入团队
  joinByCode: async (data: JoinTeamDto): Promise<TeamMember> => {
    return apiClient.post('/teams/join', data);
  },

  // 获取用户在团队中的角色
  getUserRole: async (id: string): Promise<{ role: string }> => {
    return apiClient.get(`/teams/${id}/role`);
  },
};


