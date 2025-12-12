import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { teamsApi, Team } from '../api/teams';
import apiClient from '../api/client';

interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  loading: boolean;
  switchTeam: (teamId: string) => Promise<void>;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

interface TeamProviderProps {
  children: React.ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const currentTeamRef = useRef<Team | null>(null);

  // 加载用户的所有团队
  const loadTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setCurrentTeam(null);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 开始加载团队列表...');
      const userTeams = await teamsApi.findAll();
      console.log('✅ 加载到团队:', userTeams.length, '个', userTeams.map(t => t.name));
      setTeams(userTeams);

      // 如果没有团队，直接返回，不设置当前团队
      if (userTeams.length === 0) {
        console.log('⚠️ 用户没有加入任何团队');
        setCurrentTeam(null);
        setLoading(false);
        return;
      }

      // 选择当前团队（按优先级）
      let selectedTeam: Team | null = null;
      
      // 1. 检查是否已有当前团队且还在列表中
      const prevTeam = currentTeamRef.current || currentTeam;
      if (prevTeam) {
        const stillExists = userTeams.find(t => t.id === prevTeam.id);
        if (stillExists) {
          selectedTeam = stillExists;
          console.log('✅ 保持当前团队:', selectedTeam.name);
        }
      }

      // 2. 如果还没有选择，优先使用用户表中的 team_id
      if (!selectedTeam && user?.team_id) {
        const defaultTeam = userTeams.find(t => t.id === user.team_id);
        if (defaultTeam) {
          selectedTeam = defaultTeam;
          console.log('✅ 使用用户默认团队:', selectedTeam.name);
        }
      }

      // 3. 尝试从 localStorage 恢复
      if (!selectedTeam) {
        const savedTeamId = localStorage.getItem('current_team_id');
        if (savedTeamId) {
          const savedTeam = userTeams.find(t => t.id === savedTeamId);
          if (savedTeam) {
            selectedTeam = savedTeam;
            console.log('✅ 从 localStorage 恢复团队:', selectedTeam.name);
          }
        }
      }

      // 4. 使用第一个团队作为默认
      if (!selectedTeam && userTeams.length > 0) {
        selectedTeam = userTeams[0];
        console.log('✅ 使用第一个团队作为默认:', selectedTeam.name);
      }

      // 设置当前团队
      if (selectedTeam) {
        console.log('✅ 最终设置当前团队:', selectedTeam.name, selectedTeam.id);
        localStorage.setItem('current_team_id', selectedTeam.id);
        apiClient.setTeamId(selectedTeam.id);
        currentTeamRef.current = selectedTeam;
        setCurrentTeam(selectedTeam);
      } else {
        console.log('⚠️ 没有可用的团队');
        currentTeamRef.current = null;
        setCurrentTeam(null);
      }
    } catch (error) {
      console.error('❌ 加载团队失败:', error);
      setTeams([]);
      setCurrentTeam(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // 切换团队
  const switchTeam = useCallback(async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    setCurrentTeam(team);
    localStorage.setItem('current_team_id', teamId);
    apiClient.setTeamId(teamId);

    // 可以在这里触发其他副作用，比如刷新数据
    // dispatch({ type: 'TEAM_CHANGED', payload: teamId });
  }, [teams]);

  // 刷新团队列表
  const refreshTeams = useCallback(async () => {
    await loadTeams();
  }, [loadTeams]);

  // 当用户登录状态变化时，加载团队
  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // 当用户信息变化时，更新当前团队
  useEffect(() => {
    if (user?.team_id && teams.length > 0) {
      setCurrentTeam(prevTeam => {
        if (prevTeam?.id === user.team_id) {
          return prevTeam;
        }
        const userTeam = teams.find(t => t.id === user.team_id);
        if (userTeam) {
          localStorage.setItem('current_team_id', userTeam.id);
          apiClient.setTeamId(userTeam.id);
          return userTeam;
        }
        return prevTeam;
      });
    }
  }, [user?.team_id, teams]);

  return (
    <TeamContext.Provider
      value={{
        currentTeam,
        teams,
        loading,
        switchTeam,
        refreshTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

