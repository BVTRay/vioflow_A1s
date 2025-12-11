import { useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import apiClient from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = apiClient.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      // 确保字段名匹配（后端可能返回 avatar_url 或 avatarUrl）
      const user: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar_url: userData.avatar_url || userData.avatarUrl
      };
      setUser(user);
    } catch (error) {
      // Token无效，清除
      apiClient.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.user) {
      setUser(response.user);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
};

