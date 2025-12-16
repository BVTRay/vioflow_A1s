import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/Auth/LoginPage';
import { SharePage } from './components/Share/SharePage';
import { TeamOnboarding } from './components/Onboarding/TeamOnboarding';
import { DevAdminPanel } from './components/Admin/DevAdminPanel';
import { TestSupabase } from './pages/TestSupabase';
import App from './App';
import apiClient from './api/client';
import { teamsApi } from './api/teams';
import { authApi } from './api/auth';
import { isDevMode } from './utils/devMode';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasTeam, setHasTeam] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // 只有在从开发者后台返回时才恢复ray的token
      const fromDevAdmin = sessionStorage.getItem('from_dev_admin');
      if (fromDevAdmin === 'true' && isDevMode()) {
        const rayToken = localStorage.getItem('ray_user_token');
        if (rayToken) {
          apiClient.setToken(rayToken);
          console.log('🔧 ProtectedRoute: 从开发者后台返回，已恢复ray的token');
          sessionStorage.removeItem('from_dev_admin'); // 清除标记
        }
      }

      const token = apiClient.getToken();
      if (!token || token === 'dev_mode_token') {
        setIsAuthenticated(false);
        setHasTeam(null);
        setLoading(false);
        return;
      }

      try {
        // 动态获取 API 地址（与 client.ts 保持一致）
        const getApiBaseUrl = () => {
          if (import.meta.env.VITE_API_BASE_URL) {
            return import.meta.env.VITE_API_BASE_URL;
          }
          if (import.meta.env.PROD) {
            return import.meta.env.VITE_API_BASE_URL || 'https://api.vioflow.cc/api';
          }
          const hostname = window.location.hostname;
          const port = '3002';
          const serverIp = '192.168.110.112';
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${serverIp}:${port}/api`;
          }
          if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
            return `http://${hostname}:${port}/api`;
          }
          return `http://${serverIp}:${port}/api`;
        };
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
          
          // 检查用户是否有团队
          try {
            const teams = await teamsApi.findAll();
            setHasTeam(teams.length > 0);
          } catch (error) {
            console.error('Failed to check teams:', error);
            // 如果检查团队失败，假设有团队（避免无限循环）
            setHasTeam(true);
          }
        } else {
          apiClient.setToken(null);
          setIsAuthenticated(false);
          setHasTeam(null);
        }
      } catch (error) {
        apiClient.setToken(null);
        setIsAuthenticated(false);
        setHasTeam(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 如果用户没有团队，显示引导页面
  if (hasTeam === false) {
    return <TeamOnboarding />;
  }

  return <>{children}</>;
};

// 开发者后台保护路由（开发者模式或 DEV_SUPER_ADMIN 角色可访问）
const DevAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // 如果是开发者模式，直接允许访问
      if (isDevMode()) {
        console.log('🔧 DevAdminRoute: 开发者模式，允许访问');
        setIsAuthenticated(true);
        setUserRole('DEV_SUPER_ADMIN'); // 设置为开发者角色
        setLoading(false);
        return;
      }

      const token = apiClient.getToken();
      if (!token || token === 'dev_mode_token') {
        console.log('🔒 DevAdminRoute: 没有有效token');
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        // 使用 apiClient 获取用户信息（它会自动使用正确的 API 地址）
        const userData = await authApi.getMe();
        console.log('🔒 DevAdminRoute: 用户信息', {
          email: userData.email,
          role: userData.role,
          roleType: typeof userData.role
        });
        setIsAuthenticated(true);
        // 确保role是字符串格式
        const role = typeof userData.role === 'string' ? userData.role : String(userData.role);
        setUserRole(role);
        
        // 检查角色是否匹配
        if (role !== 'DEV_SUPER_ADMIN') {
          console.warn('⚠️ DevAdminRoute: 角色不匹配', {
            expected: 'DEV_SUPER_ADMIN',
            actual: role,
            userEmail: userData.email
          });
        }
      } catch (error) {
        console.error('🔒 DevAdminRoute: 检查认证时出错', error);
        apiClient.setToken(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔒 DevAdminRoute: 未认证，重定向到登录页');
    return <Navigate to="/login" replace />;
  }

  // 开发者模式或 DEV_SUPER_ADMIN 角色都可以访问
  if (!isDevMode() && userRole !== 'DEV_SUPER_ADMIN') {
    console.warn('🔒 DevAdminRoute: 权限不足，重定向到首页', {
      userRole,
      expected: 'DEV_SUPER_ADMIN',
      isDevMode: isDevMode()
    });
    return <Navigate to="/" replace />;
  }

  console.log('✅ DevAdminRoute: 权限验证通过，显示开发者后台', {
    isDevMode: isDevMode(),
    userRole
  });
  return <>{children}</>;
};

export const AppWithRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/onboarding" element={<TeamOnboarding />} />
        <Route
          path="/test-supabase"
          element={
            <ProtectedRoute>
              <TestSupabase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <DevAdminRoute>
              <DevAdminPanel />
            </DevAdminRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

