import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { authApi } from '../api/auth';
import apiClient from '../api/client';

// Mock dependencies
vi.mock('../api/auth');
vi.mock('../api/client', () => ({
  default: {
    getToken: vi.fn(),
    setToken: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该初始化时检查认证状态', async () => {
    const mockToken = 'test-token';
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'member',
      avatar_url: null,
      team_id: 'team-1',
      phone: null,
      is_active: true,
    };

    (apiClient.getToken as any).mockReturnValue(mockToken);
    (authApi.getMe as any).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'member',
      avatar_url: null,
      team_id: 'team-1',
      phone: null,
      is_active: true,
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('应该在没有token时设置用户为null', async () => {
    (apiClient.getToken as any).mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('应该在token无效时清除token并设置用户为null', async () => {
    const mockToken = 'invalid-token';
    (apiClient.getToken as any).mockReturnValue(mockToken);
    (authApi.getMe as any).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(apiClient.setToken).toHaveBeenCalledWith(null);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('应该能够登录用户', async () => {
    const mockResponse = {
      access_token: 'new-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
      },
    };

    (authApi.login as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    const loginResult = await result.current.login('test@example.com', 'password123');

    expect(loginResult).toBe(true);
    expect(result.current.user).toEqual(mockResponse.user);
  });

  it('应该能够登出用户', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'member',
    };

    (apiClient.getToken as any).mockReturnValue('token');
    (authApi.getMe as any).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    (authApi.logout as any).mockResolvedValue(undefined);

    await result.current.logout();

    expect(authApi.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});



















