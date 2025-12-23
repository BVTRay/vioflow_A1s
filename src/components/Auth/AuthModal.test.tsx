import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { authApi } from '../../api/auth';

// Mock dependencies
vi.mock('../../api/auth');

describe('AuthModal', () => {
  const mockOnClose = vi.fn();
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染登录表单', () => {
    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onLoginSuccess={mockOnLoginSuccess}
        defaultTab="login"
      />
    );

    expect(screen.getByLabelText(/邮箱或用户名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  it('应该能够切换到注册标签', () => {
    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onLoginSuccess={mockOnLoginSuccess}
        defaultTab="login"
      />
    );

    const registerTab = screen.getByText(/注册/i);
    fireEvent.click(registerTab);

    expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/确认密码/i)).toBeInTheDocument();
  });

  it('应该能够提交登录表单', async () => {
    const mockResponse = {
      access_token: 'test-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
      },
    };

    (authApi.login as any).mockResolvedValue(mockResponse);

    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onLoginSuccess={mockOnLoginSuccess}
        defaultTab="login"
      />
    );

    const emailInput = screen.getByLabelText(/邮箱或用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('应该显示错误消息当登录失败时', async () => {
    const errorMessage = '登录失败，请检查账号和密码';
    (authApi.login as any).mockRejectedValue(new Error(errorMessage));

    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onLoginSuccess={mockOnLoginSuccess}
        defaultTab="login"
      />
    );

    const emailInput = screen.getByLabelText(/邮箱或用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('应该能够关闭模态框', () => {
    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onLoginSuccess={mockOnLoginSuccess}
        defaultTab="login"
      />
    );

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});


