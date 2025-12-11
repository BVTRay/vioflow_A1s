
import React, { useState, useEffect } from 'react';
import { Bell, ArrowRightLeft, Search, Command, LogOut, User, ChevronDown, Settings, X, Save, Camera, Mail, Phone, Lock } from 'lucide-react';
import { AppState } from '../../types';
import { useAuth } from '../../src/hooks/useAuth';
import apiClient from '../../src/api/client';

interface HeaderProps {
  onToggleDrawer: (drawer: AppState['activeDrawer']) => void;
  activeDrawer: AppState['activeDrawer'];
}

export const Header: React.FC<HeaderProps> = ({ onToggleDrawer, activeDrawer }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
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
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950 border-b border-zinc-800 z-50 flex items-center justify-between px-4 select-none">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 w-64">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <span className="font-bold text-lg tracking-tight text-zinc-100">Vioflow</span>
      </div>

      {/* Center: Global Omni-search (Visual only) */}
      <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 w-[400px] text-sm text-zinc-500 hover:border-zinc-700 transition-colors cursor-text group">
        <Search className="w-4 h-4 mr-2 group-hover:text-zinc-400" />
        <span className="flex-1">跳转至项目、文件或设置...</span>
        <div className="flex items-center gap-1">
          <Command className="w-3 h-3" />
          <span className="text-xs">K</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onToggleDrawer(activeDrawer === 'transfer' ? 'none' : 'transfer')}
          className={`p-2 rounded-md transition-colors relative ${activeDrawer === 'transfer' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-zinc-950"></span>
        </button>
        
        <button 
          onClick={() => onToggleDrawer(activeDrawer === 'messages' ? 'none' : 'messages')}
          className={`p-2 rounded-md transition-colors relative ${activeDrawer === 'messages' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
        </button>

        <div className="w-px h-6 bg-zinc-800 mx-2"></div>
        
        {/* 用户菜单 */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border border-zinc-700 shadow-sm flex items-center justify-center text-white text-xs font-medium">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={getUserDisplayName()} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-medium text-zinc-200">{getUserDisplayName()}</div>
                <div className="text-[10px] text-zinc-500">{getUserRole()}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉菜单 */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <div className="text-sm font-medium text-zinc-200">{getUserDisplayName()}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{user.email}</div>
                    <div className="text-[10px] text-indigo-400 mt-1">{getUserRole()}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowUserSettings(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    个人信息设置
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border border-zinc-700 shadow-sm cursor-pointer hover:ring-2 ring-indigo-500/50 transition-all"></div>
        )}
      </div>

      {/* 用户信息设置模态框 */}
      {showUserSettings && user && (
        <>
          <div 
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowUserSettings(false)}
          ></div>
          <div className="fixed right-4 top-16 bottom-4 w-[480px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[101] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-zinc-100">个人信息设置</h2>
              <button 
                onClick={() => setShowUserSettings(false)}
                className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
              {/* 头像 */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase">头像</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border border-zinc-700 shadow-sm flex items-center justify-center overflow-hidden">
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
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">支持图片URL链接</p>
                  </div>
                </div>
              </div>

              {/* 用户名 */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                    placeholder="输入用户名"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* 登录账号（邮箱） */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase">登录账号（邮箱）</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    placeholder="输入邮箱地址"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* 手机号 */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase">手机号（可选）</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                    placeholder="输入手机号"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">手机号功能暂未实现</p>
              </div>

              {/* 密码修改 */}
              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">修改密码</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">当前密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                      <input
                        type="password"
                        value={userFormData.currentPassword}
                        onChange={(e) => setUserFormData({...userFormData, currentPassword: e.target.value})}
                        placeholder="输入当前密码"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">新密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                      <input
                        type="password"
                        value={userFormData.newPassword}
                        onChange={(e) => setUserFormData({...userFormData, newPassword: e.target.value})}
                        placeholder="输入新密码"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">确认新密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                      <input
                        type="password"
                        value={userFormData.confirmPassword}
                        onChange={(e) => setUserFormData({...userFormData, confirmPassword: e.target.value})}
                        placeholder="再次输入新密码"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    {userFormData.newPassword && userFormData.confirmPassword && userFormData.newPassword !== userFormData.confirmPassword && (
                      <p className="text-[10px] text-red-400 mt-1">两次输入的密码不一致</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-2">
              <button
                onClick={() => setShowUserSettings(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
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
            </div>
          </div>
        </>
      )}
    </header>
  );
};
