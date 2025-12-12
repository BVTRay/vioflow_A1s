
import React, { useState, useEffect, useRef } from 'react';
import { Bell, ArrowRightLeft, Search, Command, LogOut, User, ChevronDown, Settings, X, Save, Camera, Mail, Phone, Lock, Palette, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppState } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { TeamSwitcher } from '../UI/TeamSwitcher';
import apiClient from '../../api/client';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { Modal } from '../UI/Modal';
import { isDevMode } from '../../utils/devMode';

interface HeaderProps {
  onToggleDrawer: (drawer: AppState['activeDrawer']) => void;
  activeDrawer: AppState['activeDrawer'];
}

export const Header: React.FC<HeaderProps> = ({ onToggleDrawer, activeDrawer }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    avatar_url: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const logoClickTime = useRef<number>(0);

  // 初始化表单数据
  useEffect(() => {
    if (user && showUserSettings) {
      setUserFormData({
        name: user.name || '',
        email: user.email || '',
        username: user.email?.split('@')[0] || '', // 从邮箱提取用户名
        phone: '', // 用户实体中没有手机号字段
        avatar_url: user.avatar_url || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user, showUserSettings]);

  const handleLogout = async () => {
    try {
      await logout();
      apiClient.setToken(null);
      // 使用 window.location 跳转，确保在任何情况下都能正常工作
      window.location.href = '/login';
    } catch (error) {
      // 即使 API 调用失败，也清除本地 token
      apiClient.setToken(null);
      window.location.href = '/login';
    }
    setShowUserMenu(false);
  };

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!user) return '未登录';
    return user.name || user.email || '用户';
  };

  // 获取用户角色显示
  const getUserRole = () => {
    if (!user) return '';
    const roleMap: { [key: string]: string } = {
      'admin': '管理员',
      'user': '成员',
      'editor': '编辑'
    };
    return roleMap[user.role] || user.role;
  };

  // Logo双击处理
  const handleLogoDoubleClick = () => {
    setShowThemeMenu(true);
  };

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - logoClickTime.current < 300) {
      handleLogoDoubleClick();
      logoClickTime.current = 0;
    } else {
      logoClickTime.current = now;
    }
  };

  // 主题选项
  const themeOptions: { value: Theme; label: string; description: string }[] = [
    { value: 'dark', label: '纯黑', description: '经典黑色主题' },
    { value: 'dark-gray', label: '深灰', description: '柔和灰色主题' },
    { value: 'dark-blue', label: '深蓝', description: '优雅蓝色主题' },
  ];
  // 使用统一的主题系统
  const themeClasses = useThemeClasses();

  return (
    <header className={`fixed top-0 left-0 right-0 h-14 ${themeClasses.bg.primary} border-b ${themeClasses.border.primary} z-50 flex items-center justify-between px-4 select-none`}>
      {/* 定义 SVG 渐变 */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* Left: Logo with double-click handler */}
      <div 
        onClick={handleLogoClick}
        className="flex items-center gap-3 w-64 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
        title="双击切换主题"
      >
        <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15"/>
          <path d="M12 14C12 14 14.5 24 20 24C25.5 24 28 14 28 14" stroke="url(#brandGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 20C12 20 16 26 20 26C24 26 28 20 28 20" stroke="url(#brandGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
          <circle cx="20" cy="29" r="2" fill="#06b6d4"/>
        </svg>
        <div className="flex items-center">
          <span className={`text-xl font-light tracking-tight leading-none ${themeClasses.text.primary}`}>纷呈</span>
        </div>
      </div>

      {/* Theme Menu */}
      {showThemeMenu && (
        <>
          <div 
            className="fixed inset-0 z-[60]" 
            onClick={() => setShowThemeMenu(false)}
          ></div>
          <div className={`absolute left-4 top-16 w-56 ${themeClasses.bg.secondary} border ${themeClasses.border.primary} rounded-lg shadow-xl z-[61] overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${themeClasses.border.primary} flex items-center gap-2`}>
              <Palette className={`w-4 h-4 ${themeClasses.text.muted}`} />
              <span className={`text-sm font-semibold ${themeClasses.text.secondary}`}>选择主题</span>
            </div>
            <div className="py-2">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setShowThemeMenu(false);
                  }}
                  className={`
                    w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between
                    ${theme === option.value 
                      ? 'bg-indigo-600/20 text-indigo-400' 
                      : `${themeClasses.text.tertiary} ${themeClasses.bg.hover} ${themeClasses.text.hoverPrimary}`
                    }
                  `}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className={`text-xs ${themeClasses.text.muted} mt-0.5`}>{option.description}</span>
                  </div>
                  {theme === option.value && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Right: Actions and Search */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Global Omni-search (Visual only) - 30% width, right aligned */}
        <div className={`hidden md:flex items-center ${themeClasses.bg.secondary} border ${themeClasses.border.primary} rounded-md px-3 py-1.5 w-[120px] text-sm ${themeClasses.text.muted} ${themeClasses.border.hover} transition-colors cursor-text group`}>
          <Search className={`w-4 h-4 mr-2 ${themeClasses.text.hover}`} />
          <div className="flex items-center gap-1 ml-auto">
            <Command className="w-3 h-3" />
            <span className="text-xs">K</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
        <button 
          onClick={() => onToggleDrawer(activeDrawer === 'transfer' ? 'none' : 'transfer')}
          className={`p-2 rounded-md transition-colors relative ${activeDrawer === 'transfer' ? `${themeClasses.bg.tertiary} ${themeClasses.text.primary}` : `${themeClasses.text.muted} ${themeClasses.text.hover} ${themeClasses.bg.hover}`}`}
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span className={`absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 ${themeClasses.bg.primary}`}></span>
        </button>
        
        <button 
          onClick={() => onToggleDrawer(activeDrawer === 'messages' ? 'none' : 'messages')}
          className={`p-2 rounded-md transition-colors relative ${activeDrawer === 'messages' ? `${themeClasses.bg.tertiary} ${themeClasses.text.primary}` : `${themeClasses.text.muted} ${themeClasses.text.hover} ${themeClasses.bg.hover}`}`}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
        </button>

        <div className={`w-px h-6 ${themeClasses.bg.tertiary} mx-2`}></div>
        
        {/* 用户菜单 */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {/* 团队切换器 - 在用户头像右侧 */}
            <TeamSwitcher />
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${themeClasses.bg.hover} transition-colors group`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border ${themeClasses.border.secondary} shadow-sm flex items-center justify-center text-white text-xs font-medium`}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={getUserDisplayName()} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <div className={`text-xs font-medium ${themeClasses.text.secondary}`}>{getUserDisplayName()}</div>
                  <div className={`text-[10px] ${themeClasses.text.muted}`}>{getUserRole()}</div>
                </div>
                <ChevronDown className={`w-4 h-4 ${themeClasses.text.muted} transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

            {/* 下拉菜单 */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className={`absolute right-0 top-full mt-2 w-48 ${themeClasses.bg.secondary} border ${themeClasses.border.primary} rounded-lg shadow-xl z-50 overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${themeClasses.border.primary}`}>
                    <div className={`text-sm font-medium ${themeClasses.text.secondary}`}>{getUserDisplayName()}</div>
                    <div className={`text-xs ${themeClasses.text.muted} mt-0.5`}>{user.email}</div>
                    <div className="text-[10px] text-indigo-400 mt-1">{getUserRole()}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowUserSettings(true);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm ${themeClasses.text.tertiary} ${themeClasses.bg.hover} flex items-center gap-2 transition-colors`}
                  >
                    <Settings className="w-4 h-4" />
                    个人信息设置
                  </button>
                  {/* 开发者后台入口 - 仅在开发者模式下显示 */}
                  {isDevMode() && (
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        // 保存当前ray的token，用于从开发者后台返回时恢复
                        const currentToken = apiClient.getToken();
                        if (currentToken) {
                          localStorage.setItem('ray_user_token', currentToken);
                        }
                        // 使用开发者账号（admin@vioflow.com）登录获取token
                        try {
                          const { authApi } = await import('../../api/auth');
                          const response = await authApi.login({ username: 'admin@vioflow.com', password: 'admin' });
                          if (response.accessToken || response.access_token) {
                            // 保存admin的token
                            apiClient.setToken(response.access_token || response.accessToken);
                            // 跳转到开发者后台
                            navigate('/admin/users');
                          }
                        } catch (error: any) {
                          console.error('开发者后台登录失败:', error);
                          alert('开发者后台登录失败: ' + (error?.response?.data?.message || error.message));
                        }
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-2 transition-colors border-t ${themeClasses.border.primary}`}
                      title="开发者后台（使用开发者账号）"
                    >
                      <Terminal className="w-4 h-4" />
                      开发者后台
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className={`w-full px-4 py-2.5 text-left text-sm ${themeClasses.text.tertiary} ${themeClasses.bg.hover} flex items-center gap-2 transition-colors`}
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border ${themeClasses.border.secondary} shadow-sm cursor-pointer hover:ring-2 ring-indigo-500/50 transition-all`}></div>
        )}
        </div>
      </div>

      {/* 用户信息设置模态框 */}
      {showUserSettings && user && (
        <Modal
          isOpen={showUserSettings}
          onClose={() => setShowUserSettings(false)}
          title="个人信息设置"
          maxWidth="xl"
          footer={
            <>
              <button
                onClick={() => setShowUserSettings(false)}
                className={`px-4 py-2 text-sm ${themeClasses.text.muted} ${themeClasses.text.hoverPrimary} transition-colors`}
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (userFormData.newPassword && userFormData.newPassword !== userFormData.confirmPassword) {
                    alert('两次输入的密码不一致');
                    return;
                  }
                  setIsSaving(true);
                  try {
                    // TODO: 调用更新用户信息的API
                    // await authApi.updateProfile({ ...userFormData });
                    alert('用户信息已更新（功能开发中）');
                    setShowUserSettings(false);
                    // 刷新用户信息
                    window.location.reload();
                  } catch (error) {
                    console.error('更新用户信息失败:', error);
                    alert('更新失败，请稍后重试');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '保存中...' : '保存'}
              </button>
            </>
          }
        >

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
              {/* 头像 */}
              <div>
                <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2 uppercase`}>头像</label>
                <div className="flex items-center gap-4">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border ${themeClasses.border.secondary} shadow-sm flex items-center justify-center overflow-hidden`}>
                    {userFormData.avatar_url ? (
                      <img src={userFormData.avatar_url} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={userFormData.avatar_url}
                      onChange={(e) => setUserFormData({...userFormData, avatar_url: e.target.value})}
                      placeholder="输入头像URL..."
                      className={`w-full ${themeClasses.bg.primary} border ${themeClasses.border.secondary} rounded-lg px-3 py-2 text-sm ${themeClasses.text.primary} placeholder-zinc-600 focus:border-indigo-500 outline-none`}
                    />
                    <p className={`text-[10px] ${themeClasses.text.muted} mt-1`}>支持图片URL链接</p>
                  </div>
                </div>
              </div>

              {/* 用户名 */}
              <div>
                <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2 uppercase`}>用户名</label>
                <div className="relative">
                  <User className={`absolute left-3 top-2.5 w-4 h-4 ${themeClasses.text.disabled}`} />
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                    placeholder="输入用户名"
                    className={`w-full ${themeClasses.bg.primary} border ${themeClasses.border.secondary} rounded-lg pl-10 pr-3 py-2 text-sm ${themeClasses.text.primary} placeholder-zinc-600 focus:border-indigo-500 outline-none`}
                  />
                </div>
              </div>

              {/* 登录账号（邮箱） */}
              <div>
                <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2 uppercase`}>登录账号（邮箱）</label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${themeClasses.text.disabled}`} />
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    placeholder="输入邮箱地址"
                    className={`w-full ${themeClasses.bg.primary} border ${themeClasses.border.secondary} rounded-lg pl-10 pr-3 py-2 text-sm ${themeClasses.text.primary} placeholder-zinc-600 focus:border-indigo-500 outline-none`}
                  />
                </div>
              </div>

              {/* 手机号 */}
              <div>
                <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2 uppercase`}>手机号（可选）</label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-2.5 w-4 h-4 ${themeClasses.text.disabled}`} />
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                    placeholder="输入手机号"
                    className={`w-full ${themeClasses.bg.primary} border ${themeClasses.border.secondary} rounded-lg pl-10 pr-3 py-2 text-sm ${themeClasses.text.primary} placeholder-zinc-600 focus:border-indigo-500 outline-none`}
                  />
                </div>
                <p className={`text-[10px] ${themeClasses.text.muted} mt-1`}>手机号功能暂未实现</p>
              </div>

              {/* 密码修改 */}
              <div className={`pt-4 border-t ${themeClasses.border.primary}`}>
                <h3 className={`text-xs font-bold ${themeClasses.text.muted} uppercase mb-3`}>修改密码</h3>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-1.5`}>当前密码</label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${themeClasses.text.disabled}`} />
                      <input
                        type="password"
                        value={userFormData.currentPassword}
                        onChange={(e) => setUserFormData({...userFormData, currentPassword: e.target.value})}
                        placeholder="输入当前密码"
                        className={`w-full ${themeClasses.bg.primary} border ${themeClasses.border.secondary} rounded-lg pl-10 pr-3 py-2 text-sm ${themeClasses.text.primary} placeholder-zinc-600 focus:border-indigo-500 outline-none`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-1.5`}>新密码</label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${themeClasses.text.disabled}`} />
                      <input
                        type="password"
                        value={userFormData.newPassword}
                        onChange={(e) => setUserFormData({...userFormData, newPassword: e.target.value})}
                        placeholder="输入新密码"
                        className={`w-full ${themeClasses.bg.primary} border ${themeClasses.border.secondary} rounded-lg pl-10 pr-3 py-2 text-sm ${themeClasses.text.primary} placeholder-zinc-600 focus:border-indigo-500 outline-none`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-1.5`}>确认新密码</label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${themeClasses.text.disabled}`} />
                      <input
                        type="password"
                        value={userFormData.confirmPassword}
                        onChange={(e) => setUserFormData({...userFormData, confirmPassword: e.target.value})}
                        placeholder="再次输入新密码"
                        className={`w-full ${themeClasses.bg.primary} border ${themeClasses.border.secondary} rounded-lg pl-10 pr-3 py-2 text-sm ${themeClasses.text.primary} placeholder-zinc-600 focus:border-indigo-500 outline-none`}
                      />
                    </div>
                    {userFormData.newPassword && userFormData.confirmPassword && userFormData.newPassword !== userFormData.confirmPassword && (
                      <p className="text-[10px] text-red-400 mt-1">两次输入的密码不一致</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </Modal>
      )}
    </header>
  );
};
